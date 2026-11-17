#!/usr/bin/env bash
# ==============================================================================
# SMARTWARD AI — Database Restore Script (8.5 & SEC-07)
# Target: Restores PostgreSQL 16 (smartward_db) from gzip compressed SQL dump
# RTO <= 4h, supports drill simulations and disaster recovery
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONTAINER_NAME="smartward-postgres"
POSTGRES_USER="${POSTGRES_USER:-smartward}"
POSTGRES_DB="${POSTGRES_DB:-smartward_db}"

BACKUP_FILE="${1:-}"
FORCE_FLAG="${2:-}"

if [ -z "${BACKUP_FILE}" ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz> [--force]"
    echo ""
    echo "Available backups in backups/postgres:"
    ls -lht "${ROOT_DIR}/backups/postgres"/smartward_backup_*.sql.gz 2>/dev/null || echo "No backups found."
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ [Error] Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "=========================================================="
echo " [SmartWard AI] Database Restore Utility"
echo " Source File: ${BACKUP_FILE}"
echo " Database: ${POSTGRES_DB} | User: ${POSTGRES_USER}"
echo "=========================================================="

# Integrity check before restore
echo "🔍 [Verify] Checking archive integrity..."
gzip -t "${BACKUP_FILE}"

if [ "${FORCE_FLAG}" != "--force" ]; then
    read -p "⚠️ WARNING: This will overwrite data in '${POSTGRES_DB}'. Continue? (y/N): " -r CONFIRM
    if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
        echo "❌ [Aborted] Restore cancelled by operator."
        exit 0
    fi
fi

echo "🔄 [Restore] Streaming SQL dump into PostgreSQL..."
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
elif command -v psql >/dev/null 2>&1; then
    gunzip -c "${BACKUP_FILE}" | psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
else
    echo "❌ [Error] Neither running container '${CONTAINER_NAME}' nor local 'psql' utility found."
    exit 1
fi

echo "✅ [Success] Database '${POSTGRES_DB}' successfully restored from: ${BACKUP_FILE}"
echo "=========================================================="
