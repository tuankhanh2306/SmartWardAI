# ==============================================================================
# SMARTWARD AI — Automated Database Backup Script (PowerShell for Windows)
# Target: PostgreSQL 16 (smartward_db) -> gzip / sql dump
# RPO <= 24h, 7-day retention policy rotation
# ==============================================================================
param (
    [string]$ContainerName = "smartward-postgres",
    [string]$PostgresUser = "smartward",
    [string]$PostgresDb = "smartward_db",
    [int]$RetentionDays = 7
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$BackupDir = Join-Path $RootDir "backups\postgres"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "smartward_backup_$Timestamp.sql"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [SmartWard AI] Starting Database Backup: $Timestamp" -ForegroundColor Cyan
Write-Host " Database: $PostgresDb | User: $PostgresUser"
Write-Host " Destination: $BackupFile"
Write-Host "=========================================================="

# Check if Docker container is running
$dockerRunning = docker ps --filter "name=$ContainerName" --format "{{.Names}}" 2>$null

if ($dockerRunning -eq $ContainerName) {
    Write-Host "📦 [Docker] Running pg_dump from container '$ContainerName'..." -ForegroundColor Green
    & docker exec $ContainerName pg_dump -U $PostgresUser -d $PostgresDb --clean --if-exists | Out-File -FilePath $BackupFile -Encoding utf8
} else {
    Write-Host "❌ [Error] Docker container '$ContainerName' is not running." -ForegroundColor Red
    exit 1
}

$fileInfo = Get-Item $BackupFile
Write-Host "✅ [Success] Backup completed: $BackupFile ($([math]::Round($fileInfo.Length / 1MB, 2)) MB)" -ForegroundColor Green

# Retention policy
Write-Host "🧹 [Retention] Purging backups older than $RetentionDays days..." -ForegroundColor Yellow
$limitDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "smartward_backup_*.sql*" | Where-Object { $_.LastWriteTime -lt $limitDate } | Remove-Item -Force

$remaining = (Get-ChildItem -Path $BackupDir -Filter "smartward_backup_*.sql*").Count
Write-Host "📊 [Status] Total stored backups: $remaining" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
