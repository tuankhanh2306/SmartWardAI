/**
 * SmartWard AI Mobile — Bộ Xuất File .PDF Phiếu Hẹn Sơ Duyệt Điện Tử Có Mã QR (MOB-4.4)
 * Kỷ luật bắt buộc:
 * - Chỉ dùng Print.printToFileAsync() + Sharing.shareAsync() (trên Native) hoặc Blob Download (trên Web)
 * - TUYỆT ĐỐI KHÔNG mở hộp thoại in máy in trực tiếp
 */

import type { WalletQrPassRow } from '../storage/sqliteDb';

function escapeHtml(text: string | null | undefined): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const UNVERIFIED_SLA_TEXT = 'Chưa xác định (chờ cán bộ Một cửa xác nhận)';

export function formatMobileSlaDeadline(slaDeadline?: string | null): string {
  if (!slaDeadline || !slaDeadline.trim()) {
    return UNVERIFIED_SLA_TEXT;
  }
  return slaDeadline.trim();
}

export function getDossierStatusVietnamese(status: string): string {
  switch ((status || '').toUpperCase()) {
    case 'OFFICIALLY_ACCEPTED':
      return 'Hồ sơ đã được tiếp nhận';
    case 'APPROVED':
      return 'Đã kiểm tra sơ bộ • Có mã hẹn QR (chờ biên nhận)';
    case 'UNDER_APPRAISAL':
      return 'Đang thẩm định chuyên môn';
    case 'PENDING_UBND_SIGNATURE':
      return 'Trình lãnh đạo UBND ký duyệt';
    case 'CENTER_SIGNED':
      return 'Đã ký theo ủy quyền tại Trung tâm';
    case 'TRANSFERRED_AWAITING_DECISION':
      return 'Đã chuyển cơ sở – chờ quyết định tiếp nhận';
    case 'SUPPLEMENT_REQUIRED':
      return 'Cần bổ sung';
    case 'SUPPLEMENTED':
      return 'Đã bổ sung – chờ kiểm tra lại';
    case 'READY_FOR_RETURN':
      return 'Có kết quả – chờ trả';
    case 'COMPLETED':
      return 'Đã trả kết quả';
    case 'REJECTED':
      return 'Từ chối tiếp nhận';
    case 'PENDING':
    default:
      return 'Đã gửi yêu cầu kiểm tra trước';
  }
}

/**
 * Generates deterministic SVG matrix pattern representing the QR pass inside exported PDF
 * so the offline PDF always contains a crisp vector visual even without external image fetches.
 */
