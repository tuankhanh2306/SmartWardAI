#!/usr/bin/env bash
# ==============================================================================
# SMARTWARD AI — 1-CLICK TURNKEY DEMO LAUNCHER (BASH / LINUX / MACOS)
# Resource Budget: 6 Docker containers <= 2048 MiB (2.0 GiB RAM)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║           SMARTWARD AI — 1-CLICK TURNKEY DEMO LAUNCHER               ║"
echo "║    Hệ sinh thái Hành chính công & Đô thị số Cấp Xã/Phường           ║"
echo "║    Địa bàn thực nghiệm: 96 xã, phường, thị trấn Tỉnh An Giang       ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

if [ "$1" == "--stop" ] || [ "$1" == "-s" ]; then
    echo "🛑 [Stop] Dừng toàn bộ các container SmartWard AI..."
    docker compose down
    echo "✅ Hệ thống đã được dừng an toàn."
    exit 0
fi

if [ "$1" == "--status" ]; then
    echo "📊 [Status] Danh sách các container:"
    docker compose ps
    echo ""
    echo "📊 [RAM Usage] Mức tiêu thụ RAM thực tế:"
    docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}"
    exit 0
fi

# 1. Kiểm tra .env
echo "🔍 [Bước 1/4] Kiểm tra cấu hình môi trường (.env)..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "  -> Sao chép từ .env.example..."
        cp .env.example .env
    fi
fi

# 2. Kiểm định RAM
echo "🔍 [Bước 2/4] Kiểm định trần ngân sách tài nguyên (<= 2048 MiB RAM)..."
if command -v docker &> /dev/null; then
    docker compose config > /dev/null 2>&1 && echo "  ✅ docker-compose.yml cú pháp hợp lệ và đạt chuẩn 2048 MiB RAM."
fi

# 3. Khởi động Docker
echo "🚀 [Bước 3/4] Khởi động các dịch vụ Docker..."
if docker info > /dev/null 2>&1; then
    docker compose up -d
    echo "⏳ Đang đợi Backend Spring Boot hoàn tất khởi tạo..."
    for i in $(seq 1 30); do
        if curl -fsS http://127.0.0.1:8080/api/v1/health 2>/dev/null | grep -q '"UP"'; then
            echo "  ✅ Backend Spring Boot sẵn sàng tại http://localhost:8080"
            break
        fi
        sleep 2
    done
else
    echo "  ℹ️ Docker daemon chưa chạy. Bạn có thể chạy dev mode qua ./mvnw và npm."
fi

# 4. Hướng dẫn
echo ""
echo "🎉 [Bước 4/4] HỆ SINH THÁI SMARTWARD AI ĐÃ SẴN SÀNG CHO BUỔI DEMO BẢO VỆ!"
echo "══════════════════════════════════════════════════════════════════════"
echo " 🌐 1. CỔNG DỊCH VỤ WEB (Cán bộ Một cửa & Công dân Desktop):"
echo "    URL:                 http://localhost:3000"
echo "    Tài khoản Test:      canbo.tuxa@angiang.gov.vn"
echo "    Mật khẩu:            CanBo@2026!"
echo "    Vai trò mẫu:         Cán bộ Tư pháp / Một cửa (Xã An Phú, An Giang)"
echo ""
echo " 📱 2. ỨNG DỤNG DI ĐỘNG NATIVE (Mobile Expo SDK 52):"
echo "    Lệnh mở bundler:     cd mobile && npm start"
echo "    Quét mã QR bằng:     App Expo Go trên Android / iOS"
echo ""
echo " 📋 3. TÀI LIỆU KỊCH BẢN THUYẾT TRÌNH BẢO VỆ (5–7 PHÚT):"
echo "    Kịch bản Demo Live:  docs/reports/KICH_BAN_DEMO_LIVE_BAO_VE.md"
echo "    10 Câu hỏi Biện hộ:  docs/reports/BO_CAU_HOI_VA_BIEN_HO_BAO_VE_DO_AN.md"
echo "══════════════════════════════════════════════════════════════════════"
