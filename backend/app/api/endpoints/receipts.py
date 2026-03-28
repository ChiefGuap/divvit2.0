"""
Receipt scanning endpoints.
Handles file uploads and delegates to the Gemini service for AI processing.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.services.gemini import GeminiService

router = APIRouter()


class ReceiptItem(BaseModel):
    """Individual item from a receipt."""
    name: str
    price: float
    quantity: int = 1


class ScanResponse(BaseModel):
    """Response model for receipt scan results."""
    items: List[ReceiptItem]
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    total: Optional[float] = None
    scanned_tip: Optional[float] = None


@router.post("/scan")
async def scan_receipt(file: UploadFile = File(...)):
    """
    Scan a receipt image and extract structured data.

    Args:
        file: Uploaded receipt image file (JPEG, PNG, etc.)

    Returns:
        Parsed receipt data with items and totals
    """
    print(f"[Backend] Received scan request — file: {file.filename!r}, type: {file.content_type!r}")

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/heic"]
    if file.content_type not in allowed_types:
        print(f"[Backend] Rejected — invalid content type: {file.content_type!r}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )

    try:
        # Read file contents
        contents = await file.read()
        print(f"[Backend] File read — {len(contents)} bytes. Calling Gemini...")

        # Process with Gemini
        gemini_service = GeminiService()
        result = await gemini_service.parse_receipt(contents, file.content_type)

        print(f"[Backend] Gemini success — {len(result.get('items', []))} items found")
        return result

    except ValueError as e:
        print(f"[Backend] ValueError: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[Backend] Exception: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process receipt: {str(e)}"
        )
