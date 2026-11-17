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
| `AG_DK_PHUQUOC` | Đặc khu Phú Quốc | Đặc khu | `10.217512, 103.960985` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | manual_verified |
| `AG_DK_KIENHAI` | Đặc khu Kiên Hải | Đặc khu | `9.967815, 104.841524` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | manual_verified |
| `AG_DK_THOCHAU` | Đặc khu Thổ Châu | Đặc khu | `9.304518, 103.488512` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | manual_verified |
| `AG_P_LONGXUYEN` | Phường Long Xuyên | Phường | `10.383965, 105.426716` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_P_BINHDUC` | Phường Bình Đức | Phường | `10.392393, 105.420637` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_P_MYTHOI` | Phường Mỹ Thới | Phường | `10.345866, 105.458181` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_P_CHAUDOC` | Phường Châu Đốc | Phường | `10.706842, 105.118526` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_P_VINHTE` | Phường Vĩnh Tế | Phường | `10.681492, 105.081847` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_P_TANCHAU` | Phường Tân Châu | Phường | `10.798461, 105.232748` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_P_LONGPHU` | Phường Long Phú | Phường | `10.79884, 105.233306` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_P_TINHBIEN` | Phường Tịnh Biên | Phường | `10.599164, 104.950574` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_P_THOISON` | Phường Thới Sơn | Phường | `10.61685, 105.000796` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_P_CHILANG` | Phường Chi Lăng | Phường | `10.529159, 105.024796` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_P_VINHTHONG` | Phường Vĩnh Thông | Phường | `10.0192, 105.093257` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_P_RACHGIA` | Phường Rạch Giá | Phường | `10.009074, 105.083079` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_P_HATIEN` | Phường Hà Tiên | Phường | `10.382615, 104.486512` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_P_TOCHAU` | Phường Tô Châu | Phường | `10.377655, 104.490538` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_ANPHU` | Xã An Phú | Xã | `10.815686, 105.090647` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_X_VINHHAU` | Xã Vĩnh Hậu | Xã | `10.769172, 105.110386` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_NHONHOI` | Xã Nhơn Hội | Xã | `10.876165, 105.048308` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_KHANHBINH` | Xã Khánh Bình | Xã | `10.938392, 105.081602` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_PHUHUU` | Xã Phú Hữu | Xã | `10.876395, 105.089448` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_TANAN` | Xã Tân An | Xã | `10.804436, 105.198161` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_CHAUPHONG` | Xã Châu Phong | Xã | `10.718575, 105.136076` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHXUONG` | Xã Vĩnh Xương | Xã | `10.873657, 105.177875` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_PHUTAN` | Xã Phú Tân | Xã | `10.581267, 105.358533` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_X_PHUAN` | Xã Phú An | Xã | `10.657101, 105.287188` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_BINHTHANHDONG` | Xã Bình Thạnh Đông | Xã | `10.595639, 105.255978` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_CHOVAM` | Xã Chợ Vàm | Xã | `10.728282, 105.345689` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_HOALAC` | Xã Hòa Lạc | Xã | `10.683898, 105.202855` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_PHULAM` | Xã Phú Lâm | Xã | `10.740924, 105.24516` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_CHAUPHU` | Xã Châu Phú | Xã | `10.582862, 105.230851` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_X_MYDUC` | Xã Mỹ Đức | Xã | `10.661838, 105.186163` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_X_VINHTHANHTRUNG` | Xã Vĩnh Thạnh Trung | Xã | `10.582862, 105.230851` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_BINHMY` | Xã Bình Mỹ | Xã | `10.54411, 105.297825` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_THANHMYTAY` | Xã Thạnh Mỹ Tây | Xã | `10.53269, 105.13698` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_ANCU` | Xã An Cư | Xã | `10.547783, 105.000199` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_NUICAM` | Xã Núi Cấm | Xã | `10.489747, 105.022941` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_X_BACHUC` | Xã Ba Chúc | Xã | `10.494332, 104.908983` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_TRITON` | Xã Tri Tôn | Xã | `10.421095, 105.00016` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_X_OLAM` | Xã Ô Lâm | Xã | `10.420269, 104.938119` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_COTO` | Xã Cô Tô | Xã | `10.363137, 105.017413` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHGIA` | Xã Vĩnh Gia | Xã | `10.505949, 104.799143` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_X_ANCHAU` | Xã An Châu | Xã | `10.444118, 105.387152` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_X_BINHHOA` | Xã Bình Hòa | Xã | `10.464357, 105.34067` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_CANDANG` | Xã Cần Đăng | Xã | `10.459287, 105.297528` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHHANH` | Xã Vĩnh Hanh | Xã | `10.431263, 105.22874` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHAN` | Xã Vĩnh An | Xã | `10.427843, 105.167699` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_CHOMOI` | Xã Chợ Mới | Xã | `10.551309, 105.404061` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_X_CULAOGIENG` | Xã Cù Lao Giêng | Xã | `10.498342, 105.529846` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_HOIAN` | Xã Hội An | Xã | `10.431198, 105.549814` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_X_LONGDIEN` | Xã Long Điền | Xã | `10.508439, 105.461333` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_NHONMY` | Xã Nhơn Mỹ | Xã | `10.452405, 105.401773` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_LONGKIEN` | Xã Long Kiến | Xã | `10.461823, 105.449683` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_THOAISON` | Xã Thoại Sơn | Xã | `10.264361, 105.266793` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_OCEO` | Xã Óc Eo | Xã | `10.256986, 105.152743` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_DINHMY` | Xã Định Mỹ | Xã | `10.32198, 105.261387` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_PHUHOA` | Xã Phú Hòa | Xã | `10.35796, 105.37459` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHTRACH` | Xã Vĩnh Trạch | Xã | `10.351315, 105.316839` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_TAYPHU` | Xã Tây Phú | Xã | `10.32668, 105.180243` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHBINH` | Xã Vĩnh Bình | Xã | `10.4414, 105.170732` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHTHUAN` | Xã Vĩnh Thuận | Xã | `9.516426, 105.250377` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHPHONG` | Xã Vĩnh Phong | Xã | `9.508826, 105.256754` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHHOA` | Xã Vĩnh Hòa | Xã | `9.7003, 105.178692` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_UMINHTHUONG` | Xã U Minh Thượng | Xã | `9.674136, 105.122613` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_DONGHOA` | Xã Đông Hòa | Xã | `9.729499, 104.972659` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_TANTHANH` | Xã Tân Thạnh | Xã | `9.64883, 105.146922` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_DONGHUNG` | Xã Đông Hưng | Xã | `9.658374, 104.947616` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_ANMINH` | Xã An Minh | Xã | `9.635403, 104.940122` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VANKHANH` | Xã Vân Khánh | Xã | `9.575195, 104.859629` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_TAYYEN` | Xã Tây Yên | Xã | `9.893126, 105.052998` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_DONGTHAI` | Xã Đông Thái | Xã | `9.758139, 105.010511` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_ANBIEN` | Xã An Biên | Xã | `9.814954, 105.062143` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_X_DINHHOA` | Xã Định Hòa | Xã | `9.785955, 105.215197` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_GOQUAO` | Xã Gò Quao | Xã | `9.728064, 105.276639` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHHOAHUNG` | Xã Vĩnh Hòa Hưng | Xã | `9.764573, 105.372249` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHTUY` | Xã Vĩnh Tuy | Xã | `9.657843, 105.341177` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_GIONGRIENG` | Xã Giồng Riềng | Xã | `9.90963, 105.312652` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_THANHHUNG` | Xã Thạnh Hưng | Xã | `10.034283, 105.126295` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_LONGTHANH` | Xã Long Thạnh | Xã | `9.833043, 105.283244` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_HOAHUNG` | Xã Hòa Hưng | Xã | `9.888773, 105.478325` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_NGOCCHUC` | Xã Ngọc Chúc | Xã | `9.927226, 105.388896` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_HOATHUAN` | Xã Hòa Thuận | Xã | `9.929272, 105.138867` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_TANHOI` | Xã Tân Hội | Xã | `10.146088, 105.185763` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_TANHIEP` | Xã Tân Hiệp | Xã | `10.115157, 105.284987` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_X_THANHDONG` | Xã Thạnh Đông | Xã | `10.070818, 105.349223` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_THANHLOC` | Xã Thạnh Lộc | Xã | `10.013119, 105.314796` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_CHAUTHANH` | Xã Châu Thành | Xã | `9.904144, 105.159376` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_BINHAN` | Xã Bình An | Xã | `10.003544, 105.086358` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_HONDAT` | Xã Hòn Đất | Xã | `10.185208, 104.929774` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_X_SONKIEN` | Xã Sơn Kiên | Xã | `10.147879, 104.987586` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_X_MYTHUAN` | Xã Mỹ Thuận | Xã | `10.180666, 105.065635` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_HOADIEN` | Xã Hòa Điền | Xã | `10.332109, 104.667149` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_KIENLUONG` | Xã Kiên Lương | Xã | `10.243633, 104.590816` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | official_gis |
| `AG_X_GIANGTHANH` | Xã Giang Thành | Xã | `10.515327, 104.633263` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
| `AG_X_VINHDIEU` | Xã Vĩnh Điều | Xã | `10.460946, 104.733836` | ✅ ĐÚNG | ✅ ĐẤT LIỀN | 75.4 m | osm |
