/**
 * SmartWard AI Mobile — Verified Backend REST API Contracts
 * Aligned 100% with Spring Boot DTOs (vn.edu.uth.smartward.*)
 */

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp?: string;
  correlationId?: string;
}

// ============================================================================
// 1. Legal RAG & 40 Procedures (Module 1)
// ============================================================================

export interface LegalCitation {
  chunkCode: string;
  procedureCode: string;
  procedureName: string;
  title: string;
  legalReference: string;
  content: string;
  relevanceScore: number;
}

export interface RagAskRequest {
  question: string;
  wardName?: string;
  wardCode?: string;
  threshold?: number; // Default 0.78
  history?: Array<{
    sender: 'citizen' | 'bot' | 'user' | 'assistant';
    text: string;
    procedureCode?: string;
  }>;
}

export interface RagAskResponse {
  answer: string;
  abstained: boolean;
  abstentionReason?: string;
  maxSimilarity: number;
  appliedThreshold: number;
  citations: LegalCitation[];
  cached: boolean;
  responseTimeMs: number;
  disclaimer: string;
  suggestions?: string[];
  hitlQueued?: boolean;
}

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
  formType?: CoreFormType;
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

// ============================================================================
// 2. Smart Form Precheck & AI Vision Gate (Module 2)
// ============================================================================

export type CoreFormType = 'CT01' | 'TK-KS' | 'TK-KH' | 'TK-BTXH';

export interface FieldValidation {
  fieldName: string;
  providedValue: string;
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
  confidenceScore: number;
}

export interface StructuredFormPrecheckRequest {
  procedureCode: string;
  formType: CoreFormType;
  citizenCccd: string;
  fullName: string;
  dateOfBirth: string;
  gender?: string;
  cccdIssueDate?: string;
  address: string;
  qrVerified?: boolean;
  fields?: Record<string, unknown>;
  formData: Record<string, string>;
}

export interface StructuredFormPrecheckResponse {
  submissionId: string;
  procedureCode: string;
  overallValid: boolean;
  fieldValidations: FieldValidation[];
  warnings: string[];
  processedAt: string;
  processingTimeMs: number;
}

// ============================================================================
// 3. Zero-Trust Document Vault (Module 4 — Decree 13/2023/ND-CP)
// ============================================================================

export type VaultDocumentType = 'CT01_FORM' | 'CCCD_FRONT' | 'BIRTH_CERT' | 'MARRIAGE_FORM' | 'SOCIAL_ASSISTANCE_FORM';

export interface VaultUploadResponse {
  docId: string;
  documentId?: string;
  documentCode?: string;
  oneTimeToken: string;
  viewUrl: string;
  tokenExpiresInSeconds?: number;
  expiresAt?: string;
  encryptionAlgorithm?: string;
  watermarkText?: string;
  watermarkApplied: boolean;
  message?: string;
}

// ============================================================================
// 4. Citizen Dossiers & Electronic QR Appointment Pass (PostgreSQL Sync)
// ============================================================================

export type DossierStatus = 'PENDING' | 'APPROVED' | 'SUPPLEMENT_REQUIRED' | 'REJECTED';

export interface SubmitDossierRequest {
  dossierCode?: string;
  procedureCode: string;
  wardCode: string;
  citizenCccd: string;
  formData: Record<string, unknown>;
  precheckReport?: Record<string, unknown>;
  vaultDocIds?: string[];
  idempotencyKey?: string;
}

export interface DossierSubmissionResponse {
  dossierCode: string;
  procedureCode: string;
  wardCode: string;
  status: DossierStatus | string;
  slaDeadline?: string | null;
  createdAt: string;
}

export interface DossierTrackingRequest {
  dossierCode: string;
  last4Cccd: string;
}

export interface DossierTimelineEvent {
  id: number;
  dossierCode: string;
  who: string;
  fromStatus?: string;
  toStatus: string;
  reason?: string;
  createdAt: string;
}

