-- =====================================================================
-- SmartWard AI - Database Migration V14: SLA Nullability & HITL Persistence
-- 1. Adds nullable sla_working_days to admin_procedures (unverified -> NULL)
-- 2. Drops NOT NULL constraint on citizen_dossiers.sla_deadline
-- 3. Persists HITL gray-zone queue in PostgreSQL so backend restarts do not lose pending items
-- =====================================================================

ALTER TABLE admin_procedures ADD COLUMN IF NOT EXISTS sla_working_days INT NULL;

ALTER TABLE citizen_dossiers ALTER COLUMN sla_deadline DROP NOT NULL;

CREATE TABLE IF NOT EXISTS hitl_gray_zone_queue (
    id VARCHAR(64) PRIMARY KEY,
    query TEXT NOT NULL,
    ward_name VARCHAR(120) NOT NULL,
    similarity_score DOUBLE PRECISION NOT NULL,
    candidate_chunk_code VARCHAR(120),
    candidate_procedure_name TEXT,
    legal_reference TEXT,
    suggested_answer TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at VARCHAR(64) NOT NULL,
    resolved_by VARCHAR(120),
    created_at_ts TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hitl_queue_status ON hitl_gray_zone_queue(status);
CREATE INDEX IF NOT EXISTS idx_hitl_queue_created_ts ON hitl_gray_zone_queue(created_at_ts DESC);

INSERT INTO hitl_gray_zone_queue (
    id, query, ward_name, similarity_score, candidate_chunk_code,
    candidate_procedure_name, legal_reference, suggested_answer,
    status, created_at, resolved_by
) VALUES
(
    'HITL-AG-001',
    'Ba tôi già yếu đi lại khó khăn thì xã có cử người xuống tận nhà lăn tay chứng thực chữ ký được không?',
    'Phường Mỹ Bình',
    0.612,
    'TTHC-CT-02-DIEU24',
    'Chứng thực chữ ký trong các giấy tờ, văn bản',
    'Khoản 2 Điều 10 & Điều 24 Nghị định 23/2015/NĐ-CP',
    E'1. TÓM TẮT THỦ TỤC:\nNgười yêu cầu chứng thực già yếu, không thể đi lại được phép yêu cầu UBND cấp xã thực hiện chứng thực chữ ký ngoài trụ sở (tại nhà riêng).\n\n2. THÀNH PHẦN HỒ SƠ:\n- Bản chính CCCD của người yêu cầu chứng thực.\n- Văn bản, giấy tờ cần chứng thực chữ ký (điểm chỉ).\n\n3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n- Giải quyết trong ngày nhận yêu cầu.\n- Miễn thu chi phí đi lại ngoài trụ sở đối với người già yếu không thể đi lại theo quy định.\n\n4. NƠI TIẾP NHẬN & XỬ LÝ:\n- Bộ phận Một cửa UBND xã/phường tiếp nhận thông tin và cử công chức Tư pháp - Hộ tịch đến xác minh trực tiếp.\n\n5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n- Khoản 2 Điều 10 và Điều 24 Nghị định 23/2015/NĐ-CP [TTHC-CT-02-DIEU24].',
    'PENDING',
    '2026-11-05 08:40',
    NULL
),
(
    'HITL-AG-002',
    'Vợ chồng tôi làm mất giấy đăng ký kết hôn bản gốc từ năm 1998 ở xã cũ trước khi sáp nhập thì xin trích lục hay đăng ký lại?',
    'Phường Long Xuyên',
    0.568,
    'TTHC-HT-05-DIEU24',
    'Đăng ký lại kết hôn / Cấp bản sao trích lục hộ tịch',
    'Điều 24 Nghị định 123/2015/NĐ-CP',
    E'1. TÓM TẮT THỦ TỤC:\n- Nếu Sổ đăng ký kết hôn năm 1998 tại UBND xã vẫn còn lưu trữ: Thực hiện thủ tục Cấp bản sao trích lục kết hôn.\n- Nếu cả bản chính Giấy chứng nhận kết hôn và Sổ hộ tịch gốc đều bị mất/hư hỏng: Thực hiện thủ tục Đăng ký lại kết hôn.\n\n2. THÀNH PHẦN HỒ SƠ:\n- Tờ khai theo mẫu quy định.\n- Bản sao giấy tờ, tài liệu chứng minh quan hệ vợ chồng (nếu đăng ký lại).\n\n3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n- Trích lục bản sao: Giải quyết ngay trong ngày.\n- Đăng ký lại kết hôn: 05 ngày làm việc.\n\n4. NƠI TIẾP NHẬN & XỬ LÝ:\n- Bộ phận Một cửa UBND xã/phường nơi đã đăng ký trước đây hoặc nơi thường trú hiện tại.\n\n5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n- Điều 24 Nghị định 123/2015/NĐ-CP [TTHC-HT-05-DIEU24].',
    'PENDING',
    '2026-11-05 09:15',
    NULL
),
(
    'HITL-AG-003',
    'Cháu ngoại về ở nhà ông bà ngoại để đi học cấp 2 thì khai báo tạm trú hay nhập hộ khẩu thường trú?',
    'Xã An Phú',
    0.645,
    'TTHC-CR-01-DIEU20',
    'Đăng ký thường trú / Đăng ký tạm trú (Mẫu CT01)',
    'Khoản 2 Điều 20 Luật Cư trú 2020',
    E'1. TÓM TẮT THỦ TỤC:\nNgười chưa thành niên được đăng ký thường trú hoặc tạm trú tại chỗ ở hợp pháp của ông bà ngoại nếu được cha, mẹ hoặc người giám hộ và chủ hộ (ông bà ngoại) đồng ý.\n\n2. THÀNH PHẦN HỒ SƠ:\n- Tờ khai thay đổi thông tin cư trú (Mẫu CT01) có ý kiến đồng ý của cha mẹ và chủ hộ.\n- Giấy tờ chứng minh mối quan hệ nhân thân với chủ hộ (Giấy khai sinh của mẹ và của cháu).\n\n3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n- Thường trú: 07 ngày làm việc; Tạm trú: 03 ngày làm việc.\n\n4. NƠI TIẾP NHẬN & XỬ LÝ:\n- Công an cấp xã hoặc Cổng Dịch vụ công Bộ Công an / ứng dụng VNeID.\n\n5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n- Khoản 2 Điều 20 Luật Cư trú 2020 [TTHC-CR-01-DIEU20].',
    'APPROVED',
    '2026-11-05 07:50',
    'Cán bộ Trần Thị Hương'
)
ON CONFLICT (id) DO NOTHING;
