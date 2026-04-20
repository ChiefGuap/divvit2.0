#!/bin/bash

# test_gemini.sh
# Usage: ./test_gemini.sh [path_to_image]

IMAGE_PATH=${1:-"assets/images/icon.png"}
BACKEND_URL="https://divvit-backend-899345323923.us-central1.run.app/api/v1/scan"

if [ ! -f "$IMAGE_PATH" ]; then
    echo "Error: File $IMAGE_PATH not found."
    exit 1
fi

echo "Testing Gemini Backend with image: $IMAGE_PATH"
echo "Target URL: $BACKEND_URL"
echo "------------------------------------------------"

curl -X POST "$BACKEND_URL" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@$IMAGE_PATH" \
  -i

echo -e "\n------------------------------------------------"
echo "Test Complete"
