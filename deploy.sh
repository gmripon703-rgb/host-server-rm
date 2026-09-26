#!/bin/bash
set -e

# ========================================================
# NexusControl - Zero-VPS Quick Deployment Script
# ========================================================

echo "🚀 NexusControl Deployment Helper"
echo "-----------------------------------"

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "⚠️  No .env file found! Copying from .env.example..."
  cp .env.example .env
  echo "👉 Please edit .env with your secrets before proceeding."
  exit 1
fi

echo "📦 1. Installing dependencies..."
npm install

echo "🔨 2. Building frontend bundle..."
npm run build

echo "🔍 3. Verifying TypeScript compilation..."
npm run lint

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "Choose deployment method:"
echo "1) Start local production server (Node.js)"
echo "2) Run with Docker Compose"
echo "3) Deploy to Google Cloud Run (Serverless)"
echo "4) Exit"
echo ""

read -p "Enter choice [1-4]: " choice

case $choice in
  1)
    echo "Starting server on port 3000..."
    NODE_ENV=production npx tsx server.ts
    ;;
  2)
    echo "Starting Docker Compose container..."
    docker-compose up -d --build
    echo "Server running at http://localhost:3000"
    ;;
  3)
    read -p "Enter Google Cloud Project ID: " gcp_project
    echo "Submitting build to Google Cloud..."
    gcloud builds submit --tag "gcr.io/$gcp_project/nexus-control:latest"
    echo "Deploying to Cloud Run..."
    gcloud run deploy nexus-control \
      --image "gcr.io/$gcp_project/nexus-control:latest" \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated
    ;;
  *)
    echo "Exiting."
    exit 0
    ;;
esac
