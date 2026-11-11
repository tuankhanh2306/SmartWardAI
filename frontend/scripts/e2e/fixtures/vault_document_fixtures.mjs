/**
 * vault_document_fixtures.mjs - Zero-Trust Vault & OCR Synthetic Fixtures
 *
 * Provides minimal valid binary file payloads (PNG, PDF), mock One-Time Token (OTT)
 * fixtures, and synthetic OCR cross-check payloads.
 */

// 1x1 transparent PNG (67 bytes)
export const SAMPLE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Minimal Valid PDF Document RFC 3200 (288 bytes)
export const SAMPLE_PDF_BASE64 =
  'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA0NQo+PgpzdHJlYW0KQVQvRjEgMTIgVGYKODAgNzIwIFRECihoZWxsbyBzbWFydHdhcmQpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTYgMDAwMDAgbiAKMDAwMDAwMDExMSAwMDAwIG4gCjAwMDAwMDAyMTIgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA1Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgoyODgKJSVFT0YK';

export function createSampleFileBuffer(type = 'png') {
  const base64 = type === 'pdf' ? SAMPLE_PDF_BASE64 : SAMPLE_PNG_BASE64;
  return Buffer.from(base64, 'base64');
}

export const VAULT_OTT_FIXTURES = {
  VALID_ACTIVE_TOKEN: 'OTT_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  EXPIRED_TOKEN: 'OTT_expired_87654321-dcba-10fe-5432-10fedcba9876',
  CONSUMED_TOKEN_410_GONE: 'OTT_consumed_11112222-3333-4444-5555-666677778888',
  MALFORMED_TOKEN: 'NOT_A_VALID_OTT_TOKEN',
};

export const OCR_CROSS_CHECK_FIXTURES = {
  BIRTH_CERTIFICATE_MATCH: {
    documentType: 'GIAY_CHUNG_SINH',
    extractedFields: {
      childFullName: 'NGUYỄN MINH KHANG',
      birthDate: '2026-11-01',
      motherFullName: 'LÊ THỊ BÍCH NGỌC',
      hospitalName: 'Bệnh viện Sản - Nhi An Giang',
    },
    confidence: 0.985,
    status: 'MATCH',
  },

  BIRTH_CERTIFICATE_CONFLICT_DOB: {
    documentType: 'GIAY_CHUNG_SINH',
    extractedFields: {
      childFullName: 'NGUYỄN MINH KHANG',
      birthDate: '2026-11-05', // Conflict with declaration
      motherFullName: 'LÊ THỊ BÍCH NGỌC',
    },
    confidence: 0.975,
    status: 'CONFLICT',
    conflictField: 'birthDate',
  },

  BIRTH_CERTIFICATE_CONFLICT_MOTHER: {
    documentType: 'GIAY_CHUNG_SINH',
    extractedFields: {
      childFullName: 'NGUYỄN MINH KHANG',
      birthDate: '2026-11-01',
      motherFullName: 'NGUYỄN THỊ HOA', // Conflict with declaration mother
    },
    confidence: 0.965,
    status: 'CONFLICT',
    conflictField: 'motherFullName',
  },

  DISABILITY_CERTIFICATE_MATCH: {
    documentType: 'GIAY_XAC_NHAN_KHUYET_TAT',
    extractedFields: {
      fullName: 'NGUYỄN VĂN AN',
      disabilityLevel: 'DAC_BIET_NANG',
      certNumber: 'GCN-KT-2025-01',
    },
    confidence: 0.99,
    status: 'MATCH',
  },

  LAND_CERTIFICATE_WARNING_ABBREVIATION: {
    documentType: 'GCN_QSD_DAT',
    extractedFields: {
      parcelNumber: '123',
      mapSheetNumber: '45',
      streetName: 'Đ. Lê Duẩn', // Abbreviation warning vs 'Đường Lê Duẩn'
    },
    confidence: 0.88,
    status: 'WARNING',
    warningReason: 'STREET_NAME_ABBREVIATION_DETECTED',
  },
};
