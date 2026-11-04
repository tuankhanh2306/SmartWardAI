/**
 * Intent Classifier for SmartWard AI
 * Distinguishes conversational greetings, small talk (wellbeing, gratitude, farewell),
 * procedure catalog inquiries (e.g., "nêu 40 thủ tục"), commune contact queries,
 * out-of-scope inquiries, and genuine administrative procedure inquiries.
 */

export const PROCEDURE_KEYWORDS = [
  'khai sinh', 'chứng sinh', 'mới sinh', 'sinh con', 'đẻ con', 'đặt tên cho con', 'giấy khai sinh',
  'kết hôn', 'lấy vợ', 'lấy chồng', 'hôn thú', 'đăng ký kết hôn', 'kết bạn đời',
  'khai tử', 'chứng tử', 'báo tử', 'người mất', 'qua đời', 'giấy chứng tử',
  'thường trú', 'tạm trú', 'ct01', 'cư trú', 'nhập khẩu', 'hộ khẩu', 'tách hộ', 'chuyển khẩu', 'lưu trú',
  'chứng thực', 'sao y', 'công chứng', 'chữ ký', 'bản sao', 'chứng thực chữ ký',
  'độc thân', 'xác nhận tình trạng hôn nhân', 'tình trạng hôn nhân', 'chưa kết hôn',
  'trích lục', 'bản sao trích lục', 'hộ tịch',
  'bảo trợ', 'trợ cấp', 'người cao tuổi', 'khuyết tật', 'mai táng phí',
  'đất đai', 'chuyển mục đích', 'đo đạc', 'trích lục bản đồ'
];

/**
 * Checks if the user is asking to view the catalog / list of 40 procedures
 */
export function isProcedureListQuery(query: string): boolean {
  const q = query.trim().toLowerCase().replace(/[!?.,;:]+$/, '');
  if (!q) return false;

  const listPatterns = [
    'nêu 40 thủ tục', 'nêu thủ tục', 'kể 40 thủ tục', 'kể tên 40 thủ tục', 'kể các thủ tục',
    'kể tên các thủ tục', 'kể tên thủ tục', 'danh sách 40 thủ tục', 'danh sách thủ tục',
    'danh mục 40 thủ tục', 'danh mục thủ tục', 'danh mục tthc', 'danh sách tthc',
    'có những thủ tục nào', 'có bao nhiêu thủ tục', 'gồm những thủ tục nào', 'có các thủ tục nào',
    'liệt kê 40 thủ tục', 'liệt kê các thủ tục', 'liệt kê thủ tục',
    'các thủ tục cấp xã', 'các thủ tục hành chính', 'các thủ tục',
    'hỗ trợ những thủ tục gì', 'hỗ trợ thủ tục nào', 'hỗ trợ những gì', 'làm được những thủ tục nào',
    'danh sách dịch vụ', '40 thủ tục'
  ];

  return listPatterns.some((pattern) => q.includes(pattern));
}

export type SmallTalkType = 'GREETING' | 'WELLBEING' | 'THANKS' | 'GOODBYE' | 'NONE';

/**
 * Classifies conversational small talk or greetings
 */
