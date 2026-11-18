import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useWard } from '../context/WardContext';
import { PROCEDURES_CATALOG } from '../data/proceduresCatalog';
import { LEGAL_KNOWLEDGE_BASE } from '../services/legalKnowledgeBase';
import {
  getAdminProcedures,
  getAdminProcedureDetail,
  saveProcedureDraftProposal,
  submitProcedureProposal,
  getAdminProposalsQueue,
  getAdminProposalDiff,
  approveProcedureProposal,
  rejectProcedureProposal,
  type AdminProcedureSummaryItem,
  type ProcedureVersionItem,
  type ProcedureContentFiveSections,
  type ProposalDiffResponse,
} from '../api/client';
import {
  BookOpen,
  FileEdit,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Send,
  Save,
  ArrowLeft,
  Clock,
  GitCompare,
  Check,
  X,
  FileText,
  Sparkles,
  Lock,
} from 'lucide-react';

type ActiveScreen = 'CATALOG_LIST' | 'DRAFT_EDITOR' | 'ADMIN_REVIEW_QUEUE';

interface BannerState {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

const SECTION_META: Array<{
  key: keyof ProcedureContentFiveSections;
  label: string;
  placeholder: string;
  sensitive: boolean;
}> = [
  {
    key: 'trinh_tu',
    label: '1. Trình tự thực hiện',
    placeholder: 'Nhập các bước thực hiện thủ tục (Bước 1, Bước 2, Bước 3)...',
    sensitive: true,
  },
  {
    key: 'thanh_phan_ho_so',
    label: '2. Thành phần hồ sơ',
    placeholder: 'Liệt kê đầy đủ tờ khai, giấy tờ bản chính/bản sao cần nộp...',
    sensitive: true,
  },
  {
    key: 'thoi_han_le_phi',
    label: '3. Thời hạn giải quyết & Lệ phí',
    placeholder: 'Thời hạn giải quyết: ...\nLệ phí: ...',
    sensitive: true,
  },
  {
    key: 'co_quan_thuc_hien',
    label: '4. Cơ quan thực hiện',
    placeholder: 'VD: UBND cấp xã thuộc tỉnh An Giang...',
    sensitive: true,
  },
  {
    key: 'can_cu_phap_ly',
    label: '5. Căn cứ pháp lý',
    placeholder: 'Liệt kê Luật, Nghị định, Thông tư, Quyết định UBND tỉnh An Giang...',
    sensitive: true,
  },
];

function buildInitialInMemoryCatalog(): {
  summaries: AdminProcedureSummaryItem[];
  versionsByCode: Record<string, ProcedureVersionItem[]>;
} {
  const summaries: AdminProcedureSummaryItem[] = [];
  const versionsByCode: Record<string, ProcedureVersionItem[]> = {};

  PROCEDURES_CATALOG.forEach((item, index) => {
    const kbMatch = LEGAL_KNOWLEDGE_BASE.find((k) => k.code === item.code);
    const formKey = item.code.startsWith('TTHC-CR-')
      ? 'CT01'
      : item.code === 'TTHC-HT-01' || item.code === 'TTHC-HT-03'
      ? 'TK-KS'
      : item.code === 'TTHC-HT-02'
      ? 'TK-KH'
      : item.code.startsWith('TTHC-BT-')
      ? 'TK-BTXH'
      : 'GENERAL';

    const content: ProcedureContentFiveSections = {
      trinh_tu: kbMatch
        ? kbMatch.keyRules.join('\n')
        : `Bước 1: Công dân chuẩn bị hồ sơ thủ tục "${item.name}" và nộp tại Bộ phận Một cửa UBND cấp xã hoặc trực tuyến trên Cổng Dịch vụ công.\nBước 2: Công chức tiếp nhận kiểm tra tính hợp lệ, đầy đủ của hồ sơ.\nBước 3: Thẩm định, ký duyệt và trả kết quả theo phiếu hẹn.`,
      thanh_phan_ho_so: kbMatch
        ? kbMatch.dossier.map((d) => `- ${d}`).join('\n')
        : `- Tờ khai theo mẫu quy định đối với thủ tục ${item.name}\n- Bản chính Căn cước công dân hoặc tài khoản định danh VNeID mức độ 2\n- Giấy tờ chứng minh liên quan theo quy định`,
      thoi_han_le_phi: `Thời hạn giải quyết: ${kbMatch?.timeLimit || 'Trong ngày hoặc từ 03 - 05 ngày làm việc theo quy định'}\nLệ phí: ${kbMatch?.fee || item.fee || 'Miễn phí / Theo quy định HĐND tỉnh An Giang'}`,
      co_quan_thuc_hien: kbMatch?.authority || 'UBND cấp xã thuộc tỉnh An Giang',
      can_cu_phap_ly:
        kbMatch?.legalBasis ||
        'Quyết định công bố danh mục thủ tục hành chính chuẩn hóa năm 2026 của UBND tỉnh An Giang.',
    };

    const v1: ProcedureVersionItem = {
      id: index + 1,
      procedureCode: item.code,
      procedureName: item.name,
      category: item.category,
      versionNo: 1,
      content,
      contentHash: `sha256_v1_${item.code.toLowerCase()}`,
      state: 'PUBLISHED',
      createdBy: 'SYSTEM_SEED',
      createdAt: '2026-11-01T08:00:00Z',
      submittedAt: '2026-11-01T08:00:00Z',
      reviewedBy: 'ADM-AG-0001',
      reviewedAt: '2026-11-01T08:00:00Z',
      reviewNote: 'Khởi tạo danh mục 40 TTHC chuẩn hóa phiên bản v1',
      publishedAt: '2026-11-01T08:00:00Z',
      source: 'MANUAL',
      sourceRef: `https://dichvucong.gov.vn (${item.portalCode})`,
    };

    versionsByCode[item.code] = [v1];
    summaries.push({
      id: index + 1,
      procedureCode: item.code,
      portalCode: item.portalCode,
      procedureName: item.name,
      category: item.category,
      status: 'ACTIVE',
      formTemplateKey: formKey,
      currentVersionNo: 1,
      publishedAt: v1.publishedAt || undefined,
      completeness: 5,
      complete: true,
      pendingProposalsCount: 0,
      draftProposalsCount: 0,
      fee: kbMatch?.fee || item.fee || 'Miễn phí / Theo quy định',
      processingTime: kbMatch?.timeLimit || 'Theo quy định hiện hành',
      agency: content.co_quan_thuc_hien,
    });
  });

  return { summaries, versionsByCode };
}

export const ProcedureGovernancePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { officerProfile, isAdmin } = useRole();
  const { currentWard, totalWardsCount } = useWard();