export interface DossierTrackingResponse {
  dossierCode: string;
  procedureCode: string;
  procedureName: string;
  wardCode: string;
  citizenCccd: string; // Masked ********1234
  status: DossierStatus | string;
  slaDeadline?: string | null;
  officerFeedback?: string;
  appointmentCode?: string;
  precheckReport?: Record<string, unknown>;
  vaultDocIds?: string[];
  createdAt: string;
  updatedAt: string;
  timeline?: DossierTimelineEvent[];
}

export interface OfficerDossierDto {
  id: number | string;
  dossierCode: string;
  procedureCode: string;
  procedureName: string;
  wardCode: string;
  citizenCccd: string; // Masked ********1234
  citizenName: string;
  status: DossierStatus | string;
  slaDeadline?: string | null;
  officerFeedback?: string;
  appointmentCode?: string;
  formData: Record<string, unknown>;
  precheckReport?: Record<string, unknown>;
  vaultDocIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OfficerReviewRequest {
  status: 'APPROVED' | 'SUPPLEMENT_REQUIRED' | 'REJECTED';
  officerFeedback?: string;
  reviewStatus?: string;
  feedbackReason?: string;
  appointmentCode?: string;
}

// ============================================================================
// 5. Civic Field Incident Reporting & 2-Phase GPS Triage (Module 3)
// ============================================================================

export type IncidentCategory =
  | 'ROAD_DAMAGE'
  | 'FLOODING'
  | 'LIGHTING_ELECTRICAL'
  | 'ENVIRONMENT'
  | 'ORDER_SECURITY';

export interface CivicReportRequest {
  category: IncidentCategory;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  addressText: string;
  reporterPhone: string;
  wardCode?: string;
  wardName?: string;
  locationAccuracyM?: number;
  locationSource?: string;
  photoKeys?: string[];
}

export interface IncidentPhotoUploadResponse {
  photoKey: string;
  viewUrl: string;
  contentType: string;
  sizeBytes: number;
  exifStripped: boolean;
}

export interface CivicReportResponse {
  reportId?: string;
  reportCode?: string;
  clusterId?: string;
  clusterCode: string;
  category: string;
  assignedAction?: 'MERGED_INTO_EXISTING_CLUSTER' | 'NEW_CLUSTER_CREATED';
  mergedIntoExistingCluster?: boolean;
  reportCountInCluster?: number;
  totalReportsInCluster?: number;
  spatialRadiusMeters?: number;
  appliedRadiusMeters?: number;
  semanticSimilarity?: number;
  similarityWithClusterCentroid?: number;
  targetWardCode?: string;
  targetWardName?: string;
  message?: string;
}

export interface IssueClusterDto {
  id: string;
  clusterCode: string;
  category: string;
  centroidLatitude: number;
  centroidLongitude: number;
  title: string;
  descriptionSummary: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | string;
  reportCount: number;
  wardCode?: string;
  wardName?: string;
  photoUrls?: string[];
  photoCount?: number;
  createdAt: string;
  lastReportAt: string;
}

// ============================================================================
// 6. Officer Authentication (OfficerAuthController.java)
// ============================================================================

export interface OfficerLoginRequest {
  badgeId: string;
  pin: string;
  wardCode?: string;
}

export interface OfficerChangePinRequest {
  badgeId: string;
  currentPin: string;
  newPin: string;
  confirmPin: string;
}

export interface OfficerPrincipal {
  badgeId: string;
  fullName: string;
  role: 'OFFICER' | 'ADMIN' | string;
  wardCode: string;
  wardName: string;
  department?: string;
  mustChangePin?: boolean;
}

export interface OfficerLoginResponse {
  accessToken: string;
  tokenType?: string;
  expiresInSeconds?: number;
  expiresAt?: string;
  officer?: OfficerPrincipal;
  badgeId?: string;
  fullName?: string;
  role?: string;
  wardCode?: string;
  wardName?: string;
  mustChangePin?: boolean;
}
