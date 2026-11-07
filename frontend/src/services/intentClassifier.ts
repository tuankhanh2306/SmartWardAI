/**
 * Intent Classifier for SmartWard AI
 * Distinguishes conversational greetings, small talk (wellbeing, gratitude, farewell),
 * procedure catalog inquiries (e.g., "nêu 40 thủ tục"), commune contact queries,
 * out-of-scope inquiries, and genuine administrative procedure inquiries.
 */

/**
 * Removes Vietnamese diacritical marks/accents for robust, fault-tolerant text normalization.
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export const PROCEDURE_KEYWORDS = [
  'khai sinh', 'chứng sinh', 'mới sinh', 'sinh con', 'đẻ con', 'đặt tên cho con', 'giấy khai sinh',
  'khai sanh', 'giấy khai sanh', 'làm giấy khai sanh', 'mần giấy khai sanh', 'sanh con', 'mới sanh', 'chứng sanh',
  'kết hôn', 'lấy vợ', 'lấy chồng', 'hôn thú', 'đăng ký kết hôn', 'kết bạn đời',
  'giá thú', 'mần giấy giá thú', 'tờ giá thú', 'hôn thư',
  'khai tử', 'chứng tử', 'báo tử', 'người mất', 'qua đời', 'giấy chứng tử', 'mần giấy tử', 'mần giấy khai tử',
  'thường trú', 'tạm trú', 'ct01', 'cư trú', 'nhập khẩu', 'hộ khẩu', 'tách hộ', 'chuyển khẩu', 'lưu trú', 'sổ hộ khẩu', 'nhập hộ khẩu', 'tạm vắng',
  'chứng thực', 'sao y', 'công chứng', 'chữ ký', 'bản sao', 'chứng thực chữ ký', 'chứng giấy', 'chứng giấy tờ', 'chứng sao y', 'mần giấy',
  'độc thân', 'xác nhận tình trạng hôn nhân', 'tình trạng hôn nhân', 'chưa kết hôn', 'giấy độc thân',
  'trích lục', 'bản sao trích lục', 'hộ tịch',
  'bảo trợ', 'trợ cấp', 'người cao tuổi', 'khuyết tật', 'mai táng phí', 'tiền già', 'lãnh tiền già', 'chế độ tiền già', 'xin tiền già',
  'đất đai', 'chuyển mục đích', 'đo đạc', 'trích lục bản đồ'
];

/**
 * Checks if the user is asking to view the catalog / list of 40 procedures
 */
export function isProcedureListQuery(query: string): boolean {
  const q = query.trim().toLowerCase().replace(/[!?.,;:]+$/, '');
  if (!q) return false;
  const qNoAccent = removeVietnameseAccents(q);

  // If query contains specific procedure keywords, it is an inquiry about that procedure,
  // NOT a request for the full catalog!
  for (const kw of PROCEDURE_KEYWORDS) {
    if (q.includes(kw) || qNoAccent.includes(removeVietnameseAccents(kw))) {
      return false;
    }
  }

  const listPatterns = [
    'nêu 40 thủ tục', 'nêu thủ tục', 'kể 40 thủ tục', 'kể tên 40 thủ tục', 'kể các thủ tục',
    'kể tên các thủ tục', 'kể tên thủ tục', 'danh sách 40 thủ tục', 'danh sách thủ tục',
    'danh mục 40 thủ tục', 'danh mục thủ tục', 'danh mục tthc', 'danh sách tthc',
    'có những thủ tục nào', 'có bao nhiêu thủ tục', 'gồm những thủ tục nào', 'có các thủ tục nào',
    'liệt kê 40 thủ tục', 'liệt kê các thủ tục', 'liệt kê thủ tục',
    'các thủ tục cấp xã', 'các thủ tục hành chính', 'các thủ tục',
    'hỗ trợ những thủ tục gì', 'hỗ trợ thủ tục nào', 'hỗ trợ những thủ tục nào', 'hỗ trợ những gì', 'làm được những thủ tục nào',
    'giải quyết được những thủ tục gì', 'dịch vụ công tại xã', 'dịch vụ công cấp xã',
    'danh sách dịch vụ', '40 thủ tục', 'xã có thủ tục gì', '5 nhóm thủ tục', 'những việc hành chính'
  ];

  return listPatterns.some((pattern) => {
    return q.includes(pattern) || qNoAccent.includes(removeVietnameseAccents(pattern));
  });
}

export type SmallTalkType = 'GREETING' | 'WELLBEING' | 'THANKS' | 'GOODBYE' | 'HELP' | 'NONE';

/**
 * Checks if the citizen is reporting or asking to report a field/infrastructure incident
 * (e.g., "chỗ tôi hư đường", "sạt lở", "ngập nước", "bạn có thể giúp tôi báo lên cán bộ không")
 */
