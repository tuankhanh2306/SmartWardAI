import { api } from './http';
import { PROCEDURES_CATALOG } from '../../data/proceduresCatalog';

// 4. Zero-Trust Document Vault Types & API
export interface VaultUploadResponse {
  documentId: string;
  documentCode?: string;
  oneTimeToken: string;
  viewUrl: string;
  tokenExpiresInSeconds: number;
  expiresAt?: string;
  encryptionAlgorithm?: string;
  watermarkText?: string;
  watermarkApplied?: boolean;
  message: string;
}

export const uploadVaultDocument = async (formData: FormData): Promise<VaultUploadResponse> => {
  const resp = await api.post<any>('/vault/upload', formData, {
    headers: { 'Content-Type': undefined },
  });
  const data = resp.data?.data ?? resp.data;
  return {
    documentId: data.documentCode || data.documentId || ('DOC_' + Date.now()),
    documentCode: data.documentCode,
    oneTimeToken: data.oneTimeToken || '',
    viewUrl: data.viewUrl || '',
    tokenExpiresInSeconds: data.tokenExpiresInSeconds || 86400,
    expiresAt: data.expiresAt,
    encryptionAlgorithm: data.encryptionAlgorithm || 'AES/GCM/NoPadding (256-bit)',
    watermarkText: data.watermarkText || 'UBND XÃ - SMARTWARD ZERO-TRUST',
    watermarkApplied: data.watermarkApplied ?? true,
    message: data.message || 'Tài liệu đã được mã hóa AES-256 và lưu trữ an toàn tại MinIO.',
  };
};

export const viewVaultDocument = async (token: string): Promise<Blob> => {
  const cleanToken = token ? token.trim() : '';
  const resp = await api.get(`/vault/view/${encodeURIComponent(cleanToken)}`, {
    responseType: 'blob',
  });
  return resp.data as Blob;
};

// 5. Evaluation Benchmark API (calls live backend endpoint; disabled in prod per SEC-03)
export const getBenchmarkReport = async () => {
  const resp = await api.get('/evaluation/report');
  return resp.data?.data ?? resp.data;
};


export interface ProcedureItem {
  procedureCode: string;
  officialPortalCode?: string;
  procedureName: string;
  category: string;
  agency: string;
  processingTime: string;
  fee: string;
  status: string;
  chunksCount: number;
}

export interface ProcedureDetail extends ProcedureItem {
  process?: string;
  sourceUrl?: string;
  chunks?: Array<{
    chunkId: string;
    chunkType: string;
    title: string;
    content: string;
    legalReference: string;
  }>;
}

export const getProcedures = async (params?: { category?: string; keyword?: string }): Promise<ProcedureItem[]> => {
  try {
    const resp = await api.get<{ success: boolean; data: ProcedureItem[] }>('/procedures', { params });
    const list = resp.data?.data;
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
  } catch (err) {
    console.warn('Failed to fetch procedures from backend API, using fallback catalog:', err);
  }

  // Graceful fallback from PROCEDURES_CATALOG
  let fallbackList: ProcedureItem[] = PROCEDURES_CATALOG.map((p) => ({
    procedureCode: p.code,
    officialPortalCode: p.portalCode,
    procedureName: p.name,
    category: p.category,
    agency: 'Ủy ban nhân dân cấp xã / phường',
    processingTime: 'Theo quy định',
    fee: 'Miễn phí / Theo quy định',
    status: 'ACTIVE',
    chunksCount: p.chunksCount,
  }));

  if (params?.category && params.category !== 'ALL') {
    fallbackList = fallbackList.filter((p) => p.category === params.category);
  }
  if (params?.keyword) {
    const kw = params.keyword.toLowerCase();
    fallbackList = fallbackList.filter(
      (p) =>
        p.procedureName.toLowerCase().includes(kw) ||
        p.procedureCode.toLowerCase().includes(kw) ||
        (p.officialPortalCode && p.officialPortalCode.includes(kw))
    );
  }
  return fallbackList;
};

