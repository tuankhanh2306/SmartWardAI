import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// 1. Legal RAG Types & API
export interface LegalCitation {
  chunkCode: string;
  procedureCode: string;
  procedureName: string;
  title: string;
  legalReference: string;
  content: string;
  relevanceScore: number;
}

export interface RagResponse {
  answer: string;
  abstained: boolean;
  abstentionReason?: string;
  maxSimilarity: number;
  appliedThreshold: number;
  citations: LegalCitation[];
  cached: boolean;
  responseTimeMs: number;
  disclaimer: string;
}

export const askLegalRag = async (query: string, topK: number = 3): Promise<RagResponse> => {
  const resp = await api.post<RagResponse>('/rag/ask', { query, topK });
  return resp.data;
};

// 2. Form Precheck Types & API
export interface FieldValidation {
  fieldName: string;
  providedValue: string;
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
  confidenceScore: number;
}

export interface FormPrecheckResponse {
  submissionId: string;
  procedureCode: string;
  overallValid: boolean;
  fieldValidations: FieldValidation[];
  warnings: string[];
  processedAt: string;
  processingTimeMs: number;
}

export const precheckForm = async (data: {
  procedureCode: string;
  formType: string;
  citizenCccd: string;
  fullName: string;
  dateOfBirth: string;
  cccdIssueDate: string;
  address: string;
  formData: Record<string, string>;
}): Promise<FormPrecheckResponse> => {
  const resp = await api.post<FormPrecheckResponse>('/forms/precheck', data);
  return resp.data;
};

// 3. Triage & Incident Reporting Types & API
export interface IssueCluster {
  id: string;
  clusterCode: string;
  category: string;
  centroidLatitude: number;
  centroidLongitude: number;
  title: string;
  descriptionSummary: string;
  status: string;
  reportCount: number;
  createdAt: string;
  lastReportAt: string;
}

export interface IssueReportResponse {
  reportId: string;
  clusterId: string;
  clusterCode: string;
  category: string;
  assignedAction: 'MERGED_INTO_EXISTING_CLUSTER' | 'NEW_CLUSTER_CREATED';
  similarityWithClusterCentroid: number;
  totalReportsInCluster: number;
  message: string;
}

export const reportIssue = async (data: {
  category: string;
  latitude: number;
  longitude: number;
  addressText: string;
  rawDescription: string;
  reporterPhone?: string;
}): Promise<IssueReportResponse> => {
  const resp = await api.post<IssueReportResponse>('/issues/report', data);
  return resp.data;
};

export const getIssueClusters = async (): Promise<IssueCluster[]> => {
  const resp = await api.get<IssueCluster[]>('/issues/clusters');
  return resp.data;
};

// 4. Zero-Trust Document Vault Types & API
export interface VaultUploadResponse {
  documentId: string;
  oneTimeToken: string;
  viewUrl: string;
  tokenExpiresInSeconds: number;
  watermarkText: string;
  message: string;
}

export const uploadVaultDocument = async (formData: FormData): Promise<VaultUploadResponse> => {
  const resp = await api.post<VaultUploadResponse>('/vault/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp.data;
};

export const viewVaultDocument = async (token: string): Promise<Blob> => {
  const resp = await api.get(`/vault/view/${token}`, {
    responseType: 'blob',
  });
  return resp.data;
};

// 5. Evaluation Benchmark API
export const getBenchmarkReport = async () => {
  const resp = await api.get('/evaluation/report');
  return resp.data;
};

export default api;
