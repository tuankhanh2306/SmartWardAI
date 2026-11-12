# -*- coding: utf-8 -*-
"""Sinh bo slide bao ve SmartWard AI (PPTX, 16:9). Chay: python docs/slides/build_slides.py"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CH = os.path.join(ROOT, "evaluation", "charts")
OUT = os.path.join(os.path.dirname(__file__), "SmartWardAI_BaoVe.pptx")

FONT = "Arial"
BLUE = RGBColor(0x1F, 0x4E, 0xD8)
DARK = RGBColor(0x0F, 0x17, 0x2A)
GRAY = RGBColor(0x55, 0x60, 0x70)
LIGHT = RGBColor(0xEE, 0xF2, 0xFB)
GREEN = RGBColor(0x16, 0xA3, 0x4A)
RED = RGBColor(0xDC, 0x26, 0x26)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
BLANK = prs.slide_layouts[6]
counter = {"n": 0}


def _run(p, text, size, color=DARK, bold=False):
    r = p.add_run()
    r.text = text
    r.font.size, r.font.bold, r.font.name = Pt(size), bold, FONT
    r.font.color.rgb = color
    return r


def box(s, x, y, w, h, fill=LIGHT, line=None, shape=MSO_SHAPE.ROUNDED_RECTANGLE):
    sh = s.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    sh.fill.solid()
    sh.fill.fore_color.rgb = fill
    if line:
        sh.line.color.rgb = line
    else:
        sh.line.fill.background()
    sh.shadow.inherit = False
    return sh


def text(s, x, y, w, h, lines, size=18, color=DARK, bold=False, align=None, anchor=MSO_ANCHOR.TOP):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    if isinstance(lines, str):
        lines = [lines]
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        if align:
            p.alignment = align
        _run(p, ln, size, color, bold)
    return tb


def bullets(s, x, y, w, h, items, size=18):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    for i, it in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(8)
        sub = it.startswith("  ")
        _run(p, ("– " if sub else "• ") + it.strip(), size - 2 if sub else size, GRAY if sub else DARK)
        if sub:
            p.level = 1
    return tb


def slide(title, notes="", section=None):
    s = prs.slides.add_slide(BLANK)
    counter["n"] += 1
    box(s, 0, 0, 13.333, 0.12, BLUE, shape=MSO_SHAPE.RECTANGLE)
    text(s, 0.6, 0.35, 12.1, 1.0, title, 28, DARK, True, anchor=MSO_ANCHOR.MIDDLE)
    if section:
        text(s, 0.6, 0.2, 6, 0.3, section.upper(), 11, BLUE, True)
    text(s, 12.2, 7.05, 0.8, 0.3, str(counter["n"]), 11, GRAY, align=PP_ALIGN.RIGHT)
    text(s, 0.6, 7.05, 8, 0.3, "SmartWard AI – UTH", 11, GRAY)
    if notes:
        s.notes_slide.notes_text_frame.text = notes
    return s


def table(s, x, y, w, rows, col_w=None, size=15, hl_row=None, row_h=0.5):
    nr, nc = len(rows), len(rows[0])
    gt = s.shapes.add_table(nr, nc, Inches(x), Inches(y), Inches(w), Inches(row_h * nr)).table
    if col_w:
        for i, cw in enumerate(col_w):
            gt.columns[i].width = Inches(cw)
    for r in range(nr):
        for c in range(nc):
            cell = gt.cell(r, c)
            cell.text = ""
            p = cell.text_frame.paragraphs[0]
            head = r == 0
            hl = hl_row is not None and r == hl_row
            _run(p, str(rows[r][c]), size, WHITE if head else DARK, head or hl)
            cell.fill.solid()
            cell.fill.fore_color.rgb = BLUE if head else (RGBColor(0xDC, 0xFC, 0xE7) if hl else (LIGHT if r % 2 else WHITE))
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
    return gt


def image(s, name, x, y, w=None, h=None):
    path = os.path.join(CH, name)
    if os.path.exists(path):
        kw = {}
        if w:
            kw["width"] = Inches(w)
        if h:
            kw["height"] = Inches(h)
        s.shapes.add_picture(path, Inches(x), Inches(y), **kw)
    else:
        placeholder(s, x, y, w or 5, h or 3, name)


def placeholder(s, x, y, w, h, label):
    b = box(s, x, y, w, h, RGBColor(0xF8, 0xFA, 0xFC), GRAY)
    b.line.dash_style = 4
    tf = b.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    _run(p, "[Chèn ảnh: " + label + "]", 14, GRAY)


def flow(s, x, y, labels, w=2.2, h=1.0, gap=0.35, fills=None, size=14):
    for i, lb in enumerate(labels):
        bx = x + i * (w + gap)
        f = (fills or {}).get(i, LIGHT)
        b = box(s, bx, y, w, h, f, BLUE)
        tf = b.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        _run(p, lb, size, DARK, True)
        if i < len(labels) - 1:
            ar = s.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(bx + w + 0.04), Inches(y + h / 2 - 0.15), Inches(gap - 0.08), Inches(0.3))
            ar.fill.solid()
            ar.fill.fore_color.rgb = BLUE
            ar.line.fill.background()


def callout(s, x, y, w, h, lines, fill=BLUE, color=WHITE, size=16):
    b = box(s, x, y, w, h, fill)
    tf = b.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.CENTER
        _run(p, ln, size, color, i == 0)


# ============================ A. MO DAU ============================
# 1. Tieu de
s = prs.slides.add_slide(BLANK)
counter["n"] += 1
box(s, 0, 0, 13.333, 7.5, DARK, shape=MSO_SHAPE.RECTANGLE)
box(s, 0.8, 2.0, 0.12, 2.2, BLUE, shape=MSO_SHAPE.RECTANGLE)
text(s, 1.2, 1.9, 11, 1.8, ["SmartWard AI", "Hệ thống hỗ trợ thủ tục hành chính và phân luồng phản ánh cấp phường/xã"], 34, WHITE, True)
text(s, 1.2, 4.4, 11, 2.2, [
    "Sinh viên thực hiện: Trịnh Tuấn Khánh",
    "Giảng viên hướng dẫn: TS. Lê Văn Quốc Anh",
    "Cán bộ hướng dẫn doanh nghiệp: Kỹ sư Trưởng Giải pháp Số – Viettel An Giang",
    "Viện Đào tạo Chất lượng cao – Trường Đại học Giao thông vận tải TP.HCM (UTH)"], 16, RGBColor(0xCB, 0xD5, 0xE1))
s.notes_slide.notes_text_frame.text = "Chào hội đồng, giới thiệu bản thân, đề tài và thời lượng trình bày khoảng 20 phút (có demo)."

# 2. Boi canh
s = slide("Hai nút thắt tại bộ phận Một cửa cấp xã", "Nêu 2 vấn đề thực tiễn, phạm vi 96 đơn vị hành chính An Giang và 40 thủ tục. Kết bằng mục tiêu: 1 cổng công dân + 1 bàn làm việc cán bộ, chi phí bằng 0.", "Mở đầu")
box(s, 0.6, 1.5, 6.0, 2.9, LIGHT, BLUE)
text(s, 0.8, 1.6, 5.6, 0.5, "1. Hồ sơ sai biểu mẫu", 20, BLUE, True)
bullets(s, 0.8, 2.15, 5.6, 2.3, ["CCCD sai định dạng", "Ngày sinh – ngày cấp mâu thuẫn", "Hồ sơ bị trả về nhiều lần, cán bộ quá tải"], 16)
box(s, 6.8, 1.5, 6.0, 2.9, LIGHT, BLUE)
text(s, 7.0, 1.6, 5.6, 0.5, "2. Phản ánh trùng lặp, phân mảnh", 20, BLUE, True)
bullets(s, 7.0, 2.15, 5.6, 2.3, ["Nhiều người báo cùng một sự cố", "Lời lẽ khác nhau, GPS lệch", "Khó gom nhóm và phân công xử lý"], 16)
callout(s, 0.6, 4.7, 4.0, 1.3, ["Phạm vi", "96 đơn vị hành chính – An Giang"])
callout(s, 4.75, 4.7, 4.0, 1.3, ["Quy mô nghiệp vụ", "40 thủ tục hành chính cấp xã"])
callout(s, 8.9, 4.7, 3.9, 1.3, ["Ràng buộc", "Zero-cost, RAM ≤ 2 GB"], GREEN)

# 3. RQ
s = slide("Ba câu hỏi nghiên cứu", "Mỗi RQ gắn với một module và một slide kết quả. Đây là xương sống của phần thực nghiệm.", "Mở đầu")
rq = [("RQ1", "RAG chunk theo Điều–Khoản + ngưỡng từ chối θ có giảm ảo giác so với LLM thuần không?", "Module 1 – Legal RAG", "Slide 14"),
      ("RQ2", "Lọc không gian + ngữ nghĩa có gom cụm phản ánh tốt hơn từng phương pháp riêng không? Ngưỡng (R, τ) tối ưu?", "Module 3 – Triage", "Slide 15"),
      ("RQ3", "Rule Engine tất định sau OCR chặn được bao nhiêu lỗi logic trên tờ khai?", "Module 2 – Rule Engine", "Slide 16")]
for i, (k, q, m, sl) in enumerate(rq):
    y = 1.6 + i * 1.75
    box(s, 0.6, y, 1.4, 1.5, BLUE)
    text(s, 0.6, y, 1.4, 1.5, k, 26, WHITE, True, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)
    box(s, 2.1, y, 8.2, 1.5, LIGHT)
    text(s, 2.3, y + 0.05, 7.8, 1.4, q, 17, DARK, anchor=MSO_ANCHOR.MIDDLE)
    box(s, 10.4, y, 2.4, 1.5, WHITE, BLUE)
    text(s, 10.4, y, 2.4, 1.5, [m, sl], 14, BLUE, True, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)

# 4. Dong gop
s = slide("Đóng góp: phần có sẵn và phần tự thiết kế", "Làm rõ ranh giới học thuật: Gemini, pgvector, Redis, MinIO là có sẵn; thuật toán và quy tắc nghiệp vụ là phần sinh viên tự làm.", "Mở đầu")
table(s, 0.6, 1.5, 12.1, [
    ["Hạng mục", "Công cụ có sẵn", "Sinh viên tự thiết kế và lập trình"],
    ["Hỏi đáp thủ tục (RAG)", "Gemini embedding, LLM", "Chunking Điều–Khoản + metadata hiệu lực; guardrail θ; hậu kiểm trích dẫn"],
    ["Kiểm tra tờ khai", "Vision OCR", "Rule Engine Java: CCCD 12 số, logic ngày tháng, kiểm chéo giấy chứng sinh"],
    ["Gom nhóm phản ánh", "Redis GEO, pgvector", "Triage 2 pha; Grid Search (R, τ) theo F1"],
    ["Bảo mật hồ sơ", "AES-GCM, MinIO", "Dynamic watermark; token one-time bằng GETDEL"],
    ["Đánh giá", "—", "Bộ benchmark 80 câu / 150 phản ánh / 40 tờ khai + runner tự động"],
], [2.6, 2.9, 6.6], 14, row_h=0.85)

# 5. Lo trinh
s = slide("Phương pháp thực hiện: 4 giai đoạn, 12 tuần", "Tóm tắt nhanh lộ trình, ánh xạ giai đoạn với các chương của báo cáo.", "Mở đầu")
flow(s, 0.6, 1.8, ["GĐ1 (Tuần 1–3)\nHạ tầng, dữ liệu, Mock AI", "GĐ2 (Tuần 4–7)\n4 module lõi", "GĐ3 (Tuần 8–9)\nThực nghiệm, Grid Search", "GĐ4 (Tuần 10–12)\nGiao diện, báo cáo, bảo vệ"], w=2.7, h=1.5, gap=0.4, size=14)
table(s, 0.6, 4.0, 12.1, [
    ["Giai đoạn", "Sản phẩm chính", "Chương báo cáo"],
    ["1", "docker-compose, Flyway (6 bảng), seed 40 thủ tục", "Chương 1–2"],
    ["2", "RAG, Rule Engine, Triage, Vault", "Chương 3"],
    ["3", "Bộ dữ liệu, Grid Search, phân tích lỗi", "Chương 4"],
    ["4", "React PWA, đóng gói Docker, báo cáo, slide", "Chương 5, kết luận"],
], [1.6, 7.5, 3.0], 14, row_h=0.55)

# ============================ B. THIET KE ============================
# 6. Kien truc
s = slide("Kiến trúc Modular Monolith, 4 module độc lập", "Một lệnh docker compose up là chạy toàn bộ. Chọn monolith thay vì microservices vì quy mô phường/xã và giới hạn RAM.", "Thiết kế")
box(s, 0.6, 1.5, 2.6, 4.9, LIGHT, BLUE)
text(s, 0.6, 1.55, 2.6, 0.5, "Client", 16, BLUE, True, PP_ALIGN.CENTER)
for i, t in enumerate(["Cổng Công dân\n(PWA, mobile)", "Bàn làm việc Cán bộ\n(dashboard)"]):
    b = box(s, 0.8, 2.2 + i * 1.9, 2.2, 1.5, WHITE, BLUE)
    b.text_frame.word_wrap = True
    p = b.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    _run(p, t, 13, DARK, True)
box(s, 3.6, 1.5, 5.4, 4.9, LIGHT, BLUE)
text(s, 3.6, 1.55, 5.4, 0.5, "Spring Boot 3.3 (Java 21)", 16, BLUE, True, PP_ALIGN.CENTER)
mods = ["rag\nLegal RAG + Guardrail", "formcheck\nRule Engine", "triage\nSpatial-Semantic", "vault\nZero-Trust"]
for i, t in enumerate(mods):
    b = box(s, 3.8 + (i % 2) * 2.6, 2.2 + (i // 2) * 2.0, 2.4, 1.7, WHITE, BLUE)
    b.text_frame.word_wrap = True
    p = b.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    _run(p, t, 13, DARK, True)
box(s, 9.4, 1.5, 3.3, 4.9, LIGHT, BLUE)
text(s, 9.4, 1.55, 3.3, 0.5, "Hạ tầng và AI", 16, BLUE, True, PP_ALIGN.CENTER)
for i, t in enumerate(["PostgreSQL 16 + pgvector", "Redis 7 (GEO, token, cache)", "MinIO (S3)", "Gemini API ⇄ MockAiClient"]):
    b = box(s, 9.6, 2.2 + i * 1.05, 2.9, 0.85, WHITE, BLUE)
    b.text_frame.word_wrap = True
    p = b.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    _run(p, t, 13, DARK, True)
text(s, 0.6, 6.5, 12.1, 0.4, "Không dùng Kafka: tác vụ nền dùng @Async và ApplicationEventPublisher.", 14, GRAY)

# 7. Cong nghe
s = slide("Công nghệ và ràng buộc zero-cost", "Nhấn mạnh offline-first: có DeterministicMockAiClient nên demo không cần Internet. RAM thực tế khoảng 585 MB so với trần 1.728 MB.", "Thiết kế")
table(s, 0.6, 1.5, 6.4, [
    ["Container", "Giới hạn", "Thực tế"],
    ["PostgreSQL pgvector", "512 MB", "~110 MB"],
    ["Redis 7", "128 MB", "~18 MB"],
    ["MinIO", "256 MB", "~65 MB"],
    ["Spring Boot", "768 MB", "~380 MB"],
    ["Nginx Frontend", "64 MB", "~12 MB"],
    ["Tổng", "1.728 MB", "~585 MB"],
], [3.0, 1.7, 1.7], 14, hl_row=6, row_h=0.55)
bullets(s, 7.3, 1.5, 5.5, 5, [
    "Backend: Java 21, Spring Boot 3.3, JPA, Flyway",
    "Frontend: React + TypeScript + Tailwind + Leaflet (PWA)",
    "AI: Gemini 2.5 Flash, embedding 768 chiều",
    "Offline: DeterministicMockAiClient (SHA-256 → vector)",
    "Rate limit 5 req/phút/IP, cache câu hỏi TTL 1 giờ",
], 16)

# 8. Module 1
s = slide("Module 1 – Legal RAG: thà từ chối còn hơn trả lời sai", "Giải thích lưu đồ. Điểm chính: nếu S_max < θ thì từ chối ngay, không gọi LLM sinh tự do. Hậu kiểm trích dẫn đảm bảo mã điều khoản nằm trong Top-K.", "Thiết kế – RQ1")
flow(s, 0.5, 1.6, ["Câu hỏi\n+ chuẩn hóa TV", "Embedding\n768 chiều", "pgvector\ncosine Top-K", "S_max ≥ θ\n(0.78)?", "LLM sinh\ntrả lời 5 phần", "Hậu kiểm\ntrích dẫn"], w=1.8, h=1.3, gap=0.3, fills={3: RGBColor(0xFE, 0xF3, 0xC7)}, size=12)
callout(s, 6.2, 3.2, 3.4, 1.0, ["Không"," Từ chối an toàn (1–2 câu) + gợi ý"], RED, size=13)
bullets(s, 0.6, 4.4, 12, 2.5, [
    "Chunk theo Chương → Điều → Khoản → Điểm, kèm effective_date, status",
    "Chuẩn hóa tiếng Việt: dấu, Telex, phương ngữ; hỏi lại khi câu mơ hồ",
    "Nhớ ngữ cảnh 3–5 lượt: \"lệ phí bao nhiêu?\" → viết lại theo thủ tục trước đó",
], 16)

# 9. Module 2
s = slide("Module 2 – Rule Engine: AI đọc chữ, luật quyết định đúng sai", "OCR chỉ trích xuất trường. Việc xác định hợp lệ do Java thuần, tất định, giải thích được. Nhấn mạnh: không để AI đoán logic.", "Thiết kế – RQ3")
flow(s, 0.6, 1.6, ["Ảnh tờ khai", "Vision OCR\n(JSON + confidence)", "Rule Engine\n(Java thuần)", "Kết quả từng trường\nĐạt / Cảnh báo / Lỗi"], w=2.6, h=1.2, gap=0.5, fills={2: RGBColor(0xDC, 0xFC, 0xE7)}, size=13)
table(s, 0.6, 3.2, 12.1, [
    ["Mẫu", "Quy tắc chính"],
    ["CT01 – Thay đổi cư trú", "CCCD 12 số: mã tỉnh 001–096, chữ số giới tính/thế kỷ, khớp năm sinh; birthDate < issueDate ≤ today; thông tin chủ hộ"],
    ["TK-KS – Khai sinh", "Kiểm chéo giấy chứng sinh (ngày sinh, họ tên mẹ); quy tắc nhận cha khi cha mẹ chưa kết hôn"],
    ["TK-KH – Kết hôn", "Tuổi kết hôn theo ngày: nam ≥ 20, nữ ≥ 18; chặn mục đích xác nhận tình trạng hôn nhân mơ hồ"],
    ["TK-BTXH – Trợ cấp", "Từ 80 tuổi không lương hưu hoặc khuyết tật nặng; bắt buộc số tài khoản ngân hàng"],
], [3.2, 8.9], 13, row_h=0.62)
text(s, 0.6, 6.55, 12, 0.4, "OCR confidence < 0.70 → MANUAL_REVIEW_REQUIRED", 14, RED, True)

# 10. Module 3
s = slide("Module 3 – Triage 2 pha: gom phản ánh trùng theo không gian và ngữ nghĩa", "Pha 1 lọc nhanh bằng Redis GEO, pha 2 so khớp category và cosine để tránh gộp nhầm. Có định tuyến liên phường theo ô địa chỉ.", "Thiết kế – RQ2")
flow(s, 0.6, 1.6, ["Phản ánh mới\n(GPS + mô tả)", "Pha 1: GEOSEARCH\nbán kính R", "Pha 2: cùng category\n+ cosine ≥ τ", "Gộp vào cụm cũ\nhoặc tạo cụm mới"], w=2.6, h=1.3, gap=0.5, size=13, fills={1: RGBColor(0xDB, 0xEA, 0xFE), 2: RGBColor(0xDC, 0xFC, 0xE7)})
bullets(s, 0.6, 3.4, 7, 3, [
    "Pha 1 loại nhanh các cụm ở xa (O(log N))",
    "Pha 2 tránh gộp nhầm hai sự cố khác loại ở gần nhau",
    "Định tuyến liên phường: ô địa chỉ ưu tiên, sau đó GPS (Haversine)",
    "Bắt buộc số điện thoại người báo",
], 16)
box(s, 8.0, 3.4, 4.7, 2.8, LIGHT, BLUE)
text(s, 8.2, 3.5, 4.3, 2.6, ["Ví dụ", "Báo cáo A: \"Nắp cống vỡ hẻm 12\"", "Báo cáo B: \"Cống hở nguy hiểm gần số 12\"", "→ cùng category, cách ~20 m, cosine cao → 1 cụm, report_count = 2"], 14, DARK)

# 11. Module 4
s = slide("Module 4 – Zero-Trust Vault: ảnh giấy tờ chỉ xem được một lần", "Tuân thủ Nghị định 13/2023/NĐ-CP. Nêu giới hạn trung thực: không chống được chụp màn hình vật lý.", "Thiết kế")
flow(s, 0.5, 1.6, ["Ảnh CCCD", "Watermark chéo\n(thời gian + mục đích)", "AES-256-GCM", "MinIO\n(TTL 7 ngày)", "Token one-time\nRedis GETDEL"], w=2.15, h=1.3, gap=0.35, size=13)
callout(s, 0.6, 3.4, 5.9, 1.4, ["Lần xem đầu", "Giải mã và stream ảnh, xóa token ngay"], GREEN)
callout(s, 6.8, 3.4, 5.9, 1.4, ["Lần xem thứ hai", "HTTP 410 Gone"], RED)
bullets(s, 0.6, 5.1, 12, 1.8, [
    "GETDEL nguyên tử → chống race condition khi hai người cùng mở link",
    "Giới hạn: watermark và one-time link chống lộ link và tái sử dụng, không chống chụp màn hình",
], 16)

# 12. Giao dien
s = slide("Giao diện: Cổng Công dân (mobile PWA) và Bàn làm việc Cán bộ", "Cho xem 3 màn hình: chatbot, kiểm tra tờ khai, dashboard cán bộ với bản đồ cụm sự cố. Thay placeholder bằng ảnh chụp thực tế.", "Thiết kế")
placeholder(s, 0.6, 1.5, 4.0, 4.6, "Chatbot RAG (/citizen)")
placeholder(s, 4.8, 1.5, 4.0, 4.6, "Kiểm tra tờ khai (/citizen/form)")
placeholder(s, 9.0, 1.5, 3.7, 4.6, "Dashboard cán bộ + bản đồ")
text(s, 0.6, 6.2, 12.1, 0.6, "Quét QR tại UBND → dùng ngay, không cài app. Có TTS đọc to và chỉnh cỡ chữ A / A+ / A++ cho người lớn tuổi.", 14, GRAY)

# ============================ C. THUC NGHIEM ============================
# 13. Thiet ke thuc nghiem
s = slide("Thiết kế thực nghiệm: dữ liệu và chỉ số đo", "Nhấn mạnh tách dev / held-out theo thời gian để tránh rò rỉ, và 25 ca biên khó cài cắm có chủ đích.", "Thực nghiệm")
table(s, 0.6, 1.5, 12.1, [
    ["Bộ dữ liệu", "Quy mô", "Đặc điểm"],
    ["Câu hỏi RAG", "80", "40 trực tiếp, 25 tình huống, 15 câu bẫy (ngoài phạm vi); 40 thủ tục"],
    ["Phản ánh hiện trường", "150", "30 sự cố gốc × 15 người viết; nhiễu GPS 10–40 m; 25 ca biên (10 colocated, 10 high-lexical, 5 distant)"],
    ["Ảnh tờ khai", "40", "20 in, 20 viết tay, lỗi logic cài sẵn"],
], [3.0, 1.4, 7.7], 15, row_h=0.8)
bullets(s, 0.6, 5.0, 12, 1.8, [
    "RAG: Recall@3, MRR, Citation Precision, False-Answer Rate (câu bẫy), True Abstention",
    "Triage: Precision, Recall, F1; chia 90 dev / 60 held-out; Grid Search R × τ",
], 16)

# 14. RQ1
s = slide("RQ1: guardrail θ giảm câu trả lời sai ở câu bẫy từ 73% xuống 6,7%", "Đọc bảng: RAG không guardrail trả lời 100% câu bẫy. Có guardrail θ=0.78 thì từ chối đúng 93.3%, citation precision 97.6%. Recall@3 và MRR giữ nguyên vì cùng bộ truy xuất.", "Thực nghiệm – RQ1")
table(s, 0.6, 1.5, 8.0, [
    ["Cấu hình", "Citation precision", "False-answer (bẫy)", "True abstention"],
    ["LLM zero-shot", "32,5%", "73,3%", "26,7%"],
    ["RAG không guardrail (θ=0,42)", "86,2%", "100%", "0%"],
    ["Đề xuất (chunk + θ=0,78)", "97,6%", "6,7%", "93,3%"],
], [3.3, 1.6, 1.6, 1.5], 14, hl_row=3, row_h=0.7)
text(s, 0.6, 4.6, 8, 0.8, "Recall@3 = 86,2% · MRR = 0,79 (80 câu: 65 trong phạm vi, 15 bẫy)", 15, GRAY)
image(s, "abstention_tradeoff.png", 8.8, 1.5, w=4.0)

# 15. RQ2
s = slide("RQ2: kết hợp 2 pha đạt Precision 100% và F1 88,9%", "Chỉ không gian: recall cao nhưng precision 43% (gộp nhầm). Chỉ ngữ nghĩa: tốt nhưng thiếu ràng buộc vị trí. Kết hợp: precision 100%, F1 cao nhất. Tham số chọn bằng Grid Search trên dev.", "Thực nghiệm – RQ2")
table(s, 0.6, 1.5, 6.4, [
    ["Phương pháp", "Prec.", "Recall", "F1"],
    ["Chỉ không gian (R=50m)", "43,0", "92,7", "58,8"],
    ["Chỉ ngữ nghĩa (τ=0,75)", "98,4", "80,0", "88,2"],
    ["2 pha (R=50m, τ=0,75)", "100", "80,0", "88,9"],
], [3.1, 1.0, 1.1, 1.2], 14, hl_row=3, row_h=0.65)
text(s, 0.6, 4.3, 6.4, 1.2, "Tối ưu từ Grid Search R ∈ {25…150 m} × τ ∈ {0,70…0,90} trên 90 mẫu dev.", 15, GRAY)
image(s, "method_comparison_bar.png", 7.2, 1.4, w=5.6)
image(s, "f1_heatmap_triage.png", 0.6, 5.0, h=1.9)

# 16. RQ3
s = slide("RQ3 và chất lượng hệ thống", "Rule Engine: số liệu trên 40 ảnh tờ khai cần điền khi có kết quả. Phần còn lại là bằng chứng kỹ thuật đã có: 57/57 test, RAM, offline.", "Thực nghiệm – RQ3")
callout(s, 0.6, 1.5, 3.9, 1.8, ["Rule Engine", "[Điền số liệu 40 ảnh tờ khai]\nhoặc nêu cơ chế"], RGBColor(0xD9, 0x77, 0x06))
callout(s, 4.7, 1.5, 3.9, 1.8, ["57 / 57", "backend test đạt, chạy offline"], GREEN)
callout(s, 8.8, 1.5, 3.9, 1.8, ["~585 MB", "RAM thực tế (trần 2 GB)"], GREEN)
bullets(s, 0.6, 3.8, 12, 3, [
    "Bộ test đối kháng: frontend (chatbox, ý định, RAG) và evaluation/adversarial_tests",
    "Gzip frontend ~149 KB; JVM heap giới hạn 512 MB; chạy bằng user không đặc quyền",
    "Demo hoàn toàn offline nhờ DeterministicMockAiClient",
], 16)

# 17. Held-out va loi
s = slide("Kiểm chứng held-out, phân tích lỗi và hạn chế", "Trung thực: F1 giảm từ 88.3% (dev) xuống 82.35% (held-out). Cấu hình production R=25m, τ=0.80 chỉ đạt 76.54%, chính là lý do chọn lại tham số.", "Thực nghiệm")
table(s, 0.6, 1.5, 6.6, [
    ["Tập / cấu hình", "Prec.", "Recall", "F1"],
    ["Dev (R=50m, τ=0,75)", "100", "79,1", "88,3"],
    ["Held-out (R=50m, τ=0,75)", "100", "70,0", "82,4"],
    ["Held-out (R=25m, τ=0,80)", "100", "62,0", "76,5"],
], [3.3, 1.0, 1.1, 1.2], 14, hl_row=2, row_h=0.65)
bullets(s, 0.6, 4.3, 6.6, 2.8, [
    "False positive: gộp nhầm hai sự cố hai đầu ngõ",
    "False negative: GPS lệch trong nhà cao tầng; mô tả khác từ vựng",
    "OCR: chữ viết tay nối nét làm sai số CCCD",
    "Dữ liệu nhỏ, nhiễu GPS là giả lập",
], 15)
callout(s, 7.6, 1.5, 5.1, 2.4, ["Ca biên khó (25 ca) – held-out", "R=50m, τ=0,75: 66,7% đúng\nR=25m, τ=0,80: 50,0% đúng"], BLUE, size=16)
callout(s, 7.6, 4.1, 5.1, 1.6, ["Bài học", "Tham số production cần cập nhật theo kết quả held-out"], RGBColor(0xD9, 0x77, 0x06), size=15)

# ============================ D-E ============================
# 18. Demo
s = slide("Demo trực tiếp (2,5 phút, chạy offline)", "Ba ca cố định. Có video dự phòng nếu mạng hoặc máy lỗi.", "Demo")
for i, (h, d) in enumerate([("Ca 1 – Hỏi đáp", "Hỏi thủ tục kết hôn → có trích dẫn.\nHỏi câu bẫy → từ chối an toàn."),
                            ("Ca 2 – Tờ khai", "Tải tờ khai sai ngày / sai mã tỉnh CCCD → Rule Engine báo lỗi tức thì."),
                            ("Ca 3 – Phản ánh", "Gửi 2 phản ánh cùng hẻm → tự gộp thành 1 cụm trên bản đồ cán bộ.")]):
    x = 0.6 + i * 4.1
    box(s, x, 1.6, 3.9, 0.8, BLUE)
    text(s, x, 1.6, 3.9, 0.8, h, 18, WHITE, True, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)
    box(s, x, 2.4, 3.9, 2.4, LIGHT)
    text(s, x + 0.2, 2.5, 3.5, 2.2, d, 16, DARK)
bullets(s, 0.6, 5.2, 12, 1.6, ["Chuẩn bị sẵn: docker compose up, tài khoản cán bộ, 3 dữ liệu mẫu, video dự phòng"], 15)

# 19. Ket luan
s = slide("Kết luận, hạn chế và hướng phát triển", "Trả lời lần lượt 3 RQ bằng một con số. Nêu hạn chế thẳng thắn, rồi hướng phát triển. Cảm ơn và mời hội đồng đặt câu hỏi.", "Kết luận")
table(s, 0.6, 1.4, 12.1, [
    ["RQ", "Kết luận"],
    ["RQ1", "Guardrail θ=0,78 + chunk Điều–Khoản: citation precision 97,6%, false-answer ở câu bẫy 6,7% (so với 73,3% của LLM thuần)"],
    ["RQ2", "2 pha (R=50m, τ=0,75): Precision 100%, F1 88,9% (dev); 82,4% trên held-out"],
    ["RQ3", "Rule Engine tất định kiểm CCCD và logic ngày tháng trước khi nộp [bổ sung số liệu nếu có]"],
], [1.2, 10.9], 14, row_h=0.8)
box(s, 0.6, 4.8, 5.9, 2.0, LIGHT, BLUE)
text(s, 0.8, 4.85, 5.5, 1.9, ["Hạn chế", "Dữ liệu nhỏ, GPS nhiễu giả lập", "Chỉ mang tính tham khảo, không thay quyết định công chức"], 14, DARK)
box(s, 6.8, 4.8, 5.9, 2.0, LIGHT, BLUE)
text(s, 7.0, 4.85, 5.5, 1.9, ["Hướng phát triển", "Native app (MLKit), VNeID", "Tiếng Khmer / Chăm; Human-in-the-loop"], 14, DARK)

# ============================ PHU LUC ============================
s = slide("Phụ lục P1 – Cơ sở dữ liệu và API", "Dùng khi hội đồng hỏi chi tiết kỹ thuật.", "Phụ lục")
bullets(s, 0.6, 1.5, 5.6, 5, ["Bảng: admin_procedures, legal_chunks (vector 768 + HNSW), issue_clusters, civic_reports, form_submissions, vault_documents", "Migration: Flyway V1__init_schema.sql"], 15)
table(s, 6.4, 1.5, 6.3, [
    ["Endpoint", "Chức năng"],
    ["POST /api/v1/rag/ask", "Hỏi đáp thủ tục"],
    ["POST /api/v1/forms/precheck", "Kiểm tra tờ khai"],
    ["POST /api/v1/triage/reports", "Gửi phản ánh"],
    ["GET /api/v1/triage/clusters", "Danh sách cụm"],
    ["POST /api/v1/vault/upload", "Tải ảnh vào vault"],
    ["GET /api/v1/vault/view/{token}", "Xem một lần"],
    ["POST /api/v1/evaluation/run", "Chạy benchmark"],
], [3.6, 2.7], 12, row_h=0.5)

s = slide("Phụ lục P2 – Grid Search đầy đủ (R × τ)", "Heatmap F1 và đường PR để biện minh cho tham số.", "Phụ lục")
image(s, "f1_heatmap_triage.png", 0.6, 1.5, w=6.0)
image(s, "pr_curve_triage.png", 6.8, 1.5, w=6.0)

s = slide("Phụ lục P3 – Phương pháp tạo dữ liệu kiểm thử", "Giải thích cách giảm thiên lệch chủ quan.", "Phụ lục")
bullets(s, 0.6, 1.5, 12, 5, [
    "30 sự cố gốc × 15 người viết khác nhau → 150 phản ánh; nhiễu GPS σ ∈ [10, 40] m",
    "25 ca biên khó: 10 colocated (cùng chỗ khác sự cố), 10 high-lexical (từ vựng giống khác sự cố), 5 distant",
    "Chia theo thời gian: 90 dev / 60 held-out; tham số chọn trên dev, chỉ đo một lần trên held-out",
    "RAG: 15 câu bẫy dùng cùng pipeline truy xuất như câu trong phạm vi (blind retrieval)",
], 16)

s = slide("Phụ lục P4 – Câu hỏi chất vấn dự kiến", "Chuẩn bị đáp án ngắn cho từng câu.", "Phụ lục")
table(s, 0.6, 1.5, 12.1, [
    ["Câu hỏi", "Ý chính trả lời"],
    ["Vì sao không dùng LLM thuần?", "Ảo giác: 73,3% câu bẫy bị trả lời sai; RAG + θ giảm xuống 6,7%"],
    ["Vì sao θ = 0,78?", "Đánh đổi từ chối và trả lời; xem biểu đồ abstention_tradeoff"],
    ["Vì sao R=50m, τ=0,75 mà production lại khác?", "Chọn theo Grid Search trên dev, kiểm trên held-out; production được cập nhật theo"],
    ["Vì sao Rule Engine thay vì để AI kiểm?", "Tất định, giải thích được, không ảo giác với ngày tháng và CCCD"],
    ["Vault chống được chụp màn hình không?", "Không; chỉ chống lộ link và tái sử dụng (đã nêu ở hạn chế)"],
    ["Triển khai thực tế ra sao?", "Docker 5 container, RAM ≤ 2 GB, chạy offline; lộ trình VNeID và native app"],
], [4.6, 7.5], 13, row_h=0.7)

prs.save(OUT)
print("Saved", OUT, "slides:", len(prs.slides))