export function isIncidentReportQuery(query: string): boolean {
  const q = query.trim().toLowerCase().replace(/[!?.,;:]+$/, '');
  if (!q) return false;
  const qNoAccent = removeVietnameseAccents(q);

  for (const kw of PROCEDURE_KEYWORDS) {
    if (q.includes(kw) || qNoAccent.includes(removeVietnameseAccents(kw))) {
      return false;
    }
  }

  const incidentPatterns = [
    'hư đường', 'hu duong', 'ổ gà', 'o ga', 'sụp cống', 'sup cong', 'bể ống nước', 'be ong nuoc',
    'sạt lở', 'sat lo', 'ngập nước', 'ngap nuoc', 'triều cường', 'trieu cuong',
    'đứt dây điện', 'dut day dien', 'cháy đèn đường', 'chay den duong', 'mất đèn đường',
    'cây ngã', 'cay nga', 'cây đổ', 'cay do', 'rác thải', 'rac thai', 'ô nhiễm', 'o nhiem',
    'báo sự cố', 'bao su co', 'báo tin khẩn', 'bao tin khan', 'phản ánh hiện trường', 'phan anh hien truong',
    'báo lên cán bộ', 'bao len can bo', 'báo cán bộ', 'bao can bo', 'báo cho xã', 'bao cho xa', 'báo công an xã'
  ];

  return incidentPatterns.some((p) => q.includes(p) || qNoAccent.includes(removeVietnameseAccents(p)));
}

/**
 * Classifies conversational small talk or greetings
 */
