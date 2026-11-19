import { describe, expect, it } from 'vitest';
import {
  evaluateDocumentVisionGate,
  simulateVisionGatePreset,
  verifyTemplateMatch,
} from '../core/visionQualityGate';
import {
  DOMAIN_THRESHOLDS,
  getTypographyStyles,
  MIN_TOUCH_TARGET,
} from '../theme/tokens';

describe('visionQualityGate — Chốt chặn AI Thị Giác 3 tiêu chí & Design Tokens', () => {
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

  it('cho phép gửi khi ảnh rõ nét (>= 45), đủ sáng (>= 55) và đúng mẫu CT01', () => {
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
    expect(gate.fieldsMessage).toBe('5/5 mục rõ chữ');
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
      'TỜ KHAI ĐĂNG KÝ KHAI SINH - GIẤY CHỨNG SINH',
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

  it('chấp nhận tệp kỹ thuật số .DOCX/.PDF đạt độ nét 100/100 khi đúng mẫu', () => {
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

  it('hỗ trợ 3 chế độ mô phỏng hội đồng GOOD / BLURRY / WRONG_TEMPLATE', () => {
    const good = simulateVisionGatePreset('GOOD', 'CT01');
    const blurry = simulateVisionGatePreset('BLURRY', 'CT01');
    const wrong = simulateVisionGatePreset('WRONG_TEMPLATE', 'CT01');

    expect(good.canSubmit).toBe(true);
    expect(blurry.canSubmit).toBe(false);
    expect(blurry.isBlurry).toBe(true);
    expect(wrong.canSubmit).toBe(false);
    expect(wrong.templateMatched).toBe(false);
    expect(wrong.detectedFormCode).toBe('TK-KS');
  });
});
