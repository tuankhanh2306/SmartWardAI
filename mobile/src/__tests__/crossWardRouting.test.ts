import { describe, expect, it } from 'vitest';
import {
  AN_GIANG_WARDS,
  calculateHaversineMeters,
  DEFAULT_WARD,
  findNearestWardByGps,
  resolveWardFromLocationBox,
  searchAnGiangWards,
} from '../core/angiangWards';
import { isJwtExpired } from '../storage/secureAuthStorage';

describe('crossWardRouting — Danh mục 96 Xã/Phường An Giang & Định tuyến Liên xã', () => {
  it('chứa đầy đủ đúng 96 đơn vị hành chính tỉnh An Giang (14 Phường, 79 Xã, 3 Đặc khu)', () => {
    expect(AN_GIANG_WARDS).toHaveLength(96);

    const phuongs = AN_GIANG_WARDS.filter((w) => w.type === 'Phường');
    const xas = AN_GIANG_WARDS.filter((w) => w.type === 'Xã');
    const dacKhus = AN_GIANG_WARDS.filter((w) => w.type === 'Đặc khu');

    expect(phuongs).toHaveLength(14);
    expect(xas).toHaveLength(79);
    expect(dacKhus).toHaveLength(3);
    expect(dacKhus.map((d) => d.code).sort()).toEqual([
      'AG_DK_KIENHAI',
      'AG_DK_PHUQUOC',
      'AG_DK_THOCHAU',
    ]);
  });

  it('mặc định đơn vị hành chính là Phường Long Xuyên (AG_P_LONGXUYEN)', () => {
    expect(DEFAULT_WARD.code).toBe('AG_P_LONGXUYEN');
    expect(DEFAULT_WARD.name).toBe('Phường Long Xuyên');
  });

  it('tính khoảng cách Haversine chính xác trong phạm vi sai số mét', () => {
    const samePoint = calculateHaversineMeters(10.383965, 105.426716, 10.383965, 105.426716);
    expect(samePoint).toBe(0);

    // ~20m north of Long Xuyên center
    const nearby = calculateHaversineMeters(10.383965, 105.426716, 10.384145, 105.426716);
    expect(nearby).toBeGreaterThan(15);
    expect(nearby).toBeLessThan(25);
  });

  it('định vị GPS tìm chính xác Đặc khu Phú Quốc và Phường Long Xuyên', () => {
    const pq = findNearestWardByGps(10.2175, 103.961);
    expect(pq.ward.code).toBe('AG_DK_PHUQUOC');
    expect(pq.distanceMeters).toBeLessThan(100);

    const lx = findNearestWardByGps(10.3839, 105.4267);
    expect(lx.ward.code).toBe('AG_P_LONGXUYEN');
    expect(lx.distanceMeters).toBeLessThan(100);
  });

  it('ưu tiên 1 theo tên xã/phường trong ô địa chỉ (TEXT_BOX) trước tọa độ GPS (GPS_COORDS)', () => {
    // Tọa độ đứng ở Long Xuyên nhưng công dân nhập địa chỉ ở Đặc khu Phú Quốc
    const res = resolveWardFromLocationBox(
      'Số 12 Đường 30/4, Đặc khu Phú Quốc, Tỉnh An Giang',
      10.383965,
      105.426716,
      'AG_P_LONGXUYEN'
    );
    expect(res.matchedBy).toBe('TEXT_BOX');
    expect(res.ward.code).toBe('AG_DK_PHUQUOC');
  });

  it('rơi về ưu tiên 2 theo tọa độ GPS khi ô địa chỉ không ghi rõ tên xã/phường', () => {
    const res = resolveWardFromLocationBox(
      'Ngã tư đường lớn gần cầu bị ngập nặng',
      9.967815,
      104.841524,
      'AG_P_LONGXUYEN'
    );
    expect(res.matchedBy).toBe('GPS_COORDS');
    expect(res.ward.code).toBe('AG_DK_KIENHAI');
  });

  it('tìm kiếm không dấu tiếng Việt và lọc theo loại đơn vị chính xác', () => {
    const byKeyword = searchAnGiangWards('phu quoc', 'Đặc khu');
    expect(byKeyword).toHaveLength(1);
    expect(byKeyword[0].code).toBe('AG_DK_PHUQUOC');

    const byLongXuyen = searchAnGiangWards('long xuyen', 'Phường');
    expect(byLongXuyen.some((w) => w.code === 'AG_P_LONGXUYEN')).toBe(true);
  });

  it('BUG-019 & TASK-049: đứng tại 10.003544, 105.086358 (Bệnh viện Bình An, Rạch Giá) phải định tuyến đúng về AG_P_RACHGIA', () => {
    const gps = findNearestWardByGps(10.003544, 105.086358);
    expect(gps.ward.code).toBe('AG_P_RACHGIA');

    // Reverse geocode thiếu chữ "Phường Rạch Giá" và có tên "Bệnh viện Bình An" không được nhảy nhầm sang Xã Bình An
    const rev = resolveWardFromLocationBox(
      'Bệnh viện Bình An, Đường Phan Đình Phùng, Kiên Giang',
      10.003544,
      105.086358,
      'AG_P_LONGXUYEN'
    );
    expect(rev.ward.code).toBe('AG_P_RACHGIA');
    expect(rev.matchedBy).toBe('GPS_COORDS');

    // Đứng tại vị trí thực tế UBND Xã Bình An (Châu Thành / Tắc Cậu) phải định tuyến đúng về AG_X_BINHAN
    const binhAn = findNearestWardByGps(9.8746, 105.1328);
    expect(binhAn.ward.code).toBe('AG_X_BINHAN');
  });

  it('TASK-048: không có cặp xã/phường nào trùng tọa độ tâm (0m) trong toàn bộ 96 đơn vị An Giang', () => {
    for (let i = 0; i < AN_GIANG_WARDS.length; i++) {
      for (let j = i + 1; j < AN_GIANG_WARDS.length; j++) {
        const a = AN_GIANG_WARDS[i];
        const b = AN_GIANG_WARDS[j];
        const dist = calculateHaversineMeters(a.lat, a.lon, b.lat, b.lon);
        expect(dist, `${a.code} và ${b.code} quá gần/trùng tâm (${Math.round(dist)}m)`).toBeGreaterThan(200);
      }
    }
  });

  it('kiểm tra hết hạn JWT chính xác trong secureAuthStorage', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');

    const validJwt = `${encode({ alg: 'HS256' })}.${encode({ sub: 'CC-AG-8942', exp: futureExp })}.sig`;
    const expiredJwt = `${encode({ alg: 'HS256' })}.${encode({ sub: 'CC-AG-8942', exp: pastExp })}.sig`;

    expect(isJwtExpired(validJwt)).toBe(false);
    expect(isJwtExpired(expiredJwt)).toBe(true);
    expect(isJwtExpired('malformed-token')).toBe(true);
  });
});