export function classifySmallTalk(query: string): { matched: boolean; type: SmallTalkType } {
  const q = query.trim().toLowerCase().replace(/[!?.,;:]+$/, '');
  if (!q) return { matched: false, type: 'NONE' };

  // If query explicitly contains specific procedure keywords, it is a PROCEDURE query!
  for (const kw of PROCEDURE_KEYWORDS) {
    if (q.includes(kw)) {
      return { matched: false, type: 'NONE' };
    }
  }

  // 1. Wellbeing / Social Small Talk ("hôm nay thế nào", "khỏe không"...)
  const wellbeingPatterns = [
    'hôm nay thế nào', 'hôm nay ra sao', 'hôm nay bạn thế nào', 'hôm nay sao rồi', 'hôm nay ổn không',
    'ngày mới thế nào', 'khỏe không', 'bạn khỏe không', 'cán bộ khỏe không', 'dạo này thế nào',
    'thế nào rồi', 'chúc ngày mới', 'chúc một ngày tốt lành', 'buổi sáng tốt lành', 'ngày tốt lành'
  ];
  if (wellbeingPatterns.some((p) => q.includes(p))) {
    return { matched: true, type: 'WELLBEING' };
  }

  // 2. Gratitude / Affirmation ("cảm ơn", "thanks", "ok"...)
  const thanksPatterns = [
    'cảm ơn', 'cam on', 'cảm ơn bạn', 'cảm ơn cán bộ', 'cảm ơn nhiều', 'cảm ơn nha', 'cảm ơn nhé',
    'thanks', 'thank you', 'tuyệt vời', 'tốt lắm', 'rất tốt', 'chu đáo quá', 'được rồi',
    'hiểu rồi', 'rõ rồi', 'ok bạn', 'oke bạn'
  ];
  const exactThanks = new Set(['ok', 'oke', 'ok!', 'oke!', 'thank', 'thanks', 'cảm ơn', 'cam on']);
  if (exactThanks.has(q) || thanksPatterns.some((p) => q === p || q.startsWith(p + ' '))) {
    return { matched: true, type: 'THANKS' };
  }

  // 3. Goodbye / Farewell ("tạm biệt", "bye"...)
  const goodbyePatterns = ['tạm biệt', 'tam biet', 'bye', 'bye bye', 'hẹn gặp lại', 'chào tạm biệt'];
  if (goodbyePatterns.some((p) => q.includes(p))) {
    return { matched: true, type: 'GOODBYE' };
  }

  // 4. Standard Greetings / Introductions ("hi", "hello", "xin chào"...)
  const exactGreetings = new Set([
    'hi', 'hello', 'hey', 'alo', 'chào', 'xin chào', 'kính chào',
    'chào bạn', 'chào bạn nha', 'chào bạn nhé',
    'chào bot', 'chào ad', 'chào cán bộ', 'chào ủy ban',
    'chào anh', 'chào chị', 'chào em',
    'bạn là ai', 'ai đó', 'bạn là cái gì',
    'bạn giúp được gì', 'bạn có thể làm gì', 'chức năng của bạn',
    'hướng dẫn sử dụng', 'giới thiệu', 'giới thiệu bản thân',
    'good morning', 'good afternoon', 'good evening',
    'start', 'bắt đầu'
  ]);
  if (exactGreetings.has(q)) {
    return { matched: true, type: 'GREETING' };
  }

  if (q.length <= 30) {
    const greetingRegex = /^(hi|hello|hey|alo|xin\s+chào|chào)(\s+.*)?$/i;
    if (greetingRegex.test(q)) {
      return { matched: true, type: 'GREETING' };
    }
    const identityRegex = /^(bạn|bot)\s+(là\s+ai|có\s+thể\s+làm\s+gì|giúp\s+gì)/i;
    if (identityRegex.test(q)) {
      return { matched: true, type: 'GREETING' };
    }
  }

  return { matched: false, type: 'NONE' };
}

export function isGreetingQuery(query: string): boolean {
  return classifySmallTalk(query).matched;
}

export function isWardOfficeQuery(query: string): boolean {
  const q = query.trim().toLowerCase();

  for (const kw of PROCEDURE_KEYWORDS) {
    if (q.includes(kw)) {
      return false;
    }
  }

  const officePatterns = [
    'địa chỉ ở đâu', 'trụ sở ở đâu', 'địa chỉ ủy ban', 'địa chỉ ubnd',
    'ủy ban ở đâu', 'ubnd ở đâu', 'trụ sở ubnd', 'ở đâu',
    'giờ làm việc', 'mấy giờ làm việc', 'mấy giờ mở cửa', 'mấy giờ đóng cửa',
    'giờ tiếp dân', 'thời gian làm việc', 'thứ 7 có làm việc không',
    'thứ bảy có làm không', 'chủ nhật có làm không',
    'số điện thoại', 'hotline', 'số hotline', 'liên hệ ai', 'điện thoại ubnd'
  ];

  return officePatterns.some((pattern) => q.includes(pattern));
}

export interface OutOfScopeResult {
  isOutOfScope: boolean;
  authority?: string;
  reason?: string;
}

