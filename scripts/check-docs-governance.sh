#!/usr/bin/env bash
# ==============================================================================
# SMARTWARD AI — DOCUMENTATION GOVERNANCE GUARDRAIL (CI / PRE-COMMIT)
# Quy tắc: Thư mục gốc repo CHỈ ĐƯỢC CHỨA 2 tệp markdown là README.md và AGENTS.md.
# Mọi tệp .md khác bắt buộc phải xếp vào docs/ theo quy ước tại docs/README.md.
# ==============================================================================
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔍 [Docs Governance] Scanning root directory for unauthorized markdown files..."

# Tìm các file .md trực tiếp ở root ngoại trừ README.md và AGENTS.md
VIOLATING_FILES=$(find . -maxdepth 1 -name "*.md" ! -name "README.md" ! -name "AGENTS.md" | sed 's|^\./||')

if [ -n "$VIOLATING_FILES" ]; then
  echo "========================================================================"
  echo "❌ CI GATE FAILED: Phát hiện file .md không hợp lệ ở thư mục gốc repo!"
  echo "========================================================================"
  echo "$VIOLATING_FILES" | while IFS= read -r file; do
    echo "  -> [VIOLATION] $file"
  done
  echo ""
  echo "📖 Quy ước bắt buộc: Thư mục gốc repo CHỈ DUY NHẤT chứa README.md và AGENTS.md."
  echo "   Vui lòng di chuyển file vào đúng thư mục con trong docs/:"
  echo "   • specs/          : Đặc tả tính năng / sản phẩm mới"
  echo "   • architecture/   : Thiết kế kỹ thuật, sơ đồ, kiến trúc hệ thống"
  echo "   • roadmap/        : Lộ trình và kế hoạch chiến lược dài hạn"
  echo "   • docs/           : Sprint board sống (TODO_SPRINT_BOARD.md)"
  echo "   • reports/        : Báo cáo kỹ thuật gửi Mentor / Giảng viên"
  echo "   • weekly-reports/ : Nhật ký tiến độ tuần"
  echo ""
  echo "Chi tiết xem tại bảng Governance trong docs/README.md."
  exit 1
fi

echo "✅ [Docs Governance] PASS: Thư mục gốc sạch sẽ và tuân thủ 100% quy ước tài liệu!"
exit 0
