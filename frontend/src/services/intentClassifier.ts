/**
 * Intent Classifier for SmartWard AI
 * Distinguishes conversational greetings, commune contact queries, out-of-scope inquiries,
 * and genuine administrative procedure inquiries.
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

export function isGreetingQuery(query: string): boolean {
  const q = query.trim().toLowerCase().replace(/[!?.,;:]+$/, '');
  if (!q) return false;

  // If query contains explicit procedure keywords, it is a PROCEDURE query, NOT a greeting
  for (const kw of PROCEDURE_KEYWORDS) {
    if (q.includes(kw)) {
      return false;
    }
  }

  // Exact greeting phrases
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
    return true;
  }

  // Short queries matching greeting patterns
  if (q.length <= 30) {
    const greetingRegex = /^(hi|hello|hey|alo|xin\s+chào|chào)(\s+.*)?$/i;
    if (greetingRegex.test(q)) {
      return true;
    }
    const identityRegex = /^(bạn|bot)\s+(là\s+ai|có\s+thể\s+làm\s+gì|giúp\s+gì)/i;
    if (identityRegex.test(q)) {
      return true;
    }
  }

  return false;
}

export function isWardOfficeQuery(query: string): boolean {
  const q = query.trim().toLowerCase();

  // If query contains procedure keywords like "thủ tục làm khai sinh tại ubnd ở đâu", prefer procedure guide
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
