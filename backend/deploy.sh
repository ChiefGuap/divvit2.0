#!/bin/bash

# --- CONFIGURATION ---
PROJECT_ID="splitwise-474405"
REGION="us-central1"
SERVICE_NAME="divvit-backend"

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
  --allow-unauthenticated

# --- 3. SECRETS INJECTION ---
# The GEMINI_API_KEY is now securely mounted from Google Cloud Secret Manager instead of plaintext env vars.
# Ensure you have created a secret named GEMINI_API_KEY in your Google Cloud Console.
echo "🔑 Mounting API Key from Secret Manager..."
gcloud run services update $SERVICE_NAME \
  --update-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --region $REGION

echo "✅ DONE! Your backend is live."