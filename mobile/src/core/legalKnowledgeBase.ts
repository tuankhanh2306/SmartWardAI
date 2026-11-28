/**
 * SmartWard AI Mobile — Kho Tri Thức 40 Thủ Tục Hành Chính Cấp Xã Tỉnh An Giang (2026)
 * Phục vụ đồng bộ Offline-first (SQLite fallback) & Chốt chặn Legal RAG (θ = 0.78, θ_lower = 0.42)
 */

import { normalizeVietnameseText } from './angiangWards';
import { DOMAIN_THRESHOLDS } from '../theme/tokens';
import type { CoreFormType, ProcedureItem, RagAskResponse } from '../types/api.types';

export type ProcedureFilterKey =
  | 'ALL'
  | 'CU_TRU'
  | 'HO_TICH'
  | 'CHUNG_THUC'
  | 'BAO_TRO'
  | 'DAT_DAI_XD';

export interface ProcedureFilterChip {
  key: ProcedureFilterKey;
  label: string;
}

export const PROCEDURE_FILTER_CHIPS: ProcedureFilterChip[] = [
  { key: 'ALL', label: 'Tất cả (40)' },
  { key: 'CU_TRU', label: 'Cư trú (CT01)' },
  { key: 'HO_TICH', label: 'Hộ tịch (Khai sinh/Kết hôn)' },
  { key: 'CHUNG_THUC', label: 'Chứng thực' },
  { key: 'BAO_TRO', label: 'Bảo trợ XH' },
  { key: 'DAT_DAI_XD', label: 'Đất đai & Xây dựng' },
];

export const AN_GIANG_SUGGESTED_QUESTIONS: Array<{
  id: string;
  label: string;
  question: string;
  formType?: CoreFormType;
}> = [
  {
    id: 'q-ct01',
    label: '🏠 Đăng ký thường trú (Mẫu CT01)',
    question: 'Thủ tục đăng ký thường trú mẫu CT01 cần những giấy tờ gì?',
    formType: 'CT01',
  },
  {
    id: 'q-ks',
    label: '👶 Đăng ký khai sinh cho bé',
    question: 'Làm giấy khai sinh cho trẻ mới sinh cần mang theo gì và mất bao lâu?',
    formType: 'TK-KS',
  },
  {
    id: 'q-kh',
    label: '💍 Đăng ký kết hôn & Giấy độc thân',
    question: 'Điều kiện độ tuổi đăng ký kết hôn và giấy xác nhận tình trạng hôn nhân?',
    formType: 'TK-KH',
  },
  {
    id: 'q-btxh',
    label: '🤝 Trợ cấp người cao tuổi / BTXH',
    question: 'Thủ tục hưởng trợ cấp bảo trợ xã hội hằng tháng cho người cao tuổi cần gì?',
    formType: 'TK-BTXH',
  },
  {
    id: 'q-ct',
    label: '📄 Chứng thực bản sao từ bản chính',
    question: 'Chứng thực sao y bản chính tại UBND xã mất bao nhiêu tiền và bao lâu?',
  },
];

export interface OfflineProcedureEntry extends ProcedureItem {
  legalBasis: string;
  requiredDocs: string[];
  keywords: string[];
}

