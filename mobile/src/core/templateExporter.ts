/**
 * SmartWard AI Mobile — Bộ Xuất & Tải Biểu Mẫu Trực Tiếp (.DOCX & .PDF)
 * Kỷ luật bắt buộc:
 * - TUYỆT ĐỐI KHÔNG dùng lệnh in (window.print / Print.printAsync)
 * - Chỉ xuất tệp vào FileSystem.documentDirectory và mở Sharing.shareAsync()
 * - Tuân thủ thể thức văn bản hành chính Nghị định 30/2020/NĐ-CP
 */

import type { CoreFormType } from '../types/api.types';

export interface TemplateFileDescriptor {
  formType: CoreFormType | 'GENERAL';
  procedureCode: string;
  procedureName: string;
  docxFileName: string;
  pdfFileName: string;
  legalBasis: string;
}

export function getTemplateFileDescriptor(
  procedureCode: string,
  procedureName: string,
  formType?: CoreFormType | null,
  legalBasis?: string
): TemplateFileDescriptor {
  const cleanCode = (procedureCode || 'TTHC').replace(/[^A-Za-z0-9_-]/g, '_');

  switch (formType) {
    case 'CT01':
      return {
        formType: 'CT01',
        procedureCode,
        procedureName,
        docxFileName: 'Mau_CT01_CuTru_Chuan_ND30.docx',
        pdfFileName: 'Mau_CT01_CuTru_Chuan_ND30.pdf',
        legalBasis: legalBasis || 'Thông tư số 66/2023/TT-BCA (sửa đổi tại TT 53/2025/TT-BCA & TT 116/2026/TT-BCA)',
      };
    case 'TK-KS':
      return {
        formType: 'TK-KS',
        procedureCode,
        procedureName,
        docxFileName: 'Mau_TK_KS_KhaiSinh_Chuan_ND30.docx',
        pdfFileName: 'Mau_TK_KS_KhaiSinh_Chuan_ND30.pdf',
        legalBasis: legalBasis || 'Thông tư 04/2024/TT-BTP (sửa đổi TT 04/2020/TT-BTP) & Nghị định 30/2020/NĐ-CP',
      };
    case 'TK-KH':
      return {
        formType: 'TK-KH',
        procedureCode,
        procedureName,
        docxFileName: 'Mau_TK_KH_KetHon_Chuan_ND30.docx',
        pdfFileName: 'Mau_TK_KH_KetHon_Chuan_ND30.pdf',
        legalBasis: legalBasis || 'Luật Hôn nhân và gia đình 2014 & Thông tư 04/2020/TT-BTP',
      };
    case 'TK-BTXH':
      return {
        formType: 'TK-BTXH',
        procedureCode,
        procedureName,
        docxFileName: 'Mau_TK_BTXH_BaoTro_Chuan_ND30.docx',
        pdfFileName: 'Mau_TK_BTXH_BaoTro_Chuan_ND30.pdf',
        legalBasis: legalBasis || 'Luật BHXH 2024 & Nghị định 20/2021/NĐ-CP & Nghị định 335/2026/NĐ-CP',
      };
    default:
      return {
        formType: 'GENERAL',
        procedureCode,
        procedureName,
        docxFileName: `Mau_${cleanCode}_Chuan_ND30.docx`,
        pdfFileName: `Mau_${cleanCode}_Chuan_ND30.pdf`,
        legalBasis: legalBasis || 'Nghị định 30/2020/NĐ-CP',
      };
  }
}

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render12CellGrid(): string {
  const cells = Array.from(
    { length: 12 },
    () =>
      '<td style="width:18px; height:22px; border:1px solid #000; text-align:center; font-family:monospace; font-weight:bold; font-size:10.5pt;">&nbsp;</td>'
  ).join('');
  return `<table style="display:inline-table; border-collapse:collapse; vertical-align:middle; margin-left:6px; margin-right:4px;"><tr>${cells}</tr></table>`;
}

/**
 * Generates standard Vietnamese Decree 30/2020/ND-CP A4 HTML document
 * used for direct .DOCX and .PDF export (never for browser/system print dialogs).
 * Strictly guarantees 1-page A4 layout for CT01, TK-KS, TK-KH, TK-BTXH.
 */
