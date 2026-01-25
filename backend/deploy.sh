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

# --- 3. INJECT SECRETS ---
# This pulls the key from your local environment or you can hardcode it for this one-time setup
# Ideally, ensure GEMINI_API_KEY is exported in your terminal before running this.
echo "🔑 Injecting API Key..."
gcloud run services update $SERVICE_NAME \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY \
  --region $REGION

echo "✅ DONE! Your backend is live."