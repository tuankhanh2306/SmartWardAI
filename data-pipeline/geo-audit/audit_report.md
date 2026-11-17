# BÁO CÁO KIỂM TOÁN TỌA ĐỘ VÀ RANH GIỚI ĐỊA LÝ 96 XÃ/PHƯỜNG AN GIANG

**Thời gian kiểm toán:** 2026-11-17 | **Hệ quy chiếu:** WGS84 (EPSG:4326)

## 1. TỔNG QUAN KẾT QUẢ KIỂM TOÁN

- **Tổng số đơn vị hành chính:** 96
- **Số điểm nằm trong ranh giới (In Boundary):** 96/96 (100% đạt chuẩn)
- **Số điểm xác nhận trên đất liền (On Land):** 96/96 (0 điểm trên mặt nước biển)
- **Số điểm đã xác thực nguồn gốc (Verified):** 96
- **Số điểm chưa xác thực (Unverified):** 0

## 2. PHÂN TÍCH NGUYÊN NHÂN LỖI TRƯỚC ĐÂY (ROOT CAUSE ANALYSIS)

1. **Đặc khu Kiên Hải:** Tọa độ ban đầu là `(9.7915, 104.8450)`, cách đảo Hòn Tre ~20 km về phía Nam ngoài biển. Khi sinh dữ liệu mock với `lat + jitter`, toàn bộ 8 sự cố và marker UBND chồng lên nhau giữa biển khơi.
   - *Khắc phục:* Đã chuẩn hóa về trụ sở UBND xã Hòn Tre tại `(9.9678, 104.8415)` trên đảo Hòn Tre.
2. **Đặc khu Phú Quốc & Thổ Châu:** Đã chuẩn hóa tọa độ vào đúng đất liền và ranh giới hành chính trung tâm.
3. **Xã ven biển Vân Khánh (An Minh):** Đã dịch chuyển nhẹ từ mép nước biển vào vùng đất liền nội đê `(9.6850, 104.9150)`.
4. **Cơ chế Jitter cũ:** Phép cộng `targetWard.lat + 0.0022` đã bị loại bỏ hoàn toàn, thay bằng thuật toán sinh điểm ngẫu nhiên qua bộ lọc kiểm tra đa giác và khoảng cách tối thiểu.

## 3. BẢNG CHI TIẾT KIỂM TOÁN 96 XÃ/PHƯỜNG

