import { describe, expect, it } from 'vitest';
import {
  computeResponsiveMetrics,
  getOfficeOpenStatus,
} from '../theme/responsiveMetrics';
import { COLORS } from '../theme/tokens';

describe('responsive — Tối ưu giao diện cho mọi dạng điện thoại & đồng bộ màu Frontend', () => {
  it('đồng bộ chính xác bảng màu Citizen Crimson/Ivory & Officer Navy từ Frontend', () => {
    expect(COLORS.citizenCrimson).toBe('#B90E23');
    expect(COLORS.citizenIvory).toBe('#F7EEDF');
    expect(COLORS.citizenIvoryBorder).toBe('#E5D4B3');
    expect(COLORS.officerNavy).toBe('#0F2942');
    expect(COLORS.primary).toBe('#00796B');
  });

  it('tối ưu điện thoại siêu nhỏ (iPhone SE / Android mini 320x667) dùng 1 cột & ẩn phụ đề tránh cắt chữ', () => {
    const m = computeResponsiveMetrics(320, 667, 'A');
    expect(m.sizeClass).toBe('tiny');
    expect(m.isTinyPhone).toBe(true);
    expect(m.bentoColumns).toBe(1);
    expect(m.showHeaderSubtitle).toBe(false);
    expect(m.showCompactFontLabel).toBe(true);
    expect(m.tabLabelFontSize).toBeLessThan(10);
  });

  it('tối ưu Android Compact (360x800) dùng 2 cột Bento và nhãn cỡ chữ gọn', () => {
    const m = computeResponsiveMetrics(360, 800, 'A');
    expect(m.sizeClass).toBe('compact');
    expect(m.isCompactPhone).toBe(true);
    expect(m.bentoColumns).toBe(2);
    expect(m.showHeaderSubtitle).toBe(true);
    expect(m.showCompactFontLabel).toBe(true);
  });

  it('tối ưu iPhone 14/15/16 (390x844) và Pro Max (430x932) hiển thị đầy đủ nhãn Header', () => {
    const iphone = computeResponsiveMetrics(390, 844, 'A');
    expect(iphone.sizeClass).toBe('standard');
    expect(iphone.bentoColumns).toBe(2);
    expect(iphone.showCompactFontLabel).toBe(false);

    const proMax = computeResponsiveMetrics(430, 932, 'A+');
    expect(proMax.sizeClass).toBe('large');
    expect(proMax.bentoColumns).toBe(2);
    expect(proMax.horizontalPadding).toBeGreaterThan(iphone.horizontalPadding);
  });

  it('tự động chuyển sang 1 cột rộng rãi khi người cao tuổi bật cỡ chữ A++ trên mọi điện thoại', () => {
    const elderly = computeResponsiveMetrics(390, 844, 'A++');
    expect(elderly.bentoColumns).toBe(1);
    expect(elderly.showHeaderSubtitle).toBe(false);
  });

  it('tính chính xác trạng thái giờ tiếp dân hành chính (T2-T6, 07:00-11:00 & 13:00-17:00)', () => {
    // Thứ 4 lúc 09:30 -> Đang tiếp dân
    const openMorning = getOfficeOpenStatus(new Date(2026, 10, 18, 9, 30));
    expect(openMorning.isOfficeOpen).toBe(true);
    expect(openMorning.statusLabel).toBe('Đang tiếp dân');

    // Thứ 4 lúc 12:00 (nghỉ trưa) -> Ngoài giờ
    const lunch = getOfficeOpenStatus(new Date(2026, 10, 18, 12, 0));
    expect(lunch.isOfficeOpen).toBe(false);

    // Chủ nhật lúc 09:00 -> Ngoài giờ
    const sunday = getOfficeOpenStatus(new Date(2026, 10, 15, 9, 0));
    expect(sunday.isOfficeOpen).toBe(false);
  });
});
