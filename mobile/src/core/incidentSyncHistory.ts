/**
 * SmartWard AI Mobile — Incident Sync Status & Error Classifier (TASK-055)
 * Phân tách rõ trạng thái từng phản ánh và phân loại lỗi mạng (tự động thử lại)
 * với lỗi vị trí / kiểm định dữ liệu (cần công dân chỉnh sửa).
 */

export type IncidentSyncStatus =
  | 'WAITING_NETWORK'
  | 'SENDING'
  | 'RETRY_NEEDED'
  | 'EDIT_REQUIRED'
  | 'ACCEPTED';

export type IncidentErrorCategory = 'NETWORK' | 'LOCATION_OR_VALIDATION';

export interface IncidentSyncStatusMeta {
  status: IncidentSyncStatus;
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

export interface ClassifiedIncidentError {
  syncStatus: 'RETRY_NEEDED' | 'EDIT_REQUIRED';
  category: IncidentErrorCategory;
  userMessage: string;
}

const VALIDATION_ERROR_PATTERNS = [
  'validation_failed',
  'invalid_request',
  'out_of_bounds',
  'tọa độ',
  'toa do',
  'vị trí',
  'vi tri',
  'địa bàn',
  'dia ban',
  'ngoài phạm vi',
  'ngoai pham vi',
  'không hợp lệ',
  'khong hop le',
  'số điện thoại',
  'so dien thoai',
  'mô tả',
  'mo ta',
  'http 400',
  'http 422',
  'status code 400',
  'status code 422',
  '422 unprocessable',
];

export function extractErrorMessageAndStatus(error: unknown): {
  status?: number;
  message: string;
} {
  if (typeof error === 'string') {
    return { message: error };
  }
  if (error && typeof error === 'object') {
    const e = error as {
      message?: unknown;
      status?: unknown;
      response?: { status?: unknown; data?: { message?: unknown; errorCode?: unknown } };
    };
    const respStatus =
      typeof e.response?.status === 'number'
        ? e.response.status
        : typeof e.status === 'number'
        ? e.status
        : undefined;
    const serverMsg =
      typeof e.response?.data?.message === 'string' ? e.response.data.message : '';
    const errCode =
      typeof e.response?.data?.errorCode === 'string' ? e.response.data.errorCode : '';
    const baseMsg = typeof e.message === 'string' ? e.message : '';
    const combined = [serverMsg, errCode, baseMsg].filter(Boolean).join(' — ');
    return {
      status: respStatus,
      message: combined || 'Lỗi kết nối máy chủ',
    };
  }
  return { message: 'Lỗi kết nối máy chủ' };
}

export function classifyIncidentSyncError(error: unknown): ClassifiedIncidentError {
  const { status, message } = extractErrorMessageAndStatus(error);
  const lower = message.toLowerCase();

  if (status === 400 || status === 422 || VALIDATION_ERROR_PATTERNS.some((p) => lower.includes(p))) {
    return {
      syncStatus: 'EDIT_REQUIRED',
      category: 'LOCATION_OR_VALIDATION',
      userMessage: message,
    };
  }

  return {
    syncStatus: 'RETRY_NEEDED',
    category: 'NETWORK',
    userMessage: message || 'Chưa kết nối được máy chủ. Vui lòng thử gửi lại khi có sóng 4G/Wi-Fi.',
  };
}

export function getIncidentSyncStatusMeta(status: IncidentSyncStatus): IncidentSyncStatusMeta {
  switch (status) {
    case 'WAITING_NETWORK':
      return {
        status,
        label: 'Chờ mạng',
        bgColor: '#FEF3C7',
        borderColor: '#FCD34D',
        textColor: '#92400E',
      };
    case 'SENDING':
      return {
        status,
        label: 'Đang gửi',
        bgColor: '#DBEAFE',
        borderColor: '#93C5FD',
        textColor: '#1E40AF',
      };
    case 'RETRY_NEEDED':
      return {
        status,
        label: 'Cần thử lại',
        bgColor: '#FFEDD5',
        borderColor: '#FDBA74',
        textColor: '#9A3412',
      };
    case 'EDIT_REQUIRED':
      return {
        status,
        label: 'Cần chỉnh sửa',
        bgColor: '#FEE2E2',
        borderColor: '#FCA5A5',
        textColor: '#991B1B',
      };
    case 'ACCEPTED':
    default:
      return {
        status: 'ACCEPTED',
        label: 'Đã tiếp nhận',
        bgColor: '#DCFCE7',
        borderColor: '#86EFAC',
        textColor: '#166534',
      };
  }
}