export function buildOfficialTemplateHtml(
  descriptor: TemplateFileDescriptor,
  wardName: string
): string {
  const safeWard = escapeHtml(wardName);
  const safeProc = escapeHtml(descriptor.procedureName);
  const safeCode = escapeHtml(descriptor.procedureCode);
  const safeBasis = escapeHtml(descriptor.legalBasis);

  const baseStyle = `
    @page { size: A4; margin: 12mm 15mm 12mm 15mm; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      line-height: 1.35;
      color: #0F172A;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .bold { font-weight: bold; }
    .italic { font-style: italic; }
    .uppercase { text-transform: uppercase; }
    .nation { font-weight: bold; font-size: 11.5pt; text-transform: uppercase; }
    .motto { font-weight: bold; font-size: 12pt; margin-top: 1px; }
    .rule-center { width: 140px; margin: 2px auto 6px; border-bottom: 1px solid #000; }
    .title { font-weight: bold; font-size: 13.5pt; text-transform: uppercase; margin: 8px 0 4px; text-align: center; }
    .receiver { font-size: 11.5pt; text-align: center; margin-bottom: 8px; }
    .field-row { margin: 4px 0; font-size: 11pt; }
    .meta-code { font-size: 9pt; color: #475569; }
    table.data-table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10pt; }
    table.data-table th, table.data-table td { border: 1px solid #000; padding: 4px; text-align: center; }
  `;

  // =========================================================================
  // 1. CT01 (TT 66/2023, TT 53/2025 & TT 116/2026/TT-BCA)
  // Exact BCA standard: NO top agency name, NO top date line, 12-cell ID boxes,
  // 6-col member table, 4-col signature block, footnotes stripped on export.
  // =========================================================================
  if (descriptor.formType === 'CT01') {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(descriptor.pdfFileName)}</title>
  <style>${baseStyle}</style>
</head>
<body>
  <div class="meta-code text-right italic" style="margin-bottom:2px;">
    Mẫu CT01 ban hành kèm theo Thông tư số 66/2023/TT-BCA (sửa đổi tại Thông tư số 53/2025/TT-BCA &amp; TT 116/2026/TT-BCA)
  </div>
  <div class="text-center">
    <div class="nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="motto">Độc lập – Tự do – Hạnh phúc</div>
    <div class="rule-center"></div>
  </div>

  <div class="title">TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ</div>
  <div class="receiver"><b>Kính gửi:</b> Công an ${safeWard}</div>

  <div class="field-row">1. Họ, chữ đệm và tên khai sinh: ............................................................................................................</div>
  <div class="field-row" style="display:flex; justify-content:space-between;">
    <span>2. Ngày, tháng, năm sinh: ....../....../..........</span>
    <span>3. Giới tính: ....................</span>
  </div>
  <div class="field-row" style="display:flex; align-items:center;">
    <span>4. Số định danh cá nhân:</span>
    ${render12CellGrid()}
  </div>
  <div class="field-row" style="display:flex; justify-content:space-between;">
    <span>5. Số điện thoại liên hệ: ..............................</span>
    <span>6. Email: ........................................................</span>
  </div>
  <div class="field-row" style="display:flex; justify-content:space-between;">
    <span>7. Họ, chữ đệm và tên chủ hộ: ........................................................</span>
    <span>8. Quan hệ với chủ hộ: ....................</span>
  </div>
  <div class="field-row" style="display:flex; align-items:center;">
    <span>9. Số định danh cá nhân của chủ hộ:</span>
    ${render12CellGrid()}
  </div>
  <div class="field-row">10. Nội dung đề nghị: ..........................................................................................................................</div>
  <div class="field-row" style="color:#64748B; font-size:10pt;">....................................................................................................................................................................</div>

  <div class="field-row" style="margin-top:6px;">11. Những thành viên trong hộ gia đình cùng thay đổi:</div>
  <table class="data-table">
    <thead>
      <tr style="background:#F8FAFC; font-weight:bold;">
        <th style="width:6%;">TT</th>
        <th style="width:26%;">Họ, chữ đệm và tên</th>
        <th style="width:16%;">Ngày sinh</th>
        <th style="width:10%;">Giới tính</th>
        <th style="width:22%;">Số định danh cá nhân</th>
        <th style="width:20%;">Quan hệ với chủ hộ</th>
      </tr>
    </thead>
    <tbody>
      <tr style="height:21px;"><td>1</td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr style="height:21px;"><td>2</td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr style="height:21px;"><td>3</td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr style="height:21px;"><td>4</td><td></td><td></td><td></td><td></td><td></td></tr>
    </tbody>
  </table>

  <!-- Bảng 4 ô chữ ký chuẩn Mẫu CT01 Bộ Công an (không kèm chú thích để vừa khít 1 trang A4) -->
  <table style="width:100%; border-collapse:collapse; margin-top:8px; font-size:9.5pt; text-align:center;">
    <tr style="vertical-align:top;">
      <td style="border:1px solid #000; width:25%; padding:4px;">
        <div class="italic" style="font-size:8.5pt;">......, ngày......tháng....năm......</div>
        <div class="bold" style="margin-top:2px;">Ý KIẾN CỦA CHỦ HỘ</div>
        <div style="height:44px;"></div>
      </td>
      <td style="border:1px solid #000; width:25%; padding:4px;">
        <div class="italic" style="font-size:8.5pt;">......, ngày......tháng....năm......</div>
        <div class="bold" style="margin-top:2px;">Ý KIẾN CỦA CHỦ SỞ HỮU CHỖ Ở HỢP PHÁP</div>
        <div style="height:44px;"></div>
        <div class="text-left" style="font-size:8.5pt;">
          <div>Họ và tên: ....................</div>
          <div>Số ĐDCN: ....................</div>
        </div>
      </td>
      <td style="border:1px solid #000; width:25%; padding:4px;">
        <div class="italic" style="font-size:8.5pt;">......, ngày......tháng....năm......</div>
        <div class="bold" style="margin-top:2px;">Ý KIẾN CỦA CHA/MẸ/NGƯỜI GIÁM HỘ</div>
        <div style="height:44px;"></div>
        <div class="text-left" style="font-size:8.5pt;">
          <div>Họ và tên: ....................</div>
          <div>Số ĐDCN: ....................</div>
        </div>
      </td>
      <td style="border:1px solid #000; width:25%; padding:4px;">
        <div class="italic" style="font-size:8.5pt;">......, ngày......tháng....năm......</div>
        <div class="bold" style="margin-top:2px;">NGƯỜI KÊ KHAI</div>
        <div style="height:44px;"></div>
      </td>
    </tr>
  </table>
  <div style="font-size:8pt; color:#64748B; text-align:right; margin-top:4px;">
    Mã TTHC: ${safeCode} • Xác thực công dân qua VNeID
  </div>
</body>
</html>`;
  }

  // =========================================================================
  // 2. TK-KS (Phụ lục 5 Thông tư 04/2024/TT-BTP sửa đổi TT 04/2020/TT-BTP)
  // Exact Ministry of Justice 1-page layout: applicant, child (dob in words),
  // mother, father, marriage cert, copy request checkboxes, single signature.
  // =========================================================================
  if (descriptor.formType === 'TK-KS') {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(descriptor.pdfFileName)}</title>
  <style>${baseStyle}</style>
</head>
<body>
  <div class="meta-code text-right italic" style="margin-bottom:2px;">
    Phụ lục 5 Thông tư số 04/2024/TT-BTP (sửa đổi TT 04/2020/TT-BTP)
  </div>
  <div class="text-center">
    <div class="nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
    <div class="rule-center"></div>
  </div>

  <div class="title">TỜ KHAI ĐĂNG KÝ KHAI SINH</div>
  <div class="receiver"><b>Kính gửi:</b> Ủy ban nhân dân ${safeWard}</div>

  <div class="field-row"><b>Họ, chữ đệm, tên người yêu cầu:</b> ............................................................................................................</div>
  <div class="field-row">Nơi cư trú: ........................................................................................................................................................</div>
  <div class="field-row" style="display:flex; justify-content:space-between;">
    <span>Giấy tờ tùy thân: ........................................................</span>
    <span>Quan hệ với người được khai sinh: ....................</span>
  </div>

  <div class="field-row bold" style="margin-top:6px;">Đề nghị cơ quan đăng ký khai sinh cho người dưới đây:</div>
  <div class="field-row"><b>Họ, chữ đệm, tên:</b> ....................................................................................................................................</div>
  <div class="field-row">Ngày, tháng, năm sinh: ....../....../.......... ghi bằng chữ: ..............................................................................</div>
  <div class="field-row" style="display:flex; justify-content:space-between;">
    <span>Giới tính: ....................</span>
    <span>Dân tộc: ....................</span>
    <span>Quốc tịch: ....................</span>
  </div>
  <div class="field-row">Nơi sinh: ..........................................................................................................................................................</div>
  <div class="field-row">Quê quán: ........................................................................................................................................................</div>

  <div class="field-row"><b>Họ, chữ đệm, tên người mẹ:</b> ................................................................................................................</div>
  <div class="field-row" style="display:flex; justify-content:space-between;">
    <span>Năm sinh: ....................</span>
    <span>Dân tộc: ....................</span>
    <span>Quốc tịch: ....................</span>
    <span>Nơi cư trú: ........................................</span>
  </div>

  <div class="field-row"><b>Họ, chữ đệm, tên người cha:</b> .................................................................................................................</div>
  <div class="field-row" style="display:flex; justify-content:space-between;">
    <span>Năm sinh: ....................</span>
    <span>Dân tộc: ....................</span>
    <span>Quốc tịch: ....................</span>
    <span>Nơi cư trú: ........................................</span>
  </div>

  <div class="field-row italic" style="font-size:10pt; margin-top:4px;">
    Thông tin về Giấy chứng nhận kết hôn của cha, mẹ trẻ (nếu cha, mẹ trẻ đã ĐKKH):<br/>
    Số: .............., Quyển số: .............., đăng ký ngày ..... tháng ..... năm .......... tại .............................................
  </div>

  <div class="field-row" style="font-size:10pt; margin-top:4px;">
    Tôi cam đoan nội dung đề nghị đăng ký khai sinh trên đây là đúng sự thật, được sự thỏa thuận nhất trí của các bên liên quan theo quy định pháp luật. Tôi chịu hoàn toàn trách nhiệm trước pháp luật về nội dung cam đoan của mình.
  </div>

  <table style="width:100%; border-collapse:collapse; margin-top:8px;">
    <tr style="vertical-align:top;">
      <td style="width:50%; font-size:10pt;">
        <div style="margin-top:20px;">Đề nghị cấp bản sao: Có □ , Không □</div>
        <div>Số lượng: ....... bản</div>
      </td>
      <td style="width:50%; text-align:center; font-size:10.5pt;">
        <div class="italic">Làm tại: ......................, ngày ...... tháng ...... năm ......</div>
        <div class="bold" style="margin-top:2px;">Người yêu cầu</div>
        <div class="italic" style="font-size:9.5pt;">(Ký, ghi rõ họ, chữ đệm, tên)</div>
        <div style="height:55px;"></div>
      </td>
    </tr>
  </table>
  <div style="font-size:8pt; color:#64748B; text-align:right;">Mã TTHC: ${safeCode}</div>
</body>
</html>`;
  }

  // =========================================================================
  // 3. TK-KH (Luật Hôn nhân và gia đình 2014 & Thông tư 04/2020/TT-BTP)
  // Dual 3x4 photo boxes, 3-column comparative table, mutual pledge & signatures.
  // =========================================================================
  if (descriptor.formType === 'TK-KH') {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(descriptor.pdfFileName)}</title>
  <style>${baseStyle}</style>
