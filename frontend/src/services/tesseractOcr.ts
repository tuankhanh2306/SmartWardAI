import Tesseract from 'tesseract.js';
import { normalizeDateToYMD, type ExtractedFormFieldsResult } from './geminiClient';

export interface TesseractOcrProgress {
  status: string;
  progress: number;
}

/**
 * Client-Side In-Browser OCR Engine using Tesseract.js WebAssembly.
 * Fully offline, zero API quota limitations, privacy-preserving.
 */
export async function extractFormWithTesseract(
  file: File | Blob,
  onProgress?: (p: TesseractOcrProgress) => void
): Promise<ExtractedFormFieldsResult> {
  try {
    const res = await Tesseract.recognize(
      file,
      'vie+eng',
      {
        logger: (m) => {
          if (onProgress && m.status && typeof m.progress === 'number') {
            onProgress({ status: m.status, progress: Math.round(m.progress * 100) });
          }
        },
      }
    );

    const rawText = res.data.text || '';
    const confidence = res.data.confidence ? Math.min(100, Math.max(0, Math.round(res.data.confidence))) : 75;

    return parseVietnameseAdministrativeText(rawText, confidence);
  } catch (error: any) {
    return {
      success: false,
      fullName: '',
      cccd: '',
      dob: '',
      issueDate: '',
      address: '',
      confidence: 0,
      detectedDocType: 'Lỗi Tesseract OCR',
      message: 'Không thể xử lý ảnh qua Tesseract OCR: ' + (error?.message || 'Lỗi không xác định'),
      extractedFieldsCount: 0,
    };
  }
}

const ADMINISTRATIVE_HEADERS_BAN_LIST = [
  'CỘNG HÒA', 'CONG HOA', 'VIỆT NAM', 'VIET NAM',
  'ĐỘC LẬP', 'DOC LAP', 'TỰ DO', 'TU DO',
  'HẠNH PHÚC', 'HANH PHUC',
  'TỜ KHAI', 'TO KHAI', 'THAY ĐỔI', 'THAY DOI',
  'THÔNG TIN', 'THONG TIN', 'CƯ TRÚ', 'CU TRU',
  'MẪU CT01', 'MAU CT01', 'CT01',
  'KÍNH GỬI', 'KINH GUI', 'CÔNG AN', 'CONG AN',
  'BỘ CÔNG AN', 'BO CONG AN', 'CỤC CẢNH SÁT',
  'Ý KIẾN', 'Y KIEN', 'CHỦ HỘ', 'CHU HO',
  'NGƯỜI KÊ KHAI', 'NGUOI KE KHAI',
  'CHỦ SỞ HỮU', 'CHU SO HUU', 'CHA HOẶC MẸ', 'GIÁM HỘ'
];

function isAdministrativeHeader(text: string): boolean {
  const upper = text.toUpperCase();
  return ADMINISTRATIVE_HEADERS_BAN_LIST.some((ban) => upper.includes(ban));
}

/**
 * Robust Entity Parser for Vietnamese Administrative Documents (CT01, CCCD, CMND)
 */
export function parseVietnameseAdministrativeText(rawText: string, confidence: number): ExtractedFormFieldsResult {
  let fullName = '';
  let cccd = '';
  let dob = '';
  let gender = '';
  let issueDate = '';
  let address = '';

  // 1. Extract Full Name: ONLY if explicitly preceded by Section 1 label
  const nameLabelMatch = rawText.match(
    /(?:1\.?\s*Họ,?\s*chữ đệm và tên(?: khai sinh)?|Họ,?\s*chữ đệm và tên)[\s\:\.\-]*([^\n\r\d\:\;\,\(\)]{3,35})/i
  );
  if (nameLabelMatch) {
    const candidate = nameLabelMatch[1].trim();
    if (!isAdministrativeHeader(candidate) && candidate.split(/\s+/).length >= 2) {
      fullName = candidate.toUpperCase();
    }
  }

  // 2. Extract Date of Birth: ONLY if explicitly preceded by Section 2 label
  const dobMatch = rawText.match(
    /(?:2\.?\s*Ngày,?\s*tháng,?\s*năm sinh|Ngày,?\s*tháng,?\s*năm sinh)[\s\:\.\-]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i
  );
  if (dobMatch) {
    dob = normalizeDateToYMD(dobMatch[1]);
  }

  // 3. Extract Gender: Section 3
  const genderMatch = rawText.match(/(?:3\.?\s*Giới tính|Giới tính)[\s\:\.\-]*([^\n\r\d\:\;\,\(\)]{2,8})/i);
  if (genderMatch) {
    const g = genderMatch[1].trim().toLowerCase();
    if (g.includes('nữ') || g.includes('nu')) gender = 'Nữ';
    else if (g.includes('nam')) gender = 'Nam';
  }

  // 4. Extract 12-digit CCCD / ĐDCN: ONLY from Section 4
  const cccdMatch = rawText.match(
    /(?:4\.?\s*Số định danh cá nhân|Số định danh cá nhân)[\s\:\.\-]*([0-9\s]{9,16})/i
  );
  if (cccdMatch) {
    const digitsOnly = cccdMatch[1].replace(/\s+/g, '');
    if (digitsOnly.length === 12 || digitsOnly.length === 9) {
      cccd = digitsOnly;
    }
  }

  // 5. Extract Address: ONLY from Section 10 "Nội dung đề nghị" or "tại địa chỉ"
  const addressMatch = rawText.match(
    /(?:10\.?\s*Nội dung đề nghị[^:]*tại địa chỉ|tại địa chỉ)[\s\:\.\-]+([^\n\r]{8,120})/i
  );
  if (addressMatch) {
    const candidate = addressMatch[1].trim();
    if (!isAdministrativeHeader(candidate)) {
      address = candidate;
    }
  }

  // Note: Mẫu CT01 has NO "Ngày cấp CCCD" (Issue Date) field. Do not guess or map form signing date as CCCD issue date.
  issueDate = '';

  let count = 0;
  if (fullName) count++;
  if (cccd) count++;
  if (dob) count++;
  if (gender) count++;
  if (address) count++;

  const detectedDocType =
    rawText.includes('CT01') || rawText.includes('cư trú')
      ? 'Tờ khai CT01 cư trú (Động cơ OCR Ngoại tuyến)'
      : rawText.includes('CĂN CƯỚC') || rawText.includes('IDENTITY')
      ? 'Thẻ CCCD (Động cơ OCR Ngoại tuyến)'
      : 'Tài liệu hành chính (Động cơ OCR Ngoại tuyến)';

  return {
    success: count > 0,
    fullName,
    cccd,
    dob,
    gender,
    issueDate,
    address,
    confidence: count > 0 ? confidence : 0,
    detectedDocType,
    message:
      count > 0
        ? `Đã trích xuất ${count} trường thông tin chuẩn theo các mục của biểu mẫu!`
        : 'Không tìm thấy các mục trường thông tin tương ứng trên ảnh. Vui lòng nhập tay.',
    extractedFieldsCount: count,
  };
}
