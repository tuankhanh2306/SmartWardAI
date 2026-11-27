/**
 * SmartWard AI Mobile — Orchestrator Luồng Nộp Hồ Sơ Sơ Duyệt Khép Kín (MOB-3.13)
 * Pipeline chuẩn:
 *   1. Kiểm định tất định cục bộ (formValidators.ts) + gọi POST /api/v1/forms/precheck
 *   2. Nếu có tệp ảnh chụp -> tải lên POST /api/v1/vault/upload (OTT_...) & XÓA ngay file tạm trong cache (NĐ 13/2023/NĐ-CP)
 *   3. Gọi POST /api/v1/dossiers lưu vào PostgreSQL (citizen_dossiers), nhận dossierCode (HS-...) & slaDeadline
 *   4. Lưu bản ghi vào bảng wallet_qr_passes trong expo-sqlite để xuất trình Offline
 */

import {
  precheckStructuredForm,
  submitCitizenDossier,
  uploadVaultDocument,
} from '../api/client';
import { maskCccdNumber } from './cccdQrParser';
import {
  normalizeDateToIso,
  validateAdministrativeForm,
  type LocalFormValidationInput,
} from './formValidators';
import type { VisionGateResult } from './visionQualityGate';
import {
  clearPersistedDossierAttachments,
  computeSubmissionPayloadSignature,
  resolveOrCreateSubmissionIdempotencyKey,
  savePersistedDossierAttachments,
} from '../storage/dossierAttachmentStore';
import {
  buildSmartWardPassPayload,
  upsertWalletQrPass,
  type WalletQrPassRow,
} from '../storage/sqliteDb';
import type { CapturedDocumentPage } from './birthDocumentWorkflow';
import type {
  CoreFormType,
  FieldValidation,
  VaultDocumentType,
} from '../types/api.types';

export const FORM_TYPE_TO_PROCEDURE: Record<
  CoreFormType,
  { procedureCode: string; procedureName: string; vaultDocType: VaultDocumentType }
> = {
  CT01: {
    procedureCode: 'TTHC-CR-01',
    procedureName: 'Đăng ký thường trú (Mẫu CT01)',
    vaultDocType: 'CT01_FORM',
  },
  'TK-KS': {
    procedureCode: 'TTHC-HT-01',
    procedureName: 'Đăng ký khai sinh (Mẫu TK-KS)',
    vaultDocType: 'BIRTH_CERT',
  },
  'TK-KH': {
    procedureCode: 'TTHC-HT-02',
    procedureName: 'Đăng ký kết hôn / Xác nhận độc thân (Mẫu TK-KH)',
    vaultDocType: 'MARRIAGE_FORM',
  },
  'TK-BTXH': {
    procedureCode: 'TTHC-BT-01',
    procedureName: 'Trợ cấp bảo trợ xã hội hằng tháng (Mẫu TK-BTXH)',
    vaultDocType: 'SOCIAL_ASSISTANCE_FORM',
  },
};

export interface SelectedAttachment {
  uri: string;
  fileName: string;
  mimeType: string;
  isTempCacheFile?: boolean;
}

export interface AttachedDocumentMetadata {
  documentCode: string;
  oneTimeToken: string;
  docRole: string;
  docLabel: string;
  pageIndex: number;
  verified: boolean;
}

export interface DossierPipelineInput {
  wardCode: string;
  wardName: string;
  validationInput: LocalFormValidationInput;
  visionGate: VisionGateResult | null;
  attachment: SelectedAttachment | null;
  /** TASK-058: Multi-attachment durable pages (takes precedence over legacy single attachment when non-empty) */
  attachments?: CapturedDocumentPage[];
  /** Optional explicit Idempotency-Key override (otherwise auto-reused from durable store for identical content) */
  idempotencyKey?: string;
}