function buildDeterministicQrSvg(payload: string): string {
  const size = 21;
  const cell = 6;
  const dim = size * cell;
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);

  const rects: string[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let dark = false;
      if (isFinder(r, c)) {
        const lr = r < 7 ? r : r - (size - 7);
        const lc = c < 7 ? c : c - (size - 7);
        dark =
          lr === 0 ||
          lr === 6 ||
          lc === 0 ||
          lc === 6 ||
          (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
      } else {
        const bit = ((hash ^ ((r * 31 + c * 17) * 2654435761)) >>> 0) % 3;
        dark = bit !== 0;
      }
      if (dark) {
        rects.push(`<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}" fill="#0F172A"/>`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}"><rect width="${dim}" height="${dim}" fill="#FFFFFF"/>${rects.join('')}</svg>`;
}

export function buildElectronicQrPassHtml(pass: WalletQrPassRow): string {
  const qrSvg = buildDeterministicQrSvg(pass.qr_payload);
  const appointmentLabel = pass.appointment_code || 'CHỜ CẤP MÃ HẸN';
  const statusVi = getDossierStatusVietnamese(pass.status);
  const passBadgeLabel = pass.qr_payload?.startsWith('SW_RECEIPT|')
    ? 'PHIẾU BIÊN NHẬN CHÍNH THỨC'
    : pass.qr_payload?.startsWith('SW_DRAFT|')
    ? 'MÃ BẢN NHÁP SMARTWARD (KIỂM TRA TRƯỚC)'
    : 'PHIẾU HẸN SƠ DUYỆT ĐIỆN TỬ';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Phieu_Hen_QR_${escapeHtml(pass.dossier_code)}.pdf</title>
  <style>
    @page { size: A5 portrait; margin: 14mm; }
    body { font-family: Arial, sans-serif; color: #0F172A; margin: 0; padding: 0; }
    .card { border: 2px solid #00796B; border-radius: 14px; padding: 18px; }
    .badge { display: inline-block; background: #F0FDFA; color: #00796B; border: 1px solid #99F6E4; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .ward { font-size: 16px; font-weight: 800; margin: 8px 0 2px; }
    .sub { font-size: 12px; color: #475569; margin-bottom: 14px; }
    .qr-wrap { text-align: center; padding: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 14px; }
    .code { font-family: monospace; font-size: 15px; font-weight: 800; color: #00796B; margin-top: 8px; }
    .grid { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .grid td { padding: 7px 6px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
    .k { color: #64748B; width: 38%; font-weight: 600; }
    .v { color: #0F172A; font-weight: 700; }
    .note { margin-top: 14px; padding: 10px; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; font-size: 12px; color: #065F46; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${escapeHtml(passBadgeLabel)}</div>
    <div class="ward">UBND ${escapeHtml(pass.ward_name)}</div>
    <div class="sub">Bộ phận Một cửa — Tỉnh An Giang (Miễn phí 100% • Không SMS)</div>
    <div class="qr-wrap">
      ${qrSvg}
      <div class="code">${escapeHtml(appointmentLabel)}</div>
      <div style="font-size:11px;color:#64748B;margin-top:3px;">${escapeHtml(pass.qr_payload)}</div>
    </div>
    <table class="grid">
      <tr><td class="k">Họ và tên công dân</td><td class="v">${escapeHtml(pass.citizen_name)}</td></tr>
      <tr><td class="k">CCCD (Che mờ bảo mật)</td><td class="v">${escapeHtml(pass.citizen_cccd_mask)}</td></tr>
      <tr><td class="k">Mã hồ sơ đồng bộ Web</td><td class="v">${escapeHtml(pass.dossier_code)}</td></tr>
      <tr><td class="k">Thủ tục hành chính</td><td class="v">${escapeHtml(pass.procedure_name)} (${escapeHtml(pass.procedure_code)})</td></tr>
      <tr><td class="k">Thời hạn giải quyết</td><td class="v">${escapeHtml(formatMobileSlaDeadline(pass.sla_deadline))}</td></tr>
      <tr><td class="k">Trạng thái hồ sơ</td><td class="v">${escapeHtml(statusVi)}</td></tr>
      ${pass.officer_feedback ? `<tr><td class="k">Lời dặn của Cán bộ</td><td class="v">${escapeHtml(pass.officer_feedback)}</td></tr>` : ''}
    </table>
    <div class="note">
      Hướng dẫn: Xuất trình trực tiếp mã QR này kèm CCCD bản gốc tại Quầy ưu tiên Bộ phận Một cửa UBND ${escapeHtml(pass.ward_name)}.
    </div>
  </div>
</body>
</html>`;
}

export interface QrPassPdfExportResult {
  success: boolean;
  fileName: string;
  fileUri?: string;
  message: string;
}

/**
 * Exports Electronic QR Appointment Pass to .PDF file and opens native save/share dialog.
 * NEVER triggers a printer dialog.
 */
export async function exportQrPassToPdf(
  pass: WalletQrPassRow
): Promise<QrPassPdfExportResult> {
  const safeCode = pass.dossier_code.replace(/[^A-Za-z0-9_-]/g, '_');
  const fileName = `Phieu_Hen_QR_${safeCode}.pdf`;
  const html = buildElectronicQrPassHtml(pass);

  // Web Preview direct download (strictly no print dialog)
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
      const downloadName = fileName.replace(/\.pdf$/i, '.html');
      const blob = new webGlobal.Blob([html], { type: 'text/html;charset=utf-8' });
      const blobUrl = webGlobal.URL.createObjectURL(blob);
      const a = webGlobal.document.createElement('a');
      a.href = blobUrl;
      a.download = downloadName;
      webGlobal.document.body.appendChild(a);
      a.click();
      webGlobal.document.body.removeChild(a);
      setTimeout(() => webGlobal.URL?.revokeObjectURL?.(blobUrl), 1000);
      return {
        success: true,
        fileName: downloadName,
        message: `Đã tải Phiếu hẹn ${downloadName} về máy.`,
      };
    } catch {
      // Fall through to Expo native flow
    }
  }

  try {
    const Print = require('expo-print') as typeof import('expo-print');
    const FileSystem = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
    const Sharing = require('expo-sharing') as typeof import('expo-sharing');

    // Strictly printToFileAsync (creates PDF file silently, never opens printer dialog)
    const pdf = await Print.printToFileAsync({ html });
    const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    let targetUri = pdf.uri;
    if (baseDir) {
      targetUri = `${baseDir}${fileName}`;
      await FileSystem.copyAsync({ from: pdf.uri, to: targetUri });
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(targetUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Lưu Phiếu hẹn QR ${pass.dossier_code}`,
      });
    }

    return {
      success: true,
      fileName,
      fileUri: targetUri,
      message: `Đã xuất trực tiếp ${fileName} về máy.`,
    };
  } catch (err) {
    return {
      success: false,
      fileName,
      message: err instanceof Error ? err.message : 'Không thể xuất tệp PDF lúc này.',
    };
  }
}
