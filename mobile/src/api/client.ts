/**
 * SmartWard AI Mobile — Tầng Giao tiếp REST API (Axios Client)
 * Khớp 100% với Spring Boot Controllers trên smartward-backend (:8080)
 */

import axios, { type AxiosInstance } from 'axios';
import { DEFAULT_WARD } from '../core/angiangWards';
import {
  clearOfficerSession,
  getOfficerToken,
  isJwtExpired,
} from '../storage/secureAuthStorage';
import type {
  ApiResponse,
  CivicReportRequest,
  CivicReportResponse,
  DossierSubmissionResponse,
  DossierTrackingRequest,
  DossierTrackingResponse,
  IssueClusterDto,
  OfficerChangePinRequest,
  OfficerDossierDto,
  OfficerLoginRequest,
  OfficerLoginResponse,
  OfficerPrincipal,
  OfficerReviewRequest,
  ProcedureDetail,
  ProcedureItem,
  RagAskRequest,
  RagAskResponse,
  StructuredFormPrecheckRequest,
  StructuredFormPrecheckResponse,
  SubmitDossierRequest,
  VaultUploadResponse,
} from '../types/api.types';

export const DEFAULT_EMULATOR_API_BASE_URL = 'http://10.0.2.2:8080/api/v1';
export const RAG_EXPLICIT_TIMEOUT_MS = 12000;
export const RAG_AUTO_LAN_TIMEOUT_MS = 4500;
export const PROCEDURES_SYNC_TIMEOUT_MS = 4000;
export const RAG_CIRCUIT_COOLDOWN_MS = 45000;

export function extractLanHostFromExpoUri(rawUri?: string | null): string | null {
  if (!rawUri || typeof rawUri !== 'string') return null;
  const trimmed = rawUri.trim();
  if (!trimmed) return null;

  const withoutScheme = trimmed.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
  const authority = withoutScheme.split('/')[0]?.split('?')[0]?.trim() || '';
  const hostWithoutPort = authority.replace(/:\d+$/, '').trim();
  const normalized = hostWithoutPort.toLowerCase();
  if (!normalized) return null;

  if (
    normalized === '10.0.2.2' ||
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '0.0.0.0' ||
    normalized.endsWith('.exp.direct') ||
    normalized.endsWith('.ngrok.io') ||
    normalized.endsWith('.ngrok-free.app') ||
    normalized.endsWith('.trycloudflare.com')
  ) {
    return null;
  }

  return hostWithoutPort;
}

export function resolveDefaultApiBaseUrl(
  customWindow?: { location?: { hostname?: string } },
  options?: { hostUri?: string | null }
): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL.replace(/\/+$/, '');
  }

  // When running on Web / Mobile Safari over LAN or localhost
  const globalRef = globalThis as unknown as {
    window?: { location?: { hostname?: string } };
    location?: { hostname?: string };
  };
  const targetWindow = customWindow || globalRef.window || globalRef;
  if (targetWindow && targetWindow.location?.hostname) {
    const host = targetWindow.location.hostname;
    if (host && host !== '10.0.2.2') {
      return `http://${host}:8080/api/v1`;
    }
  }

  // When running inside Expo Go over Wi-Fi LAN
  const lanHost = extractLanHostFromExpoUri(options?.hostUri);
  if (lanHost) {
    return `http://${lanHost}:8080/api/v1`;
  }

  return DEFAULT_EMULATOR_API_BASE_URL;
}

const DEFAULT_API_BASE_URL = resolveDefaultApiBaseUrl();

let currentWardCode = DEFAULT_WARD.code;
let unauthorizedHandler: (() => void) | null = null;
let runtimePlatformOs = 'unknown';
let hasExplicitApiBaseUrl = Boolean(process.env.EXPO_PUBLIC_API_BASE_URL);
let ragBackendCircuitOpenUntil = 0;

export const apiClient: AxiosInstance = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export function configureRuntimeApiBaseUrl(params: {
  platformOs?: string;
  scriptUrl?: string | null;
}): string {
  runtimePlatformOs = params.platformOs || 'unknown';
  if (!process.env.EXPO_PUBLIC_API_BASE_URL && !hasExplicitApiBaseUrl && runtimePlatformOs !== 'web') {
    const lanHost = extractLanHostFromExpoUri(params.scriptUrl);
    if (lanHost) {
      apiClient.defaults.baseURL = `http://${lanHost}:8080/api/v1`;
      ragBackendCircuitOpenUntil = 0;
    }
  }
  return getApiBaseUrl();
}

export function setApiBaseUrl(url: string): void {
  const normalized = url.trim().replace(/\/+$/, '');
  if (normalized) {
    apiClient.defaults.baseURL = normalized;
    hasExplicitApiBaseUrl = true;
    resetRagBackendCircuit();
  }
}

export function getApiBaseUrl(): string {
  return String(apiClient.defaults.baseURL || DEFAULT_API_BASE_URL);
}

export function isUnreachableIosDefaultUrl(): boolean {
  return runtimePlatformOs === 'ios' && getApiBaseUrl() === DEFAULT_EMULATOR_API_BASE_URL;
}

