import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  configureRuntimeApiBaseUrl,
  extractLanHostFromExpoUri,
  getApiBaseUrl,
  isNetworkOrTimeoutError,
  isUnreachableIosDefaultUrl,
  markRagBackendNetworkFailure,
  markRagBackendSuccess,
  resetRagBackendCircuit,
  resetRuntimeApiConfigForTests,
  resolveDefaultApiBaseUrl,
  shouldSkipRagOnlineCall,
} from '../api/client';
import {
  clearOfficerSession,
  getOfficerToken,
  resetOfficerTokenMemoryCache,
  saveOfficerSession,
} from '../storage/secureAuthStorage';
import {
  AN_GIANG_40_PROCEDURES,
  evaluateOfflineLegalRag,
  evaluateRagGuardrailState,
  isGreetingOrSmallTalk,
  matchesProcedureFilter,
  resolveCoreFormTypeForProcedure,
} from '../core/legalKnowledgeBase';
import {
  buildOfficialTemplateHtml,
  getTemplateFileDescriptor,
} from '../core/templateExporter';
import {
  getCachedProcedures,
  upsertCachedProcedures,
} from '../storage/sqliteDb';

describe('legalRagAndTts — Chặng M2 (40 TTHC, Guardrail θ=0.78, Template Export & No-Print)', () => {
  it('có đủ đúng 40 Thủ tục hành chính cấp xã Tỉnh An Giang 2026 (không trùng mã)', () => {
    expect(AN_GIANG_40_PROCEDURES).toHaveLength(40);
    const uniqueCodes = new Set(AN_GIANG_40_PROCEDURES.map((p) => p.procedureCode));
    expect(uniqueCodes.size).toBe(40);
  });

  it('đồng bộ và đọc lại 40 TTHC từ lớp lưu đệm sqliteDb', async () => {
    await upsertCachedProcedures(AN_GIANG_40_PROCEDURES);
    const cached = await getCachedProcedures();
    expect(cached).toHaveLength(40);
    expect(cached.some((p) => p.procedure_code === 'TTHC-CR-01')).toBe(true);
  });

  it('lọc chính xác 6 nhóm thủ tục trên thanh Chips', () => {
    expect(AN_GIANG_40_PROCEDURES.filter((p) => matchesProcedureFilter(p, 'ALL'))).toHaveLength(40);
    expect(
      AN_GIANG_40_PROCEDURES.filter((p) => matchesProcedureFilter(p, 'CU_TRU')).length
    ).toBeGreaterThanOrEqual(8);
    expect(
      AN_GIANG_40_PROCEDURES.filter((p) => matchesProcedureFilter(p, 'HO_TICH')).length
    ).toBeGreaterThanOrEqual(13);
    expect(
      AN_GIANG_40_PROCEDURES.filter((p) => matchesProcedureFilter(p, 'CHUNG_THUC')).length
    ).toBeGreaterThanOrEqual(5);
    expect(
      AN_GIANG_40_PROCEDURES.filter((p) => matchesProcedureFilter(p, 'BAO_TRO')).length
    ).toBeGreaterThanOrEqual(6);
    expect(
      AN_GIANG_40_PROCEDURES.filter((p) => matchesProcedureFilter(p, 'DAT_DAI_XD')).length
    ).toBeGreaterThanOrEqual(5);
  });

  it('trả lời đầy đủ 5 phần chuẩn hóa với S_max >= 0.78 và gắn đúng tên UBND xã/phường', () => {
    const res = evaluateOfflineLegalRag(
      'Thủ tục đăng ký thường trú mẫu CT01 cần những giấy tờ gì?',
      'Đặc khu Phú Quốc',
      'Số 04 Đường 30/4, Phường Dương Đông, Đặc khu Phú Quốc'
    );

    expect(res.abstained).toBe(false);
    expect(res.maxSimilarity).toBeGreaterThanOrEqual(0.78);
    expect(res.citations[0]?.procedureCode).toBe('TTHC-CR-01');
    expect(res.fiveParts?.receivingOffice).toContain('Đặc khu Phú Quốc');
    expect(res.answer).toContain('1. THÀNH PHẦN HỒ SƠ');
    expect(res.answer).toContain('5. CĂN CỨ PHÁP LÝ TRÍCH DẪN (2026)');
  });

  it('chốt chặn từ chối an toàn (Abstention) đối với câu hỏi ngoài phạm vi 40 TTHC cấp xã', () => {
    const trap = evaluateOfflineLegalRag(
      'Hôm nay thời tiết ở Phú Quốc thế nào và cách xin visa Mỹ?',
      'Đặc khu Phú Quốc'
    );

    expect(trap.abstained).toBe(true);
    expect(trap.maxSimilarity).toBeLessThan(0.42);
    expect(trap.hitlQueued).toBe(false);

    const state = evaluateRagGuardrailState(trap);
    expect(state.isAbstained).toBe(true);
    expect(state.isHitlGrayZone).toBe(false);
  });

  it('nhận diện chính xác vùng xám HITL (0.42 <= S_max < 0.78) và gắn cờ thẩm định cán bộ', () => {
    const grayZone = evaluateRagGuardrailState({
      answer: 'Cần xác minh thêm quy định địa phương',
      abstained: true,
      maxSimilarity: 0.61,
      appliedThreshold: 0.78,
      citations: [],
      cached: false,
      responseTimeMs: 42,
      disclaimer: '',
    });

    expect(grayZone.isAbstained).toBe(true);
    expect(grayZone.isHitlGrayZone).toBe(true);
    expect(grayZone.badgeText).toContain('0.61');
  });

  it('ánh xạ chính xác mã thủ tục sang 4 nhóm biểu mẫu sơ duyệt (CT01, TK-KS, TK-KH, TK-BTXH)', () => {
    expect(resolveCoreFormTypeForProcedure('TTHC-CR-01')).toBe('CT01');
    expect(resolveCoreFormTypeForProcedure('TTHC-HT-01')).toBe('TK-KS');
    expect(resolveCoreFormTypeForProcedure('TTHC-HT-02')).toBe('TK-KH');
    expect(resolveCoreFormTypeForProcedure('TTHC-HT-11')).toBe('TK-KH');
    expect(resolveCoreFormTypeForProcedure('TTHC-BT-01')).toBe('TK-BTXH');
    expect(resolveCoreFormTypeForProcedure('TTHC-XD-01')).toBeNull();
  });

  it('sinh đúng tên file .DOCX/.PDF chuẩn NĐ 30/2020/NĐ-CP và nội dung HTML gắn tên xã/phường', () => {
    const desc = getTemplateFileDescriptor('TTHC-CR-01', 'Đăng ký thường trú', 'CT01');
    expect(desc.docxFileName).toBe('Mau_CT01_CuTru_Chuan_ND30.docx');
    expect(desc.pdfFileName).toBe('Mau_CT01_CuTru_Chuan_ND30.pdf');

    const html = buildOfficialTemplateHtml(desc, 'Phường Long Xuyên');
    expect(html).toContain('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
    expect(html).toContain('Phường Long Xuyên');
    expect(html).toContain('TTHC-CR-01');
  });

  it('khớp 100% chuẩn thể thức 1 trang A4 cho 4 nhóm biểu mẫu (CT01, TK-KS, TK-KH, TK-BTXH)', () => {
    // 1. CT01 (Bộ Công an)
    const ct01Desc = getTemplateFileDescriptor('TTHC-CR-01', 'Đăng ký thường trú', 'CT01');
    const ct01Html = buildOfficialTemplateHtml(ct01Desc, 'Xã An Phú');
    expect(ct01Html).toContain('Mẫu CT01 ban hành kèm theo Thông tư số 66/2023/TT-BCA');
    expect(ct01Html).toContain('TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ');
    expect(ct01Html).toContain('Kính gửi:</b> Công an Xã An Phú');
    expect(ct01Html).toContain('Ý KIẾN CỦA CHỦ HỘ');
    expect(ct01Html).toContain('Ý KIẾN CỦA CHỦ SỞ HỮU CHỖ Ở HỢP PHÁP');
    expect(ct01Html).toContain('Ý KIẾN CỦA CHA/MẸ/NGƯỜI GIÁM HỘ');
    expect(ct01Html).toContain('NGƯỜI KÊ KHAI');
    expect(ct01Html).not.toContain('CÔNG AN TỈNH AN GIANG');

    // 2. TK-KS (Bộ Tư pháp)
    const ksDesc = getTemplateFileDescriptor('TTHC-HT-01', 'Đăng ký khai sinh', 'TK-KS');
    const ksHtml = buildOfficialTemplateHtml(ksDesc, 'Phường Mỹ Bình');
    expect(ksHtml).toContain('TỜ KHAI ĐĂNG KÝ KHAI SINH');
    expect(ksHtml).toContain('Phụ lục 5 Thông tư số 04/2024/TT-BTP');
    expect(ksHtml).toContain('Đề nghị cấp bản sao: Có □ , Không □');
    expect(ksHtml).toContain('Số lượng: ....... bản');
    expect(ksHtml).toContain('ghi bằng chữ:');
    expect(ksHtml).toContain('Thông tin về Giấy chứng nhận kết hôn');

    // 3. TK-KH (Luật HN&GĐ)
    const khDesc = getTemplateFileDescriptor('TTHC-HT-02', 'Đăng ký kết hôn', 'TK-KH');
    const khHtml = buildOfficialTemplateHtml(khDesc, 'Xã Bình Thạnh Đông');
    expect(khHtml).toContain('TỜ KHAI ĐĂNG KÝ KẾT HÔN');
    expect(khHtml).toContain('Ảnh 3x4<br/>Bên nữ');
    expect(khHtml).toContain('Ảnh 3x4<br/>Bên nam');
    expect(khHtml).toContain('BÊN NỮ');
    expect(khHtml).toContain('BÊN NAM');
    expect(khHtml).toContain('Lần kết hôn thứ mấy');

    // 4. TK-BTXH (Luật BHXH 2024)
    const btxhDesc = getTemplateFileDescriptor('TTHC-BT-01', 'Trợ cấp BTXH', 'TK-BTXH');
    const btxhHtml = buildOfficialTemplateHtml(btxhDesc, 'Phường Châu Phú B');
    expect(btxhHtml).toContain('TỜ KHAI THÔNG TIN ĐỀ NGHỊ TRỢ CẤP XÃ HỘI HÀNG THÁNG');
    expect(btxhHtml).toContain('Mẫu số 01');
    expect(btxhHtml).toContain('Luật BHXH 2024');
    expect(btxhHtml).toContain('Đề án 06 chi trả an sinh không dùng tiền mặt');
  });

  it('MOB-2.8: Kỷ luật cấm tuyệt đối nút In (window.print / Print.printAsync) trên Tab 1 & Exporter', () => {
    const filesToAudit = [
      resolve(__dirname, '../screens/LegalRagChatScreen.tsx'),
      resolve(__dirname, '../components/TemplateDownloadBar.tsx'),
      resolve(__dirname, '../core/templateExporter.ts'),
    ];

    for (const filePath of filesToAudit) {
      const code = readFileSync(filePath, 'utf8');
      expect(code).not.toMatch(/window\.print\s*\(/);
      expect(code).not.toMatch(/Print\.printAsync\s*\(/);
    }
  });

  it('nhận diện chính xác câu chào hỏi/giao tiếp (hi, hello, xin chào, tư vấn giúp tôi) và không kích hoạt chốt chặn ngoài phạm vi', () => {
    const greetings = ['hi', 'hi!', 'hello', 'alo', 'xin chào', 'chào bạn', 'chào cán bộ', 'tư vấn giúp tôi', 'bạn là ai'];
    for (const g of greetings) {
      expect(isGreetingOrSmallTalk(g)).toBe(true);
    }

    // Câu hỏi có chứa thủ tục cụ thể thì KHÔNG coi là greeting thuần túy
    expect(isGreetingOrSmallTalk('chào bạn, tôi muốn làm thủ tục khai sinh')).toBe(false);
    expect(isGreetingOrSmallTalk('xin chào, đăng ký kết hôn cần gì')).toBe(false);
    expect(isGreetingOrSmallTalk('thủ tục thường trú mẫu CT01')).toBe(false);

    // evaluateOfflineLegalRag trả lời lịch thiệp, không bị abstained, S_max = 1.0
    const resp = evaluateOfflineLegalRag('hi', 'Phường Châu Đốc');
    expect(resp.abstained).toBe(false);
    expect(resp.maxSimilarity).toBe(1.0);
    expect(resp.citations).toHaveLength(0);
    expect(resp.answer).toContain('Phường Châu Đốc');
    expect(resp.suggestions).toBeDefined();
    expect(resp.suggestions!.length).toBeGreaterThanOrEqual(4);

    // Small talk cảm ơn
    const thanksResp = evaluateOfflineLegalRag('cảm ơn bạn nhé', 'Xã An Phú');
    expect(thanksResp.abstained).toBe(false);
    expect(thanksResp.maxSimilarity).toBe(1.0);
    expect(thanksResp.answer).toContain('Rất vui được hỗ trợ bạn');

    // Small talk tạm biệt
    const byeResp = evaluateOfflineLegalRag('tạm biệt', 'Thị trấn Tri Tôn');
    expect(byeResp.abstained).toBe(false);
    expect(byeResp.maxSimilarity).toBe(1.0);
    expect(byeResp.answer).toContain('Tạm biệt');
  });

  it('tự động nhận diện Base URL API từ LAN IP khi truy cập từ Safari iPhone hoặc trình duyệt Web', () => {
    // Trên điện thoại truy cập qua LAN IP (e.g. 192.168.3.51)
    const lanUrl = resolveDefaultApiBaseUrl({
      location: { hostname: '192.168.3.51' },
    });
    expect(lanUrl).toBe('http://192.168.3.51:8080/api/v1');

    // Trên máy tính cục bộ
    const localUrl = resolveDefaultApiBaseUrl({
      location: { hostname: 'localhost' },
    });
    expect(localUrl).toBe('http://localhost:8080/api/v1');

    // Mặc định Android emulator (không có window)
    const emuUrl = resolveDefaultApiBaseUrl(undefined);
    expect(emuUrl).toBe('http://10.0.2.2:8080/api/v1');
  });

  it('tách được LAN IP từ Metro hostUri/scriptURL và loại bỏ localhost / tunnel domains', () => {
    expect(extractLanHostFromExpoUri('exp://192.168.1.25:8081')).toBe('192.168.1.25');
    expect(
      extractLanHostFromExpoUri('http://192.168.10.44:8081/index.bundle?platform=ios&dev=true')
    ).toBe('192.168.10.44');
    expect(extractLanHostFromExpoUri('172.20.10.3:8081')).toBe('172.20.10.3');

    expect(extractLanHostFromExpoUri('http://localhost:8081')).toBeNull();
    expect(extractLanHostFromExpoUri('http://127.0.0.1:8081')).toBeNull();
    expect(extractLanHostFromExpoUri('http://10.0.2.2:8080')).toBeNull();
    expect(extractLanHostFromExpoUri('https://abc-xyz.exp.direct:80/index.bundle')).toBeNull();
    expect(extractLanHostFromExpoUri('https://demo.ngrok-free.app/bundle')).toBeNull();

    expect(resolveDefaultApiBaseUrl(undefined, { hostUri: 'exp://192.168.1.25:8081' })).toBe(
      'http://192.168.1.25:8080/api/v1'
    );
  });

  it('ngăn treo 30s trên iOS qua tunnel/10.0.2.2 và tự chuyển sang LAN IP khi chạy qua Wi-Fi Metro', () => {
    try {
      resetRuntimeApiConfigForTests();

      // iOS chạy qua tunnel (không có LAN host) -> giữ 10.0.2.2 nhưng fail-fast tức thì 0ms
      configureRuntimeApiBaseUrl({
        platformOs: 'ios',
        scriptUrl: 'https://smartward.exp.direct:80/index.bundle?platform=ios',
      });
      expect(isUnreachableIosDefaultUrl()).toBe(true);
      expect(shouldSkipRagOnlineCall()).toBe(true);

      // iOS chạy qua LAN IP -> tự trỏ sang IP LAN :8080 và cho phép gọi online
      resetRuntimeApiConfigForTests();
      const resolved = configureRuntimeApiBaseUrl({
        platformOs: 'ios',
        scriptUrl: 'http://192.168.1.25:8081/index.bundle?platform=ios',
      });
      expect(resolved).toBe('http://192.168.1.25:8080/api/v1');
      expect(getApiBaseUrl()).toBe('http://192.168.1.25:8080/api/v1');
      expect(isUnreachableIosDefaultUrl()).toBe(false);
      expect(shouldSkipRagOnlineCall()).toBe(false);
    } finally {
      resetRuntimeApiConfigForTests();
    }
  });

  it('quản lý chính xác trạng thái circuit breaker và phân loại lỗi mạng/timeout', () => {
    try {
      resetRuntimeApiConfigForTests();
      expect(shouldSkipRagOnlineCall(1000)).toBe(false);

      markRagBackendNetworkFailure(1000);
      expect(shouldSkipRagOnlineCall(2000)).toBe(true);
      expect(shouldSkipRagOnlineCall(50000)).toBe(false);

      markRagBackendNetworkFailure(1000);
      expect(shouldSkipRagOnlineCall(5000)).toBe(true);
      markRagBackendSuccess();
      expect(shouldSkipRagOnlineCall(5000)).toBe(false);

      markRagBackendNetworkFailure(1000);
      resetRagBackendCircuit();
      expect(shouldSkipRagOnlineCall(5000)).toBe(false);

      expect(isNetworkOrTimeoutError({ code: 'ECONNABORTED' })).toBe(true);
      expect(isNetworkOrTimeoutError({ message: 'Network Error' })).toBe(true);
      expect(isNetworkOrTimeoutError({ response: { status: 429 } })).toBe(false);
    } finally {
      resetRuntimeApiConfigForTests();
    }
  });

  it('bộ nhớ đệm JWT trong RAM hoạt động đồng bộ khi lưu/đọc/xóa phiên cán bộ', async () => {
    try {
      resetOfficerTokenMemoryCache();
      expect(await getOfficerToken()).toBeNull();

      await saveOfficerSession('header.eyJzdWIiOiJDQy0wMSJ9.sig', {
        badgeId: 'CC-AG-8942',
        fullName: 'Nguyễn Văn A',
        wardCode: 'AG_P_LONGXUYEN',
        wardName: 'Phường Long Xuyên',
        role: 'OFFICER',
        mustChangePin: false,
      });
      expect(await getOfficerToken()).toBe('header.eyJzdWIiOiJDQy0wMSJ9.sig');

      await clearOfficerSession();
      expect(await getOfficerToken()).toBeNull();
    } finally {
      await clearOfficerSession();
      resetOfficerTokenMemoryCache();
    }
  });
});
