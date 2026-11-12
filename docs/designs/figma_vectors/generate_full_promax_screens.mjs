import fs from 'fs';
import path from 'path';

const outDir = 'e:/SmartWardAI/docs/designs/figma_vectors';
fs.mkdirSync(outDir, { recursive: true });

// Background definitions matching UTH - SmartWard civic canvas & watermark pattern exactly
const defs = `  <defs>
    <!-- 1. Civic Canvas Base Gradient -->
    <linearGradient id="uthCivicCanvas" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E0F2F1" stop-opacity="0.85"/>
      <stop offset="40%" stop-color="#E6F4F1" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#ECFDF5" stop-opacity="1"/>
    </linearGradient>

    <!-- 2. Screen Ambient Glow Radians -->
    <radialGradient id="radialGlowTopLeft" cx="15%" cy="15%" r="40%">
      <stop offset="0%" stop-color="#00796B" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#00796B" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="radialGlowBottomRight" cx="85%" cy="85%" r="45%">
      <stop offset="0%" stop-color="#26A69A" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#26A69A" stop-opacity="0"/>
    </radialGradient>

    <!-- 3. Exact UTH - SMARTWARD Institutional Watermark Pattern -->
    <pattern id="uthWatermarkPattern" width="180" height="180" patternUnits="userSpaceOnUse">
      <g fill="#00796B" fill-opacity="0.045">
        <!-- Graduation Cap / Institutional Emblem -->
        <path d="M90 35 L125 55 L90 75 L55 55 Z"/>
        <path d="M70 65 L70 85 C70 98 110 98 110 85 L110 65" fill="none" stroke="#00796B" stroke-opacity="0.045" stroke-width="3"/>
        <path d="M125 55 L135 68 L135 85" fill="none" stroke="#00796B" stroke-opacity="0.045" stroke-width="2"/>
        <text x="90" y="145" font-family="'Be Vietnam Pro', sans-serif" font-size="11" font-weight="800" text-anchor="middle" fill="#00796B" fill-opacity="0.04">UTH - SMARTWARD</text>
      </g>
    </pattern>

    <!-- 4. Subtle Card Shadow -->
    <filter id="civicCardShadow" x="-10%" y="-5%" width="120%" height="115%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#0F172A" flood-opacity="0.06"/>
    </filter>
    <filter id="civicButtonShadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#00796B" flood-opacity="0.25"/>
    </filter>
  </defs>`;