export const AN_GIANG_40_PROCEDURES: OfflineProcedureEntry[] = [
  {
    procedureCode: 'TTHC-BT-01',
    officialPortalCode: '1.116909',
    procedureName: 'Thực hiện trợ cấp xã hội và nhận chăm sóc, nuôi dưỡng, hỗ trợ kinh phí nhận chăm sóc, nuôi dưỡng hằng tháng',
    category: 'Bảo trợ xã hội',
    agency: 'Tiếp nhận tại Trung tâm Phục vụ hành chính công bất kỳ trong tỉnh An Giang. Phòng Văn hóa - Xã hội thẩm định, Chủ tịch UBND cấp xã quyết định.',
    processingTime: '07 ngày làm việc (56 giờ làm việc)',
    fee: 'Tra cứu phí, lệ phí theo công bố của cơ quan tiếp nhận',
    status: 'ACTIVE',
    chunksCount: 5,
    formType: 'TK-BTXH',
    legalBasis: 'Nghị định 335/2026/NĐ-CP; Quyết định 4937/QĐ-UBND An Giang',
    requiredDocs: [
      'Mẫu số 01 khi đề nghị hưởng trợ cấp xã hội hằng tháng',
      'Mẫu số 02 khi đề nghị hỗ trợ kinh phí nhận chăm sóc, nuôi dưỡng hằng tháng',
    ],
    keywords: ['tro cap', 'bao tro', 'nguoi cao tuoi', 'tien gia', 'khuyet tat', 'tk-btxh', 'tthc-bt-01'],
  },
  {
    procedureCode: 'TTHC-BT-02',
    officialPortalCode: '1.116910',
    procedureName: 'Hỗ trợ chi phí mai táng cho đối tượng bảo trợ xã hội',
    category: 'Bảo trợ xã hội',
    agency: 'UBND cấp xã / phường',
    processingTime: '05 ngày làm việc',
    fee: 'Miễn phí hoàn toàn (0 đồng)',
    status: 'ACTIVE',
    chunksCount: 5,
    formType: 'TK-BTXH',
    legalBasis: 'Điều 11 Nghị định 20/2021/NĐ-CP',
    requiredDocs: [
      'Tờ khai đề nghị hỗ trợ chi phí mai táng (Mẫu số 03)',
      'Bản sao Trích lục khai tử của đối tượng bảo trợ xã hội',
      'CCCD của người trực tiếp lo mai táng và số tài khoản ngân hàng nhận hỗ trợ',
    ],
    keywords: ['mai tang', 'chi phi mai tang', 'bao tro', 'tthc-bt-02'],
  },
  {
    procedureCode: 'TTHC-BT-03',
    officialPortalCode: '1.116907',
    procedureName: 'Tiếp nhận đối tượng bảo trợ xã hội có hoàn cảnh đặc biệt khó khăn vào cơ sở trợ giúp xã hội',
    category: 'Bảo trợ xã hội',
    agency: 'UBND cấp xã / phường',
    processingTime: '10 ngày làm việc',
    fee: 'Miễn phí hoàn toàn (0 đồng)',
    status: 'ACTIVE',
    chunksCount: 4,
    formType: 'TK-BTXH',
    legalBasis: 'Nghị định 20/2021/NĐ-CP',
    requiredDocs: ['Đơn đề nghị tiếp nhận vào cơ sở trợ giúp xã hội', 'Sơ yếu lý lịch có xác nhận UBND xã', 'Giấy khám sức khỏe'],
    keywords: ['co so tro giup', 'hoan canh dac biet kho khan', 'tthc-bt-03'],
  },
  {
    procedureCode: 'TTHC-BT-04',
    officialPortalCode: '1.014028',
    procedureName: 'Hỗ trợ chi phí mai táng đối với đối tượng hưởng trợ cấp hưu trí xã hội',
    category: 'Bảo trợ xã hội',
    agency: 'UBND cấp xã / phường',
    processingTime: '05 ngày làm việc',
    fee: 'Miễn phí hoàn toàn (0 đồng)',
    status: 'ACTIVE',
    chunksCount: 5,
    formType: 'TK-BTXH',
    legalBasis: 'Luật BHXH 2024; Nghị định 335/2026/NĐ-CP',
    requiredDocs: ['Tờ khai đề nghị hỗ trợ mai táng', 'Bản sao Trích lục khai tử', 'CCCD người tổ chức mai táng'],
    keywords: ['mai tang', 'huu tri xa hoi', 'tthc-bt-04'],
  },
  {
    procedureCode: 'TTHC-BT-05',
    officialPortalCode: '3.000731',
    procedureName: '[Chờ xác minh An Giang] Hỗ trợ chi phí mai táng / Trợ cấp xã hội đột xuất (đang đối chiếu QĐ 4937/QĐ-UBND)',
    category: 'Bảo trợ xã hội',
    agency: 'Chỉ tra cứu — Đang chờ xác minh thủ tục tương ứng tại An Giang',
    processingTime: 'Theo quy định sau xác minh',
    fee: 'Miễn phí hoàn toàn (0 đồng)',
    status: 'PENDING_VERIFICATION',
    chunksCount: 4,
    legalBasis: 'Quyết định 4937/QĐ-UBND (tỉnh An Giang)',
    requiredDocs: ['Tờ khai đề nghị (chỉ tra cứu tham khảo — chưa mở nộp trực tuyến)', 'Bản sao Trích lục khai tử'],
    keywords: ['mai tang cong dong', 'tro cap dot xuat', 'cho xac minh', 'tthc-bt-05'],
  },
  {
    procedureCode: 'TTHC-CR-01',
    officialPortalCode: '1.116788',
    procedureName: 'Đăng ký thường trú',
    category: 'Cư trú',
    agency: 'Công an cấp xã / VNeID / Cổng DVC Bộ Công an (không qua hàng đợi UBND)',
    processingTime: '07 ngày làm việc',
    fee: '10.000đ (trực tuyến) / 20.000đ (trực tiếp); Miễn phí cho hộ nghèo, người có công',
    status: 'ACTIVE',
    chunksCount: 6,
    formType: 'CT01',
    legalBasis: 'Luật Cư trú 2020; Thông tư 116/2026/TT-BCA; Nghị định 309/2026/NĐ-CP',
    requiredDocs: [
      'Tờ khai thay đổi thông tin cư trú (Mẫu CT01 — Thông tư 116/2026/TT-BCA)',
      'Giấy tờ chứng minh chỗ ở hợp pháp (hoặc xác thực qua QR VNeID miễn bản sao theo NĐ 309/2026/NĐ-CP)',
      'Xác nhận đồng ý của Chủ hộ (12 số CCCD chủ hộ & xác nhận qua VNeID) nếu nhập hộ/ở nhờ',
    ],
    keywords: ['thuong tru', 'ct01', 'cu tru', 'nhap khau', 'ho khau', 'chuyen khau', 'tthc-cr-01'],
  },
  {
    procedureCode: 'TTHC-CR-02',
    officialPortalCode: '2.002913',
    procedureName: 'Liên thông điện tử: Đăng ký khai tử, xóa đăng ký thường trú, giải quyết mai táng phí, tử tuất',
    category: 'Cư trú',
    agency: 'UBND cấp xã / Công an xã / BHXH',
    processingTime: '03–07 ngày làm việc (liên thông 1 cửa)',
    fee: 'Miễn phí đăng ký khai tử & xóa thường trú',
    status: 'ACTIVE',
    chunksCount: 7,
    formType: 'CT01',
    legalBasis: 'Nghị định 63/2024/NĐ-CP về liên thông điện tử 2 nhóm TTHC',
    requiredDocs: ['Tờ khai điện tử liên thông khai tử', 'Giấy báo tử hoặc giấy tờ thay thế', 'CCCD người đi khai'],
    keywords: ['lien thong khai tu', 'xoa thuong tru', 'tu tuat', 'tthc-cr-02'],
  },
  {
    procedureCode: 'TTHC-CR-03',
    officialPortalCode: '1.116789',
    procedureName: 'Đăng ký tạm trú',
    category: 'Cư trú',
    agency: 'Công an cấp xã / Bộ phận Một cửa UBND',
    processingTime: '03 ngày làm việc',
    fee: '7.000đ (trực tuyến) / 15.000đ (trực tiếp); Miễn phí đối tượng chính sách',
    status: 'ACTIVE',
    chunksCount: 6,
    formType: 'CT01',
    legalBasis: 'Điều 27, 28 Luật Cư trú 2020; Thông tư 116/2026/TT-BCA',
    requiredDocs: ['Tờ khai thay đổi thông tin cư trú (Mẫu CT01)', 'Hợp đồng thuê/mượn nhà hoặc ý kiến đồng ý chủ hộ qua VNeID'],
    keywords: ['tam tru', 'o tro', 'thue tro', 'ct01', 'tthc-cr-03'],
  },
  {
    procedureCode: 'TTHC-CR-04',
    officialPortalCode: '1.000039',
    procedureName: 'Thủ tục gia hạn tạm trú cấp xã',
    category: 'Cư trú',
    agency: 'Công an cấp xã / Bộ phận Một cửa UBND',
    processingTime: '03 ngày làm việc',
    fee: '7.000đ (trực tuyến) / 15.000đ (trực tiếp)',
    status: 'ACTIVE',
    chunksCount: 4,
    formType: 'CT01',
    legalBasis: 'Điều 28 Luật Cư trú 2020',
    requiredDocs: ['Tờ khai thay đổi thông tin cư trú (Mẫu CT01)', 'Ý kiến đồng ý tiếp tục cho tạm trú của chủ chỗ ở hợp pháp'],
    keywords: ['gia han tam tru', 'tthc-cr-04'],
  },
  {
    procedureCode: 'TTHC-CR-06',
    officialPortalCode: '2.001159',
    procedureName: 'Thông báo lưu trú',
    category: 'Cư trú',
    agency: 'Công an cấp xã / Ứng dụng VNeID',
    processingTime: 'Tiếp nhận tức thì (trong ngày)',
    fee: 'Miễn phí hoàn toàn (0 đồng)',
    status: 'ACTIVE',
    chunksCount: 4,
    formType: 'CT01',
    legalBasis: 'Điều 30 Luật Cư trú 2020',
    requiredDocs: ['Thông tin CCCD người đến lưu trú', 'Khai báo trực tiếp hoặc qua VNeID/ASM'],
    keywords: ['thong bao luu tru', 'luu tru', 'tthc-cr-06'],
  },
  {
    procedureCode: 'TTHC-CR-07',
    officialPortalCode: '1.003677',
    procedureName: 'Khai báo tạm vắng',
    category: 'Cư trú',
    agency: 'Công an cấp xã',
    processingTime: '01 ngày làm việc',
    fee: 'Miễn phí hoàn toàn (0 đồng)',
    status: 'ACTIVE',
    chunksCount: 4,
    formType: 'CT01',
    legalBasis: 'Điều 31 Luật Cư trú 2020',
    requiredDocs: ['Đề nghị khai báo tạm vắng (Mẫu CT01/VNeID)', 'CCCD gắn chip'],
    keywords: ['tam vang', 'khai bao tam vang', 'tthc-cr-07'],
  },
  {
    procedureCode: 'TTHC-CR-08',
    officialPortalCode: '1.010041',
    procedureName: 'Xác nhận thông tin về cư trú',
    category: 'Cư trú',
    agency: 'Công an cấp xã trên toàn quốc',
    processingTime: '01 ngày làm việc (tối đa 03 ngày nếu xác minh)',
    fee: 'Miễn phí hoàn toàn (0 đồng)',
    status: 'ACTIVE',
    chunksCount: 4,
    formType: 'CT01',
    legalBasis: 'Thông tư 66/2023/TT-BCA; Thông tư 116/2026/TT-BCA (Mẫu CT07)',
    requiredDocs: ['Tờ khai thay đổi thông tin cư trú (Mẫu CT01 đề nghị cấp CT07)', 'CCCD gắn chip'],
    keywords: ['xac nhan cu tru', 'ct07', 'thong tin cu tru', 'tthc-cr-08'],
  },
  {
    procedureCode: 'TTHC-CR-09',
    officialPortalCode: '1.117007',
    procedureName: 'Xác nhận của Ủy ban nhân dân cấp xã nơi hộ gia đình cư trú về việc hộ gia đình đang gặp khó khăn về kinh tế',
    category: 'Cư trú',
    agency: 'UBND cấp xã / phường',
    processingTime: '02 ngày làm việc',
    fee: 'Miễn phí hoàn toàn (0 đồng)',
    status: 'ACTIVE',
    chunksCount: 5,
    formType: 'CT01',
    legalBasis: 'Quy định về xác nhận hoàn cảnh khó khăn cấp xã',
    requiredDocs: ['Đơn đề nghị xác nhận hoàn cảnh khó khăn', 'CCCD gắn chip'],
    keywords: ['kho khan kinh te', 'xac nhan ho gia dinh', 'tthc-cr-09'],
  },
  {
    procedureCode: 'TTHC-CR-10',
    officialPortalCode: '2.002516',
    procedureName: 'Thủ tục xác nhận thông tin hộ tịch',
    category: 'Hộ tịch',
    agency: 'UBND cấp xã / phường',
    processingTime: '03 ngày làm việc',
    fee: 'Theo mức thu HĐND tỉnh An Giang (8.000đ/bản)',
    status: 'ACTIVE',
    chunksCount: 4,
    formType: 'TK-KS',
    legalBasis: 'Thông tư 04/2020/TT-BTP',
    requiredDocs: ['Tờ khai xác nhận thông tin hộ tịch', 'CCCD gắn chip'],
    keywords: ['xac nhan thong tin ho tich', 'tthc-cr-10'],
  },
  {
    procedureCode: 'TTHC-CT-01',
    officialPortalCode: '1.001606',
    procedureName: 'Thủ tục Chứng thực bản sao từ bản chính các giấy tờ, văn bản do cơ quan có thẩm quyền cấp hoặc chứng nhận',
    category: 'Chứng thực',
    agency: 'UBND cấp xã / phường',
    processingTime: 'Giải quyết ngay trong ngày làm việc',
    fee: '2.000đ/trang (từ trang thứ 3 thu 1.000đ/trang, tối đa 200.000đ/bản)',
    status: 'ACTIVE',
    chunksCount: 5,
    legalBasis: 'Nghị định 23/2015/NĐ-CP; Thông tư 226/2016/TT-BTC',
    requiredDocs: ['Bản chính giấy tờ, văn bản cần chứng thực', 'Bản sao cần chứng thực (hoặc UBND hỗ trợ photocopy)', 'Xuất trình CCCD (nếu cần)'],
    keywords: ['chung thuc', 'sao y', 'ban sao tu ban chinh', 'cong chung giay to', 'tthc-ct-01'],
  },
  {
    procedureCode: 'TTHC-CT-02',
    officialPortalCode: '1.001590',
    procedureName: 'Thủ tục Chứng thực chữ ký trong các giấy tờ, văn bản',
    category: 'Chứng thực',
    agency: 'UBND cấp xã / phường',
    processingTime: 'Giải quyết ngay trong ngày làm việc',
    fee: '10.000đ/trường hợp',
    status: 'ACTIVE',
    chunksCount: 4,
    legalBasis: 'Điều 24 Nghị định 23/2015/NĐ-CP',
    requiredDocs: ['Bản chính CCCD/Hộ chiếu còn hạn', 'Giấy tờ, văn bản cần chứng thực chữ ký (ký trực tiếp trước mặt cán bộ)'],
    keywords: ['chung thuc chu ky', 'ky giay uy quyen', 'tthc-ct-02'],
  },
  {
    procedureCode: 'TTHC-CT-04',
    officialPortalCode: '2.001406',
    procedureName: 'Chứng thực văn bản phân chia di sản mà di sản là động sản, quyền sử dụng đất, nhà ở',
    category: 'Chứng thực',
    agency: 'UBND cấp xã / phường',
    processingTime: '02 ngày làm việc (sau 15 ngày niêm yết công khai)',
    fee: '50.000đ/văn bản',
    status: 'ACTIVE',
    chunksCount: 4,
    legalBasis: 'Nghị định 23/2015/NĐ-CP; Bộ luật Dân sự 2015',
    requiredDocs: ['Dự thảo văn bản phân chia di sản', 'Giấy chứng tử người để lại di sản', 'Giấy chứng nhận quyền sử dụng đất/tài sản', 'CCCD những người thừa kế'],
    keywords: ['phan chia di san', 'thua ke', 'tthc-ct-04'],
  },
  {
    procedureCode: 'TTHC-CT-05',
    officialPortalCode: '2.000554',
    procedureName: 'Thủ tục ghi vào Sổ hộ tịch việc ly hôn, hủy việc kết hôn của công dân Việt Nam đã được giải quyết tại cơ quan có thẩm quyền của nước ngoài',
    category: 'Hộ tịch',
    agency: 'UBND cấp xã / phường',
    processingTime: '05 ngày làm việc',
    fee: 'Miễn phí hoặc theo HĐND tỉnh',
    status: 'ACTIVE',
    chunksCount: 4,
    formType: 'TK-KH',
    legalBasis: 'Luật Hộ tịch 2014; Nghị định 123/2015/NĐ-CP',
    requiredDocs: ['Tờ khai ghi chú ly hôn', 'Bản sao bản án/quyết định ly hôn nước ngoài đã hợp pháp hóa lãnh sự và dịch công chứng', 'CCCD/Hộ chiếu'],
    keywords: ['ghi chu ly hon', 'ly hon nuoc ngoai', 'tthc-ct-05'],
  },
  {
    procedureCode: 'TTHC-CT-06',
    officialPortalCode: '2.000547',
    procedureName: 'Thủ tục ghi vào Sổ hộ tịch việc hộ tịch khác của công dân Việt Nam đã được giải quyết tại cơ quan có thẩm quyền của nước ngoài',
    category: 'Hộ tịch',
    agency: 'UBND cấp xã / phường',
    processingTime: '05 ngày làm việc',
    fee: 'Theo quy định HĐND tỉnh',
    status: 'ACTIVE',
    chunksCount: 4,
    formType: 'TK-KS',
    legalBasis: 'Luật Hộ tịch 2014',
    requiredDocs: ['Tờ khai ghi vào sổ hộ tịch', 'Giấy tờ hộ tịch nước ngoài đã hợp pháp hóa lãnh sự', 'CCCD/Hộ chiếu'],
    keywords: ['ghi so ho tich nuoc ngoai', 'tthc-ct-06'],
  },
  {
    procedureCode: 'TTHC-CT-07',
    officialPortalCode: '2.001016',
    procedureName: 'Chứng thực văn bản từ chối nhận di sản',
    category: 'Chứng thực',
    agency: 'UBND cấp xã / phường',
    processingTime: '02 ngày làm việc',
    fee: '50.000đ/văn bản',
    status: 'ACTIVE',
    chunksCount: 4,
    legalBasis: 'Nghị định 23/2015/NĐ-CP; Điều 620 Bộ luật Dân sự 2015',
    requiredDocs: ['Dự thảo văn bản từ chối nhận di sản', 'Giấy chứng tử', 'CCCD người từ chối'],
    keywords: ['tu choi nhan di san', 'di san', 'tthc-ct-07'],
  },
  {
    procedureCode: 'TTHC-CT-08',
    officialPortalCode: '2.001019',
    procedureName: 'Chứng thực di chúc',
    category: 'Chứng thực',
    agency: 'UBND cấp xã / phường',
    processingTime: '02 ngày làm việc',
    fee: '50.000đ/văn bản',
    status: 'ACTIVE',
    chunksCount: 4,
    legalBasis: 'Nghị định 23/2015/NĐ-CP; Điều 636 Bộ luật Dân sự 2015',
    requiredDocs: ['Dự thảo di chúc', 'CCCD người lập di chúc', 'Giấy tờ chứng minh quyền sở hữu tài sản'],
    keywords: ['chung thuc di chuc', 'di chuc', 'tthc-ct-08'],
  },
  {
    procedureCode: 'TTHC-DC-01',
    officialPortalCode: '3.000758',
    procedureName: 'Đăng ký biến động quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất cấp xã',
    category: 'Địa chính',
    agency: 'UBND cấp xã / Văn phòng ĐKĐĐ',
    processingTime: '10 ngày làm việc',
    fee: 'Theo biểu phí địa chính tỉnh An Giang',
    status: 'ACTIVE',
    chunksCount: 4,
    legalBasis: 'Luật Đất đai 2024; Nghị định 101/2024/NĐ-CP',
    requiredDocs: ['Đơn đăng ký biến động đất đai (Mẫu 11/ĐK)', 'Bản gốc Giấy chứng nhận (Sổ đỏ)', 'Hợp đồng chuyển nhượng/tặng cho công chứng'],
    keywords: ['bien dong dat dai', 'sang ten so do', 'quyen su dung dat', 'tthc-dc-01'],
  },
  {
    procedureCode: 'TTHC-DC-02',
    officialPortalCode: '3.000780',
    procedureName: 'Đăng ký đất đai, tài sản gắn liền với đất, cấp Giấy chứng nhận quyền sử dụng đất lần đầu cấp xã',
    category: 'Địa chính',
    agency: 'UBND cấp xã / phường',
    processingTime: '20 ngày làm việc',
    fee: 'Lệ phí cấp GCN theo HĐND tỉnh An Giang',
    status: 'ACTIVE',
    chunksCount: 4,
    legalBasis: 'Luật Đất đai 2024; Nghị định 101/2024/NĐ-CP',
    requiredDocs: ['Đơn đăng ký đất đai lần đầu (Mẫu 04/ĐK)', 'Giấy tờ chứng minh nguồn gốc sử dụng đất', 'CCCD và chứng từ nghĩa vụ tài chính'],
    keywords: ['cap so do lan dau', 'dang ky dat dai', 'giay chung nhan dat', 'tthc-dc-02'],
  },
  {
    procedureCode: 'TTHC-HT-01',
    officialPortalCode: '1.001193',
    procedureName: 'Thủ tục đăng ký khai sinh',
    category: 'Hộ tịch',
    agency: 'UBND cấp xã / phường',
    processingTime: '01 ngày làm việc (tối đa 05 ngày nếu xác minh)',
    fee: 'Miễn phí hoàn toàn khi đăng ký đúng hạn trong 60 ngày',
    status: 'ACTIVE',
    chunksCount: 4,
    formType: 'TK-KS',
    legalBasis: 'Điều 15, 16 Luật Hộ tịch 2014; Thông tư 04/2020/TT-BTP',
    requiredDocs: [
      'Tờ khai đăng ký khai sinh (Mẫu TK-KS)',
      'Bản chính Giấy chứng sinh do cơ sở y tế cấp',
      'Xuất trình CCCD của cha/mẹ và Giấy chứng nhận kết hôn (nếu cha mẹ đã đăng ký kết hôn)',
    ],
    keywords: ['khai sinh', 'khai sanh', 'chung sinh', 'moi sinh', 'sinh con', 'tk-ks', 'tthc-ht-01'],
  },
  {
    procedureCode: 'TTHC-HT-02',
    officialPortalCode: '1.000894',
    procedureName: 'Thủ tục đăng ký kết hôn',
    category: 'Hộ tịch',
    agency: 'UBND cấp xã / phường',
    processingTime: 'Giải quyết ngay trong ngày (tối đa 05 ngày nếu xác minh)',
    fee: 'Miễn phí hoàn toàn cho công dân trong nước',
    status: 'ACTIVE',
    chunksCount: 4,
    formType: 'TK-KH',
    legalBasis: 'Điều 17, 18 Luật Hộ tịch 2014; Điều 8 Luật Hôn nhân và Gia đình 2014',
    requiredDocs: [
      'Tờ khai đăng ký kết hôn (Mẫu TK-KH — Nam ≥ 20 tuổi, Nữ ≥ 18 tuổi)',
      'Xuất trình CCCD gốc của cả hai bên nam và nữ',
      'Giấy xác nhận tình trạng hôn nhân (nếu cư trú khác địa bàn)',
      'Trích lục bản án ly hôn có hiệu lực (nếu từng ly hôn)',
    ],
    keywords: ['ket hon', 'hon thu', 'gia thu', 'lay vo', 'lay chong', 'tk-kh', 'tthc-ht-02'],
  },
  {
    procedureCode: 'TTHC-HT-03',
    officialPortalCode: '1.004827',
    procedureName: 'Thủ tục đăng ký khai tử có yếu tố nước ngoài tại khu vực biên giới',
    category: 'Hộ tịch',
    agency: 'UBND xã biên giới tỉnh An Giang',
    processingTime: '03 ngày làm việc',
    fee: 'Miễn phí hoàn toàn',
    status: 'ACTIVE',
    chunksCount: 4,
    legalBasis: 'Luật Hộ tịch 2014; Nghị định 123/2015/NĐ-CP',
    requiredDocs: ['Tờ khai đăng ký khai tử', 'Giấy báo tử', 'Giấy tờ tùy thân người đi khai'],
    keywords: ['khai tu bien gioi', 'khai tu nuoc ngoai', 'tthc-ht-03'],
  },
  {
    procedureCode: 'TTHC-HT-04',
    officialPortalCode: '2.000635',
    procedureName: 'Cấp bản sao Trích lục hộ tịch, bản sao Giấy khai sinh',
    category: 'Hộ tịch',
    agency: 'Mọi UBND cấp xã trên toàn quốc (CSDL Hộ tịch điện tử)',
    processingTime: 'Giải quyết ngay trong ngày làm việc',
    fee: '8.000đ/bản sao trích lục',
    status: 'ACTIVE',
    chunksCount: 4,
    formType: 'TK-KS',
    legalBasis: 'Điều 63, 64 Luật Hộ tịch 2014; Thông tư 04/2020/TT-BTP',
    requiredDocs: ['Tờ khai cấp bản sao trích lục hộ tịch', 'Xuất trình CCCD gắn chip'],
    keywords: ['trich luc', 'mat giay khai sinh', 'ban sao khai sinh', 'tthc-ht-04'],
  },
  {
    procedureCode: 'TTHC-HT-05',
    officialPortalCode: '2.000779',
    procedureName: 'Thủ tục đăng ký nhận cha, mẹ, con có yếu tố nước ngoài',
    category: 'Hộ tịch',
    agency: 'UBND cấp xã / phường',
    processingTime: '15 ngày làm việc',
    fee: 'Theo HĐND tỉnh',
    status: 'ACTIVE',
    chunksCount: 4,
    formType: 'TK-KS',
    legalBasis: 'Luật Hộ tịch 2014',
    requiredDocs: ['Tờ khai đăng ký nhận cha, mẹ, con', 'Chứng cứ chứng minh quan hệ cha con/mẹ con (kết quả ADN...)', 'CCCD/Hộ chiếu'],
    keywords: ['nhan cha me con', 'tthc-ht-05'],
  },
  {
    procedureCode: 'TTHC-HT-06',
    officialPortalCode: '1.004837',
    procedureName: 'Thủ tục đăng ký giám hộ',
    category: 'Hộ tịch',
    agency: 'UBND cấp xã / phường',
    processingTime: '03 ngày làm việc',
    fee: 'Miễn phí hoặc theo HĐND tỉnh',
    status: 'ACTIVE',
    chunksCount: 4,
    legalBasis: 'Điều 19, 20 Luật Hộ tịch 2014',
    requiredDocs: ['Tờ khai đăng ký giám hộ', 'Văn bản cử người giám hộ', 'CCCD người giám hộ'],
    keywords: ['giam ho', 'dang ky giam ho', 'tthc-ht-06'],
  },
  {
    procedureCode: 'TTHC-HT-07',
    officialPortalCode: '2.000756',
    procedureName: 'Thủ tục đăng ký chấm dứt giám hộ có yếu tố nước ngoài',
    category: 'Hộ tịch',
    agency: 'UBND cấp xã / phường',
    processingTime: '03 ngày làm việc',
    fee: 'Miễn phí',
    status: 'ACTIVE',
    chunksCount: 4,
    legalBasis: 'Luật Hộ tịch 2014',
    requiredDocs: ['Tờ khai đăng ký chấm dứt giám hộ', 'Giấy tờ chứng minh căn cứ chấm dứt giám hộ'],
    keywords: ['cham dut giam ho', 'tthc-ht-07'],
  },
  {
    procedureCode: 'TTHC-HT-08',
    officialPortalCode: '2.000522',
    procedureName: 'Thủ tục đăng ký lại khai sinh có yếu tố nước ngoài',
    category: 'Hộ tịch',
    agency: 'UBND cấp xã / phường',
    processingTime: '05 ngày làm việc',
    fee: 'Theo HĐND tỉnh',
    status: 'ACTIVE',
    chunksCount: 5,
    formType: 'TK-KS',
    legalBasis: 'Điều 26 Nghị định 123/2015/NĐ-CP',
    requiredDocs: ['Tờ khai đăng ký lại khai sinh', 'Bản sao hồ sơ, giấy tờ cá nhân có thông tin ngày sinh, quê quán'],
    keywords: ['dang ky lai khai sinh', 'tthc-ht-08'],
  },
  {
    procedureCode: 'TTHC-HT-09',
    officialPortalCode: '2.000513',
    procedureName: 'Thủ tục đăng ký lại kết hôn có yếu tố nước ngoài',
    category: 'Hộ tịch',
    agency: 'UBND cấp xã / phường',
    processingTime: '05 ngày làm việc',
    fee: 'Theo HĐND tỉnh',
    status: 'ACTIVE',
    chunksCount: 5,
    formType: 'TK-KH',
    legalBasis: 'Điều 27 Nghị định 123/2015/NĐ-CP',
    requiredDocs: ['Tờ khai đăng ký lại kết hôn', 'Bản sao Giấy chứng nhận kết hôn trước đây (nếu còn)'],
    keywords: ['dang ky lai ket hon', 'tthc-ht-09'],
  },
  {
    procedureCode: 'TTHC-HT-10',
    officialPortalCode: '2.000497',
    procedureName: 'Thủ tục đăng ký lại khai tử có yếu tố nước ngoài',
    category: 'Hộ tịch',
    agency: 'UBND cấp xã / phường',
    processingTime: '05 ngày làm việc',
    fee: 'Theo HĐND tỉnh',
    status: 'ACTIVE',
    chunksCount: 5,
    legalBasis: 'Điều 28 Nghị định 123/2015/NĐ-CP',
    requiredDocs: ['Tờ khai đăng ký lại khai tử', 'Giấy tờ chứng minh sự kiện chết'],
    keywords: ['dang ky lai khai tu', 'tthc-ht-10'],
  },
  {
    procedureCode: 'TTHC-HT-11',
    officialPortalCode: '1.004873',
    procedureName: 'Thủ tục cấp Giấy xác nhận tình trạng hôn nhân',
    category: 'Hộ tịch',
    agency: 'UBND cấp xã nơi thường trú',
    processingTime: '03 ngày làm việc',
    fee: 'Miễn phí hoặc 10.000đ theo HĐND tỉnh',
    status: 'ACTIVE',
    chunksCount: 4,
    formType: 'TK-KH',
    legalBasis: 'Điều 21, 22, 23 Luật Hộ tịch 2014; Thông tư 04/2020/TT-BTP',
    requiredDocs: [
      'Tờ khai cấp Giấy xác nhận tình trạng hôn nhân (Ghi rõ mục đích sử dụng cụ thể)',
      'Xuất trình CCCD gắn chip 12 số',
      'Trích lục bản án ly hôn / Giấy chứng tử vợ hoặc chồng (nếu đã từng kết hôn)',
    ],
    keywords: ['doc than', 'tinh trang hon nhan', 'giay doc than', 'tk-kh', 'tthc-ht-11'],
  },
  {
    procedureCode: 'TTHC-HT-12',
    officialPortalCode: '2.000748',
    procedureName: 'Thủ tục thay đổi, cải chính, bổ sung thông tin hộ tịch, xác định lại dân tộc có yếu tố nước ngoài',
    category: 'Hộ tịch',
    agency: 'UBND cấp xã / phường',
    processingTime: '03–06 ngày làm việc',
    fee: 'Theo HĐND tỉnh',
    status: 'ACTIVE',
    chunksCount: 4,
    formType: 'TK-KS',
    legalBasis: 'Điều 26, 27, 28 Luật Hộ tịch 2014',
    requiredDocs: ['Tờ khai thay đổi, cải chính hộ tịch', 'Giấy tờ làm căn cứ thay đổi, cải chính'],
    keywords: ['cai chinh ho tich', 'doi ten', 'thay doi ho tich', 'tthc-ht-12'],
  },
  {
    procedureCode: 'TTHC-HT-13',
    officialPortalCode: '1.000874',
    procedureName: 'Thủ tục Đăng ký khai tử (trong nước)',
    category: 'Hộ tịch',
    agency: 'UBND cấp xã nơi cư trú cuối cùng của người đã mất',
    processingTime: 'Giải quyết ngay trong ngày làm việc',
    fee: 'Miễn phí hoàn toàn (0 đồng)',
    status: 'ACTIVE',
    chunksCount: 4,
    legalBasis: 'Điều 32, 33, 34 Luật Hộ tịch 2014',
    requiredDocs: ['Tờ khai đăng ký khai tử', 'Bản chính Giấy báo tử hoặc giấy tờ thay thế', 'CCCD người đi khai tử'],
    keywords: ['khai tu', 'giay bao tu', 'giay chung tu', 'tthc-ht-13'],
  },
  {
    procedureCode: 'TTHC-MT-01',
    officialPortalCode: '1.010839',
    procedureName: 'Thủ tục Đăng ký môi trường cấp xã',
    category: 'Đất đai và Môi trường',
    agency: 'UBND cấp xã / phường',
    processingTime: 'Tiếp nhận trực tiếp tại UBND cấp xã',
    fee: 'Miễn phí hoàn toàn (0 đồng)',
    status: 'ACTIVE',
    chunksCount: 4,
    legalBasis: 'Điều 49 Luật Bảo vệ môi trường 2020; Nghị định 08/2022/NĐ-CP',
    requiredDocs: ['Văn bản đăng ký môi trường theo mẫu', 'Bản sao Quyết định phê duyệt dự án/Giấy phép kinh doanh'],
    keywords: ['moi truong', 'dang ky moi truong', 'tthc-mt-01'],
  },
  {
    procedureCode: 'TTHC-NCC-01',
    officialPortalCode: '1.009472',
    procedureName: 'Tiếp nhận hồ sơ giải quyết chế độ ưu đãi đối với Người có công với cách mạng',
    category: 'Bảo trợ xã hội và Người có công',
    agency: 'UBND cấp xã / Phòng LĐTBXH',
    processingTime: '05 ngày làm việc tại cấp xã',
    fee: 'Miễn phí hoàn toàn (0 đồng)',
    status: 'ACTIVE',
    chunksCount: 4,
    formType: 'TK-BTXH',
    legalBasis: 'Pháp lệnh Ưu đãi người có công với cách mạng 2020; Nghị định 131/2021/NĐ-CP',
    requiredDocs: ['Bản khai đề nghị hưởng chế độ ưu đãi', 'Giấy tờ chứng minh đối tượng người có công', 'CCCD và tài khoản ngân hàng'],
    keywords: ['nguoi co cong', 'thuong binh', 'liet si', 'uu dai cach mang', 'tthc-ncc-01'],
  },
  {
    procedureCode: 'TTHC-XD-01',
    officialPortalCode: '3.000761',
    procedureName: 'Cấp giấy phép xây dựng mới đối với nhà ở riêng lẻ',
    category: 'Xây dựng',
    agency: 'Trung tâm PVHCC tiếp nhận • UBND cấp xã cấp phép (NĐ 140/2025/NĐ-CP)',
    processingTime: '15 ngày làm việc',
    fee: 'Theo quy định của HĐND tỉnh An Giang',
    status: 'PENDING_VERIFICATION',
    chunksCount: 4,
    legalBasis: 'Luật Xây dựng 2014 (sửa đổi 2020); Nghị định 140/2025/NĐ-CP',
    requiredDocs: ['Đơn đề nghị cấp giấy phép xây dựng', 'Giấy tờ chứng minh quyền sử dụng đất', '02 bộ bản vẽ thiết kế xây dựng nhà ở'],
    keywords: ['giay phep xay dung', 'xay nha', 'nha o rieng le', 'tthc-xd-01'],
  },
  {
    procedureCode: 'TTHC-XD-02',
    officialPortalCode: '3.000785',
    procedureName: 'Thông báo khởi công xây dựng công trình nhà ở riêng lẻ (Chỉ tra cứu hướng dẫn diện miễn thủ tục)',
    category: 'Xây dựng',
    agency: 'UBND cấp xã (nhà ở riêng lẻ hộ gia đình, cá nhân được miễn thông báo khởi công)',
    processingTime: 'Không phát sinh thủ tục bắt buộc đối với nhà ở riêng lẻ thông thường',
    fee: 'Miễn phí',
    status: 'PENDING_VERIFICATION',
    chunksCount: 4,
    legalBasis: 'Điều 107 Luật Xây dựng 2014 (sửa đổi 2020)',
    requiredDocs: ['Thông báo khởi công (chỉ áp dụng diện không được miễn)'],
    keywords: ['thong bao khoi cong', 'mien khoi cong', 'xay dung nha o', 'tthc-xd-02'],
  },
];

