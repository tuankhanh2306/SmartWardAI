/**
 * Core Legal Knowledge Base for SmartWard AI
 * Contains structured, verified administrative procedures (40 TTHC cấp xã)
 * used to ground the Gemini Mini RAG Engine.
 */

export interface LegalProcedureItem {
  code: string;
  name: string;
  category: 'Hộ tịch' | 'Cư trú' | 'Chứng thực' | 'Bảo trợ xã hội' | 'Đất đai';
  legalBasis: string;
  timeLimit: string;
  fee: string;
  authority: string;
  dossier: string[];
  keyRules: string[];
  keywords: string[];
}

export const LEGAL_KNOWLEDGE_BASE: LegalProcedureItem[] = [
  // --- HỘ TỊCH ---
  {
    code: 'TTHC-HT-01',
    name: 'Đăng ký khai sinh',
    category: 'Hộ tịch',
    legalBasis: 'Điều 15, 16 Luật Hộ tịch 2014; Nghị định 123/2015/NĐ-CP; Thông tư 04/2020/TT-BTP',
    timeLimit: 'Giải quyết trong 01 ngày làm việc (trường hợp cần xác minh thì không quá 05 ngày làm việc)',
    fee: 'Miễn phí hoàn toàn khi đăng ký đúng hạn (trong 60 ngày kể từ ngày sinh); Đăng ký quá hạn thu theo HĐND cấp tỉnh',
    authority: 'UBND cấp xã nơi cư trú của cha hoặc mẹ',
    dossier: [
      'Tờ khai đăng ký khai sinh theo mẫu',
      'Bản chính Giấy chứng sinh do cơ sở khám chữa bệnh cấp (nếu không có: văn bản xác nhận của người làm chứng hoặc giấy cam đoan về việc sinh)',
      'Văn bản ủy quyền (nếu ủy quyền thực hiện; trường hợp là ông, bà, cha, mẹ, anh, chị, em ruột thì không cần chứng thực)',
      'Xuất trình CCCD/Hộ chiếu của người đi đăng ký và Giấy chứng nhận kết hôn của cha mẹ (nếu đã kết hôn)',
    ],
    keyRules: [
      'Thời hạn đi đăng ký khai sinh là trong vòng 60 ngày kể từ ngày trẻ chào đời.',
      'Nếu chưa xác định được người cha thì họ, dân tộc, quê quán, quốc tịch của con xác định theo mẹ; phần thông tin người cha để trống.',
      'Trường hợp trẻ bị bỏ rơi: Cán bộ tư pháp lập biên bản, niêm yết 7 ngày liên tục tại trụ sở UBND trước khi làm khai sinh.',
      'Trẻ sinh ra do mang thai hộ: Phải có văn bản xác nhận của cơ sở y tế đã thực hiện kỹ thuật hỗ trợ sinh sản.',
    ],
    keywords: ['khai sinh', 'chứng sinh', 'mới sinh', 'sinh con', 'đẻ con', 'đặt tên cho con', 'giấy khai sinh', 'đăng ký sinh'],
  },
  {
    code: 'TTHC-HT-02',
    name: 'Đăng ký kết hôn',
    category: 'Hộ tịch',
    legalBasis: 'Điều 17, 18 Luật Hộ tịch 2014; Điều 8 Luật Hôn nhân và Gia đình 2014; Nghị định 123/2015/NĐ-CP',
    timeLimit: 'Giải quyết ngay trong ngày tiếp nhận hồ sơ đủ điều kiện (nếu cần xác minh thì không quá 05 ngày làm việc)',
    fee: 'Miễn phí hoàn toàn cho công dân cư trú trên địa bàn xã/phường',
    authority: 'UBND cấp xã nơi cư trú của một trong hai bên nam, nữ',
    dossier: [
      'Tờ khai đăng ký kết hôn theo mẫu quy định (hai bên có thể khai chung)',
      'Bản chính Giấy xác nhận tình trạng hôn nhân của bên không thường trú tại địa phương đăng ký',
      'Xuất trình CCCD/Hộ chiếu còn hiệu lực của cả hai bên nam và nữ',
      'Trường hợp đã ly hôn hoặc vợ/chồng đã mất: Nộp Bản án/Quyết định ly hôn đã có hiệu lực hoặc Giấy chứng tử',
    ],
    keyRules: [
      'Điều kiện kết hôn: Nam từ đủ 20 tuổi trở lên, nữ từ đủ 18 tuổi trở lên; tự nguyện quyết định; không mất năng lực hành vi dân sự.',
      'Cấm kết hôn: Kết hôn giả tạo; tảo hôn; cưỡng ép; đang có vợ/chồng; người có cùng dòng máu trực hệ, phạm vi ba đời.',
      'BẮT BUỘC cả hai bên nam nữ phải trực tiếp có mặt tại UBND cấp xã ký vào Sổ hộ tịch và Giấy chứng nhận kết hôn.',
    ],
    keywords: ['kết hôn', 'đăng ký kết hôn', 'lấy vợ', 'lấy chồng', 'giấy kết hôn', 'hôn thú', 'làm hôn thú'],
  },
  {
    code: 'TTHC-HT-04',
    name: 'Cấp bản sao Trích lục hộ tịch (khai sinh, kết hôn, khai tử...)',
    category: 'Hộ tịch',
    legalBasis: 'Điều 63, 64 Luật Hộ tịch 2014; Nghị định 123/2015/NĐ-CP; Thông tư 04/2020/TT-BTP',
    timeLimit: 'Giải quyết ngay trong ngày làm việc tiếp nhận yêu cầu (nếu nhận sau 15h thì trả vào ngày làm việc tiếp theo)',
    fee: '8.000 đồng / một bản sao trích lục',
    authority: 'Cơ quan quản lý Cơ sở dữ liệu hộ tịch điện tử (bất kỳ UBND cấp xã nào trên toàn quốc)',
    dossier: [
      'Tờ khai cấp bản sao trích lục hộ tịch theo mẫu',
      'Xuất trình CCCD hoặc giấy tờ tùy thân có dán ảnh còn giá trị sử dụng',
      'Văn bản ủy quyền (nếu ủy quyền cho người khác yêu cầu cấp trích lục; trừ trường hợp ông, bà, cha, mẹ, con, vợ, chồng, anh chị em ruột)',
    ],
    keyRules: [
      'Nhờ kết nối Cơ sở dữ liệu hộ tịch điện tử toàn quốc, công dân có thể xin trích lục tại BẤT KỲ UBND phường/xã nào, không bắt buộc về nơi đã đăng ký trước đây.',
      'Bản sao trích lục có giá trị sử dụng thay thế bản chính trong các giao dịch dân sự và thủ tục hành chính.',
    ],
    keywords: ['trích lục', 'bản sao khai sinh', 'trích lục kết hôn', 'trích lục khai tử', 'xin lại giấy khai sinh', 'cấp lại trích lục'],
  },
  {
    code: 'TTHC-HT-11',
    name: 'Cấp Giấy xác nhận tình trạng hôn nhân (Giấy độc thân)',
    category: 'Hộ tịch',
    legalBasis: 'Điều 21, 22, 23 Luật Hộ tịch 2014; Nghị định 123/2015/NĐ-CP; Thông tư 04/2020/TT-BTP',
    timeLimit: '03 ngày làm việc kể từ ngày nhận đủ hồ sơ hợp lệ (trường hợp cần gửi công văn xác minh thì tối đa 20 ngày)',
    fee: 'Miễn phí hoặc theo quy định HĐND tỉnh (thường 10.000 - 15.000 đồng/bản)',
    authority: 'UBND cấp xã nơi công dân thường trú hoặc tạm trú (nếu không có nơi thường trú)',
    dossier: [
      'Tờ khai cấp Giấy xác nhận tình trạng hôn nhân theo mẫu',
      'Xuất trình CCCD gắn chip',
      'Trường hợp đã ly hôn: Nộp bản sao bản án/quyết định ly hôn đã có hiệu lực pháp luật',
      'Trường hợp vợ/chồng đã mất: Nộp bản sao Giấy chứng tử',
      'Trường hợp đã từng cư trú nhiều nơi: Tự kê khai quá trình cư trú; UBND xã có trách nhiệm phối hợp tra cứu liên thông',
    ],
    keyRules: [
      'Giấy xác nhận tình trạng hôn nhân có giá trị sử dụng 06 tháng kể từ ngày cấp hoặc đến thời điểm kết hôn.',
      'Giấy được cấp để sử dụng vào mục đích cụ thể: Đăng ký kết hôn, vay vốn ngân hàng, mua bán bất động sản... Không được dùng sai mục đích ghi trong giấy.',
    ],
    keywords: ['xác nhận tình trạng hôn nhân', 'giấy độc thân', 'độc thân', 'chứng nhận độc thân', 'xác nhận độc thân'],
  },

  // --- CƯ TRÚ ---
  {
    code: 'TTHC-CR-01',
    name: 'Đăng ký thường trú',
    category: 'Cư trú',
    legalBasis: 'Điều 20, 21, 22 Luật Cư trú 2020; Nghị định 62/2021/NĐ-CP; Thông tư 55/2021/TT-BCA',
    timeLimit: '07 ngày làm việc kể từ ngày nhận được hồ sơ đầy đủ và hợp lệ',
    fee: 'Thu theo quy định HĐND tỉnh/thành phố (trực tuyến 10.000đ, trực tiếp 20.000đ; miễn phí cho hộ nghèo, người có công)',
    authority: 'Công an xã, phường, thị trấn nơi công dân đến đăng ký thường trú',
    dossier: [
      'Tờ khai thay đổi thông tin cư trú (Mẫu CT01)',
      'Giấy tờ, tài liệu chứng minh chỗ ở hợp pháp (Sổ đỏ, Hợp đồng mua bán nhà, Hợp đồng thuê nhà có công chứng...)',
      'Trường hợp về ở với người thân (vợ/chồng, cha mẹ, con cái): Ý kiến đồng ý bằng văn bản của chủ hộ và chủ sở hữu chỗ ở hợp pháp ghi vào Mẫu CT01',
    ],
    keyRules: [
      'Sổ hộ khẩu giấy đã chính thức hết giá trị sử dụng từ ngày 01/01/2023. Toàn bộ thông tin cư trú được số hóa quản lý trên Cơ sở dữ liệu quốc gia về dân cư.',
      'Công dân có chỗ ở hợp pháp thuộc quyền sở hữu của mình thì được đăng ký thường trú tại chỗ ở hợp pháp đó.',
      'Công dân có thể nộp hồ sơ trực tuyến tiện lợi qua Cổng Dịch vụ công Bộ Công an hoặc Ứng dụng VNeID.',
    ],
    keywords: ['thường trú', 'nhập hộ khẩu', 'đăng ký thường trú', 'mẫu ct01', 'chuyển hộ khẩu', 'sổ hộ khẩu', 'nhập khẩu'],
  },
  {
    code: 'TTHC-CR-03',
    name: 'Đăng ký tạm trú',
    category: 'Cư trú',
    legalBasis: 'Điều 27, 28 Luật Cư trú 2020; Thông tư 55/2021/TT-BCA',
    timeLimit: '03 ngày làm việc kể từ ngày nhận đủ hồ sơ hợp lệ',
    fee: '15.000 đồng (nộp trực tiếp) hoặc 7.000 đồng (nộp trực tuyến)',
    authority: 'Công an xã, phường, thị trấn nơi công dân dự kiến tạm trú',
    dossier: [
      'Tờ khai thay đổi thông tin cư trú (Mẫu CT01)',
      'Giấy tờ, tài liệu chứng minh chỗ ở hợp pháp (Hợp đồng thuê nhà, mượn nhà, ở nhờ...)',
      'Văn bản đồng ý của chủ hộ, chủ sở hữu chỗ ở hợp pháp cho đăng ký tạm trú',
    ],
    keyRules: [
      'Công dân đến sinh sống tại chỗ ở hợp pháp ngoài phạm vi đơn vị hành chính cấp xã nơi đã đăng ký thường trú để lao động, học tập hoặc mục đích khác từ 30 ngày trở lên thì phải đăng ký tạm trú.',
      'Thời hạn tạm trú tối đa là 02 năm/lần và có thể gia hạn nhiều lần.',
    ],
    keywords: ['tạm trú', 'đăng ký tạm trú', 'ở trọ', 'thuê phòng trọ', 'tạm trú 2 năm', 'gia hạn tạm trú'],
  },
  {
    code: 'TTHC-CR-08',
    name: 'Xác nhận thông tin về cư trú (Mẫu CT07)',
    category: 'Cư trú',
    legalBasis: 'Điều 17 Thông tư 55/2021/TT-BCA (sửa đổi bổ sung bởi Thông tư 66/2023/TT-BCA)',
    timeLimit: '01 ngày làm việc (trường hợp thông tin có sẵn trong CSDL) hoặc 03 ngày làm việc (nếu cần xác minh)',
    fee: 'Miễn phí hoặc theo quy định lệ phí cư trú',
    authority: 'Công an xã, phường, thị trấn trên toàn quốc',
    dossier: [
      'Tờ khai thay đổi thông tin cư trú (Mẫu CT01)',
      'Xuất trình CCCD hoặc cung cấp thông tin định danh cá nhân',
    ],
    keyRules: [
      'Xác nhận thông tin về cư trú (CT07) có giá trị 01 năm kể từ ngày cấp (đối với trường hợp thông tin cư trú không thay đổi) hoặc có giá trị 30 ngày (đối với người không có nơi thường trú, tạm trú).',
      'Nếu cơ quan hành chính đã khai thác được thông tin cư trú trên VNeID hoặc Cổng DVC, công dân KHÔNG phải xin giấy CT07 giấy.',
    ],
    keywords: ['ct07', 'xác nhận cư trú', 'giấy xác nhận thông tin cư trú', 'chứng minh nơi ở', 'mẫu ct07'],
  },

  // --- CHỨNG THỰC ---
  {
    code: 'TTHC-CT-01',
    name: 'Chứng thực bản sao từ bản chính (Sao y chứng thực)',
    category: 'Chứng thực',
    legalBasis: 'Điều 19, 20 Nghị định 23/2015/NĐ-CP; Thông tư 01/2020/TT-BTP',
    timeLimit: 'Giải quyết ngay trong ngày làm việc tiếp nhận yêu cầu (nếu số lượng từ 50 trang trở lên thì tối đa không quá 02 ngày làm việc)',
    fee: '2.000 đồng / trang (từ trang thứ 3 trở đi thu 1.000 đồng/trang, tối đa không quá 200.000 đồng/bản)',
    authority: 'Bộ phận Tiếp nhận và Trả kết quả (Một cửa) UBND cấp xã / Phòng Tư pháp / Văn phòng Công chứng',
    dossier: [
      'Bản chính giấy tờ, văn bản làm cơ sở để chứng thực bản sao',
      'Bản sao cần chứng thực (nếu công dân tự photo trước; nếu không thì UBND sẽ photo và thu tiền photo theo giá quy định)',
    ],
    keyRules: [
      'Người thực hiện chứng thực kiểm tra bản chính, đối chiếu bản sao; nếu bản sao đầy đủ, chính xác nội dung so với bản chính thì ký và đóng dấu.',
      'CÁC TRƯỜNG HỢP KHÔNG ĐƯỢC CHỨNG THỰC BẢN SAO: Bản chính bị tẩy xóa, sửa chữa, thêm bớt không hợp lệ; Bản chính bị hư hỏng, rách nát không xác định được nội dung; Bản chính có đóng dấu mật; Bản chính do cơ quan nước ngoài cấp mà chưa được hợp pháp hóa lãnh sự; Giấy tờ giả mạo.',
    ],
    keywords: ['sao y', 'công chứng', 'chứng thực bản sao', 'chứng thực bằng', 'photo công chứng', 'sao y bản chính', 'phí công chứng'],
  },
  {
    code: 'TTHC-CT-02',
    name: 'Chứng thực chữ ký trong các giấy tờ, văn bản',
    category: 'Chứng thực',
    legalBasis: 'Điều 23, 24, 25 Nghị định 23/2015/NĐ-CP; Thông tư 01/2020/TT-BTP',
    timeLimit: 'Giải quyết ngay trong ngày làm việc',
    fee: '10.000 đồng / trường hợp (trường hợp được tính theo chữ ký của một người trên một văn bản)',
    authority: 'UBND cấp xã / Phòng Tư pháp / Phòng Công chứng',
    dossier: [
      'Bản chính hoặc bản sao có chứng thực Giấy CCCD hoặc Hộ chiếu còn giá trị',
      'Giấy tờ, văn bản mà mình sẽ ký vào đó (Lưu ý: KHÔNG KÝ TRƯỚC Ở NHÀ)',
    ],
    keyRules: [
      'BẮT BUỘC người yêu cầu chứng thực phải ký trực tiếp trước mặt người thực hiện chứng thực (cán bộ tư pháp - hộ tịch).',
      'Không chứng thực chữ ký trong các trường hợp: Người yêu cầu mất năng lực hành vi dân sự; Giấy tờ văn bản có nội dung trái pháp luật, đạo đức xã hội; Giấy tờ văn bản dùng để trốn tránh nghĩa vụ.',
    ],
    keywords: ['chứng thực chữ ký', 'ký xác nhận', 'chứng chữ ký', 'ký trước mặt công chứng', 'xác nhận chữ ký'],
  },

  // --- BẢO TRỢ XÃ HỘI ---
  {
    code: 'TTHC-BT-01',
    name: 'Trợ cấp xã hội hàng tháng cho đối tượng bảo trợ xã hội',
    category: 'Bảo trợ xã hội',
    legalBasis: 'Nghị định 20/2021/NĐ-CP của Chính phủ; Thông tư 02/2021/TT-BLĐTBXH',
    timeLimit: '15 ngày làm việc (UBND cấp xã xem xét, niêm yết công khai và gửi Phòng LĐ-TB&XH cấp huyện ra quyết định)',
    fee: 'Miễn phí hoàn toàn',
    authority: 'UBND cấp xã tiếp nhận hồ sơ xét duyệt ban đầu, Chủ tịch UBND cấp huyện quyết định chi trả',
    dossier: [
      'Tờ khai thông tin người được trợ cấp xã hội (theo mẫu quy định tại NĐ 20/2021/NĐ-CP)',
      'Bản sao Giấy khai sinh (đối với trẻ em mồ côi, trẻ khuyết tật)',
      'Bản sao Giấy xác nhận mức độ khuyết tật (đối với người khuyết tật nặng/đặc biệt nặng)',
      'Giấy tờ xác nhận đối tượng nhiễm HIV, hộ nghèo/cận nghèo (nếu thuộc diện tương ứng)',
    ],
    keyRules: [
      'Đối tượng được hưởng: Trẻ em dưới 16 tuổi không có nguồn nuôi dưỡng; Người cao tuổi thuộc hộ nghèo không có người phụng dưỡng; Người khuyết tật nặng và đặc biệt nặng; Người đơn thân nghèo đang nuôi con.',
      'Mức chuẩn trợ giúp xã hội theo NĐ 20/2021/NĐ-CP là 360.000 đồng/tháng (được nhân với hệ số tương ứng từng nhóm đối tượng, TP.HCM áp dụng chuẩn riêng cao hơn theo Nghị quyết HĐND TP).',
    ],
    keywords: ['trợ cấp xã hội', 'bảo trợ xã hội', 'tiền trợ cấp', 'người khuyết tật', 'người già neo đơn', 'mồ côi', 'trợ cấp hàng tháng'],
  },
  {
    code: 'TTHC-BT-02',
    name: 'Hỗ trợ chi phí mai táng cho đối tượng bảo trợ xã hội',
    category: 'Bảo trợ xã hội',
    legalBasis: 'Điều 11 Nghị định 20/2021/NĐ-CP; Thông tư 02/2021/TT-BLĐTBXH',
    timeLimit: '05 ngày làm việc kể từ ngày nhận đủ hồ sơ hợp lệ',
    fee: 'Miễn phí hoàn toàn',
    authority: 'UBND cấp xã tiếp nhận, Chủ tịch UBND cấp huyện ra quyết định hỗ trợ',
    dossier: [
      'Tờ khai đề nghị hỗ trợ chi phí mai táng theo mẫu',
      'Bản sao Giấy chứng tử của đối tượng qua đời',
      'Bản sao sổ hộ khẩu hoặc xác nhận cư trú của người đứng ra tổ chức mai táng',
    ],
    keyRules: [
      'Áp dụng khi đối tượng đang hưởng trợ cấp xã hội hàng tháng qua đời, hoặc trẻ em/người lang thang cơ nhỡ qua đời trên địa bàn xã.',
      'Mức hỗ trợ mai táng tối thiểu bằng 20 lần mức chuẩn trợ giúp xã hội (tối thiểu 7.200.000 đồng).',
    ],
    keywords: ['tiền mai táng', 'hỗ trợ mai táng', 'mai táng phí', 'chi phí mai táng', 'chết có trợ cấp mai táng'],
  },
];

