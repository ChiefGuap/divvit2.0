#!/bin/bash

# --- CONFIGURATION ---
PROJECT_ID="splitwise-474405"
REGION="us-central1"
SERVICE_NAME="divvit-backend"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- 0. READ API KEY FROM .env ---
# Extract GEMINI_API_KEY from the backend .env file
if [ -f "$SCRIPT_DIR/.env" ]; then
    GEMINI_KEY=$(grep '^GEMINI_API_KEY=' "$SCRIPT_DIR/.env" | cut -d"'" -f2)
fi

if [ -z "$GEMINI_KEY" ]; then
    echo "❌ ERROR: GEMINI_API_KEY not found in backend/.env"
    echo "   Add this line to backend/.env:"
    echo "   GEMINI_API_KEY='your-api-key-here'"
    exit 1
fi
echo "✅ GEMINI_API_KEY loaded from .env"

# --- 1. SETUP ---
echo "🚀 Setting up Project: $PROJECT_ID..."
gcloud config set project $PROJECT_ID

echo "🔌 Enabling required APIs (this takes a minute)..."
gcloud services enable artifactregistry.googleapis.com \
                       cloudbuild.googleapis.com \
                       run.googleapis.com

# --- 2. DEPLOY ---
echo "📦 Building and Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=$GEMINI_KEY" \
  --timeout=300

echo "✅ DONE! Your backend is live."