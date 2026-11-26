import { describe, expect, it, vi } from 'vitest';
import { flushOfflineIncidentQueue } from '../api/offlineSyncManager';
import {
  classifyIncidentSyncError,
  getIncidentSyncStatusMeta,
} from '../core/incidentSyncHistory';
import { executeIncidentSubmission } from '../core/incidentSubmitter';
import {
  deleteIncidentSyncHistory,
  enqueueOfflineIncident,
  getIncidentSyncHistory,
  getOfflineIncidentQueue,
  removeOfflineIncident,
} from '../storage/sqliteDb';

describe('TASK-055: Mobile Incident Sync History & Ordered Flush', () => {
  it('hiển thị đúng đủ 5 nhãn trạng thái đồng bộ phản ánh hiện trường', () => {
    expect(getIncidentSyncStatusMeta('WAITING_NETWORK').label).toBe('Chờ mạng');
    expect(getIncidentSyncStatusMeta('SENDING').label).toBe('Đang gửi');
    expect(getIncidentSyncStatusMeta('RETRY_NEEDED').label).toBe('Cần thử lại');
    expect(getIncidentSyncStatusMeta('EDIT_REQUIRED').label).toBe('Cần chỉnh sửa');
    expect(getIncidentSyncStatusMeta('ACCEPTED').label).toBe('Đã tiếp nhận');
  });

  it('phân tách lỗi mạng (RETRY_NEEDED) và lỗi vị trí / kiểm định dữ liệu HTTP 422 (EDIT_REQUIRED)', () => {
    const netErr = classifyIncidentSyncError(new Error('Network request failed'));
    expect(netErr.syncStatus).toBe('RETRY_NEEDED');
    expect(netErr.category).toBe('NETWORK');

    const locErr = classifyIncidentSyncError({
      response: { status: 422, data: { message: 'Tọa độ nằm ngoài địa bàn Tỉnh An Giang' } },
    });
    expect(locErr.syncStatus).toBe('EDIT_REQUIRED');
    expect(locErr.category).toBe('LOCATION_OR_VALIDATION');
  });

  it('lưu biên nhận report_code + target_ward_name TRƯỚC KHI xóa ảnh tạm khi flush thành công', async () => {
    const queuedRow = await enqueueOfflineIncident(
      {
        category: 'ROAD_DAMAGE',
        title: 'Hư hỏng mặt đường / Ổ gà nguy hiểm',
        description: 'Mặt đường sụt lún nguy hiểm cần xử lý gấp tại Long Xuyên.',
        addressText: 'Đường Trần Hưng Đạo, Phường Long Xuyên',
        reporterPhone: '0918234567',
        latitude: 10.383965,
        longitude: 105.426716,
        wardCode: 'AG_P_LONGXUYEN',
        wardName: 'Phường Long Xuyên',
        locationSource: 'GPS',
      },
      ['file:///docs/offline_incident_photos/test_inc_photo.jpg']
    );

    const callOrder: string[] = [];
    const uploadPhotoApi = vi.fn().mockResolvedValue({
      photoKey: 'AG_P_LONGXUYEN__20261126_test.jpg',
      viewUrl: '/api/v1/issues/officer/photos/test.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 50000,
      exifStripped: true,
    });
    const submitApi = vi.fn().mockResolvedValue({
      reportCode: 'RPT-20261126-LX01',
      clusterCode: 'CLU-LX-2026-01',
      category: 'ROAD_DAMAGE',
      clusterReportCount: 1,
      targetWardCode: 'AG_P_LONGXUYEN',
      targetWardName: 'Phường Long Xuyên',
    });

    const spyHistory: any[] = [];
    const upsertHistory = vi.fn(async (row) => {
      callOrder.push('upsertHistory');
      spyHistory.push(row);
    });
    const cleanupPhotos = vi.fn(async () => {
      callOrder.push('cleanupPhotos');
    });

    try {
      const res = await flushOfflineIncidentQueue({
        localId: queuedRow.local_id,
        uploadPhotoApi,
        submitApi,
        cleanupPhotos,
        upsertHistory,
      });

      expect(res.syncedCount).toBe(1);
      expect(callOrder).toEqual(['upsertHistory', 'cleanupPhotos']);
      expect(spyHistory[0].sync_status).toBe('ACCEPTED');
      expect(spyHistory[0].report_code).toBe('RPT-20261126-LX01');
      expect(spyHistory[0].target_ward_name).toBe('Phường Long Xuyên');
      expect((await getOfflineIncidentQueue()).some((r) => r.local_id === queuedRow.local_id)).toBe(false);
    } finally {
      await removeOfflineIncident(queuedRow.local_id);
      await deleteIncidentSyncHistory(queuedRow.local_id);
    }
  });

  it('giữ nguyên lịch sử mã phản ánh và UBND thụ lý khi mở lại ứng dụng sau khi hàng đợi đã trống', async () => {
    const queuedRow = await enqueueOfflineIncident({
      category: 'ENVIRONMENT',
      title: 'Rác thải tồn đọng / Ô nhiễm môi trường',
      description: 'Tồn đọng rác thải sinh hoạt chưa thu gom gây mùi hôi.',
      addressText: 'Phường Bình Đức, Tỉnh An Giang',
      reporterPhone: '0918234567',
      latitude: 10.405,
      longitude: 105.412,
      wardCode: 'AG_P_BINHDUC',
      wardName: 'Phường Bình Đức',
      locationSource: 'GPS',
    });

    try {
      const submitApi = vi.fn().mockResolvedValue({
        reportCode: 'RPT-BD-2026-08',
        clusterCode: 'CLU-BD-08',
        category: 'ENVIRONMENT',
        clusterReportCount: 1,
        targetWardCode: 'AG_P_BINHDUC',
        targetWardName: 'Phường Bình Đức',
      });

      await flushOfflineIncidentQueue({ localId: queuedRow.local_id, submitApi });

      expect((await getOfflineIncidentQueue()).some((r) => r.local_id === queuedRow.local_id)).toBe(false);

      const history = await getIncidentSyncHistory();
      const saved = history.find((h) => h.local_id === queuedRow.local_id);
      expect(saved).toBeDefined();
      expect(saved?.sync_status).toBe('ACCEPTED');
      expect(saved?.report_code).toBe('RPT-BD-2026-08');
      expect(saved?.target_ward_name).toBe('Phường Bình Đức');
    } finally {
      await removeOfflineIncident(queuedRow.local_id);
      await deleteIncidentSyncHistory(queuedRow.local_id);
    }
  });

  it('lỗi 422 từ máy chủ khi gửi phản ánh gắn trạng thái EDIT_REQUIRED (Cần chỉnh sửa) thay vì RETRY_NEEDED', async () => {
    const submitApi = vi.fn().mockRejectedValue({
      response: { status: 422, data: { message: 'Vị trí tọa độ không hợp lệ trên địa bàn' } },
    });

    const outcome = await executeIncidentSubmission(
      {
        category: 'FLOODING',
        description: 'Đoạn đường ngập nước cục bộ sau mưa lớn kéo dài.',
        addressText: 'Phường Long Xuyên, Tỉnh An Giang',
        reporterPhone: '0918234567',
        latitude: 10.383965,
        longitude: 105.426716,
        fallbackWardCode: 'AG_P_LONGXUYEN',
        locationSource: 'GPS',
      },
      { submitApi }
    );

    expect(outcome.success).toBe(false);
    expect(outcome.mode).toBe('VALIDATION_FAILED');
    const history = await getIncidentSyncHistory();
    const editItem = history.find((h) => h.sync_status === 'EDIT_REQUIRED');
    expect(editItem).toBeDefined();
    expect(editItem?.error_category).toBe('LOCATION_OR_VALIDATION');
    if (editItem) {
      await deleteIncidentSyncHistory(editItem.local_id);
    }
  });
});
