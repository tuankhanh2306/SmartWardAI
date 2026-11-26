# ==============================================================================
# SMARTWARD AI — Unified Production Backup Orchestrator (PowerShell - TASK-017)
# Runs PostgreSQL pg_dump + MinIO mc mirror + writes SHA-256 verification manifest
# ==============================================================================
param (
    [int]$RetentionDays = 7,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [SmartWard AI] Unified Backup Orchestrator ($Timestamp)" -ForegroundColor Cyan
Write-Host " Targets: PostgreSQL 16 (pg_dump) + MinIO Vault (mc mirror)"
Write-Host " Policy : RPO <= 24h | RTO <= 2h | Retention = $RetentionDays days"
Write-Host "=========================================================="

if ($DryRun) {
    Write-Host "[DRY-RUN] Checking backup scripts presence..." -ForegroundColor Yellow
    $required = @("backup_db.ps1", "restore_db.ps1", "backup_minio.ps1")
    foreach ($file in $required) {
        $fullPath = Join-Path $ScriptDir $file
        if (-not (Test-Path $fullPath)) {
            throw "Missing required script: $fullPath"
        }
        Write-Host "  [OK] $file" -ForegroundColor Green
    }
    & (Join-Path $ScriptDir "backup_minio.ps1") -DryRun
    Write-Host "[DRY-RUN] Unified backup orchestrator verified successfully." -ForegroundColor Green
    exit 0
}

& (Join-Path $ScriptDir "backup_db.ps1") -RetentionDays $RetentionDays
& (Join-Path $ScriptDir "backup_minio.ps1") -RetentionDays $RetentionDays

$latestSql = Get-ChildItem -Path (Join-Path $RootDir "backups\postgres") -Filter "smartward_backup_*.sql*" |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1

$manifestDir = Join-Path $RootDir "backups\manifests"
New-Item -ItemType Directory -Path $manifestDir -Force | Out-Null
$manifestPath = Join-Path $manifestDir "backup_manifest_$Timestamp.json"

$sqlHash = if ($latestSql) { (Get-FileHash -Path $latestSql.FullName -Algorithm SHA256).Hash } else { $null }
$manifest = @{
    timestamp = $Timestamp
    rpoTarget = "24h"
    rtoTarget = "2h"
    postgresBackupFile = if ($latestSql) { $latestSql.Name } else { $null }
    postgresSha256 = $sqlHash
    retentionDays = $RetentionDays
} | ConvertTo-Json -Depth 3

Set-Content -Path $manifestPath -Value $manifest -Encoding UTF8
Write-Host "[SUCCESS] Backup manifest written: $manifestPath" -ForegroundColor Green
