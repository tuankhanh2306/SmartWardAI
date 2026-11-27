import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  executeDossierSubmissionPipeline,
} from '../core/dossierSubmitter';
import {
  evaluateServerOcrIntoVisionGate,
  type CapturedDocumentPage,
} from '../core/birthDocumentWorkflow';
import {
  loadPersistedDossierAttachments,
  resetDossierAttachmentMemoryStoreForTests,
} from '../storage/dossierAttachmentStore';

const REF_DATE = new Date('2026-11-27T00:00:00Z');

function makeBirthPages(): CapturedDocumentPage[] {
  const tkKsGate = evaluateServerOcrIntoVisionGate(
    {
      valid: true,
      ocrStatus: 'COMPLETED',
      readabilityStatus: 'CLEAR',
      detectedDocumentType: 'TK_KS',
      isBlankTemplate: false,
      matchedFieldCount: 5,
    },
    'TK-KS',
    'tkks_page1.jpg',
    'image/jpeg'
  );
  const birthCertGate = evaluateServerOcrIntoVisionGate(
    {
      valid: true,
      ocrStatus: 'COMPLETED',
      readabilityStatus: 'CLEAR',
      detectedDocumentType: 'BIRTH_CERT',
      isBlankTemplate: false,
      matchedFieldCount: 4,
    },
    'BIRTH_CERT',
    'gcs_page1.jpg',
    'image/jpeg'
  );

  return [
    {
      id: 'pg-tkks-1',
      slotRole: 'TK-KS',
      docLabel: 'Tờ khai đăng ký khai sinh (TK-KS)',
      pageIndex: 1,
      uri: 'file:///docs/dossier_attachments/tkks_p1.jpg',
      fileName: 'tkks_page1.jpg',
      mimeType: 'image/jpeg',
      gate: tkKsGate,
      uploadStatus: 'PENDING',
    },
    {
      id: 'pg-gcs-1',
      slotRole: 'BIRTH_CERT',
      docLabel: 'Giấy chứng sinh',
      pageIndex: 1,
      uri: 'file:///docs/dossier_attachments/gcs_p1.jpg',
      fileName: 'gcs_page1.jpg',
      mimeType: 'image/jpeg',
      gate: birthCertGate,
      uploadStatus: 'PENDING',
    },
  ];
}

const VALID_BIRTH_INPUT = {
  formType: 'TK-KS' as const,
  fullName: 'NGUYỄN MINH AN',
  citizenCccd: '089195001234',
  dateOfBirth: '15-10-2026',
  gender: 'Nam' as const,
  address: 'Số 10 Trần Hưng Đạo, Phường Long Xuyên',
  citizenEmail: 'cha.me@gmail.com',
  phoneNumber: '0918234567',
  referenceDate: REF_DATE,
  extra: {
    motherName: 'TRẦN THỊ HOA',
    fatherName: 'NGUYỄN VĂN NAM',
    hospitalBirthDate: '15-10-2026',
    hospitalMotherName: 'TRẦN THỊ HOA',
    parentsMarried: 'YES' as const,
  },
};

