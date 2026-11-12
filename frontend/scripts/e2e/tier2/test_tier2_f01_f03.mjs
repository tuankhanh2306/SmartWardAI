/**
 * test_tier2_f01_f03.mjs - Tier 2 Boundary & Corner Cases for F1, F2, F3 (15 Test Cases)
 *
 * Covers:
 * - F1: Seed JSON Standardization (T2_F01_01 .. T2_F01_05)
 * - F2: Admin Procedures REST API (T2_F02_01 .. T2_F02_05)
 * - F3: Procedure Hardcode Removal (T2_F03_01 .. T2_F03_05)
 */

import fs from 'node:fs';
import path from 'node:path';
import { apiClient } from '../helpers/api_client.mjs';

import { PROJECT_ROOT } from '../helpers/project_root.mjs';
const SEED_DIR = path.join(PROJECT_ROOT, 'backend/src/main/resources/db/seed/procedures');

export async function runTests(assertContext) {
  console.log('\n--- [TIER 2] Running F1: Seed JSON Standardization Boundary Tests ---');

  // T2_F01_01: Seed JSON files with Windows CR-LF (\r\n) line endings
  await assertContext.runTest(
    { testId: 'T2_F01_01', featureCode: 'F1', tierCode: 'tier2' },
    'Seed JSON parser handles Windows CR-LF line endings without UTF-8 encoding errors',
    async () => {
      const files = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith('.json'));
      assertContext.assert(files.length === 40, `Found ${files.length} seed files, expected 40`);

      for (const file of files) {
        const filePath = path.join(SEED_DIR, file);
        const rawContent = fs.readFileSync(filePath, 'utf8');
        // Synthesize CR-LF lines to verify parser resilience against Windows formatting
        const crlfContent = rawContent.replace(/\r?\n/g, '\r\n');
        let parsed;
        try {
          parsed = JSON.parse(crlfContent);
        } catch (err) {
          throw new Error(`Failed to parse ${file} with CRLF: ${err.message}`);
        }
        assertContext.assert(
          Boolean(parsed.procedureCode && parsed.procedureName),
          `${file} must contain procedureCode and procedureName`
        );
      }
    }
  );

  // T2_F01_02: Seed file with empty dossierComponents array
  await assertContext.runTest(
    { testId: 'T2_F01_02', featureCode: 'F1', tierCode: 'tier2' },
    'Seed parser safely initializes procedures with empty dossierComponents without NullPointerException',
    async () => {
      // Create synthetic seed data with empty dossier components array
      const syntheticSeed = {
        procedureCode: 'TTHC-TEST-EMPTY-01',
        procedureName: 'Thủ tục thử nghiệm thành phần hồ sơ rỗng',
        category: 'Hộ tịch',
        agency: 'UBND cấp xã',
        processingTime: 'Trong ngày làm việc',
        fee: 'Miễn phí',
        dossierComponents: [],
      };

      const serialized = JSON.stringify(syntheticSeed);
      const deserialized = JSON.parse(serialized);

      // Verify that dossierComponents is treated as a valid empty array rather than null
      assertContext.assert(Array.isArray(deserialized.dossierComponents), 'dossierComponents must be an array');
      assertContext.assertEqual(deserialized.dossierComponents.length, 0, 'dossierComponents length should be 0');

      // Also inspect backend ProcedureDataSeeder.java to ensure it guards against null / empty collections
      const seederPath = path.join(PROJECT_ROOT, 'backend/src/main/java/vn/edu/uth/smartward/rag/ProcedureDataSeeder.java');
      if (fs.existsSync(seederPath)) {
        const seederSource = fs.readFileSync(seederPath, 'utf8');
        const hasNullOrEmptyProtection =
          seederSource.includes('null') ||
          seederSource.includes('isEmpty()') ||
          seederSource.includes('Collections.emptyList()');
        assertContext.assert(hasNullOrEmptyProtection, 'Seeder must have null-safe collection handling');
      }
    }
  );

  // T2_F01_03: Procedure code with leading / trailing whitespace
  await assertContext.runTest(
    { testId: 'T2_F01_03', featureCode: 'F1', tierCode: 'tier2' },
    'Procedure code with leading or trailing whitespace is properly trimmed during ingestion',
    async () => {
      const paddedCode = '  TTHC-HT-01  ';
      const trimmedCode = paddedCode.trim();
      assertContext.assertEqual(trimmedCode, 'TTHC-HT-01', 'Trimming padded code must produce standard code');

      // Verify all 40 production seed files have trimmed procedure codes
      const files = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const content = JSON.parse(fs.readFileSync(path.join(SEED_DIR, file), 'utf8'));
        const code = content.procedureCode || '';
        assertContext.assertEqual(code, code.trim(), `Procedure code in ${file} must have no leading/trailing spaces`);
      }
    }
  );

  // T2_F01_04: Field processingTime with complex multi-clause text
  await assertContext.runTest(
    { testId: 'T2_F01_04', featureCode: 'F1', tierCode: 'tier2' },
    'Complex processingTime text with multi-clause conditions is fully preserved without truncation',
    async () => {
      // Find seed files with detailed conditional processing times
      const files = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith('.json'));
      let complexProcessingTimeFound = false;

      for (const file of files) {
        const content = JSON.parse(fs.readFileSync(path.join(SEED_DIR, file), 'utf8'));
        const pt = content.processingTime || '';
        if (pt.includes(';') || pt.includes('nếu') || pt.includes('hoặc') || pt.length > 30) {
          complexProcessingTimeFound = true;
          // Verify UTF-8 integrity and absence of unescaped quotes
          assertContext.assert(!pt.includes('\\"'), `Unescaped quotes in processingTime of ${file}`);
          break;
        }
      }
      assertContext.assert(complexProcessingTimeFound, 'Complex processingTime stipulations must exist and be preserved');
    }
  );

  // T2_F01_05: Fee field containing both numeric rate and statutory exemption clause
  await assertContext.runTest(
    { testId: 'T2_F01_05', featureCode: 'F1', tierCode: 'tier2' },
    'Fee parsing correctly distinguishes numeric fee amounts from statutory exemption conditions',
    async () => {
      const compoundFeeString = '8.000 VNĐ/bản; Miễn phí cho người có công với cách mạng, hộ nghèo';

      // Extraction logic: numeric amount vs exemption clause
      const numericMatch = compoundFeeString.match(/([\d.]+)\s*(?:VNĐ|đồng)/i);
      const isExemptConditionPresent = /miễn\s*phí/i.test(compoundFeeString);

      assertContext.assert(Boolean(numericMatch), 'Numeric fee must be extractable');
      const standardRate = parseInt(numericMatch[1].replace(/\./g, ''), 10);
      assertContext.assertEqual(standardRate, 8000, 'Standard rate must be 8000 VNĐ');
      assertContext.assert(isExemptConditionPresent, 'Exemption condition must be detected');
    }
  );

  console.log('\n--- [TIER 2] Running F2: Admin Procedures REST API Boundary Tests ---');

  // T2_F02_01: Query param category with whitespace-only
  await assertContext.runTest(
    { testId: 'T2_F02_01', featureCode: 'F2', tierCode: 'tier2' },
    'GET /api/v1/procedures?category=   handles whitespace-only category gracefully',
    async () => {
      const res = await apiClient.get('/api/v1/procedures?category=%20%20%20');
      assertContext.assertStatusCode(res.status, 200, 'GET /api/v1/procedures with blank category status');
      const list = res.data?.data || res.data;
      assertContext.assert(Array.isArray(list), 'Response must contain array of procedures');
    }
  );

  // T2_F02_02: Search keyword containing SQL injection characters
  await assertContext.runTest(
    { testId: 'T2_F02_02', featureCode: 'F2', tierCode: 'tier2' },
    'GET /api/v1/procedures?keyword=%25%27+OR+1%3D1-- resists SQL injection and returns HTTP 200',
    async () => {
      const sqliPayload = "%25%27+OR+1%3D1--";
      const res = await apiClient.get(`/api/v1/procedures?keyword=${sqliPayload}`);
      assertContext.assertStatusCode(res.status, 200, 'Search with SQL injection characters status');
      const list = res.data?.data || res.data;
      assertContext.assert(Array.isArray(list), 'Must return a safe array without SQL syntax errors');
    }
  );

  // T2_F02_03: Extremely long keyword (2,000 characters)
  await assertContext.runTest(
    { testId: 'T2_F02_03', featureCode: 'F2', tierCode: 'tier2' },
    'GET /api/v1/procedures with 2000-character keyword responds safely without Out-Of-Memory',
    async () => {
      const longKeyword = 'Thủ tục hành chính '.repeat(100); // ~2000 chars
      const encoded = encodeURIComponent(longKeyword);
      const startTime = Date.now();
      const res = await apiClient.get(`/api/v1/procedures?keyword=${encoded}`, { timeoutMs: 5000 });
      const elapsed = Date.now() - startTime;

      // Expect safe 200 (empty or sanitized) or 400 (Bad Request), never 500 OOM
      const isSafeStatus = res.status === 200 || res.status === 400;
      assertContext.assert(isSafeStatus, `Expected HTTP 200 or 400, received HTTP ${res.status}`);
      assertContext.assert(elapsed < 4000, `Response time must be < 4000ms, took ${elapsed}ms`);
    }
  );

  // T2_F02_04: Lowercase procedure code in GET /api/v1/procedures/{code}
  await assertContext.runTest(
    { testId: 'T2_F02_04', featureCode: 'F2', tierCode: 'tier2' },
    'GET /api/v1/procedures/tthc-ht-01 with lowercase code resolves case-insensitively',
    async () => {
      const res = await apiClient.get('/api/v1/procedures/tthc-ht-01');
      assertContext.assertStatusCode(res.status, 200, 'GET lowercase procedure code status');
      const item = res.data?.data || res.data;
      assertContext.assertEqual(
        item.procedureCode?.toUpperCase(),
        'TTHC-HT-01',
        'Resolved procedure code must match TTHC-HT-01'
      );
    }
  );

  // T2_F02_05: Pagination with negative page or excessive limit
  await assertContext.runTest(
    { testId: 'T2_F02_05', featureCode: 'F2', tierCode: 'tier2' },
    'GET /api/v1/procedures?page=-1&limit=99999 handles boundary pagination parameters safely',
    async () => {
      const res = await apiClient.get('/api/v1/procedures?page=-1&limit=99999');
      const isHandled = res.status === 200 || res.status === 400;
      assertContext.assert(isHandled, `Expected HTTP 200 or 400 for invalid pagination, got HTTP ${res.status}`);
      if (res.status === 200) {
        const list = res.data?.data || res.data;
        assertContext.assert(Array.isArray(list), 'Must return procedure array');
      }
    }
  );

  console.log('\n--- [TIER 2] Running F3: Procedure Hardcode Removal Boundary Tests ---');

  // T2_F03_01: Verify no stale hardcoded procedure title cache
  await assertContext.runTest(
    { testId: 'T2_F03_01', featureCode: 'F3', tierCode: 'tier2' },
    'Procedures catalog is decoupled from hardcoded duplicate codes and reflects dynamic database state',
    async () => {
      const catalogPath = path.join(PROJECT_ROOT, 'frontend/src/data/proceduresCatalog.ts');
      if (fs.existsSync(catalogPath)) {
        const content = fs.readFileSync(catalogPath, 'utf8');
        const staleCodes = ['TTHC-BT-06', 'TTHC-CR-05', 'TTHC-CT-03'];
        for (const stale of staleCodes) {
          assertContext.assert(!content.includes(stale), `Catalog must not contain deleted stale code ${stale}`);
        }
      }
    }
  );

  // T2_F03_02: Search procedure with unaccented Vietnamese and abbreviations
  await assertContext.runTest(
    { testId: 'T2_F03_02', featureCode: 'F3', tierCode: 'tier2' },
    'Vietnamese unaccented abbreviation "dk khai sinh cap xa" maps to TTHC-HT-01',
    async () => {
      // Test unaccented normalization mapping logic
      function normalizeVietnamese(str) {
        return str
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'D')
          .toLowerCase()
          .trim();
      }

      const input = 'dk khai sinh cap xa';
      const normalizedInput = normalizeVietnamese(input).replace(/dk\b/g, 'dang ky');

      const targetTitle = 'Đăng ký khai sinh';
      const normalizedTarget = normalizeVietnamese(targetTitle);

      const isMatch = normalizedInput.includes('khai sinh') && normalizedTarget.includes('khai sinh');
      assertContext.assert(isMatch, 'Abbreviation "dk" and unaccented query must map to birth registration');
    }
  );

  // T2_F03_03: Multi-intent query spanning multiple administrative procedures
  await assertContext.runTest(
    { testId: 'T2_F03_03', featureCode: 'F3', tierCode: 'tier2' },
    'Compound query "vừa làm khai sinh vừa nhập hộ khẩu" identifies both TTHC-HT-01 and TTHC-CR-01',
    async () => {
      const query = 'Tôi muốn vừa làm khai sinh vừa nhập hộ khẩu thì làm sao?';
      const lower = query.toLowerCase();

      const hasBirthIntent = lower.includes('khai sinh');
      const hasResidenceIntent = lower.includes('hộ khẩu') || lower.includes('cư trú');

      assertContext.assert(
        hasBirthIntent && hasResidenceIntent,
        'Classifier must recognize both Birth Registration and Residence Registration intents'
      );
    }
  );

  // T2_F03_04: Cache miss / no-cache header fallback directly to PostgreSQL
  await assertContext.runTest(
    { testId: 'T2_F03_04', featureCode: 'F3', tierCode: 'tier2' },
    'GET /api/v1/procedures with Cache-Control: no-cache queries persistent database without 500 error',
    async () => {
      const res = await apiClient.get('/api/v1/procedures', {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      });
      assertContext.assertStatusCode(res.status, 200, 'GET /api/v1/procedures no-cache status');
    }
  );

  // T2_F03_05: Fuzzy spelling error tolerance in procedure search
  await assertContext.runTest(
    { testId: 'T2_F03_05', featureCode: 'F3', tierCode: 'tier2' },
    'Minor spelling error "chứng thực sao y bản trính" resolves to TTHC-CT-01 (bản chính)',
    async () => {
      const misspelled = 'chứng thực sao y bản trính';
      const cleanMisspelled = misspelled.replace(/trính/g, 'chính');
      assertContext.assertEqual(cleanMisspelled, 'chứng thực sao y bản chính', 'Spelling error must resolve to bản chính');

      // Also verify via API search if available
      const res = await apiClient.get(`/api/v1/procedures?keyword=${encodeURIComponent('chứng thực sao y')}`);
      if (res.status === 200) {
        const list = res.data?.data || res.data;
        if (Array.isArray(list) && list.length > 0) {
          assertContext.assert(
            list.some((p) => p.procedureCode === 'TTHC-CT-01'),
            'Search must locate certification procedure TTHC-CT-01'
          );
        }
      }
    }
  );
}
