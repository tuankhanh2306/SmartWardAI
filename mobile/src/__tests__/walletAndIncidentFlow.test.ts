import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  executeIncidentSubmission,
  INCIDENT_CATEGORY_OPTIONS,
  validateIncidentDraft,
} from '../core/incidentSubmitter';
import {
  buildElectronicQrPassHtml,
  formatMobileSlaDeadline,
  getDossierStatusVietnamese,
  UNVERIFIED_SLA_TEXT,
} from '../core/qrPassPdfExporter';
import { flushOfflineIncidentQueue } from '../api/offlineSyncManager';
import {
  buildSmartWardPassPayload,
  enqueueOfflineIncident,
  getAllWalletQrPasses,
  getOfflineIncidentQueue,
  removeOfflineIncident,
  upsertWalletQrPass,
  type WalletQrPassRow,
} from '../storage/sqliteDb';

describe('walletAndIncidentFlow — Chặng M4 (Ví Mã QR Offline, Xuất PDF & Báo Sự Cố GPS 25m)', () => {
  it('tạo HTML Phiếu Hẹn Điện Tử Có Mã QR SVG đầy đủ thông tin và tuân thủ che mờ CCCD', () => {
    const pass: WalletQrPassRow = {
      dossier_code: 'HS-20261118-0099',
      appointment_code: 'LH-20261118-8899',
      procedure_code: 'TTHC-CR-01',
      procedure_name: 'Đăng ký thường trú (Mẫu CT01)',
      ward_code: 'AG_P_LONGXUYEN',
      ward_name: 'Phường Long Xuyên',
      citizen_name: 'NGUYỄN MINH TUẤN KHANH',
      citizen_cccd_mask: '********3490',
      citizen_last4: '3490',
      citizen_email: 'congdan@gmail.com',
      status: 'APPROVED',
      officer_feedback: 'Hồ sơ hợp lệ 100%, mời mang CCCD gốc đến Quầy số 2.',
      sla_deadline: '2026-11-25',
      qr_payload: buildSmartWardPassPayload(
        'HS-20261118-0099',
        'LH-20261118-8899',
        'AG_P_LONGXUYEN'
      ),
      synced_at: Date.now(),
    };

    const html = buildElectronicQrPassHtml(pass);
    expect(html).toContain('PHIẾU HẸN SƠ DUYỆT ĐIỆN TỬ');
    expect(html).toContain('UBND Phường Long Xuyên');
    expect(html).toContain('LH-20261118-8899');
    expect(html).toContain('********3490');
    expect(html).toContain('<svg');
    expect(html).toContain('Hồ sơ hợp lệ 100%');
    expect(getDossierStatusVietnamese('APPROVED')).toContain('Có mã hẹn QR');
  });

  it('hoạt động Offline 100% (Airplane Mode): lưu và đọc lại Phiếu hẹn QR từ sqliteDb', async () => {
    const pass: WalletQrPassRow = {
      dossier_code: 'HS-OFFLINE-2026-01',
      appointment_code: 'LH-20261118-7777',
      procedure_code: 'TTHC-HT-01',
      procedure_name: 'Đăng ký khai sinh',
      ward_code: 'AG_DK_PHUQUOC',
      ward_name: 'Đặc khu Phú Quốc',
      citizen_name: 'TRẦN THỊ MAI',
      citizen_cccd_mask: '********1234',
      citizen_last4: '1234',
      citizen_email: 'mai@gmail.com',
      status: 'APPROVED',
      officer_feedback: 'Mời nhận kết quả tại Quầy số 1.',
      sla_deadline: null,
      qr_payload: 'SMARTWARD_PASS|HS-OFFLINE-2026-01|LH-20261118-7777|AG_DK_PHUQUOC',
      synced_at: Date.now(),
    };

    await upsertWalletQrPass(pass);
    const list = await getAllWalletQrPasses();
    const found = list.find((item) => item.dossier_code === 'HS-OFFLINE-2026-01');
    expect(found).toBeDefined();
    expect(found?.appointment_code).toBe('LH-20261118-7777');
    expect(found?.qr_payload).toBe(
      'SMARTWARD_PASS|HS-OFFLINE-2026-01|LH-20261118-7777|AG_DK_PHUQUOC'
    );

    expect(formatMobileSlaDeadline(null)).toBe(UNVERIFIED_SLA_TEXT);
    const offlineHtml = buildElectronicQrPassHtml(pass);
    expect(offlineHtml).toContain(UNVERIFIED_SLA_TEXT);
    expect(offlineHtml).not.toContain('NĐ 13');
  });

  it('kiểm định đủ 5 danh mục sự cố chuẩn Backend và chặn khi thiếu SĐT khẩn cấp hoặc mô tả < 10 ký tự', () => {
    expect(INCIDENT_CATEGORY_OPTIONS.map((c) => c.key)).toEqual([
      'ROAD_DAMAGE',
      'FLOODING',
      'LIGHTING_ELECTRICAL',
      'ENVIRONMENT',
      'ORDER_SECURITY',
    ]);

    const invalid = validateIncidentDraft({
      category: 'ROAD_DAMAGE',
      description: 'Ổ gà', // < 10 ký tự
      addressText: 'Đường Trần Hưng Đạo',
      reporterPhone: '12345', // sai SĐT 10 số VN
      latitude: 10.3839,
      longitude: 105.4267,
      fallbackWardCode: 'AG_P_LONGXUYEN',
    });

    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toHaveLength(2);

    // Chặn gửi khi vị trí vẫn ở trạng thái mặc định trụ sở xã (WARD_DEFAULT) chưa xác nhận
    const unconfirmed = validateIncidentDraft({
      category: 'ROAD_DAMAGE',
      description: 'Đoạn đường sụt lún ổ gà sâu nguy hiểm cho xe máy.',
      addressText: 'Đường Trần Hưng Đạo',
      reporterPhone: '0918234567',
      latitude: 10.3839,
      longitude: 105.4267,
      fallbackWardCode: 'AG_P_LONGXUYEN',
      locationSource: 'WARD_DEFAULT',
    });
    expect(unconfirmed.valid).toBe(false);
    expect(unconfirmed.errors[0]).toContain('chưa được xác nhận');

    // Chặn tọa độ ngoài phạm vi tỉnh An Giang (VD: Hà Nội 21.0285, 105.8542)
    const outOfProvince = validateIncidentDraft({
      category: 'ROAD_DAMAGE',
      description: 'Đoạn đường sụt lún ổ gà sâu nguy hiểm cho xe máy.',
      addressText: '',
      reporterPhone: '0918234567',
      latitude: 21.0285,
      longitude: 105.8542,
      fallbackWardCode: 'AG_P_LONGXUYEN',
      locationSource: 'PIN_DRAGGED',
    });
    expect(outOfProvince.valid).toBe(false);
    expect(outOfProvince.errors[0]).toContain('ngoài phạm vi địa bàn Tỉnh An Giang');

    // Cho phép gửi bằng tọa độ ghim ngay cả khi geocoding lỗi (addressText rỗng)
    const emptyAddressValidPin = validateIncidentDraft({
      category: 'ROAD_DAMAGE',
      description: 'Đoạn đường sụt lún ổ gà sâu nguy hiểm cho xe máy.',
      addressText: '',
      reporterPhone: '0918234567',
      latitude: 10.3839,
      longitude: 105.4267,
      fallbackWardCode: 'AG_P_LONGXUYEN',
      locationSource: 'PIN_DRAGGED',
    });
    expect(emptyAddressValidPin.valid).toBe(true);
  });

  it('tự động định tuyến liên xã theo ô địa chỉ & báo kết quả gộp cụm GPS R = 25m khi gửi Online', async () => {
    const submitApi = vi.fn().mockResolvedValue({
      reportCode: 'RPT-20261118-01',
      clusterCode: 'CLU-PQ-001',
      category: 'FLOODING',
      assignedAction: 'MERGED_INTO_EXISTING_CLUSTER',
      mergedIntoExistingCluster: true,
      reportCountInCluster: 3,
      spatialRadiusMeters: 25.0,
      targetWardCode: 'AG_DK_PHUQUOC',
      targetWardName: 'Đặc khu Phú Quốc',
    });

    const outcome = await executeIncidentSubmission(
      {
        category: 'FLOODING',
        description: 'Ngập nước sâu 40cm sau mưa lớn trước cổng chợ Dương Đông gây kẹt xe.',
        addressText: 'Đường 30/4, Đặc khu Phú Quốc, Tỉnh An Giang',
        reporterPhone: '0918234567',
        // Standing GPS in Long Xuyen, but address explicitly points to Phu Quoc -> TEXT_BOX wins
        latitude: 10.383965,
        longitude: 105.426716,
        fallbackWardCode: 'AG_P_LONGXUYEN',
      },
      { submitApi }
    );

    expect(outcome.success).toBe(true);
    expect(outcome.mode).toBe('SUBMITTED_ONLINE');
    expect(outcome.matchedBy).toBe('TEXT_BOX');
    expect(outcome.targetWardCode).toBe('AG_DK_PHUQUOC');
    expect(outcome.message).toContain('CLU-PQ-001');
    expect(outcome.message).toContain('25m');
    expect(submitApi).toHaveBeenCalledTimes(1);
    expect(submitApi.mock.calls[0][0].wardCode).toBe('AG_DK_PHUQUOC');
  });

  it('tự động đưa báo cáo vào hàng đợi SQLite offline_incident_queue khi mất sóng 4G', async () => {
    const offlineApi = vi.fn().mockRejectedValue(new Error('Network Offline'));

    const outcome = await executeIncidentSubmission(
      {
        category: 'LIGHTING_ELECTRICAL',
        description: 'Đèn đường bị tắt toàn tuyến dài 200m rất tối và nguy hiểm ban đêm.',
        addressText: 'Đường Nguyễn Trãi, Phường Long Xuyên',
        reporterPhone: '0987654321',
        latitude: 10.383965,
        longitude: 105.426716,
        fallbackWardCode: 'AG_P_LONGXUYEN',
      },
      { submitApi: offlineApi }
    );

    expect(outcome.success).toBe(true);
    expect(outcome.mode).toBe('QUEUED_OFFLINE');
    expect(outcome.offlineLocalId).toBeDefined();

    const queue = await getOfflineIncidentQueue();
    const queuedRow = queue.find((r) => r.local_id === outcome.offlineLocalId);
    expect(queuedRow).toBeDefined();
    expect(JSON.parse(queuedRow!.payload_json).category).toBe('LIGHTING_ELECTRICAL');

    if (outcome.offlineLocalId) {
      await removeOfflineIncident(outcome.offlineLocalId);
    }
  });

  it('MOB-4.4: Kỷ luật cấm tuyệt đối hộp thoại in (Print.printAsync / window.print) trên Ví Mã QR & PDF Exporter', () => {
    const files = [
      resolve(__dirname, '../core/qrPassPdfExporter.ts'),
      resolve(__dirname, '../components/ElectronicQrPassCard.tsx'),
      resolve(__dirname, '../screens/DossierAndQrPassScreen.tsx'),
    ];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src).not.toMatch(/window\.print\s*\(/);
      expect(src).not.toMatch(/Print\.printAsync\s*\(/);
    }
  });

  it('gửi Idempotency-Key nhất quán theo local_id khi flushOfflineIncidentQueue retry sau rớt mạng', async () => {
    const queuedRow = await enqueueOfflineIncident({
      category: 'FLOODING',
      title: 'Ngập úng tuyến đường trung tâm',
      description: 'Mặt đường ngập sâu 30cm gây chết máy nhiều xe vào giờ tan tầm.',
      addressText: 'Đường Hai Bà Trưng, Phường Long Xuyên, Tỉnh An Giang',
      reporterPhone: '0918234567',
      latitude: 10.383965,
      longitude: 105.426716,
      wardCode: 'AG_P_LONGXUYEN',
      wardName: 'Phường Long Xuyên',
      locationSource: 'GPS',
    });

    try {
      const submitApi = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          reportCode: 'RPT-RETRY-01',
          clusterCode: 'CLUST-LX-99',
          newCluster: true,
          category: 'FLOODING',
          clusterReportCount: 1,
          message: 'Đã tiếp nhận',
        });

      const firstFlush = await flushOfflineIncidentQueue({ submitApi });
      expect(firstFlush.failedCount).toBe(1);
      expect(firstFlush.syncedCount).toBe(0);

      const queueAfterFirst = await getOfflineIncidentQueue();
      const pending = queueAfterFirst.find((r) => r.local_id === queuedRow.local_id);
      expect(pending).toBeDefined();
      expect(pending?.retry_count).toBe(1);

      const secondFlush = await flushOfflineIncidentQueue({ submitApi });
      expect(secondFlush.syncedCount).toBe(1);
      expect(secondFlush.failedCount).toBe(0);

      const queueAfterSecond = await getOfflineIncidentQueue();
      expect(queueAfterSecond.some((r) => r.local_id === queuedRow.local_id)).toBe(false);

      expect(submitApi).toHaveBeenCalledTimes(2);
      expect(submitApi.mock.calls[0][1]).toEqual({ idempotencyKey: queuedRow.local_id });
      expect(submitApi.mock.calls[1][1]).toEqual({ idempotencyKey: queuedRow.local_id });
    } finally {
      await removeOfflineIncident(queuedRow.local_id);
    }
  });

  it('TASK-030 & TASK-032: lưu ảnh hiện trường vào hàng đợi Offline -> flush upload không nhân đôi khi retry và dọn file tạm', async () => {
    const persistedUris = [
      'file:///docs/offline_incident_photos/inc_1.jpg',
      'file:///docs/offline_incident_photos/inc_2.jpg',
    ];
    const persistPhotos = vi.fn().mockResolvedValue(persistedUris);
    const offlineUploadApi = vi.fn().mockRejectedValue(new Error('Network Offline'));
    const offlineSubmitApi = vi.fn().mockRejectedValue(new Error('Network Offline'));

    // 1. Offline capture & submit -> saves durable local photo URIs into SQLite queue
    const outcome = await executeIncidentSubmission(
      {
        category: 'ROAD_DAMAGE',
        description: 'Mặt đường nứt gãy và sụt lún sâu 25cm ngay trước cổng trường học.',
        addressText: 'Đường Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang',
        reporterPhone: '0918234567',
        latitude: 10.383965,
        longitude: 105.426716,
        fallbackWardCode: 'AG_P_LONGXUYEN',
        locationSource: 'GPS',
        localPhotoUris: ['file:///cache/raw_1.jpg', 'file:///cache/raw_2.jpg'],
      },
      { submitApi: offlineSubmitApi, uploadPhotoApi: offlineUploadApi, persistPhotos }
    );

    expect(outcome.success).toBe(true);
    expect(outcome.mode).toBe('QUEUED_OFFLINE');
    expect(persistPhotos).toHaveBeenCalledTimes(1);
    const localId = outcome.offlineLocalId!;

    try {
      const queued = (await getOfflineIncidentQueue()).find((r) => r.local_id === localId);
      expect(queued).toBeDefined();
      expect(JSON.parse(queued!.photo_uris_json || '[]')).toEqual(persistedUris);

      // 2. First flush: photo 1 succeeds, photo 2 fails mid-way -> checkpoint keeps photo 1 key so retry NEVER duplicates photo 1!
      const uploadPhotoApi = vi
        .fn()
        .mockResolvedValueOnce({
          photoKey: 'AG_P_LONGXUYEN__20261125_11111111-1111-1111-1111-111111111111.jpg',
          viewUrl: '/api/v1/issues/officer/photos/AG_P_LONGXUYEN__20261125_11111111-1111-1111-1111-111111111111.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 120000,
          exifStripped: true,
        })
        .mockRejectedValueOnce(new Error('4G dropped on photo 2'))
        .mockResolvedValueOnce({
          photoKey: 'AG_P_LONGXUYEN__20261125_22222222-2222-2222-2222-222222222222.jpg',
          viewUrl: '/api/v1/issues/officer/photos/AG_P_LONGXUYEN__20261125_22222222-2222-2222-2222-222222222222.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 110000,
          exifStripped: true,
        });
      const submitApi = vi.fn().mockResolvedValue({
        reportCode: 'RPT-PHOTO-SYNC-01',
        clusterCode: 'CLUST-LX-88',
        category: 'ROAD_DAMAGE',
        clusterReportCount: 1,
      });
      const cleanupPhotos = vi.fn().mockResolvedValue(undefined);

      const firstTry = await flushOfflineIncidentQueue({ uploadPhotoApi, submitApi, cleanupPhotos });
      expect(firstTry.failedCount).toBe(1);
      expect(submitApi).not.toHaveBeenCalled();

      // 3. Second flush: only photo 2 is uploaded (total 3 calls, NOT 4!), report submits with both photoKeys, temp files cleaned up
      const secondTry = await flushOfflineIncidentQueue({ uploadPhotoApi, submitApi, cleanupPhotos });
      expect(secondTry.syncedCount).toBe(1);
      expect(secondTry.failedCount).toBe(0);
      expect(uploadPhotoApi).toHaveBeenCalledTimes(3);
      expect(submitApi).toHaveBeenCalledTimes(1);
      expect(submitApi.mock.calls[0][0].photoKeys).toEqual([
        'AG_P_LONGXUYEN__20261125_11111111-1111-1111-1111-111111111111.jpg',
        'AG_P_LONGXUYEN__20261125_22222222-2222-2222-2222-222222222222.jpg',
      ]);
      expect(submitApi.mock.calls[0][1]).toEqual({ idempotencyKey: localId });
      expect(cleanupPhotos).toHaveBeenCalledTimes(2);
      expect((await getOfflineIncidentQueue()).some((r) => r.local_id === localId)).toBe(false);
    } finally {
      await removeOfflineIncident(localId);
    }
  });
});