describe('TASK-058 — Lưu bền ảnh đính kèm, chống trùng Idempotency & đối chiếu biên nhận', () => {
  beforeEach(() => {
    resetDossierAttachmentMemoryStoreForTests();
  });

  it('Kịch bản (a): Ngắt mạng khi đang tải ảnh thứ 2 -> giữ nguyên ảnh 1 đã UPLOADED & ảnh 2 chưa xóa, thử lại chỉ tải ảnh thứ 2', async () => {
    const precheckApi = vi.fn().mockResolvedValue({
      submissionId: 'SUB-058-A',
      procedureCode: 'TTHC-HT-01',
      overallValid: true,
      fieldValidations: [],
      warnings: [],
      processedAt: '2026-11-27T09:00:00Z',
      processingTimeMs: 10,
    });
    const vaultUploadApi = vi
      .fn()
      .mockResolvedValueOnce({
        docId: 'DOC_TKKS_001',
        documentCode: 'DOC_TKKS_001',
        oneTimeToken: 'OTT_TKKS_001',
        viewUrl: '/api/v1/vault/view/OTT_TKKS_001',
        watermarkApplied: true,
      })
      .mockRejectedValueOnce(new Error('Network Timeout on photo 2'))
      .mockResolvedValueOnce({
        docId: 'DOC_GCS_001',
        documentCode: 'DOC_GCS_001',
        oneTimeToken: 'OTT_GCS_001',
        viewUrl: '/api/v1/vault/view/OTT_GCS_001',
        watermarkApplied: true,
      });

    const submitDossierApi = vi.fn().mockResolvedValue({
      dossierCode: 'HS-20261127-058A',
      procedureCode: 'TTHC-HT-01',
      wardCode: 'AG_P_LONGXUYEN',
      status: 'PENDING',
      slaDeadline: '2026-11-28T17:00:00Z',
      createdAt: '2026-11-27T09:00:00Z',
      vaultDocIds: ['OTT_TKKS_001', 'OTT_GCS_001'],
    });
    const deleteTempFile = vi.fn().mockResolvedValue(true);

    // Attempt 1: photo #2 fails
    const attempt1 = await executeDossierSubmissionPipeline(
      {
        wardCode: 'AG_P_LONGXUYEN',
        wardName: 'Phường Long Xuyên',
        visionGate: null,
        attachment: null,
        attachments: makeBirthPages(),
        validationInput: VALID_BIRTH_INPUT,
      },
      { precheckApi, vaultUploadApi, submitDossierApi, deleteTempFile }
    );

    expect(attempt1.success).toBe(false);
    expect(attempt1.stage).toBe('UPLOAD_FAILED');
    expect(deleteTempFile).not.toHaveBeenCalled();
    expect(submitDossierApi).not.toHaveBeenCalled();

    // Simulate closing & reopening app: reload persisted state
    const restored = await loadPersistedDossierAttachments('TK-KS');
    expect(restored?.pages).toHaveLength(2);
    expect(restored?.pages[0].uploadStatus).toBe('UPLOADED');
    expect(restored?.pages[0].documentCode).toBe('DOC_TKKS_001');
    expect(restored?.pages[0].oneTimeToken).toBe('OTT_TKKS_001');
    expect(restored?.pages[1].uploadStatus).toBe('FAILED');

    // Attempt 2: retry uploads ONLY photo #2 (total 3 calls, NOT 4!)
    const attempt2 = await executeDossierSubmissionPipeline(
      {
        wardCode: 'AG_P_LONGXUYEN',
        wardName: 'Phường Long Xuyên',
        visionGate: null,
        attachment: null,
        attachments: restored!.pages,
        validationInput: VALID_BIRTH_INPUT,
      },
      { precheckApi, vaultUploadApi, submitDossierApi, deleteTempFile }
    );

    expect(attempt2.success).toBe(true);
    expect(attempt2.stage).toBe('SUBMITTED_ONLINE');
    expect(attempt2.dossierCode).toBe('HS-20261127-058A');
    expect(vaultUploadApi).toHaveBeenCalledTimes(3); // 1 (ok) + 1 (fail) + 1 (retry photo #2 only)
    expect(deleteTempFile).toHaveBeenCalledTimes(2); // Cleaned ONLY after server receipt confirmed both!
    expect(attempt2.attachedDocuments).toEqual([
      expect.objectContaining({
        documentCode: 'DOC_TKKS_001',
        oneTimeToken: 'OTT_TKKS_001',
        docRole: 'TK-KS',
        pageIndex: 1,
        verified: true,
      }),
      expect.objectContaining({
        documentCode: 'DOC_GCS_001',
        oneTimeToken: 'OTT_GCS_001',
        docRole: 'BIRTH_CERT',
        pageIndex: 1,
        verified: true,
      }),
    ]);
    expect(await loadPersistedDossierAttachments('TK-KS')).toBeNull();
  });

  it('Kịch bản (b): Ngắt mạng SAU KHI máy chủ ghi hồ sơ nhưng TRƯỚC KHI nhận biên nhận -> mở lại gửi lại dùng đúng cùng Idempotency-Key và chỉ có 1 mã hồ sơ', async () => {
    const precheckApi = vi.fn().mockResolvedValue({
      submissionId: 'SUB-058-B',
      procedureCode: 'TTHC-HT-01',
      overallValid: true,
      fieldValidations: [],
      warnings: [],
      processedAt: '2026-11-27T09:00:00Z',
      processingTimeMs: 10,
    });
    const vaultUploadApi = vi
      .fn()
      .mockResolvedValueOnce({
        docId: 'DOC_B1',
        documentCode: 'DOC_B1',
        oneTimeToken: 'OTT_B1',
        viewUrl: '/api/v1/vault/view/OTT_B1',
        watermarkApplied: true,
      })
      .mockResolvedValueOnce({
        docId: 'DOC_B2',
        documentCode: 'DOC_B2',
        oneTimeToken: 'OTT_B2',
        viewUrl: '/api/v1/vault/view/OTT_B2',
        watermarkApplied: true,
      });

    // Server stores on first call by Idempotency-Key, simulates dropped HTTP response, returns same dossierCode on retry
    const serverByIdempKey = new Map<string, string>();
    let firstCall = true;
    const submitDossierApi = vi.fn().mockImplementation(async (req) => {
      const key = req.idempotencyKey as string;
      const existingCode = serverByIdempKey.get(key) || 'HS-20261127-SINGLE';
      serverByIdempKey.set(key, existingCode);
      if (firstCall) {
        firstCall = false;
        throw new Error('Connection reset before receipt arrived');
      }
      return {
        dossierCode: existingCode,
        procedureCode: req.procedureCode,
        wardCode: req.wardCode,
        status: 'PENDING',
        slaDeadline: '2026-11-28T17:00:00Z',
        createdAt: '2026-11-27T09:00:00Z',
        vaultDocIds: req.vaultDocIds,
      };
    });
    const deleteTempFile = vi.fn().mockResolvedValue(true);

    // Attempt 1: both photos upload, server writes dossier, response drops
    const res1 = await executeDossierSubmissionPipeline(
      {
        wardCode: 'AG_P_LONGXUYEN',
        wardName: 'Phường Long Xuyên',
        visionGate: null,
        attachment: null,
        attachments: makeBirthPages(),
        validationInput: VALID_BIRTH_INPUT,
      },
      { precheckApi, vaultUploadApi, submitDossierApi, deleteTempFile }
    );

    expect(res1.success).toBe(false);
    expect(deleteTempFile).not.toHaveBeenCalled();
    const firstIdempKey = res1.idempotencyKey;
    expect(firstIdempKey).toBeTruthy();

    // Reopen app & retry
    const restored = await loadPersistedDossierAttachments('TK-KS');
    expect(restored?.pages.every((p) => p.uploadStatus === 'UPLOADED')).toBe(true);

    const res2 = await executeDossierSubmissionPipeline(
      {
        wardCode: 'AG_P_LONGXUYEN',
        wardName: 'Phường Long Xuyên',
        visionGate: null,
        attachment: null,
        attachments: restored!.pages,
        validationInput: VALID_BIRTH_INPUT,
      },
      { precheckApi, vaultUploadApi, submitDossierApi, deleteTempFile }
    );

    expect(res2.success).toBe(true);
    expect(res2.dossierCode).toBe('HS-20261127-SINGLE');
    expect(res2.idempotencyKey).toBe(firstIdempKey);
    expect(serverByIdempKey.size).toBe(1); // Exactly ONE dossier created!
    expect(vaultUploadApi).toHaveBeenCalledTimes(2); // Zero redundant photo re-uploads!
    expect(deleteTempFile).toHaveBeenCalledTimes(2); // Cleaned ONLY after receipt confirmed!
  });

  it('giữ lại ảnh tạm nếu biên nhận máy chủ thiếu mã ảnh (RECEIPT_MISMATCH)', async () => {
    const precheckApi = vi.fn().mockResolvedValue({
      submissionId: 'SUB-058-C',
      procedureCode: 'TTHC-HT-01',
      overallValid: true,
      fieldValidations: [],
      warnings: [],
      processedAt: '2026-11-27T09:00:00Z',
      processingTimeMs: 10,
    });
    const vaultUploadApi = vi
      .fn()
      .mockResolvedValueOnce({
        docId: 'DOC_C1',
        documentCode: 'DOC_C1',
        oneTimeToken: 'OTT_C1',
        viewUrl: '/api/v1/vault/view/OTT_C1',
        watermarkApplied: true,
      })
      .mockResolvedValueOnce({
        docId: 'DOC_C2',
        documentCode: 'DOC_C2',
        oneTimeToken: 'OTT_C2',
        viewUrl: '/api/v1/vault/view/OTT_C2',
        watermarkApplied: true,
      });
    const submitDossierApi = vi.fn().mockResolvedValue({
      dossierCode: 'HS-20261127-MISMATCH',
      procedureCode: 'TTHC-HT-01',
      wardCode: 'AG_P_LONGXUYEN',
      status: 'PENDING',
      createdAt: '2026-11-27T09:00:00Z',
      vaultDocIds: ['OTT_C1'], // Missing OTT_C2!
    });
    const deleteTempFile = vi.fn().mockResolvedValue(true);

    const res = await executeDossierSubmissionPipeline(
      {
        wardCode: 'AG_P_LONGXUYEN',
        wardName: 'Phường Long Xuyên',
        visionGate: null,
        attachment: null,
        attachments: makeBirthPages(),
        validationInput: VALID_BIRTH_INPUT,
      },
      { precheckApi, vaultUploadApi, submitDossierApi, deleteTempFile }
    );

    expect(res.success).toBe(false);
    expect(res.stage).toBe('RECEIPT_MISMATCH');
    expect(deleteTempFile).not.toHaveBeenCalled();
  });
});