export function matchesProcedureFilter(
  item: Pick<ProcedureItem, 'procedureCode' | 'category'>,
  filter: ProcedureFilterKey
): boolean {
  if (filter === 'ALL') return true;
  const code = item.procedureCode.toUpperCase();
  const cat = normalizeVietnameseText(item.category);
  switch (filter) {
    case 'CU_TRU':
      return code.startsWith('TTHC-CR-') || cat.includes('cu tru');
    case 'HO_TICH':
      return code.startsWith('TTHC-HT-') || cat.includes('ho tich');
    case 'CHUNG_THUC':
      return code.startsWith('TTHC-CT-') || cat.includes('chung thuc');
    case 'BAO_TRO':
      return (
        code.startsWith('TTHC-BT-') ||
        code.startsWith('TTHC-NCC-') ||
        cat.includes('bao tro') ||
        cat.includes('nguoi co cong')
      );
    case 'DAT_DAI_XD':
      return (
        code.startsWith('TTHC-DC-') ||
        code.startsWith('TTHC-XD-') ||
        code.startsWith('TTHC-MT-') ||
        cat.includes('dia chinh') ||
        cat.includes('dat dai') ||
        cat.includes('xay dung')
      );
    default:
      return true;
  }
}

export function resolveCoreFormTypeForProcedure(procedureCode?: string): CoreFormType | null {
  if (!procedureCode) return null;
  const clean = procedureCode.trim().toUpperCase();
  if (clean === 'TTHC-CR-01') return 'CT01';
  if (clean === 'TTHC-HT-01') return 'TK-KS';
  if (clean === 'TTHC-HT-02' || clean === 'TTHC-HT-11') return 'TK-KH';
  if (clean === 'TTHC-BT-01') return 'TK-BTXH';
  return null;
}