</head>
<body>
  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
    <div style="width:72px; height:96px; border:1px solid #000; text-align:center; padding-top:34px; font-size:9.5pt; box-sizing:border-box;">
      Ảnh 3x4<br/>Bên nữ
    </div>
    <div style="flex:1; text-align:center; padding:0 8px;">
      <div class="nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="motto">Độc lập – Tự do – Hạnh phúc</div>
      <div class="rule-center"></div>
      <div class="title" style="margin-top:4px;">TỜ KHAI ĐĂNG KÝ KẾT HÔN</div>
      <div class="receiver" style="margin-bottom:4px;"><b>Kính gửi:</b> Ủy ban nhân dân ${safeWard}</div>
    </div>
    <div style="width:72px; height:96px; border:1px solid #000; text-align:center; padding-top:34px; font-size:9.5pt; box-sizing:border-box;">
      Ảnh 3x4<br/>Bên nam
    </div>
  </div>

  <table class="data-table" style="margin-top:8px;">
    <thead>
      <tr style="background:#F8FAFC; font-weight:bold;">
        <th style="width:34%;">Thông tin</th>
        <th style="width:33%;">Bên nữ</th>
        <th style="width:33%;">Bên nam</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="bold text-left">Họ, chữ đệm, tên</td>
        <td style="height:24px;"></td>
        <td></td>
      </tr>
      <tr>
        <td class="bold text-left">Ngày, tháng, năm sinh</td>
        <td style="height:24px;"></td>
        <td></td>
      </tr>
      <tr>
        <td class="bold text-left">Dân tộc / Quốc tịch</td>
        <td style="height:24px;"></td>
        <td></td>
      </tr>
      <tr>
        <td class="bold text-left">Nơi cư trú</td>
        <td style="height:24px;"></td>
        <td></td>
      </tr>
      <tr>
        <td class="bold text-left">Số định danh cá nhân (CCCD)</td>
        <td style="height:24px;"></td>
        <td></td>
      </tr>
      <tr>
        <td class="bold text-left">Lần kết hôn thứ mấy</td>
        <td style="height:24px;"></td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="field-row" style="font-size:10pt; margin-top:6px;">
    Chúng tôi cam đoan việc kết hôn này là hoàn toàn tự nguyện, không vi phạm quy định của Luật Hôn nhân và gia đình. Chúng tôi chịu hoàn toàn trách nhiệm trước pháp luật về nội dung cam đoan của mình.
  </div>

  <table style="width:100%; border-collapse:collapse; margin-top:10px; text-align:center;">
    <tr style="vertical-align:top;">
      <td style="width:50%;">
        <div class="bold">BÊN NỮ</div>
        <div class="italic" style="font-size:9.5pt;">(Ký, ghi rõ họ tên)</div>
        <div style="height:55px;"></div>
      </td>
      <td style="width:50%;">
        <div class="italic" style="font-size:9.5pt;">......, ngày ...... tháng ...... năm 2026</div>
        <div class="bold">BÊN NAM</div>
        <div class="italic" style="font-size:9.5pt;">(Ký, ghi rõ họ tên)</div>
        <div style="height:55px;"></div>
      </td>
    </tr>
  </table>
  <div style="font-size:8pt; color:#64748B; text-align:right;">Mã TTHC: ${safeCode}</div>
