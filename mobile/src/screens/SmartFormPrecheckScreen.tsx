import { PaperFields } from '../components/PaperFields';
import { emptyPaper, paperValues, type PaperDraft, type PaperForm } from '../core/paperForm';
/**
 * SmartWard AI Mobile — Tab 3: Kiểm Tra Tờ Khai & Sơ Duyệt (Chặng M3: MOB-3.1 -> MOB-3.13)
 * - Segmented 4 biểu mẫu: CT01 | Khai sinh | Kết hôn | Bảo trợ
 * - Quét QR CCCD 60fps -> điền < 0.5s + huy hiệu miễn bản sao (VERIFIED_VIA_VNEID_QR) + đối soát chéo
 * - Chụp ảnh (resize <= 1920px chống OOM) / chọn .DOCX/.PDF + AI Vision Gate 3 tiêu chí + khóa nút gửi
 * - Email nhận Mã hẹn QR miễn phí 100% (0 SMS/Zalo)
 * - Pipeline khép kín: Precheck -> Vault Upload (xóa cache tạm) -> POST /dossiers -> SQLite wallet_qr_passes
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileCheck2,
  FileUp,
  Mail,
  QrCode,
  ShieldCheck,
} from 'lucide-react-native';
import { BirthDocumentCaptureCard } from '../components/BirthDocumentCaptureCard';
import { CccdQrScannerModal } from '../components/CccdQrScannerModal';
import { DocumentCameraModal, type CapturedMediaAsset } from '../components/DocumentCameraModal';
import {
  FormSpecificFields,
  INITIAL_FORM_EXTRA,
  type FormExtraState,
} from '../components/FormSpecificFields';
import { DossierAndQrPassScreen } from './DossierAndQrPassScreen';
import { isNetworkOrTimeoutError, precheckFormDocumentImage } from '../api/client';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import {
  computePrefillPlan,
  evaluateServerOcrIntoVisionGate,
  getSlotDocLabel,
  reassignCapturedPageSlot,
  type CapturedDocumentPage,
} from '../core/birthDocumentWorkflow';
import {
  detectDiscrepancies,
  type DecodedCccdQr,
} from '../core/cccdQrParser';
import {
  executeDossierSubmissionPipeline,
  type DossierPipelineResult,
  type SelectedAttachment,
} from '../core/dossierSubmitter';
import { formatDateToDmy, formatDmyDateInput } from '../core/formValidators';
import { formatMobileSlaDeadline } from '../core/qrPassPdfExporter';
import {
  evaluateDocumentVisionGate,
  resizeImageForUpload,
  type ExpectedDocumentType,
  type VisionGateResult,
} from '../core/visionQualityGate';
import {
  loadPersistedDossierAttachments,
  persistDossierPhotoToDurableDir,
  savePersistedDossierAttachments,
} from '../storage/dossierAttachmentStore';
import type { RootTabParamList } from '../navigation/BottomTabNavigator';
import { useResponsivePhone } from '../theme/responsive';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';
import type { CoreFormType } from '../types/api.types';

const FORM_TABS: Array<{ key: CoreFormType; label: string }> = [
  { key: 'CT01', label: 'CT01' },
  { key: 'TK-KS', label: 'Khai sinh' },
  { key: 'TK-KH', label: 'Kết hôn' },
  { key: 'TK-BTXH', label: 'Bảo trợ' },
];

export const SmartFormPrecheckScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootTabParamList, 'SmartFormTab'>>();
  const { currentWard } = useWard();
  const { typography, fontScaleMode } = useAccessibility();
  const responsive = useResponsivePhone(fontScaleMode);

  const [sectionMode, setSectionMode] = useState<'form' | 'wallet'>('form');
  const [formType, setFormType] = useState<CoreFormType>('CT01');
  const [scannerVisible, setScannerVisible] = useState(false);

  // Common citizen fields
  const adultFullName = useState('');
  const childFullName = useState('');
  const [fullName, setFullName] = formType === 'TK-KS' ? childFullName : adultFullName;
  const [citizenCccd, setCitizenCccd] = useState('');
  const adultDateOfBirth = useState('');
  const childDateOfBirth = useState('');
  const [dateOfBirth, setDateOfBirth] = formType === 'TK-KS' ? childDateOfBirth : adultDateOfBirth;
  const adultGender = useState<'Nam' | 'Nữ'>('Nam');
  const childGender = useState<'Nam' | 'Nữ'>('Nam');
  const [gender, setGender] = formType === 'TK-KS' ? childGender : adultGender;
  const [address, setAddress] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Form-specific fields (MOB-3.8 -> 3.11)
  const [extra, setExtra] = useState<FormExtraState>(INITIAL_FORM_EXTRA);
  const [paperByType, setPaperByType] = useState<Partial<Record<PaperForm, PaperDraft>>>({});
  const paper = paperByType[formType] ?? emptyPaper;
  const setPaper = (next: PaperDraft) => setPaperByType(prev => ({...prev, [formType]:next}));


  // QR CCCD & Discrepancy state (MOB-3.2 -> 3.4)
  const [decodedQr, setDecodedQr] = useState<DecodedCccdQr | null>(null);

  // AI Vision Gate & Multi-Slot Captured Pages (TASK-056, TASK-057, TASK-058)
  const [attachment, setAttachment] = useState<SelectedAttachment | null>(null);
  const [visionGate, setVisionGate] = useState<VisionGateResult | null>(null);
  const [capturedPages, setCapturedPages] = useState<CapturedDocumentPage[]>([]);
  const [cameraModalTarget, setCameraModalTarget] = useState<{
    slotRole: ExpectedDocumentType;
    replacePageId?: string;
  } | null>(null);

  // Submission state (MOB-3.13)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<DossierPipelineResult | null>(null);

  // Sync formType & optional Agent prefill draft when user jumps here from Tab 1 (40 TTHC / Civic AI Agent)
  useEffect(() => {
    const incoming = route.params?.initialFormType;
    const draft = route.params?.initialDraft;
    if (incoming) {
      setSectionMode('form');
      setFormType(incoming);
      setSubmitResult(null);
      if (attachment) {
        setVisionGate(
          evaluateDocumentVisionGate({
            expectedFormType: incoming,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
          })
        );
      }
    }
    if (draft) {
      setSectionMode('form');
      if ((incoming ?? formType) !== 'TK-KS' && (draft.fullName)) adultFullName[1](draft.fullName);
      if (draft.citizenCccd) setCitizenCccd(draft.citizenCccd);
      if ((incoming ?? formType) !== 'TK-KS' && (draft.dateOfBirth)) adultDateOfBirth[1](formatDateToDmy(draft.dateOfBirth));
      if ((incoming ?? formType) !== 'TK-KS' && (draft.gender === 'Nam' || draft.gender === 'Nữ')) adultGender[1](draft.gender);
      if (draft.address) setAddress(draft.address);
      if (draft.phoneNumber) setPhoneNumber(draft.phoneNumber);
    }
  }, [route.params?.initialFormType, route.params?.initialDraft]);

  const discrepancies = useMemo(() => {
    if (!decodedQr || formType === 'TK-KS') return [];
    return detectDiscrepancies(decodedQr, {
      fullName,
      cccd: citizenCccd,
      dob: dateOfBirth,
      gender,
      address,
    });
  }, [decodedQr, formType, fullName, citizenCccd, dateOfBirth, gender, address]);

  const handleSelectFormTab = (nextForm: CoreFormType) => {
    setFormType(nextForm);
    setSubmitResult(null);
    if (visionGate && attachment) {
      setVisionGate(
        evaluateDocumentVisionGate({
          expectedFormType: nextForm,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sharpnessScore: visionGate.sharpnessScore,
          brightnessScore: visionGate.brightnessScore,
        })
      );
    }
  };

  const handleExtraChange = <K extends keyof FormExtraState>(
    key: K,
    value: FormExtraState[K]
  ) => {
    setExtra((prev) => ({ ...prev, [key]: value }));
  };

  // MOB-3.3: Auto-fill < 0.5s on CCCD QR decode
  const handleQrDecoded = (qr: DecodedCccdQr) => {
    setDecodedQr(qr);
    if (formType === 'TK-KS') {
      setPaper({...paper, fields:{...paper.fields, declarerName:qr.fullName}});
    } else {
      setFullName(qr.fullName);
      setDateOfBirth(formatDateToDmy(qr.dateOfBirth));
      setGender(qr.gender);
    }
    setCitizenCccd(qr.cccdNumber);
    setAddress(qr.address);
    setSubmitResult(null);
  };

  // TASK-058: Hydrate durable pending attachments for the active formType across app restarts
  useEffect(() => {
    let active = true;
    void loadPersistedDossierAttachments(formType).then((saved) => {
      if (!active) return;
      setCapturedPages(saved?.pages ?? []);
      setVisionGate(saved?.pages?.[saved.pages.length - 1]?.gate ?? null);
    });
    return () => {
      active = false;
    };
  }, [formType]);

  // Persist durable attachment state whenever pages change
  const updateCapturedPagesDurable = (
    updater: (prev: CapturedDocumentPage[]) => CapturedDocumentPage[]
  ) => {
    setCapturedPages((prev) => {
      const next = updater(prev);
      void savePersistedDossierAttachments(formType, next);
      return next;
    });
  };

  // TASK-057: Unified OCR inspection for both camera & library photos (never fabricates scores or overwrites user fields)
  const inspectCapturedPageWithOcr = async (
    pageId: string,
    uri: string,
    mimeType: string,
    fileName: string,
    expectedSlot: ExpectedDocumentType
  ) => {
    updateCapturedPagesDurable((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, checking: true } : p))
    );
    try {
      const resp = await precheckFormDocumentImage(uri, mimeType, expectedSlot, fileName);
      const nextGate = evaluateServerOcrIntoVisionGate(resp, expectedSlot, fileName, mimeType);
      updateCapturedPagesDurable((prev) =>
        prev.map((p) =>
          p.id === pageId
            ? {
                ...p,
                gate: nextGate,
                ocrFields: resp.extractedFields || null,
                checking: false,
                attachedAsReference: false,
              }
            : p
        )
      );
      setVisionGate(nextGate);
    } catch (err) {
      const offline = isNetworkOrTimeoutError(err);
      const failGate = evaluateDocumentVisionGate({
        expectedFormType: expectedSlot,
        fileName,
        mimeType,
        ocrStatus: offline ? 'NETWORK_ERROR' : 'UNAVAILABLE',
      });
      updateCapturedPagesDurable((prev) =>
        prev.map((p) =>
          p.id === pageId ? { ...p, gate: failGate, checking: false } : p
        )
      );
      setVisionGate(failGate);
    }
  };

  const handleCameraPhotoSelected = async (asset: CapturedMediaAsset) => {
    const target = cameraModalTarget ?? { slotRole: formType as ExpectedDocumentType };
    const resized = await resizeImageForUpload(asset.uri, asset.width, asset.height);
    const durableUri = await persistDossierPhotoToDurableDir(resized.uri);
    const mimeType = asset.mimeType || 'image/jpeg';
    const fileName = asset.fileName || `doc_capture_${Date.now()}.jpg`;
    const initialGate = evaluateDocumentVisionGate({
      expectedFormType: target.slotRole,
      fileName,
      mimeType,
      ocrStatus: 'NOT_RUN',
    });

    const pageId = target.replacePageId || `pg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setAttachment({
      uri: durableUri,
      fileName,
      mimeType,
      isTempCacheFile: true,
    });
    setVisionGate(initialGate);

    updateCapturedPagesDurable((prev) => {
      if (target.replacePageId) {
        return prev.map((p) =>
          p.id === target.replacePageId
            ? {
                ...p,
                uri: durableUri,
                fileName,
                mimeType,
                gate: initialGate,
                ocrFields: null,
                attachedAsReference: false,
                checking: true,
                uploadStatus: 'PENDING',
                documentCode: undefined,
                oneTimeToken: undefined,
                lastError: null,
              }
            : p
        );
      }
      const nextPageIndex = prev.filter((p) => p.slotRole === target.slotRole).length + 1;
      return [
        ...prev,
        {
          id: pageId,
          slotRole: target.slotRole,
          docLabel: getSlotDocLabel(target.slotRole),
          pageIndex: nextPageIndex,
          uri: durableUri,
          fileName,
          mimeType,
          gate: initialGate,
          ocrFields: null,
          attachedAsReference: false,
          checking: true,
          uploadStatus: 'PENDING',
        },
      ];
    });

    await inspectCapturedPageWithOcr(pageId, durableUri, mimeType, fileName, target.slotRole);
  };

  const handleCapturePhoto = async () => {
    setCameraModalTarget({ slotRole: formType });
  };

  const handleApplyOcrPrefill = (pageId: string, allowOverwrite: boolean) => {
    const page = capturedPages.find((p) => p.id === pageId);
    if (!page || !page.ocrFields) return;
    const plan = computePrefillPlan(
      formType,
      page.slotRole,
      {
        fullName,
        citizenCccd,
        dateOfBirth,
        gender,
        address,
        phoneNumber,
        motherName: extra.motherName,
        fatherName: extra.fatherName,
        hospitalBirthDate: extra.hospitalBirthDate,
        hospitalMotherName: extra.hospitalMotherName,
        birthCertNumber: paper.fields.birthCertNumber || '',
        childBirthPlace: paper.fields.childBirthPlace || '',
      },
      page.ocrFields
    );

    const nextPaperFields = { ...paper.fields };
    let paperDirty = false;
    for (const item of plan.items) {
      if (item.willOverwrite && !allowOverwrite) continue;
      if (item.key === 'fullName') setFullName(item.extractedValue);
      else if (item.key === 'citizenCccd') setCitizenCccd(item.extractedValue.replace(/[^0-9]/g, '').slice(0, 12));
      else if (item.key === 'dateOfBirth') setDateOfBirth(item.extractedValue);
      else if (item.key === 'gender' && (item.extractedValue === 'Nam' || item.extractedValue === 'Nữ')) {
        setGender(item.extractedValue);
      } else if (item.key === 'address') setAddress(item.extractedValue);
      else if (item.key === 'phoneNumber') setPhoneNumber(item.extractedValue.replace(/[^0-9]/g, '').slice(0, 10));
      else if (item.key === 'motherName') handleExtraChange('motherName', item.extractedValue);
      else if (item.key === 'fatherName') handleExtraChange('fatherName', item.extractedValue);
      else if (item.key === 'hospitalBirthDate') handleExtraChange('hospitalBirthDate', item.extractedValue);
      else if (item.key === 'hospitalMotherName') handleExtraChange('hospitalMotherName', item.extractedValue);
      else if (item.key === 'birthCertNumber' || item.key === 'childBirthPlace') {
        nextPaperFields[item.key] = item.extractedValue;
        paperDirty = true;
      }
    }
    if (paperDirty) {
      setPaper({ ...paper, fields: nextPaperFields });
    }
  };

  // MOB-3.5 / TASK-056: Pick .DOCX / .PDF / image through unified pipeline
  const handlePickDocument = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/*',
        ],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const file = picked.assets[0];
      const mime = file.mimeType || 'application/octet-stream';
      const fileName = file.name || `document_${Date.now()}`;

      if (mime.startsWith('image/')) {
        setCameraModalTarget({ slotRole: formType });
        await handleCameraPhotoSelected({
          uri: file.uri,
          fileName,
          mimeType: mime,
          source: 'LIBRARY',
        });
        setCameraModalTarget(null);
        return;
      }

      setAttachment({
        uri: file.uri,
        fileName,
        mimeType: mime,
        isTempCacheFile: true,
      });
      setVisionGate(
        evaluateDocumentVisionGate({
          expectedFormType: formType,
          fileName,
          mimeType: mime,
          ocrStatus: 'NOT_RUN',
        })
      );
    } catch {
      // Ignore canceled picker
    }
  };

  // MOB-3.13 / TASK-058: Closed-loop Precheck -> Idempotent Multi-Attachment Vault -> Dossiers -> Receipt Verification -> SQLite
  const handleSubmitDossier = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitResult(null);

    const hasPages = capturedPages.length > 0;
    const blockingPage = capturedPages.find(
      (p) => !p.attachedAsReference && !p.gate.isVerifiedForSubmission
    );

    const res = await executeDossierSubmissionPipeline({
      wardCode: currentWard.code,
      wardName: currentWard.name,
      visionGate: hasPages ? (blockingPage?.gate ?? null) : visionGate,
      attachment: hasPages ? null : attachment,
      attachments: hasPages ? capturedPages : undefined,
      validationInput: {
        formType,
        fullName,
        citizenCccd,
        dateOfBirth,
        gender,
        address,
        citizenEmail,
        phoneNumber,
        qrVerified: Boolean(decodedQr),
        paper:
          formType === 'TK-KH' && extra.marriageMode === 'MARITAL_STATUS_CONFIRMATION'
            ? {}
            : paperValues(formType, paper, extra.parentsMarried),
        extra,
      },
    });

    if (res.updatedAttachments !== undefined) {
      setCapturedPages(res.updatedAttachments);
      if (res.updatedAttachments.length === 0) {
        setVisionGate(null);
        setAttachment(null);
      }
    }
    setSubmitResult(res);
    setIsSubmitting(false);
  };

  const hasBlockingPage = capturedPages.some(
    (p) => !p.attachedAsReference && !p.gate.isVerifiedForSubmission
  );
  const isCt01External = formType === 'CT01';
  const isVisionLocked =
    capturedPages.length > 0
      ? hasBlockingPage
      : Boolean(visionGate && !visionGate.canSubmit);
  const submitLabel = hasBlockingPage
    ? 'Kiểm tra / Chụp lại ảnh chưa đạt'
    : isVisionLocked && visionGate
    ? visionGate.submitButtonLabel
    : isCt01External
    ? 'Kiểm tra bản nháp CT01 (Kênh Công an xã / VNeID)'
    : 'Gửi yêu cầu kiểm tra trước';

  return (
    <View style={styles.screen}>
      {/* Compact 2-Mode Switcher: Soạn tờ khai | Ví Mã QR (keeps 3-tab bottom bar clean) */}
      <View
        style={[
          styles.modeBarWrap,
          { paddingHorizontal: responsive.horizontalPadding },
        ]}
      >
        <View style={styles.modeTrack}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: sectionMode === 'form' }}
            onPress={() => setSectionMode('form')}
            style={[styles.modeBtn, sectionMode === 'form' && styles.modeBtnActive]}
          >
            <FileCheck2
              size={15}
              color={sectionMode === 'form' ? COLORS.citizenCrimson : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.modeBtnText,
                sectionMode === 'form' && styles.modeBtnTextActive,
              ]}
            >
              Soạn tờ khai
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: sectionMode === 'wallet' }}
            onPress={() => setSectionMode('wallet')}
            style={[styles.modeBtn, sectionMode === 'wallet' && styles.modeBtnActive]}
          >
            <QrCode
              size={15}
              color={sectionMode === 'wallet' ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.modeBtnText,
                sectionMode === 'wallet' && styles.modeBtnWalletActive,
              ]}
            >
              Ví Mã QR
            </Text>
          </Pressable>
        </View>
      </View>

      {sectionMode === 'wallet' ? (
        <DossierAndQrPassScreen />
      ) : (
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: responsive.horizontalPadding },
          ]}
          keyboardShouldPersistTaps="handled"
        >
      {/* MOB-3.1: 4-Form Segmented Control */}
      <View style={styles.segmentedTrack}>
        {FORM_TABS.map((tab) => {
          const active = formType === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => handleSelectFormTab(tab.key)}
              style={[styles.segmentedBtn, active && styles.segmentedBtnActive]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.segmentedText,
                  active && styles.segmentedTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Compact 3-Action Bar: Scan CCCD QR | Capture Photo | Pick DOCX/PDF */}
      <View style={styles.quickActionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setScannerVisible(true)}
          style={({ pressed }) => [styles.qrBtn, pressed && styles.pressed]}
        >
          <QrCode size={16} color={COLORS.onPrimary} />
          <Text style={styles.qrBtnText} numberOfLines={1}>
            {formType === 'TK-KS' ? 'Quét CCCD người đi khai' : 'Quét QR CCCD'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void handleCapturePhoto();
          }}
          style={({ pressed }) => [styles.mediaBtn, pressed && styles.pressed]}
        >
          <Camera size={16} color={COLORS.textPrimary} />
          <Text style={styles.mediaBtnText} numberOfLines={1}>
            Chụp ảnh
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void handlePickDocument();
          }}
          style={({ pressed }) => [styles.mediaBtn, pressed && styles.pressed]}
        >
          <FileUp size={16} color={COLORS.textPrimary} />
          <Text style={styles.mediaBtnText} numberOfLines={1}>
            Tệp DOCX/PDF
          </Text>
        </Pressable>
      </View>

      {/* MOB-3.3: Verified VNeID/QR Badge */}
      {decodedQr ? (
        <View style={styles.qrVerifiedBanner}>
          <CheckCircle2 size={16} color={COLORS.successText} />
          <Text style={styles.qrVerifiedText}>
            Đã xác thực QR CCCD • Miễn bản sao cư trú (NĐ 309/2026)
          </Text>
        </View>
      ) : null}

      {/* MOB-3.4: Cross-check Discrepancies Warning */}
      {discrepancies.length > 0 ? (
        <View style={styles.discrepancyCard}>
          <View style={styles.discrepancyHeader}>
            <AlertTriangle size={15} color={COLORS.errorAccent} />
            <Text style={styles.discrepancyTitle}>
              Phát hiện {discrepancies.length} điểm lệch so với mã QR CCCD
            </Text>
          </View>
          {discrepancies.map((d) => (
            <Text
              key={d.fieldKey}
              style={[
                styles.discrepancyItem,
                d.level === 'CONFLICT' ? styles.textErr : styles.textWarn,
              ]}
            >
              • {d.fieldLabel}: {d.message}
            </Text>
          ))}
        </View>
      ) : null}

      {/* TASK-057: Multi-Slot Framed Camera Capture, OCR Verification & Confirmable Draft Prefill */}
      <BirthDocumentCaptureCard
        formType={formType}
        pages={capturedPages}
        currentDraft={{
          fullName,
          citizenCccd,
          dateOfBirth,
          gender,
          address,
          phoneNumber,
          motherName: extra.motherName,
          fatherName: extra.fatherName,
          hospitalBirthDate: extra.hospitalBirthDate,
          hospitalMotherName: extra.hospitalMotherName,
          birthCertNumber: paper.fields.birthCertNumber || '',
          childBirthPlace: paper.fields.childBirthPlace || '',
        }}
        onOpenCameraForSlot={(slotRole, replacePageId) => {
          setCameraModalTarget({ slotRole, replacePageId });
        }}
        onRetryCheckPage={(pageId) => {
          const pg = capturedPages.find((p) => p.id === pageId);
          if (pg && pg.slotRole !== 'OTHER') {
            void inspectCapturedPageWithOcr(pg.id, pg.uri, pg.mimeType, pg.fileName, pg.slotRole);
          }
        }}
        onReassignPageSlot={(pageId, targetSlot) => {
          setCapturedPages((prev) => reassignCapturedPageSlot(prev, pageId, targetSlot));
        }}
        onToggleReferenceOnly={(pageId) => {
          setCapturedPages((prev) =>
            prev.map((p) =>
              p.id === pageId ? { ...p, attachedAsReference: !p.attachedAsReference } : p
            )
          );
        }}
        onRemovePage={(pageId) => {
          setCapturedPages((prev) => prev.filter((p) => p.id !== pageId));
        }}
        onApplyPrefill={handleApplyOcrPrefill}
      />

      {/* Main Form Card */}
      <View style={[styles.formCard, { padding: responsive.cardPadding }]}>
        <Text style={[styles.cardTitle, typography.bodyBold]}>
          {formType === 'TK-KS' ? 'Thông tin trẻ & người khai' : 'Thông tin người khai'}
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, typography.captionSm]}>
            {formType === 'TK-KS' ? 'Họ và tên của trẻ *' : 'Họ và tên *'}
          </Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="VD: NGUYỄN MINH TUẤN KHANH"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, typography.captionSm]}>
            {formType === 'TK-KS' ? 'Số CCCD người đi khai (12 số) *' : 'Số CCCD (12 chữ số) *'}
          </Text>
          <TextInput
            value={citizenCccd}
            onChangeText={(v) => setCitizenCccd(v.replace(/[^0-9]/g, '').slice(0, 12))}
            keyboardType="number-pad"
            maxLength={12}
            placeholder="089205023490"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
        </View>

        <View style={styles.twoColRow}>
          <View style={[styles.field, styles.flex1]}>
            <Text style={[styles.label, typography.captionSm]}>
              Ngày sinh (DD-MM-YYYY) *
            </Text>
            <TextInput
              value={dateOfBirth}
              onChangeText={(v) => setDateOfBirth(formatDmyDateInput(v))}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="23-06-2005"
              placeholderTextColor={COLORS.textMuted}
              style={[styles.input, typography.bodyMd]}
            />
          </View>

          <View style={styles.genderCol}>
            <Text style={[styles.label, typography.captionSm]}>Giới tính</Text>
            <View style={styles.genderRow}>
              {(['Nam', 'Nữ'] as const).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGender(g)}
                  style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                >
                  <Text
                    style={[
                      styles.genderBtnText,
                      gender === g && styles.genderBtnTextActive,
                    ]}
                  >
                    {g}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {(
          <View style={styles.field}>
            <Text style={[styles.label, typography.captionSm]}>
              {formType === 'TK-KS' ? 'Địa chỉ người đi khai' : 'Nơi thường trú'}
            </Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder={`Số nhà, đường/ấp, ${currentWard.name}, An Giang`}
              placeholderTextColor={COLORS.textMuted}
              style={[styles.input, typography.bodyMd]}
            />
          </View>
        )}

        <View style={styles.hairline} />

        {/* MOB-3.8 -> MOB-3.11: Specialized Fields */}
        {(formType !== 'TK-KH' || extra.marriageMode !== 'MARITAL_STATUS_CONFIRMATION') && <PaperFields address={address} fullName={fullName} form={formType} draft={paper} onChange={setPaper} married={extra.parentsMarried} existing={formType === 'TK-BTXH' ? ['bankName'] : []} />}
        <FormSpecificFields
          formType={formType}
          extra={extra}
          onChange={handleExtraChange}
        />
      </View>

      {/* MOB-3.12: Free Email & Phone Card (Zero SMS/Zalo Cost) */}
      <View style={[styles.formCard, { padding: responsive.cardPadding }]}>
        <View style={styles.emailHeader}>
          <View style={styles.emailTitleRow}>
            <Mail size={15} color={COLORS.primary} />
            <Text style={[styles.cardTitle, typography.bodyBold]}>
              Nhận kết quả &amp; Mã QR
            </Text>
          </View>
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>Miễn phí 100% • 0 SMS</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, typography.captionSm]}>Email nhận Phiếu hẹn QR *</Text>
          <TextInput
            value={citizenEmail}
            onChangeText={setCitizenEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="congdan@gmail.com"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, typography.captionSm]}>Số điện thoại (10 số)</Text>
          <TextInput
            value={phoneNumber}
            onChangeText={(v) => setPhoneNumber(v.replace(/[^0-9]/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="0918234567"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
        </View>
      </View>

      {/* Validation Errors or Success Result Card */}
      {submitResult ? (
        <View
          style={[
            styles.resultCard,
            submitResult.success ? styles.resultOk : styles.resultBad,
          ]}
        >
          <View style={styles.resultHeader}>
            {submitResult.success ? (
              <ShieldCheck size={18} color={COLORS.successText} />
            ) : (
              <AlertTriangle size={18} color={COLORS.errorAccent} />
            )}
            <Text
              style={[
                styles.resultTitle,
                submitResult.success ? styles.textOk : styles.textErr,
              ]}
            >
              {submitResult.message}
            </Text>
          </View>

          {submitResult.dossierCode ? (
            <Text style={styles.dossierCodeText}>
              {`Mã hồ sơ: ${submitResult.dossierCode} • Hạn trả: ${formatMobileSlaDeadline(submitResult.slaDeadline)}`}
            </Text>
          ) : null}

          {submitResult.fieldValidations
            .filter((f) => !f.valid)
            .map((err, idx) => (
              <Text key={`${err.errorCode || idx}`} style={styles.errorDetailText}>
                • {err.errorMessage || err.fieldName}
              </Text>
            ))}

          {submitResult.warnings.map((w, i) => (
            <Text key={i} style={styles.warningDetailText}>
              • {w}
            </Text>
          ))}

          {submitResult.success && submitResult.stage !== 'EXTERNAL_CHANNEL_GUIDED' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setSectionMode('wallet')}
              style={styles.openWalletBtn}
            >
              <QrCode size={15} color={COLORS.onPrimary} />
              <Text style={styles.openWalletBtnText}>Mở Mã Bản Nháp &amp; Ví QR →</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {isCt01External ? (
        <View
          style={{
            backgroundColor: '#F0F9FF',
            borderColor: '#BAE6FD',
            borderWidth: 1,
            borderRadius: RADIUS.md,
            padding: SPACING.md,
            marginBottom: SPACING.sm,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C4A6E' }}>
            Phương án 3A • Kênh giải quyết: Công an cấp xã / VNeID
          </Text>
          <Text style={{ fontSize: 12, color: '#0369A1', lineHeight: 17 }}>
            SmartWard hỗ trợ kiểm tra lỗi và chuẩn bị bản nháp CT01, KHÔNG chuyển hồ sơ cư trú vào hàng đợi duyệt của UBND xã. Vui lòng nộp tại Công an {currentWard.name} hoặc VNeID / Cổng DVC Bộ Công an.
          </Text>
        </View>
      ) : null}

      {/* MOB-3.7 & MOB-3.13: Submit CTA (Hard-locked when Vision Gate blocks) */}
      <Pressable
        accessibilityRole="button"
        disabled={isVisionLocked || isSubmitting}
        onPress={() => {
          void handleSubmitDossier();
        }}
        style={({ pressed }) => [
          styles.submitBtn,
          isVisionLocked && styles.submitBtnLocked,
          pressed && !isVisionLocked && styles.pressed,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={COLORS.onPrimary} />
        ) : (
          <ShieldCheck size={18} color={COLORS.onPrimary} />
        )}
        <Text style={styles.submitBtnText} numberOfLines={1}>
          {isSubmitting ? 'Đang kiểm định & gửi...' : submitLabel}
        </Text>
      </Pressable>

      <CccdQrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onDecoded={handleQrDecoded}
      />

      <DocumentCameraModal
        visible={cameraModalTarget !== null}
        frameMode={cameraModalTarget?.slotRole === 'CCCD' ? 'CCCD' : 'A4'}
        title={
          cameraModalTarget?.slotRole
            ? `Chụp ${getSlotDocLabel(cameraModalTarget.slotRole)}`
            : 'Chụp giấy tờ hành chính'
        }
        onClose={() => setCameraModalTarget(null)}
        onPhotoSelected={(asset) => {
          void handleCameraPhotoSelected(asset);
        }}
      />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  modeBarWrap: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.citizenSurface,
  },
  modeTrack: {
    flexDirection: 'row',
    backgroundColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    padding: 3,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  modeBtnActive: {
    backgroundColor: COLORS.card,
  },
  modeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  modeBtnTextActive: {
    color: COLORS.citizenCrimson,
  },
  modeBtnWalletActive: {
    color: COLORS.primary,
  },
  openWalletBtn: {
    marginTop: 6,
    minHeight: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  openWalletBtnText: {
    color: COLORS.onPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.citizenSurface,
  },
  content: {
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.md,
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    padding: 3,
    gap: 3,
  },
  segmentedBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  segmentedBtnActive: {
    backgroundColor: COLORS.card,
  },
  segmentedText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  segmentedTextActive: {
    color: COLORS.citizenCrimson,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  qrBtn: {
    flex: 1.25,
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
  },
  qrBtnText: {
    color: COLORS.onPrimary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  mediaBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 6,
  },
  mediaBtnText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  qrVerifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  qrVerifiedText: {
    color: COLORS.successText,
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  discrepancyCard: {
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 4,
  },
  discrepancyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  discrepancyTitle: {
    color: COLORS.errorText,
    fontSize: 12.5,
    fontWeight: '800',
  },
  discrepancyItem: {
    fontSize: 12,
    lineHeight: 17,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: SPACING.sm,
  },
  cardTitle: {
    color: COLORS.textPrimary,
  },
  field: {
    gap: 4,
  },
  label: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  input: {
    minHeight: MIN_TOUCH_TARGET - 4,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    color: COLORS.textPrimary,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  flex1: {
    flex: 1,
  },
  genderCol: {
    width: 118,
    gap: 4,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 4,
  },
  genderBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET - 4,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnActive: {
    backgroundColor: COLORS.citizenCrimson,
    borderColor: COLORS.citizenCrimson,
  },
  genderBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  genderBtnTextActive: {
    color: COLORS.onPrimary,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.borderSubtle,
    marginVertical: 4,
  },
  emailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  emailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  freeBadge: {
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  freeBadgeText: {
    color: COLORS.successText,
    fontSize: 11,
    fontWeight: '700',
  },
  resultCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: 6,
  },
  resultOk: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
  },
  resultBad: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.errorBorder,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    flex: 1,
  },
  dossierCodeText: {
    color: COLORS.successText,
    fontSize: 13,
    fontWeight: '700',
  },
  errorDetailText: {
    color: COLORS.errorText,
    fontSize: 12.5,
    lineHeight: 18,
  },
  warningDetailText: {
    color: COLORS.warningText,
    fontSize: 12,
    lineHeight: 17,
  },
  textOk: { color: COLORS.successText },
  textErr: { color: COLORS.errorText },
  textWarn: { color: COLORS.warningText },
  submitBtn: {
    minHeight: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.citizenCrimson,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  submitBtnLocked: {
    backgroundColor: COLORS.textDisabled, // #94A3B8 per MOB-3.7
  },
  submitBtnText: {
    color: COLORS.onPrimary,
    fontSize: 14.5,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.84,
  },
});
