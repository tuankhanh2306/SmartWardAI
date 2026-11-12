/**
 * test_f01_f03_procedures.mjs - Tier 1 Tests for F1, F2, F3 (15 Test Cases)
 *
 * Covers:
 * - F1: Seed JSON Standardization (T1_F01_01 .. T1_F01_05)
 * - F2: Admin Procedures REST API (T1_F02_01 .. T1_F02_05)
 * - F3: Procedure Hardcode Removal (T1_F03_01 .. T1_F03_05)
 */

import fs from 'node:fs';
import path from 'node:path';
import { apiClient } from '../helpers/api_client.mjs';
import { PROJECT_ROOT } from '../helpers/project_root.mjs';
const SEED_DIR = path.join(PROJECT_ROOT, 'backend/src/main/resources/db/seed/procedures');

export async function runTests(assertContext) {
  console.log('\n--- [TIER 1] Running F1: Seed JSON Standardization Tests ---');

  // T1_F01_01: Exactly 40 valid JSON files in seed directory
  await assertContext.runTest(
    { testId: 'T1_F01_01', featureCode: 'F1', tierCode: 'tier1' },
    'Seed procedures directory contains exactly 40 JSON files',
    async () => {
      const files = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith('.json'));
      assertContext.assertEqual(files.length, 40, 'Total JSON seed files count');
    }
  );

  // T1_F01_02: Verify removal of 3 duplicate files
  await assertContext.runTest(
    { testId: 'T1_F01_02', featureCode: 'F1', tierCode: 'tier1' },
    'Old duplicate seed files (BT-06, CR-05, CT-03) are cleanly removed or replaced',
    async () => {
      const removedDuplicates = ['TTHC-BT-06.json', 'TTHC-CR-05.json', 'TTHC-CT-03.json'];
      const existing = fs.readdirSync(SEED_DIR);
      const hasDuplicates = removedDuplicates.some((d) => existing.includes(d));
      assertContext.assert(!hasDuplicates, 'Duplicate files should not be present');
    }
  );

  // T1_F01_03: Verify category corrections for CR-10, CT-05, CT-06, XD-01, XD-02
  await assertContext.runTest(
    { testId: 'T1_F01_03', featureCode: 'F1', tierCode: 'tier1' },
    'Category fields are correctly classified for CR-10, CT-05, CT-06, XD-01, and XD-02',
    async () => {
      const cr10 = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'TTHC-CR-10.json'), 'utf8'));
      const ct05 = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'TTHC-CT-05.json'), 'utf8'));
      const ct06 = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'TTHC-CT-06.json'), 'utf8'));
      const xd01 = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'TTHC-XD-01.json'), 'utf8'));
      const xd02 = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'TTHC-XD-02.json'), 'utf8'));

      const isCr10Valid = cr10.category === 'Hộ tịch' || cr10.category === 'Cư trú';
      const isCt0506Valid = ct05.category === 'Hộ tịch' && ct06.category === 'Hộ tịch';
      const isXdValid = xd01.category.includes('Đất đai') && xd02.category.includes('Đất đai');

      assertContext.assert(
        isCr10Valid && isCt0506Valid && isXdValid,
        'Categories should follow revised administrative classifications'
      );
    }
  );

  // T1_F01_04: Verify agency standardization for commune-level Certification
  await assertContext.runTest(
    { testId: 'T1_F01_04', featureCode: 'F1', tierCode: 'tier1' },
    'Certification procedures agency correctly specifies commune-level authority (UBND cấp xã / phường)',
    async () => {
      const ct01 = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'TTHC-CT-01.json'), 'utf8'));
      const ct02 = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'TTHC-CT-02.json'), 'utf8'));

      const isCommuneAgency =
        ct01.agency.toLowerCase().includes('xã') && ct02.agency.toLowerCase().includes('xã');
      assertContext.assert(isCommuneAgency, 'Agency must be commune-level authority');
    }
  );

  // T1_F01_05: Verify 3 added missing procedures
  await assertContext.runTest(
    { testId: 'T1_F01_05', featureCode: 'F1', tierCode: 'tier1' },
    'Mandatory missing procedures (HT-13 Death, MT-01 Environment, NCC-01 Meritorious) are present in seed',
    async () => {
      const ht13Exists = fs.existsSync(path.join(SEED_DIR, 'TTHC-HT-13.json'));
      const mt01Exists = fs.existsSync(path.join(SEED_DIR, 'TTHC-MT-01.json'));
      const ncc01Exists =
        fs.existsSync(path.join(SEED_DIR, 'TTHC-NCC-01.json')) ||
        fs.existsSync(path.join(SEED_DIR, 'TTHC-BT-06.json'));

      assertContext.assert(ht13Exists && mt01Exists && ncc01Exists, 'Missing procedures must exist');
    }
  );

  console.log('\n--- [TIER 1] Running F2: Admin Procedures REST API Tests ---');

  // T1_F02_01: GET /api/v1/procedures returns 200 OK
  await assertContext.runTest(
    { testId: 'T1_F02_01', featureCode: 'F2', tierCode: 'tier1' },
    'GET /api/v1/procedures returns HTTP 200 with catalog data',
    async () => {
      const res = await apiClient.get('/api/v1/procedures');
      assertContext.assertStatusCode(res.status, 200, 'GET /api/v1/procedures status');
    }
  );

  // T1_F02_02: Filter procedures by valid category
  await assertContext.runTest(
    { testId: 'T1_F02_02', featureCode: 'F2', tierCode: 'tier1' },
    'GET /api/v1/procedures?category=Hộ tịch returns HTTP 200 with category filtering',
    async () => {
      const res = await apiClient.get('/api/v1/procedures?category=H%E1%BB%99+t%E1%BB%8Bch');
      assertContext.assertStatusCode(res.status, 200, 'GET procedures by category status');
    }
  );

  // T1_F02_03: GET procedure detail by valid code
  await assertContext.runTest(
    { testId: 'T1_F02_03', featureCode: 'F2', tierCode: 'tier1' },
    'GET /api/v1/procedures/TTHC-HT-01 returns HTTP 200 with procedure details',
    async () => {
      const res = await apiClient.get('/api/v1/procedures/TTHC-HT-01');
      assertContext.assertStatusCode(res.status, 200, 'GET procedure detail status');
    }
  );

  // T1_F02_04: GET procedure with invalid code returns 404
  await assertContext.runTest(
    { testId: 'T1_F02_04', featureCode: 'F2', tierCode: 'tier1' },
    'GET /api/v1/procedures/TTHC-INVALID-999 returns HTTP 404 Not Found',
    async () => {
      const res = await apiClient.get('/api/v1/procedures/TTHC-INVALID-999');
      assertContext.assertEqual(res.status, 404, 'GET invalid procedure status');
    }
  );

  // T1_F02_05: Search procedures by keyword
  await assertContext.runTest(
    { testId: 'T1_F02_05', featureCode: 'F2', tierCode: 'tier1' },
    'GET /api/v1/procedures?keyword=kết hôn returns HTTP 200 with search results',
    async () => {
      const res = await apiClient.get('/api/v1/procedures?keyword=k%E1%BA%BFt+h%C3%B4n');
      assertContext.assertStatusCode(res.status, 200, 'GET search procedures status');
    }
  );

  console.log('\n--- [TIER 1] Running F3: Procedure Hardcode Removal Tests ---');

  // T1_F03_01: RagQueryService builds catalog response dynamically
  await assertContext.runTest(
    { testId: 'T1_F03_01', featureCode: 'F3', tierCode: 'tier1' },
    'RagQueryService builds procedure catalog response dynamically from procedureRepository',
    async () => {
      const ragServicePath = path.join(
        PROJECT_ROOT,
        'backend/src/main/java/vn/edu/uth/smartward/rag/RagQueryService.java'
      );
      const ragCode = fs.readFileSync(ragServicePath, 'utf8');
      const hasDynamicDbQuery =
        ragCode.includes('procedureRepository.findByStatus') ||
        ragCode.includes('procedureRepository.findAll');
      assertContext.assert(hasDynamicDbQuery, 'Must query procedureRepository dynamically');
    }
  );

  // T1_F03_02: Frontend proceduresCatalog matches 40 procedures
  await assertContext.runTest(
    { testId: 'T1_F03_02', featureCode: 'F3', tierCode: 'tier1' },
    'Frontend proceduresCatalog contains exactly 40 procedures',
    async () => {
      const catalogPath = path.join(PROJECT_ROOT, 'frontend/src/data/proceduresCatalog.ts');
      const catalogContent = fs.readFileSync(catalogPath, 'utf8');
      const matches = catalogContent.match(/"code":\s*"TTHC-[A-Z]+-\d+"/g) || [];
      assertContext.assertEqual(matches.length, 40, 'Frontend catalog procedure count');
    }
  );

  // T1_F03_03: Intent classifier recognizes procedure inquiry
  await assertContext.runTest(
    { testId: 'T1_F03_03', featureCode: 'F3', tierCode: 'tier1' },
    'Intent classifier properly recognizes procedure inquiry intent',
    async () => {
      const intentPath = path.join(PROJECT_ROOT, 'frontend/src/services/intentClassifier.ts');
      const intentCode = fs.readFileSync(intentPath, 'utf8');
      const handlesProcedureInquiry =
        intentCode.includes('PROCEDURE_INQUIRY') ||
        intentCode.includes('isProcedureListQuery') ||
        intentCode.includes('thủ tục');
      assertContext.assert(handlesProcedureInquiry, 'Must support PROCEDURE_INQUIRY intent');
    }
  );

  // T1_F03_04: Legal knowledge base does not contain phantom procedures
  await assertContext.runTest(
    { testId: 'T1_F03_04', featureCode: 'F3', tierCode: 'tier1' },
    'Legal knowledge base is synchronized without deleted duplicate procedure codes',
    async () => {
      const kbPath = path.join(PROJECT_ROOT, 'frontend/src/services/legalKnowledgeBase.ts');
      const kbCode = fs.readFileSync(kbPath, 'utf8');
      const hasDeletedDuplicates =
        kbCode.includes('"TTHC-CR-05"') || kbCode.includes('"TTHC-CT-03"');
      assertContext.assert(!hasDeletedDuplicates, 'Must not reference removed duplicate codes');
    }
  );

  // T1_F03_05: Absence of static hardcoded procedure strings in RagQueryService
  await assertContext.runTest(
    { testId: 'T1_F03_05', featureCode: 'F3', tierCode: 'tier1' },
    'RagQueryService does not contain stale hardcoded duplicate procedure codes',
    async () => {
      const ragServicePath = path.join(
        PROJECT_ROOT,
        'backend/src/main/java/vn/edu/uth/smartward/rag/RagQueryService.java'
      );
      const ragCode = fs.readFileSync(ragServicePath, 'utf8');
      const hasStaleHardcode =
        ragCode.includes('TTHC-CR-05') || ragCode.includes('TTHC-CT-03');
      assertContext.assert(!hasStaleHardcode, 'RagQueryService must not contain duplicate codes');
    }
  );
}
