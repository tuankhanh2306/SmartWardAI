import { describe, expect, it, vi } from 'vitest';
import {
  generateAppointmentCode,
  loadVaultImageInMemoryOnly,
  lookupDossierByScannedCounterQr,
  sanitizeOfficerDossierForDisplay,
  submitOfficerDossierDecision,
  VAULT_410_GONE_MESSAGE,
} from '../core/officerAuditService';
import { executeDossierSubmissionPipeline } from '../core/dossierSubmitter';
import { evaluateDocumentVisionGate } from '../core/visionQualityGate';
import {
  buildSmartWardPassPayload,
  getAllWalletQrPasses,
  upsertWalletQrPass,
} from '../storage/sqliteDb';
import type { OfficerDossierDto } from '../types/api.types';

describe('apiSyncContract — Chặng M5 (Officer QR Counter, Zero-Trust Vault 410 Gone & E2E Web <-> Mobile)', () => {
  it('sinh mã hẹn chuẩn LH-YYYYMMDD-XXXX', () => {
    const code = generateAppointmentCode(new Date('2026-11-18T09:00:00Z'));
    expect(code).toMatch(/^LH-20261118-\d{4}$/);
  });

  it('che mờ CCCD công dân dạng ********1234 trên mọi bản ghi Bàn Cán Bộ (NĐ 13/2023/NĐ-CP)', () => {
    const raw: OfficerDossierDto = {
      id: 1,
      dossierCode: 'HS-20261118-0010',
      procedureCode: 'TTHC-CR-01',
      procedureName: 'Đăng ký thường trú',
      wardCode: 'AG_P_LONGXUYEN',
      citizenCccd: '089205023490',
      citizenName: 'NGUYỄN MINH TUẤN KHANH',
      status: 'PENDING',
      slaDeadline: '2026-11-25',
      formData: {},
      createdAt: '2026-11-18T08:00:00Z',
      updatedAt: '2026-11-18T08:00:00Z',
    };
    const sanitized = sanitizeOfficerDossierForDisplay(raw);
    expect(sanitized.citizenCccd).toBe('********3490');
  });

  it('xem ảnh Zero-Trust Vault 1 lần trong RAM thành công ở lần 1 và trả HTTP 410 GONE ở lần 2', async () => {
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer;
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jpegHeader)
      .mockRejectedValueOnce({ response: { status: 410 } });

    const first = await loadVaultImageInMemoryOnly('OTT_TEST_001', fetcher);
    expect(first.success).toBe(true);
    expect(first.consumed410).toBe(false);
    expect(first.dataUri).toMatch(/^data:image\/jpeg;base64,/);

    const second = await loadVaultImageInMemoryOnly('OTT_TEST_001', fetcher);
    expect(second.success).toBe(false);
    expect(second.consumed410).toBe(true);
    expect(second.message).toBe(VAULT_410_GONE_MESSAGE);
  });

  it('tra cứu QR tại quầy (SMARTWARD_PASS|...) thành công và chặn chéo địa bàn HTTP 403 SEC-09', async () => {
    const lookupOk = vi.fn().mockResolvedValue({
      id: 2,
      dossierCode: 'HS-20261118-0022',
      procedureCode: 'TTHC-HT-01',
      procedureName: 'Đăng ký khai sinh',
      wardCode: 'AG_P_LONGXUYEN',
      citizenCccd: '089195001122',
      citizenName: 'TRẦN THỊ MAI',
      status: 'APPROVED',
      appointmentCode: 'LH-20261118-5566',
      slaDeadline: '2026-11-20',
      formData: {},
      createdAt: '2026-11-18T08:00:00Z',
      updatedAt: '2026-11-18T08:30:00Z',
    });

    const okRes = await lookupDossierByScannedCounterQr(
      'SMARTWARD_PASS|HS-20261118-0022|LH-20261118-5566|AG_P_LONGXUYEN',
      lookupOk
    );
    expect(okRes.success).toBe(true);
    expect(okRes.dossier?.citizenCccd).toBe('********1122');

    const lookupCrossWard = vi.fn().mockRejectedValue({ response: { status: 403 } });
    const blockedRes = await lookupDossierByScannedCounterQr(
      'SMARTWARD_PASS|HS-20261118-0099|LH-20261118-9999|AG_DK_PHUQUOC',
      lookupCrossWard
    );
    expect(blockedRes.success).toBe(false);
    expect(blockedRes.crossWardBlocked).toBe(true);
    expect(blockedRes.message).toContain('SEC-09');
  });

  it('phê duyệt 1 chạm tự động sinh mã hẹn LH-... và gửi yêu cầu bổ sung đúng contract', async () => {
    const baseDossier: OfficerDossierDto = {
      id: 3,
      dossierCode: 'HS-20261118-0033',
      procedureCode: 'TTHC-CR-01',
      procedureName: 'Đăng ký thường trú',
      wardCode: 'AG_P_LONGXUYEN',
      citizenCccd: '********3490',
      citizenName: 'NGUYỄN MINH TUẤN KHANH',
      status: 'PENDING',
      slaDeadline: '2026-11-25',
      formData: {},
      createdAt: '2026-11-18T08:00:00Z',
      updatedAt: '2026-11-18T08:00:00Z',
    };

    const reviewApi = vi.fn().mockImplementation(async (_code, payload) => ({
      ...baseDossier,
      status: payload.status,
      officerFeedback: payload.officerFeedback,
      appointmentCode: payload.appointmentCode,
    }));

    const approved = await submitOfficerDossierDecision(
      baseDossier,
      'APPROVED',
      'Hợp lệ 100%, mời đến Quầy số 2.',
      reviewApi
    );
    expect(approved.status).toBe('APPROVED');
    expect(approved.appointmentCode).toMatch(/^LH-\d{8}-\d{4}$/);

    const supp = await submitOfficerDossierDecision(
      baseDossier,
      'SUPPLEMENT_REQUIRED',
      'Thiếu chữ ký chủ hộ ở Mục 11.',
      reviewApi
    );
    expect(supp.status).toBe('SUPPLEMENT_REQUIRED');
    expect(supp.officerFeedback).toContain('Mục 11');
  });

  it('E2E Chiều 1 (Mobile nộp Khai sinh -> Web Officer duyệt -> Mobile Ví QR nhận mã LH-...)', async () => {
    const dossierCode = 'HS-E2E-M1-0001';
    const submitRes = await executeDossierSubmissionPipeline(
      {
        wardCode: 'AG_P_LONGXUYEN',
        wardName: 'Phường Long Xuyên',
        visionGate: evaluateDocumentVisionGate({
          expectedFormType: 'TK-KS',
          fileName: 'tkks_verified.jpg',
          mimeType: 'image/jpeg',
          rawText: 'Tờ khai đăng ký khai sinh TK-KS',
          sharpnessScore: 96,
          brightnessScore: 198,
        }),
        attachment: null,
        validationInput: {
          formType: 'TK-KS',
          fullName: 'NGUYỄN MINH AN',
          citizenCccd: '089205023490',
          dateOfBirth: '2026-10-25',
          address: 'Số 18 Trần Hưng Đạo, Phường Long Xuyên',
          citizenEmail: 'congdan@gmail.com',
          qrVerified: true,
          referenceDate: new Date('2026-11-18T00:00:00Z'),
          extra: {
            motherName: 'TRẦN THỊ BÌNH',
            hospitalMotherName: 'TRẦN THỊ BÌNH',
            hospitalBirthDate: '2026-10-25',
            parentsMarried: 'YES',
          },
        },
      },
      {
        precheckApi: vi.fn().mockResolvedValue({
          submissionId: 'SUB-E2E',
          procedureCode: 'TTHC-HT-01',
          overallValid: true,
          fieldValidations: [],
          warnings: [],
          processedAt: '2026-11-18T09:00:00Z',
          processingTimeMs: 10,
        }),
        submitDossierApi: vi.fn().mockResolvedValue({
          dossierCode,
          procedureCode: 'TTHC-HT-01',
          wardCode: 'AG_P_LONGXUYEN',
          status: 'PENDING',
          slaDeadline: '2026-11-25',
          createdAt: '2026-11-18T09:00:00Z',
        }),
      }
    );

    expect(submitRes.success).toBe(true);
    expect(submitRes.walletRow?.status).toBe('PENDING');

    // Simulate Web Officer approving & issuing LH-20261118-9001 -> synced back to SQLite Wallet
    const approvedPass = {
      ...submitRes.walletRow!,
      status: 'APPROVED',
      appointment_code: 'LH-20261118-9001',
      officer_feedback: 'Hồ sơ CT01 đã duyệt trên Web Dashboard.',
      qr_payload: buildSmartWardPassPayload(dossierCode, 'LH-20261118-9001', 'AG_P_LONGXUYEN'),
      synced_at: Date.now(),
    };
    await upsertWalletQrPass(approvedPass);

    const wallet = await getAllWalletQrPasses();
    const synced = wallet.find((w) => w.dossier_code === dossierCode);
    expect(synced?.status).toBe('APPROVED');
    expect(synced?.appointment_code).toBe('LH-20261118-9001');
  });

  it('E2E Chiều 2 (Web nộp hồ sơ -> Mobile lưu Ví Offline -> Cán bộ quét QR trên Mobile tại quầy)', async () => {
    const webQrPayload = 'SMARTWARD_PASS|HS-WEB-2026-7788|LH-20261118-7788|AG_P_LONGXUYEN';

    await upsertWalletQrPass({
      dossier_code: 'HS-WEB-2026-7788',
      appointment_code: 'LH-20261118-7788',
      procedure_code: 'TTHC-HT-02',
      procedure_name: 'Đăng ký kết hôn',
      ward_code: 'AG_P_LONGXUYEN',
      ward_name: 'Phường Long Xuyên',
      citizen_name: 'LÊ VĂN AN',
      citizen_cccd_mask: '********4455',
      citizen_last4: '4455',
      citizen_email: 'an@gmail.com',
      status: 'APPROVED',
      officer_feedback: 'Mời 2 bên đến ký Sổ hộ tịch.',
      sla_deadline: '2026-11-20',
      qr_payload: webQrPayload,
      synced_at: Date.now(),
    });

    const counterScan = await lookupDossierByScannedCounterQr(
      webQrPayload,
      vi.fn().mockResolvedValue({
        id: 88,
        dossierCode: 'HS-WEB-2026-7788',
        procedureCode: 'TTHC-HT-02',
        procedureName: 'Đăng ký kết hôn',
        wardCode: 'AG_P_LONGXUYEN',
        citizenCccd: '089200004455',
        citizenName: 'LÊ VĂN AN',
        status: 'APPROVED',
        appointmentCode: 'LH-20261118-7788',
        slaDeadline: '2026-11-20',
        formData: {},
        createdAt: '2026-11-18T08:00:00Z',
        updatedAt: '2026-11-18T08:30:00Z',
      })
    );

    expect(counterScan.success).toBe(true);
    expect(counterScan.dossier?.dossierCode).toBe('HS-WEB-2026-7788');
    expect(counterScan.dossier?.citizenCccd).toBe('********4455');
  });
});
