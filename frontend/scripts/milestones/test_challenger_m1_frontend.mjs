import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const currentFile = fileURLToPath(import.meta.url);

if (!process.env.SMARTWARD_TSX_ACTIVE) {
  const rootDir = path.resolve(path.dirname(currentFile), '../..');
  const loaderPath = path.resolve(rootDir, 'frontend/node_modules/tsx/dist/loader.mjs');
  if (fs.existsSync(loaderPath)) {
    const res = spawnSync(process.execPath, ['--import', pathToFileURL(loaderPath).href, currentFile, ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: { ...process.env, SMARTWARD_TSX_ACTIVE: '1' }
    });
    process.exit(res.status ?? 0);
  }
}

console.log('================================================================');
console.log('CHALLENGER 2: ADVERSARIAL FRONTEND INTEGRATION & REGRESSION TEST');
console.log('================================================================');

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✓ [PASS] ${description}`);
    passedAssertions++;
  } else {
    console.error(`  ✗ [FAIL] ${description}`);
    failedAssertions++;
  }
}

// -------------------------------------------------------------
// SECTION 1: SCAN FRONTEND/SRC FOR FAKE & DELETED PROCEDURE CODES
// -------------------------------------------------------------
console.log('\n--- SECTION 1: Adversarial Scan for Fake & Stale Procedure Codes ---');

const srcDir = path.resolve(path.dirname(currentFile), '../src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allSrcFiles = getAllFiles(srcDir);
const fakeCodes = ['TTHC-DD-01', 'TTHC-DD-02', 'TTHC-DD-03', 'TTHC-DD-04'];
const deletedDuplicateCodes = ['TTHC-BT-06', 'TTHC-CR-05', 'TTHC-CT-03'];

let foundFakeCodes = [];
let foundDeletedDuplicates = [];

for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  for (const code of fakeCodes) {
    if (content.includes(code)) {
      foundFakeCodes.push({ file: path.relative(srcDir, file), code });
    }
  }
  for (const code of deletedDuplicateCodes) {
    if (content.includes(code)) {
      foundDeletedDuplicates.push({ file: path.relative(srcDir, file), code });
    }
  }
}

assert(
  foundFakeCodes.length === 0,
  `Zero occurrences of simulated fake codes (TTHC-DD-01..04) in frontend/src (found: ${foundFakeCodes.length})`
);
assert(
  foundDeletedDuplicates.length === 0,
  `Zero occurrences of deleted duplicate codes (TTHC-BT-06, CR-05, CT-03) in frontend/src (found: ${foundDeletedDuplicates.length})`
);

// -------------------------------------------------------------
// SECTION 2: PROCEDURES_CATALOG INTEGRITY & COMPLETENESS
// -------------------------------------------------------------
console.log('\n--- SECTION 2: PROCEDURES_CATALOG Structural Integrity ---');

const { PROCEDURES_CATALOG } = await import('../src/data/proceduresCatalog.js');

assert(Array.isArray(PROCEDURES_CATALOG), 'PROCEDURES_CATALOG is an array');
assert(PROCEDURES_CATALOG.length === 40, `PROCEDURES_CATALOG contains exactly 40 items (actual: ${PROCEDURES_CATALOG.length})`);

const codes = PROCEDURES_CATALOG.map((p) => p.code);
const uniqueCodes = new Set(codes);
assert(uniqueCodes.size === 40, `All 40 procedure codes are strictly unique (unique: ${uniqueCodes.size})`);

const hasHT13 = uniqueCodes.has('TTHC-HT-13');
const hasMT01 = uniqueCodes.has('TTHC-MT-01');
const hasNCC01 = uniqueCodes.has('TTHC-NCC-01');

assert(hasHT13, 'Newly added procedure TTHC-HT-13 (Khai tử trong nước) is present in catalog');
assert(hasMT01, 'Newly added procedure TTHC-MT-01 (Đăng ký môi trường) is present in catalog');
assert(hasNCC01, 'Newly added procedure TTHC-NCC-01 (Người có công) is present in catalog');

// Verify every item has required fields
const allValidFields = PROCEDURES_CATALOG.every(
  (p) =>
    typeof p.code === 'string' &&
    p.code.startsWith('TTHC-') &&
    typeof p.name === 'string' &&
    p.name.length > 5 &&
    typeof p.category === 'string' &&
    p.category.length > 2 &&
    typeof p.portalCode === 'string' &&
    typeof p.chunksCount === 'number' &&
    p.chunksCount > 0
);
assert(allValidFields, 'All 40 items have valid code, name, category, portalCode, chunksCount');

// Verify categories
const categorySet = new Set(PROCEDURES_CATALOG.map((p) => p.category));
console.log('  Active Categories found:', Array.from(categorySet).join(', '));
assert(categorySet.has('Hộ tịch'), 'Category "Hộ tịch" present');
assert(categorySet.has('Cư trú'), 'Category "Cư trú" present');
assert(categorySet.has('Chứng thực'), 'Category "Chứng thực" present');
assert(categorySet.has('Đất đai và Môi trường'), 'Category "Đất đai và Môi trường" present');

// -------------------------------------------------------------
// SECTION 3: API CLIENT RESILIENCE & ADVERSE FALLBACK ORACLE
// -------------------------------------------------------------
console.log('\n--- SECTION 3: API Client Adverse Fallback Stress Test ---');

const { getProcedures, getProcedureByCode } = await import('../src/api/client.js');

// 3.1: getProcedures() under adverse offline/backend-down scenario
// Since no backend mock or server is running on the specific client port right now,
// this triggers the fallback path or returns the live data if backend happens to run.
const proceduresList = await getProcedures();
assert(Array.isArray(proceduresList) && proceduresList.length === 40, `getProcedures() gracefully returns 40 procedures under any network state (actual: ${proceduresList?.length})`);

// 3.2: Category filtering on getProcedures
const hoTichList = await getProcedures({ category: 'Hộ tịch' });
assert(
  Array.isArray(hoTichList) && hoTichList.length > 0 && hoTichList.every((p) => p.category === 'Hộ tịch'),
  `getProcedures({ category: 'Hộ tịch' }) filters correctly (count: ${hoTichList.length})`
);

// 3.3: Keyword filtering on getProcedures
const keywordList = await getProcedures({ keyword: 'khai sinh' });
assert(
  Array.isArray(keywordList) && keywordList.length > 0 && keywordList.some((p) => p.procedureCode === 'TTHC-HT-01'),
  `getProcedures({ keyword: 'khai sinh' }) correctly finds TTHC-HT-01 (count: ${keywordList.length})`
);

// 3.4: getProcedureByCode with valid code
const procHT01 = await getProcedureByCode('TTHC-HT-01');
assert(procHT01 !== null && procHT01.procedureCode === 'TTHC-HT-01', `getProcedureByCode('TTHC-HT-01') resolves successfully with code and metadata`);

// 3.5: getProcedureByCode with non-existent code
const procNonExistent = await getProcedureByCode('TTHC-NON-EXISTENT-99');
assert(procNonExistent === null, `getProcedureByCode('TTHC-NON-EXISTENT-99') returns null without throwing`);

// -------------------------------------------------------------
// SECTION 4: INTENT CLASSIFIER PROCEDURES CATALOG HARMONIZATION
// -------------------------------------------------------------
console.log('\n--- SECTION 4: Intent Classifier Dynamic Output Verification ---');

const { buildProcedureCatalogResponse } = await import('../src/services/intentClassifier.js');
const catalogText = buildProcedureCatalogResponse('UBND Phường Mỹ Bình');

assert(typeof catalogText === 'string' && catalogText.length > 100, 'buildProcedureCatalogResponse() generates non-empty string');
assert(!catalogText.includes('TTHC-DD-01'), 'buildProcedureCatalogResponse() does NOT contain TTHC-DD-01');
assert(!catalogText.includes('TTHC-DD-02'), 'buildProcedureCatalogResponse() does NOT contain TTHC-DD-02');
assert(!catalogText.includes('TTHC-DD-03'), 'buildProcedureCatalogResponse() does NOT contain TTHC-DD-03');
assert(!catalogText.includes('TTHC-DD-04'), 'buildProcedureCatalogResponse() does NOT contain TTHC-DD-04');
assert(catalogText.includes('TTHC-HT-13'), 'buildProcedureCatalogResponse() includes TTHC-HT-13 (Khai tử)');
assert(catalogText.includes('TTHC-MT-01'), 'buildProcedureCatalogResponse() includes TTHC-MT-01 (Môi trường)');
assert(catalogText.includes('TTHC-NCC-01'), 'buildProcedureCatalogResponse() includes TTHC-NCC-01 (Người có công)');

// -------------------------------------------------------------
// SECTION 5: PROCEDURES CATALOG PAGE COMPONENT RESILIENCE AUDIT
// -------------------------------------------------------------
console.log('\n--- SECTION 5: ProceduresCatalogPage Component Static & Runtime Contract Audit ---');

const pageFile = path.resolve(srcDir, 'pages/ProceduresCatalogPage.tsx');
const pageCode = fs.readFileSync(pageFile, 'utf-8');

assert(pageCode.includes("import { getProcedures } from '../api/client'"), 'ProceduresCatalogPage imports getProcedures from api/client');
assert(pageCode.includes("useState<ProcedureCatalogItem[]>(PROCEDURES_CATALOG)"), 'ProceduresCatalogPage initializes state safely with PROCEDURES_CATALOG fallback');
assert(pageCode.includes("getProcedures()"), 'ProceduresCatalogPage invokes getProcedures() on mount');
assert(pageCode.includes(".catch((err) =>"), 'ProceduresCatalogPage contains .catch handler preventing white-screen crash on API failure');
assert(pageCode.includes("isMounted = false"), 'ProceduresCatalogPage implements isMounted lifecycle guard against unmounted state updates');
assert(!pageCode.includes('TTHC-DD-'), 'ProceduresCatalogPage has zero references to TTHC-DD-*');

// -------------------------------------------------------------
// FINAL ASSESSMENT
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`SUMMARY: ${passedAssertions} PASSED, ${failedAssertions} FAILED`);
console.log('================================================================');

if (failedAssertions > 0) {
  console.error('💥 ADVERSARIAL VERIFICATION FAILED!');
  process.exit(1);
} else {
  console.log('🏆 ALL ADVERSARIAL & REGRESSION ASSERIONS PASSED (100% SUCCESS)');
  process.exit(0);
}
