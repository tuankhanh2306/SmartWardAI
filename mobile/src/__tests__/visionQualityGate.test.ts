import { describe, expect, it } from 'vitest';
import {
  evaluateDocumentVisionGate,
  verifyTemplateMatch,
} from '../core/visionQualityGate';
import {
  DOMAIN_THRESHOLDS,
  getTypographyStyles,
  MIN_TOUCH_TARGET,
} from '../theme/tokens';

describe('visionQualityGate — Chốt chặn Kiểm định Ảnh Trung Thực (TASK-056) & Design Tokens', () => {
  it('xác nhận các hằng số toán học bất biến và kích thước chạm >= 48dp', () => {
    expect(DOMAIN_THRESHOLDS.ragDirectAnswerSimilarity).toBe(0.78);
    expect(DOMAIN_THRESHOLDS.ragHitlLowerSimilarity).toBe(0.42);
    expect(DOMAIN_THRESHOLDS.visionMinSharpnessScore).toBe(45);
    expect(DOMAIN_THRESHOLDS.visionMinBrightnessScore).toBe(55);
    expect(DOMAIN_THRESHOLDS.gpsClusterRadiusMeters).toBe(25.0);
    expect(DOMAIN_THRESHOLDS.semanticClusterThreshold).toBe(0.82);
    expect(MIN_TOUCH_TARGET).toBe(48);
  });

  it('tính toán cỡ chữ động 3 cấp A (1.0x), A+ (1.15x), A++ (1.32x) chuẩn cho người cao tuổi', () => {
    const modeA = getTypographyStyles('A');
    const modeAPlus = getTypographyStyles('A+');
    const modeAPlusPlus = getTypographyStyles('A++');

    expect(modeA.scaleFactor).toBe(1.0);
    expect(modeAPlus.scaleFactor).toBe(1.15);
    expect(modeAPlusPlus.scaleFactor).toBe(1.32);

    expect(modeA.bodyMd.fontSize).toBe(14);
    expect(modeAPlus.bodyMd.fontSize).toBeCloseTo(16.1, 1);
    expect(modeAPlusPlus.bodyMd.fontSize).toBeCloseTo(18.5, 1);
  });

  it('TASK-056: đổi tên ảnh mặt bàn thành TK-KS.jpg và chưa chạy OCR -> NOT_EVALUATED, NOT_RUN, không báo đúng mẫu, không bịa điểm/trường', () => {
    const gate = evaluateDocumentVisionGate({
      expectedFormType: 'TK-KS',
      fileName: 'TK-KS.jpg',
      mimeType: 'image/jpeg',
    });

    expect(gate.canSubmit).toBe(false);
    expect(gate.isVerifiedForSubmission).toBe(false);
    expect(gate.qualityStatus).toBe('NOT_EVALUATED');
    expect(gate.ocrStatus).toBe('NOT_RUN');
    expect(gate.templateMatchStatus).toBe('NOT_CHECKED');
    expect(gate.templateMatched).toBe(false);
    expect(gate.sharpnessScore).toBeNull();
    expect(gate.brightnessScore).toBeNull();
    expect(gate.extractedFieldsCount).toBeNull();
  });

  it('TASK-056: chụp trang sách rõ chữ (có OCR text bất kỳ) -> UNIDENTIFIED, 0 trường phù hợp, không báo đúng mẫu', () => {
    const gate = evaluateDocumentVisionGate({
      expectedFormType: 'TK-KS',
      fileName: 'TK-KS.jpg',
      mimeType: 'image/jpeg',
      readabilityStatus: 'CLEAR',
      ocrStatus: 'COMPLETED',
      rawText: 'Chương 3: Lập trình hướng đối tượng và cấu trúc dữ liệu cơ bản trong Java.',
      extractedFieldsCount: 0,
    });

    expect(gate.canSubmit).toBe(false);
    expect(gate.qualityStatus).toBe('PASS');
    expect(gate.ocrStatus).toBe('COMPLETED');
    expect(gate.templateMatchStatus).toBe('UNIDENTIFIED');
    expect(gate.templateMatched).toBe(false);
    expect(gate.extractedFieldsCount).toBe(0);
    expect(gate.fieldsMessage).toContain('0 trường');
  });

  it('TASK-056: tách bạch OCR lỗi mạng (NETWORK_ERROR) với chưa xác định loại (UNIDENTIFIED)', () => {
    const netErr = evaluateDocumentVisionGate({
      expectedFormType: 'TK-KS',
      fileName: 'capture_01.jpg',
      mimeType: 'image/jpeg',
      ocrStatus: 'NETWORK_ERROR',
    });

    expect(netErr.canSubmit).toBe(false);
    expect(netErr.ocrStatus).toBe('NETWORK_ERROR');
    expect(netErr.templateMatchStatus).toBe('NOT_CHECKED');
    expect(netErr.qualityStatus).toBe('NOT_EVALUATED');
    expect(netErr.extractedFieldsCount).toBeNull();
  });

  it('phân biệt rạch ròi Giấy chứng sinh (BIRTH_CERT) với Tờ khai đăng ký khai sinh (TK-KS) và gợi ý chuyển ô', () => {
    const match = verifyTemplateMatch(
      'BỆNH VIỆN SẢN NHI AN GIANG - GIẤY CHỨNG SINH SỐ 123/2026',
      'TK-KS_capture.jpg',
      'TK-KS'
    );
    expect(match.templateMatched).toBe(false);
    expect(match.detectedFormCode).toBe('BIRTH_CERT');

    const gate = evaluateDocumentVisionGate({
      expectedFormType: 'TK-KS',
      fileName: 'TK-KS_capture.jpg',
      mimeType: 'image/jpeg',
      readabilityStatus: 'CLEAR',
      ocrStatus: 'COMPLETED',
      rawText: 'GIẤY CHỨNG SINH SỐ 123/2026 - BỆNH VIỆN ĐA KHOA AN GIANG',
    });

    expect(gate.canSubmit).toBe(false);
    expect(gate.templateMatchStatus).toBe('WRONG_DOCUMENT');
    expect(gate.detectedFormCode).toBe('BIRTH_CERT');
    expect(gate.suggestedTargetSlot).toBe('BIRTH_CERT');
  });

  it('cho phép gửi khi ảnh rõ nét (>= 45), đủ sáng (>= 55), OCR COMPLETED và đúng mẫu CT01 đã điền', () => {
    const gate = evaluateDocumentVisionGate({
      expectedFormType: 'CT01',
      fileName: 'Mau_CT01_CuTru.jpg',
      mimeType: 'image/jpeg',
      rawText: 'TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ (MẪU CT01 - TT 116/2026/TT-BCA)',
      sharpnessScore: 88,
      brightnessScore: 190,
      extractedFieldsCount: 5,
    });

    expect(gate.canSubmit).toBe(true);
    expect(gate.isBlurry).toBe(false);
    expect(gate.isTooDark).toBe(false);
    expect(gate.templateMatched).toBe(true);
    expect(gate.templateMatchStatus).toBe('MATCHED_FILLED');
    expect(gate.fieldsMessage).toContain('5/5');
  });

  it('khóa cứng nút gửi khi ảnh mờ (sharpnessScore < 45)', () => {
    const gate = evaluateDocumentVisionGate({
      expectedFormType: 'CT01',
      fileName: 'ct01_blur.jpg',
      mimeType: 'image/jpeg',
      rawText: 'MẪU CT01',
      sharpnessScore: 32,
      brightnessScore: 180,
    });

    expect(gate.canSubmit).toBe(false);
    expect(gate.isBlurry).toBe(true);
    expect(gate.qualityStatus).toBe('BLURRY');
    expect(gate.submitButtonLabel).toContain('Chụp Lại Ảnh');
  });

  it('khóa cứng nút gửi khi ảnh thiếu sáng (brightnessScore < 55)', () => {
    const gate = evaluateDocumentVisionGate({
      expectedFormType: 'TK-KS',
      fileName: 'khai_sinh_dark.jpg',
      mimeType: 'image/jpeg',
      rawText: 'TỜ KHAI ĐĂNG KÝ KHAI SINH',
      sharpnessScore: 72,
      brightnessScore: 40,
    });

    expect(gate.canSubmit).toBe(false);
    expect(gate.isTooDark).toBe(true);
    expect(gate.qualityStatus).toBe('TOO_DARK');
    expect(gate.submitButtonLabel).toContain('Chụp Lại Ảnh');
  });

  it('khóa cứng nút gửi khi chọn tab CT01 nhưng tải ảnh Tờ khai Khai sinh (TK-KS)', () => {
    const match = verifyTemplateMatch(
      'TỜ KHAI ĐĂNG KÝ KHAI SINH',
      'to_khai_khai_sinh.jpg',
      'CT01'
    );
    expect(match.templateMatched).toBe(false);
    expect(match.detectedFormCode).toBe('TK-KS');

    const gate = evaluateDocumentVisionGate({
      expectedFormType: 'CT01',
      fileName: 'to_khai_khai_sinh.jpg',
      mimeType: 'image/jpeg',
      rawText: 'TỜ KHAI ĐĂNG KÝ KHAI SINH',
      sharpnessScore: 95,
      brightnessScore: 200,
    });

    expect(gate.canSubmit).toBe(false);
    expect(gate.templateMatched).toBe(false);
    expect(gate.submitButtonLabel).toContain('Chọn Đúng Mẫu');
  });

  it('chấp nhận tệp kỹ thuật số .DOCX/.PDF đạt độ nét 100/100 khi có nội dung đúng mẫu', () => {
    const gate = evaluateDocumentVisionGate({
      expectedFormType: 'TK-BTXH',
      fileName: 'ToKhai_TroCap_BaoTro_TK-BTXH.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      rawText: 'TỜ KHAI TRỢ GIÚP XÃ HỘI NĐ 20/2021/NĐ-CP',
    });

    expect(gate.canSubmit).toBe(true);
    expect(gate.sharpnessScore).toBe(100);
    expect(gate.templateMatched).toBe(true);
  });
});