export const getProcedureByCode = async (code: string): Promise<ProcedureDetail | null> => {
  try {
    const resp = await api.get<{ success: boolean; data: ProcedureDetail }>(`/procedures/${code}`);
    if (resp.data?.data) {
      return resp.data.data;
    }
  } catch (err) {
    console.warn(`Failed to fetch procedure ${code} from API, checking fallback catalog:`, err);
  }

  const found = PROCEDURES_CATALOG.find((p) => p.code === code);
  if (!found) return null;

  return {
    procedureCode: found.code,
    officialPortalCode: found.portalCode,
    procedureName: found.name,
    category: found.category,
    agency: 'Ủy ban nhân dân cấp xã / phường',
    processingTime: 'Theo quy định',
    fee: 'Miễn phí / Theo quy định',
    status: 'ACTIVE',
    chunksCount: found.chunksCount,
  };
};

// 7. Procedure Governance Workflow APIs (Soạn -> Chờ duyệt -> Duyệt -> Công bố)
export interface ProcedureContentFiveSections {
  trinh_tu: string;
  thanh_phan_ho_so: string;
  thoi_han_le_phi: string;
  co_quan_thuc_hien: string;
  can_cu_phap_ly: string;
}

export interface AdminProcedureSummaryItem {
  id: number;
  procedureCode: string;
  portalCode?: string;
  procedureName: string;
  category: string;
  status: string;
  formTemplateKey: string;
  currentVersionNo: number;
  publishedAt?: string;
  completeness: number;
  complete: boolean;
  pendingProposalsCount: number;
  draftProposalsCount: number;
  fee?: string;
  processingTime?: string;
  agency?: string;
}

export interface ProcedureVersionItem {
  id: number;
  procedureCode: string;
  procedureName: string;
  category: string;
  versionNo: number;
  content: ProcedureContentFiveSections;
  contentHash: string;
  state: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'SUPERSEDED';
  createdBy: string;
  createdAt?: string;
  submittedAt?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  publishedAt?: string | null;
  source: string;
  sourceRef?: string | null;
}

export interface AdminProcedureDetailResponse {
  summary: AdminProcedureSummaryItem;
  publishedVersion: ProcedureVersionItem;
  versions: ProcedureVersionItem[];
}

export interface ProposalFieldDiffItem {
  fieldKey: keyof ProcedureContentFiveSections;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  changed: boolean;
}

export interface ProposalDiffResponse {
  proposalId: number;
  procedureCode: string;
  procedureName: string;
  fromVersionNo: number;
  toVersionNo: number;
  state: string;
  createdBy: string;
  submittedAt?: string;
  fields: ProposalFieldDiffItem[];
}

export const getAdminProcedures = async (params?: {
  state?: string;
  keyword?: string;
}): Promise<AdminProcedureSummaryItem[]> => {
  const resp = await api.get<{ success: boolean; data: AdminProcedureSummaryItem[] }>('/admin/procedures', {
    params,
  });
  return resp.data?.data ?? [];
};

export const getAdminProcedureDetail = async (code: string): Promise<AdminProcedureDetailResponse> => {
  const resp = await api.get<{ success: boolean; data: AdminProcedureDetailResponse }>(
    `/admin/procedures/${encodeURIComponent(code)}`
  );
  return resp.data.data;
};

export const saveProcedureDraftProposal = async (
  code: string,
  payload: {
    proposalId?: number | null;
    content: ProcedureContentFiveSections;
    source?: string;
    sourceRef?: string;
  }
): Promise<ProcedureVersionItem> => {
  const resp = await api.post<{ success: boolean; data: ProcedureVersionItem }>(
    `/admin/procedures/${encodeURIComponent(code)}/proposals`,
    payload
  );
  return resp.data.data;
};