export function classifySmallTalk(query: string): { matched: boolean; type: SmallTalkType } {
  const q = query.trim().toLowerCase().replace(/[!?.,;:]+$/, '');
  if (!q) return { matched: false, type: 'NONE' };
  const qNoAccent = removeVietnameseAccents(q);

  // Do not classify field incident reports as generic small talk / help
  if (isIncidentReportQuery(query)) {
    return { matched: false, type: 'NONE' };
  }

  // If query explicitly contains specific procedure keywords, it is a PROCEDURE query!
  for (const kw of PROCEDURE_KEYWORDS) {
    if (q.includes(kw) || qNoAccent.includes(removeVietnameseAccents(kw))) {
      return { matched: false, type: 'NONE' };
    }
  }

  // 1. Wellbeing / Social Small Talk ("hôm nay thế nào", "khỏe không"...)
  const wellbeingPatterns = [
    'hôm nay thế nào', 'hôm nay ra sao', 'hôm nay bạn thế nào', 'hôm nay sao rồi', 'hôm nay ổn không',
    'ngày mới thế nào', 'ngày mới ra sao', 'khỏe không', 'bạn khỏe không', 'cán bộ khỏe không', 'dạo này thế nào',
    'thế nào rồi', 'chúc ngày mới', 'chúc một ngày tốt lành', 'buổi sáng tốt lành', 'ngày tốt lành'
  ];
  if (wellbeingPatterns.some((p) => q.includes(p) || qNoAccent.includes(removeVietnameseAccents(p)))) {
    return { matched: true, type: 'WELLBEING' };
  }

  // 2. Gratitude / Affirmation ("cảm ơn", "thanks", "ok"...)
  const thanksPatterns = [
    'cảm ơn', 'cam on', 'cảm ơn bạn', 'cảm ơn cán bộ', 'cảm ơn nhiều', 'cảm ơn nha', 'cảm ơn nhé',
    'thanks', 'thank you', 'tuyệt vời', 'tốt lắm', 'rất tốt', 'chu đáo quá', 'được rồi',
    'hiểu rồi', 'rõ rồi', 'ok bạn', 'oke bạn'
  ];
  const exactThanks = new Set(['ok', 'oke', 'ok!', 'oke!', 'thank', 'thanks', 'cảm ơn', 'cam on']);
  if (exactThanks.has(q) || exactThanks.has(qNoAccent) || thanksPatterns.some((p) => q === p || qNoAccent === removeVietnameseAccents(p) || q.startsWith(p + ' '))) {
    return { matched: true, type: 'THANKS' };
  }

  // 3. Goodbye / Farewell ("tạm biệt", "bye"...)
  const goodbyePatterns = ['tạm biệt', 'tam biet', 'bye', 'bye bye', 'hẹn gặp lại', 'chào tạm biệt'];
  if (goodbyePatterns.some((p) => q.includes(p) || qNoAccent.includes(removeVietnameseAccents(p)))) {
    return { matched: true, type: 'GOODBYE' };
  }

  // 4. Standard Greetings / Introductions ("hi", "hello", "xin chào"...)
  const exactGreetings = new Set([
    'hi', 'hello', 'hey', 'alo', 'chào', 'xin chào', 'kính chào',
    'chào bạn', 'chào bạn nha', 'chào bạn nhé', 'chao ban', 'chao anh chi', 'chao',
    'chào bot', 'chào ad', 'chào cán bộ', 'chào ủy ban', 'kính chào ủy ban',
    'chào anh', 'chào chị', 'chào em', 'cán bộ ơi', 'cán bộ oi', 'ad ơi',
    'bạn là ai', 'ai đó', 'bạn là cái gì', 'chức năng của trợ lý là gì', 'chức năng của bạn',
    'bạn giúp được gì', 'bạn có thể làm gì', 'bạn làm việc thế nào',
    'hướng dẫn sử dụng', 'giới thiệu', 'giới thiệu bản thân',
    'good morning', 'good afternoon', 'good evening',
    'start', 'bắt đầu'
  ]);
  if (exactGreetings.has(q) || exactGreetings.has(qNoAccent)) {
    return { matched: true, type: 'GREETING' };
  }

  if (q.length <= 40) {
    const greetingRegex = /^(hi+|hello+|hey+|alo+|xin+\s*chao[a-z]{0,3}|xin+\s*chào[a-z]{0,3}|chao[a-z]{0,3}|chào[a-z]{0,3}|kinh\s+chao|kính\s+chào)(\s+.*)?$/i;
    if (greetingRegex.test(q) || greetingRegex.test(qNoAccent)) {
      return { matched: true, type: 'GREETING' };
    }
    const identityRegex = /^(bạn|bot|tro\s+ly|trợ\s+lý)\s+(là\s+ai|có\s+thể\s+làm\s+gì|giúp\s+gì|giúp\s+được\s+gì|giup\s+duoc\s+gi|giup\s+gi|làm\s+việc\s+thế\s+nào|chức\s+năng)/i;
    if (identityRegex.test(q) || identityRegex.test(qNoAccent) || qNoAccent.includes('giup duoc gi') || qNoAccent.includes('giup gi cho toi')) {
      return { matched: true, type: 'GREETING' };
    }

    // Typo-tolerant greeting: "chaogf ban", "chaof", "chaoof", "xin chaoo", "xinn chaof", "helo", "hii"
    const firstToken = qNoAccent.split(/\s+/)[0] || '';
    const typoGreetingRoots = ['chao', 'xinchao', 'xinnchao', 'hello', 'helo', 'alo'];
    if (
      typoGreetingRoots.some((root) => firstToken.startsWith(root) && firstToken.length <= root.length + 2) ||
      /^hi+$/.test(firstToken) ||
      /^xin+\s*chao[a-z]{0,3}\b/i.test(qNoAccent) ||
      /\b(chaof|chaoof|chaogf|xinn?\s*chao[a-z]{0,3})\b/i.test(qNoAccent)
    ) {
      return { matched: true, type: 'GREETING' };
    }
  }

  // 5. Generic help request without a specific procedure ("bạn có thể tư vấn cho tôi không", "cho tôi hỏi chút")
  if (q.length <= 80) {
    const helpPatterns = [
      'tu van', 'tuw van', 'giup toi', 'giupf toi', 'giups toi', 'giup minh', 'giup em', 'giup voi', 'giupf', 'giups', 'ho tro toi', 'ho tro minh',
      'cho toi hoi', 'cho minh hoi', 'cho em hoi', 'hoi chut', 'hoi xiu', 'hoi ti', 'muon hoi',
      'can giup', 'can ho tro', 'can tu van', 'nho ban', 'lam on', 'co the tu van', 'co the giup'
    ];
    if (helpPatterns.some((p) => qNoAccent.includes(p)) && !checkOutOfScopeQuery(query).isOutOfScope) {
      return { matched: true, type: 'HELP' };
    }
  }

  return { matched: false, type: 'NONE' };
}

export function isGreetingQuery(query: string): boolean {
  return classifySmallTalk(query).matched;
}

