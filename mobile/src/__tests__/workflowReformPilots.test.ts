import { describe, expect, it, vi } from 'vitest';
import { executeDossierSubmissionPipeline } from '../core/dossierSubmitter';
import {
  getProcedureRouting,
  PROCEDURES_ROUTING_CATALOG,
} from '../core/proceduresRoutingCatalog';
import {
  buildElectronicQrPassHtml,
  getDossierStatusVietnamese,
} from '../core/qrPassPdfExporter';
import {
  buildOfficialReceiptQrPayload,
  buildSmartWardPassPayload,
  type WalletQrPassRow,
} from '../storage/sqliteDb';

describe('workflowReformPilots — Kiểm thử 4 tiêu chí cải cách TTHC 2026', () => {
  it('1. Danh mục chuẩn hóa 40/40 thủ tục, không còn Đà Nẵng, BT-05 PENDING_VERIFICATION, XD-01/XD-02 khôi phục Xây dựng', () => {
    expect(PROCEDURES_ROUTING_CATALOG).toHaveLength(40);

    const coreFieldsSerialized = JSON.stringify(
      PROCEDURES_ROUTING_CATALOG.map(
        ({ code, name, category, receivingAgency, appraisalUnit, signingAuthority }) => ({
          code,
          name,
          category,
          receivingAgency,
          appraisalUnit,
          signingAuthority,
        })
      )
    ).toLowerCase();
    expect(coreFieldsSerialized).not.toContain('đà nẵng');
    const serialized = JSON.stringify(PROCEDURES_ROUTING_CATALOG).toLowerCase();
    expect(serialized).not.toContain('124/2026');
    expect(serialized).not.toContain('135/2026');

    const bt05 = getProcedureRouting('TTHC-BT-05');
    expect(bt05?.submissionMode).toBe('REFERENCE_ONLY');
    expect(bt05?.catalogStatus).toBe('PENDING_VERIFICATION');

    const xd01 = getProcedureRouting('TTHC-XD-01');
    const xd02 = getProcedureRouting('TTHC-XD-02');
    expect(xd01?.submissionMode).toBe('REFERENCE_ONLY');
    expect(xd02?.submissionMode).toBe('REFERENCE_ONLY');
    expect(xd01?.name.toLowerCase()).toContain('xây dựng');
    expect(xd02?.name.toLowerCase()).toContain('khởi công');

    const w1Codes = PROCEDURES_ROUTING_CATALOG.filter((p) => p.workflowGroup === 'W1')
      .map((p) => p.code)
      .sort();
    expect(w1Codes).toEqual([
      'TTHC-CR-01',
      'TTHC-CR-03',
      'TTHC-CR-06',
      'TTHC-CR-07',
      'TTHC-CR-08',
    ]);
  });

  it('2. CT01 (TTHC-CR-01) đi Phương án 3A (EXTERNAL_CHANNEL_GUIDED), không gọi POST /dossiers UBND', async () => {
    const submitDossierApi = vi.fn();
    const res = await executeDossierSubmissionPipeline(
      {
        wardCode: 'AG_P_LONGXUYEN',
        wardName: 'Phường Long Xuyên',
        visionGate: null,
        attachment: null,
        validationInput: {
          formType: 'CT01',
          fullName: 'NGUYỄN VĂN AN',
          citizenCccd: '089095001234',
          dateOfBirth: '1995-01-10',
          gender: 'Nam',
          address: 'Phường Long Xuyên, An Giang',
          citizenEmail: 'an@example.invalid',
          phoneNumber: '0918111222',
          qrVerified: true,
          referenceDate: new Date('2026-11-28T00:00:00Z'),
          extra: {
            hostCccdNumber: '089075001122',
            hostDateOfBirth: '1975-03-10',
            vneidHostConfirmed: true,
          },
        },
      },
      { submitDossierApi }
    );

    expect(res.success).toBe(true);
    expect(res.stage).toBe('EXTERNAL_CHANNEL_GUIDED');
    expect(res.message).toContain('Công an cấp xã');
    expect(submitDossierApi).not.toHaveBeenCalled();
  });

  it('3. Phân tách QR Bản nháp SW_DRAFT với QR Biên nhận chính thức SW_RECEIPT', () => {
    const draftPayload = buildSmartWardPassPayload('HS-20261128-0001', null, 'AG_P_LONGXUYEN');
    expect(draftPayload).toBe('SW_DRAFT|HS-20261128-0001|AG_P_LONGXUYEN');

    const receiptPayload = buildOfficialReceiptQrPayload(
      'BN-2026-0099',
      'TTPVHCC Phường Long Xuyên',
      '2026-12-03'
    );
    expect(receiptPayload).toBe('SW_RECEIPT|BN-2026-0099|TTPVHCC Phường Long Xuyên|2026-12-03');

    const passBase: WalletQrPassRow = {
      dossier_code: 'HS-20261128-0001',
      appointment_code: 'BN-2026-0099',
      procedure_code: 'TTHC-HT-01',
      procedure_name: 'Đăng ký khai sinh',
      ward_code: 'AG_P_LONGXUYEN',
      ward_name: 'Phường Long Xuyên',
      citizen_name: 'NGUYỄN MINH AN',
      citizen_cccd_mask: '********1234',
      citizen_last4: '1234',
      citizen_email: 'an@example.invalid',
      status: 'OFFICIALLY_ACCEPTED',
      officer_feedback: 'Đã đối chiếu bản chính.',
      sla_deadline: '2026-12-03',
      qr_payload: receiptPayload,
      synced_at: Date.now(),
    };
    const receiptHtml = buildElectronicQrPassHtml(passBase);
    expect(receiptHtml).toContain('PHIẾU BIÊN NHẬN CHÍNH THỨC');

    const draftHtml = buildElectronicQrPassHtml({
      ...passBase,
      status: 'PENDING',
      qr_payload: draftPayload,
    });
    expect(draftHtml).toContain('MÃ BẢN NHÁP SMARTWARD (KIỂM TRA TRƯỚC)');
  });

  it('4. Phân tách rõ nhãn trạng thái kiểm tra trước, tiếp nhận, bổ sung, chuyển cơ sở và trả kết quả', () => {
    expect(getDossierStatusVietnamese('PENDING')).toBe('Đã gửi yêu cầu kiểm tra trước');
    expect(getDossierStatusVietnamese('OFFICIALLY_ACCEPTED')).toBe('Hồ sơ đã được tiếp nhận');
    expect(getDossierStatusVietnamese('SUPPLEMENT_REQUIRED')).toBe('Cần bổ sung');
    expect(getDossierStatusVietnamese('TRANSFERRED_AWAITING_DECISION')).toBe(
      'Đã chuyển cơ sở – chờ quyết định tiếp nhận'
    );
    expect(getDossierStatusVietnamese('READY_FOR_RETURN')).toBe('Có kết quả – chờ trả');
    expect(getDossierStatusVietnamese('COMPLETED')).toBe('Đã trả kết quả');
  });
});
