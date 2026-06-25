# Deployment Instructions for GCP

Write-Output "--- InfraPredict AI Deployment ---"

# Prerequisites: 
# 1. gcloud CLI installed and authenticated (gcloud auth login)
# 2. Docker installed

# Backend Deployment (Cloud Run)
Write-Output "Deploying Backend to Cloud Run..."
cd backend
# Assuming Dockerfile exists
# gcloud builds submit --tag gcr.io/PROJECT_ID/infrapredict-backend
# gcloud run deploy infrapredict-backend --image gcr.io/PROJECT_ID/infrapredict-backend --platform managed --allow-unauthenticated

# Frontend Deployment (Firebase Hosting / Vercel / Cloud Run)
Write-Output "Deploying Frontend..."
cd ../frontend
# npm run build
# firebase deploy --only hosting
# OR
# gcloud builds submit --tag gcr.io/PROJECT_ID/infrapredict-frontend
# gcloud run deploy infrapredict-frontend --image gcr.io/PROJECT_ID/infrapredict-frontend --platform managed --allow-unauthenticated

Write-Output "Deployment scripts are templates and require PROJECT_ID to be set."