export function isWardOfficeQuery(query: string): boolean {
  const q = query.trim().toLowerCase();

  // If query is out-of-scope (e.g. Passports, BHXH, Driver license), it must NEVER be routed to ward office info
  if (checkOutOfScopeQuery(query).isOutOfScope) {
    return false;
  }

  const qNoAccent = removeVietnameseAccents(q);

  for (const kw of PROCEDURE_KEYWORDS) {
    if (q.includes(kw) || qNoAccent.includes(removeVietnameseAccents(kw))) {
      return false;
    }
  }

  // Location/HQ checks (preventing "xa hoi" from falsely matching "xa")
  const hasOfficeKeyword =
    qNoAccent.includes('ubnd') ||
    qNoAccent.includes('uy ban') ||
    qNoAccent.includes('mot cua') ||
    qNoAccent.includes('tru so') ||
    qNoAccent.includes('tiep dan') ||
    /(^|\s)(ubnd|uy ban|phuong)(\s|$)/.test(qNoAccent) ||
    (/(^|\s)xa(\s|$)/.test(qNoAccent) && !qNoAccent.includes('xa hoi'));

  const isLocationHQ =
    (qNoAccent.includes('o dau') || qNoAccent.includes('nam o dau') || qNoAccent.includes('dia chi') || qNoAccent.includes('tru so') || qNoAccent.includes('duong nao') || qNoAccent.includes('duong di')) &&
    hasOfficeKeyword;

  if (isLocationHQ) {
    return true;
  }

  // Working hours and contact checks
  const isHoursOrContact =
    qNoAccent.includes('gio lam viec') ||
    qNoAccent.includes('may gio') ||
    qNoAccent.includes('thoi gian lam viec') ||
    qNoAccent.includes('thoi gian tiep') ||
    qNoAccent.includes('gio tiep dan') ||
    qNoAccent.includes('tiep dan') ||
    qNoAccent.includes('tiep nhan') ||
    qNoAccent.includes('mo cua') ||
    qNoAccent.includes('dong cua') ||
    qNoAccent.includes('thu 7') ||
    qNoAccent.includes('thu bay') ||
    qNoAccent.includes('chu nhat') ||
    qNoAccent.includes('so dien thoai') ||
    qNoAccent.includes('sdt') ||
    qNoAccent.includes('hotline') ||
    qNoAccent.includes('tong dai') ||
    qNoAccent.includes('lien he ai');

  if (isHoursOrContact) {
    return true;
  }

  return false;
}

export interface OutOfScopeResult {
  isOutOfScope: boolean;
  authority?: string;
  reason?: string;
}

export function checkOutOfScopeQuery(query: string): OutOfScopeResult {
  // Normalize digits (e.g., "\b1\b" -> "một", "1 lần" -> "một lần") so queries like "rút bảo hiểm xã hội 1 lần" match reliably
  const normalized = query.toLowerCase().replace(/\b1\b/g, 'một');
  const q = normalized.trim();

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

  if (q.includes('rút bhxh') || q.includes('bảo hiểm xã hội một lần') || q.includes('sổ bhxh') || q.includes('bảo hiểm xã hội') || q.includes('bhxh')) {
    return {
      isOutOfScope: true,
      authority: 'Cơ quan Bảo hiểm xã hội cấp huyện/tỉnh',
      reason: 'Thủ tục giải quyết chế độ BHXH thuộc thẩm quyền cơ quan Bảo hiểm xã hội.',
    };
  }

  if (q.includes('lý lịch tư pháp') || q.includes('phiếu lý lịch tư pháp') || q.includes('lltp')) {
    return {
      isOutOfScope: true,
      authority: 'Sở Tư pháp cấp tỉnh hoặc Trung tâm Lý lịch tư pháp quốc gia',
      reason: 'Thủ tục cấp Phiếu lý lịch tư pháp thuộc thẩm quyền của Sở Tư pháp cấp tỉnh hoặc Trung tâm Lý lịch tư pháp quốc gia, không thuộc thẩm quyền UBND cấp xã.',
    };
  }

  if (q.includes('biển số xe') || q.includes('đăng ký xe máy') || q.includes('đăng ký ô tô') || q.includes('cà vẹt xe') || q.includes('sang tên xe') || q.includes('đăng ký xe')) {
    return {
      isOutOfScope: true,
      authority: 'Công an cấp huyện hoặc Phòng Cảnh sát giao thông Công an tỉnh',
      reason: 'Thủ tục đăng ký phương tiện giao thông và cấp biển số xe thuộc thẩm quyền cơ quan Công an cấp huyện hoặc Phòng CSGT Công an tỉnh.',
    };
  }

  if (q.includes('căn cước công dân') || q.includes('làm cccd') || q.includes('thẻ căn cước') || q.includes('cấp căn cước')) {
    return {
      isOutOfScope: true,
      authority: 'Công an cấp huyện (Bộ phận Cấp thẻ Căn cước)',
      reason: 'Thủ tục cấp mới, cấp đổi thẻ Căn cước công dân thuộc thẩm quyền của Công an cấp huyện, không thuộc thẩm quyền giải quyết của UBND cấp xã.',
    };
  }

  if (q.includes('tranh chấp') && (q.includes('thừa kế') || q.includes('chia tài sản') || q.includes('tòa án') || q.includes('khởi kiện') || q.includes('án phí') || q.includes('kiện tụng'))) {
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
