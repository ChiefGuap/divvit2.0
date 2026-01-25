"""
Gemini AI Service for receipt parsing.
Handles communication with the Google Generative AI API.
"""

import io
import json
import os
from typing import Dict, Any

from PIL import Image
from google import genai
from google.genai import types

from app.core.config import settings


class GeminiService:
    """Service class for interacting with Google's Gemini AI."""

    def __init__(self):
        """Initialize the Gemini service with API credentials."""
        api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
        self.client = genai.Client(api_key=api_key)
        self.model_name = "gemini-2.5-flash"

    async def parse_receipt(
        self, image_data: bytes, content_type: str = "image/jpeg"
    ) -> Dict[str, Any]:
        """
        Parse a receipt image using Gemini Vision.

        Args:
            image_data: Raw image bytes
            content_type: MIME type of the image

        Returns:
            Dictionary containing parsed receipt data
        """
        # Validate image with PIL
        try:
            image = Image.open(io.BytesIO(image_data))
            image.verify()  # Verify it's a valid image
        except Exception as e:
            raise ValueError(f"Invalid image file: {e}")

        # Construct the prompt for receipt parsing
        prompt = """Extract items (name, price), tax, tip, and total from this receipt.

Return ONLY valid JSON in this exact format:
{
    "items": [
        {"name": "item name", "price": 0.00, "quantity": 1}
    ],
    "subtotal": 0.00,
    "tax": 0.00,
    "total": 0.00,
    "scanned_tip": 0.00
}

Rules:
- Return ONLY the raw JSON object, no markdown formatting or code blocks
- Prices should be numbers (floats), not strings
- If a value is not found, use null
- Include all line items from the receipt
- Be accurate with the prices and names
"""

        try:
            # Generate response from Gemini using new SDK
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[
                    types.Content(
                        parts=[
                            types.Part.from_text(text=prompt),
                            types.Part.from_bytes(
                                data=image_data,
                                mime_type=content_type,
                            ),
                        ]
                    )
                ],
            )

            # Parse the JSON response
            response_text = response.text.strip()

            # Remove any markdown code block formatting if present
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                # Remove first line (```json) and last line (```)
                response_text = "\n".join(lines[1:-1])

            result = json.loads(response_text)
            return result

        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse Gemini response as JSON: {e}")
        except Exception as e:
            raise RuntimeError(f"Gemini API error: {e}")
