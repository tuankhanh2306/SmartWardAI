# SMARTWARD AI — QUY CHUẨN DỮ LIỆU ĐỊA LÝ & TỌA ĐỘ HÀNH CHÍNH (GEO DATA SPECIFICATION)

## 1. Danh mục Đơn vị Hành chính & Năm sử dụng
- **Căn cứ pháp lý & Đề án:** Áp dụng theo **Nghị quyết của Quốc hội và Đề án sắp xếp, tinh gọn các đơn vị hành chính cấp xã giai đoạn 2023 – 2025, tầm nhìn định hướng năm 2026** cho khu vực Tây Nam Bộ (Tỉnh An Giang mở rộng).
- **Mô hình tổ chức:** Phẳng hóa 2 cấp chính quyền (Tỉnh $\rightarrow$ Xã/Phường/Đặc khu trực thuộc, loại bỏ trung gian cấp huyện).
- **Quy mô danh mục chuẩn:** **96 Đơn vị Hành chính**
  - **14 Phường đô thị:** Long Xuyên, Bình Đức, Mỹ Thới, Châu Đốc, Vĩnh Tế, Tân Châu, Long Phú, Tịnh Biên, Thới Sơn, Chi Lăng, Vĩnh Thông, Rạch Giá, Hà Tiên, Tô Châu.
  - **79 Xã nông thôn & biên giới:** An Phú, Vĩnh Hậu, Nhơn Hội, Khánh Bình, Phú Hữu, Tân An, Châu Phong, Vĩnh Xương, Phú Tân, Phú An, Bình Thạnh Đông, Chợ Vàm, Hòa Lạc, Phú Lâm, Châu Phú, Mỹ Đức, Vĩnh Thạnh Trung, Bình Mỹ, Thạnh Mỹ Tây, An Cư, Núi Cấm, Ba Chúc, Tri Tôn, Ô Lâm, Cô Tô, Vĩnh Gia, An Châu, Bình Hòa, Cần Đăng, Vĩnh Hanh, Vĩnh An, Chợ Mới, Cù Lao Giêng, Hội An, Long Điền, Nhơn Mỹ, Long Kiến, Thoại Sơn, Óc Eo, Định Mỹ, Phú Hòa, Vĩnh Trạch, Tây Phú, Vĩnh Bình, Vĩnh Thuận, Vĩnh Phong, Vĩnh Hòa, U Minh Thượng, Đông Hòa, Tân Thạnh, Đông Hưng, An Minh, Vân Khánh, Tây Yên, Đông Thái, An Biên, Định Hòa, Gò Quao, Vĩnh Hòa Hưng, Vĩnh Tuy, Giồng Riềng, Thạnh Hưng, Long Thạnh, Hòa Hưng, Ngọc Chúc, Hòa Thuận, Tân Hội, Tân Hiệp, Thạnh Đông, Thạnh Lộc, Châu Thành, Bình An, Hòn Đất, Sơn Kiên, Mỹ Thuận, Hòa Điền, Kiên Lương, Giang Thành, Vĩnh Điều.
  - **03 Đặc khu Hải đảo:** Đặc khu Phú Quốc, Đặc khu Kiên Hải (Hòn Tre), Đặc khu Thổ Châu (Thổ Chu).

## 2. Nguồn sự thật duy nhất (Single Source of Truth)
- Toàn bộ hệ thống (Frontend, Backend, Database migrations, AI Model RAG, Mock data generator) đọc duy nhất từ:
  👉 **`data/wards.geo.json`**
- Cấu trúc chuẩn của từng đơn vị:
  - `ward_code`: Mã định danh bất biến (VD: `AG_P_LONGXUYEN`, `AG_DK_KIENHAI`)
  - `name`: Tên chính thức
  - `type`: `'Phường'` | `'Xã'` | `'Đặc khu'`
  - `lat`: Vĩ độ trụ sở UBND (WGS84, số thập phân 6 chữ số)
  - `lng`: Kinh độ trụ sở UBND (WGS84, số thập phân 6 chữ số)
  - `boundary`: Polygon ranh giới địa lý theo chuẩn GeoJSON RFC 7946 (mảng `[lng, lat]`)
  - `coord_source`: `'official_gis'` | `'osm'` | `'manual_verified'` | `'unverified'`
  - `verified_at`: Thời điểm xác nhận
  - `verified_by`: Đơn vị kiểm toán xác thực (`UTH_GIS_UNIT`)
  - `accuracy_note`: Ghi chú đối chiếu thực địa / vệ tinh

## 3. Quy chuẩn Hệ tọa độ và Chuyển đổi (Coordinate Order Conventions)
- **Chuẩn GeoJSON (RFC 7946):** `[lng, lat]` (Kinh độ trước, Vĩ độ sau $\Leftrightarrow [X, Y]$).
- **Chuẩn Leaflet / Google Maps API:** `[lat, lng]` (Vĩ độ trước, Kinh độ sau $\Leftrightarrow [Y, X]$).
- **Quy tắc bất biến:**
  - Không bao giờ đổi tọa độ thủ công rải rác trong code.
  - Luôn sử dụng hàm tiện ích tập trung:
    - Frontend: `toLeafletLatLng()` và `toGeoJsonCoord()` trong `frontend/src/utils/geoUtils.ts`.
    - Backend: `GeoUtils.toLeafletCoords()` và `GeoValidatorService` trong `vn.edu.uth.smartward.geo`.

## 4. Bounding Box (BBOX) Hợp lệ
- **Vĩ độ (Latitude):** $9.150000 \le \text{lat} \le 11.000000$
- **Kinh độ (Longitude):** $103.350000 \le \text{lng} \le 105.700000$
- Mọi điểm có $\text{lat} > 15$ hoặc $\text{lng} < 90$ bị nhận diện là `SWAPPED_SUSPECT` (nghi vấn đảo ngược vĩ độ/kinh độ).
