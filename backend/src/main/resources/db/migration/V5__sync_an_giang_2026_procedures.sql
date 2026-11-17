-- =====================================================================
-- SmartWard AI - Database Migration V5: Sync An Giang 2026 Mandates
-- Standardize 40 administrative procedures and legal chunks to An Giang 2026 regulations
-- Legal Mandates:
--   - Ho tich & Lien thong dien tu: QD 408/QD-UBND (29/01/2026) An Giang; ND 301/2026/ND-CP & QD 1868/QD-BTP
--   - Cu tru: Thong tu 116/2026/TT-BCA (Mau CT01 moi) & ND 154/2024/ND-CP
--   - Bao tro xa hoi: Nghi dinh 335/2026/ND-CP (21/08/2026) & QD 4595/QD-UBND (07/10/2026) An Giang
--   - Dat dai cap xa: Nghi dinh 49/2026/ND-CP (31/01/2026) & QD 3828/QD-UBND, QD 5025/QD-UBND (2026) An Giang
--   - Chung thuc & Phi dia gioi: Nghi dinh 18/2026/ND-CP, Nghi dinh 23/2015/ND-CP, Nghi dinh 309/2026/ND-CP
-- =====================================================================

-- 1. Synchronize admin_procedures specific entries
UPDATE admin_procedures
SET procedure_name = 'Thủ tục trợ cấp xã hội hằng tháng cho đối tượng bảo trợ xã hội ở cộng đồng',
    agency = 'UBND cấp xã thuộc tỉnh An Giang',
    fee = 'Miễn phí / Không thu lệ phí',
    processing_time = 'DIRECT: 10 ngày làm việc kể từ ngày tiếp nhận hồ sơ đầy đủ, hợp lệ | ONLINE: 10 ngày làm việc kể từ ngày tiếp nhận hồ sơ đầy đủ, hợp lệ | POSTAL: 10 ngày làm việc kể từ ngày tiếp nhận hồ sơ đầy đủ, hợp lệ',
    updated_at = CURRENT_TIMESTAMP
WHERE procedure_code = 'TTHC-BT-01';

UPDATE admin_procedures
SET procedure_name = 'Hỗ trợ chi phí mai táng cho đối tượng bảo trợ xã hội',
    agency = 'UBND cấp xã thuộc tỉnh An Giang',
    fee = 'Miễn phí / Không thu lệ phí',
    processing_time = 'DIRECT: 03 ngày làm việc kể từ ngày nhận đủ hồ sơ hợp lệ | ONLINE: 03 ngày làm việc kể từ ngày nhận đủ hồ sơ hợp lệ | POSTAL: 03 ngày làm việc kể từ ngày nhận đủ hồ sơ hợp lệ',
    updated_at = CURRENT_TIMESTAMP
WHERE procedure_code = 'TTHC-BT-02';

UPDATE admin_procedures
SET procedure_name = 'Thủ tục hỗ trợ chi phí mai táng cho đối tượng được trợ cấp xã hội hàng tháng ở cộng đồng',
    agency = 'UBND cấp xã thuộc tỉnh An Giang',
    fee = 'Miễn phí / Không thu lệ phí',
    processing_time = 'DIRECT: 03 ngày làm việc kể từ ngày nhận đủ hồ sơ hợp lệ | ONLINE: 03 ngày làm việc kể từ ngày nhận đủ hồ sơ hợp lệ | POSTAL: 03 ngày làm việc kể từ ngày nhận đủ hồ sơ hợp lệ',
    updated_at = CURRENT_TIMESTAMP
WHERE procedure_code = 'TTHC-BT-05';

UPDATE admin_procedures
SET agency = 'Công an xã, phường, đặc khu thuộc tỉnh An Giang',
    updated_at = CURRENT_TIMESTAMP
WHERE procedure_code = 'TTHC-CR-04';

UPDATE admin_procedures
SET procedure_name = 'Đăng ký biến động quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất trong các trường hợp chuyển đổi quyền sử dụng đất nông nghiệp mà không theo phương án dồn điền, đổi thửa; chuyển nhượng, thừa kế, tặng cho quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất, góp vốn bằng quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất (kể cả tặng cho quyền sử dụng đất cho Nhà nước hoặc cộng đồng dân cư hoặc mở rộng đường giao thông); cho thuê, cho thuê lại quyền sử dụng đất trong dự án xây dựng kinh doanh kết cấu hạ tầng; bán hoặc tặng cho hoặc để thừa kế hoặc góp vốn bằng tài sản gắn liền với đất thuê của Nhà nước theo hình thức thuê đất trả tiền hàng năm',
    agency = 'UBND cấp xã thuộc tỉnh An Giang / Chi nhánh Văn phòng Đăng ký đất đai',
    updated_at = CURRENT_TIMESTAMP
WHERE procedure_code = 'TTHC-DC-01';

UPDATE admin_procedures
SET procedure_name = 'Đăng ký đất đai, tài sản gắn liền với đất, cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất lần đầu đối với tổ chức đang sử dụng đất, hộ gia đình, cá nhân, cộng đồng dân cư',
    agency = 'UBND cấp xã thuộc tỉnh An Giang / Chi nhánh Văn phòng Đăng ký đất đai',
    updated_at = CURRENT_TIMESTAMP
WHERE procedure_code = 'TTHC-DC-02';

