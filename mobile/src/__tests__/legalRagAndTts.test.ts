import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AN_GIANG_40_PROCEDURES,
  evaluateOfflineLegalRag,
  evaluateRagGuardrailState,
  matchesProcedureFilter,
  resolveCoreFormTypeForProcedure,
} from '../core/legalKnowledgeBase';
import {
  buildOfficialTemplateHtml,
  getTemplateFileDescriptor,
} from '../core/templateExporter';
import {
  getCachedProcedures,
  upsertCachedProcedures,
} from '../storage/sqliteDb';

describe('legalRagAndTts — Chặng M2 (40 TTHC, Guardrail θ=0.78, Template Export & No-Print)', () => {
  it('có đủ đúng 40 Thủ tục hành chính cấp xã Tỉnh An Giang 2026 (không trùng mã)', () => {
    expect(AN_GIANG_40_PROCEDURES).toHaveLength(40);
    const uniqueCodes = new Set(AN_GIANG_40_PROCEDURES.map((p) => p.procedureCode));
    expect(uniqueCodes.size).toBe(40);
  });

  it('đồng bộ và đọc lại 40 TTHC từ lớp lưu đệm sqliteDb', async () => {
    await upsertCachedProcedures(AN_GIANG_40_PROCEDURES);
    const cached = await getCachedProcedures();
    expect(cached).toHaveLength(40);
    expect(cached.some((p) => p.procedure_code === 'TTHC-CR-01')).toBe(true);
  });

  it('lọc chính xác 6 nhóm thủ tục trên thanh Chips', () => {
    expect(AN_GIANG_40_PROCEDURES.filter((p) => matchesProcedureFilter(p, 'ALL'))).toHaveLength(40);
    expect(
      AN_GIANG_40_PROCEDURES.filter((p) => matchesProcedureFilter(p, 'CU_TRU')).length
    ).toBeGreaterThanOrEqual(8);
    expect(
      AN_GIANG_40_PROCEDURES.filter((p) => matchesProcedureFilter(p, 'HO_TICH')).length
    ).toBeGreaterThanOrEqual(13);
    expect(
      AN_GIANG_40_PROCEDURES.filter((p) => matchesProcedureFilter(p, 'CHUNG_THUC')).length
    ).toBeGreaterThanOrEqual(5);
    expect(
      AN_GIANG_40_PROCEDURES.filter((p) => matchesProcedureFilter(p, 'BAO_TRO')).length
    ).toBeGreaterThanOrEqual(6);
    expect(
      AN_GIANG_40_PROCEDURES.filter((p) => matchesProcedureFilter(p, 'DAT_DAI_XD')).length
    ).toBeGreaterThanOrEqual(5);
  });

  it('trả lời đầy đủ 5 phần chuẩn hóa với S_max >= 0.78 và gắn đúng tên UBND xã/phường', () => {
    const res = evaluateOfflineLegalRag(
      'Thủ tục đăng ký thường trú mẫu CT01 cần những giấy tờ gì?',
      'Đặc khu Phú Quốc',
      'Số 04 Đường 30/4, Phường Dương Đông, Đặc khu Phú Quốc'
    );

    expect(res.abstained).toBe(false);
    expect(res.maxSimilarity).toBeGreaterThanOrEqual(0.78);
    expect(res.citations[0]?.procedureCode).toBe('TTHC-CR-01');
    expect(res.fiveParts?.receivingOffice).toContain('Đặc khu Phú Quốc');
    expect(res.answer).toContain('1. THÀNH PHẦN HỒ SƠ');
    expect(res.answer).toContain('5. CĂN CỨ PHÁP LÝ TRÍCH DẪN (2026)');
  });

  it('chốt chặn từ chối an toàn (Abstention) đối với câu hỏi ngoài phạm vi 40 TTHC cấp xã', () => {
    const trap = evaluateOfflineLegalRag(
      'Hôm nay thời tiết ở Phú Quốc thế nào và cách xin visa Mỹ?',
      'Đặc khu Phú Quốc'
    );

    expect(trap.abstained).toBe(true);
    expect(trap.maxSimilarity).toBeLessThan(0.42);
    expect(trap.hitlQueued).toBe(false);

    const state = evaluateRagGuardrailState(trap);
    expect(state.isAbstained).toBe(true);
    expect(state.isHitlGrayZone).toBe(false);
  });

  it('nhận diện chính xác vùng xám HITL (0.42 <= S_max < 0.78) và gắn cờ thẩm định cán bộ', () => {
    const grayZone = evaluateRagGuardrailState({
      answer: 'Cần xác minh thêm quy định địa phương',
      abstained: true,
      maxSimilarity: 0.61,
      appliedThreshold: 0.78,
      citations: [],
      cached: false,
      responseTimeMs: 42,
      disclaimer: '',
    });

    expect(grayZone.isAbstained).toBe(true);
    expect(grayZone.isHitlGrayZone).toBe(true);
    expect(grayZone.badgeText).toContain('0.61');
  });

  it('ánh xạ chính xác mã thủ tục sang 4 nhóm biểu mẫu sơ duyệt (CT01, TK-KS, TK-KH, TK-BTXH)', () => {
    expect(resolveCoreFormTypeForProcedure('TTHC-CR-01')).toBe('CT01');
    expect(resolveCoreFormTypeForProcedure('TTHC-HT-01')).toBe('TK-KS');
    expect(resolveCoreFormTypeForProcedure('TTHC-HT-02')).toBe('TK-KH');
    expect(resolveCoreFormTypeForProcedure('TTHC-HT-11')).toBe('TK-KH');
    expect(resolveCoreFormTypeForProcedure('TTHC-BT-01')).toBe('TK-BTXH');
    expect(resolveCoreFormTypeForProcedure('TTHC-XD-01')).toBeNull();
  });

  it('sinh đúng tên file .DOCX/.PDF chuẩn NĐ 30/2020/NĐ-CP và nội dung HTML gắn tên xã/phường', () => {
    const desc = getTemplateFileDescriptor('TTHC-CR-01', 'Đăng ký thường trú', 'CT01');
    expect(desc.docxFileName).toBe('Mau_CT01_CuTru_Chuan_ND30.docx');
    expect(desc.pdfFileName).toBe('Mau_CT01_CuTru_Chuan_ND30.pdf');

    const html = buildOfficialTemplateHtml(desc, 'Phường Long Xuyên');
    expect(html).toContain('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
    expect(html).toContain('Phường Long Xuyên');
    expect(html).toContain('TTHC-CR-01');
  });

  it('MOB-2.8: Kỷ luật cấm tuyệt đối nút In (window.print / Print.printAsync) trên Tab 1 & Exporter', () => {
    const filesToAudit = [
      resolve(__dirname, '../screens/LegalRagChatScreen.tsx'),
      resolve(__dirname, '../components/TemplateDownloadBar.tsx'),
      resolve(__dirname, '../core/templateExporter.ts'),
    ];

    for (const filePath of filesToAudit) {
      const code = readFileSync(filePath, 'utf8');
      expect(code).not.toMatch(/window\.print\s*\(/);
      expect(code).not.toMatch(/Print\.printAsync\s*\(/);
    }
  });
});
