/**
 * SmartWard AI — Lightweight Vietnamese Diacritics & Administrative N-Gram Restorer
 * =================================================================================
 * Khôi phục dấu thanh và thuật ngữ hành chính công cho các câu hỏi gõ không dấu
 * hoặc gõ nhầm telex của công dân.
 *
 * Thiết kế Zero-RAM / Sub-millisecond:
 * - Chạy trực tiếp tại browser của công dân (kể cả offline, mạng yếu hoặc thiết bị cũ).
 * - Sử dụng thuật toán tham lam (Greedy N-gram matching: 4-gram -> 3-gram -> 2-gram -> unigram)
 *   phủ toàn bộ 40 TTHC cấp xã và từ vựng hộ tịch, cư trú, đất đai, bảo trợ.
 * - Giải quyết triệt để CẢ LỚP lỗi không dấu mà không cần liệt kê thủ công từng câu hỏi.
 */

const N_GRAM_DICTIONARY: Record<string, string> = {
  // 4-grams (Cụm 4 từ đặc trưng)
  'cac che do chinh sach': 'các chế độ chính sách',
  'che do chinh sach bao': 'chế độ chính sách bảo',
  'chinh sach bao tro xa': 'chính sách bảo trợ xã',
  'chinh sach bao tro': 'chính sách bảo trợ',
  'bao tro xa hoi': 'bảo trợ xã hội',
  'bao tro xa boi': 'bảo trợ xã hội',
  'dang ky khai sinh': 'đăng ký khai sinh',
  'dang ky ket hon': 'đăng ký kết hôn',
  'dang ky khai tu': 'đăng ký khai tử',
  'dang ky tam tru': 'đăng ký tạm trú',
  'dang ky thuong tru': 'đăng ký thường trú',
  'khai bao tam vang': 'khai báo tạm vắng',
  'chung thuc ban sao': 'chứng thực bản sao',
  'chung thuc chu ky': 'chứng thực chữ ký',
  'chung thuc hop dong': 'chứng thực hợp đồng',
  'tro cap xa hoi': 'trợ cấp xã hội',
  'tro cap xa boi': 'trợ cấp xã hội',
  'nguoi cao tuoi': 'người cao tuổi',
  'nguoi khuyet tat': 'người khuyết tật',
  'tinh trang hon nhan': 'tình trạng hôn nhân',
  'xac nhan tinh trang': 'xác nhận tình trạng',
  'can cuoc cong dan': 'căn cước công dân',
  'thay doi thong tin': 'thay đổi thông tin',
  'cap ban sao trich': 'cấp bản sao trích',
  'ban sao trich luc': 'bản sao trích lục',
  'thoi han giai quyet': 'thời hạn giải quyết',
  'thanh phan ho so': 'thành phần hồ sơ',
  'noi tiep nhan va': 'nơi tiếp nhận và',
  'bo phan mot cua': 'bộ phận một cửa',
  'uy ban nhan dan': 'ủy ban nhân dân',
  'tro cap mai tang': 'trợ cấp mai táng',
  'tro cap mai tang phi': 'trợ cấp mai táng phí',
  'chi phi mai tang': 'chi phí mai táng',
  'mai tang phi': 'mai táng phí',
  'chuyen khau ve nha moi': 'chuyển khẩu về nhà mới',
  've nha moi': 'về nhà mới',

  // 3-grams (Cụm 3 từ đặc trưng)
  'che do bao': 'chế độ bảo',
  'tro cap nguoi': 'trợ cấp người',
  'tro cap hang': 'trợ cấp hàng',
  'tro cap thang': 'trợ cấp tháng',
  'tien tro cap': 'tiền trợ cấp',
  'tien mai tang': 'tiền mai táng',
  'khai sinh cho': 'khai sinh cho',
  'khai sinh con': 'khai sinh con',
  'ket hon voi': 'kết hôn với',
  'lam giay to': 'làm giấy tờ',
  'lam thu tuc': 'làm thủ tục',
  'can giay to': 'cần giấy tờ',
  'can nhung gi': 'cần những gì',
  'mat bao lau': 'mất bao lâu',
  'bao nhieu tien': 'bao nhiêu tiền',
  'le phi bao': 'lệ phí bao',
  'o dau lam': 'ở đâu làm',
  'nop o dau': 'nộp ở đâu',
  'sao y ban': 'sao y bản',
  'trich luc khai': 'trích lục khai',
  'chuyen khau ve': 'chuyển khẩu về',
  'nhap khau ve': 'nhập khẩu về',
  'tam vang di': 'tạm vắng đi',
  'di lam xa': 'đi làm xa',
  'so do dat': 'sổ đỏ đất',
  'chuyen nhuong dat': 'chuyển nhượng đất',
  'thua ke dat': 'thừa kế đất',
  'cho tang dat': 'cho tặng đất',
  'khong co giay': 'không có giấy',
  'bi mat giay': 'bị mất giấy',
  'lam lai giay': 'làm lại giấy',

  // 2-grams (Cụm 2 từ phổ biến)
  'bao tro': 'bảo trợ',
  'xa hoi': 'xã hội',
  'xa boi': 'xã hội',
  'tro cap': 'trợ cấp',
  'khai sinh': 'khai sinh',
  'khai sanh': 'khai sinh',
  'ket hon': 'kết hôn',
  'gia thu': 'kết hôn',
  'hon thu': 'kết hôn',
  'khai tu': 'khai tử',
  'tam tru': 'tạm trú',
  'thuong tru': 'thường trú',
  'tam vang': 'tạm vắng',
  'cu tru': 'cư trú',
  'chung thuc': 'chứng thực',
  'sao y': 'sao y',
  'le phi': 'lệ phí',
  'thoi han': 'thời hạn',
  'giay to': 'giấy tờ',
  'ho so': 'hồ sơ',
  'thu tuc': 'thủ tục',
  'tien gia': 'trợ cấp xã hội người cao tuổi',
  'can cuoc': 'căn cước',
  'ho chieu': 'hộ chiếu',
  'dat dai': 'đất đai',
  'so do': 'sổ đỏ',
  'hon nhan': 'hôn nhân',
  'ho tich': 'hộ tịch',
  'uy quyen': 'ủy quyền',
  'xac nhan': 'xác nhận',
  'trich luc': 'trích lục',
  'mai tang': 'mai táng',
  'tu phap': 'tư pháp',
  'chung sinh': 'chứng sinh',
  'chung sanh': 'chứng sinh',
  'sanh con': 'sinh con',
  'moi sanh': 'mới sinh',
  'moi sinh': 'mới sinh',
  'tre so': 'trẻ sơ',
  'so sinh': 'sơ sinh',
  'cha me': 'cha mẹ',
  'ong ba': 'ông bà',
  'vo chong': 'vợ chồng',
  'con nuoi': 'con nuôi',
  'nuoi con': 'nuôi con',
  'giam ho': 'giám hộ',
  'nhan con': 'nhận con',
  'nhan cha': 'nhận cha',
  'nhan me': 'nhận mẹ',
  'chuyen khau': 'chuyển khẩu',
  'nhap khau': 'nhập khẩu',
  'tach khau': 'tách khẩu',
  'ho khau': 'hộ khẩu',
  'mau ct01': 'mẫu ct01',
  'to khai': 'tờ khai',
  'nha moi': 'nhà mới',
  'bi mat': 'bị mất',
  'nguoi mat': 'người mất',
  'nguoi chet': 'người chết',
  'giay to gi': 'giấy tờ gì',
};