// Function to generate the complete decorated screen background
function screenBg(w, h, rx) {
  return `
      <!-- Phone Frame Outer with Shadow -->
      <rect width="${w}" height="${h}" rx="${rx}" fill="url(#uthCivicCanvas)" stroke="#0F172A" stroke-width="6"/>
      <!-- Radial Lighting Effects -->
      <rect width="${w}" height="${h}" rx="${rx}" fill="url(#radialGlowTopLeft)"/>
      <rect width="${w}" height="${h}" rx="${rx}" fill="url(#radialGlowBottomRight)"/>
      <!-- Watermark Pattern Overlay (As uploaded by user) -->
      <rect width="${w}" height="${h}" rx="${rx}" fill="url(#uthWatermarkPattern)"/>
  `;
}

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="2800" height="2100" viewBox="0 0 2800 2100">
${defs}

  <g id="Page/03_Screens_And_04_Prototype_Flows">
    <!-- Canvas Outer Surface -->
    <rect width="2800" height="2100" rx="32" fill="#0B132B"/>
    <rect x="40" y="32" width="2720" height="76" rx="20" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>
    <text x="72" y="78" fill="#2DD4BF" font-family="'Be Vietnam Pro', sans-serif" font-size="24" font-weight="800">SMARTWARD AI MOBILE • HỆ THỐNG GIAO DIỆN CHUẨN UI/UX PRO MAX (UTH WATERMARK &amp; CIVIC CANVAS)</text>
    <text x="2180" y="78" fill="#94A3B8" font-family="'JetBrains Mono', monospace" font-size="14">96 XÃ/PHƯỜNG AN GIANG • WCAG AA</text>

    <!-- ========================================================================= -->
    <!-- ROW 1: 5 SCREENS (ALL WITH AUTHENTIC UTH WATERMARK + CENTERED LOGICAL UX) -->
    <!-- ========================================================================= -->

    <!-- SCREEN 1: TRANG CHỦ & ĐỊNH VỊ 96 XÃ/PHƯỜNG (iPhone 390x844) -->
    <g id="Screen/01_Home_GPS_Location" transform="translate(60, 140)">
      ${screenBg(390, 844, 40)}
      
      <!-- iOS Status Bar & Dynamic Island -->
      <rect x="0" y="0" width="390" height="44" fill="transparent"/>
      <rect x="135" y="10" width="120" height="26" rx="13" fill="#0F172A"/>
      <circle cx="236" cy="23" r="4.5" fill="#10B981"/>
      <text x="36" y="27" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="12" font-weight="700">09:41</text>
      
      <!-- Header Bar (Civic Emerald Gradient + Center Align) -->
      <rect x="16" y="52" width="358" height="72" rx="20" fill="#00796B" filter="url(#civicCardShadow)"/>
      <text x="36" y="78" fill="#99F6E4" font-family="'Be Vietnam Pro'" font-size="11" font-weight="700">HỆ THỐNG DỊCH VỤ CÔNG AN GIANG</text>
      <text x="36" y="104" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="17" font-weight="800">📍 Phường Mỹ Bình</text>
      <rect x="256" y="70" width="102" height="34" rx="12" fill="#FFFFFF" filter="url(#civicCardShadow)"/>
      <text x="268" y="92" fill="#00796B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="800">A / A+ / A++</text>

      <!-- Center Card 1: GPS Lock Status (Centered, Symmetrical, Spacing 16px) -->
      <rect x="16" y="140" width="358" height="136" rx="20" fill="#FFFFFF" stroke="#A7F3D0" stroke-width="2" filter="url(#civicCardShadow)"/>
      <rect x="32" y="156" width="326" height="30" rx="8" fill="#ECFDF5"/>
      <text x="44" y="176" fill="#065F46" font-family="'Be Vietnam Pro'" font-size="12" font-weight="800">✓ Đã định vị chính xác (Sai số ±6m)</text>
      <text x="32" y="210" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="14" font-weight="700">UBND Phường Mỹ Bình — TP. Long Xuyên</text>
      <text x="32" y="232" fill="#475569" font-family="'Be Vietnam Pro'" font-size="12">Số 18 Nguyễn Huệ, P. Mỹ Bình, An Giang</text>
      <rect x="32" y="246" width="326" height="2" fill="#E2E8F0"/>

      <!-- Center Card 2: 3 Core Features Quick Access Grid -->
      <g transform="translate(16, 292)">
        <rect width="358" height="294" rx="20" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" filter="url(#civicCardShadow)"/>
        <text x="20" y="32" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="15" font-weight="800">Dịch Vụ Trực Tuyến Cấp Xã</text>
        <text x="20" y="52" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="12">Chọn thủ tục để AI hỗ trợ &amp; nộp hồ sơ</text>

        <!-- Action 1: Legal RAG -->
        <rect x="18" y="70" width="322" height="60" rx="16" fill="#F0FDFA" stroke="#99F6E4" stroke-width="1.5"/>
        <text x="34" y="96" fill="#0F766E" font-family="'Be Vietnam Pro'" font-size="14" font-weight="800">1. Hỏi Đáp Pháp Lý 40 TTHC</text>
        <text x="34" y="116" fill="#0D9488" font-family="'Be Vietnam Pro'" font-size="11">RAG tra cứu chính xác • Có giọng đọc to</text>
        <circle cx="316" cy="100" r="14" fill="#00796B"/>
        <text x="312" y="105" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="14" font-weight="800">→</text>

        <!-- Action 2: Form Precheck -->
        <rect x="18" y="142" width="322" height="60" rx="16" fill="#F0FDFA" stroke="#99F6E4" stroke-width="1.5"/>
        <text x="34" y="168" fill="#0F766E" font-family="'Be Vietnam Pro'" font-size="14" font-weight="800">2. Sơ Duyệt &amp; Chốt Chặn Thị Giác</text>
        <text x="34" y="188" fill="#0D9488" font-family="'Be Vietnam Pro'" font-size="11">Quét QR CCCD • Kiểm tra độ nét ≥ 45/100</text>
        <circle cx="316" cy="172" r="14" fill="#00796B"/>
        <text x="312" y="177" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="14" font-weight="800">→</text>

        <!-- Action 3: Incident Report -->
        <rect x="18" y="214" width="322" height="60" rx="16" fill="#F0FDFA" stroke="#99F6E4" stroke-width="1.5"/>
        <text x="34" y="240" fill="#0F766E" font-family="'Be Vietnam Pro'" font-size="14" font-weight="800">3. Báo Sự Cố Hiện Trường (R=25m)</text>
        <text x="34" y="260" fill="#0D9488" font-family="'Be Vietnam Pro'" font-size="11">Khoá GPS tự động • Định tuyến về xã</text>
        <circle cx="316" cy="244" r="14" fill="#00796B"/>
        <text x="312" y="249" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="14" font-weight="800">→</text>
      </g>

      <!-- Center Card 3: Switch Ward Modal/Selector Pill -->
      <rect x="16" y="602" width="358" height="64" rx="18" fill="#0F172A" filter="url(#civicCardShadow)"/>
      <text x="36" y="632" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="13" font-weight="800">Chuyển sang Xã/Phường khác</text>
      <text x="36" y="650" fill="#94A3B8" font-family="'Be Vietnam Pro'" font-size="11">Hỗ trợ đầy đủ 96 đơn vị hành chính An Giang</text>
      <rect x="272" y="616" width="86" height="36" rx="10" fill="#00796B"/><text x="286" y="639" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="12" font-weight="800">Đổi Xã ▾</text>

      <!-- Bottom Tab Bar -->
      <g transform="translate(16, 750)">
        <rect width="358" height="64" rx="24" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" filter="url(#civicCardShadow)"/>
        <text x="32" y="40" fill="#00796B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="800">📍 Xã</text>
        <text x="96" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">💬 40 TTHC</text>
        <text x="176" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">🛡️ Duyệt</text>
        <text x="250" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">🎫 Ví QR</text>
        <text x="310" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">🏛️ Quầy</text>
      </g>
    </g>

    <!-- SCREEN 2: TRỢ LÝ PHÁP LÝ RAG & 40 TTHC (iPhone 390x844) -->
    <g id="Screen/02_Legal_RAG_Voice" transform="translate(480, 140)">
      ${screenBg(390, 844, 40)}

      <!-- iOS Status Bar & Header -->
      <rect x="135" y="10" width="120" height="26" rx="13" fill="#0F172A"/>
      <rect x="16" y="52" width="358" height="72" rx="20" fill="#00796B" filter="url(#civicCardShadow)"/>
      <text x="36" y="78" fill="#99F6E4" font-family="'Be Vietnam Pro'" font-size="11" font-weight="700">CHỐT CHẶN PHÁP LÝ (θ = 0.78)</text>
      <text x="36" y="104" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="17" font-weight="800">Trợ Lý Pháp Lý AI 40 TTHC</text>
      <!-- TTS Voice Button with State Highlight -->
      <rect x="236" y="68" width="122" height="38" rx="12" fill="#FFFFFF" stroke="#A7F3D0" stroke-width="2"/>
      <text x="246" y="92" fill="#065F46" font-family="'Be Vietnam Pro'" font-size="11" font-weight="800">🔊 Nghe đọc</text>
      <rect x="318" y="75" width="32" height="24" rx="6" fill="#00796B"/><text x="322" y="91" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="10" font-weight="800">MỞ</text>

      <!-- Center Focus: Grounded Legal Answer Card -->
      <g transform="translate(16, 140)">
        <rect width="358" height="370" rx="22" fill="#FFFFFF" stroke="#00796B" stroke-width="2" filter="url(#civicCardShadow)"/>
        
        <!-- Procedure Pill & Score -->
        <rect x="18" y="18" width="170" height="28" rx="8" fill="#F0FDFA" stroke="#99F6E4"/>
        <text x="26" y="37" fill="#0F766E" font-family="'JetBrains Mono'" font-size="11" font-weight="700">TTHC-CR-01 • S=0.94</text>
        <rect x="274" y="18" width="66" height="28" rx="8" fill="#ECFDF5"/><text x="282" y="37" fill="#059669" font-family="'Be Vietnam Pro'" font-size="11" font-weight="800">Đạt chuẩn</text>

        <text x="18" y="72" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="15" font-weight="800">Đăng ký thường trú (Mẫu CT01)</text>
        <text x="18" y="94" fill="#00796B" font-family="'Be Vietnam Pro'" font-size="12" font-weight="700">Căn cứ: Thông tư 66/2023/TT-BCA</text>
        <rect x="18" y="106" width="322" height="1.5" fill="#E2E8F0"/>

        <!-- 4-Part Legal Guidance List -->
        <text x="18" y="132" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="13" font-weight="700">1. Thành phần hồ sơ:</text>
        <text x="18" y="152" fill="#334155" font-family="'Be Vietnam Pro'" font-size="12">• Tờ khai CT01 + Giấy tờ chứng minh chỗ ở hợp pháp.</text>

        <text x="18" y="182" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="13" font-weight="700">2. Thời hạn giải quyết:</text>
        <text x="18" y="202" fill="#334155" font-family="'Be Vietnam Pro'" font-size="12">• Tối đa 07 ngày làm việc kể từ khi nhận đủ hồ sơ.</text>

        <text x="18" y="232" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="13" font-weight="700">3. Lệ phí &amp; Nơi tiếp nhận:</text>
        <text x="18" y="252" fill="#334155" font-family="'Be Vietnam Pro'" font-size="12">• Miễn phí 100% người cao tuổi, hộ nghèo • Bộ phận 1 Cửa.</text>

        <!-- Direct Download Action Bar (Zero-Print Compliance) -->
        <rect x="18" y="290" width="154" height="54" rx="14" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>
        <text x="36" y="322" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="12" font-weight="800">📄 Tải Mẫu .DOCX</text>

        <rect x="186" y="290" width="154" height="54" rx="14" fill="#00796B" filter="url(#civicButtonShadow)"/>
        <text x="212" y="322" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="12" font-weight="800">📥 Tải Mẫu .PDF</text>
      </g>

      <!-- Center Card 2: Low-Confidence Abstention Guardrail Box -->
      <g transform="translate(16, 526)">
        <rect width="358" height="136" rx="20" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5" filter="url(#civicCardShadow)"/>
        <text x="20" y="30" fill="#92400E" font-family="'Be Vietnam Pro'" font-size="12" font-weight="800">⚠️ Vùng xám pháp lý (S_max = 0.54 &lt; 0.78)</text>
        <text x="20" y="52" fill="#B45309" font-family="'Be Vietnam Pro'" font-size="11">Tình huống đặc thù cần công chức hộ tịch thẩm định trực tiếp.</text>
        <rect x="20" y="70" width="318" height="46" rx="12" fill="#D97706" filter="url(#civicButtonShadow)"/>
        <text x="56" y="98" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="12" font-weight="800">🙋 Chuyển Câu Hỏi Cho Cán Bộ Giải Đáp</text>
      </g>

      <!-- Bottom Tab Bar -->
      <g transform="translate(16, 750)">
        <rect width="358" height="64" rx="24" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" filter="url(#civicCardShadow)"/>
        <text x="32" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">📍 Xã</text>
        <text x="96" y="40" fill="#00796B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="800">💬 40 TTHC</text>
        <text x="176" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">🛡️ Duyệt</text>
        <text x="250" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">🎫 Ví QR</text>
        <text x="310" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">🏛️ Quầy</text>
      </g>
    </g>

    <!-- SCREEN 3: SƠ DUYỆT TỜ KHAI & CHỐT CHẶN AI THỊ GIÁC (iPhone 390x844) -->
    <g id="Screen/03_Form_Precheck_Vision" transform="translate(900, 140)">
      ${screenBg(390, 844, 40)}

      <!-- iOS Status Bar & Header -->
      <rect x="135" y="10" width="120" height="26" rx="13" fill="#0F172A"/>
      <rect x="16" y="52" width="358" height="72" rx="20" fill="#00796B" filter="url(#civicCardShadow)"/>
      <text x="36" y="78" fill="#99F6E4" font-family="'Be Vietnam Pro'" font-size="11" font-weight="700">CHỐT CHẶN AI THỊ GIÁC 3 TIÊU CHÍ</text>
      <text x="36" y="104" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="17" font-weight="800">Sơ Duyệt Tờ Khai CT01</text>
      <rect x="256" y="68" width="102" height="38" rx="12" fill="#0F172A"/>
      <text x="272" y="92" fill="#6EE7B7" font-family="'JetBrains Mono'" font-size="12" font-weight="700">PASS 96%</text>

      <!-- Center Focus 1: AI Vision 3-Criteria Diagnostic Scorecard -->
      <g transform="translate(16, 140)">
        <rect width="358" height="154" rx="20" fill="#FFFFFF" stroke="#99F6E4" stroke-width="2" filter="url(#civicCardShadow)"/>
        <text x="18" y="28" fill="#0F766E" font-family="'Be Vietnam Pro'" font-size="13" font-weight="800">Đánh Giá Tờ Khai Đính Kèm (AI Vision Gate)</text>

        <!-- 3 Columns Centered & Evenly Spaced -->
        <rect x="18" y="44" width="98" height="92" rx="14" fill="#F0FDFA" stroke="#A7F3D0" stroke-width="1.5"/>
        <text x="26" y="68" fill="#065F46" font-family="'Be Vietnam Pro'" font-size="11" font-weight="700">1. Độ nét</text>
        <text x="26" y="98" fill="#059669" font-family="'JetBrains Mono'" font-size="20" font-weight="800">96</text>
        <text x="56" y="98" fill="#059669" font-family="'JetBrains Mono'" font-size="11">/100</text>
        <text x="26" y="122" fill="#047857" font-family="'Be Vietnam Pro'" font-size="10" font-weight="800">✓ Rõ chữ</text>

        <rect x="130" y="44" width="98" height="92" rx="14" fill="#F0FDFA" stroke="#A7F3D0" stroke-width="1.5"/>
        <text x="138" y="68" fill="#065F46" font-family="'Be Vietnam Pro'" font-size="11" font-weight="700">2. Mẫu đơn</text>
        <text x="138" y="98" fill="#00796B" font-family="'JetBrains Mono'" font-size="15" font-weight="800">CT01</text>
        <text x="138" y="122" fill="#047857" font-family="'Be Vietnam Pro'" font-size="10" font-weight="800">✓ Đúng mẫu</text>

        <rect x="242" y="44" width="98" height="92" rx="14" fill="#F0FDFA" stroke="#A7F3D0" stroke-width="1.5"/>
        <text x="250" y="68" fill="#065F46" font-family="'Be Vietnam Pro'" font-size="11" font-weight="700">3. Khớp thông tin</text>
        <text x="250" y="98" fill="#00796B" font-family="'JetBrains Mono'" font-size="18" font-weight="800">5/5</text>
        <text x="250" y="122" fill="#047857" font-family="'Be Vietnam Pro'" font-size="10" font-weight="800">✓ Đầy đủ</text>
      </g>

      <!-- Center Focus 2: Auto-Filled Citizen Details from CCCD QR -->
      <g transform="translate(16, 310)">
        <rect width="358" height="240" rx="20" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" filter="url(#civicCardShadow)"/>
        <text x="18" y="28" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="13" font-weight="800">Thông Tin Tự Điền Từ QR Thẻ CCCD Gắn Chip</text>

        <rect x="18" y="42" width="322" height="48" rx="12" fill="#F8FAFC" stroke="#E2E8F0"/>
        <text x="30" y="60" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="10">Họ và tên công dân:</text>
        <text x="30" y="78" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="13" font-weight="800">NGUYỄN MINH TUẤN KHANH</text>

        <rect x="18" y="98" width="154" height="48" rx="12" fill="#F8FAFC" stroke="#E2E8F0"/>
        <text x="28" y="116" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="10">Số định danh 12 số:</text>
        <text x="28" y="134" fill="#00796B" font-family="'JetBrains Mono'" font-size="12" font-weight="800">089205023490</text>

        <rect x="186" y="98" width="154" height="48" rx="12" fill="#F8FAFC" stroke="#E2E8F0"/>
        <text x="196" y="116" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="10">Ngày sinh:</text>
        <text x="196" y="134" fill="#0F172A" font-family="'JetBrains Mono'" font-size="12" font-weight="800">15/08/1989</text>

        <!-- Email for Free Updates -->
        <rect x="18" y="154" width="322" height="66" rx="12" fill="#F0FDFA" stroke="#99F6E4"/>
        <text x="30" y="174" fill="#0F766E" font-family="'Be Vietnam Pro'" font-size="11" font-weight="700">Email nhận kết quả &amp; Mã QR (Miễn phí 100%):</text>
        <text x="30" y="202" fill="#00796B" font-family="'JetBrains Mono'" font-size="13" font-weight="800">congdan.angiang@gmail.com</text>
      </g>

      <!-- Action Button: Submit Dossier to Ward -->
      <g transform="translate(16, 566)">
        <rect width="358" height="54" rx="16" fill="#00796B" filter="url(#civicButtonShadow)"/>
        <text x="64" y="34" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="14" font-weight="800">✨ GỬI HỒ SƠ SƠ DUYỆT ĐẾN UBND XÃ</text>
      </g>

      <!-- Bottom Tab Bar -->
      <g transform="translate(16, 750)">
        <rect width="358" height="64" rx="24" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" filter="url(#civicCardShadow)"/>
        <text x="32" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">📍 Xã</text>
        <text x="96" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">💬 40 TTHC</text>
        <text x="176" y="40" fill="#00796B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="800">🛡️ Duyệt</text>
        <text x="250" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">🎫 Ví QR</text>
        <text x="310" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">🏛️ Quầy</text>
      </g>
    </g>

    <!-- SCREEN 4: BÁO SỰ CỐ HIỆN TRƯỜNG GPS R=25m (iPhone 390x844) -->
    <g id="Screen/04_Incident_GPS_25m" transform="translate(1320, 140)">
      ${screenBg(390, 844, 40)}

      <!-- iOS Status Bar & Header -->
      <rect x="135" y="10" width="120" height="26" rx="13" fill="#0F172A"/>
      <rect x="16" y="52" width="358" height="72" rx="20" fill="#00796B" filter="url(#civicCardShadow)"/>
      <text x="36" y="78" fill="#99F6E4" font-family="'Be Vietnam Pro'" font-size="11" font-weight="700">ĐỊNH TUYẾN 2 PHA (GEO + RAG)</text>
      <text x="36" y="104" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="17" font-weight="800">Báo Sự Cố Hiện Trường</text>
      <rect x="260" y="68" width="98" height="38" rx="12" fill="#0F172A"/>
      <text x="274" y="92" fill="#2DD4BF" font-family="'JetBrains Mono'" font-size="12" font-weight="700">R = 25M</text>

      <!-- Center Radar Map Visualizer -->
      <g transform="translate(16, 140)">
        <rect width="358" height="240" rx="22" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" filter="url(#civicCardShadow)"/>
        
        <!-- Radar Map Simulation with Radial Waves -->
        <rect x="14" y="14" width="330" height="150" rx="16" fill="#F1F5F9"/>
        <circle cx="179" cy="89" r="64" fill="#00796B" fill-opacity="0.12" stroke="#00796B" stroke-width="1.5" stroke-dasharray="4 4"/>
        <circle cx="179" cy="89" r="38" fill="#00796B" fill-opacity="0.2"/>
        <circle cx="179" cy="89" r="10" fill="#DC2626" stroke="#FFFFFF" stroke-width="3"/>

        <rect x="28" y="174" width="302" height="48" rx="10" fill="#F0FDFA" stroke="#99F6E4"/>
        <text x="40" y="194" fill="#0F766E" font-family="'JetBrains Mono'" font-size="11" font-weight="700">Tọa độ: 10.3864° N, 105.4382° E</text>
        <text x="40" y="210" fill="#065F46" font-family="'Be Vietnam Pro'" font-size="11">Địa chỉ: Đường Nguyễn Huệ, Phường Mỹ Bình</text>
      </g>

      <!-- Center Card 2: Incident Category Selection Grid -->
      <g transform="translate(16, 396)">
        <rect width="358" height="220" rx="20" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" filter="url(#civicCardShadow)"/>
        <text x="18" y="28" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="13" font-weight="800">Chọn Lĩnh Vực Phản Ánh Hiện Trường</text>

        <rect x="18" y="42" width="154" height="66" rx="14" fill="#ECFDF5" stroke="#059669" stroke-width="2"/>
        <text x="30" y="68" fill="#065F46" font-family="'Be Vietnam Pro'" font-size="12" font-weight="800">💡 Chiếu Sáng Đô Thị</text>
        <text x="30" y="90" fill="#047857" font-family="'Be Vietnam Pro'" font-size="10">Đèn đường hư hỏng</text>

        <rect x="186" y="42" width="154" height="66" rx="14" fill="#F8FAFC" stroke="#CBD5E1"/>
        <text x="198" y="68" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="12" font-weight="700">🛣️ Đường Xá / Hố Ga</text>
        <text x="198" y="90" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="10">Mặt đường sụt lún</text>

        <rect x="18" y="118" width="154" height="66" rx="14" fill="#F8FAFC" stroke="#CBD5E1"/>
        <text x="30" y="144" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="12" font-weight="700">🗑️ Môi Trường / Rác</text>
        <text x="30" y="166" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="10">Ùn ứ rác sinh hoạt</text>

        <rect x="186" y="118" width="154" height="66" rx="14" fill="#F8FAFC" stroke="#CBD5E1"/>
        <text x="198" y="144" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="12" font-weight="700">🌳 Cây Xanh / Cáp</text>
        <text x="198" y="166" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="10">Cành gãy, dây rơi</text>
      </g>

      <!-- Action Button: Send Field Report -->
      <g transform="translate(16, 630)">
        <rect width="358" height="54" rx="16" fill="#00796B" filter="url(#civicButtonShadow)"/>
        <text x="76" y="34" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="14" font-weight="800">📸 CHỤP ẢNH &amp; GỬI PHẢN ÁNH</text>
      </g>

      <!-- Bottom Tab Bar -->
      <g transform="translate(16, 750)">
        <rect width="358" height="64" rx="24" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" filter="url(#civicCardShadow)"/>
        <text x="32" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">📍 Xã</text>
        <text x="96" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">💬 40 TTHC</text>
        <text x="176" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">🛡️ Duyệt</text>
        <text x="250" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">🎫 Ví QR</text>
        <text x="310" y="40" fill="#00796B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="800">🏛️ Quầy</text>
      </g>
    </g>

    <!-- SCREEN 5: VÍ PHIẾU HẸN QR ĐIỆN TỬ OFFLINE & CHẾ ĐỘ CÁN BỘ (iPhone 390x844) -->
    <g id="Screen/05_Wallet_QR_Appointment" transform="translate(1740, 140)">
      ${screenBg(390, 844, 40)}

      <!-- iOS Status Bar & Header -->
      <rect x="135" y="10" width="120" height="26" rx="13" fill="#0F172A"/>
      <rect x="16" y="52" width="358" height="72" rx="20" fill="#0F172A" filter="url(#civicCardShadow)"/>
      <text x="36" y="78" fill="#2DD4BF" font-family="'Be Vietnam Pro'" font-size="11" font-weight="700">05.01 • VÍ PHIẾU HẸN / ĐÃ DUYỆT</text>
      <text x="36" y="104" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="17" font-weight="800">Ví Phiếu Hẹn Điện Tử</text>
      <rect x="256" y="68" width="102" height="38" rx="12" fill="#00796B"/>
      <text x="268" y="92" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="11" font-weight="800">📡 OFFLINE</text>

      <!-- Center Focus: Electronic QR Pass Ticket Card -->
      <g transform="translate(16, 140)">
        <rect width="358" height="460" rx="24" fill="#FFFFFF" stroke="#00796B" stroke-width="2.5" filter="url(#civicCardShadow)"/>
        
        <!-- Header Banner on Ticket -->
        <rect x="16" y="16" width="326" height="32" rx="10" fill="#F0FDFA" stroke="#99F6E4"/>
        <text x="28" y="37" fill="#0F766E" font-family="'Be Vietnam Pro'" font-size="11" font-weight="800">PHIẾU HẸN SƠ DUYỆT ĐIỆN TỬ • UBND PHƯỜNG MỸ BÌNH</text>

        <!-- QR Code Centered with Security Border -->
        <g transform="translate(94, 60)">
          <rect width="170" height="170" rx="18" fill="#0F172A" filter="url(#civicCardShadow)"/>
          <rect x="10" y="10" width="150" height="150" fill="#FFFFFF" rx="10"/>
          
          <!-- Stylized High-Density QR Pattern -->
          <rect x="22" y="22" width="40" height="40" fill="#00796B"/>
          <rect x="28" y="28" width="28" height="28" fill="#FFFFFF"/>
          <rect x="34" y="34" width="16" height="16" fill="#00796B"/>

          <rect x="98" y="22" width="40" height="40" fill="#00796B"/>
          <rect x="104" y="28" width="28" height="28" fill="#FFFFFF"/>
          <rect x="110" y="34" width="16" height="16" fill="#00796B"/>

          <rect x="22" y="98" width="40" height="40" fill="#00796B"/>
          <rect x="28" y="104" width="28" height="28" fill="#FFFFFF"/>
          <rect x="34" y="110" width="16" height="16" fill="#00796B"/>

          <!-- Center Verification Shield -->
          <circle cx="85" cy="85" r="16" fill="#00796B"/>
          <text x="79" y="90" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="14" font-weight="800">✓</text>
        </g>

        <!-- Appointment Code Highlight -->
        <rect x="32" y="244" width="294" height="36" rx="10" fill="#F8FAFC" stroke="#CBD5E1"/>
        <text x="44" y="267" fill="#00796B" font-family="'JetBrains Mono'" font-size="13" font-weight="800">Mã hẹn: LH-20261111-8899</text>

        <!-- Citizen & Officer Info Row -->
        <g transform="translate(32, 296)">
          <text x="0" y="16" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11">Công dân:</text>
          <text x="64" y="16" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="12" font-weight="800">NGUYỄN MINH TUẤN KHANH</text>

          <text x="0" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11">Thủ tục:</text>
          <text x="64" y="40" fill="#00796B" font-family="'Be Vietnam Pro'" font-size="12" font-weight="700">Đăng ký thường trú (Mẫu CT01)</text>

          <text x="0" y="64" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11">Cán bộ:</text>
          <text x="64" y="64" fill="#059669" font-family="'Be Vietnam Pro'" font-size="12" font-weight="700">Trần Thị Hương (Phường Mỹ Bình)</text>
        </g>

        <!-- Download Action Button -->
        <g transform="translate(20, 388)">
          <rect width="318" height="52" rx="14" fill="#00796B" filter="url(#civicButtonShadow)"/>
          <text x="48" y="32" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="13" font-weight="800">📥 TẢI PHIẾU HẸN (.PDF) VỀ MÁY</text>
        </g>
      </g>

      <!-- Center Banner: Offline Guarantee -->
      <g transform="translate(16, 616)">
        <rect width="358" height="68" rx="16" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1.5" filter="url(#civicCardShadow)"/>
        <text x="20" y="28" fill="#065F46" font-family="'Be Vietnam Pro'" font-size="12" font-weight="800">🛡️ Bảo đảm hoạt động khi mất mạng 4G</text>
        <text x="20" y="48" fill="#047857" font-family="'Be Vietnam Pro'" font-size="11">Phiếu hẹn lưu sẵn trong bộ nhớ mã hóa máy. Bà con mang ra quầy Một cửa quét bình thường.</text>
      </g>

      <!-- Bottom Tab Bar -->
      <g transform="translate(16, 750)">
        <rect width="358" height="64" rx="24" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" filter="url(#civicCardShadow)"/>
        <text x="32" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">📍 Xã</text>
        <text x="96" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">💬 40 TTHC</text>
        <text x="176" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">🛡️ Duyệt</text>
        <text x="250" y="40" fill="#00796B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="800">🎫 Ví QR</text>
        <text x="310" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">🏛️ Quầy</text>
      </g>
    </g>

    <!-- SCREEN 6: CHẾ ĐỘ CÁN BỘ MỘT CỬA TẠI QUẦY (iPhone 390x844) -->
    <g id="Screen/06_Officer_Counter_Scanner" transform="translate(2160, 140)">
      ${screenBg(390, 844, 40)}

      <!-- iOS Status Bar & Header (Officer Dark Theme) -->
      <rect x="135" y="10" width="120" height="26" rx="13" fill="#0F172A"/>
      <rect x="16" y="52" width="358" height="72" rx="20" fill="#0F172A" stroke="#2DD4BF" stroke-width="1.5" filter="url(#civicCardShadow)"/>
      <text x="36" y="78" fill="#2DD4BF" font-family="'Be Vietnam Pro'" font-size="11" font-weight="700">BÀN CÔNG CHỨC MỘT CỬA (CC-AG-8942)</text>
      <text x="36" y="104" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="17" font-weight="800">Quét Mã QR &amp; Đối Chiếu Gốc</text>
      <rect x="268" y="68" width="90" height="38" rx="12" fill="#00796B"/>
      <text x="280" y="92" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="11" font-weight="800">📷 QUÉT</text>

      <!-- Center Focus: Scanned Result Slide-Up Sheet -->
      <g transform="translate(16, 140)">
        <rect width="358" height="460" rx="24" fill="#FFFFFF" stroke="#00796B" stroke-width="2" filter="url(#civicCardShadow)"/>
        
        <rect x="18" y="18" width="170" height="28" rx="8" fill="#ECFDF5" stroke="#A7F3D0"/>
        <text x="26" y="37" fill="#065F46" font-family="'JetBrains Mono'" font-size="11" font-weight="700">LH-20261111-8899</text>
        <rect x="236" y="18" width="104" height="28" rx="8" fill="#00796B"/>
        <text x="246" y="37" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="10" font-weight="800">AI GATE PASS</text>

        <text x="18" y="72" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="15" font-weight="800">Hồ Sơ: NGUYỄN MINH TUẤN KHANH</text>
        <text x="18" y="94" fill="#334155" font-family="'Be Vietnam Pro'" font-size="12">CCCD: 089205023490 • Đăng ký thường trú (CT01)</text>

        <!-- AI Verification Summary Box -->
        <rect x="18" y="112" width="322" height="120" rx="16" fill="#F0FDFA" stroke="#99F6E4"/>
        <text x="32" y="136" fill="#0F766E" font-family="'Be Vietnam Pro'" font-size="12" font-weight="800">Kết Quả Tiền Kiểm Của Hệ Thống AI:</text>
        <text x="32" y="160" fill="#065F46" font-family="'Be Vietnam Pro'" font-size="11">✓ Điểm sắc nét: 96/100 (Rõ nét, không bị rung mờ)</text>
        <text x="32" y="182" fill="#065F46" font-family="'Be Vietnam Pro'" font-size="11">✓ Đối chiếu chéo: Khớp 100% dữ liệu gốc và CCCD</text>
        <text x="32" y="204" fill="#065F46" font-family="'Be Vietnam Pro'" font-size="11">✓ Bảo mật: Đã mã hóa AES-256-GCM + Watermark</text>

        <!-- View Original Watermarked Doc Button -->
        <rect x="18" y="246" width="322" height="48" rx="14" fill="#F8FAFC" stroke="#CBD5E1"/>
        <text x="44" y="276" fill="#0F172A" font-family="'Be Vietnam Pro'" font-size="12" font-weight="800">👁️ Xem Giấy Tờ Đính Kèm (One-Time Token)</text>

        <!-- Action: 1-Tap Officer Approve -->
        <rect x="18" y="306" width="322" height="56" rx="16" fill="#00796B" filter="url(#civicButtonShadow)"/>
        <text x="42" y="341" fill="#FFFFFF" font-family="'Be Vietnam Pro'" font-size="14" font-weight="800">✓ DUYỆT HỢP LỆ &amp; GỬI EMAIL MIỄN PHÍ</text>

        <!-- Reject/Supplement Secondary Action -->
        <rect x="18" y="374" width="322" height="46" rx="14" fill="#FEF2F2" stroke="#FCA5A5"/>
        <text x="76" y="403" fill="#DC2626" font-family="'Be Vietnam Pro'" font-size="12" font-weight="800">✕ Yêu Cầu Chụp Bổ Sung Giấy Tờ</text>
      </g>

      <!-- Bottom Tab Bar -->
      <g transform="translate(16, 750)">
        <rect width="358" height="64" rx="24" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" filter="url(#civicCardShadow)"/>
        <text x="32" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">📍 Xã</text>
        <text x="96" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">💬 40 TTHC</text>
        <text x="176" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">🛡️ Duyệt</text>
        <text x="250" y="40" fill="#64748B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="600">🎫 Ví QR</text>
        <text x="310" y="40" fill="#00796B" font-family="'Be Vietnam Pro'" font-size="11" font-weight="800">🏛️ Quầy</text>
      </g>
    </g>

    <!-- ========================================================================= -->
    <!-- ROW 2: UI/UX PRO MAX DESIGN SYSTEM STANDARDS & METRICS BAR -->
    <!-- ========================================================================= -->
    <g id="DesignSystem/UIUX_ProMax_Rules" transform="translate(60, 1030)">
      <rect width="2680" height="980" rx="28" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>
      <text x="48" y="64" fill="#2DD4BF" font-family="'Be Vietnam Pro', sans-serif" font-size="22" font-weight="800">TIÊU CHUẨN THIẾT KẾ UI/UX PRO MAX • CÂN ĐỐI BỐ CỤC, NHẤN MẠNH TRỌNG TÂM &amp; THÂN THIỆN NGƯỜI CAO TUỔI</text>

      <!-- Pillar 1: Background & Institutional Watermark -->
      <g transform="translate(48, 100)">
        <rect width="620" height="260" rx="20" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
        <text x="32" y="44" fill="#99F6E4" font-family="'Be Vietnam Pro'" font-size="16" font-weight="800">1. HỆ NỀN CIVIC CANVAS &amp; UTH WATERMARK</text>
        <text x="32" y="80" fill="#CBD5E1" font-family="'Be Vietnam Pro'" font-size="13">• Gradient đồng bộ Web: #E0F2F1 (soft emerald) → #F0FDFA → #F8FAFC.</text>
        <text x="32" y="110" fill="#CBD5E1" font-family="'Be Vietnam Pro'" font-size="13">• Họa tiết chìm UTH - SMARTWARD (opacity 4.5%): chống giả mạo, trang trọng.</text>
        <text x="32" y="140" fill="#CBD5E1" font-family="'Be Vietnam Pro'" font-size="13">• Hiệu ứng ánh sáng Radial Glow vi tế ở 2 góc, tăng chiều sâu thị giác.</text>
        <text x="32" y="170" fill="#CBD5E1" font-family="'Be Vietnam Pro'" font-size="13">• Thẻ nội dung (Cards) nổi bật trên nền với shadow mềm mại (0 4px 8px rgba(0,0,0,0.06)).</text>
      </g>

      <!-- Pillar 2: Centered Hierarchy & Thumb Zone Ergonomics -->
      <g transform="translate(708, 100)">
        <rect width="620" height="260" rx="20" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
        <text x="32" y="44" fill="#99F6E4" font-family="'Be Vietnam Pro'" font-size="16" font-weight="800">2. BỐ CỤC CĂN ĐỀU &amp; CÔNG THÁI HỌC VÙNG NGÓN TAY</text>
        <text x="32" y="80" fill="#CBD5E1" font-family="'Be Vietnam Pro'" font-size="13">• Trục nội dung chính căn giữa cân đối (Padding 16px, thẻ rộng 358px).</text>
        <text x="32" y="110" fill="#CBD5E1" font-family="'Be Vietnam Pro'" font-size="13">• Vùng ngón tay cái (Natural Thumb Zone): Nút chính và Tab bar đặt ở nửa dưới.</text>
        <text x="32" y="140" fill="#CBD5E1" font-family="'Be Vietnam Pro'" font-size="13">• Chiều cao nút tối thiểu 48px – 54px (chuẩn Apple HIG &amp; WCAG Touch Target).</text>
        <text x="32" y="170" fill="#CBD5E1" font-family="'Be Vietnam Pro'" font-size="13">• Cấu trúc thông tin phân tầng rõ: Tiêu đề → Điểm số nổi bật → Hành động kế tiếp.</text>
      </g>

      <!-- Pillar 3: Accessibility for Elders -->
      <g transform="translate(1368, 100)">
        <rect width="620" height="260" rx="20" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
        <text x="32" y="44" fill="#99F6E4" font-family="'Be Vietnam Pro'" font-size="16" font-weight="800">3. TRẢI NGHIỆM ĐẶC QUYỀN CHO NGƯỜI CAO TUỔI</text>
        <text x="32" y="80" fill="#CBD5E1" font-family="'Be Vietnam Pro'" font-size="13">• Nút chuyển 3 cấp cỡ chữ: A (14px) • A+ (16px) • A++ (18.5px).</text>
        <text x="32" y="110" fill="#CBD5E1" font-family="'Be Vietnam Pro'" font-size="13">• Tích hợp tính năng "Nghe đọc to" tiếng Việt với 2 trạng thái MỞ / TẮT rõ rệt.</text>
        <text x="32" y="140" fill="#CBD5E1" font-family="'Be Vietnam Pro'" font-size="13">• Biểu tượng (Icon) luôn đi kèm chú thích chữ, không để icon đơn độc gây khó hiểu.</text>
        <text x="32" y="170" fill="#CBD5E1" font-family="'Be Vietnam Pro'" font-size="13">• Thông báo lỗi bằng tiếng Việt dân dã, hướng dẫn từng bước khắc phục cụ thể.</text>
      </g>

      <!-- Pillar 4: Zero-Cost & Citizen Privacy Guarantee -->
      <g transform="translate(2028, 100)">
        <rect width="600" height="260" rx="20" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
        <text x="32" y="44" fill="#99F6E4" font-family="'Be Vietnam Pro'" font-size="16" font-weight="800">4. CAM KẾT KHÔNG TỐN KÉM &amp; BẢO MẬT DỮ LIỆU</text>
        <text x="32" y="80" fill="#CBD5E1" font-family="'Be Vietnam Pro'" font-size="13">• Tuyệt đối không dùng lệnh in: Tải trực tiếp file .docx &amp; .pdf về điện thoại.</text>
        <text x="32" y="110" fill="#CBD5E1" font-family="'Be Vietnam Pro'" font-size="13">• Nhận thông báo qua Email miễn phí 100%, không tốn chi phí SMS/Zalo OTP.</text>
        <text x="32" y="140" fill="#CBD5E1" font-family="'Be Vietnam Pro'" font-size="13">• Ảnh giấy tờ công dân đóng dấu Watermark động &amp; mã hóa AES-256-GCM.</text>
        <text x="32" y="170" fill="#CBD5E1" font-family="'Be Vietnam Pro'" font-size="13">• Ví Phiếu hẹn QR offline: không có mạng 4G vẫn mở được để quét tại quầy.</text>
      </g>
    </g>
  </g>
</svg>`;

const targetPath = path.join(outDir, '03_Screens_And_04_Prototype_Flows.svg');
fs.writeFileSync(targetPath, svgContent, 'utf8');
console.log('Successfully written upgraded 03_Screens_And_04_Prototype_Flows.svg with authentic UTH Watermark & UI/UX Pro Max standards!');
