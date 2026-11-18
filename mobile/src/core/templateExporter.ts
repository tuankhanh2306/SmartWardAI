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
        legalBasis: legalBasis || 'Thông tư 116/2026/TT-BCA & Nghị định 30/2020/NĐ-CP',
      };
    case 'TK-KS':
      return {
        formType: 'TK-KS',
        procedureCode,
        procedureName,
        docxFileName: 'Mau_TK_KS_KhaiSinh_Chuan_ND30.docx',
        pdfFileName: 'Mau_TK_KS_KhaiSinh_Chuan_ND30.pdf',
        legalBasis: legalBasis || 'Thông tư 04/2020/TT-BTP & Nghị định 30/2020/NĐ-CP',
      };
    case 'TK-KH':
      return {
        formType: 'TK-KH',
        procedureCode,
        procedureName,
        docxFileName: 'Mau_TK_KH_KetHon_Chuan_ND30.docx',
        pdfFileName: 'Mau_TK_KH_KetHon_Chuan_ND30.pdf',
        legalBasis: legalBasis || 'Luật HN&GĐ 2014 & Thông tư 04/2020/TT-BTP',
      };
    case 'TK-BTXH':
      return {
        formType: 'TK-BTXH',
        procedureCode,
        procedureName,
        docxFileName: 'Mau_TK_BTXH_BaoTro_Chuan_ND30.docx',
        pdfFileName: 'Mau_TK_BTXH_BaoTro_Chuan_ND30.pdf',
        legalBasis: legalBasis || 'Nghị định 20/2021/NĐ-CP & Nghị định 335/2026/NĐ-CP',
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

/**
 * Generates standard Vietnamese Decree 30/2020/ND-CP A4 HTML document
 * used for direct .DOCX and .PDF export (never for browser/system print dialogs).
 */
export function buildOfficialTemplateHtml(
  descriptor: TemplateFileDescriptor,
  wardName: string
): string {
  const safeWard = escapeHtml(wardName);
  const safeProc = escapeHtml(descriptor.procedureName);
  const safeCode = escapeHtml(descriptor.procedureCode);
  const safeBasis = escapeHtml(descriptor.legalBasis);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(descriptor.pdfFileName)}</title>
  <style>
    @page { size: A4; margin: 20mm 15mm 20mm 30mm; }
    body { font-family: "Times New Roman", serif; font-size: 13pt; line-height: 1.5; color: #0F172A; }
    .header { text-align: center; margin-bottom: 18px; }
    .nation { font-weight: bold; font-size: 13pt; text-transform: uppercase; }
    .motto { font-weight: bold; font-size: 13pt; text-decoration: underline; margin-top: 2px; }
    .title { text-align: center; font-weight: bold; font-size: 15pt; margin: 18px 0 6px; text-transform: uppercase; }
    .subtitle { text-align: center; font-style: italic; font-size: 12pt; margin-bottom: 16px; }
    .field { margin: 10px 0; }
    .label { font-weight: bold; }
    .footer { margin-top: 28px; display: flex; justify-content: flex-end; }
    .sign { text-align: center; width: 240px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
  </div>
  <div class="title">TỜ KHAI THỦ TỤC HÀNH CHÍNH (${escapeHtml(descriptor.formType)})</div>
  <div class="subtitle">${safeProc} • Mã thủ tục: ${safeCode}</div>
  <div class="field"><span class="label">Kính gửi:</span> Ủy ban nhân dân / Bộ phận Một cửa ${safeWard}, Tỉnh An Giang</div>
  <div class="field"><span class="label">1. Họ, chữ đệm và tên người khai:</span> ................................................................................</div>
  <div class="field"><span class="label">2. Ngày, tháng, năm sinh:</span> ....../....../............ &nbsp;&nbsp; <span class="label">Giới tính:</span> ................</div>
  <div class="field"><span class="label">3. Số định danh cá nhân (CCCD 12 số):</span> .........................................................................</div>
  <div class="field"><span class="label">4. Nơi thường trú / Chỗ ở hiện nay:</span> .............................................................................</div>
  <div class="field"><span class="label">5. Số điện thoại liên hệ:</span> .............................. &nbsp;&nbsp; <span class="label">Email nhận Mã QR (0đ):</span> ........................</div>
  <div class="field"><span class="label">6. Nội dung đề nghị giải quyết:</span> ${safeProc}</div>
  <div class="field"><span class="label">Căn cứ pháp lý áp dụng:</span> ${safeBasis}</div>
  <div class="footer">
    <div class="sign">
      <div><i>An Giang, ngày ...... tháng ...... năm 2026</i></div>
      <div><b>NGƯỜI KÊ KHAI</b></div>
      <div><i>(Ký, ghi rõ họ tên)</i></div>
    </div>
  </div>
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