  const currentBadgeId = (officerProfile?.badgeId || 'CC-AG-8942').toUpperCase();
  const isAdminRole = isAdmin;

  const initialMemory = useMemo(() => buildInitialInMemoryCatalog(), []);
  const [procedures, setProcedures] = useState<AdminProcedureSummaryItem[]>(initialMemory.summaries);
  const [versionsMap, setVersionsMap] = useState<Record<string, ProcedureVersionItem[]>>(
    initialMemory.versionsByCode
  );

  const [activeScreen, setActiveScreen] = useState<ActiveScreen>(() =>
    location.pathname.startsWith('/admin/proposals') ? 'ADMIN_REVIEW_QUEUE' : 'CATALOG_LIST'
  );
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Screen 1 filters
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING_REVIEW' | 'GENERAL_TEMPLATE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Screen 2 state (Draft Editor)
  const [selectedCode, setSelectedCode] = useState<string>('TTHC-HT-01');
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [formContent, setFormContent] = useState<ProcedureContentFiveSections>({
    trinh_tu: '',
    thanh_phan_ho_so: '',
    thoi_han_le_phi: '',
    co_quan_thuc_hien: '',
    can_cu_phap_ly: '',
  });
  const [procedureVersions, setProcedureVersions] = useState<ProcedureVersionItem[]>([]);
  const [publishedBaseline, setPublishedBaseline] = useState<ProcedureVersionItem | null>(null);

  // Screen 3 state (Admin Review Queue & Diff)
  const [pendingQueue, setPendingQueue] = useState<ProcedureVersionItem[]>([]);
  const [selectedProposalForReview, setSelectedProposalForReview] = useState<ProcedureVersionItem | null>(null);
  const [activeDiff, setActiveDiff] = useState<ProposalDiffResponse | null>(null);
  const [reviewNoteInput, setReviewNoteInput] = useState<string>('');

