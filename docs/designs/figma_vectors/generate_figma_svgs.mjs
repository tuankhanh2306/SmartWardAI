import fs from 'fs';
import path from 'path';

const outDir = 'e:/SmartWardAI/docs/designs/figma_vectors';
fs.mkdirSync(outDir, { recursive: true });

// 1. 00_Cover_And_Notes.svg
const svg00 = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <g id="Page/00_Cover_And_Notes">
    <rect width="1600" height="900" rx="32" fill="#0F172A"/>
    <rect x="64" y="64" width="1472" height="772" rx="24" fill="#1E293B" stroke="#334155" stroke-width="2"/>
    <rect x="112" y="112" width="340" height="44" rx="22" fill="#00796B"/>
    <text x="136" y="140" fill="#FFFFFF" font-family="Be Vietnam Pro, sans-serif" font-size="16" font-weight="800">SMARTWARD AI MOBILE • v2.0 HANDOFF</text>
    <text x="112" y="230" fill="#FFFFFF" font-family="Be Vietnam Pro, sans-serif" font-size="48" font-weight="800">Hệ Thống Dịch Vụ Công &amp; Sơ Duyệt Tờ Khai Cấp Xã</text>
    <text x="112" y="286" fill="#99F6E4" font-family="Be Vietnam Pro, sans-serif" font-size="24" font-weight="600">Đồng bộ 100% Web ↔ Mobile (96 Xã, Phường &amp; Đặc khu Tỉnh An Giang)</text>
    
    <g id="Cover/Architecture_Cards" transform="translate(112, 340)">
      <rect x="0" y="0" width="430" height="220" rx="16" fill="#0F172A" stroke="#00796B" stroke-width="2"/>
      <text x="28" y="44" fill="#2DD4BF" font-family="Be Vietnam Pro, sans-serif" font-size="18" font-weight="800">01. DESIGN SYSTEM &amp; TOKENS</text>
      <text x="28" y="80" fill="#CBD5E1" font-family="Be Vietnam Pro, sans-serif" font-size="15">• Primary Civic Emerald: #00796B</text>
      <text x="28" y="110" fill="#CBD5E1" font-family="Be Vietnam Pro, sans-serif" font-size="15">• Dark Slate Ink: #0F172A | Canvas: #F8FAFC</text>
      <text x="28" y="140" fill="#CBD5E1" font-family="Be Vietnam Pro, sans-serif" font-size="15">• 3 Cấp Cỡ Chữ Người Cao Tuổi: A / A+ / A++</text>
      <text x="28" y="170" fill="#CBD5E1" font-family="Be Vietnam Pro, sans-serif" font-size="15">• Touch Target tối thiểu: 48x48px (WCAG AA)</text>

      <rect x="460" y="0" width="430" height="220" rx="16" fill="#0F172A" stroke="#00796B" stroke-width="2"/>
      <text x="488" y="44" fill="#2DD4BF" font-family="Be Vietnam Pro, sans-serif" font-size="18" font-weight="800">02. 5 MÀN HÌNH + CHẾ ĐỘ CÁN BỘ</text>
      <text x="488" y="80" fill="#CBD5E1" font-family="Be Vietnam Pro, sans-serif" font-size="15">• Màn 1: Chọn địa bàn 96 xã (iPhone 390x844 &amp; Android 360x800)</text>
      <text x="488" y="110" fill="#CBD5E1" font-family="Be Vietnam Pro, sans-serif" font-size="15">• Màn 2: Trợ lý RAG 40 TTHC (θ=0.78, TTS MỞ/TẮT)</text>
      <text x="488" y="140" fill="#CBD5E1" font-family="Be Vietnam Pro, sans-serif" font-size="15">• Màn 3: Sơ duyệt &amp; AI Thị Giác (Độ nét ≥45/100)</text>
      <text x="488" y="170" fill="#CBD5E1" font-family="Be Vietnam Pro, sans-serif" font-size="15">• Màn 4 &amp; 5: GPS R=25m &amp; Ví Mã Hẹn QR Offline (.pdf)</text>

      <rect x="920" y="0" width="450" height="220" rx="16" fill="#0F172A" stroke="#00796B" stroke-width="2"/>
      <text x="948" y="44" fill="#2DD4BF" font-family="Be Vietnam Pro, sans-serif" font-size="18" font-weight="800">03. NGUYÊN TẮC BẤT BIẾN (ZERO-COST)</text>
      <text x="948" y="80" fill="#CBD5E1" font-family="Be Vietnam Pro, sans-serif" font-size="15">• Tuyệt đối KHÔNG dùng lệnh in (window.print)</text>
      <text x="948" y="110" fill="#CBD5E1" font-family="Be Vietnam Pro, sans-serif" font-size="15">• Tải trực tiếp file mẫu .DOCX &amp; .PDF về điện thoại</text>
      <text x="948" y="140" fill="#CBD5E1" font-family="Be Vietnam Pro, sans-serif" font-size="15">• Thông báo qua Email miễn phí 100% (Không SMS/Zalo)</text>
      <text x="948" y="170" fill="#CBD5E1" font-family="Be Vietnam Pro, sans-serif" font-size="15">• Ảnh công dân mã hóa AES-256-GCM + Watermark OTT</text>
    </g>

    <rect x="112" y="600" width="1370" height="180" rx="16" fill="#0F172A" stroke="#475569" stroke-width="1.5"/>
    <text x="140" y="640" fill="#FDE68A" font-family="Be Vietnam Pro, sans-serif" font-size="18" font-weight="800">GHI CHÚ GIẢ ĐỊNH &amp; BÀN GIAO DEVELOPER (REACT NATIVE EXPO SDK 52)</text>
    <text x="140" y="676" fill="#E2E8F0" font-family="Be Vietnam Pro, sans-serif" font-size="15">1. Giả định Chế độ Sáng/Tối: Mặc định ưu tiên Light Mode (#F8FAFC) cho người cao tuổi nhìn rõ ngoài nắng; hỗ trợ Dark Mode (#0F172A) qua biến semantic.</text>
    <text x="140" y="708" fill="#E2E8F0" font-family="Be Vietnam Pro, sans-serif" font-size="15">2. Giả định Offline-First: Danh mục 40 TTHC và Phiếu hẹn Mã QR (LH-YYYYMMDD-XXXX) được lưu trong AsyncStorage/SQLite để mở được khi mất mạng 4G.</text>
    <text x="140" y="740" fill="#E2E8F0" font-family="Be Vietnam Pro, sans-serif" font-size="15">3. Cấu trúc Pages chuẩn: 00 Cover | 01 Design System | 02 Components | 03 Screens (iPhone 390x844 + Android 360x800) | 04 Flows | 05 Handoff.</text>
  </g>
</svg>`;

// 2. 01_Design_System_And_02_Components.svg
const svg01_02 = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1250" viewBox="0 0 1800 1250">
  <g id="Page/01_Design_System_And_02_Components">
    <rect width="1800" height="1250" rx="24" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
    <rect x="40" y="36" width="1720" height="72" rx="16" fill="#0F172A"/>
    <text x="72" y="80" fill="#FFFFFF" font-family="Be Vietnam Pro, sans-serif" font-size="24" font-weight="800">01 DESIGN SYSTEM (VARIABLES) &amp; 02 COMPONENT LIBRARY (20 AUTO-LAYOUT COMPONENTS)</text>

    <!-- Color Variables Section -->
    <g id="DesignSystem/ColorVariables" transform="translate(40, 132)">
      <rect width="840" height="340" rx="20" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      <text x="28" y="42" fill="#0F172A" font-family="Be Vietnam Pro, sans-serif" font-size="18" font-weight="800">1. Color Variables (Light &amp; Dark Semantic Tokens)</text>

      <!-- Primary Scale -->
      <text x="28" y="78" fill="#475569" font-family="Be Vietnam Pro, sans-serif" font-size="13" font-weight="700">Primary Civic Emerald (color/primary/50 → 900 • Default: #00796B)</text>
      <rect x="28" y="90" width="90" height="52" rx="10" fill="#F0FDFA" stroke="#CBD5E1"/><text x="38" y="122" fill="#0F172A" font-family="JetBrains Mono" font-size="11">50 #F0FDFA</text>
      <rect x="128" y="90" width="90" height="52" rx="10" fill="#CCFBF1"/><text x="136" y="122" fill="#0F172A" font-family="JetBrains Mono" font-size="11">100 #CCFBF1</text>
      <rect x="228" y="90" width="90" height="52" rx="10" fill="#99F6E4"/><text x="236" y="122" fill="#0F172A" font-family="JetBrains Mono" font-size="11">200 #99F6E4</text>
      <rect x="328" y="90" width="90" height="52" rx="10" fill="#2DD4BF"/><text x="336" y="122" fill="#0F172A" font-family="JetBrains Mono" font-size="11">400 #2DD4BF</text>
      <rect x="428" y="90" width="120" height="52" rx="10" fill="#00796B"/><text x="440" y="122" fill="#FFFFFF" font-family="JetBrains Mono" font-size="12" font-weight="700">600 #00796B ★</text>
      <rect x="558" y="90" width="90" height="52" rx="10" fill="#00695C"/><text x="566" y="122" fill="#FFFFFF" font-family="JetBrains Mono" font-size="11">700 #00695C</text>
      <rect x="658" y="90" width="90" height="52" rx="10" fill="#115E59"/><text x="666" y="122" fill="#FFFFFF" font-family="JetBrains Mono" font-size="11">800 #115E59</text>

      <!-- Neutral & Dark Slate Scale -->
      <text x="28" y="174" fill="#475569" font-family="Be Vietnam Pro, sans-serif" font-size="13" font-weight="700">Dark Slate &amp; Surface Neutrals (color/surface/* &amp; color/text/* • Primary Ink: #0F172A)</text>
      <rect x="28" y="186" width="105" height="52" rx="10" fill="#FFFFFF" stroke="#CBD5E1"/><text x="38" y="218" fill="#0F172A" font-family="JetBrains Mono" font-size="11">Card #FFFFFF</text>
      <rect x="143" y="186" width="115" height="52" rx="10" fill="#F8FAFC" stroke="#CBD5E1"/><text x="153" y="218" fill="#0F172A" font-family="JetBrains Mono" font-size="11">Canvas #F8FAFC</text>
      <rect x="268" y="186" width="115" height="52" rx="10" fill="#CBD5E1"/><text x="278" y="218" fill="#0F172A" font-family="JetBrains Mono" font-size="11">Border #CBD5E1</text>
      <rect x="393" y="186" width="115" height="52" rx="10" fill="#64748B"/><text x="403" y="218" fill="#FFFFFF" font-family="JetBrains Mono" font-size="11">Muted #64748B</text>
      <rect x="518" y="186" width="115" height="52" rx="10" fill="#334155"/><text x="528" y="218" fill="#FFFFFF" font-family="JetBrains Mono" font-size="11">Sub #334155</text>
      <rect x="643" y="186" width="145" height="52" rx="10" fill="#0F172A"/><text x="655" y="218" fill="#FFFFFF" font-family="JetBrains Mono" font-size="12" font-weight="700">Ink #0F172A ★</text>

      <!-- Semantic Status Colors -->
      <text x="28" y="268" fill="#475569" font-family="Be Vietnam Pro, sans-serif" font-size="13" font-weight="700">Semantic Status Tokens (Success / Warning / Error / Info)</text>
      <rect x="28" y="280" width="185" height="44" rx="10" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1.5"/><text x="44" y="307" fill="#065F46" font-family="Be Vietnam Pro" font-size="12" font-weight="800">✓ Success #059669</text>
      <rect x="225" y="280" width="185" height="44" rx="10" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"/><text x="241" y="307" fill="#92400E" font-family="Be Vietnam Pro" font-size="12" font-weight="800">⚠ Warning #D97706</text>
      <rect x="422" y="280" width="185" height="44" rx="10" fill="#FEF2F2" stroke="#FCA5A5" stroke-width="1.5"/><text x="438" y="307" fill="#991B1B" font-family="Be Vietnam Pro" font-size="12" font-weight="800">✕ Error #DC2626</text>
      <rect x="619" y="280" width="185" height="44" rx="10" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5"/><text x="635" y="307" fill="#1E40AF" font-family="Be Vietnam Pro" font-size="12" font-weight="800">ℹ Info #2563EB</text>
    </g>

    <!-- Typography 3 Modes Section -->
    <g id="DesignSystem/Typography_A_APlus_APlusPlus" transform="translate(900, 132)">
      <rect width="860" height="340" rx="20" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      <text x="28" y="42" fill="#0F172A" font-family="Be Vietnam Pro, sans-serif" font-size="18" font-weight="800">2. Typography (Be Vietnam Pro + JetBrains Mono • 3 Cấp Cỡ Chữ Người Cao Tuổi)</text>

      <rect x="28" y="64" width="260" height="252" rx="14" fill="#F8FAFC" stroke="#CBD5E1"/>
      <text x="44" y="94" fill="#00796B" font-family="Be Vietnam Pro" font-size="14" font-weight="800">Mode 1: Cỡ Chuẩn (A • 1.0x)</text>
      <text x="44" y="130" fill="#0F172A" font-family="Be Vietnam Pro" font-size="18" font-weight="800">Tiêu đề: 18px / 26px</text>
      <text x="44" y="164" fill="#334155" font-family="Be Vietnam Pro" font-size="14">Nội dung TTHC: 14px / 22px rõ dấu tiếng Việt.</text>
      <text x="44" y="210" fill="#00796B" font-family="JetBrains Mono" font-size="13" font-weight="700">CCCD: 089205023490</text>
      <text x="44" y="240" fill="#64748B" font-family="Be Vietnam Pro" font-size="12">Chú thích: 12px / 18px</text>

      <rect x="300" y="64" width="260" height="252" rx="14" fill="#F0FDFA" stroke="#99F6E4" stroke-width="1.5"/>
      <text x="316" y="94" fill="#00796B" font-family="Be Vietnam Pro" font-size="15" font-weight="800">Mode 2: Cỡ Lớn (A+ • 1.15x)</text>
      <text x="316" y="132" fill="#0F172A" font-family="Be Vietnam Pro" font-size="20" font-weight="800">Tiêu đề: 20px / 28px</text>
      <text x="316" y="168" fill="#334155" font-family="Be Vietnam Pro" font-size="16">Nội dung TTHC: 16px / 25px dễ đọc.</text>
      <text x="316" y="214" fill="#00796B" font-family="JetBrains Mono" font-size="15" font-weight="700">CCCD: 089205023490</text>
      <text x="316" y="246" fill="#64748B" font-family="Be Vietnam Pro" font-size="14">Chú thích: 14px / 20px</text>

      <rect x="572" y="64" width="260" height="252" rx="14" fill="#ECFDF5" stroke="#00796B" stroke-width="2"/>
      <text x="588" y="94" fill="#065F46" font-family="Be Vietnam Pro" font-size="16" font-weight="800">Mode 3: Cỡ Rất Lớn (A++ • 1.32x)</text>
      <text x="588" y="136" fill="#0F172A" font-family="Be Vietnam Pro" font-size="22" font-weight="800">Tiêu đề: 22px / 32px</text>
      <text x="588" y="174" fill="#0F172A" font-family="Be Vietnam Pro" font-size="18.5" font-weight="500">Nội dung: 18.5px cho cô chú lớn tuổi.</text>
      <text x="588" y="220" fill="#00796B" font-family="JetBrains Mono" font-size="17" font-weight="700">089205023490</text>
      <text x="588" y="254" fill="#065F46" font-family="Be Vietnam Pro" font-size="15.5" font-weight="600">Chú thích: 15.5px / 22px</text>
    </g>

    <!-- 20 Component Library Matrix -->
    <g id="Components/MasterLibrary_20_Items" transform="translate(40, 496)">
      <rect width="1720" height="714" rx="20" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      <text x="28" y="42" fill="#0F172A" font-family="Be Vietnam Pro, sans-serif" font-size="18" font-weight="800">3. Component Library (Auto Layout • Min Touch Target 48x48px • Variants &amp; Properties)</text>

      <!-- Row 1: Buttons (Primary, Secondary, Ghost, Destructive x States) -->
      <g id="Component/Button/Variants" transform="translate(28, 66)">
        <text x="0" y="18" fill="#475569" font-family="Be Vietnam Pro" font-size="13" font-weight="700">Buttons (Height = 48px):</text>
        <rect x="0" y="28" width="230" height="48" rx="14" fill="#00796B"/><text x="32" y="57" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="13" font-weight="800">Primary / Default (48px)</text>
        <rect x="244" y="28" width="230" height="48" rx="14" fill="#00695C"/><text x="276" y="57" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="13" font-weight="800">Primary / Pressed</text>
        <rect x="488" y="28" width="240" height="48" rx="14" fill="#94A3B8"/><text x="512" y="57" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="13" font-weight="800">Disabled (AI Chặn Gửi)</text>
        <rect x="742" y="28" width="220" height="48" rx="14" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/><text x="774" y="57" fill="#00796B" font-family="Be Vietnam Pro" font-size="13" font-weight="800">Secondary / Tải .DOCX</text>
        <rect x="976" y="28" width="220" height="48" rx="14" fill="#FEF2F2" stroke="#FCA5A5" stroke-width="1.5"/><text x="1008" y="57" fill="#DC2626" font-family="Be Vietnam Pro" font-size="13" font-weight="800">Destructive / Xóa Ảnh</text>
        <rect x="1210" y="28" width="220" height="48" rx="14" fill="#00796B"/><text x="1242" y="57" fill="#80CBC4" font-family="Be Vietnam Pro" font-size="13" font-weight="800">⟳ Loading / Đang gửi...</text>
      </g>

      <!-- Row 2: 2-Mode TTS Button, Status Chips, AI Gate Pass Badge, Ward Dropdown -->
      <g id="Component/CivicControls" transform="translate(28, 168)">
        <text x="0" y="18" fill="#475569" font-family="Be Vietnam Pro" font-size="13" font-weight="700">Nút Nghe Đọc To (2 Chế Độ MỞ/TẮT) • Chip Trạng Thái • Badge AI GATE PASS • Dropdown 96 Xã:</text>
        <!-- TTS Mode OFF (Click to Open) -->
        <rect x="0" y="28" width="220" height="48" rx="14" fill="#FFFFFF" stroke="#A7F3D0" stroke-width="1.5"/>
        <text x="18" y="57" fill="#065F46" font-family="Be Vietnam Pro" font-size="13" font-weight="800">🔊 Nghe đọc to</text>
        <rect x="156" y="38" width="48" height="28" rx="8" fill="#00796B"/><text x="168" y="57" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="11" font-weight="800">MỞ</text>

        <!-- TTS Mode ON (Speaking -> Click to Stop) -->
        <rect x="234" y="28" width="240" height="48" rx="14" fill="#FEF2F2" stroke="#FCA5A5" stroke-width="2"/>
        <text x="252" y="57" fill="#B91C1C" font-family="Be Vietnam Pro" font-size="13" font-weight="800">🔇 Đang đọc...</text>
        <rect x="408" y="38" width="52" height="28" rx="8" fill="#DC2626"/><text x="420" y="57" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="11" font-weight="800">TẮT</text>

        <!-- Status Chips -->
        <rect x="490" y="34" width="150" height="36" rx="18" fill="#ECFDF5" stroke="#A7F3D0"/><text x="512" y="57" fill="#065F46" font-family="Be Vietnam Pro" font-size="12" font-weight="800">● APPROVED / HỢP LỆ</text>
        <rect x="652" y="34" width="150" height="36" rx="18" fill="#FFFBEB" stroke="#FDE68A"/><text x="672" y="57" fill="#92400E" font-family="Be Vietnam Pro" font-size="12" font-weight="800">● PENDING / CHỜ DUYỆT</text>
        <rect x="814" y="34" width="170" height="36" rx="18" fill="#FEF2F2" stroke="#FCA5A5"/><text x="832" y="57" fill="#991B1B" font-family="Be Vietnam Pro" font-size="12" font-weight="800">✕ CẦN CHỤP LẠI ẢNH</text>

        <!-- AI GATE PASS Badge -->
        <rect x="998" y="34" width="310" height="36" rx="10" fill="#CCFBF1" stroke="#00796B" stroke-width="1.5"/>
        <text x="1014" y="57" fill="#0F766E" font-family="JetBrains Mono" font-size="12" font-weight="700">🛡️ AI GATE PASS: 96/100 • Khớp CT01</text>

        <!-- Ward Selector Pill -->
        <rect x="1322" y="28" width="330" height="48" rx="14" fill="#F0FDFA" stroke="#99F6E4" stroke-width="1.5"/>
        <text x="1342" y="57" fill="#00796B" font-family="Be Vietnam Pro" font-size="13" font-weight="800">📍 Phường Mỹ Bình (96 Xã) ▾</text>
      </g>

      <!-- Row 3: Inputs (Valid, Error), AI Vision 3-Criteria Card, Electronic QR Pass Component -->
      <g id="Component/FormsAndCards" transform="translate(28, 276)">
        <!-- Input Normal / Auto-filled -->
        <rect x="0" y="0" width="380" height="92" rx="14" fill="#F8FAFC" stroke="#CBD5E1"/>
        <text x="16" y="26" fill="#334155" font-family="Be Vietnam Pro" font-size="12" font-weight="700">Địa chỉ Email nhận kết quả &amp; Mã QR miễn phí (*):</text>
        <rect x="16" y="36" width="348" height="44" rx="10" fill="#FFFFFF" stroke="#00796B" stroke-width="1.5"/>
        <text x="28" y="63" fill="#0F172A" font-family="Be Vietnam Pro" font-size="13" font-weight="600">congdan.angiang@gmail.com</text>

        <!-- Input Error State -->
        <rect x="400" y="0" width="380" height="106" rx="14" fill="#FEF2F2" stroke="#FCA5A5"/>
        <text x="416" y="26" fill="#991B1B" font-family="Be Vietnam Pro" font-size="12" font-weight="700">Số ĐDCN / CCCD (Đang báo lỗi thiếu số):</text>
        <rect x="416" y="36" width="348" height="44" rx="10" fill="#FFFFFF" stroke="#DC2626" stroke-width="1.5"/>
        <text x="428" y="63" fill="#DC2626" font-family="JetBrains Mono" font-size="13" font-weight="700">03103708 (Chỉ có 8 số)</text>
        <text x="416" y="96" fill="#DC2626" font-family="Be Vietnam Pro" font-size="11" font-weight="700">⚠ Vui lòng nhập đủ 12 chữ số CCCD gắn chip.</text>

        <!-- AI Vision 3-Criteria Diagnostic Card Component -->
        <rect x="800" y="0" width="430" height="140" rx="16" fill="#F0FDFA" stroke="#99F6E4" stroke-width="1.5"/>
        <text x="820" y="28" fill="#0F766E" font-family="Be Vietnam Pro" font-size="13" font-weight="800">Chốt Chặn AI Thị Giác (3 Tiêu Chí) • ĐẠT CHUẨN</text>
        <rect x="820" y="42" width="124" height="80" rx="10" fill="#FFFFFF" stroke="#99F6E4"/>
        <text x="830" y="64" fill="#475569" font-family="Be Vietnam Pro" font-size="11" font-weight="700">1. Độ sắc nét</text>
        <text x="830" y="90" fill="#059669" font-family="JetBrains Mono" font-size="14" font-weight="800">96/100</text>
        <text x="830" y="110" fill="#64748B" font-family="Be Vietnam Pro" font-size="10">Rõ nét (≥45)</text>

        <rect x="954" y="42" width="124" height="80" rx="10" fill="#FFFFFF" stroke="#99F6E4"/>
        <text x="964" y="64" fill="#475569" font-family="Be Vietnam Pro" font-size="11" font-weight="700">2. Khớp mẫu</text>
        <text x="964" y="90" fill="#059669" font-family="JetBrains Mono" font-size="14" font-weight="800">Mẫu CT01</text>
        <text x="964" y="110" fill="#64748B" font-family="Be Vietnam Pro" font-size="10">Khớp 100%</text>

        <rect x="1088" y="42" width="124" height="80" rx="10" fill="#FFFFFF" stroke="#99F6E4"/>
        <text x="1098" y="64" fill="#475569" font-family="Be Vietnam Pro" font-size="11" font-weight="700">3. Đọc chữ</text>
        <text x="1098" y="90" fill="#059669" font-family="JetBrains Mono" font-size="14" font-weight="800">5/5 mục</text>
        <text x="1098" y="110" fill="#64748B" font-family="Be Vietnam Pro" font-size="10">Đã tự điền</text>

        <!-- QR Appointment Pass Component -->
        <rect x="1250" y="0" width="410" height="190" rx="18" fill="#FFFFFF" stroke="#00796B" stroke-width="2.5"/>
        <rect x="1268" y="16" width="230" height="22" rx="6" fill="#CCFBF1"/>
        <text x="1276" y="31" fill="#0F766E" font-family="Be Vietnam Pro" font-size="10" font-weight="800">PHIẾU HẸN SƠ DUYỆT ĐIỆN TỬ CÓ MÃ QR</text>
        <text x="1268" y="60" fill="#0F172A" font-family="Be Vietnam Pro" font-size="14" font-weight="800">UBND Phường Mỹ Bình — An Giang</text>
        <text x="1268" y="84" fill="#334155" font-family="Be Vietnam Pro" font-size="12">Công dân: NGUYỄN MINH TUẤN KHANH</text>
        <text x="1268" y="106" fill="#00796B" font-family="JetBrains Mono" font-size="12" font-weight="700">Mã hẹn: LH-20261111-8899</text>
        <rect x="1550" y="20" width="90" height="90" rx="10" fill="#0F172A"/>
        <rect x="1562" y="32" width="66" height="66" fill="#FFFFFF"/>
        <rect x="1572" y="42" width="46" height="46" fill="#0F172A"/>
        <rect x="1268" y="130" width="372" height="44" rx="12" fill="#00796B"/>
        <text x="1335" y="157" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="13" font-weight="800">📥 Tải Phiếu Hẹn Có Mã QR (.pdf)</text>
      </g>

      <!-- Row 4: Bottom Tab Bar (64px height) & Offline Banner & Toast -->
      <g id="Component/NavigationAndBanners" transform="translate(28, 490)">
        <text x="0" y="18" fill="#475569" font-family="Be Vietnam Pro" font-size="13" font-weight="700">Bottom Tab Bar (5 Tabs • Height 64px) • Offline Banner • Toast Phản Hồi:</text>
        <rect x="0" y="32" width="520" height="64" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
        <text x="28" y="70" fill="#00796B" font-family="Be Vietnam Pro" font-size="12" font-weight="800">💬 40 TTHC</text>
        <text x="132" y="70" fill="#64748B" font-family="Be Vietnam Pro" font-size="12" font-weight="600">🛡️ Sơ Duyệt</text>
        <text x="236" y="70" fill="#64748B" font-family="Be Vietnam Pro" font-size="12" font-weight="600">🎫 Ví Mã QR</text>
        <text x="340" y="70" fill="#64748B" font-family="Be Vietnam Pro" font-size="12" font-weight="600">📍 Sự Cố 25m</text>
        <text x="444" y="70" fill="#64748B" font-family="Be Vietnam Pro" font-size="12" font-weight="600">🏛️ Cán Bộ</text>

        <rect x="550" y="32" width="540" height="64" rx="16" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"/>
        <text x="574" y="60" fill="#92400E" font-family="Be Vietnam Pro" font-size="13" font-weight="800">📡 Đang ngoại tuyến (Mất mạng 4G)</text>
        <text x="574" y="80" fill="#B45309" font-family="Be Vietnam Pro" font-size="12">Bà con vẫn mở được Mã QR Phiếu hẹn và 40 TTHC đã lưu sẵn trong máy.</text>

        <rect x="1116" y="32" width="540" height="64" rx="16" fill="#0F172A"/>
        <text x="1140" y="69" fill="#6EE7B7" font-family="Be Vietnam Pro" font-size="13" font-weight="800">✓ Đã duyệt &amp; gửi Email kèm Mã QR tới congdan.angiang@gmail.com</text>
      </g>
    </g>
  </g>
</svg>`;

// 3. 03_Screens_All_5_Plus_Officer_And_04_Prototype_Flows.svg
const svg03_04 = `<svg xmlns="http://www.w3.org/2000/svg" width="2600" height="1820" viewBox="0 0 2600 1820">
  <g id="Page/03_Screens_And_04_Prototype_Flows">
    <rect width="2600" height="1820" rx="28" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="2"/>
    <rect x="40" y="32" width="2520" height="68" rx="16" fill="#0F172A"/>
    <text x="72" y="74" fill="#FFFFFF" font-family="Be Vietnam Pro, sans-serif" font-size="24" font-weight="800">03 SCREENS (IPHONE 390x844 &amp; ANDROID 360x800 • ĐỦ TRẠNG THÁI) &amp; 04 PROTOTYPE 3 LUỒNG ĐỒNG BỘ</text>

    <!-- ROW 1: SCREEN 1 (HOME iOS 390x844 + ANDROID 360x800) & SCREEN 2 (LEGAL RAG ALL STATES) -->
    <!-- Frame 1A: Screen/Home/Default (iPhone 390x844) -->
    <g id="Screen/Home/Default_iPhone_390x844" transform="translate(40, 128)">
      <rect width="390" height="844" rx="36" fill="#F8FAFC" stroke="#0F172A" stroke-width="6"/>
      <rect x="0" y="0" width="390" height="96" rx="30" fill="#00796B"/>
      <text x="24" y="42" fill="#99F6E4" font-family="Be Vietnam Pro" font-size="11" font-weight="700">1. Screen/Home/Default (iPhone 390x844)</text>
      <text x="24" y="70" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="18" font-weight="800">📍 UBND Phường Mỹ Bình</text>
      <rect x="280" y="48" width="90" height="32" rx="10" fill="#FFFFFF"/><text x="292" y="69" fill="#00796B" font-family="Be Vietnam Pro" font-size="11" font-weight="800">A / A+ / A++</text>

      <!-- States inside Home Frame: Locating, Failed, Search 96 Wards -->
      <rect x="20" y="116" width="350" height="110" rx="16" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1.5"/>
      <text x="36" y="144" fill="#065F46" font-family="Be Vietnam Pro" font-size="13" font-weight="800">✓ Đã định vị GPS tự động (Sai số ±6m)</text>
      <text x="36" y="168" fill="#047857" font-family="Be Vietnam Pro" font-size="12">Trụ sở Một cửa: Số 18 Nguyễn Huệ, P. Mỹ Bình, An Giang</text>
      <rect x="36" y="180" width="318" height="34" rx="10" fill="#00796B"/><text x="96" y="202" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="12" font-weight="800">Đổi sang xã/phường khác (96 đơn vị)</text>

      <rect x="20" y="242" width="350" height="96" rx="16" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"/>
      <text x="36" y="268" fill="#92400E" font-family="Be Vietnam Pro" font-size="12" font-weight="800">[State: LocationFailed] Không lấy được vị trí GPS</text>
      <text x="36" y="290" fill="#B45309" font-family="Be Vietnam Pro" font-size="11">Mạng yếu hoặc chưa bật vị trí. Bà con bấm chọn tên xã bên dưới:</text>
      <rect x="36" y="302" width="180" height="26" rx="8" fill="#D97706"/><text x="52" y="319" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="11" font-weight="800">Chọn Xã/Phường Thủ Công</text>

      <rect x="20" y="354" width="350" height="230" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      <text x="36" y="382" fill="#0F172A" font-family="Be Vietnam Pro" font-size="13" font-weight="800">[State: SearchWard] Tìm trong 96 Xã/Phường/Đặc khu</text>
      <rect x="36" y="394" width="318" height="44" rx="10" fill="#F8FAFC" stroke="#00796B"/>
      <text x="50" y="421" fill="#0F172A" font-family="Be Vietnam Pro" font-size="12">🔍 Gõ tên xã: Mỹ Bình, Châu Phú, Thoại Sơn...</text>
      <rect x="36" y="450" width="318" height="48" rx="10" fill="#F0FDFA" stroke="#99F6E4"/><text x="50" y="479" fill="#00796B" font-family="Be Vietnam Pro" font-size="13" font-weight="800">✓ Phường Mỹ Bình (TP. Long Xuyên)</text>
      <rect x="36" y="506" width="318" height="48" rx="10" fill="#F8FAFC"/><text x="50" y="535" fill="#334155" font-family="Be Vietnam Pro" font-size="13" font-weight="600">Phường Châu Phú A (TP. Châu Đốc)</text>
    </g>

    <!-- Frame 1B: Screen/Home/Android_360x800 -->
    <g id="Screen/Home/Android_360x800" transform="translate(454, 150)">
      <rect width="360" height="800" rx="28" fill="#F8FAFC" stroke="#334155" stroke-width="5"/>
      <rect x="0" y="0" width="360" height="88" rx="22" fill="#00796B"/>
      <text x="20" y="38" fill="#99F6E4" font-family="Be Vietnam Pro" font-size="11" font-weight="700">1B. Screen/Home/Android (360x800)</text>
      <text x="20" y="64" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="16" font-weight="800">📍 Phường Mỹ Bình • Cỡ chữ A++</text>
      <rect x="18" y="108" width="324" height="120" rx="16" fill="#FFFFFF" stroke="#CBD5E1"/>
      <text x="32" y="140" fill="#0F172A" font-family="Be Vietnam Pro" font-size="18" font-weight="800">Chào cô chú, anh chị!</text>
      <text x="32" y="170" fill="#334155" font-family="Be Vietnam Pro" font-size="15">Giao diện cỡ chữ lớn A++ (18.5px), nút bấm cao 48px giúp cô chú dễ thao tác.</text>
      <rect x="18" y="244" width="324" height="56" rx="14" fill="#00796B"/><text x="48" y="278" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="15" font-weight="800">1. Hỏi Đáp 40 Thủ Tục (Có Giọng Đọc)</text>
      <rect x="18" y="314" width="324" height="56" rx="14" fill="#00796B"/><text x="48" y="348" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="15" font-weight="800">2. Chụp Tờ Khai Gửi Cán Bộ Xem Trước</text>
      <rect x="18" y="384" width="324" height="56" rx="14" fill="#FFFFFF" stroke="#00796B" stroke-width="2"/><text x="48" y="418" fill="#00796B" font-family="Be Vietnam Pro" font-size="15" font-weight="800">3. Mở Ví Phiếu Hẹn Mã QR (Offline)</text>
    </g>

    <!-- Frame 2: Screen/LegalRAG/AllStates (390x844) -->
    <g id="Screen/LegalRAG/AllStates_390x844" transform="translate(838, 128)">
      <rect width="390" height="844" rx="36" fill="#F8FAFC" stroke="#0F172A" stroke-width="6"/>
      <rect x="0" y="0" width="390" height="88" rx="30" fill="#00796B"/>
      <text x="24" y="38" fill="#99F6E4" font-family="Be Vietnam Pro" font-size="11" font-weight="700">2. Screen/LegalRAG (40 TTHC • TTS • θ=0.78)</text>
      <text x="24" y="64" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="16" font-weight="800">Trợ Lý Pháp Lý AI &amp; Tải Mẫu .DOCX/.PDF</text>

      <!-- State: Answering + TTS MỞ/TẮT + Download DOCX/PDF -->
      <rect x="16" y="104" width="358" height="250" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      <text x="30" y="130" fill="#00796B" font-family="JetBrains Mono" font-size="11" font-weight="700">[State: Answering] TTHC-CR-01 • S_max = 0.94 ≥ 0.78</text>
      <rect x="238" y="112" width="122" height="36" rx="10" fill="#FEF2F2" stroke="#FCA5A5"/><text x="248" y="135" fill="#DC2626" font-family="Be Vietnam Pro" font-size="11" font-weight="800">🔇 Đang đọc • TẮT</text>
      <text x="30" y="160" fill="#0F172A" font-family="Be Vietnam Pro" font-size="13" font-weight="800">Đăng ký thường trú (Mẫu CT01 - TT 66/2023/TT-BCA)</text>
      <text x="30" y="184" fill="#334155" font-family="Be Vietnam Pro" font-size="12">1. Hồ sơ: Tờ khai CT01 + Giấy tờ chỗ ở hợp pháp.</text>
      <text x="30" y="206" fill="#334155" font-family="Be Vietnam Pro" font-size="12">2. Thời hạn: 07 ngày làm việc • Lệ phí: Miễn phí NCT.</text>
      <rect x="30" y="290" width="160" height="48" rx="12" fill="#F8FAFC" stroke="#CBD5E1"/><text x="50" y="319" fill="#0F172A" font-family="Be Vietnam Pro" font-size="12" font-weight="800">📄 Tải Mẫu .DOCX</text>
      <rect x="200" y="290" width="160" height="48" rx="12" fill="#00796B"/><text x="224" y="319" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="12" font-weight="800">📥 Tải Mẫu .PDF</text>

      <!-- State: LowConfidence (θ < 0.78 Abstention Guardrail) -->
      <rect x="16" y="368" width="358" height="156" rx="16" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"/>
      <text x="30" y="394" fill="#92400E" font-family="Be Vietnam Pro" font-size="12" font-weight="800">[State: LowConfidence] Độ tin cậy S_max = 0.54 &lt; θ (0.78)</text>
      <text x="30" y="418" fill="#B45309" font-family="Be Vietnam Pro" font-size="11">Để tránh tư vấn sai quy định pháp luật, AI tạm dừng sinh câu trả lời tự do cho tình huống đặc thù này.</text>
      <rect x="30" y="462" width="330" height="48" rx="12" fill="#D97706"/><text x="58" y="491" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="12" font-weight="800">🙋 Chuyển Câu Hỏi Này Cho Cán Bộ Giải Đáp</text>

      <!-- State: NetworkError & Empty/Loading -->
      <rect x="16" y="538" width="358" height="120" rx="16" fill="#FEF2F2" stroke="#FCA5A5"/>
      <text x="30" y="564" fill="#991B1B" font-family="Be Vietnam Pro" font-size="12" font-weight="800">[State: NetworkError] Kết nối mạng yếu hoặc mất sóng</text>
      <text x="30" y="586" fill="#B91C1C" font-family="Be Vietnam Pro" font-size="11">Không gửi được câu hỏi mới. Bà con vẫn xem được 40 TTHC đã lưu sẵn:</text>
      <rect x="30" y="600" width="220" height="44" rx="10" fill="#FFFFFF" stroke="#DC2626"/><text x="48" y="627" fill="#DC2626" font-family="Be Vietnam Pro" font-size="11" font-weight="800">Mở Danh Mục 40 TTHC Ngoại Tuyến</text>
    </g>

    <!-- Frame 3: Screen/Precheck/AllStates (390x844) -->
    <g id="Screen/Precheck/AllStates_390x844" transform="translate(1252, 128)">
      <rect width="390" height="844" rx="36" fill="#F8FAFC" stroke="#0F172A" stroke-width="6"/>
      <rect x="0" y="0" width="390" height="88" rx="30" fill="#00796B"/>
      <text x="24" y="38" fill="#99F6E4" font-family="Be Vietnam Pro" font-size="11" font-weight="700">3. Screen/Precheck (AI Thị Giác 3 Tiêu Chí)</text>
      <text x="24" y="64" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="16" font-weight="800">Sơ Duyệt CT01 • TK-KS • TK-KH • TK-BTXH</text>

      <!-- State 3A: BlurryBlocked & WrongTemplateBlocked -->
      <rect x="16" y="104" width="358" height="164" rx="16" fill="#FEF2F2" stroke="#FCA5A5" stroke-width="1.5"/>
      <text x="30" y="130" fill="#991B1B" font-family="Be Vietnam Pro" font-size="12" font-weight="800">[States: Blurry / WrongTemplate] AI THỊ GIÁC CHẶN GỬI</text>
      <text x="30" y="152" fill="#B91C1C" font-family="Be Vietnam Pro" font-size="11">• TH1 (Ảnh mờ): Độ nét 22/100 (&lt; 45) → Yêu cầu giữ chắc tay chụp lại.</text>
      <text x="30" y="172" fill="#B91C1C" font-family="Be Vietnam Pro" font-size="11">• TH2 (Sai mẫu): Đang chọn CT01 nhưng chụp đơn Khai sinh (TK-KS).</text>
      <rect x="30" y="206" width="330" height="48" rx="12" fill="#94A3B8"/><text x="64" y="235" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="12" font-weight="800">🚫 Nút Gửi Đã Khóa — Bấm Chụp Lại Ảnh</text>

      <!-- State 3B: ValidPass + QR CCCD Auto-fill + Email Input -->
      <rect x="16" y="282" width="358" height="290" rx="16" fill="#FFFFFF" stroke="#00796B" stroke-width="2"/>
      <text x="30" y="308" fill="#065F46" font-family="Be Vietnam Pro" font-size="12" font-weight="800">[State: ValidPass] Đạt Chuẩn 96/100 • Khớp CT01 • 5/5 Mục</text>
      <text x="30" y="332" fill="#334155" font-family="Be Vietnam Pro" font-size="11">✓ Đã quét QR CCCD tự điền: NGUYỄN MINH TUẤN KHANH (089205023490)</text>
      <rect x="30" y="348" width="330" height="68" rx="12" fill="#F8FAFC" stroke="#CBD5E1"/>
      <text x="44" y="370" fill="#0F172A" font-family="Be Vietnam Pro" font-size="11" font-weight="800">✉️ Email nhận kết quả &amp; Mã QR (100% Miễn phí - Không SMS):</text>
      <text x="44" y="396" fill="#00796B" font-family="JetBrains Mono" font-size="12" font-weight="700">congdan.angiang@gmail.com</text>
      <rect x="30" y="430" width="330" height="48" rx="12" fill="#00796B"/><text x="72" y="459" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="13" font-weight="800">✨ Kiểm Tra &amp; Gửi Sơ Duyệt Cán Bộ</text>
      <text x="30" y="502" fill="#64748B" font-family="Be Vietnam Pro" font-size="11">🔒 Ảnh tờ khai được đóng dấu Watermark &amp; mã hóa AES-256-GCM.</text>

      <!-- State 3C: QrScanError & NoCameraPermission -->
      <rect x="16" y="586" width="358" height="120" rx="16" fill="#FFFBEB" stroke="#FDE68A"/>
      <text x="30" y="612" fill="#92400E" font-family="Be Vietnam Pro" font-size="12" font-weight="800">[States: QrScanError / NoCameraPermission]</text>
      <text x="30" y="634" fill="#B45309" font-family="Be Vietnam Pro" font-size="11">• Chưa cấp quyền máy ảnh → Hiện nút "Mở Cài Đặt Điện Thoại".</text>
      <text x="30" y="654" fill="#B45309" font-family="Be Vietnam Pro" font-size="11">• Mã QR CCCD bị chói sáng → Cho phép tải file .DOCX hoặc nhập tay.</text>
    </g>

    <!-- Frame 4: Screen/Incident/GPS_25m (390x844) -->
    <g id="Screen/Incident/GPS_25m_390x844" transform="translate(1666, 128)">
      <rect width="390" height="844" rx="36" fill="#F8FAFC" stroke="#0F172A" stroke-width="6"/>
      <rect x="0" y="0" width="390" height="88" rx="30" fill="#00796B"/>
      <text x="24" y="38" fill="#99F6E4" font-family="Be Vietnam Pro" font-size="11" font-weight="700">4. Screen/Incident (GPS R=25m &amp; Định Tuyến Xã)</text>
      <text x="24" y="64" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="16" font-weight="800">Báo Sự Cố Hiện Trường Liên Xã/Phường</text>

      <rect x="16" y="104" width="358" height="170" rx="16" fill="#E2E8F0" stroke="#CBD5E1"/>
      <circle cx="195" cy="189" r="56" fill="#00796B" fill-opacity="0.2" stroke="#00796B" stroke-width="2"/>
      <circle cx="195" cy="189" r="10" fill="#DC2626"/>
      <text x="30" y="258" fill="#0F172A" font-family="JetBrains Mono" font-size="11" font-weight="700">📍 R = 25m • Tự điền: Đường Nguyễn Huệ, P. Mỹ Bình</text>

      <rect x="16" y="290" width="358" height="90" rx="16" fill="#F0FDFA" stroke="#99F6E4"/>
      <text x="30" y="318" fill="#0F766E" font-family="Be Vietnam Pro" font-size="12" font-weight="800">🏛️ Tự động định tuyến về: UBND Phường Mỹ Bình</text>
      <text x="30" y="342" fill="#047857" font-family="Be Vietnam Pro" font-size="11">Gom cụm 2 pha (Redis GEO R=25m + pgvector τ=0.82)</text>

      <!-- States: WeakGps, OutOfBounds, NoLocationPermission -->
      <rect x="16" y="396" width="358" height="170" rx="16" fill="#FFFBEB" stroke="#FDE68A"/>
      <text x="30" y="424" fill="#92400E" font-family="Be Vietnam Pro" font-size="12" font-weight="800">[States: WeakGps / OutOfBounds / NoPermission]</text>
      <text x="30" y="448" fill="#B45309" font-family="Be Vietnam Pro" font-size="11">• GPS yếu (&gt;50m): Cho phép kéo ghim bản đồ hoặc sửa tay ô địa chỉ.</text>
      <text x="30" y="470" fill="#B45309" font-family="Be Vietnam Pro" font-size="11">• Ngoài địa bàn An Giang: Cảnh báo chỉ hỗ trợ 96 xã/phường An Giang.</text>
      <text x="30" y="492" fill="#B45309" font-family="Be Vietnam Pro" font-size="11">• Thiếu quyền vị trí: Mở hướng dẫn bật GPS hoặc nhập tên đường.</text>
    </g>

    <!-- Frame 5: Screen/Wallet/OfflineQrPass & Frame 6: Screen/Officer/QrAudit -->
    <g id="Screen/Wallet_And_Officer_390x844" transform="translate(2080, 128)">
      <rect width="480" height="844" rx="36" fill="#F8FAFC" stroke="#0F172A" stroke-width="6"/>
      <rect x="0" y="0" width="480" height="88" rx="30" fill="#0F172A"/>
      <text x="24" y="38" fill="#2DD4BF" font-family="Be Vietnam Pro" font-size="11" font-weight="700">5. Ví Mã Hẹn QR Offline &amp; 6. Chế Độ Cán Bộ Quét QR</text>
      <text x="24" y="64" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="16" font-weight="800">Đồng Bộ Khép Kín: Công Dân ↔ Cán Bộ Một Cửa</text>

      <!-- Offline Banner -->
      <rect x="16" y="102" width="448" height="48" rx="12" fill="#FFFBEB" stroke="#FDE68A"/>
      <text x="30" y="131" fill="#92400E" font-family="Be Vietnam Pro" font-size="12" font-weight="800">📡 [State: OfflineMode] Đang offline vẫn mở được Mã QR đã lưu</text>

      <!-- Active QR Pass -->
      <rect x="16" y="162" width="448" height="210" rx="16" fill="#FFFFFF" stroke="#00796B" stroke-width="2.5"/>
      <text x="32" y="190" fill="#00796B" font-family="Be Vietnam Pro" font-size="12" font-weight="800">PHIẾU HẸN SƠ DUYỆT ĐIỆN TỬ • LH-20261111-8899</text>
      <text x="32" y="214" fill="#0F172A" font-family="Be Vietnam Pro" font-size="13" font-weight="800">Công dân: NGUYỄN MINH TUẤN KHANH • Mẫu CT01</text>
      <text x="32" y="236" fill="#059669" font-family="Be Vietnam Pro" font-size="12" font-weight="700">Cán bộ duyệt: Trần Thị Hương (UBND Phường Mỹ Bình)</text>
      <rect x="32" y="310" width="416" height="48" rx="12" fill="#00796B"/><text x="110" y="339" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="13" font-weight="800">📥 Tải Phiếu Hẹn Có Mã QR (.pdf) Về Máy</text>

      <!-- State: Rejected/Supplement Required -->
      <rect x="16" y="386" width="448" height="110" rx="16" fill="#FEF2F2" stroke="#FCA5A5"/>
      <text x="32" y="412" fill="#991B1B" font-family="Be Vietnam Pro" font-size="12" font-weight="800">[State: RejectedSupplement] Hồ sơ cần bổ sung giấy tờ</text>
      <text x="32" y="436" fill="#B91C1C" font-family="Be Vietnam Pro" font-size="11">Lời dặn Cán bộ (qua Email): "Bà con chụp bổ sung trang 2 Sổ hộ nghèo."</text>
      <rect x="32" y="448" width="220" height="36" rx="8" fill="#DC2626"/><text x="50" y="471" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="11" font-weight="800">Chụp Bổ Sung &amp; Gửi Lại Ngay</text>

      <!-- Officer Mode: Counter QR Scanner & 1-Tap Approval -->
      <rect x="16" y="510" width="448" height="290" rx="16" fill="#0F172A" stroke="#2DD4BF" stroke-width="2"/>
      <text x="32" y="540" fill="#2DD4BF" font-family="Be Vietnam Pro" font-size="13" font-weight="800">🏛️ [Screen/Officer/QrAudit] Chế Độ Cán Bộ Một Cửa (CC-AG-8942)</text>
      <text x="32" y="566" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="12">1. Camera quét Mã QR Phiếu hẹn của dân: LH-20261111-8899</text>
      <text x="32" y="590" fill="#6EE7B7" font-family="JetBrains Mono" font-size="12" font-weight="700">2. Nhãn kiểm định: AI GATE PASS (96/100 • Khớp mẫu CT01)</text>
      <text x="32" y="614" fill="#CBD5E1" font-family="Be Vietnam Pro" font-size="12">3. Xem ảnh đính kèm có đóng dấu Watermark 1 lần (Redis GETDEL)</text>
      <rect x="32" y="726" width="416" height="52" rx="12" fill="#00796B"/><text x="90" y="757" fill="#FFFFFF" font-family="Be Vietnam Pro" font-size="13" font-weight="800">✓ Duyệt Hợp Lệ &amp; Gửi Email + Mã QR</text>
    </g>

    <!-- ROW 2: 04 PROTOTYPE FLOWS & 05 REACT NATIVE HANDOFF -->
    <g id="Page/04_Flows_And_05_Handoff" transform="translate(40, 1010)">
      <rect width="2520" height="760" rx="24" fill="#FFFFFF" stroke="#00796B" stroke-width="2"/>
      <text x="40" y="52" fill="#0F172A" font-family="Be Vietnam Pro" font-size="22" font-weight="800">04 PROTOTYPE FLOWS (3 KỊCH BẢN ĐỒNG BỘ SMART ANIMATE) &amp; 05 HANDOFF REACT NATIVE (EXPO)</text>

      <!-- Flow 1 -->
      <rect x="40" y="80" width="780" height="280" rx="18" fill="#F0FDFA" stroke="#00796B" stroke-width="2"/>
      <text x="64" y="118" fill="#00796B" font-family="Be Vietnam Pro" font-size="17" font-weight="800">Kịch Bản Flow 1: Nộp Trên Điện Thoại → AI Thị Giác Duyệt → Nhận Phiếu Hẹn Mã QR</text>
      <text x="64" y="152" fill="#0F172A" font-family="Be Vietnam Pro" font-size="14">B1: Screen/Home/Default → Chọn "Sơ Duyệt Đơn" (Smart Animate 300ms).</text>
      <text x="64" y="182" fill="#0F172A" font-family="Be Vietnam Pro" font-size="14">B2: Quét QR CCCD tự điền + Chụp ảnh CT01 → Qua Chốt chặn AI Thị Giác (96/100 ≥ 45).</text>
      <text x="64" y="212" fill="#0F172A" font-family="Be Vietnam Pro" font-size="14">B3: Nhập Email miễn phí → Bấm "Kiểm Tra &amp; Gửi Sơ Duyệt" (POST /api/v1/dossiers).</text>
      <text x="64" y="242" fill="#065F46" font-family="Be Vietnam Pro" font-size="14" font-weight="700">B4: Cán bộ duyệt → Tự động mở Screen/Wallet/ActiveQrPass (Mã LH-20261111-8899).</text>

      <!-- Flow 2 -->
      <rect x="860" y="80" width="780" height="280" rx="18" fill="#ECFDF5" stroke="#059669" stroke-width="2"/>
      <text x="884" y="118" fill="#065F46" font-family="Be Vietnam Pro" font-size="17" font-weight="800">Kịch Bản Flow 2: Điền Trên Web Ở Nhà → Ra UBND Xã Mở App Lấy Mã QR Offline</text>
      <text x="884" y="152" fill="#0F172A" font-family="Be Vietnam Pro" font-size="14">B1: Công dân nộp tờ khai trên Web PC tại nhà → Nhận mã HS-20261111-BENNGHE-0001.</text>
      <text x="884" y="182" fill="#0F172A" font-family="Be Vietnam Pro" font-size="14">B2: Mở Mobile App → Vào tab "Ví Mã QR" → Nhập Mã hồ sơ + 4 số cuối CCCD (3490).</text>
      <text x="884" y="212" fill="#0F172A" font-family="Be Vietnam Pro" font-size="14">B3: App gọi GET /api/v1/dossiers/track và lưu Phiếu hẹn QR vào bộ nhớ Offline.</text>
      <text x="884" y="242" fill="#065F46" font-family="Be Vietnam Pro" font-size="14" font-weight="700">B4: Đến UBND xã (kể cả khi mất 4G) vẫn mở được Mã QR &amp; file .PDF để quét tại quầy.</text>

      <!-- Flow 3 -->
      <rect x="1680" y="80" width="800" height="280" rx="18" fill="#EFF6FF" stroke="#2563EB" stroke-width="2"/>
      <text x="1704" y="118" fill="#1E40AF" font-family="Be Vietnam Pro" font-size="17" font-weight="800">Kịch Bản Flow 3: Cán Bộ Một Cửa Dùng Điện Thoại Quét Mã QR Của Dân Tại Quầy</text>
      <text x="1704" y="152" fill="#0F172A" font-family="Be Vietnam Pro" font-size="14">B1: Cán bộ đăng nhập thẻ công chức CC-AG-8942 → Mở tab "Bàn Cán Bộ".</text>
      <text x="1704" y="182" fill="#0F172A" font-family="Be Vietnam Pro" font-size="14">B2: Đưa camera quét mã QR LH-20261111-8899 trên điện thoại của người dân.</text>
      <text x="1704" y="212" fill="#0F172A" font-family="Be Vietnam Pro" font-size="14">B3: Slide-up Bottom Sheet hiện ngay hồ sơ + nhãn AI GATE PASS + ảnh Watermark OTT.</text>
      <text x="1704" y="242" fill="#1E40AF" font-family="Be Vietnam Pro" font-size="14" font-weight="700">B4: Đối chiếu CCCD gốc trong 3 giây → Bấm "Duyệt Hợp Lệ &amp; Gửi Email + Mã QR".</text>

      <!-- Handoff Spec Table -->
      <rect x="40" y="390" width="2440" height="330" rx="18" fill="#0F172A"/>
      <text x="72" y="436" fill="#2DD4BF" font-family="Be Vietnam Pro" font-size="18" font-weight="800">05 DEVELOPER HANDOFF CHECKLIST (REACT NATIVE EXPO SDK 52 + TYPESCRIPT)</text>
      <text x="72" y="476" fill="#FFFFFF" font-family="JetBrains Mono" font-size="14">• Spacing Grid: 4px/8px (space/1=4, space/2=8, space/3=12, space/4=16, space/6=24) | Card Radius: 16px (radius/lg) | Button Height: min 48px</text>
      <text x="72" y="512" fill="#FFFFFF" font-family="JetBrains Mono" font-size="14">• Animations: React Native Reanimated Spring (stiffness: 120, damping: 22) cho Bottom Sheet &amp; Chuyển tab Smart Animate</text>
      <text x="72" y="548" fill="#FFFFFF" font-family="JetBrains Mono" font-size="14">• Native SDK Mapping: expo-camera (QR CCCD 60fps), expo-location (BestForNavigation R=25m), expo-speech (vi-VN MỞ/TẮT), expo-sharing (.docx/.pdf)</text>
      <text x="72" y="584" fill="#6EE7B7" font-family="JetBrains Mono" font-size="14">• Token File: mobile/design-tokens.json | Spec File: SMARTWARD_UNIFIED_AGENT_AND_MOBILE_SPEC.md | Stitch Spec: mobile/DESIGN.md</text>
    </g>
  </g>
</svg>`;

fs.writeFileSync(path.join(outDir, '00_Cover_And_Notes.svg'), svg00, 'utf8');
fs.writeFileSync(path.join(outDir, '01_Design_System_And_02_Components.svg'), svg01_02, 'utf8');
fs.writeFileSync(path.join(outDir, '03_Screens_And_04_Prototype_Flows.svg'), svg03_04, 'utf8');
console.log('Generated all 3 comprehensive editable SVG vector boards successfully.');