export interface FivePartLegalAnswer {
  procedureCode: string;
  procedureName: string;
  requiredDocs: string;
  processingTime: string;
  feeAndExemption: string;
  receivingOffice: string;
  legalBasis: string;
}

export function buildFivePartAnswer(
  entry: OfflineProcedureEntry,
  wardName: string,
  wardAddress?: string
): FivePartLegalAnswer {
  const receivingOffice = wardAddress
    ? `Bộ phận Một cửa UBND ${wardName} (${wardAddress})`
    : `Bộ phận Một cửa UBND ${wardName} (${entry.agency})`;

  return {
    procedureCode: entry.procedureCode,
    procedureName: entry.procedureName,
    requiredDocs: entry.requiredDocs.map((d, i) => `• ${i + 1}. ${d}`).join('\n'),
    processingTime: entry.processingTime,
    feeAndExemption: entry.fee,
    receivingOffice,
    legalBasis: entry.legalBasis,
  };
}

export function formatFivePartAnswerText(parts: FivePartLegalAnswer): string {
  return [
    `1. THÀNH PHẦN HỒ SƠ:\n${parts.requiredDocs}`,
    `2. THỜI HẠN GIẢI QUYẾT:\n${parts.processingTime}`,
    `3. LỆ PHÍ & ĐỐI TƯỢNG MIỄN GIẢM:\n${parts.feeAndExemption}`,
    `4. NƠI TIẾP NHẬN:\n${parts.receivingOffice}`,
    `5. CĂN CỨ PHÁP LÝ TRÍCH DẪN (2026):\n${parts.legalBasis}`,
  ].join('\n\n');
}