export function checkOutOfScopeQuery(query: string): OutOfScopeResult {
  const q = query.trim().toLowerCase();

  if (q.includes('hộ chiếu') || q.includes('passport') || q.includes('visa') || q.includes('xuất cảnh') || q.includes('nhập cảnh')) {
    return {
      isOutOfScope: true,
      authority: 'Phòng Quản lý xuất nhập cảnh Công an tỉnh hoặc Cục Quản lý xuất nhập cảnh (Bộ Công an)',
      reason: 'Thủ tục cấp hộ chiếu và xuất nhập cảnh thuộc thẩm quyền của cơ quan Công an cấp tỉnh/Trung ương, không thuộc thẩm quyền UBND cấp xã.',
    };
  }

  if (q.includes('bằng lái') || q.includes('giấy phép lái xe') || q.includes('gplx') || q.includes('đổi bằng') || q.includes('thi lái xe')) {
    return {
      isOutOfScope: true,
      authority: 'Sở Giao thông vận tải hoặc Trung tâm sát hạch lái xe được ủy quyền',
      reason: 'Thủ tục cấp đổi và sát hạch giấy phép lái xe thuộc thẩm quyền ngành Giao thông vận tải.',
    };
  }

  if (q.includes('thuế thu nhập cá nhân') || q.includes('quyết toán thuế') || q.includes('mã số thuế cá nhân') || q.includes('hoàn thuế')) {
    return {
      isOutOfScope: true,
      authority: 'Chi cục Thuế khu vực hoặc Cục Thuế tỉnh',
      reason: 'Thủ tục quản lý thuế và hoàn thuế thuộc thẩm quyền của cơ quan Thuế.',
    };
  }

  if (q.includes('thành lập doanh nghiệp') || q.includes('thành lập công ty') || q.includes('giấy phép kinh doanh công ty') || q.includes('đăng ký kinh doanh công ty')) {
    return {
      isOutOfScope: true,
      authority: 'Phòng Đăng ký kinh doanh - Sở Kế hoạch và Đầu tư tỉnh',
      reason: 'Đăng ký doanh nghiệp/công ty thuộc thẩm quyền Sở Kế hoạch và Đầu tư (UBND cấp xã chỉ tiếp nhận đăng ký hộ kinh doanh cá thể nếu có ủy quyền).',
    };
  }

  if (q.includes('rút bhxh') || q.includes('bảo hiểm xã hội một lần') || q.includes('sổ bhxh')) {
    return {
      isOutOfScope: true,
      authority: 'Cơ quan Bảo hiểm xã hội cấp huyện/tỉnh',
      reason: 'Thủ tục giải quyết chế độ BHXH thuộc thẩm quyền cơ quan Bảo hiểm xã hội.',
    };
  }

  if (q.includes('tranh chấp') && (q.includes('thừa kế') || q.includes('chia tài sản') || q.includes('tòa án') || q.includes('khởi kiện') || q.includes('án phí'))) {
    return {
      isOutOfScope: true,
      authority: 'Tòa án nhân dân có thẩm quyền',
      reason: 'Tranh chấp chia di sản thừa kế hoặc tranh chấp tài sản thuộc thẩm quyền xét xử của Tòa án nhân dân, UBND cấp xã không có thẩm quyền phân xử.',
    };
  }

  const generalOutOfScope = [
    'giá vàng', 'chứng khoán', 'bitcoin', 'crypto', 'tiền ảo',
    'bất động sản đầu tư', 'lừa đảo qua mạng', 'tội phạm hình sự',
    'giết người', 'cướp giật', 'bắt cóc', 'thuế xuất nhập khẩu',
    'độ xe', 'bói toán', 'xổ số', 'lô đề', 'thời tiết hôm nay',
    'bẫy ngoài thẩm quyền', 'bẫy ngoài phạm vi'
  ];

  if (generalOutOfScope.some((p) => q.includes(p))) {
    return {
      isOutOfScope: true,
      authority: 'Cơ quan chuyên môn tương ứng hoặc ngoài phạm vi dịch vụ công cấp xã',
      reason: 'Nội dung nằm ngoài danh mục thủ tục hành chính công cấp xã/phường.',
    };
  }

  return { isOutOfScope: false };
}