export interface DossierPipelineResult {
  success: boolean;
  stage:
    | 'VISION_BLOCKED'
    | 'VALIDATION_FAILED'
    | 'UPLOAD_FAILED'
    | 'RECEIPT_MISMATCH'
    | 'SUBMITTED_ONLINE'
    | 'SAVED_LOCAL_DRAFT';
  fieldValidations: FieldValidation[];
  warnings: string[];
  dossierCode?: string;
  slaDeadline?: string | null;
  vaultToken?: string;
  confirmedVaultDocIds?: string[];
  attachedDocuments?: AttachedDocumentMetadata[];
  updatedAttachments?: CapturedDocumentPage[];
  idempotencyKey?: string;
  walletRow?: WalletQrPassRow;
  tempFileCleaned?: boolean;
  message: string;
}

export interface DossierPipelineDeps {
  precheckApi?: typeof precheckStructuredForm;
  vaultUploadApi?: typeof uploadVaultDocument;
  submitDossierApi?: typeof submitCitizenDossier;
  saveWalletPass?: typeof upsertWalletQrPass;
  deleteTempFile?: (uri: string) => Promise<boolean>;
  persistAttachments?: typeof savePersistedDossierAttachments;
  clearPersistedAttachments?: typeof clearPersistedDossierAttachments;
  resolveIdempotencyKey?: typeof resolveOrCreateSubmissionIdempotencyKey;
}

async function defaultDeleteTempFile(uri: string): Promise<boolean> {
  if (!uri || uri.startsWith('blob:') || uri.startsWith('http')) {
    return false;
  }
  try {
    const FileSystem = await import('expo-file-system/legacy');
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      return true;
    }
  } catch {
    // Ignore in web/test environments
  }
  return false;
}

function buildFlatFormData(input: LocalFormValidationInput): Record<string, string> {
  const flat: Record<string, string> = {
    formType: input.formType,
    fullName: input.fullName,
    hoTen: input.fullName,
    cccdNumber: input.citizenCccd,
    dateOfBirth: normalizeDateToIso(input.dateOfBirth),
    gender: input.gender || 'Nam',
    address: input.address || '',
    citizenEmail: input.citizenEmail || '',
    phoneNumber: input.phoneNumber || '',
    qrVerified: String(Boolean(input.qrVerified)),
  };

  if (input.qrVerified) {
    flat.verificationBadge = 'VERIFIED_VIA_VNEID_QR';
  }

  const extra = input.extra || {};
  const DATE_EXTRA_KEYS = new Set(['hostDateOfBirth', 'hospitalBirthDate', 'partnerDob']);
  const keysByForm = {
    CT01: ['hostFullName','hostCccdNumber','hostDateOfBirth','vneidHostConfirmed','requiresHostConsent'],
    'TK-KS': ['motherName','fatherName','hospitalBirthDate','hospitalMotherName','parentsMarried'],
    'TK-KH': ['marriageMode','partnerFullName','partnerCccd','partnerDob','partnerGender','maritalCertPurpose','previousMaritalStatus'],
    'TK-BTXH': ['householdStatus','disabilityLevel','bankAccount','bankName'],
  };
  for (const [k, v] of Object.entries(extra)) {
    if (!keysByForm[input.formType].includes(k)) continue;
    if (extra.marriageMode === 'MARITAL_STATUS_CONFIRMATION' && k.startsWith('partner')) continue;
    if (extra.marriageMode === 'MARRIAGE_REGISTRATION' && k === 'maritalCertPurpose') continue;
    if (v !== undefined && v !== null) {
      flat[k] = DATE_EXTRA_KEYS.has(k) ? normalizeDateToIso(String(v)) : String(v);
    }
  }
  if (input.formType === 'TK-KS') {
    flat.childName = input.fullName;
    flat.childBirthDate = flat.dateOfBirth;
    flat.childGender = flat.gender;
    flat.declarerCccd = input.citizenCccd;
  }
  if (input.formType === 'CT01') {
    flat.hostName = extra.hostFullName || '';
    flat.hostCccd = extra.hostCccdNumber || '';
  }
  if (input.formType === 'TK-KH' && extra.marriageMode !== 'MARITAL_STATUS_CONFIRMATION') flat.partnerName = extra.partnerFullName || '';
  return {...flat, ...input.paper};
}

/**
 * Executes the complete closed-loop precheck & dossier submission pipeline.
 */
