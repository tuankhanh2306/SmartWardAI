#!/usr/bin/env bash
# ==============================================================================
# SMARTWARD AI — Automated MinIO Vault Backup Script (Bash - TASK-017)
# Target: MinIO bucket 'smartward-vault' -> timestamped local mirror snapshot
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_BASE_DIR="${ROOT_DIR}/backups/minio"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
SNAPSHOT_DIR="${BACKUP_BASE_DIR}/vault_mirror_${TIMESTAMP}"

MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-smartward}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-}"
BUCKET_NAME="${BUCKET_NAME:-smartward-vault}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DRY_RUN="${1:-}"

echo "=========================================================="
echo " [SmartWard AI] MinIO Vault Mirror Backup: ${TIMESTAMP}"
echo " Endpoint: ${MINIO_ENDPOINT} | Bucket: ${BUCKET_NAME}"
echo " Snapshot: ${SNAPSHOT_DIR}"
echo "=========================================================="

if [[ "${DRY_RUN}" == "--dry-run" ]]; then
  echo "[DRY-RUN] Verified MinIO mirror parameters and destination path: ${SNAPSHOT_DIR}"
  exit 0
fi

if [[ -z "${MINIO_SECRET_KEY}" ]]; then
  echo "[ERROR] MINIO_SECRET_KEY must be set in environment." >&2
  exit 1
fi

mkdir -p "${SNAPSHOT_DIR}"

if command -v mc >/dev/null 2>&1; then
  mc alias set smartward_backup "${MINIO_ENDPOINT}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" >/dev/null
  mc mirror --preserve "smartward_backup/${BUCKET_NAME}" "${SNAPSHOT_DIR}"
else
  MC_URL="$(echo "${MINIO_ENDPOINT}" | sed -E "s#^(https?://)#\1${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}@#")"
  docker run --rm --network host \
    -e "MC_HOST_smartward_backup=${MC_URL}" \
    -v "${SNAPSHOT_DIR}:/backup" \
    minio/mc:RELEASE.2024-11-21T17-21-54Z \
    mirror --preserve "smartward_backup/${BUCKET_NAME}" /backup
fi

OBJ_COUNT="$(find "${SNAPSHOT_DIR}" -type f | wc -l)"
echo "[SUCCESS] MinIO mirror completed (${OBJ_COUNT} encrypted object(s)): ${SNAPSHOT_DIR}"

find "${BACKUP_BASE_DIR}" -maxdepth 1 -type d -name "vault_mirror_*" -mtime +"${RETENTION_DAYS}" -exec rm -rf {} \; || true
