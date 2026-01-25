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
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/heic"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )

    try:
        # Read file contents
        contents = await file.read()

        # Process with Gemini
        gemini_service = GeminiService()
        result = await gemini_service.parse_receipt(contents, file.content_type)

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process receipt: {str(e)}"
        )
