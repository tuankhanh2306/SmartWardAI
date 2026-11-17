#!/usr/bin/env bash
# ==============================================================================
# SMARTWARD AI — Automated Database Backup Script (8.5 & SEC-07)
# Target: PostgreSQL 16 (smartward_db) -> gzip compressed SQL dump
# RPO <= 24h, 7-day retention policy rotation
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${ROOT_DIR}/backups/postgres"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/smartward_backup_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="smartward-postgres"
POSTGRES_USER="${POSTGRES_USER:-smartward}"
POSTGRES_DB="${POSTGRES_DB:-smartward_db}"
RETENTION_DAYS=7

mkdir -p "${BACKUP_DIR}"

echo "=========================================================="
echo " [SmartWard AI] Starting Database Backup: ${TIMESTAMP}"
echo " Database: ${POSTGRES_DB} | User: ${POSTGRES_USER}"
echo " Destination: ${BACKUP_FILE}"
echo "=========================================================="

# Check if Docker container is running, otherwise try local pg_dump
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "📦 [Docker] Streaming pg_dump from container '${CONTAINER_NAME}'..."
    docker exec "${CONTAINER_NAME}" pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists | gzip > "${BACKUP_FILE}"
elif command -v pg_dump >/dev/null 2>&1; then
    echo "🖥️ [Native] Running native pg_dump..."
    pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists | gzip > "${BACKUP_FILE}"
else
    echo "❌ [Error] Neither running container '${CONTAINER_NAME}' nor local 'pg_dump' utility found."
    exit 1
fi

# Verify gzip integrity
echo "🔍 [Verify] Checking archive integrity..."
gzip -t "${BACKUP_FILE}"

BACKUP_SIZE="$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')"
echo "✅ [Success] Backup completed: ${BACKUP_FILE} (Size: ${BACKUP_SIZE})"

# Retention policy: remove backups older than RETENTION_DAYS
echo "🧹 [Retention] Purging backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "smartward_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -exec rm -f {} \; || true
REMAINING_COUNT="$(find "${BACKUP_DIR}" -name "smartward_backup_*.sql.gz" | wc -l)"
echo "📊 [Status] Total stored backups: ${REMAINING_COUNT}"
echo "=========================================================="
