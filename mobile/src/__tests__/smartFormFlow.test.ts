import {paperValues, paperDetails, type PaperForm} from '../core/paperForm';
import type {LocalFormValidationInput} from '../core/formValidators';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  executeDossierSubmissionPipeline,
  FORM_TYPE_TO_PROCEDURE,
} from '../core/dossierSubmitter';
import {
  formatMobileSlaDeadline,
  UNVERIFIED_SLA_TEXT,
} from '../core/qrPassPdfExporter';
import { evaluateDocumentVisionGate } from '../core/visionQualityGate';
import type { CoreFormType } from '../types/api.types';

const makeTestVisionGate = (
  mode: 'GOOD' | 'BLURRY' | 'WRONG_TEMPLATE',
  expectedFormType: CoreFormType
) => {
  if (mode === 'BLURRY') {
    return evaluateDocumentVisionGate({
      expectedFormType,
      fileName: `${expectedFormType.toLowerCase()}_blur.jpg`,
      mimeType: 'image/jpeg',
      rawText: expectedFormType,
      sharpnessScore: 24,
      brightnessScore: 150,
      extractedFieldsCount: 1,
    });
  }
  if (mode === 'WRONG_TEMPLATE') {
    const other: CoreFormType = expectedFormType === 'CT01' ? 'TK-KS' : 'CT01';
    return evaluateDocumentVisionGate({
      expectedFormType,
      fileName: `${other.toLowerCase()}_wrong.jpg`,
      mimeType: 'image/jpeg',
      rawText: other === 'TK-KS' ? 'Tờ khai đăng ký khai sinh TK-KS' : 'Tờ khai cư trú CT01',
      sharpnessScore: 94,
      brightnessScore: 196,
    });
  }
  return evaluateDocumentVisionGate({
    expectedFormType,
    fileName: `${expectedFormType.toLowerCase()}_verified.jpg`,
    mimeType: 'image/jpeg',
    rawText: expectedFormType,
    sharpnessScore: 96,
    brightnessScore: 198,
  });
};
import { getAllWalletQrPasses } from '../storage/sqliteDb';

const REF_DATE = new Date('2026-11-18T00:00:00Z');

