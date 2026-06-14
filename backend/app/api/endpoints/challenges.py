"""
Challenges verification and points awarding endpoints.
Checks receipt eligibility and awards points atomically.
"""

from fastapi import APIRouter, File, UploadFile, Request, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import hashlib
import json
import logging
import string
from datetime import datetime, date

from app.services.gemini import GeminiService
from app.services.supabase import get_supabase_client
from app.core.auth import get_current_user
from app.core.security import limiter

logger = logging.getLogger(__name__)

router = APIRouter()

# 10 MB file size limit
MAX_FILE_SIZE = 10 * 1024 * 1024


class VerifyResponse(BaseModel):
    """Response model for challenge verification."""
    passed: bool
    reasons: Optional[List[str]] = None
    points_awarded: Optional[int] = None
    new_balance: Optional[int] = None
    streak: Optional[int] = None
    challenge_title: Optional[str] = None


def normalize_text(text: Optional[str]) -> str:
    """Lowercase, strip punctuation, and trim spaces for fuzzy comparison."""
    if not text:
        return ""
    text = text.lower().strip()
    # Replace punctuation with spaces to avoid merging words
    text = text.translate(str.maketrans(string.punctuation, ' ' * len(string.punctuation)))
    return " ".join(text.split())


def match_merchant(extracted: str, required: str) -> bool:
    """Check if merchant matches brand or required name (contains fuzzy match)."""
    ext_norm = normalize_text(extracted)
    req_norm = normalize_text(required)
    if not ext_norm or not req_norm:
        return False
    return req_norm in ext_norm or ext_norm in req_norm


def match_items(receipt_items: List[dict], required_items: List[str]) -> tuple[bool, List[str]]:
    """Verify that all required items exist in the receipt list."""
    missing = []
    receipt_item_names_norm = [normalize_text(item.get("name", "")) for item in receipt_items]

    for req_item in required_items:
        req_norm = normalize_text(req_item)
        found = False
        for rec_norm in receipt_item_names_norm:
            if req_norm in rec_norm or rec_norm in req_norm:
                found = True
                break
        if not found:
            missing.append(req_item)

    return len(missing) == 0, missing


def parse_date(date_str: Optional[str]) -> Optional[date]:
    """Try parsing date strings of common formats."""
    if not date_str:
        return None
    # Try YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, etc.
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue
    return None


def parse_iso_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    """Parse ISO timestamp strings from PostgreSQL."""
    if not dt_str:
        return None
    try:
        if dt_str.endswith("Z"):
            dt_str = dt_str[:-1] + "+00:00"
        return datetime.fromisoformat(dt_str)
    except ValueError:
        return None


@router.post("/verify", response_model=VerifyResponse)
@limiter.limit("5/minute")
async def verify_challenge(
    request: Request,
    challengeId: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """
    Verify if a receipt matches a challenge and atomically award points.
    Requires Supabase JWT auth.
    """
    user_id = user.get("sub", "unknown")
    logger.info(f"[Challenges] Verify receipt: user_id={user_id}, challenge_id={challengeId}, file={file.filename}")

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/heic"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )

    # Read and validate size limit
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum size is 10 MB."
        )

    # Call Gemini vision service
    gemini_service = GeminiService()
    try:
        extracted = await gemini_service.parse_receipt(contents, file.content_type)
    except Exception as e:
        logger.error(f"[Challenges] Gemini parsing failed: {e}")
        return VerifyResponse(
            passed=False,
            reasons=[f"Receipt scanning failed: {str(e)}"]
        )

    # Fetch challenge from Supabase to match constraints
    try:
        supabase_client = get_supabase_client()
        res = supabase_client.table("challenges").select("*").eq("id", challengeId).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        challenge = res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Challenges] Supabase query failed: {e}")
        raise HTTPException(status_code=500, detail="Database connection error")

    passed = True
    reasons = []

    # 1. Match merchant/brand
    req_merchant = challenge.get("required_merchant") or challenge.get("brand")
    ext_merchant = extracted.get("merchant")
    if req_merchant:
        if not ext_merchant or not match_merchant(ext_merchant, req_merchant):
            passed = False
            reasons.append(
                f"Merchant does not match required brand: '{req_merchant}' (Receipt: '{ext_merchant or 'Unknown'}')"
            )

    # 2. Match required menu items
    req_items = challenge.get("required_items")
    if req_items:
        if isinstance(req_items, str):
            try:
                req_items = json.loads(req_items)
            except Exception:
                req_items = []
        if isinstance(req_items, list) and req_items:
            items_pass, missing_items = match_items(extracted.get("items", []), req_items)
            if not items_pass:
                passed = False
                reasons.append(f"Missing required items: {', '.join(missing_items)}")

    # 3. Match minimum total amount
    min_amount = challenge.get("min_amount")
    ext_total = extracted.get("total")
    if min_amount is not None:
        try:
            min_val = float(min_amount)
            total_val = float(ext_total) if ext_total is not None else 0.0
            if total_val < min_val:
                passed = False
                reasons.append(f"Receipt total (${total_val:.2f}) is less than minimum spend (${min_val:.2f})")
        except ValueError:
            pass

    # 4. Check date window validity
    receipt_date_str = extracted.get("date")
    receipt_date = parse_date(receipt_date_str)
    if not receipt_date:
        passed = False
        reasons.append("Could not extract a valid transaction date from the receipt")
    else:
        starts_dt = parse_iso_datetime(challenge.get("starts_at"))
        ends_dt = parse_iso_datetime(challenge.get("ends_at"))

        if starts_dt and receipt_date < starts_dt.date():
            passed = False
            reasons.append(f"Receipt date ({receipt_date}) is before challenge start ({starts_dt.date()})")
        if ends_dt and receipt_date > ends_dt.date():
            passed = False
            reasons.append(f"Receipt date ({receipt_date}) is after challenge expiration ({ends_dt.date()})")

    # If all checks pass, write records atomically using RPC
    if passed:
        # Generate receipt hash
        hash_input = f"{normalize_text(ext_merchant)}|{receipt_date}|{ext_total}"
        receipt_hash = hashlib.sha256(hash_input.encode("utf-8")).hexdigest()

        try:
            rpc_res = supabase_client.rpc(
                "verify_and_award_challenge",
                {
                    "p_user_id": user_id,
                    "p_challenge_id": challengeId,
                    "p_points_awarded": int(challenge.get("points", 0)),
                    "p_receipt_hash": receipt_hash,
                    "p_extracted": extracted
                }
            ).execute()

            rpc_data = rpc_res.data
            if not rpc_data or not rpc_data.get("success"):
                error_msg = rpc_data.get("error") if rpc_data else "Unknown transaction failure"
                return VerifyResponse(
                    passed=False,
                    reasons=[f"Claim rejected: {error_msg}"]
                )

            return VerifyResponse(
                passed=True,
                points_awarded=rpc_data.get("points_awarded"),
                new_balance=rpc_data.get("new_balance"),
                streak=rpc_data.get("streak"),
                challenge_title=rpc_data.get("challenge_title")
            )
        except Exception as e:
            logger.error(f"[Challenges] Transaction execution failed: {e}")
            return VerifyResponse(
                passed=False,
                reasons=[f"Database transaction error: {str(e)}"]
            )

    return VerifyResponse(
        passed=False,
        reasons=reasons
    )