UPDATE admin_procedures
SET procedure_name = 'Đăng ký biến động đối với trường hợp thay đổi quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất theo thỏa thuận của các thành viên hộ gia đình hoặc của vợ và chồng; quyền sử dụng đất xây dựng công trình trên mặt đất phục vụ cho việc vận hành, khai thác sử dụng công trình ngầm, quyền sở hữu công trình ngầm; bán tài sản, điều chuyển, chuyển nhượng quyền sử dụng đất là tài sản công theo quy định của pháp luật về quản lý, sử dụng tài sản công; nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất theo kết quả giải quyết tranh chấp, khiếu nại, tố cáo về đất đai hoặc bản án, quyết định của Tòa án, quyết định thi hành án của cơ quan thi hành án đã được thi hành; quyết định hoặc phán quyết của Trọng tài thương mại Việt Nam về giải quyết tranh chấp giữa các bên phát sinh từ hoạt động thương mại liên quan đến đất đai; nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất do xử lý tài sản thế chấp là quyền sử dụng đất, tài sản gắn liền với đất đã được đăng ký, bao gồm cả xử lý khoản nợ có nguồn gốc từ khoản nợ xấu của tổ chức tín dụng, chi nhánh ngân hàng nước ngoài',
    agency = 'Ủy ban nhân dân cấp xã thuộc tỉnh An Giang',
    updated_at = CURRENT_TIMESTAMP
WHERE procedure_code = 'TTHC-XD-01';

UPDATE admin_procedures
SET procedure_name = 'Điều chỉnh, gia hạn Giấy phép xây dựng nhà ở riêng lẻ',
    agency = 'Ủy ban nhân dân cấp xã thuộc tỉnh An Giang',
    updated_at = CURRENT_TIMESTAMP
WHERE procedure_code = 'TTHC-XD-02';

UPDATE admin_procedures
SET agency = 'Ủy ban nhân dân cấp xã thuộc tỉnh An Giang',
    updated_at = CURRENT_TIMESTAMP
WHERE procedure_code = 'TTHC-NCC-01';

-- 2. Clean any remaining Da Nang or non-An Giang locality mentions in admin_procedures
UPDATE admin_procedures
SET agency = REPLACE(REPLACE(agency, 'Thành phố Đà Nẵng', 'tỉnh An Giang'), 'Đà Nẵng', 'An Giang'),
    updated_at = CURRENT_TIMESTAMP
WHERE agency LIKE '%Đà Nẵng%';

UPDATE admin_procedures
SET procedure_name = REPLACE(procedure_name, '(Đà Nẵng) ', ''),
    updated_at = CURRENT_TIMESTAMP
WHERE procedure_name LIKE '%(Đà Nẵng)%';

UPDATE admin_procedures
SET procedure_name = REPLACE(procedure_name, 'Đà Nẵng', 'An Giang'),
    updated_at = CURRENT_TIMESTAMP
WHERE procedure_name LIKE '%Đà Nẵng%';

-- 3. Synchronize legal_chunks table
UPDATE legal_chunks
SET title = REPLACE(title, '(Đà Nẵng) ', ''),
    content = REPLACE(REPLACE(REPLACE(REPLACE(content, 'Thành phố Đà Nẵng', 'tỉnh An Giang'), 'Đà Nẵng', 'An Giang'), 'UBND thành phố', 'UBND tỉnh An Giang'), 'Trung tâm Phục vụ hành chính công thành phố', 'Trung tâm Phục vụ hành chính công tỉnh An Giang'),
    legal_reference = REPLACE(legal_reference, '(Thành phố Đà Nẵng)', '(Tỉnh An Giang)')
WHERE title LIKE '%Đà Nẵng%' OR content LIKE '%Đà Nẵng%' OR legal_reference LIKE '%Đà Nẵng%';

UPDATE legal_chunks
SET content = REPLACE(content, 'Quyết định số 135/2026/QĐ-UBND', 'Quyết định số 3828/QĐ-UBND'),
    legal_reference = REPLACE(legal_reference, '135/2026/QĐ-UBND', '3828/QĐ-UBND')
WHERE content LIKE '%135/2026/QĐ-UBND%' OR legal_reference LIKE '%135/2026/QĐ-UBND%';

UPDATE legal_chunks
SET content = REPLACE(content, 'Quyết định số 91/2026/QĐ-UBND', 'Quyết định số 5025/QĐ-UBND'),
    legal_reference = REPLACE(legal_reference, '91/2026/QĐ-UBND', '5025/QĐ-UBND')
WHERE content LIKE '%91/2026/QĐ-UBND%' OR legal_reference LIKE '%91/2026/QĐ-UBND%';

UPDATE legal_chunks
SET content = REPLACE(content, 'Nghị quyết số 41/2025/NQ-HĐND', 'Nghị định số 335/2026/NĐ-CP và Quyết định số 4595/QĐ-UBND'),
    legal_reference = REPLACE(legal_reference, 'Nghị quyết số 41/2025/NQ-HĐND', 'Nghị định số 335/2026/NĐ-CP và Quyết định số 4595/QĐ-UBND')
WHERE content LIKE '%41/2025/NQ-HĐND%' OR legal_reference LIKE '%41/2025/NQ-HĐND%';

UPDATE legal_chunks
SET content = REPLACE(content, 'Mẫu số 25', 'Mẫu số 18')
WHERE content LIKE '%Mẫu số 25%'
  AND procedure_id IN (SELECT id FROM admin_procedures WHERE procedure_code IN ('TTHC-DC-01', 'TTHC-XD-01'));