export function shouldSkipRagOnlineCall(now = Date.now()): boolean {
  return isUnreachableIosDefaultUrl() || now < ragBackendCircuitOpenUntil;
}

export function markRagBackendNetworkFailure(now = Date.now()): void {
  ragBackendCircuitOpenUntil = now + RAG_CIRCUIT_COOLDOWN_MS;
}

export function markRagBackendSuccess(): void {
  ragBackendCircuitOpenUntil = 0;
}

export function resetRagBackendCircuit(): void {
  ragBackendCircuitOpenUntil = 0;
}

export function isNetworkOrTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const errObj = error as {
    response?: unknown;
    code?: unknown;
    message?: unknown;
    isAxiosError?: boolean;
    request?: unknown;
  };
  if (errObj.response) return false;
  if (errObj.isAxiosError) return true;

  const code = typeof errObj.code === 'string' ? errObj.code.toUpperCase() : '';
  if (
    code === 'ECONNABORTED' ||
    code === 'ERR_NETWORK' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'EHOSTUNREACH'
  ) {
    return true;
  }

  if (errObj.request) return true;
  const message = typeof errObj.message === 'string' ? errObj.message : '';
  return /network|timeout|exceeded|aborted|econn|etimedout/i.test(message);
}

export function resetRuntimeApiConfigForTests(): void {
  runtimePlatformOs = 'unknown';
  hasExplicitApiBaseUrl = Boolean(process.env.EXPO_PUBLIC_API_BASE_URL);
  ragBackendCircuitOpenUntil = 0;
  apiClient.defaults.baseURL = resolveDefaultApiBaseUrl();
}

export function setActiveWardHeader(wardCode: string): void {
  if (wardCode && wardCode.trim()) {
    currentWardCode = wardCode.trim();
  }
}

export function setOnUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

// Request Interceptor: attach Authorization Bearer token (skip protected lookup on public RAG routes) & X-Ward-Code
apiClient.interceptors.request.use(async (config) => {
  config.headers = config.headers || {};
  config.headers['X-Ward-Code'] = currentWardCode;

  const reqUrl = String(config.url || '');
  const isPublicCitizenEndpoint = reqUrl.includes('/rag/ask') || reqUrl.includes('/procedures');
  if (!isPublicCitizenEndpoint) {
    const token = await getOfficerToken();
    if (token && !isJwtExpired(token)) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

// Response Interceptor: handle 401 Unauthorized on protected routes
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || '');
    const isAuthEndpoint =
      url.includes('/auth/officer/login') || url.includes('/auth/officer/change-pin');

    if (status === 401 && !isAuthEndpoint) {
      await clearOfficerSession();
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }
    return Promise.reject(error);
  }
);

function unwrapData<T>(payload: ApiResponse<T> | T): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    (payload as ApiResponse<T>).data !== undefined
  ) {
    return (payload as ApiResponse<T>).data;
  }
  return payload as T;
}

// ============================================================================
// 1. Procedures & Legal RAG (Module 1)
// ============================================================================

export async function fetchProcedures(params?: {
  category?: string;
  keyword?: string;
}): Promise<ProcedureItem[]> {
  if (isUnreachableIosDefaultUrl()) {
    throw new Error('IOS_UNREACHABLE_DEFAULT_HOST');
  }
  const resp = await apiClient.get<ApiResponse<ProcedureItem[]>>('/procedures', {
    params,
    timeout: PROCEDURES_SYNC_TIMEOUT_MS,
  });
  const list = unwrapData(resp.data);
  return Array.isArray(list) ? list : [];
}

export async function fetchProcedureDetail(procedureCode: string): Promise<ProcedureDetail> {
  const resp = await apiClient.get<ApiResponse<ProcedureDetail>>(
    `/procedures/${encodeURIComponent(procedureCode.trim())}`
  );
  return unwrapData(resp.data);
}

export async function askLegalRag(
  request: RagAskRequest,
  options?: { bypassCircuit?: boolean; timeoutMs?: number }
): Promise<RagAskResponse> {
  if (!options?.bypassCircuit && shouldSkipRagOnlineCall()) {
    throw new Error('RAG_BACKEND_CIRCUIT_OPEN');
  }
  const timeout =
    options?.timeoutMs ??
    (hasExplicitApiBaseUrl ? RAG_EXPLICIT_TIMEOUT_MS : RAG_AUTO_LAN_TIMEOUT_MS);
  try {
    const resp = await apiClient.post<ApiResponse<RagAskResponse>>(
      '/rag/ask',
      {
        ...request,
        threshold: request.threshold ?? 0.78,
      },
      { timeout }
    );
    markRagBackendSuccess();
    return unwrapData(resp.data);
  } catch (error) {
    if (isNetworkOrTimeoutError(error)) {
      markRagBackendNetworkFailure();
    }
    throw error;
  }
}

// ============================================================================
// 2. Smart Form Precheck & Zero-Trust Vault (Modules 2 & 4)
// ============================================================================

