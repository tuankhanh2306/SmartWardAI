import { describe, expect, it } from 'vitest';
import {
  computePrefillPlan,
  evaluateBirthSlotCompleteness,
  evaluateServerOcrIntoVisionGate,
  reassignCapturedPageSlot,
  type CapturedDocumentPage,
} from '../core/birthDocumentWorkflow';

describe('birthDocumentWorkflow — TASK-057 (Khung chụp, 4 trạng thái OCR, chuyển ô 1 chạm & điền nháp dd-mm-yyyy)', () => {
  it('phân biệt mẫu đã điền, mẫu trống, chữ mờ 0 trường (KHÔNG coi là mẫu trống), lóa/cắt góc, trang sách và dịch vụ UNAVAILABLE', () => {
    const filled = evaluateServerOcrIntoVisionGate(
      {
        valid: true,
        ocrStatus: 'COMPLETED',
        readabilityStatus: 'CLEAR',
        detectedDocumentType: 'TK_KS',
        isBlankTemplate: false,
        matchedFieldCount: 5,
      },
      'TK-KS',
      'doc_1.jpg',
      'image/jpeg'
    );
    expect(filled.isVerifiedForSubmission).toBe(true);
    expect(filled.templateMatchStatus).toBe('MATCHED_FILLED');

    const blankOfficial = evaluateServerOcrIntoVisionGate(
      {
        valid: false,
        ocrStatus: 'COMPLETED',
        readabilityStatus: 'CLEAR',
        detectedDocumentType: 'TK_KS',
        isBlankTemplate: true,
        matchedFieldCount: 0,
      },
      'TK-KS',
      'doc_blank.jpg',
      'image/jpeg'
    );
    expect(blankOfficial.isVerifiedForSubmission).toBe(false);
    expect(blankOfficial.templateMatchStatus).toBe('MATCHED_BLANK');

    // CRITICAL: Faint/blurry image reading 0 fields must NOT be classified as MATCHED_BLANK!
    const faintZeroFields = evaluateServerOcrIntoVisionGate(
      {
        valid: false,
        ocrStatus: 'COMPLETED',
        readabilityStatus: 'BLURRY',
        detectedDocumentType: 'TK_KS',
        isBlankTemplate: true,
        matchedFieldCount: 0,
      },
      'TK-KS',
      'doc_faint.jpg',
      'image/jpeg'
    );
    expect(faintZeroFields.isVerifiedForSubmission).toBe(false);
    expect(faintZeroFields.qualityStatus).toBe('BLURRY');
    expect(faintZeroFields.templateMatchStatus).not.toBe('MATCHED_BLANK');

    const glare = evaluateServerOcrIntoVisionGate(
      {
        valid: false,
        ocrStatus: 'COMPLETED',
        readabilityStatus: 'GLARE',
        detectedDocumentType: 'TK_KS',
        matchedFieldCount: 1,
      },
      'TK-KS',
      'doc_glare.jpg',
      'image/jpeg'
    );
    expect(glare.qualityStatus).toBe('GLARE');
    expect(glare.canSubmit).toBe(false);

    const cropped = evaluateServerOcrIntoVisionGate(
      {
        valid: false,
        ocrStatus: 'COMPLETED',
        readabilityStatus: 'CROPPED',
        detectedDocumentType: 'TK_KS',
        matchedFieldCount: 2,
      },
      'TK-KS',
      'doc_cropped.jpg',
      'image/jpeg'
    );
    expect(cropped.qualityStatus).toBe('CROPPED');
    expect(cropped.canSubmit).toBe(false);

    const bookPage = evaluateServerOcrIntoVisionGate(
      {
        valid: false,
        ocrStatus: 'COMPLETED',
        readabilityStatus: 'CLEAR',
        detectedDocumentType: 'OTHER_TEXT',
        isBlankTemplate: true,
        matchedFieldCount: 0,
      },
      'TK-KS',
      'TK-KS.jpg',
      'image/jpeg'
    );
    expect(bookPage.templateMatchStatus).toBe('UNIDENTIFIED');
    expect(bookPage.extractedFieldsCount).toBe(0);

    const unavailable = evaluateServerOcrIntoVisionGate(
      {
        valid: false,
        ocrStatus: 'UNAVAILABLE',
        readabilityStatus: 'NOT_EVALUATED',
        detectedDocumentType: 'UNKNOWN',
      },
      'TK-KS',
      'doc_offline.jpg',
      'image/jpeg'
    );
    expect(unavailable.ocrStatus).toBe('UNAVAILABLE');
    expect(unavailable.qualityStatus).toBe('NOT_EVALUATED');
    expect(unavailable.extractedFieldsCount).toBeNull();
  });

  it('chụp nhầm Giấy chứng sinh vào ô Tờ khai TK-KS -> gợi ý chuyển 1 chạm sang ô BIRTH_CERT và giữ nguyên ảnh', () => {
    const wrongSlotGate = evaluateServerOcrIntoVisionGate(
      {
        valid: true,
        ocrStatus: 'COMPLETED',
        readabilityStatus: 'CLEAR',
        detectedDocumentType: 'BIRTH_CERT',
        isBlankTemplate: false,
        matchedFieldCount: 4,
      },
      'TK-KS',
      'photo_gcs.jpg',
      'image/jpeg'
    );

    expect(wrongSlotGate.templateMatchStatus).toBe('WRONG_DOCUMENT');
    expect(wrongSlotGate.suggestedTargetSlot).toBe('BIRTH_CERT');

    const initialPages: CapturedDocumentPage[] = [
      {
        id: 'p1',
        slotRole: 'TK-KS',
        docLabel: 'Tờ khai đăng ký khai sinh (TK-KS)',
        pageIndex: 1,
        uri: 'file:///local/photo_gcs.jpg',
        fileName: 'photo_gcs.jpg',
        mimeType: 'image/jpeg',
        gate: wrongSlotGate,
      },
    ];

    const reassigned = reassignCapturedPageSlot(initialPages, 'p1', 'BIRTH_CERT');
    expect(reassigned[0].slotRole).toBe('BIRTH_CERT');
    expect(reassigned[0].uri).toBe('file:///local/photo_gcs.jpg');
    expect(reassigned[0].gate.isVerifiedForSubmission).toBe(true);
    expect(reassigned[0].gate.templateMatchStatus).toBe('MATCHED_FILLED');
  });

  it('ảnh tham khảo chưa xác minh không làm hồ sơ Khai sinh thành đủ giấy tờ bắt buộc', () => {
    const verifiedTkKs = evaluateServerOcrIntoVisionGate(
      {
        valid: true,
        ocrStatus: 'COMPLETED',
        readabilityStatus: 'CLEAR',
        detectedDocumentType: 'TK_KS',
        matchedFieldCount: 5,
      },
      'TK-KS',
      'tkks_p1.jpg',
      'image/jpeg'
    );
    const unverifiedRef = evaluateServerOcrIntoVisionGate(
      {
        valid: false,
        ocrStatus: 'UNAVAILABLE',
        readabilityStatus: 'NOT_EVALUATED',
        detectedDocumentType: 'UNKNOWN',
      },
      'BIRTH_CERT',
      'gcs_ref.jpg',
      'image/jpeg'
    );

    const status = evaluateBirthSlotCompleteness([
      {
        id: 'tk1',
        slotRole: 'TK-KS',
        docLabel: 'Tờ khai đăng ký khai sinh (TK-KS)',
        pageIndex: 1,
        uri: 'file:///tk1.jpg',
        fileName: 'tkks_p1.jpg',
        mimeType: 'image/jpeg',
        gate: verifiedTkKs,
      },
      {
        id: 'ref1',
        slotRole: 'BIRTH_CERT',
        docLabel: 'Giấy chứng sinh',
        pageIndex: 1,
        uri: 'file:///gcs_ref.jpg',
        fileName: 'gcs_ref.jpg',
        mimeType: 'image/jpeg',
        gate: unverifiedRef,
        attachedAsReference: true,
      },
    ]);

    expect(status.hasVerifiedTkKs).toBe(true);
    expect(status.hasVerifiedBirthCert).toBe(false);
    expect(status.isComplete).toBe(false);
    expect(status.hasUnverifiedReferenceOnly).toBe(true);
  });

  it('đối chiếu điền nháp chuẩn hóa ngày sinh sang dd-mm-yyyy và phân biệt trường mới vs ghi đè', () => {
    const plan = computePrefillPlan(
      'TK-KS',
      'BIRTH_CERT',
      {
        fullName: 'NGUYỄN BÉ CŨ',
        citizenCccd: '',
        dateOfBirth: '',
        gender: 'Nam',
        address: '',
        phoneNumber: '',
        motherName: '',
        fatherName: '',
        hospitalBirthDate: '',
        hospitalMotherName: '',
      },
      {
        childFullName: 'NGUYỄN MINH AN',
        childDob: '2026-10-15',
        motherFullName: 'TRẦN THỊ HOA',
        birthCertNumber: 'GCS-2026-888',
        hospitalName: 'Bệnh viện Sản Nhi An Giang',
      }
    );

    const dobItem = plan.items.find((i) => i.key === 'dateOfBirth');
    expect(dobItem?.extractedValue).toBe('15-10-2026');
    expect(dobItem?.willOverwrite).toBe(false);

    const nameItem = plan.items.find((i) => i.key === 'fullName');
    expect(nameItem?.willOverwrite).toBe(true);
    expect(plan.overwriteCount).toBe(1);
    expect(plan.newCount).toBeGreaterThanOrEqual(4);
  });
});