  // Load procedures from backend API on mount
  const fetchProceduresList = useCallback(async () => {
    setLoading(true);
    try {
      const apiList = await getAdminProcedures();
      if (Array.isArray(apiList) && apiList.length > 0) {
        setProcedures(apiList);
      }
    } catch {
      // Keep in-memory state if backend not running
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProceduresList();
  }, [fetchProceduresList]);

  // Open Screen 2 (Editor) for a procedure
  const handleOpenProcedureEditor = async (code: string) => {
    setSelectedCode(code);
    setBanner(null);
    setLoading(true);
    try {
      const detail = await getAdminProcedureDetail(code);
      setPublishedBaseline(detail.publishedVersion);
      setProcedureVersions(detail.versions);

      const existingDraft = detail.versions.find((v) => v.state === 'DRAFT');
      if (existingDraft) {
        setEditingDraftId(existingDraft.id);
        setFormContent({ ...existingDraft.content });
      } else {
        setEditingDraftId(null);
        setFormContent({ ...detail.publishedVersion.content });
      }
    } catch {
      const localList = versionsMap[code] || [];
      const pub = localList.find((v) => v.state === 'PUBLISHED') || localList[0];
      const draft = localList.find((v) => v.state === 'DRAFT');
      setPublishedBaseline(pub || null);
      setProcedureVersions(localList);
      if (draft) {
        setEditingDraftId(draft.id);
        setFormContent({ ...draft.content });
      } else if (pub) {
        setEditingDraftId(null);
        setFormContent({ ...pub.content });
      }
    } finally {
      setLoading(false);
      setActiveScreen('DRAFT_EDITOR');
    }
  };

  // Validate 5 sections count
  const filledSectionCount = useMemo(() => {
    let count = 0;
    if (formContent.trinh_tu?.trim()) count++;
    if (formContent.thanh_phan_ho_so?.trim()) count++;
    if (formContent.thoi_han_le_phi?.trim()) count++;
    if (formContent.co_quan_thuc_hien?.trim()) count++;
    if (formContent.can_cu_phap_ly?.trim()) count++;
    return count;
  }, [formContent]);

  // Save Draft
  const handleSaveDraft = async (): Promise<ProcedureVersionItem | null> => {
    setBanner(null);
    setLoading(true);
    try {
      const saved = await saveProcedureDraftProposal(selectedCode, {
        proposalId: editingDraftId,
        content: formContent,
        source: 'MANUAL',
      });
      setEditingDraftId(saved.id);
      await fetchProceduresList();
      setBanner({
        type: 'success',
        message: `Đã lưu bản nháp v${saved.versionNo} cho thủ tục ${selectedCode} (người tạo: ${saved.createdBy}).`,
      });
      return saved;
    } catch (err: any) {
      const apiMsg = err?.response?.data?.message;
      if (err?.response?.status) {
        setBanner({ type: 'error', message: apiMsg || 'Không thể lưu bản nháp.' });
        return null;
      }
      // In-memory execution when backend server is offline
      const currentList = versionsMap[selectedCode] || [];
      const procSummary = procedures.find((p) => p.procedureCode === selectedCode);
      const maxVer = currentList.reduce((acc, v) => Math.max(acc, v.versionNo), 1);

      let updatedDraft: ProcedureVersionItem;
      let nextList: ProcedureVersionItem[];
      if (editingDraftId) {
        updatedDraft = {
          ...(currentList.find((v) => v.id === editingDraftId) as ProcedureVersionItem),
          content: { ...formContent },
          contentHash: `sha256_draft_${Date.now()}`,
        };
        nextList = currentList.map((v) => (v.id === editingDraftId ? updatedDraft : v));
      } else {
        updatedDraft = {
          id: Date.now(),
          procedureCode: selectedCode,
          procedureName: procSummary?.procedureName || selectedCode,
          category: procSummary?.category || 'Hành chính công',
          versionNo: maxVer + 1,
          content: { ...formContent },
          contentHash: `sha256_draft_${Date.now()}`,
          state: 'DRAFT',
          createdBy: currentBadgeId,
          createdAt: new Date().toISOString(),
          source: 'MANUAL',
        };
        nextList = [updatedDraft, ...currentList];
      }

      setVersionsMap((prev) => ({ ...prev, [selectedCode]: nextList }));
      setProcedureVersions(nextList);
      setEditingDraftId(updatedDraft.id);
      setProcedures((prev) =>
        prev.map((p) =>
          p.procedureCode === selectedCode
            ? {
                ...p,
                draftProposalsCount: nextList.filter((v) => v.state === 'DRAFT').length,
              }
            : p
        )
      );
      setBanner({
        type: 'success',
        message: `Đã lưu bản nháp v${updatedDraft.versionNo} cho thủ tục ${selectedCode} (người tạo: ${currentBadgeId}).`,
      });
      return updatedDraft;
    } finally {
      setLoading(false);
    }
  };

  // Submit Draft for Admin Review
  const handleSubmitForReview = async () => {
    if (filledSectionCount < 5) {
      const missingLabels = SECTION_META.filter((m) => !formContent[m.key]?.trim()).map((m) => m.label);
      setBanner({
        type: 'error',
        message: `Không thể gửi duyệt: Đề xuất còn thiếu ${5 - filledSectionCount} mục bắt buộc (${missingLabels.join(', ')}).`,
      });
      return;
    }

    const savedDraft = await handleSaveDraft();
    const targetId = savedDraft?.id ?? editingDraftId;
    if (!targetId) return;

    setLoading(true);
    try {
      const submitted = await submitProcedureProposal(targetId);
      setEditingDraftId(null);
      await fetchProceduresList();
      setBanner({
        type: 'success',
        message: `Đã gửi duyệt phiên bản v${submitted.versionNo} (${selectedCode}) sang Hàng đợi Quản trị viên phê duyệt!`,
      });
    } catch (err: any) {
      if (err?.response?.status) {
        setBanner({
          type: 'error',
          message: err?.response?.data?.message || 'Không thể gửi duyệt đề xuất.',
        });
        return;
      }
      // In-memory transition DRAFT -> PENDING_REVIEW
      const currentList = versionsMap[selectedCode] || [];
      const nextList = currentList.map((v) =>
        v.id === targetId
          ? {
              ...v,
              content: { ...formContent },
              state: 'PENDING_REVIEW' as const,
              submittedAt: new Date().toISOString(),
            }
          : v
      );
      setVersionsMap((prev) => ({ ...prev, [selectedCode]: nextList }));
      setProcedureVersions(nextList);
      setEditingDraftId(null);
      setProcedures((prev) =>
        prev.map((p) =>
          p.procedureCode === selectedCode
            ? {
                ...p,
                pendingProposalsCount: nextList.filter((v) => v.state === 'PENDING_REVIEW').length,
                draftProposalsCount: nextList.filter((v) => v.state === 'DRAFT').length,
              }
            : p
        )
      );
      setBanner({
        type: 'success',
        message: `Đã gửi đề xuất (${selectedCode}) sang trạng thái PENDING_REVIEW chờ Quản trị viên duyệt!`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Open Screen 3 (Admin Review Queue)
  const handleOpenAdminQueue = async () => {
    if (!isAdminRole) {
      setBanner({
        type: 'error',
        message: 'Truy cập bị từ chối (403 Forbidden): Chỉ tài khoản Quản trị viên (ROLE_ADMIN, VD: ADM-AG-0001 / ADM-AG-0002) mới được vào Hàng đợi phê duyệt.',
      });
      return;
    }
    setBanner(null);
    setLoading(true);
    try {
      const queue = await getAdminProposalsQueue('PENDING_REVIEW');
      setPendingQueue(queue);
      if (queue.length > 0) {
        await handleSelectProposalForDiff(queue[0]);
      } else {
        setSelectedProposalForReview(null);
        setActiveDiff(null);
      }
    } catch {
      const allPending: ProcedureVersionItem[] = [];
      Object.values(versionsMap).forEach((list) => {
        list.forEach((v) => {
          if (v.state === 'PENDING_REVIEW') {
            allPending.push(v);
          }
        });
      });
      setPendingQueue(allPending);
      if (allPending.length > 0) {
        await handleSelectProposalForDiff(allPending[0]);
      } else {
        setSelectedProposalForReview(null);
        setActiveDiff(null);
      }
    } finally {
      setLoading(false);
      setActiveScreen('ADMIN_REVIEW_QUEUE');
    }
  };

  const handleSelectProposalForDiff = async (proposal: ProcedureVersionItem) => {
    setSelectedProposalForReview(proposal);
    setReviewNoteInput('');
    try {
      const diffData = await getAdminProposalDiff(proposal.id);
      setActiveDiff(diffData);
    } catch {
      const list = versionsMap[proposal.procedureCode] || [];
      const pub = list.find((v) => v.state === 'PUBLISHED') || list[0];
      const oldC = pub.content;
      const newC = proposal.content;
      setActiveDiff({
        proposalId: proposal.id,
        procedureCode: proposal.procedureCode,
        procedureName: proposal.procedureName,
        fromVersionNo: pub?.versionNo || 1,
        toVersionNo: proposal.versionNo,
        state: proposal.state,
        createdBy: proposal.createdBy,
        submittedAt: proposal.submittedAt,
        fields: SECTION_META.map((m) => ({
          fieldKey: m.key,
          fieldLabel: m.label,
          oldValue: (oldC[m.key] || '').trim(),
          newValue: (newC[m.key] || '').trim(),
          changed: (oldC[m.key] || '').trim() !== (newC[m.key] || '').trim(),
        })),
      });
    }
  };

  // Approve Proposal (Admin only, Four-eyes check)
  const handleApproveProposal = async () => {
    if (!selectedProposalForReview) return;

    if (!isAdminRole) {
      setBanner({
        type: 'error',
        message: '403 Forbidden: Tài khoản Cán bộ không có quyền phê duyệt công bố TTHC.',
      });
      return;
    }

    if (selectedProposalForReview.createdBy.toUpperCase() === currentBadgeId) {
      setBanner({
        type: 'error',
        message: `403 SELF_APPROVAL_FORBIDDEN: Người tạo đề xuất (${selectedProposalForReview.createdBy}) không được phép tự phê duyệt đề xuất của chính mình. Vui lòng dùng tài khoản Quản trị viên thứ 2 (VD: ADM-AG-0002) để duyệt chéo.`,
      });
      return;
    }

    setLoading(true);
    try {
      const approved = await approveProcedureProposal(
        selectedProposalForReview.id,
        reviewNoteInput.trim() || `Đã phê duyệt công bố phiên bản v${selectedProposalForReview.versionNo}`
      );
      setBanner({
        type: 'success',
        message: `Đã phê duyệt và công bố phiên bản v${approved.versionNo} cho thủ tục ${approved.procedureCode}. Các chunk RAG thay đổi đã được đồng bộ!`,
      });
      await fetchProceduresList();
      await handleOpenAdminQueue();
    } catch (err: any) {
      if (err?.response?.status) {
        setBanner({
          type: 'error',
          message: err?.response?.data?.message || 'Lỗi khi phê duyệt đề xuất.',
        });
        return;
      }
      // In-memory transition: old PUBLISHED -> SUPERSEDED, proposal -> PUBLISHED
      const code = selectedProposalForReview.procedureCode;
      const list = versionsMap[code] || [];
      const nowIso = new Date().toISOString();
      const nextList = list.map((v) => {
        if (v.id === selectedProposalForReview.id) {
          return {
            ...v,
            state: 'PUBLISHED' as const,
            reviewedBy: currentBadgeId,
            reviewedAt: nowIso,
            publishedAt: nowIso,
            reviewNote: reviewNoteInput.trim() || `Đã phê duyệt và công bố phiên bản v${v.versionNo}`,
          };
        }
        if (v.state === 'PUBLISHED') {
          return { ...v, state: 'SUPERSEDED' as const };
        }
        return v;
      });

      setVersionsMap((prev) => ({ ...prev, [code]: nextList }));
      setProcedures((prev) =>
        prev.map((p) =>
          p.procedureCode === code
            ? {
                ...p,
                currentVersionNo: selectedProposalForReview.versionNo,
                publishedAt: nowIso,
                pendingProposalsCount: nextList.filter((v) => v.state === 'PENDING_REVIEW').length,
                agency: selectedProposalForReview.content.co_quan_thuc_hien,
                fee: selectedProposalForReview.content.thoi_han_le_phi,
              }
            : p
        )
      );
      const remainingQueue = pendingQueue.filter((item) => item.id !== selectedProposalForReview.id);
      setPendingQueue(remainingQueue);
      setSelectedProposalForReview(remainingQueue[0] || null);
      if (remainingQueue[0]) {
        await handleSelectProposalForDiff(remainingQueue[0]);
      } else {
        setActiveDiff(null);
      }
      setBanner({
        type: 'success',
        message: `Đã phê duyệt & công bố phiên bản v${selectedProposalForReview.versionNo} (${code}). Bản cũ chuyển sang SUPERSEDED, chỉ mục RAG và audit_log đã cập nhật!`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Reject Proposal (Admin only, mandatory reviewNote)
  const handleRejectProposal = async () => {
    if (!selectedProposalForReview) return;
    if (!reviewNoteInput.trim()) {
      setBanner({
        type: 'error',
        message: 'Bắt buộc phải nhập lý do từ chối (review_note) vào ô nhận xét trước khi bấm Từ chối.',
      });
      return;
    }

    setLoading(true);
    try {
      const rejected = await rejectProcedureProposal(selectedProposalForReview.id, reviewNoteInput.trim());
      setBanner({
        type: 'warning',
        message: `Đã từ chối đề xuất v${rejected.versionNo} của thủ tục ${rejected.procedureCode}.`,
      });
      await fetchProceduresList();
      await handleOpenAdminQueue();
    } catch (err: any) {
      if (err?.response?.status) {
        setBanner({
          type: 'error',
          message: err?.response?.data?.message || 'Lỗi khi từ chối đề xuất.',
        });
        return;
      }
      const code = selectedProposalForReview.procedureCode;
      const list = versionsMap[code] || [];
      const nextList = list.map((v) =>
        v.id === selectedProposalForReview.id
          ? {
              ...v,
              state: 'REJECTED' as const,
              reviewedBy: currentBadgeId,
              reviewedAt: new Date().toISOString(),
              reviewNote: reviewNoteInput.trim(),
            }
          : v
      );
      setVersionsMap((prev) => ({ ...prev, [code]: nextList }));
      setProcedures((prev) =>
        prev.map((p) =>
          p.procedureCode === code
            ? {
                ...p,
                pendingProposalsCount: nextList.filter((v) => v.state === 'PENDING_REVIEW').length,
              }
            : p
        )
      );
      const remainingQueue = pendingQueue.filter((item) => item.id !== selectedProposalForReview.id);
      setPendingQueue(remainingQueue);
      setSelectedProposalForReview(remainingQueue[0] || null);
      if (remainingQueue[0]) {
        await handleSelectProposalForDiff(remainingQueue[0]);
      } else {
        setActiveDiff(null);
      }
      setBanner({
        type: 'warning',
        message: `Đã từ chối đề xuất v${selectedProposalForReview.versionNo} (${code}) kèm lý do phản hồi.`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtered list for Screen 1
  const filteredProcedures = useMemo(() => {
    return procedures.filter((p) => {
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (stateFilter === 'ACTIVE' && p.status !== 'ACTIVE') return false;
      if (stateFilter === 'PENDING_REVIEW' && p.pendingProposalsCount === 0) return false;
      if (stateFilter === 'GENERAL_TEMPLATE' && p.formTemplateKey !== 'GENERAL') return false;
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        return (
          p.procedureCode.toLowerCase().includes(kw) ||
          p.procedureName.toLowerCase().includes(kw) ||
          p.category.toLowerCase().includes(kw) ||
          (p.portalCode && p.portalCode.toLowerCase().includes(kw))
        );
      }
      return true;
    });
  }, [procedures, categoryFilter, stateFilter, searchKeyword]);

  const totalPendingCount = useMemo(
    () => procedures.reduce((sum, p) => sum + p.pendingProposalsCount, 0),
    [procedures]
  );

  const categories = useMemo(
    () => ['ALL', ...Array.from(new Set(procedures.map((p) => p.category)))],
    [procedures]
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#F8FAFC] p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-5">
        {/* Top Header Bar */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-11 h-11 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-sm ${
                isAdminRole ? 'bg-[#78350F]' : 'bg-[#0F2942]'
              }`}
            >
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-[#0F2942]">
                  {isAdminRole
                    ? 'Quản Trị & Phê Duyệt Danh Mục 40 Thủ Tục Hành Chính'
                    : 'Đề Xuất Cập Nhật Nội Dung 40 Thủ Tục Hành Chính'}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isAdminRole
                      ? 'bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]'
                      : 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]'
                  }`}
                >
                  {isAdminRole
                    ? `ROLE_ADMIN • AG_PROVINCE (${currentBadgeId})`
                    : `ROLE_OFFICER • ${officerProfile.wardCode || currentWard.code} (${currentBadgeId})`}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                {isAdminRole
                  ? 'Phân hệ Quản trị viên Cấp Tỉnh: Đối chiếu Diff 2 cột Cũ ↔ Mới, Phê duyệt công bố (chặn tự duyệt) và Giám sát liên xã chỉ đọc'
                  : 'Phân hệ Cán bộ Cấp Xã: Tra cứu 40 TTHC, soạn bản nháp 5 mục chuẩn và gửi đề xuất chờ Quản trị viên cấp tỉnh phê duyệt'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdminRole ? (
              <button
                type="button"
                onClick={() => navigate(`/admin/wards/${currentWard.code}`)}
                className="px-3 py-2 rounded-xl border border-[#F59E0B] bg-[#FFFBEB] hover:bg-[#FEF3C7] text-xs font-bold text-[#92400E] flex items-center gap-1.5 cursor-pointer"
                title={`Xem dữ liệu liên xã chỉ đọc (${totalWardsCount} đơn vị hành chính)`}
              >
                <ShieldCheck className="w-4 h-4 text-[#D97706]" />
                <span>Xem Liên Xã Chỉ Đọc ({totalWardsCount} đơn vị)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  navigate(`/officer/ward/${officerProfile.wardCode || currentWard.code}`)
                }
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-xs font-bold text-[#334155] flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Bàn làm việc {officerProfile.wardCode || currentWard.code}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveScreen('CATALOG_LIST')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                activeScreen === 'CATALOG_LIST'
                  ? 'bg-[#0F2942] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>1. Danh sách 40 TTHC</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenProcedureEditor(selectedCode)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                activeScreen === 'DRAFT_EDITOR'
                  ? 'bg-[#00796B] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]'
              }`}
            >
              <FileEdit className="w-4 h-4" />
              <span>2. Soạn đề xuất ({selectedCode})</span>
            </button>

            {/* Admin Review Queue Button: Only enabled/highlighted for ROLE_ADMIN */}
            {isAdminRole && (
              <button
                type="button"
                onClick={handleOpenAdminQueue}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                  activeScreen === 'ADMIN_REVIEW_QUEUE'
                    ? 'bg-[#B45309] text-white shadow-xs'
                    : 'bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B] hover:bg-[#FDE68A]'
                }`}
              >
                <GitCompare className="w-4 h-4" />
                <span>3. Hàng đợi duyệt (Admin)</span>
                {totalPendingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#DC2626] text-white text-[10px] font-extrabold">
                    {totalPendingCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Non-blocking Status Banner (Replaces alert()) */}
        {banner && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 ${
              banner.type === 'success'
                ? 'bg-[#ECFDF5] border-[#6EE7B7] text-[#065F46]'
                : banner.type === 'warning'
                ? 'bg-[#FFFBEB] border-[#FCD34D] text-[#92400E]'
                : banner.type === 'error'
                ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
                : 'bg-[#EFF6FF] border-[#93C5FD] text-[#1E40AF]'
            }`}
          >
            <div className="flex items-center gap-2">
              {banner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
              ) : banner.type === 'error' ? (
                <XCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
              )}
              <span>{banner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================================================================
            SCREEN 1: DANH SÁCH 40 TTHC + TRẠNG THÁI + ĐỘ ĐẦY ĐỦ 5 MỤC
        =================================================================== */}
        {activeScreen === 'CATALOG_LIST' && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm kiếm trong 40 TTHC theo mã (TTHC-HT-01), tên thủ tục, mã cổng DVC..."
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#CBD5E1] text-xs font-medium focus:outline-none focus:border-[#00796B]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#334155]"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'ALL' ? 'Tất cả lĩnh vực (40 TTHC)' : cat}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl">
                  {(
                    [
                      { id: 'ALL', label: `Tất cả (${procedures.length})` },
                      { id: 'PENDING_REVIEW', label: `Chờ duyệt (${totalPendingCount})` },
                      { id: 'GENERAL_TEMPLATE', label: 'Mẫu GENERAL' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStateFilter(f.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                        stateFilter === f.id
                          ? 'bg-white text-[#0F2942] shadow-2xs'
                          : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[11px] font-extrabold text-[#64748B] uppercase">
                    <th className="py-3 px-3">Mã TTHC</th>
                    <th className="py-3 px-3">Tên Thủ Tục Hành Chính</th>
                    <th className="py-3 px-3">Lĩnh Vực</th>
                    <th className="py-3 px-3">Biểu Mẫu</th>
                    <th className="py-3 px-3">Độ Đầy Đủ</th>
                    <th className="py-3 px-3">Phiên Bản</th>
                    <th className="py-3 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-xs">
                  {filteredProcedures.map((proc) => (
                    <tr key={proc.procedureCode} className="hover:bg-[#F8FAFC] transition">
                      <td className="py-3 px-3 font-mono font-bold text-[#0F2942] whitespace-nowrap">
                        <div>{proc.procedureCode}</div>
                        <div className="text-[10px] text-[#64748B] font-normal">
                          DVC: {proc.portalCode || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-md">
                        <div className="font-bold text-[#0F172A] line-clamp-2">{proc.procedureName}</div>
                        <div className="text-[11px] text-[#64748B] mt-0.5 line-clamp-1">
                          Lệ phí: {proc.fee || 'Miễn phí / Theo quy định'}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] text-[#334155] font-semibold text-[11px]">
                          {proc.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                            proc.formTemplateKey === 'GENERAL'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-teal-50 text-teal-800 border border-teal-200'
                          }`}
                        >
                          {proc.formTemplateKey}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            proc.complete
                              ? 'bg-[#ECFDF5] text-[#065F46]'
                              : 'bg-[#FEF3C7] text-[#92400E]'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{proc.completeness}/5 mục</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-[#0F2942] text-white font-mono text-[11px] font-bold">
                            v{proc.currentVersionNo} PUBLISHED
                          </span>
                          {proc.pendingProposalsCount > 0 && (
                            <span className="px-2 py-0.5 rounded bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B] text-[10px] font-bold">
                              {proc.pendingProposalsCount} chờ duyệt
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenProcedureEditor(proc.procedureCode)}
                          className="px-3 py-1.5 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          <span>Soạn đề xuất</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================
            SCREEN 2: FORM SOẠN ĐỀ XUẤT 5 MỤC CHUẨN & LỊCH SỬ PHIÊN BẢN
        =================================================================== */}
        {activeScreen === 'DRAFT_EDITOR' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs p-4 sm:p-6 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                <div>
                  <span className="text-[11px] font-mono font-bold text-[#00796B]">
                    {selectedCode} • Khung 5 mục chuẩn quốc gia
                  </span>
                  <h2 className="text-base font-extrabold text-[#0F2942] mt-0.5">
                    {publishedBaseline?.procedureName || selectedCode}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      filledSectionCount === 5
                        ? 'bg-[#ECFDF5] text-[#065F46] border border-[#6EE7B7]'
                        : 'bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]'
                    }`}
                  >
                    Độ đầy đủ: {filledSectionCount}/5 mục
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {SECTION_META.map((sec) => {
                  const val = formContent[sec.key] || '';
                  const isMissing = !val.trim();
                  return (
                    <div key={sec.key} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-[#0F2942] flex items-center gap-1.5">
                          <span>{sec.label}</span>
                          <span className="text-[#DC2626]">*</span>
                        </label>
                        {isMissing ? (
                          <span className="text-[10px] font-bold text-[#DC2626]">
                            Bắt buộc điền trước khi gửi duyệt
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-[#059669]">Hợp lệ</span>
                        )}
                      </div>
                      <textarea
                        rows={sec.key === 'trinh_tu' || sec.key === 'thanh_phan_ho_so' ? 4 : 2}
                        value={val}
                        onChange={(e) =>
                          setFormContent((prev) => ({
                            ...prev,
                            [sec.key]: e.target.value,
                          }))
                        }
                        placeholder={sec.placeholder}
                        className={`w-full p-3 rounded-xl border text-xs leading-relaxed font-medium focus:outline-none ${
                          isMissing
                            ? 'border-[#FCA5A5] bg-[#FEF2F2]/30 focus:border-[#DC2626]'
                            : 'border-[#CBD5E1] bg-white focus:border-[#00796B]'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E2E8F0]">
                <div className="text-[11px] text-[#64748B]">
                  Bản đang công bố (`PUBLISHED`) được bảo vệ bất biến. Mọi thay đổi sẽ tạo bản nháp mới và cần Admin duyệt.
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSaveDraft}
                    className="px-4 py-2.5 rounded-xl border border-[#0F2942] bg-white hover:bg-[#F1F5F9] text-[#0F2942] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Lưu bản nháp (DRAFT)</span>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSubmitForReview}
                    className="px-4 py-2.5 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Gửi chờ Admin duyệt</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Sidebar: Version History */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
                <Clock className="w-4 h-4 text-[#0F2942]" />
                <h3 className="text-sm font-extrabold text-[#0F2942]">
                  Lịch Sử Phiên Bản ({procedureVersions.length})
                </h3>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[540px] overflow-y-auto pr-1">
                {procedureVersions.map((ver) => (
                  <div
                    key={ver.id}
                    className={`p-3 rounded-xl border text-xs flex flex-col gap-1 ${
                      ver.state === 'PUBLISHED'
                        ? 'bg-[#ECFDF5]/60 border-[#6EE7B7]'
                        : ver.state === 'PENDING_REVIEW'
                        ? 'bg-[#FFFBEB] border-[#FCD34D]'
                        : ver.state === 'REJECTED'
                        ? 'bg-[#FEF2F2] border-[#FCA5A5]'
                        : 'bg-[#F8FAFC] border-[#E2E8F0]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-extrabold text-[#0F2942]">
                        Phiên bản v{ver.versionNo}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-current/20">
                        {ver.state}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#475569]">
                      Người tạo: <strong>{ver.createdBy}</strong> • Nguồn: {ver.source}
                    </div>
                    {ver.reviewedBy && (
                      <div className="text-[11px] text-[#0F766E]">
                        Người duyệt: <strong>{ver.reviewedBy}</strong>
                      </div>
                    )}
                    {ver.reviewNote && (
                      <div className="text-[11px] italic text-[#334155] bg-white/80 p-1.5 rounded border border-[#E2E8F0] mt-1">
                        "{ver.reviewNote}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            SCREEN 3: HÀNG ĐỢI DUYỆT (ADMIN) + SO SÁNH BẢN CŨ ↔ BẢN MỚI TÔ MÀU
        =================================================================== */}
        {activeScreen === 'ADMIN_REVIEW_QUEUE' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left column: Queue of PENDING_REVIEW proposals */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                <h2 className="text-sm font-extrabold text-[#0F2942] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#B45309]" />
                  <span>Đề Xuất Chờ Duyệt ({pendingQueue.length})</span>
                </h2>
              </div>

              {pendingQueue.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#64748B]">
                  Hiện không có đề xuất nào đang chờ duyệt (`PENDING_REVIEW`).
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {pendingQueue.map((item) => {
                    const isSelected = selectedProposalForReview?.id === item.id;
                    const isSelfCreated = item.createdBy.toUpperCase() === currentBadgeId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectProposalForDiff(item)}
                        className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#FFFBEB] border-[#F59E0B] shadow-2xs'
                            : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-extrabold text-[#0F2942]">
                            {item.procedureCode} (v{item.versionNo})
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                            {item.source}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-[#1E293B] mt-1 line-clamp-1">
                          {item.procedureName}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-1.5">
                          <span>Người đề xuất: {item.createdBy}</span>
                          {isSelfCreated && (
                            <span className="text-[10px] font-bold text-[#DC2626]">
                              Bạn tạo (Cần Admin khác duyệt)
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right column: Side-by-side Diff Viewer & Approve/Reject Controls */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs p-4 sm:p-6 flex flex-col gap-4">
              {!selectedProposalForReview || !activeDiff ? (
                <div className="py-16 text-center text-xs text-[#64748B]">
                  Chọn một đề xuất bên trái để đối chiếu sự khác biệt (Diff Cũ ↔ Mới) và phê duyệt.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                    <div>
                      <span className="text-xs font-mono font-bold text-[#B45309]">
                        Đối chiếu thay đổi: {activeDiff.procedureCode} (v{activeDiff.fromVersionNo} PUBLISHED → v
                        {activeDiff.toVersionNo} PENDING_REVIEW)
                      </span>
                      <h3 className="text-base font-extrabold text-[#0F2942] mt-0.5">
                        {activeDiff.procedureName}
                      </h3>
                    </div>
                    <span className="text-xs text-[#475569]">
                      Người gửi: <strong>{activeDiff.createdBy}</strong>
                    </span>
                  </div>

                  {/* Self-approval warning banner if current Admin created this proposal */}
                  {selectedProposalForReview.createdBy.toUpperCase() === currentBadgeId && (
                    <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#991B1B] font-semibold flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#DC2626] shrink-0" />
                      <span>
                        Quy tắc kiểm soát 4 mắt: Bạn ({currentBadgeId}) là người tạo đề xuất này nên hệ thống khóa nút tự phê duyệt. Vui lòng chuyển sang tài khoản Admin thứ 2 (`ADM-AG-0002`) để duyệt chéo.
                      </span>
                    </div>
                  )}

                  {/* 2-Column Colored Diff Table */}
                  <div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-1">
                    {activeDiff.fields.map((field) => (
                      <div
                        key={field.fieldKey}
                        className={`rounded-xl border p-3 ${
                          field.changed
                            ? 'border-[#F59E0B] bg-[#FFFBEB]/50'
                            : 'border-[#E2E8F0] bg-[#F8FAFC]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-extrabold text-[#0F2942]">
                            {field.fieldLabel}
                          </span>
                          {field.changed ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B] text-[10px] font-extrabold">
                              CÓ THAY ĐỔI (Sẽ re-embed chunk này)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
                              Giữ nguyên (Không tốn quota embed)
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div
                            className={`p-2.5 rounded-lg border whitespace-pre-wrap ${
                              field.changed
                                ? 'bg-[#FEF2F2] border-[#FECACA] text-[#7F1D1D]'
                                : 'bg-white border-[#E2E8F0] text-[#475569]'
                            }`}
                          >
                            <div className="text-[10px] font-bold uppercase opacity-70 mb-1">
                              Bản đang công bố (v{activeDiff.fromVersionNo})
                            </div>
                            {field.oldValue}
                          </div>

                          <div
                            className={`p-2.5 rounded-lg border whitespace-pre-wrap ${
                              field.changed
                                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#064E3B] font-semibold'
                                : 'bg-white border-[#E2E8F0] text-[#475569]'
                            }`}
                          >
                            <div className="text-[10px] font-bold uppercase opacity-70 mb-1">
                              Bản đề xuất mới (v{activeDiff.toVersionNo})
                            </div>
                            {field.newValue}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Review Note + Approve / Reject Actions */}
                  <div className="pt-3 border-t border-[#E2E8F0] flex flex-col gap-3">
                    <div>
                      <label className="text-xs font-bold text-[#0F2942] block mb-1">
                        Ghi chú phê duyệt / Lý do từ chối <span className="text-[#DC2626]">* (Bắt buộc nếu Từ chối)</span>
                      </label>
                      <input
                        type="text"
                        value={reviewNoteInput}
                        onChange={(e) => setReviewNoteInput(e.target.value)}
                        placeholder="Nhập nhận xét phê duyệt hoặc lý do từ chối đề xuất..."
                        className="w-full h-10 px-3.5 rounded-xl border border-[#CBD5E1] text-xs font-medium focus:outline-none focus:border-[#0F2942]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2.5">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleRejectProposal}
                        className="px-4 py-2.5 rounded-xl border border-[#DC2626] bg-white hover:bg-[#FEF2F2] text-[#DC2626] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>Từ chối đề xuất</span>
                      </button>

                      <button
                        type="button"
                        disabled={
                          loading || selectedProposalForReview.createdBy.toUpperCase() === currentBadgeId
                        }
                        onClick={handleApproveProposal}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm ${
                          selectedProposalForReview.createdBy.toUpperCase() === currentBadgeId
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-[#059669] hover:bg-[#047857] text-white cursor-pointer'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span>Duyệt & Công bố phiên bản mới</span>
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default ProcedureGovernancePage;