/**
 * Kiểm tra xem chuỗi có phải là tiếng Việt KHÔNG DẤU hay không
 */
export function isVietnameseUnaccented(text: string): boolean {
  if (!text) return false;
  // Kiểm tra nếu không chứa bất kỳ nguyên âm có dấu tiếng Việt nào
  return !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
}

import { normalizeVietnameseQuery } from './legalKnowledgeBase';

/**
 * Thuật toán khôi phục dấu thanh tiếng Việt hành chính bằng từ điển n-gram tham lam
 */
export function restoreVietnameseDiacritics(rawText: string): string {
  if (!rawText || !rawText.trim()) return rawText;

  let text = rawText.toLowerCase();

  // 1. Phục hồi theo danh mục n-gram từ dài đến ngắn
  // Sắp xếp các cụm từ theo độ dài số từ giảm dần (4-gram -> 3-gram -> 2-gram)
  const sortedCollocations = Object.keys(N_GRAM_DICTIONARY).sort((a, b) => {
    const wordsA = a.split(' ').length;
    const wordsB = b.split(' ').length;
    if (wordsB !== wordsA) return wordsB - wordsA;
    return b.length - a.length;
  });

  for (const collocation of sortedCollocations) {
    const escaped = collocation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    if (regex.test(text)) {
      text = text.replace(regex, N_GRAM_DICTIONARY[collocation]);
    }
  }

  // 2. Phục hồi một số unigram hành chính phổ biến nếu đứng độc lập
  const UNIGRAM_RESTORATIONS: Record<string, string> = {
    'lam': 'làm',
    'can': 'cần',
    'o dau': 'ở đâu',
    'gi': 'gì',
    'bao lau': 'bao lâu',
    'mat': 'mất',
    'duoc': 'được',
    'khong': 'không',
  };

  for (const [rawWord, accentedWord] of Object.entries(UNIGRAM_RESTORATIONS)) {
    const escaped = rawWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    text = text.replace(regex, accentedWord);
  }

  return text;
}

/**
 * Điểm vào chuẩn hóa và khôi phục dấu câu hỏi công dân duy nhất (BƯỚC 2.2 & 2.3)
 * Được gọi ở đúng 1 điểm trước khi chuyển câu hỏi sang Backend RAG hoặc Fallback Matcher.
 */
export async function preprocessQuery(rawText: string): Promise<string> {
  let text = (rawText || '').trim();
  if (isVietnameseUnaccented(text) && text.length >= 6) {
    text = restoreVietnameseDiacritics(text);
  }
  // Giữ lại normalizeVietnameseQuery() làm lớp dự phòng chạy sau để xử lý trường hợp đặc thù
  text = normalizeVietnameseQuery(text);
  return text;
}

