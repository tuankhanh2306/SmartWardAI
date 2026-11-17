# ==============================================================================
# SMARTWARD AI — Database Restore Script (PowerShell for Windows)
# Target: Restores PostgreSQL 16 (smartward_db) from SQL dump
# RTO <= 4h, supports drill simulations and disaster recovery
# ==============================================================================
param (
    [Parameter(Mandatory=$false)]
    [string]$BackupFile,
    [string]$ContainerName = "smartward-postgres",
    [string]$PostgresUser = "smartward",
    [string]$PostgresDb = "smartward_db",
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$BackupDir = Join-Path $RootDir "backups\postgres"

if (-not $BackupFile) {
    Write-Host "Usage: .\scripts\restore_db.ps1 -BackupFile <path_to_backup_file.sql> [-Force]" -ForegroundColor Yellow
    Write-Host "`nAvailable backups in $BackupDir :" -ForegroundColor Cyan
    if (Test-Path $BackupDir) {
        Get-ChildItem -Path $BackupDir -Filter "smartward_backup_*.sql*" | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
    } else {
        Write-Host "No backups folder found."
    }
    exit 1
}

if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ [Error] Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [SmartWard AI] Database Restore Utility" -ForegroundColor Cyan
Write-Host " Source File: $BackupFile"
Write-Host " Database: $PostgresDb | User: $PostgresUser"
Write-Host "=========================================================="

if (-not $Force) {
    $confirm = Read-Host "⚠️ WARNING: This will overwrite data in '$PostgresDb'. Continue? (y/N)"
    if ($confirm -notmatch "^[Yy]$") {
        Write-Host "❌ [Aborted] Restore cancelled by operator." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "🔄 [Restore] Streaming SQL dump into PostgreSQL..." -ForegroundColor Green
$dockerRunning = docker ps --filter "name=$ContainerName" --format "{{.Names}}" 2>$null

if ($dockerRunning -eq $ContainerName) {
    Get-Content -Path $BackupFile | docker exec -i $ContainerName psql -U $PostgresUser -d $PostgresDb
    Write-Host "✅ [Success] Database '$PostgresDb' successfully restored from: $BackupFile" -ForegroundColor Green
} else {
    Write-Host "❌ [Error] Container '$ContainerName' is not running." -ForegroundColor Red
    exit 1
}
Write-Host "==========================================================" -ForegroundColor Cyan