export async function precheckStructuredForm(
  request: StructuredFormPrecheckRequest
): Promise<StructuredFormPrecheckResponse> {
  const resp = await apiClient.post<ApiResponse<StructuredFormPrecheckResponse>>(
    '/forms/precheck',
    request
  );
  return unwrapData(resp.data);
}

export async function uploadVaultDocument(formData: FormData): Promise<VaultUploadResponse> {
  const resp = await apiClient.post<ApiResponse<VaultUploadResponse>>('/vault/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrapData(resp.data);
}

export async function fetchVaultDocumentOneTime(token: string): Promise<ArrayBuffer> {
  const resp = await apiClient.get<ArrayBuffer>(
    `/vault/view/${encodeURIComponent(token.trim())}`,
    { responseType: 'arraybuffer' }
  );
  return resp.data;
}

// ============================================================================
// 3. Citizen Dossiers & Officer QR Counter Lookup
// ============================================================================

export async function submitCitizenDossier(
  request: SubmitDossierRequest
): Promise<DossierSubmissionResponse> {
  const idempotencyKey =
    request.idempotencyKey || `MOB-${Date.now()}-${request.citizenCccd.slice(-4)}`;
  const resp = await apiClient.post<ApiResponse<DossierSubmissionResponse>>(
    '/dossiers',
    { ...request, idempotencyKey },
    { headers: { 'Idempotency-Key': idempotencyKey } }
  );
  return unwrapData(resp.data);
}

export async function trackCitizenDossier(
  request: DossierTrackingRequest
): Promise<DossierTrackingResponse> {
  const resp = await apiClient.post<ApiResponse<DossierTrackingResponse>>('/dossiers/track', {
    dossierCode: request.dossierCode.trim(),
    last4Cccd: request.last4Cccd.trim(),
  });
  return unwrapData(resp.data);
}

export async function listOfficerDossiers(
  wardCode?: string,
  status?: string
): Promise<OfficerDossierDto[]> {
  const params: Record<string, string> = {};
  if (wardCode) params.wardCode = wardCode.trim();
  if (status) params.status = status.trim();
  const resp = await apiClient.get<ApiResponse<OfficerDossierDto[]>>('/dossiers/officer/list', {
    params,
  });
  const list = unwrapData(resp.data);
  return Array.isArray(list) ? list : [];
}

export async function lookupOfficerDossierByQr(code: string): Promise<OfficerDossierDto> {
  const resp = await apiClient.get<ApiResponse<OfficerDossierDto>>('/dossiers/officer/by-qr', {
    params: { code: code.trim() },
  });
  return unwrapData(resp.data);
}

export async function reviewOfficerDossier(
  dossierCode: string,
  payload: OfficerReviewRequest
): Promise<OfficerDossierDto> {
  const resp = await apiClient.put<ApiResponse<OfficerDossierDto>>(
    `/dossiers/${encodeURIComponent(dossierCode.trim())}/review`,
    payload
  );
  return unwrapData(resp.data);
}

// ============================================================================
// 4. Field Incident Reporting & 2-Phase GPS Triage (Module 3 — Verified Paths)
// ============================================================================

export async function submitCivicIncidentReport(
  request: CivicReportRequest,
  options?: { idempotencyKey?: string }
): Promise<CivicReportResponse> {
  const idempotencyKey = (options?.idempotencyKey || '').trim();
  const config = idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined;
  const resp = await apiClient.post<ApiResponse<CivicReportResponse>>(
    '/issues/report',
    request,
    config
  );
  return unwrapData(resp.data);
}

export async function fetchIssueClusters(params?: {
  wardCode?: string;
  status?: string;
}): Promise<IssueClusterDto[]> {
  const resp = await apiClient.get<ApiResponse<IssueClusterDto[]>>('/issues/clusters', { params });
  const list = unwrapData(resp.data);
  return Array.isArray(list) ? list : [];
}

export async function updateIssueClusterStatus(
  clusterCode: string,
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED',
  note?: string
): Promise<IssueClusterDto> {
  const resp = await apiClient.patch<ApiResponse<IssueClusterDto>>(
    `/issues/clusters/${encodeURIComponent(clusterCode.trim())}/status`,
    { status, note }
  );
  return unwrapData(resp.data);
}

// ============================================================================
// 5. Officer Auth (OfficerAuthController.java)
// ============================================================================

export async function loginOfficer(request: OfficerLoginRequest): Promise<OfficerLoginResponse> {
  const resp = await apiClient.post<ApiResponse<OfficerLoginResponse>>(
    '/auth/officer/login',
    request
  );
  return unwrapData(resp.data);
}

export async function fetchCurrentOfficer(): Promise<OfficerPrincipal> {
  const resp = await apiClient.get<ApiResponse<OfficerPrincipal>>('/auth/officer/me');
  return unwrapData(resp.data);
}

export async function changeOfficerPin(request: OfficerChangePinRequest): Promise<unknown> {
  const resp = await apiClient.post<ApiResponse<unknown>>('/auth/officer/change-pin', request);
  return unwrapData(resp.data);
}

export async function logoutOfficer(): Promise<void> {
  try {
    await apiClient.post('/auth/officer/logout');
  } finally {
    await clearOfficerSession();
  }
}