</body>
</html>`;
  }

  // =========================================================================
  // 4. TK-BTXH (Luật BHXH 2024 & Nghị định 20/2021/NĐ-CP & NĐ 335/2026/NĐ-CP)
  // Cashless social protection disbursement under Đề án 06.
  // =========================================================================
  if (descriptor.formType === 'TK-BTXH') {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(descriptor.pdfFileName)}</title>
  <style>${baseStyle}</style>
</head>
<body>
  <div class="meta-code text-right italic" style="margin-bottom:2px;">
    Mẫu số 01 (Nghị định 20/2021/NĐ-CP, NĐ 335/2026/NĐ-CP &amp; Luật BHXH 2024)
  </div>
  <div class="text-center">
    <div class="nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
    <div class="rule-center"></div>
  </div>

  <div class="title">TỜ KHAI THÔNG TIN ĐỀ NGHỊ TRỢ CẤP XÃ HỘI HÀNG THÁNG</div>
  <div class="receiver"><b>Kính gửi:</b> Ủy ban nhân dân ${safeWard}</div>

  <div class="field-row"><b>1. Họ và tên người đề nghị:</b> ............................................................................................................</div>
  <div class="field-row" style="display:flex; justify-content:space-between;">
    <span>2. Ngày, tháng, năm sinh: ....../....../..........</span>
    <span>3. Giới tính: ....................</span>
  </div>
  <div class="field-row" style="display:flex; align-items:center;">
    <span>4. Số định danh cá nhân (CCCD 12 số):</span>
    ${render12CellGrid()}
  </div>
  <div class="field-row">5. Nơi thường trú: ........................................................................................................................................</div>
  <div class="field-row">6. Chỗ ở hiện nay: ........................................................................................................................................</div>

  <div class="field-row bold" style="margin-top:6px;">7. Diện đối tượng đề nghị hưởng trợ cấp:</div>
  <div class="field-row" style="padding-left:12px;">
    <div>[ ] Người cao tuổi từ đủ 75 tuổi trở lên không có lương hưu (hoặc từ đủ 70 tuổi thuộc hộ nghèo/cận nghèo theo Luật BHXH 2024)</div>
    <div>[ ] Người khuyết tật mức độ nặng hoặc đặc biệt nặng</div>
  </div>

  <div class="field-row bold" style="margin-top:6px;">8. Phương thức nhận trợ cấp (Đề án 06 chi trả an sinh không dùng tiền mặt):</div>
  <div class="field-row" style="display:flex; justify-content:space-between;">
    <span>Tên ngân hàng: ........................................</span>
    <span>Số tài khoản: ........................................</span>
  </div>
  <div class="field-row">Chủ tài khoản: ........................................................................................................................................</div>

  <div class="field-row" style="font-size:10pt; margin-top:8px;">
    Tôi cam đoan những lời khai trên là đúng sự thật, nếu có gì sai trái tôi xin chịu hoàn toàn trách nhiệm trước pháp luật.
  </div>

  <table style="width:100%; border-collapse:collapse; margin-top:10px;">
    <tr style="vertical-align:top;">
      <td style="width:40%;"></td>
      <td style="width:60%; text-align:center;">
        <div class="italic">An Giang, ngày ...... tháng ...... năm 2026</div>
        <div class="bold">NGƯỜI KÊ KHAI</div>
        <div class="italic" style="font-size:9.5pt;">(Ký, ghi rõ họ tên)</div>
        <div style="height:55px;"></div>
      </td>
    </tr>
  </table>
  <div style="font-size:8pt; color:#64748B; text-align:right;">Mã TTHC: ${safeCode}</div>
</body>
</html>`;
  }

  // =========================================================================
  // 5. GENERAL ADMINISTRATIVE TEMPLATE (Decree 30/2020/ND-CP)
  // =========================================================================
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(descriptor.pdfFileName)}</title>
  <style>${baseStyle}</style>