/**
 * Builds standard, structured catalog response for the 40 commune administrative procedures
 */
export function buildProcedureCatalogResponse(wardName: string = 'UBND cấp xã/phường'): string {
  return `Danh mục các thủ tục hành chính công trọng tâm cấp xã/phường được hỗ trợ tại ${wardName} gồm 5 nhóm chính:

📋 1. LĨNH VỰC HỘ TỊCH & NHÂN THÂN:
• [TTHC-HT-01] Đăng ký khai sinh (thông thường & lưu động)
• [TTHC-HT-02] Đăng ký kết hôn (trong nước)
• [TTHC-HT-03] Cấp Giấy xác nhận tình trạng hôn nhân (Giấy độc thân)
• [TTHC-HT-04] Cấp bản sao Trích lục hộ tịch (khai sinh, kết hôn, khai tử)
• [TTHC-HT-05] Đăng ký khai tử và giải quyết hỗ trợ mai táng
• [TTHC-HT-06] Đăng ký nhận cha, mẹ, con
• [TTHC-HT-07] Thay đổi, cải chính hộ tịch, bổ sung thông tin hộ tịch
• [TTHC-HT-08] Đăng ký giám hộ và chấm dứt giám hộ

🏠 2. LĨNH VỰC QUẢN LÝ CƯ TRÚ (CÔNG AN XÃ/PHƯỜNG & ĐỀ ÁN 06):
• [TTHC-CR-01] Đăng ký thường trú (Nộp tờ khai CT01)
• [TTHC-CR-02] Xóa đăng ký thường trú
• [TTHC-CR-03] Đăng ký tạm trú và gia hạn tạm trú
• [TTHC-CR-04] Khai báo tạm vắng và thông báo lưu trú
• [TTHC-CR-05] Xác nhận thông tin về cư trú (Mẫu CT07)
• [TTHC-CR-06] Tách hộ và điều chỉnh thông tin nơi cư trú

📑 3. LĨNH VỰC CHỨNG THỰC & TƯ PHÁP CƠ SỞ:
• [TTHC-CT-01] Chứng thực bản sao từ bản chính (Sao y văn bằng, giấy tờ)
• [TTHC-CT-02] Chứng thực chữ ký trong các giấy tờ, văn bản cá nhân
• [TTHC-CT-03] Chứng thực hợp đồng, giao dịch liên quan đến tài sản cơ bản
• [TTHC-CT-04] Chứng thực di chúc, văn bản từ chối nhận di sản thừa kế

🤝 4. LĨNH VỰC BẢO TRỢ XÃ HỘI & CHÍNH SÁCH CÔNG:
• [TTHC-BT-01] Trợ cấp xã hội hàng tháng (Người cao tuổi, khuyết tật, trẻ mồ côi)
• [TTHC-BT-02] Hỗ trợ chi phí mai táng cho đối tượng bảo trợ xã hội
• [TTHC-BT-03] Cấp thẻ Bảo hiểm Y tế cho đối tượng bảo trợ xã hội
• [TTHC-BT-04] Trợ giúp xã hội đột xuất cho hộ gia đình khó khăn, thiên tai
• [TTHC-BT-05] Thủ tục xác nhận người có công, gia đình chính sách

🌾 5. LĨNH VỰC ĐỊA CHÍNH & ĐẤT ĐAI CƠ BẢN:
• [TTHC-DD-01] Xác nhận hiện trạng sử dụng đất và tình trạng không có tranh chấp
• [TTHC-DD-02] Tiếp nhận và luân chuyển hồ sơ đăng ký biến động đất đai
• [TTHC-DD-03] Hòa giải tranh chấp đất đai tại cấp xã/phường
• [TTHC-DD-04] Trích lục bản đồ địa chính và hồ sơ thửa đất

👉 Bà con đang cần làm thủ tục nào? Hãy gõ câu hỏi hoặc tên thủ tục (ví dụ: "khai sinh cần giấy tờ gì", "kết hôn mất bao lâu", "hướng dẫn điền CT01") để tôi hướng dẫn chi tiết từng bước nhé!`;
}
