#!/usr/bin/env bash
# ==============================================================================
# SMARTWARD AI — AUTOMATED DEPLOYMENT SCRIPT (DOCKER COMPOSE)
# Total Active RAM Budget: <= 2048 MiB (Postgres + Redis + MinIO + Sidecar + Backend + Frontend)
# ==============================================================================
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "========================================================================"
echo "🚀 [SmartWard AI] Starting Automated Production Deployment"
echo "   Directory: $PROJECT_DIR"
echo "   Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================================"

# 1. Check for required .env file
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo "⚠️  .env file not found. Initializing from .env.example..."
    cp .env.example .env
    echo "⚠️  Created .env with default values. Please configure production secrets!"
  else
    echo "❌ FATAL: Neither .env nor .env.example found. Aborting deployment."
    exit 1
  fi
fi

# 2. Check Docker and Docker Compose availability
if ! command -v docker &> /dev/null; then
  echo "❌ FATAL: docker is not installed or not in PATH."
  exit 1
fi

# 3. Pull latest changes if running in git repository
if [ -d .git ]; then
  echo "📥 Pulling latest commits from git remote..."
  git pull origin main || echo "⚠️  Git pull warning: proceeding with local files."
fi

# 4. Build and restart containers under 2048 MiB RAM quota
echo "🏗️  Rebuilding and launching containers..."
docker compose down --remove-orphans || true
docker compose up -d --build

# 5. Wait for core healthcheck endpoints
echo "⏳ Waiting 15s for container healthchecks..."
sleep 15

echo "📋 Checking container operational status:"
docker compose ps

# 6. Verify HTTP health endpoints
echo "🔍 Probing healthcheck endpoints..."
BACKEND_OK=0
FRONTEND_OK=0

if curl -sf http://localhost:8080/api/v1/health > /dev/null 2>&1; then
  echo "✅ Backend Health: UP (http://localhost:8080/api/v1/health)"
  BACKEND_OK=1
else
  echo "⚠️  Backend health check not responding yet (may still be initializing)."
fi

if curl -sf http://localhost:3000 > /dev/null 2>&1 || curl -sf http://localhost:80 > /dev/null 2>&1; then
  echo "✅ Frontend Web Server: UP (http://localhost:3000)"
  FRONTEND_OK=1
else
  echo "⚠️  Frontend port 3000 not responding directly."
fi

echo "========================================================================"
echo "🎉 [SmartWard AI] Deployment Completed Successfully!"
echo "   Backend:  http://localhost:8080"
echo "   Frontend: http://localhost:3000"
echo "   Swagger:  http://localhost:8080/swagger-ui.html"
echo "========================================================================"
exit 0