import { isGreetingQuery, isProcedureListQuery, checkOutOfScopeQuery } from './intentClassifier';

const STOP_WORDS = new Set([
  'la', 'là', 'va', 'và', 'cua', 'của', 'cho', 'co', 'có', 'tai', 'tại', 'o', 'ở',
  'gi', 'gì', 'nao', 'nào', 'dau', 'đâu', 'duoc', 'được', 'nhu', 'như', 'the', 'thế',
  'thi', 'thì', 'ra', 'sao', 'toi', 'tôi', 'muon', 'muốn', 'hay', 'hãy', 'lam', 'làm',
  'can', 'cần', 'giup', 'giúp', 'em', 'anh', 'chi', 'chị', 'minh', 'mình', 'nay', 'này',
  'do', 'đó', 'voi', 'với', 've', 'về', 'trong', 'cac', 'các', 'nhung', 'những', 'mot', 'một',
  'da', 'dạ', 'a', 'ạ', 'nhe', 'nhé', 'nha', 'di', 'đi', 'giùm', 'dum', 'hi', 'hello', 'alo', 'chao', 'chào'
]);

/**
 * Searches the legal knowledge base using keyword / semantic scoring
 */
export function searchLegalKnowledge(query: string, topK: number = 3): {
  items: LegalProcedureItem[];
  maxScore: number;
  isInScope: boolean;
} {
  const q = query.toLowerCase().trim();

  // 1. Check if greeting, small talk, or asking for full procedure catalog
  if (isGreetingQuery(q) || isProcedureListQuery(q)) {
    return { items: [], maxScore: 0.0, isInScope: false };
  }

  // 2. Out of scope check (Forbidden / Non-commune domains)
  const outOfScopeCheck = checkOutOfScopeQuery(q);
  if (outOfScopeCheck.isOutOfScope) {
    return { items: [], maxScore: 0.15, isInScope: false };
  }

  // 3. Extract meaningful non-stop content tokens
  const queryTokens = q
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  const scored = LEGAL_KNOWLEDGE_BASE.map((item) => {
    let score = 0;

    // Check exact keyword match (highest confidence)
    for (const kw of item.keywords) {
      if (q.includes(kw)) {
        score += 0.50;
        break;
      }
    }

    // Check procedure name
    if (q.includes(item.name.toLowerCase())) {
      score += 0.40;
    }

    // Whole-word token intersection with procedure content
    if (queryTokens.length > 0) {
      const fullText = (
        item.name + ' ' + item.category + ' ' + item.keyRules.join(' ') + ' ' + item.dossier.join(' ')
      ).toLowerCase();
      const docTokens = new Set(
        fullText
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .split(/\s+/)
          .filter(Boolean)
      );

      let matchedTokens = 0;
      for (const token of queryTokens) {
        if (docTokens.has(token)) {
          matchedTokens++;
        }
      }
      score += (matchedTokens / queryTokens.length) * 0.30;
    }

    // Normalize to [0, 0.99]
    const normalizedScore = Math.min(0.98, Math.max(0.0, score));

    return { item, score: normalizedScore };
  });

  scored.sort((a, b) => b.score - a.score);

  const topItems = scored.slice(0, topK);
  const maxScore = topItems.length > 0 ? topItems[0].score : 0.0;
  const isInScope = maxScore >= 0.45; // Strict threshold for commune TTHC relevance

  return {
    items: isInScope ? topItems.map((s) => s.item) : [],
    maxScore,
    isInScope,
  };
}
