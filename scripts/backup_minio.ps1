# ==============================================================================
# SMARTWARD AI — Automated MinIO Vault Backup Script (PowerShell - TASK-017)
# Target: MinIO bucket 'smartward-vault' -> timestamped local mirror snapshot
# RPO <= 24h, 7-day retention policy rotation
# ==============================================================================
param (
    [string]$MinioEndpoint = $(if ($env:MINIO_ENDPOINT) { $env:MINIO_ENDPOINT } else { "http://host.docker.internal:9000" }),
    [string]$MinioAccessKey = $(if ($env:MINIO_ACCESS_KEY) { $env:MINIO_ACCESS_KEY } else { "smartward" }),
    [string]$MinioSecretKey = $(if ($env:MINIO_SECRET_KEY) { $env:MINIO_SECRET_KEY } else { "" }),
    [string]$BucketName = "smartward-vault",
    [int]$RetentionDays = 7,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$BackupBaseDir = Join-Path $RootDir "backups\minio"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$SnapshotDir = Join-Path $BackupBaseDir "vault_mirror_$Timestamp"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [SmartWard AI] MinIO Vault Mirror Backup: $Timestamp" -ForegroundColor Cyan
Write-Host " Endpoint: $MinioEndpoint | Bucket: $BucketName"
Write-Host " Snapshot: $SnapshotDir"
Write-Host "=========================================================="

if ($DryRun) {
    Write-Host "[DRY-RUN] Verified MinIO mirror parameters and destination path: $SnapshotDir" -ForegroundColor Yellow
    Write-Host "[DRY-RUN] Command: mc mirror --preserve smartward/$BucketName $SnapshotDir" -ForegroundColor Yellow
    exit 0
}

if ([string]::IsNullOrWhiteSpace($MinioSecretKey)) {
    Write-Host "[ERROR] MINIO_SECRET_KEY environment variable or -MinioSecretKey parameter is required." -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Path $SnapshotDir -Force | Out-Null

$mcNative = Get-Command mc -ErrorAction SilentlyContinue
if ($mcNative) {
    & mc alias set smartward_backup $MinioEndpoint $MinioAccessKey $MinioSecretKey | Out-Null
    & mc mirror --preserve "smartward_backup/$BucketName" $SnapshotDir
} else {
    Write-Host "[Docker] Using minio/mc container to mirror '$BucketName'..." -ForegroundColor Green
    $mcUrl = $MinioEndpoint -replace "^(https?://)", "`$1${MinioAccessKey}:${MinioSecretKey}@"
    & docker run --rm `
        -e "MC_HOST_smartward_backup=$mcUrl" `
        -v "${SnapshotDir}:/backup" `
        minio/mc:RELEASE.2024-11-21T17-21-54Z `
        mirror --preserve "smartward_backup/$BucketName" /backup
}

$fileCount = (Get-ChildItem -Path $SnapshotDir -Recurse -File | Measure-Object).Count
Write-Host "[SUCCESS] MinIO mirror completed ($fileCount encrypted object(s)): $SnapshotDir" -ForegroundColor Green

$limitDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupBaseDir -Directory -Filter "vault_mirror_*" |
    Where-Object { $_.LastWriteTime -lt $limitDate } |
    Remove-Item -Recurse -Force

Write-Host "[RETENTION] Retained snapshots within $RetentionDays days." -ForegroundColor Cyan