describe('smartFormFlow — Chặng M3 (4 Biểu mẫu, AI Vision Gate & Pipeline Vault -> Precheck -> Dossiers -> SQLite)', () => {
  it('khóa cứng pipeline khi AI Vision Gate phát hiện ảnh mờ (BLURRY) hoặc sai mẫu (WRONG_TEMPLATE)', async () => {
    const precheckApi = vi.fn();
    const vaultUploadApi = vi.fn();
    const submitDossierApi = vi.fn();

    const blurryRes = await executeDossierSubmissionPipeline(
      {
        wardCode: 'AG_P_LONGXUYEN',
        wardName: 'Phường Long Xuyên',
        visionGate: makeTestVisionGate('BLURRY', 'CT01'),
        attachment: {
          uri: 'file:///cache/blur.jpg',
          fileName: 'blur.jpg',
          mimeType: 'image/jpeg',
          isTempCacheFile: true,
        },
        validationInput: {
          formType: 'CT01',
          fullName: 'NGUYỄN MINH TUẤN KHANH',
          citizenCccd: '089205023490',
          dateOfBirth: '2005-06-23',
          address: 'Số 18 Trần Hưng Đạo, Phường Long Xuyên',
          citizenEmail: 'congdan@gmail.com',
          referenceDate: REF_DATE,
          extra: {
            hostCccdNumber: '089075001122',
            hostDateOfBirth: '1975-03-10',
            vneidHostConfirmed: true,
          },
        },
      },
      { precheckApi, vaultUploadApi, submitDossierApi }
    );

    expect(blurryRes.success).toBe(false);
    expect(blurryRes.stage).toBe('VISION_BLOCKED');
    expect(precheckApi).not.toHaveBeenCalled();
    expect(vaultUploadApi).not.toHaveBeenCalled();
    expect(submitDossierApi).not.toHaveBeenCalled();

    const wrongRes = await executeDossierSubmissionPipeline(
      {
        wardCode: 'AG_P_LONGXUYEN',
        wardName: 'Phường Long Xuyên',
        visionGate: makeTestVisionGate('WRONG_TEMPLATE', 'CT01'),
        attachment: null,
        validationInput: {
          formType: 'CT01',
          fullName: 'NGUYỄN MINH TUẤN KHANH',
          citizenCccd: '089205023490',
          dateOfBirth: '2005-06-23',
          address: 'Số 18 Trần Hưng Đạo, Phường Long Xuyên',
          citizenEmail: 'congdan@gmail.com',
          referenceDate: REF_DATE,
        },
      },
      { precheckApi, vaultUploadApi, submitDossierApi }
    );

    expect(wrongRes.success).toBe(false);
    expect(wrongRes.stage).toBe('VISION_BLOCKED');
  });

  it('chặn nộp khi kiểm định pháp lý cục bộ thất bại (thiếu CCCD chủ hộ / sai email)', async () => {
    const submitDossierApi = vi.fn();

    const res = await executeDossierSubmissionPipeline(
      {
        wardCode: 'AG_P_LONGXUYEN',
        wardName: 'Phường Long Xuyên',
        visionGate: makeTestVisionGate('GOOD', 'CT01'),
        attachment: null,
        validationInput: {
          formType: 'CT01',
          fullName: 'NGUYỄN MINH TUẤN KHANH',
          citizenCccd: '089205023490',
          dateOfBirth: '2005-06-23',
          address: 'Số 18 Trần Hưng Đạo, Phường Long Xuyên',
          citizenEmail: 'email-khong-hop-le',
          referenceDate: REF_DATE,
          extra: {
            hostCccdNumber: '123',
            vneidHostConfirmed: false,
          },
        },
      },
      { submitDossierApi }
    );

    expect(res.success).toBe(false);
    expect(res.stage).toBe('VALIDATION_FAILED');
    expect(res.fieldValidations.some((f) => f.errorCode === 'INVALID_HOST_CCCD')).toBe(true);
    expect(res.fieldValidations.some((f) => f.errorCode === 'INVALID_CITIZEN_EMAIL')).toBe(true);
    expect(submitDossierApi).not.toHaveBeenCalled();
  });

  it('thực thi trọn vẹn luồng khép kín Precheck -> Vault Upload + Xóa file cache (NĐ 13) -> POST /dossiers -> SQLite wallet_qr_passes', async () => {
    const precheckApi = vi.fn().mockResolvedValue({
      submissionId: 'SUB-001',
      procedureCode: 'TTHC-CR-01',
      overallValid: true,
      fieldValidations: [],
      warnings: [],
      processedAt: '2026-11-18T11:00:00Z',
      processingTimeMs: 12,
    });
    const vaultUploadApi = vi.fn().mockResolvedValue({
      docId: 'DOC-001',
      oneTimeToken: 'OTT_99887766',
      viewUrl: '/api/v1/vault/view/OTT_99887766',
      watermarkApplied: true,
    });
    const submitDossierApi = vi.fn().mockResolvedValue({
      dossierCode: 'HS-20261118-0001',
      procedureCode: 'TTHC-CR-01',
      wardCode: 'AG_P_LONGXUYEN',
      status: 'PENDING',
      slaDeadline: '2026-11-25T17:00:00Z',
      createdAt: '2026-11-18T11:00:00Z',
    });
    const deleteTempFile = vi.fn().mockResolvedValue(true);

    const res = await executeDossierSubmissionPipeline(
      {
        wardCode: 'AG_P_LONGXUYEN',
        wardName: 'Phường Long Xuyên',
        visionGate: makeTestVisionGate('GOOD', 'CT01'),
        attachment: {
          uri: 'file:///cache/ct01_resized.jpg',
          fileName: 'ct01_resized.jpg',
          mimeType: 'image/jpeg',
          isTempCacheFile: true,
        },
        validationInput: {
          formType: 'CT01',
          fullName: 'NGUYỄN MINH TUẤN KHANH',
          citizenCccd: '089205023490',
          dateOfBirth: '2005-06-23',
          gender: 'Nam',
          address: 'Số 18 Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang',
          citizenEmail: 'congdan.angiang@gmail.com',
          phoneNumber: '0918234567',
          qrVerified: true,
          referenceDate: REF_DATE,
          extra: {
            hostCccdNumber: '089075001122',
            hostDateOfBirth: '1975-03-10',
            vneidHostConfirmed: true,
          },
        },
      },
      { precheckApi, vaultUploadApi, submitDossierApi, deleteTempFile }
    );

    expect(res.success).toBe(true);
    expect(res.stage).toBe('SUBMITTED_ONLINE');
    expect(res.dossierCode).toBe('HS-20261118-0001');
    expect(res.vaultToken).toBe('OTT_99887766');
    expect(res.tempFileCleaned).toBe(true);
    expect(deleteTempFile).toHaveBeenCalledWith('file:///cache/ct01_resized.jpg');

    // Verify Decree 13 CCCD masking and SQLite wallet persistence
    expect(res.walletRow?.citizen_cccd_mask).toBe('********3490');
    expect(res.walletRow?.qr_payload).toBe('SMARTWARD_PASS|HS-20261118-0001|PENDING|AG_P_LONGXUYEN');

    const stored = await getAllWalletQrPasses();
    expect(stored.some((p) => p.dossier_code === 'HS-20261118-0001')).toBe(true);

    // Verify submit payload included VERIFIED_VIA_VNEID_QR & OTT vault token
    const submitArg = submitDossierApi.mock.calls[0][0];
    expect(submitArg.vaultDocIds).toEqual(['OTT_99887766']);
    expect(submitArg.formData.verificationBadge).toBe('VERIFIED_VIA_VNEID_QR');
  });

  it('lưu bản nháp cục bộ (SAVED_LOCAL_DRAFT) khi mất kết nối máy chủ nhưng hồ sơ đã đạt chuẩn pháp lý', async () => {
    const failingApi = vi.fn().mockRejectedValue(new Error('Network Error'));

    const res = await executeDossierSubmissionPipeline(
      {
        wardCode: 'AG_DK_PHUQUOC',
        wardName: 'Đặc khu Phú Quốc',
        visionGate: makeTestVisionGate('GOOD', 'TK-BTXH'),
        attachment: null,
        validationInput: {
          formType: 'TK-BTXH',
          fullName: 'PHẠM VĂN BẢY',
          citizenCccd: '089045009988',
          dateOfBirth: '1945-05-01',
          citizenEmail: 'cu.bay@gmail.com',
          referenceDate: REF_DATE,
          extra: {
            householdStatus: 'NORMAL',
            disabilityLevel: 'NONE',
            bankAccount: '102003456789',
          },
        },
      },
      {
        precheckApi: failingApi,
        vaultUploadApi: failingApi,
        submitDossierApi: failingApi,
      }
    );

    expect(res.success).toBe(true);
    expect(res.stage).toBe('SAVED_LOCAL_DRAFT');
    expect(res.dossierCode).toMatch(/^HS-LOCAL-/);
    expect(res.walletRow?.citizen_cccd_mask).toBe('********9988');
  });

  it('ánh xạ chính xác 4 mã biểu mẫu sang mã thủ tục TTHC và Vault documentType', () => {
    expect(FORM_TYPE_TO_PROCEDURE.CT01.procedureCode).toBe('TTHC-CR-01');
    expect(FORM_TYPE_TO_PROCEDURE['TK-KS'].procedureCode).toBe('TTHC-HT-01');
    expect(FORM_TYPE_TO_PROCEDURE['TK-KH'].procedureCode).toBe('TTHC-HT-02');
    expect(FORM_TYPE_TO_PROCEDURE['TK-BTXH'].procedureCode).toBe('TTHC-BT-01');
  });

  it('tuân thủ kỷ luật 0 nút In và 0 phí SMS/Zalo trên SmartFormPrecheckScreen', () => {
    const code = readFileSync(
      resolve(__dirname, '../screens/SmartFormPrecheckScreen.tsx'),
      'utf8'
    );
    expect(code).not.toMatch(/window\.print\s*\(/);
    expect(code).not.toMatch(/Print\.printAsync\s*\(/);
    expect(code).toContain('Miễn phí 100%');
    expect(code).toContain('formatMobileSlaDeadline');
  });

  it('trả slaDeadline = null khi thủ tục chưa xác minh và hiển thị "Chưa xác định (chờ cán bộ Một cửa xác nhận)"', async () => {
    const precheckApi = vi.fn().mockResolvedValue({
      submissionCode: 'PC-NULL-SLA-01',
      formType: 'CT01',
      valid: true,
      overallConfidence: 0.99,
      fieldValidations: [],
      warnings: [],
      processedAt: '2026-11-20T09:00:00Z',
      processingTimeMs: 10,
    });
    const vaultUploadApi = vi.fn();
    const submitDossierApi = vi.fn().mockResolvedValue({
      dossierCode: 'HS-20261120-AG_P_LONGXUYEN-9999',
      procedureCode: 'TTHC-CR-01',
      wardCode: 'AG_P_LONGXUYEN',
      status: 'PENDING',
      slaDeadline: null,
      createdAt: '2026-11-20T09:00:00Z',
    });

    const res = await executeDossierSubmissionPipeline(
      {
        wardCode: 'AG_P_LONGXUYEN',
        wardName: 'Phường Long Xuyên',
        visionGate: makeTestVisionGate('GOOD', 'CT01'),
        attachment: null,
        validationInput: {
          formType: 'CT01',
          fullName: 'NGUYỄN VĂN AN',
          citizenCccd: '089095001234',
          dateOfBirth: '1995-01-10',
          gender: 'Nam',
          address: 'Phường Long Xuyên, An Giang',
          citizenEmail: 'an.nguyen@gmail.com',
          phoneNumber: '0918111222',
          qrVerified: true,
          referenceDate: REF_DATE,
          extra: {
            hostCccdNumber: '089075001122',
            hostDateOfBirth: '1975-03-10',
            vneidHostConfirmed: true,
          },
        },
      },
      { precheckApi, vaultUploadApi, submitDossierApi }
    );

    expect(res.success).toBe(true);
    expect(res.slaDeadline).toBeNull();
    expect(res.walletRow?.sla_deadline).toBeNull();
    expect(formatMobileSlaDeadline(res.slaDeadline)).toBe(UNVERIFIED_SLA_TEXT);
    expect(formatMobileSlaDeadline(res.slaDeadline)).toBe(
      'Chưa xác định (chờ cán bộ Một cửa xác nhận)'
    );
  });

  it('nhận ngày sinh dd-mm-yyyy trong app Mobile và chuẩn hóa về yyyy-MM-dd khi gọi precheckApi & submitDossierApi', async () => {
    const precheckApi = vi.fn().mockResolvedValue({
      submissionCode: 'PC-DMY-01',
      formType: 'CT01',
      valid: true,
      overallConfidence: 0.99,
      fieldValidations: [],
      warnings: [],
      processedAt: '2026-11-27T01:00:00Z',
      processingTimeMs: 9,
    });
    const submitDossierApi = vi.fn().mockResolvedValue({
      dossierCode: 'HS-20261127-AG_P_LONGXUYEN-0001',
      procedureCode: 'TTHC-CR-01',
      wardCode: 'AG_P_LONGXUYEN',
      status: 'PENDING',
      slaDeadline: '2026-12-02T17:00:00+07:00',
      createdAt: '2026-11-27T01:00:00Z',
    });

    const res = await executeDossierSubmissionPipeline(
      {
        wardCode: 'AG_P_LONGXUYEN',
        wardName: 'Phường Long Xuyên',
        visionGate: makeTestVisionGate('GOOD', 'CT01'),
        attachment: null,
        validationInput: {
          formType: 'CT01',
          fullName: 'NGUYỄN MINH TUẤN KHANH',
          citizenCccd: '089205023490',
          dateOfBirth: '23-06-2005',
          gender: 'Nam',
          address: 'Số 18 Trần Hưng Đạo, Phường Long Xuyên, An Giang',
          citizenEmail: 'khanh@example.invalid',
          phoneNumber: '0918234567',
          qrVerified: true,
          referenceDate: REF_DATE,
          extra: {
            hostCccdNumber: '089075001122',
            hostDateOfBirth: '10-03-1975',
            vneidHostConfirmed: true,
          },
        },
      },
      { precheckApi, submitDossierApi }
    );

    expect(res.success).toBe(true);
    expect(precheckApi.mock.calls[0][0].dateOfBirth).toBe('2005-06-23');
    expect(submitDossierApi.mock.calls[0][0].formData.dateOfBirth).toBe('2005-06-23');
    expect(submitDossierApi.mock.calls[0][0].formData.hostDateOfBirth).toBe('1975-03-10');
  });
  const members = [{fullName:'Người thứ nhất',hostRelation:'Con'}, {fullName:'Người thứ hai',hostRelation:'Em'}];
  const scenarios: {form:PaperForm; fields:Record<string,string>; extra:LocalFormValidationInput['extra']; expected:Record<string,unknown>}[] = [
    {form:'CT01', fields:{hostRelation:'Con',declarationScope:'Thay đổi cùng hộ'},
      extra:{hostFullName:'Chủ hộ',hostCccdNumber:'089075001122',hostDateOfBirth:'1975-03-10',vneidHostConfirmed:true},
      expected:{hostName:'Chủ hộ',householdMembers:members,hostRelation:'Con'}},
    {form:'TK-KS', fields:{declarerName:'Người đi khai',childBirthPlace:'Nơi sinh A',birthCertNumber:'GCS-1'},
      extra:{motherName:'Người mẹ',hospitalMotherName:'Người mẹ',hospitalBirthDate:'2026-10-25',parentsMarried:'YES'},
      expected:{childName:'Tên trẻ',declarerName:'Người đi khai',childBirthPlace:'Nơi sinh A',motherName:'Người mẹ'}},
    {form:'TK-KH', fields:{applicantNationality:'Quốc tịch A',partnerNationality:'Quốc tịch B',partnerMarriageCount:'2'},
      extra:{marriageMode:'MARRIAGE_REGISTRATION',partnerFullName:'Người thứ hai',partnerDob:'1995-05-01',partnerCccd:'089095001122'},
      expected:{applicantNationality:'Quốc tịch A',partnerNationality:'Quốc tịch B',partnerMarriageCount:'2',partnerName:'Người thứ hai'}},
    {form:'TK-BTXH', fields:{currentAddress:'Địa chỉ hiện tại',accountHolderName:'Người nhận thay'},
      extra:{bankAccount:'123456789',bankName:'Ngân hàng A'},
      expected:{address:'Nơi thường trú',currentAddress:'Địa chỉ hiện tại',accountHolderName:'Người nhận thay',bankAccount:'123456789'}},
  ];
  it.each(scenarios)('$form giữ đúng người và từng trường đến hồ sơ cán bộ',async ({form,fields,extra,expected})=>{
    const precheckApi = vi.fn().mockResolvedValue({overallValid:true});
    const submitDossierApi = vi.fn().mockResolvedValue({dossierCode:'HS-TEST', status:'PENDING'});
    const result = await executeDossierSubmissionPipeline({
      wardCode:'AG_P_LONGXUYEN',wardName:'Long Xuyên',attachment:null,visionGate:null,
      validationInput:{formType:form, fullName:form === 'TK-KS' ? 'Tên trẻ' : 'Người khai',citizenCccd:'089075000001',
        dateOfBirth:form === 'TK-KS' ? '2026-10-25' : '1948-03-02', referenceDate:REF_DATE,address:'Nơi thường trú',extra,
        paper:paperValues(form,{fields,members})}
    },{precheckApi,submitDossierApi,saveWalletPass:vi.fn()});
    expect(result.success).toBe(true);
    const sent = submitDossierApi.mock.calls[0][0].formData;
    expect(sent).toMatchObject(expected);
    for(const [key,value] of Object.entries(fields)){
      expect(precheckApi.mock.calls[0][0].formData[key]).toBe(value);
      expect(paperDetails(sent).some(([,v])=>v===value)).toBe(true);
    }
    if(form === 'CT01') expect(JSON.parse(precheckApi.mock.calls[0][0].formData.householdMembers)).toEqual(members);
    else expect(sent.householdMembers).toBeUndefined();
  });

});