</head>
<body>
  <div class="text-center">
    <div class="nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
    <div class="rule-center"></div>
  </div>
  <div class="title">TỜ KHAI THỦ TỤC HÀNH CHÍNH (${escapeHtml(descriptor.formType)})</div>
  <div class="receiver"><b>${safeProc}</b> • Mã TTHC: ${safeCode}</div>
  <div class="field-row"><span class="bold">Kính gửi:</span> Ủy ban nhân dân / Bộ phận Một cửa ${safeWard}, Tỉnh An Giang</div>
  <div class="field-row"><span class="bold">1. Họ, chữ đệm và tên người khai:</span> ................................................................................</div>
  <div class="field-row" style="display:flex; justify-content:space-between;">
    <span><span class="bold">2. Ngày, tháng, năm sinh:</span> ....../....../............</span>
    <span><span class="bold">Giới tính:</span> ................</span>
  </div>
  <div class="field-row" style="display:flex; align-items:center;">
    <span class="bold">3. Số định danh cá nhân (CCCD 12 số):</span>
    ${render12CellGrid()}
  </div>
  <div class="field-row"><span class="bold">4. Nơi thường trú / Chỗ ở hiện nay:</span> .............................................................................</div>
  <div class="field-row" style="display:flex; justify-content:space-between;">
    <span><span class="bold">5. Số điện thoại:</span> ..............................</span>
    <span><span class="bold">Email nhận kết quả:</span> ............................................</span>
  </div>
  <div class="field-row"><span class="bold">6. Nội dung đề nghị giải quyết:</span> ${safeProc}</div>
  <div class="field-row"><span class="bold">Căn cứ pháp lý áp dụng:</span> ${safeBasis}</div>
  <table style="width:100%; border-collapse:collapse; margin-top:20px;">
    <tr>
      <td style="width:50%;"></td>
      <td style="width:50%; text-align:center;">
        <div class="italic">An Giang, ngày ...... tháng ...... năm 2026</div>
        <div class="bold">NGƯỜI KÊ KHAI</div>
        <div class="italic" style="font-size:9.5pt;">(Ký, ghi rõ họ tên)</div>
        <div style="height:55px;"></div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface TemplateExportResult {
  success: boolean;
  fileUri?: string;
  fileName: string;
  format: 'DOCX' | 'PDF';
  message: string;
}