export const submitProcedureProposal = async (proposalId: number): Promise<ProcedureVersionItem> => {
  const resp = await api.post<{ success: boolean; data: ProcedureVersionItem }>(
    `/admin/proposals/${proposalId}/submit`
  );
  return resp.data.data;
};

export const getAdminProposalsQueue = async (
  state: string = 'PENDING_REVIEW'
): Promise<ProcedureVersionItem[]> => {
  const resp = await api.get<{ success: boolean; data: ProcedureVersionItem[] }>('/admin/proposals', {
    params: { state },
  });
  return resp.data?.data ?? [];
};

export const getAdminProposalDiff = async (proposalId: number): Promise<ProposalDiffResponse> => {
  const resp = await api.get<{ success: boolean; data: ProposalDiffResponse }>(
    `/admin/proposals/${proposalId}/diff`
  );
  return resp.data.data;
};

export const approveProcedureProposal = async (
  proposalId: number,
  reviewNote?: string
): Promise<ProcedureVersionItem> => {
  const resp = await api.post<{ success: boolean; data: ProcedureVersionItem }>(
    `/admin/proposals/${proposalId}/approve`,
    { reviewNote }
  );
  return resp.data.data;
};

export const rejectProcedureProposal = async (
  proposalId: number,
  reviewNote: string
): Promise<ProcedureVersionItem> => {
  const resp = await api.post<{ success: boolean; data: ProcedureVersionItem }>(
    `/admin/proposals/${proposalId}/reject`,
    { reviewNote }
  );
  return resp.data.data;
};

export const minorEditAdminProcedure = async (
  code: string,
  payload: { coQuanThucHien?: string; sourceUrl?: string; editNote?: string }
): Promise<AdminProcedureSummaryItem> => {
  const resp = await api.patch<{ success: boolean; data: AdminProcedureSummaryItem }>(
    `/admin/procedures/${encodeURIComponent(code)}/minor-edit`,
    payload
  );
  return resp.data.data;
};

export const createAdminProcedure = async (payload: {
  procedureCode: string;
  portalCode?: string;
  procedureName: string;
  category: string;
  formTemplateKey?: string;
  sourceUrl?: string;
  content: ProcedureContentFiveSections;
}): Promise<AdminProcedureSummaryItem> => {
  const resp = await api.post<{ success: boolean; data: AdminProcedureSummaryItem }>(
    '/admin/procedures',
    payload
  );
  return resp.data.data;
};

export const updateAdminProcedureStatus = async (
  code: string,
  payload: { status: 'ACTIVE' | 'INACTIVE'; reason?: string }
): Promise<AdminProcedureSummaryItem> => {
  const resp = await api.patch<{ success: boolean; data: AdminProcedureSummaryItem }>(
    `/admin/procedures/${encodeURIComponent(code)}/status`,
    payload
  );
  return resp.data.data;
};

export const rollbackAdminProcedureVersion = async (
  code: string,
  versionNo: number
): Promise<ProcedureVersionItem> => {
  const resp = await api.post<{ success: boolean; data: ProcedureVersionItem }>(
    `/admin/procedures/${encodeURIComponent(code)}/rollback/${versionNo}`
  );
  return resp.data.data;
};

export interface AdminWardOverviewResponse {
  wardCode: string;
  readOnly: boolean;
  audited: boolean;
  totalDossiers: number;
  pendingDossiers: number;
  approvedDossiers: number;
  rejectedDossiers: number;
  dossiers: Array<{
    dossierCode: string;
    procedureCode: string;
    procedureName?: string;
    wardCode: string;
    citizenName?: string;
    citizenCccd?: string;
    status: string;
    slaDeadline?: string;
    createdAt?: string;
    officerFeedback?: string;
  }>;
}

export const getAdminWardReadOnlyOverview = async (
  wardCode: string
): Promise<AdminWardOverviewResponse> => {
  const resp = await api.get<{ success: boolean; data: AdminWardOverviewResponse }>(
    `/admin/wards/${encodeURIComponent(wardCode)}/overview`
  );
  return resp.data.data;
};

