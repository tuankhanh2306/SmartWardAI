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

export interface AgentStep {
  stepIndex: number;
  toolName: string;
  label: string;
  success: boolean;
  latencyMs: number;
}

export interface AgentActionCard {
  type: 'OPEN_PREFILLED_FORM' | 'DOSSIER_STATUS' | 'WARD_ANALYTICS' | string;
  title: string;
  subtitle?: string;
  payload: Record<string, unknown>;
}

export interface AgentChatResponse {
  answer: string;
  role: string;
  steps: AgentStep[];
  actionCards: AgentActionCard[];
  citations: LegalCitation[];
  abstained: boolean;
  fallbackUsed: boolean;
  budgetExhausted: boolean;
  injectionBlocked?: boolean;
  traceId?: string;
  totalLatencyMs: number;
  disclaimer?: string;
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
  agentSteps?: AgentStep[];
  agentActionCards?: AgentActionCard[];
  traceId?: string;
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

export interface ExtractedFormOcrFields {
  fullName?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  cccdNumber?: string | null;
  issueDate?: string | null;
  issuePlace?: string | null;
  permanentAddress?: string | null;
  phoneNumber?: string | null;
  childFullName?: string | null;
  childDob?: string | null;
  childGender?: string | null;
  childEthnicity?: string | null;
  childBirthPlace?: string | null;
  motherFullName?: string | null;
  fatherFullName?: string | null;
  birthCertNumber?: string | null;
  birthCertIssueDate?: string | null;
  hospitalName?: string | null;
  hasRedSeal?: boolean | null;
  ocrStatus?: string | null;
  readabilityStatus?: string | null;
  readabilityReason?: string | null;
  detectedDocumentType?: string | null;
  isBlankTemplate?: boolean | null;
  rawTextExcerpt?: string | null;
  overallConfidence?: number | null;
  fieldConfidences?: Record<string, number>;
}

export interface FormImagePrecheckResponse {
  submissionCode?: string;
  formType?: string;
  valid: boolean;
  overallConfidence?: number;
  extractedFields?: ExtractedFormOcrFields;
  summaryMessage?: string;
  ocrStatus?: 'COMPLETED' | 'UNAVAILABLE' | string;
  readabilityStatus?: 'CLEAR' | 'BLURRY' | 'TOO_DARK' | 'GLARE' | 'CROPPED' | 'UNREADABLE' | 'NOT_EVALUATED' | string;
  readabilityReason?: string | null;
  detectedDocumentType?: string | null;
  isBlankTemplate?: boolean | null;
  matchedFieldCount?: number | null;
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
  requestedSupplementItems?: string[];
  supplementedAt?: string | null;
  supplementCount?: number;
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
  addressText?: string;
  locationSource?: string;
  locationAccuracyM?: number;
  wardCode?: string;
  wardName?: string;
  photoUrls?: string[];
  photoCount?: number;
  createdAt: string;
  lastReportAt: string;
}

export interface HitlGrayZoneItemDto {
  id: string;
  question: string;
  maxSimilarity: number;
  suggestedAnswer: string;
  status: 'PENDING' | 'APPROVED' | string;
  createdAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  approvedAnswer?: string;
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

// ============================================================================
// 7. Ward Registry API (TASK-024) & Push Notifications (TASK-023)
// ============================================================================

export interface WardApiDto {
  code: string;
  name: string;
  type: 'Phường' | 'Xã' | 'Thị trấn' | 'Đặc khu';
  area?: string;
  province: string;
  officeAddress: string;
  phoneNumber?: string;
  lat: number;
  lon: number;
  workingHours?: string;
  onlineServices?: string[];
  boundary?: [number, number][];
  coordSource?: 'official_gis' | 'osm' | 'manual_verified' | 'unverified';
  accuracyNote?: string;
}

export interface WardListApiResponse {
  totalCount: number;
  source: string;
  updatedAt: string;
  wards: WardApiDto[];
}

export interface RegisterPushDeviceRequest {
  expoPushToken: string;
  platform: 'ios' | 'android' | 'web';
  wardCode?: string;
  dossierCode?: string;
  deviceLabel?: string;
}

export interface RegisterPushDeviceResponse {
  registered: boolean;
  deviceId: number;
  platform: string;
  wardCode?: string;
  dossierCode?: string;
  updatedAt: string;
}

export interface OfficerLoginResponse {
  token?: string;
  accessToken?: string;
  tokenType?: string;
  expiresAtEpochSec?: number;
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
