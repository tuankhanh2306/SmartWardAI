# ==============================================================================
# SMARTWARD AI — DOCUMENTATION GOVERNANCE GUARDRAIL (POWERSHELL / WINDOWS)
# Quy tắc: Thư mục gốc repo CHỈ ĐƯỢC CHỨA 2 tệp markdown là README.md và AGENTS.md.
# Mọi tệp .md khác bắt buộc phải xếp vào docs/ theo quy ước tại docs/README.md.
# ==============================================================================
[CmdletBinding()]
param()

$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
Set-Location $ProjectRoot

Write-Host "🔍 [Docs Governance] Scanning root directory for unauthorized markdown files..." -ForegroundColor Cyan

$ViolatingFiles = Get-ChildItem -Path $ProjectRoot -File -Filter "*.md" | 
    Where-Object { $_.Name -ne "README.md" -and $_.Name -ne "AGENTS.md" }

if ($ViolatingFiles) {
    Write-Host "========================================================================" -ForegroundColor Red
    Write-Host "❌ GATE FAILED: Phát hiện file .md không hợp lệ ở thư mục gốc repo!" -ForegroundColor Red
    Write-Host "========================================================================" -ForegroundColor Red
    foreach ($file in $ViolatingFiles) {
        Write-Host "  -> [VIOLATION] $($file.Name)" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "📖 Quy ước bắt buộc: Thư mục gốc repo CHỈ DUY NHẤT chứa README.md và AGENTS.md."
    Write-Host "   Vui lòng di chuyển file vào đúng thư mục con trong docs/:"
    Write-Host "   • specs/          : Đặc tả tính năng / sản phẩm mới"
    Write-Host "   • architecture/   : Thiết kế kỹ thuật, sơ đồ, kiến trúc hệ thống"
    Write-Host "   • roadmap/        : Lộ trình và kế hoạch chiến lược dài hạn"
    Write-Host "   • docs/           : Sprint board sống (TODO_SPRINT_BOARD.md)"
    Write-Host "   • reports/        : Báo cáo kỹ thuật gửi Mentor / Giảng viên"
    Write-Host "   • weekly-reports/ : Nhật ký tiến độ tuần"
    Write-Host ""
    Write-Host "Chi tiết xem tại bảng Governance trong docs/README.md."
    exit 1
}

Write-Host "✅ [Docs Governance] PASS: Thư mục gốc sạch sẽ và tuân thủ 100% quy ước tài liệu!" -ForegroundColor Green
exit 0
