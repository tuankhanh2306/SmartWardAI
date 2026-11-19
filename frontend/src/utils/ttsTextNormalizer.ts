/**
 * SmartWard AI — Vietnamese Administrative TTS Text Normalizer.
 * Expands civic acronyms, abbreviations, dates, and numbers into spoken Vietnamese words
 * so speech synthesis pronounces them clearly and naturally.
 *
 * Example:
 * "Nộp CCCD và CT01 tại UBND" -> "Nộp Căn cước công dân và Tờ khai thay đổi thông tin cư trú Cê Tê không một tại Ủy ban nhân dân"
 */

export function normalizeTextForTts(text: string): string {
  if (!text) return '';

  let t = text;

  // 1. Remove markdown formatting, brackets, hashes, and internal chunk codes
  t = t.replace(/\[[A-Za-z0-9_\-]+\]/g, '');
  t = t.replace(/[*#_~`>]/g, ' ');
  t = t.replace(/[\r\t]/g, ' ');

  // 2. Expand Legal Document & Citation Numbers
  // "01/07/2026" or "ngày 01/07/2026"
  t = t.replace(/(?:ngày\s+)?\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/gi, 'ngày $1 tháng $2 năm $3');
  // "118/2025/NĐ-CP" -> "số 118 năm 2025 Nghị định Chính phủ"
  t = t.replace(/(\d+)\/(\d{4})\/NĐ-CP/gi, 'số $1 năm $2 Nghị định Chính phủ');
  t = t.replace(/(\d+)\/(\d{4})\/TT-BCA/gi, 'số $1 năm $2 Thông tư Bộ Công an');
  t = t.replace(/(\d+)\/(\d{4})\/TT-BTP/gi, 'số $1 năm $2 Thông tư Bộ Tư pháp');
  t = t.replace(/(\d+)\/(\d{4})\/QĐ-UBND/gi, 'số $1 năm $2 Quyết định Ủy ban nhân dân');
  t = t.replace(/(\d+)\/(\d{4})\/QH(\d+)/gi, 'số $1 năm $2 Quốc hội khóa $3');

  // 3. Expand Civic Forms & Codes
  t = t.replace(/\bCT0?1\b/gi, 'Tờ khai thay đổi thông tin cư trú Cê Tê không một');
  t = t.replace(/\bCT0?7\b/gi, 'Giấy xác nhận thông tin về cư trú Cê Tê không bảy');
  t = t.replace(/\bCT0?8\b/gi, 'Thông báo kết quả giải quyết về cư trú Cê Tê không tám');
  t = t.replace(/\bCT(\d{1,2})\b/gi, 'Biểu mẫu Cê Tê $1');

  // 4. Expand Core Administrative Acronyms
  const replacements: [RegExp, string][] = [
    // Citizen identification & civil status
    [/\bCCCD\b/g, 'Căn cước công dân'],
    [/\bCMND\b/g, 'Chứng minh nhân dân'],
    [/\bVNeID\b/g, 'Vê Nê Ai Đi'],
    [/\bvneid\b/g, 'Vê Nê Ai Đi'],
    [/\bBHYT\b/g, 'Bảo hiểm y tế'],
    [/\bBHXH\b/g, 'Bảo hiểm xã hội'],
    [/\bGCNQSDĐ\b/g, 'Giấy chứng nhận quyền sử dụng đất'],
    [/\bGCN\b/g, 'Giấy chứng nhận'],
    [/\bĐKKH\b/g, 'Đăng ký kết hôn'],
    [/\bĐKKS\b/g, 'Đăng ký khai sinh'],
    [/\bĐKKT\b/g, 'Đăng ký khai tử'],
    [/\bĐK\b/g, 'Đăng ký'],

    // Administrative Agencies & Levels
    [/\bUBND\b/g, 'Ủy ban nhân dân'],
    [/\bHĐND\b/g, 'Hội đồng nhân dân'],
    [/\bTTHC\b/g, 'Thủ tục hành chính'],
    [/\bBộ phận TN&TKQ\b/g, 'Bộ phận Tiếp nhận và Trả kết quả'],
    [/\bTN&TKQ\b/g, 'Tiếp nhận và Trả kết quả'],
    [/\bBCA\b/g, 'Bộ Công an'],
    [/\bBTP\b/g, 'Bộ Tư pháp'],
    [/\bBYT\b/g, 'Bộ Y tế'],
    [/\bBTNMT\b/g, 'Bộ Tài nguyên và Môi trường'],
    [/\bBXD\b/g, 'Bộ Xây dựng'],
    [/\bBNG\b/g, 'Bộ Ngoại giao'],
    [/\bDVCQG\b/g, 'Dịch vụ công Quốc gia'],
    [/\bDVC\b/g, 'Dịch vụ công'],
    [/\bQLHC\b/g, 'Quản lý hành chính'],
    [/\bPCCC\b/g, 'Phòng cháy chữa cháy'],
    [/\bTAND\b/g, 'Tòa án nhân dân'],
    [/\bVKSND\b/g, 'Viện kiểm sát nhân dân'],

    // Legal Terminology
    [/\bNĐ-CP\b/g, 'Nghị định Chính phủ'],
    [/\bNĐ\b/g, 'Nghị định'],
    [/\bTT-BCA\b/g, 'Thông tư Bộ Công an'],
    [/\bTT-BTP\b/g, 'Thông tư Bộ Tư pháp'],
    [/\bQĐ-UBND\b/g, 'Quyết định Ủy ban nhân dân'],
    [/\bQĐ\b/g, 'Quyết định'],
    [/\bNQ-HĐND\b/g, 'Nghị quyết Hội đồng nhân dân'],
    [/\bNQ\b/g, 'Nghị quyết'],

    // Place Prefixes
    [/\bTP\.\s*/g, 'Thành phố '],
    [/\bTp\.\s*/g, 'Thành phố '],
    [/\bTX\.\s*/g, 'Thị xã '],
    [/\bTx\.\s*/g, 'Thị xã '],
    [/\bH\.\s*/g, 'Huyện '],
    [/\bQ\.\s*/g, 'Quận '],
    [/\bP\.\s*/g, 'Phường '],
    [/\bX\.\s*/g, 'Xã '],
    [/\bTT\.\s*/g, 'Thị trấn '],

    // Fee & Technical
    [/\b0\s*(đ|đồng|VNĐ|VND)\b/g, 'Miễn phí, không thu tiền'],
    [/(\d+)\s*(k|k\b|nghìn đồng|ngàn đồng)/g, '$1 nghìn đồng'],
    [/(\d+)\s*(đ|VNĐ|VND)\b/g, '$1 đồng'],
    [/\bSLA\b/g, 'Thời hạn giải quyết'],
    [/\bHITL\b/g, 'Cán bộ chuyên môn kiểm tra'],
    [/\bOTP\b/g, 'Mã xác thực ô tê pê'],
    [/\bPIN\b/g, 'Mã pin'],
    [/\bQR\b/g, 'Mã quy rờ'],
    [/\bPDF\b/g, 'Tệp tài liệu pê đê ép'],
  ];

  for (const [pattern, repl] of replacements) {
    t = t.replace(pattern, repl);
  }

  // 5. Natural Prosody & Breathing Pauses
  t = t.replace(/^\s*[-•]\s*/gm, ', ');
  t = t.replace(/\n+/g, '. ');
  t = t.replace(/[:;]/g, ', ');
  t = t.replace(/,\s*,+/g, ', ');
  t = t.replace(/\.\s*\.+/g, '. ');
  t = t.replace(/\s+/g, ' ').trim();

  return t;
}