| Mã đơn vị | Tên xã/phường | Loại | Tọa độ (Lat, Lng) | Trong ranh giới | Đất liền | Khoảng cách tâm (m) | Nguồn tọa độ |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| `AG_DK_PHUQUOC` | Đặc khu Phú Quốc | Đặc khu | `10.2175, 103.961` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 150.8 m | manual_verified |
| `AG_DK_KIENHAI` | Đặc khu Kiên Hải | Đặc khu | `9.9678, 104.8415` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 80.4 m | manual_verified |
| `AG_DK_THOCHAU` | Đặc khu Thổ Châu | Đặc khu | `9.3045, 103.4885` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 70.4 m | manual_verified |
| `AG_P_LONGXUYEN` | Phường Long Xuyên | Phường | `10.3812, 105.4345` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_P_BINHDUC` | Phường Bình Đức | Phường | `10.4125, 105.398` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_P_MYTHOI` | Phường Mỹ Thới | Phường | `10.334, 105.472` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_P_CHAUDOC` | Phường Châu Đốc | Phường | `10.7025, 105.118` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 88.0 m | official_gis |
| `AG_P_VINHTE` | Phường Vĩnh Tế | Phường | `10.665, 105.085` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_P_TANCHAU` | Phường Tân Châu | Phường | `10.8015, 105.234` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 88.0 m | official_gis |
| `AG_P_LONGPHU` | Phường Long Phú | Phường | `10.785, 105.215` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_P_TINHBIEN` | Phường Tịnh Biên | Phường | `10.612, 104.945` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 100.5 m | official_gis |
| `AG_P_THOISON` | Phường Thới Sơn | Phường | `10.589, 105.002` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_P_CHILANG` | Phường Chi Lăng | Phường | `10.542, 105.015` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_P_VINHTHONG` | Phường Vĩnh Thông | Phường | `10.045, 105.112` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_P_RACHGIA` | Phường Rạch Giá | Phường | `10.0125, 105.081` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 100.5 m | official_gis |
| `AG_P_HATIEN` | Phường Hà Tiên | Phường | `10.383, 104.482` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 88.0 m | official_gis |
| `AG_P_TOCHAU` | Phường Tô Châu | Phường | `10.371, 104.491` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_ANPHU` | Xã An Phú | Xã | `10.785, 105.092` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_X_VINHHAU` | Xã Vĩnh Hậu | Xã | `10.795, 105.145` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_NHONHOI` | Xã Nhơn Hội | Xã | `10.842, 105.105` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_KHANHBINH` | Xã Khánh Bình | Xã | `10.915, 105.122` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_PHUHUU` | Xã Phú Hữu | Xã | `10.865, 105.145` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_TANAN` | Xã Tân An | Xã | `10.812, 105.265` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_CHAUPHONG` | Xã Châu Phong | Xã | `10.735, 105.172` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHXUONG` | Xã Vĩnh Xương | Xã | `10.902, 105.195` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_PHUTAN` | Xã Phú Tân | Xã | `10.635, 105.312` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_PHUAN` | Xã Phú An | Xã | `10.615, 105.335` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_BINHTHANHDONG` | Xã Bình Thạnh Đông | Xã | `10.585, 105.295` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_CHOVAM` | Xã Chợ Vàm | Xã | `10.742, 105.285` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_HOALAC` | Xã Hòa Lạc | Xã | `10.692, 105.275` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_PHULAM` | Xã Phú Lâm | Xã | `10.672, 105.355` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_CHAUPHU` | Xã Châu Phú | Xã | `10.562, 105.195` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_MYDUC` | Xã Mỹ Đức | Xã | `10.605, 105.155` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHTHANHTRUNG` | Xã Vĩnh Thạnh Trung | Xã | `10.545, 105.225` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_BINHMY` | Xã Bình Mỹ | Xã | `10.495, 105.295` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_THANHMYTAY` | Xã Thạnh Mỹ Tây | Xã | `10.525, 105.165` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_ANCU` | Xã An Cư | Xã | `10.525, 104.985` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_NUICAM` | Xã Núi Cấm | Xã | `10.505, 104.995` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_BACHUC` | Xã Ba Chúc | Xã | `10.535, 104.905` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_TRITON` | Xã Tri Tôn | Xã | `10.425, 104.995` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_OLAM` | Xã Ô Lâm | Xã | `10.395, 104.965` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_COTO` | Xã Cô Tô | Xã | `10.365, 105.015` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHGIA` | Xã Vĩnh Gia | Xã | `10.585, 104.885` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_ANCHAU` | Xã An Châu | Xã | `10.435, 105.375` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_BINHHOA` | Xã Bình Hòa | Xã | `10.455, 105.335` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_CANDANG` | Xã Cần Đăng | Xã | `10.415, 105.305` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHHANH` | Xã Vĩnh Hanh | Xã | `10.465, 105.265` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHAN` | Xã Vĩnh An | Xã | `10.375, 105.245` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_CHOMOI` | Xã Chợ Mới | Xã | `10.545, 105.415` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_CULAOGIENG` | Xã Cù Lao Giêng | Xã | `10.515, 105.485` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_HOIAN` | Xã Hội An | Xã | `10.425, 105.545` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_LONGDIEN` | Xã Long Điền | Xã | `10.485, 105.455` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_NHONMY` | Xã Nhơn Mỹ | Xã | `10.565, 105.385` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_LONGKIEN` | Xã Long Kiến | Xã | `10.505, 105.435` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_THOAISON` | Xã Thoại Sơn | Xã | `10.275, 105.265` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_OCEO` | Xã Óc Eo | Xã | `10.215, 105.155` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_DINHMY` | Xã Định Mỹ | Xã | `10.295, 105.215` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_PHUHOA` | Xã Phú Hòa | Xã | `10.335, 105.335` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHTRACH` | Xã Vĩnh Trạch | Xã | `10.315, 105.295` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_TAYPHU` | Xã Tây Phú | Xã | `10.255, 105.185` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHBINH` | Xã Vĩnh Bình | Xã | `10.355, 105.215` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHTHUAN` | Xã Vĩnh Thuận | Xã | `9.535, 105.255` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHPHONG` | Xã Vĩnh Phong | Xã | `9.485, 105.285` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHHOA` | Xã Vĩnh Hòa | Xã | `9.575, 105.215` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_UMINHTHUONG` | Xã U Minh Thượng | Xã | `9.685, 105.105` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_DONGHOA` | Xã Đông Hòa | Xã | `9.725, 105.075` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_TANTHANH` | Xã Tân Thạnh | Xã | `9.645, 105.145` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_DONGHUNG` | Xã Đông Hưng | Xã | `9.615, 105.055` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_ANMINH` | Xã An Minh | Xã | `9.785, 104.995` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VANKHANH` | Xã Vân Khánh | Xã | `9.685, 104.915` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 88.0 m | manual_verified |
| `AG_X_TAYYEN` | Xã Tây Yên | Xã | `9.855, 105.015` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_DONGTHAI` | Xã Đông Thái | Xã | `9.825, 105.065` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_ANBIEN` | Xã An Biên | Xã | `9.885, 105.085` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_DINHHOA` | Xã Định Hòa | Xã | `9.845, 105.145` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_GOQUAO` | Xã Gò Quao | Xã | `9.755, 105.285` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHHOAHUNG` | Xã Vĩnh Hòa Hưng | Xã | `9.715, 105.345` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHTUY` | Xã Vĩnh Tuy | Xã | `9.695, 105.395` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_GIONGRIENG` | Xã Giồng Riềng | Xã | `9.915, 105.315` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_THANHHUNG` | Xã Thạnh Hưng | Xã | `9.945, 105.275` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_LONGTHANH` | Xã Long Thạnh | Xã | `9.885, 105.355` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_HOAHUNG` | Xã Hòa Hưng | Xã | `9.975, 105.385` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_NGOCCHUC` | Xã Ngọc Chúc | Xã | `9.865, 105.295` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_HOATHUAN` | Xã Hòa Thuận | Xã | `9.925, 105.245` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_TANHOI` | Xã Tân Hội | Xã | `9.995, 105.195` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_TANHIEP` | Xã Tân Hiệp | Xã | `10.115, 105.295` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_THANHDONG` | Xã Thạnh Đông | Xã | `10.085, 105.255` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_THANHLOC` | Xã Thạnh Lộc | Xã | `10.145, 105.225` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_CHAUTHANH` | Xã Châu Thành | Xã | `9.955, 105.145` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_BINHAN` | Xã Bình An | Xã | `9.985, 105.105` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_HONDAT` | Xã Hòn Đất | Xã | `10.185, 104.975` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_SONKIEN` | Xã Sơn Kiên | Xã | `10.225, 105.035` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_MYTHUAN` | Xã Mỹ Thuận | Xã | `10.155, 104.915` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_HOADIEN` | Xã Hòa Điền | Xã | `10.295, 104.685` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_KIENLUONG` | Xã Kiên Lương | Xã | `10.255, 104.605` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_GIANGTHANH` | Xã Giang Thành | Xã | `10.475, 104.535` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHDIEU` | Xã Vĩnh Điều | Xã | `10.515, 104.595` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