const OUT_OF_SCOPE_PATTERNS = [
  'thoi tiet',
  'bong da',
  'chung khoan',
  'bitcoin',
  'nau an',
  'cong thuc mon an',
  'du lich nuoc ngoai',
  'visa my',
  'ho chieu',
  'bang lai xe',
  'dang kiem o to',
  'thue thu nhap ca nhan',
  'khoi to hinh su',
];

const EXACT_GREETINGS = new Set([
  'hi',
  'hello',
  'hey',
  'alo',
  'chao',
  'xin chao',
  'kinh chao',
  'chao ban',
  'chao ban nha',
  'chao ban nhe',
  'chao anh chi',
  'chao can bo',
  'chao bot',
  'chao ad',
  'chao uy ban',
  'kinh chao uy ban',
  'chao anh',
  'chao chi',
  'chao em',
  'can bo oi',
  'ad oi',
  'bot oi',
  'ban la ai',
  'ai do',
  'ban la cai gi',
  'chuc nang cua tro ly',
  'ban giup duoc gi',
  'ban co the lam gi',
  'ban lam viec the nao',
  'huong dan su dung',
  'gioi thieu',
  'gioi thieu ban than',
  'good morning',
  'good afternoon',
  'good evening',
  'start',
  'bat dau',
  'ok',
  'oke',
  'ok ban',
  'oke ban',
  'cam on',
  'thank',
  'thanks',
  'thank you',
  'tuyet voi',
  'tot lam',
  'tam biet',
  'bye',
  'bye bye',
  'hen gap lai',
]);