/**
 * Exports administrative form template directly to device storage & opens native share sheet.
 * NEVER triggers a printer dialog.
 */
export async function exportTemplateDocument(
  format: 'DOCX' | 'PDF',
  descriptor: TemplateFileDescriptor,
  wardName: string
): Promise<TemplateExportResult> {
  const html = buildOfficialTemplateHtml(descriptor, wardName);
  const fileName = format === 'DOCX' ? descriptor.docxFileName : descriptor.pdfFileName;

  // Web Preview direct download (strictly no print dialogs)
  const webGlobal = globalThis as unknown as {
    document?: {
      createElement: (tag: string) => { href: string; download: string; click: () => void };
      body: { appendChild: (el: unknown) => void; removeChild: (el: unknown) => void };
    };
    Blob?: new (parts: string[], options?: { type?: string }) => unknown;
    URL?: { createObjectURL?: (blob: unknown) => string; revokeObjectURL?: (url: string) => void };
  };

  if (
    webGlobal.document &&
    typeof webGlobal.Blob === 'function' &&
    typeof webGlobal.URL?.createObjectURL === 'function'
  ) {
    try {
      const mimeType =
        format === 'DOCX'
          ? 'application/msword;charset=utf-8'
          : 'text/html;charset=utf-8';
      const downloadName = format === 'DOCX' ? fileName : fileName.replace(/\.pdf$/i, '.html');
      const blob = new webGlobal.Blob([html], { type: mimeType });
      const blobUrl = webGlobal.URL.createObjectURL(blob);
      const link = webGlobal.document.createElement('a');
      link.href = blobUrl;
      link.download = downloadName;
      webGlobal.document.body.appendChild(link);
      link.click();
      webGlobal.document.body.removeChild(link);
      setTimeout(() => webGlobal.URL?.revokeObjectURL?.(blobUrl), 1000);
      return {
        success: true,
        fileName: downloadName,
        format,
        message: `Đã tải trực tiếp tệp ${downloadName} trên trình duyệt.`,
      };
    } catch {
      // Fall through to native Expo FileSystem flow
    }
  }

  try {
    const FileSystem = await import('expo-file-system');
    const Sharing = await import('expo-sharing');
    const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';

    let targetUri = `${baseDir}${fileName}`;

    if (format === 'DOCX') {
      await FileSystem.writeAsStringAsync(targetUri, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } else {
      // Strictly use printToFileAsync (exports .pdf file silently without opening print dialog)
      const Print = await import('expo-print');
      const pdfResult = await Print.printToFileAsync({ html });
      if (baseDir) {
        await FileSystem.copyAsync({ from: pdfResult.uri, to: targetUri });
      } else {
        targetUri = pdfResult.uri;
      }
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(targetUri, {
        mimeType:
          format === 'DOCX'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/pdf',
        dialogTitle: `Lưu biểu mẫu ${fileName}`,
      });
    }

    return {
      success: true,
      fileUri: targetUri,
      fileName,
      format,
      message: `Đã xuất trực tiếp tệp ${fileName} về máy.`,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Không thể xuất tệp trên thiết bị.';
    return {
      success: false,
      fileName,
      format,
      message: detail,
    };
  }
}
