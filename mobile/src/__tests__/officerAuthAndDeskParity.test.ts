import { describe, expect, it } from 'vitest';
import {
  buildDefaultOfficerBadgeForWard,
  extractOfficerSessionToken,
  filterOfficerDossiers,
  getOfficerDossierStatusMeta,
  resolveWardNameByCode,
} from '../core/officerAuditService';
import type { OfficerDossierDto } from '../types/api.types';

describe('officerAuthAndDeskParity — Đồng bộ Đăng nhập & Bàn Cán Bộ Web <-> Mobile', () => {
  it('đọc đúng trường token từ Backend OfficerAuthController và fallback sang accessToken', () => {
    expect(
      extractOfficerSessionToken({
        token: 'eyJhbGciOiJIUzI1NiJ9.payload.sig',
        badgeId: 'CB-AG_P_LONGXUYEN',
      })
    ).toBe('eyJhbGciOiJIUzI1NiJ9.payload.sig');

    expect(
      extractOfficerSessionToken({
        accessToken: 'eyJhbGciOiJIUzI1NiJ9.legacy.sig',
      })
    ).toBe('eyJhbGciOiJIUzI1NiJ9.legacy.sig');

    expect(extractOfficerSessionToken({})).toBeNull();
    expect(extractOfficerSessionToken({ token: 'pending_sync_123' })).toBeNull();
  });

  it('sinh đúng mã thẻ mặc định theo đơn vị công tác (CB-<wardCode>) giống Web RoleGateway', () => {
    expect(buildDefaultOfficerBadgeForWard('ag_p_longxuyen')).toBe('CB-AG_P_LONGXUYEN');
    expect(buildDefaultOfficerBadgeForWard('AG_DK_PHUQUOC')).toBe('CB-AG_DK_PHUQUOC');
  });

  it('ánh xạ đúng tên tiếng Việt của 102 xã/phường/đặc khu từ wardCode', () => {
    expect(resolveWardNameByCode('AG_P_CHAUDOC')).toContain('Châu Đốc');
    expect(resolveWardNameByCode('AG_PROVINCE')).toBe('Tỉnh An Giang');
  });

  it('lọc hồ sơ theo trạng thái và tìm kiếm không dấu trên Bàn Cán Bộ Mobile', () => {
    const sample: OfficerDossierDto[] = [
      {
        id: 1,
        dossierCode: 'HS-20261127-0001',
        procedureCode: 'TTHC-HT-01',
        procedureName: 'Đăng ký khai sinh',
        wardCode: 'AG_P_LONGXUYEN',
        citizenCccd: '********1234',
        citizenName: 'NGUYỄN VĂN AN',
        status: 'SUPPLEMENTED',
        formData: {},
        createdAt: '2026-11-27T01:00:00Z',
        updatedAt: '2026-11-27T01:10:00Z',
      },
      {
        id: 2,
        dossierCode: 'HS-20261127-0002',
        procedureCode: 'TTHC-CR-01',
        procedureName: 'Đăng ký thường trú',
        wardCode: 'AG_P_LONGXUYEN',
        citizenCccd: '********5678',
        citizenName: 'TRẦN THỊ BÌNH',
        status: 'PENDING',
        formData: {},
        createdAt: '2026-11-27T01:00:00Z',
        updatedAt: '2026-11-27T01:00:00Z',
      },
    ];

    expect(filterOfficerDossiers(sample, 'SUPPLEMENTED', '')).toHaveLength(1);
    expect(filterOfficerDossiers(sample, 'ALL', 'khai sinh')).toHaveLength(1);
    expect(filterOfficerDossiers(sample, 'ALL', 'tran thi binh')).toHaveLength(1);
    expect(getOfficerDossierStatusMeta('SUPPLEMENTED').label).toBe('Vừa bổ sung');
    expect(getOfficerDossierStatusMeta('SUPPLEMENT_REQUIRED').label).toBe('Cần bổ sung');
  });
});