const AMBIGUOUS_HELP_PATTERNS = [
  'tu van',
  'tuw van',
  'giup toi',
  'giupf toi',
  'giups toi',
  'giup minh',
  'giup em',
  'giup voi',
  'can giup',
  'ho tro toi',
  'cho toi hoi',
  'muon hoi',
  'can tu van',
  'huong dan giup',
  'co the tu van',
  'co the giup',
  'hoi chut',
  'can ho tro',
  'tu van giup',
];

const THANKS_PATTERNS = [
  'cam on',
  'cam on ban',
  'cam on can bo',
  'cam on nha',
  'cam on nhe',
  'cam on nhieu',
  'thanks',
  'thank you',
  'tuyet voi',
  'tot lam',
  'rat tot',
  'chu dao qua',
  'duoc roi',
  'hieu roi',
  'ro roi',
  'ok ban',
  'oke ban',
];

const GOODBYE_PATTERNS = [
  'tam biet',
  'bye',
  'bye bye',
  'hen gap lai',
  'chao tam biet',
];

export function isGreetingOrSmallTalk(question: string, normQuestion?: string): boolean {
  if (!question || !question.trim()) return false;
  const raw = question.trim().toLowerCase();
  const normQ = normQuestion ?? normalizeVietnameseText(raw);
  const cleanNorm = normQ
    .replace(/[!?.,;:~@#$%^&*()_+={}\[\]|\\<>\/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleanNorm) return false;

  // If query mentions any procedure keyword from 40 TTHC, it is a specific procedure question!
  for (const entry of AN_GIANG_40_PROCEDURES) {
    const normCode = normalizeVietnameseText(entry.procedureCode);
    if (cleanNorm.includes(normCode)) return false;
    for (const kw of entry.keywords) {
      if (cleanNorm.includes(kw)) {
        return false;
      }
    }
  }

  // Exact set match
  if (EXACT_GREETINGS.has(cleanNorm)) {
    return true;
  }

  // Thanks & Goodbye pattern match
  if (
    THANKS_PATTERNS.some((p) => cleanNorm === p || cleanNorm.startsWith(p + ' ')) ||
    GOODBYE_PATTERNS.some((p) => cleanNorm === p || cleanNorm.startsWith(p + ' '))
  ) {
    return true;
  }

  // Common root/typo match (e.g. "hiii", "helloo", "chaof", "chaogf")
  const tokens = cleanNorm.split(' ');
  const firstToken = tokens[0] || '';
  if (
    /^hi+$/.test(firstToken) ||
    /^hello+$/.test(firstToken) ||
    /^helo+$/.test(firstToken) ||
    /^alo+$/.test(firstToken)
  ) {
    if (tokens.length <= 4) return true;
  }
  if (['chao', 'chaof', 'chaogf', 'chaoof', 'xinchao'].includes(firstToken)) {
    if (tokens.length <= 4) return true;
  }
  if (tokens.length >= 2 && tokens[0] === 'xin' && tokens[1].startsWith('chao')) {
    if (tokens.length <= 5) return true;
  }

  // Short queries <= 50 chars matching greeting regex or ambiguous help patterns
  if (cleanNorm.length <= 50) {
    if (
      /^(hi+|hello+|hey+|alo+|chao|xin\s+chao|kinh\s+chao|cam\s+on|thank|thanks|tam\s+biet|bye)(\s+.*)?$/i.test(
        cleanNorm
      )
    ) {
      return true;
    }
    if (
      /^(ban|bot|tro\s+ly)\s+(la\s+ai|co\s+the\s+lam\s+gi|giup\s+gi|giup\s+duoc\s+gi)/i.test(
        cleanNorm
      )
    ) {
      return true;
    }
    if (AMBIGUOUS_HELP_PATTERNS.some((p) => cleanNorm.includes(p))) {
      return true;
    }
  }

  return false;
}

/**
 * Offline Legal RAG Fallback with strict Abstention Guardrail:
 * - S_max >= 0.78 -> Direct grounded 5-part answer
 * - 0.42 <= S_max < 0.78 -> Abstain & flag HITL Queue for Judicial/Civil Status Officer
 * - S_max < 0.42 -> Hard Abstain (Out of scope of 40 commune procedures)
 */
export function evaluateOfflineLegalRag(
  question: string,
  wardName: string,
  wardAddress?: string
): RagAskResponse & { fiveParts?: FivePartLegalAnswer } {
  const started = Date.now();
  const normQ = normalizeVietnameseText(question);
  const threshold = DOMAIN_THRESHOLDS.ragDirectAnswerSimilarity; // 0.78
  const hitlLower = DOMAIN_THRESHOLDS.ragHitlLowerSimilarity; // 0.42

  if (isGreetingOrSmallTalk(question, normQ)) {
    const isThanks =
      normQ.includes('cam on') ||
      normQ.includes('thanks') ||
      normQ === 'ok' ||
      normQ === 'oke';
    const isGoodbye = normQ.includes('tam biet') || normQ.includes('bye');

    let answerText = `Xin chào bạn! Tôi là Trợ lý Pháp lý Một Cửa tại UBND ${wardName}.\n\nTôi sẵn sàng giải đáp và hướng dẫn bạn chuẩn bị hồ sơ 40 thủ tục hành chính cấp xã (Cư trú CT01, Khai sinh, Kết hôn, Trợ cấp xã hội, Chứng thực sao y...). Bạn đang cần làm thủ tục gì hôm nay?`;

    if (isThanks) {
      answerText = `Rất vui được hỗ trợ bạn! Nếu cần tra cứu thêm thủ tục hành chính hoặc tiền kiểm tra biểu mẫu tờ khai tại UBND ${wardName}, bạn cứ nhắn tôi bất cứ lúc nào nhé.`;
    } else if (isGoodbye) {
      answerText = `Tạm biệt bạn! Chúc bạn một ngày tốt lành và thực hiện công việc suôn sẻ tại UBND ${wardName}. Khi nào cần tra cứu thủ tục, tôi luôn sẵn sàng hỗ trợ!`;
    }

    return {
      answer: answerText,
      abstained: false,
      maxSimilarity: 1.0,
      appliedThreshold: threshold,
      citations: [],
      suggestions: [
        '👶 Đăng ký khai sinh cho bé',
        '💍 Đăng ký kết hôn & Giấy độc thân',
        '🏠 Đăng ký thường trú (Mẫu CT01)',
        '🤝 Trợ cấp bảo trợ xã hội (TK-BTXH)',
      ],
      cached: true,
      responseTimeMs: Math.max(1, Date.now() - started),
      disclaimer: `Trợ lý Pháp lý Số UBND ${wardName} sẵn sàng hỗ trợ công dân.`,
      hitlQueued: false,
    };
  }

  if (!normQ || OUT_OF_SCOPE_PATTERNS.some((p) => normQ.includes(p))) {
    return {
      answer:
        'Câu hỏi của công dân nằm ngoài phạm vi 40 Thủ tục hành chính cấp xã thuộc thẩm quyền UBND xã/phường tỉnh An Giang (hoặc không đủ căn cứ pháp lý). Hệ thống từ chối suy đoán theo cơ chế chống ảo giác (θ = 0.78).',
      abstained: true,
      abstentionReason: 'OUT_OF_SCOPE_COMMUNE_PROCEDURES',
      maxSimilarity: 0.18,
      appliedThreshold: threshold,
      citations: [],
      cached: true,
      responseTimeMs: Math.max(1, Date.now() - started),
      disclaimer:
        'Vui lòng hỏi về 40 TTHC cấp xã (Cư trú CT01, Hộ tịch, Chứng thực, Bảo trợ xã hội, Đất đai & Xây dựng).',
      hitlQueued: false,
    };
  }

  let bestEntry: OfflineProcedureEntry | null = null;
  let bestScore = 0;

  for (const entry of AN_GIANG_40_PROCEDURES) {
    let score = 0;
    const normCode = normalizeVietnameseText(entry.procedureCode);
    const normName = normalizeVietnameseText(entry.procedureName);

    if (normQ.includes(normCode)) {
      score = 0.98;
    } else {
      for (const kw of entry.keywords) {
        if (normQ.includes(kw)) {
          score = Math.max(score, kw.length >= 8 ? 0.94 : 0.86);
        }
      }

      // Word overlap with procedure name
      const nameWords = normName.split(/\s+/).filter((w) => w.length >= 3);
      const matchedWords = nameWords.filter((w) => normQ.includes(w));
      if (nameWords.length > 0 && matchedWords.length >= 2) {
        const ratio = matchedWords.length / Math.min(nameWords.length, 6);
        score = Math.max(score, Math.min(0.91, 0.45 + ratio * 0.45));
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  const roundedScore = Math.round(bestScore * 100) / 100;

  // Guardrail 1: S_max >= 0.78 -> Answer with 5-part grounded structure
  if (bestEntry && roundedScore >= threshold) {
    const fiveParts = buildFivePartAnswer(bestEntry, wardName, wardAddress);
    return {
      answer: formatFivePartAnswerText(fiveParts),
      abstained: false,
      maxSimilarity: roundedScore,
      appliedThreshold: threshold,
      citations: [
        {
          chunkCode: `${bestEntry.procedureCode}-OFFLINE`,
          procedureCode: bestEntry.procedureCode,
          procedureName: bestEntry.procedureName,
          title: bestEntry.procedureName,
          legalReference: bestEntry.legalBasis,
          content: bestEntry.requiredDocs.join('; '),
          relevanceScore: roundedScore,
        },
      ],
      cached: true,
      responseTimeMs: Math.max(1, Date.now() - started),
      disclaimer: `Nguồn: Cơ sở dữ liệu 40 TTHC Tỉnh An Giang 2026 — Đồng bộ Offline cho UBND ${wardName}.`,
      hitlQueued: false,
      fiveParts,
    };
  }

  // Guardrail 2: 0.42 <= S_max < 0.78 -> Gray zone -> HITL Queue
  if (roundedScore >= hitlLower) {
    return {
      answer:
        'Câu hỏi nằm trong vùng xám độ tin cậy pháp lý (0.42 ≤ S_max < 0.78). Để tránh trả lời sai quy định, hệ thống đã chuyển câu hỏi vào Hàng đợi Thẩm định (HITL Queue) để Cán bộ Tư pháp - Hộ tịch kiểm duyệt và phản hồi chính xác.',
      abstained: true,
      abstentionReason: 'HITL_GRAY_ZONE_REVIEW_REQUIRED',
      maxSimilarity: roundedScore,
      appliedThreshold: threshold,
      citations: [],
      cached: true,
      responseTimeMs: Math.max(1, Date.now() - started),
      disclaimer: 'Đã đẩy câu hỏi vào hàng đợi HITL của Bộ phận Một cửa.',
      hitlQueued: true,
    };
  }

  // Guardrail 3: S_max < 0.42 -> Hard Abstention
  return {
    answer:
      'Chưa tìm thấy văn bản pháp lý đủ độ tin cậy (S_max < 0.78) trong bộ 40 TTHC cấp xã An Giang 2026. Hệ thống không tự suy đoán câu trả lời.',
    abstained: true,
    abstentionReason: 'BELOW_CONFIDENCE_THRESHOLD',
    maxSimilarity: roundedScore,
    appliedThreshold: threshold,
    citations: [],
    cached: true,
    responseTimeMs: Math.max(1, Date.now() - started),
    disclaimer: 'Vui lòng mô tả cụ thể hơn tên thủ tục hành chính cấp xã bạn cần tra cứu.',
    hitlQueued: false,
  };
}

/**
 * Classifies any RagAskResponse (online or offline) against the invariant guardrail thresholds.
 */
export function evaluateRagGuardrailState(response: RagAskResponse): {
  isAbstained: boolean;
  isHitlGrayZone: boolean;
  badgeText: string;
} {
  const score = Number(response.maxSimilarity ?? 0);
  const threshold = Number(response.appliedThreshold || DOMAIN_THRESHOLDS.ragDirectAnswerSimilarity);
  const isAbstained = Boolean(response.abstained || score < threshold);
  const isHitlGrayZone =
    isAbstained &&
    (Boolean(response.hitlQueued) ||
      (score >= DOMAIN_THRESHOLDS.ragHitlLowerSimilarity && score < threshold));

  const primaryCode = response.citations?.[0]?.procedureCode;
  const badgeText = primaryCode
    ? `${primaryCode} • S_max = ${score.toFixed(2)}`
    : `S_max = ${score.toFixed(2)} (θ = ${threshold.toFixed(2)})`;

  return { isAbstained, isHitlGrayZone, badgeText };
}