export async function executeDossierSubmissionPipeline(
  input: DossierPipelineInput,
  deps: DossierPipelineDeps = {}
): Promise<DossierPipelineResult> {
  const precheckApi = deps.precheckApi ?? precheckStructuredForm;
  const vaultUploadApi = deps.vaultUploadApi ?? uploadVaultDocument;
  const submitDossierApi = deps.submitDossierApi ?? submitCitizenDossier;
  const saveWalletPass = deps.saveWalletPass ?? upsertWalletQrPass;
  const deleteTempFile = deps.deleteTempFile ?? defaultDeleteTempFile;
  const persistAttachments = deps.persistAttachments ?? savePersistedDossierAttachments;
  const clearPersistedAttachments =
    deps.clearPersistedAttachments ?? clearPersistedDossierAttachments;
  const resolveIdempotencyKey =
    deps.resolveIdempotencyKey ?? resolveOrCreateSubmissionIdempotencyKey;

  // 0. Hard lock if AI Vision Gate failed
  if (input.visionGate && !input.visionGate.canSubmit) {
    return {
      success: false,
      stage: 'VISION_BLOCKED',
      fieldValidations: [],
      warnings: [],
      message: input.visionGate.blockedReason || input.visionGate.submitButtonLabel,
    };
  }

  // 1. Deterministic Local Rule Validation
  const localCheck = validateAdministrativeForm(input.validationInput);
  if (!localCheck.valid) {
    return {
      success: false,
      stage: 'VALIDATION_FAILED',
      fieldValidations: localCheck.fieldValidations,
      warnings: localCheck.warnings,
      message: 'Tờ khai còn thông tin chưa hợp lệ. Vui lòng kiểm tra các mục báo đỏ bên dưới.',
    };
  }

  const baseProcedure = FORM_TYPE_TO_PROCEDURE[input.validationInput.formType];
  const statusConfirmation = input.validationInput.formType === 'TK-KH'
    && input.validationInput.extra?.marriageMode === 'MARITAL_STATUS_CONFIRMATION';
  const procMeta = statusConfirmation
    ? {...baseProcedure, procedureCode:'TTHC-HT-11', procedureName:'Xác nhận tình trạng hôn nhân'}
    : baseProcedure;
  const flatFormData = buildFlatFormData(input.validationInput);
  let mergedValidations = [...localCheck.fieldValidations];
  let mergedWarnings = [...localCheck.warnings];

  // 1b. Online Backend Precheck (best-effort; reject if server flags hard legal error)
  let onlineReachable = true;
  try {
    const serverCheck = await precheckApi({
      procedureCode: procMeta.procedureCode,
      formType: input.validationInput.formType,
      citizenCccd: input.validationInput.citizenCccd.trim(),
      fullName: input.validationInput.fullName.trim(),
      dateOfBirth: normalizeDateToIso(input.validationInput.dateOfBirth),
      gender: input.validationInput.gender,
      address: input.validationInput.address || '',
      qrVerified: Boolean(input.validationInput.qrVerified),
      formData: flatFormData,
    });

    if (serverCheck.warnings?.length) {
      mergedWarnings = Array.from(new Set([...mergedWarnings, ...serverCheck.warnings]));
    }

    const serverErrors = (serverCheck.fieldValidations || []).filter((f) => !f.valid);
    if (!serverCheck.overallValid && serverErrors.length > 0) {
      return {
        success: false,
        stage: 'VALIDATION_FAILED',
        fieldValidations: [...mergedValidations, ...serverErrors],
        warnings: mergedWarnings,
        message: 'Máy chủ phát hiện sai sót pháp lý cần chỉnh sửa trước khi nộp.',
      };
    }
  } catch {
    onlineReachable = false;
  }

  // 2. TASK-058: Zero-Trust Multi-Attachment Vault Upload (never delete temp files before server receipt confirmation!)
  const hasMultiAttachments = Array.isArray(input.attachments) && input.attachments.length > 0;
  const workingPages: CapturedDocumentPage[] = hasMultiAttachments
    ? input.attachments!.map((p) => ({ ...p }))
    : [];
  const vaultDocIds: string[] = [];
  const attachedDocuments: AttachedDocumentMetadata[] = [];
  const tempUrisToCleanAfterReceipt: string[] = [];
  let tempFileCleaned = false;

  if (hasMultiAttachments) {
    for (let i = 0; i < workingPages.length; i += 1) {
      const page = workingPages[i];
      if (page.uploadStatus === 'UPLOADED' && page.oneTimeToken) {
        const durableCode = page.documentCode || `DOC_LINK_${page.id}`;
        vaultDocIds.push(page.oneTimeToken);
        attachedDocuments.push({
          documentCode: durableCode,
          oneTimeToken: page.oneTimeToken,
          docRole: page.slotRole,
          docLabel: page.docLabel,
          pageIndex: page.pageIndex,
          verified: !page.attachedAsReference && Boolean(page.gate?.isVerifiedForSubmission),
        });
        tempUrisToCleanAfterReceipt.push(page.uri);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', {
          uri: page.uri,
          name: page.fileName,
          type: page.mimeType || 'image/jpeg',
        } as unknown as Blob);
        formData.append(
          'documentType',
          page.slotRole === 'BIRTH_CERT' ? 'BIRTH_CERT' : procMeta.vaultDocType
        );

        const vaultRes = await vaultUploadApi(formData);
        const token = (vaultRes.oneTimeToken || '').trim();
        if (!token) {
          throw new Error('Máy chủ lưu trữ không trả về mã xác nhận ảnh.');
        }
        const durableCode = (
          vaultRes.documentCode ||
          vaultRes.documentId ||
          vaultRes.docId ||
          `DOC_${Date.now()}_${i + 1}`
        ).trim();

        workingPages[i] = {
          ...page,
          uploadStatus: 'UPLOADED',
          documentCode: durableCode,
          oneTimeToken: token,
          lastError: null,
        };
        await persistAttachments(input.validationInput.formType, workingPages);

        vaultDocIds.push(token);
        attachedDocuments.push({
          documentCode: durableCode,
          oneTimeToken: token,
          docRole: page.slotRole,
          docLabel: page.docLabel,
          pageIndex: page.pageIndex,
          verified: !page.attachedAsReference && Boolean(page.gate?.isVerifiedForSubmission),
        });
        tempUrisToCleanAfterReceipt.push(page.uri);
      } catch (uploadErr) {
        const errText =
          uploadErr instanceof Error && uploadErr.message
            ? uploadErr.message
            : 'Mất kết nối khi tải ảnh lên máy chủ.';
        workingPages[i] = {
          ...page,
          uploadStatus: 'FAILED',
          lastError: errText,
        };
        await persistAttachments(input.validationInput.formType, workingPages);

        // TASK-058 invariant: NEVER delete any local photo and STOP submission immediately on upload error!
        return {
          success: false,
          stage: 'UPLOAD_FAILED',
          fieldValidations: mergedValidations,
          warnings: mergedWarnings,
          updatedAttachments: workingPages,
          tempFileCleaned: false,
          message: `Ảnh "${page.docLabel} (Trang ${page.pageIndex})" chưa gửi được (${errText}). Ảnh vẫn được giữ an toàn — bấm Thử lại để gửi tiếp.`,
        };
      }
    }
  } else if (input.attachment) {
    if (onlineReachable) {
      try {
        const formData = new FormData();
        formData.append('file', {
          uri: input.attachment.uri,
          name: input.attachment.fileName,
          type: input.attachment.mimeType,
        } as unknown as Blob);
        formData.append('documentType', procMeta.vaultDocType);

        const vaultRes = await vaultUploadApi(formData);
        if (vaultRes.oneTimeToken) {
          vaultDocIds.push(vaultRes.oneTimeToken);
          attachedDocuments.push({
            documentCode: (
              vaultRes.documentCode ||
              vaultRes.documentId ||
              vaultRes.docId ||
              'DOC_LEGACY'
            ).trim(),
            oneTimeToken: vaultRes.oneTimeToken,
            docRole: input.validationInput.formType,
            docLabel: procMeta.procedureName,
            pageIndex: 1,
            verified: Boolean(input.visionGate?.isVerifiedForSubmission),
          });
          if (input.attachment.isTempCacheFile) {
            tempUrisToCleanAfterReceipt.push(input.attachment.uri);
          }
        }
      } catch {
        return {
          success: false,
          stage: 'UPLOAD_FAILED',
          fieldValidations: mergedValidations,
          warnings: mergedWarnings,
          tempFileCleaned: false,
          message:
            'Ảnh giấy tờ chưa gửi được lên máy chủ. Ảnh vẫn được giữ lại — vui lòng bấm Thử lại.',
        };
      }
    }
  }

  // 3. Submit Dossier to PostgreSQL (POST /api/v1/dossiers) with durable Idempotency-Key reuse
  const cleanCccd = input.validationInput.citizenCccd.trim();
  const payloadFormData: Record<string, unknown> = {
    ...flatFormData,
    ...(flatFormData.householdMembers
      ? { householdMembers: JSON.parse(flatFormData.householdMembers) }
      : {}),
    vneidHostConfirmed: Boolean(input.validationInput.extra?.vneidHostConfirmed),
    ...(attachedDocuments.length > 0 ? { attachedDocuments } : {}),
  };

  const payloadSignature = computeSubmissionPayloadSignature({
    procedureCode: procMeta.procedureCode,
    wardCode: input.wardCode,
    citizenCccd: cleanCccd,
    formData: payloadFormData,
  });
  const idempotencyKey =
    input.idempotencyKey ||
    (await resolveIdempotencyKey(
      input.validationInput.formType,
      payloadSignature,
      cleanCccd.slice(-4)
    ));

  try {
    const submitted = await submitDossierApi({
      procedureCode: procMeta.procedureCode,
      wardCode: input.wardCode,
      citizenCccd: cleanCccd,
      formData: payloadFormData,
      precheckReport: {
        sharpnessScore: input.visionGate?.sharpnessScore ?? null,
        brightnessScore: input.visionGate?.brightnessScore ?? null,
        qualityStatus: input.visionGate?.qualityStatus ?? 'NOT_EVALUATED',
        ocrStatus: input.visionGate?.ocrStatus ?? 'NOT_RUN',
        templateMatchStatus: input.visionGate?.templateMatchStatus ?? 'NOT_CHECKED',
        templateMatched: input.visionGate?.templateMatched ?? false,
        extractedFieldsCount: input.visionGate?.extractedFieldsCount ?? null,
        valid: true,
      },
      vaultDocIds,
      idempotencyKey,
    });

    // TASK-058: Reconcile EVERY submitted token with server receipt BEFORE deleting any temp photo
    if (vaultDocIds.length > 0 && Array.isArray(submitted.vaultDocIds)) {
      const confirmedSet = new Set(submitted.vaultDocIds);
      const missingTokens = vaultDocIds.filter((t) => !confirmedSet.has(t));
      if (missingTokens.length > 0) {
        return {
          success: false,
          stage: 'RECEIPT_MISMATCH',
          fieldValidations: mergedValidations,
          warnings: mergedWarnings,
          dossierCode: submitted.dossierCode,
          confirmedVaultDocIds: submitted.vaultDocIds,
          updatedAttachments: hasMultiAttachments ? workingPages : undefined,
          idempotencyKey,
          tempFileCleaned: false,
          message: `Biên nhận máy chủ chưa xác nhận đủ ${vaultDocIds.length} ảnh đính kèm (thiếu ${missingTokens.length}). Ảnh tạm vẫn được giữ lại để đối chiếu.`,
        };
      }
    }

    // Only AFTER server confirmed dossierCode & every attached token -> clean temp copies & clear store
    if (tempUrisToCleanAfterReceipt.length > 0) {
      let cleanedAny = false;
      for (const uri of tempUrisToCleanAfterReceipt) {
        const deleted = await deleteTempFile(uri);
        if (deleted) cleanedAny = true;
      }
      tempFileCleaned = cleanedAny;
    }
    if (hasMultiAttachments) {
      await clearPersistedAttachments(input.validationInput.formType);
    }

    // 4. Persist to Offline SQLite wallet_qr_passes
    const walletRow: WalletQrPassRow = {
      dossier_code: submitted.dossierCode,
      appointment_code: null,
      procedure_code: procMeta.procedureCode,
      procedure_name: procMeta.procedureName,
      ward_code: input.wardCode,
      ward_name: input.wardName,
      citizen_name: input.validationInput.fullName.trim(),
      citizen_cccd_mask: maskCccdNumber(cleanCccd),
      citizen_last4: cleanCccd.slice(-4),
      citizen_email: input.validationInput.citizenEmail?.trim() || null,
      status: submitted.status || 'PENDING',
      officer_feedback: null,
      sla_deadline: submitted.slaDeadline || null,
      qr_payload: buildSmartWardPassPayload(submitted.dossierCode, null, input.wardCode),
      synced_at: Date.now(),
    };

    await saveWalletPass(walletRow);

    const confirmedCount = vaultDocIds.length;
    return {
      success: true,
      stage: 'SUBMITTED_ONLINE',
      fieldValidations: mergedValidations,
      warnings: mergedWarnings,
      dossierCode: submitted.dossierCode,
      slaDeadline: submitted.slaDeadline,
      vaultToken: vaultDocIds[0],
      confirmedVaultDocIds: submitted.vaultDocIds ?? vaultDocIds,
      attachedDocuments,
      updatedAttachments: hasMultiAttachments ? [] : undefined,
      idempotencyKey,
      walletRow,
      tempFileCleaned,
      message:
        confirmedCount > 0
          ? `Đã gửi hồ sơ ${submitted.dossierCode} kèm ${confirmedCount} ảnh giấy tờ đã xác nhận tới Bộ phận Một cửa ${input.wardName}.`
          : `Đã gửi hồ sơ ${submitted.dossierCode} tới Bộ phận Một cửa ${input.wardName}.`,
    };
  } catch {
    if (hasMultiAttachments) {
      await persistAttachments(input.validationInput.formType, workingPages);
      return {
        success: false,
        stage: 'UPLOAD_FAILED',
        fieldValidations: mergedValidations,
        warnings: mergedWarnings,
        updatedAttachments: workingPages,
        idempotencyKey,
        tempFileCleaned: false,
        message:
          'Mất kết nối khi xác nhận biên nhận hồ sơ. Ảnh đã tải và khóa chống trùng vẫn được giữ nguyên — bấm Thử gửi lại để hoàn tất.',
      };
    }

    // Offline fallback: save verified local draft to wallet_qr_passes without falsely claiming online receipt
    const draftCode = `HS-LOCAL-${Date.now().toString().slice(-6)}`;
    const walletRow: WalletQrPassRow = {
      dossier_code: draftCode,
      appointment_code: null,
      procedure_code: procMeta.procedureCode,
      procedure_name: procMeta.procedureName,
      ward_code: input.wardCode,
      ward_name: input.wardName,
      citizen_name: input.validationInput.fullName.trim(),
      citizen_cccd_mask: maskCccdNumber(cleanCccd),
      citizen_last4: cleanCccd.slice(-4),
      citizen_email: input.validationInput.citizenEmail?.trim() || null,
      status: 'PENDING',
      officer_feedback: 'Bản nháp đã qua kiểm định cục bộ — Chờ đồng bộ khi kết nối máy chủ.',
      sla_deadline: null,
      qr_payload: buildSmartWardPassPayload(draftCode, null, input.wardCode),
      synced_at: Date.now(),
    };

    await saveWalletPass(walletRow);

    return {
      success: true,
      stage: 'SAVED_LOCAL_DRAFT',
      fieldValidations: mergedValidations,
      warnings: [
        'Không kết nối được máy chủ: Hồ sơ đã được kiểm định hợp lệ cục bộ và lưu tạm vào thiết bị.',
        ...mergedWarnings,
      ],
      dossierCode: draftCode,
      idempotencyKey,
      walletRow,
      tempFileCleaned: false,
      message: `Đã kiểm định đạt chuẩn và lưu bản nháp ${draftCode} trên máy.`,
    };
  }
}
