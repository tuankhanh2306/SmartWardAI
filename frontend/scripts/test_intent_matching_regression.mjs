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

const {
  restoreVietnameseDiacritics,
  preprocessQuery,
  isVietnameseUnaccented,
} = await import('../src/services/diacriticsRestorer.js');

const {
  searchLegalKnowledge,
  findMatchingProcedure,
} = await import('../src/services/legalKnowledgeBase.js');

const {
  FALLBACK_THRESHOLD,
  FALLBACK_AMBIGUOUS_GAP,
  FALLBACK_LOWER_BOUND,
  scoreProcedureCatalog,
  evaluateIntentDecision,
} = await import('../src/services/intentScoring.js');

console.log('================================================================');
console.log('SMARTWARD AI - INTENT MATCHING & DIACRITICS REGRESSION SUITE');
console.log('================================================================\n');

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message, detail = '') {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ✗ FAIL: ${message}`);
    if (detail) {
      console.error(`    Detail: ${detail}`);
    }
  }
}

// ============================================================================
// TEST 1: BUG FIX CỤ THỂ (THE ROOT CAUSE BUG)
// "cac che do chinh sach bao tro xa boi"
// ============================================================================
console.log('>>> [1/5] Testing Root Cause Bug: "cac che do chinh sach bao tro xa boi"...');

const bugQuery = 'cac che do chinh sach bao tro xa boi';
const preprocessedBug = await preprocessQuery(bugQuery);
console.log(`    Preprocessed: "${bugQuery}" -> "${preprocessedBug}"`);

assert(
  preprocessedBug.includes('bảo trợ xã hội') || preprocessedBug.includes('chế độ'),
  'Preprocess query restores diacritics and fixes "xa boi" -> "xã hội"',
  `Got: "${preprocessedBug}"`
);

const bugMatch = findMatchingProcedure(preprocessedBug);
assert(bugMatch !== null, 'Matcher found procedure for preprocessed query');
if (bugMatch) {
  assert(
    bugMatch.procedureCode === 'TTHC-BT-01',
    `Must match TTHC-BT-01 (Bảo trợ xã hội), got: ${bugMatch.procedureCode} (${bugMatch.procedureName})`
  );
  assert(
    bugMatch.procedureCode !== 'TTHC-CR-03',
    'CRITICAL: Must NEVER match TTHC-CR-03 (Đăng ký tạm trú)'
  );
  assert(
    bugMatch.status === 'CONFIDENT',
    `Status must be CONFIDENT (score >= ${FALLBACK_THRESHOLD}), got: ${bugMatch.status} (score: ${bugMatch.score})`
  );
}

// ============================================================================
// TEST 2: 10 CÂU HỎI KHÔNG DẤU MỚI (ZERO-RAM N-GRAM RESTORER)
// ============================================================================
console.log('\n>>> [2/5] Testing 10 New Unaccented Queries (Diacritics Restoration)...');

const unaccentedTestCases = [
  {
    raw: 'lam giay khai sinh can gi',
    expectedCode: 'TTHC-HT-01',
    name: 'Đăng ký khai sinh',
  },
  {
    raw: 'dang ky ket hon can bao nhieu tien',
    expectedCode: 'TTHC-HT-02',
    name: 'Đăng ký kết hôn',
  },
  {
    raw: 'chung thuc ban sao can giay to gi',
    expectedCode: 'TTHC-CT-01',
    name: 'Chứng thực bản sao',
  },
  {
    raw: 'tro cap xa hoi cho nguoi khuyet tat',
    expectedCode: 'TTHC-BT-01',
    name: 'Trợ cấp xã hội hàng tháng',
  },
  {
    raw: 'khai bao tam vang di lam xa',
    expectedCode: 'TTHC-CR-07',
    name: 'Khai báo tạm vắng',
  },
  {
    raw: 'chuyen khau ve nha moi',
    expectedCode: 'TTHC-CR-01',
    name: 'Đăng ký thường trú / Chuyển khẩu',
  },
  {
    raw: 'xin trich luc khai sinh bi mat',
    expectedCode: 'TTHC-HT-04',
    name: 'Cấp bản sao trích lục hộ tịch',
  },
  {
    raw: 'chung thuc chu ky hop dong',
    expectedCode: 'TTHC-CT-02',
    name: 'Chứng thực chữ ký',
  },
  {
    raw: 'dang ky khai tu cho nguoi mat',
    expectedCode: 'TTHC-HT-03',
    name: 'Đăng ký khai tử',
  },
  {
    raw: 'tro cap mai tang phi cho nguoi cao tuoi',
    expectedCode: 'TTHC-BT-02',
    name: 'Hỗ trợ chi phí mai táng',
  },
];

for (const tc of unaccentedTestCases) {
  const preprocessed = await preprocessQuery(tc.raw);
  const match = findMatchingProcedure(preprocessed);

  assert(
    match !== null && match.procedureCode === tc.expectedCode,
    `Unaccented: "${tc.raw}" -> matched ${tc.expectedCode} (${tc.name})`,
    `Got: ${match?.procedureCode || 'NULL'} (status: ${match?.status}, preprocessed: "${preprocessed}")`
  );
  if (match) {
    assert(
      match.status === 'CONFIDENT',
      `  Confidence check: "${tc.raw}" score=${match.score.toFixed(2)} >= ${FALLBACK_THRESHOLD}`
    );
  }
}

// ============================================================================
// TEST 3: NGƯỠNG TỪ CHỐI AN TOÀN (SAFETY THRESHOLD & ABSTENTION)
// ============================================================================
console.log('\n>>> [3/5] Testing Safety Guardrails: Abstention on Low Confidence & Gibberish...');

const gibberishQueries = [
  'ajksdhf laksjdf hkasjdf qweoiu',
  '12837192387129381 992834',
  'zzzzxxxxx yyyyy bbbb',
  'toi muon hoi mot cai gi do vo van khong lien quan gi ca',
];

for (const gq of gibberishQueries) {
  const preprocessed = await preprocessQuery(gq);
  const result = searchLegalKnowledge(preprocessed, 1);

  assert(
    result.decision.status === 'ABSTAIN',
    `Gibberish query "${gq.slice(0, 25)}..." must trigger ABSTAIN`,
    `Got status: ${result.decision.status}, maxScore: ${result.decision.maxScore}`
  );
  assert(
    result.isInScope === false,
    `  isInScope must be false for gibberish`,
    `Got isInScope: ${result.isInScope}`
  );
  assert(
    result.decision.maxScore < FALLBACK_THRESHOLD,
    `  Score must be below threshold (${result.decision.maxScore} < ${FALLBACK_THRESHOLD})`
  );
}

// ============================================================================
// TEST 4: VÙNG XÁM MƠ HỒ (AMBIGUITY & DISAMBIGUATION GAP < 0.12)
// ============================================================================
console.log('\n>>> [4/5] Testing Gray-Zone Ambiguity (Score Gap < 0.12)...');

// Query mơ hồ đa thủ tục: công dân hỏi xin giấy độc thân để đăng ký kết hôn (chạm cả TTHC-HT-11 và TTHC-HT-02)
const ambiguousQuery = 'xin giấy xác nhận độc thân để đăng ký kết hôn';
const preprocessedAmb = await preprocessQuery(ambiguousQuery);
const ambResult = searchLegalKnowledge(preprocessedAmb, 2);

console.log(`    Ambiguous query "${ambiguousQuery}":`);
console.log(`    Top 1: ${ambResult.decision.top1?.item.code} (${ambResult.decision.top1?.score})`);
console.log(`    Top 2: ${ambResult.decision.top2?.item.code} (${ambResult.decision.top2?.score})`);
console.log(`    Gap: ${ambResult.decision.scoreGap.toFixed(3)} (threshold gap: ${FALLBACK_AMBIGUOUS_GAP})`);
console.log(`    Decision: ${ambResult.decision.status}`);

assert(
  ambResult.decision.top1 !== undefined && ambResult.decision.top2 !== undefined,
  'Ambiguous query has both Top 1 and Top 2 candidate procedures'
);

assert(
  ambResult.decision.status === 'AMBIGUOUS',
  'Status correctly classified as AMBIGUOUS when gap < 0.12'
);
assert(
  Array.isArray(ambResult.decision.ambiguousCandidates) && ambResult.decision.ambiguousCandidates.length >= 2,
  'Ambiguous decision provides candidate suggestions for user disambiguation'
);
assert(
  Array.isArray(ambResult.decision.clarifyingSuggestions) && ambResult.decision.clarifyingSuggestions.length >= 2,
  'Ambiguous decision provides quick suggestion buttons for citizens'
);

// ============================================================================
// TEST 5: BẢO TOÀN CÂU HỎI CÓ DẤU CHUẨN (REGRESSION PROTECTION)
// ============================================================================
console.log('\n>>> [5/5] Testing Regression on Standard Accented Vietnamese Queries...');

const standardCases = [
  {
    query: 'Tôi muốn làm thủ tục đăng ký khai sinh cho cháu mới sinh tại Xã An Phú cần giấy tờ gì và mất bao lâu?',
    expectedCode: 'TTHC-HT-01',
  },
  {
    query: 'Thủ tục đăng ký kết hôn cần mang những giấy tờ gì?',
    expectedCode: 'TTHC-HT-02',
  },
  {
    query: 'Chứng thực bản sao từ bản chính các giấy tờ tùy thân',
    expectedCode: 'TTHC-CT-01',
  },
  {
    query: 'Hướng dẫn nộp mẫu CT01 đăng ký thường trú',
    expectedCode: 'TTHC-CR-01',
  },
];

for (const sc of standardCases) {
  const preprocessed = await preprocessQuery(sc.query);
  const match = findMatchingProcedure(preprocessed);

  assert(
    match !== null && match.procedureCode === sc.expectedCode,
    `Standard accented: "${sc.query.slice(0, 40)}..." -> matched ${sc.expectedCode}`,
    `Got: ${match?.procedureCode || 'NULL'}`
  );
  if (match) {
    assert(
      match.status === 'CONFIDENT',
      `  Accented confidence: score=${match.score.toFixed(2)} >= ${FALLBACK_THRESHOLD}`
    );
  }
}

// ============================================================================
// SUMMARY & SCOREBOARD
// ============================================================================
console.log('\n================================================================');
console.log(`INTENT MATCHING REGRESSION RESULTS:`);
console.log(`  Total Assertions : ${totalAssertions}`);
console.log(`  Passed           : ${passedAssertions}`);
console.log(`  Failed           : ${failedAssertions}`);
console.log('================================================================');

if (failedAssertions > 0) {
  console.error(`\n❌ REGRESSION TEST FAILED with ${failedAssertions} assertion error(s)!`);
  process.exit(1);
} else {
  console.log('\n🎉 ALL INTENT MATCHING & DIACRITICS REGRESSION TESTS PASSED!');
  process.exit(0);
}
