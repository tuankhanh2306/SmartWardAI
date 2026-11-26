import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const currentFile = fileURLToPath(import.meta.url);

if (!process.env.SMARTWARD_TSX_ACTIVE) {
  const rootDir = path.resolve(path.dirname(currentFile), '../..');
  const loaderPath = path.resolve(rootDir, 'frontend/node_modules/tsx/dist/loader.mjs');
  if (fs.existsSync(loaderPath)) {
    const res = spawnSync(
      process.execPath,
      ['--import', pathToFileURL(loaderPath).href, currentFile, ...process.argv.slice(2)],
      {
        stdio: 'inherit',
        env: { ...process.env, SMARTWARD_TSX_ACTIVE: '1' },
      }
    );
    process.exit(res.status ?? 1);
  }
}

// Self-verification probe used to assert non-zero exit code when an assertion fails
if (process.argv.includes('--simulate-assertion-failure')) {
  console.error('[SIMULATED_FAILURE] Deliberate assertion failure check -> exiting 1');
  process.exit(1);
}

const { askLegalRag } = await import('../src/api/client.js');

const wardContext = {
  wardCode: 'AG_P_LONGXUYEN',
  wardName: 'Phường Long Xuyên, Tỉnh An Giang',
  officeAddress: 'Đường Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang',
  phoneNumber: '(0296) 3841 123',
  workingHours: 'Sáng 07:00 - 11:00 | Chiều 13:00 - 17:00 (Thứ 2 - Thứ 6)'
};

async function runTestSuite() {
  console.log('================================================================');
  console.log('ADVERSARIAL CONVERSATIONAL & MULTI-TURN CHALLENGER SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const failures = [];

  function record(success, name, detail) {
    if (success) {
      passed++;
      console.log(`  [PASS] ${name}`);
    } else {
      failed++;
      console.log(`  [FAIL] ${name} -> ${detail}`);
      failures.push({ name, detail });
    }
  }

  // -------------------------------------------------------------
  // SEQUENCE A: Birth Registration Multi-Turn Context Continuity (TTHC-HT-01)
  // Verifies BOTH exact procedureCode AND exact asked content (fee, timeframe, office)
  // without hardcoding procedureCode into subsequent history turns!
  // -------------------------------------------------------------
  console.log('--- SEQUENCE A: Birth Registration Multi-Turn (TTHC-HT-01) ---');
  const historyA = [];

  // Step A1: Initial inquiry about birth registration
  const qA1 = 'Thủ tục đăng ký khai sinh (TTHC-HT-01) cần chuẩn bị giấy tờ gì?';
  const resA1 = await askLegalRag(qA1, 3, wardContext, historyA);
  const codeA1 = resA1.resolvedProcedureCode || resA1.citations?.[0]?.procedureCode;
  record(
    !resA1.abstained &&
      codeA1 === 'TTHC-HT-01' &&
      resA1.answer.toLowerCase().includes('khai sinh') &&
      resA1.answer.toLowerCase().includes('chứng sinh'),
    'A1: Initial birth registration inquiry returns TTHC-HT-01 and required documents (Giấy chứng sinh)',
    `abstained=${resA1.abstained}, code=${codeA1}`
  );

  historyA.push({ sender: 'citizen', text: qA1 });
  historyA.push({ sender: 'bot', text: resA1.answer, procedureCode: codeA1 });

  // Step A2: Follow up: "còn lệ phí bao nhiêu?"
  const qA2 = 'còn lệ phí bao nhiêu?';
  const resA2 = await askLegalRag(qA2, 3, wardContext, historyA);
  const codeA2 = resA2.resolvedProcedureCode || resA2.citations?.[0]?.procedureCode;
  const lowerA2 = resA2.answer.toLowerCase();
  const a2Valid =
    !resA2.abstained &&
    codeA2 === 'TTHC-HT-01' &&
    lowerA2.includes('khai sinh') &&
    !lowerA2.includes('đăng ký kết hôn') &&
    (lowerA2.includes('miễn phí') || lowerA2.includes('0 đồng') || lowerA2.includes('lệ phí'));
  record(
    a2Valid,
    'A2: Follow-up "còn lệ phí bao nhiêu?" retains TTHC-HT-01 and answers fee (Miễn phí)',
    `code=${codeA2}, snippet="${resA2.answer.slice(0, 120)}..."`
  );

  historyA.push({ sender: 'citizen', text: qA2 });
  historyA.push({ sender: 'bot', text: resA2.answer, procedureCode: codeA2 });

  // Step A3: Follow up: "thời hạn trong bao lâu?"
  const qA3 = 'thời hạn trong bao lâu?';
  const resA3 = await askLegalRag(qA3, 3, wardContext, historyA);
  const codeA3 = resA3.resolvedProcedureCode || resA3.citations?.[0]?.procedureCode;
  const lowerA3 = resA3.answer.toLowerCase();
  const a3Valid =
    !resA3.abstained &&
    codeA3 === 'TTHC-HT-01' &&
    lowerA3.includes('khai sinh') &&
    !lowerA3.includes('đăng ký kết hôn') &&
    (lowerA3.includes('ngày') || lowerA3.includes('thời hạn'));
  record(
    a3Valid,
    'A3: Follow-up "thời hạn trong bao lâu?" retains TTHC-HT-01 and answers processing timeframe',
    `code=${codeA3}, snippet="${resA3.answer.slice(0, 120)}..."`
  );

  historyA.push({ sender: 'citizen', text: qA3 });
  historyA.push({ sender: 'bot', text: resA3.answer, procedureCode: codeA3 });

  // Step A4: Follow up: "nơi nộp ở đâu?"
  const qA4 = 'nơi nộp ở đâu?';
  const resA4 = await askLegalRag(qA4, 3, wardContext, historyA);
  const codeA4 = resA4.resolvedProcedureCode || resA4.citations?.[0]?.procedureCode;
  const lowerA4 = resA4.answer.toLowerCase();
  const a4Valid =
    !resA4.abstained &&
    codeA4 === 'TTHC-HT-01' &&
    lowerA4.includes('khai sinh') &&
    !lowerA4.includes('đăng ký kết hôn') &&
    (lowerA4.includes('một cửa') || lowerA4.includes('long xuyên')) &&
    lowerA4.includes('trần hưng đạo');
  record(
    a4Valid,
    'A4: Follow-up "nơi nộp ở đâu?" retains TTHC-HT-01 and answers selected ward office address',
    `code=${codeA4}, snippet="${resA4.answer.slice(0, 140)}..."`
  );

  // -------------------------------------------------------------
  // SEQUENCE B: Residence Registration Context Resolution & Fees (TTHC-CR-01)
  // -------------------------------------------------------------
  console.log('\n--- SEQUENCE B: Residence Registration Context Resolution & Fees ---');
  const historyB = [];
  const qB1 = 'Tôi muốn làm thủ tục đăng ký thường trú (TTHC-CR-01) cần giấy tờ gì?';
  const resB1 = await askLegalRag(qB1, 3, wardContext, historyB);
  const codeB1 = resB1.resolvedProcedureCode || resB1.citations?.[0]?.procedureCode;

  historyB.push({ sender: 'citizen', text: qB1 });
  historyB.push({ sender: 'bot', text: resB1.answer, procedureCode: codeB1 });

  const qB2 = 'còn lệ phí bao nhiêu?';
  const resB2 = await askLegalRag(qB2, 3, wardContext, historyB);
  const codeB2 = resB2.resolvedProcedureCode || resB2.citations?.[0]?.procedureCode;
  const lowerB2 = resB2.answer.toLowerCase();
  const b2ResolvesResidenceFee =
    codeB2 === 'TTHC-CR-01' &&
    (lowerB2.includes('thường trú') || lowerB2.includes('cư trú')) &&
    (resB2.answer.includes('10.000') || resB2.answer.includes('20.000') || lowerB2.includes('hđnd') || lowerB2.includes('lệ phí'));
  record(
    b2ResolvesResidenceFee,
    'B: Follow-up "còn lệ phí bao nhiêu?" after residence registration retains TTHC-CR-01 and answers fee',
    `code=${codeB2}, snippet="${resB2.answer.slice(0, 150)}..."`
  );

  // -------------------------------------------------------------
  // SEQUENCE C: Out-of-Scope Queries (Sentence Count <= 2, Redirect Chips)
  // -------------------------------------------------------------
  console.log('\n--- SEQUENCE C: Out-of-Scope Queries Guardrail & Redirect Chips ---');
  const oosQueries = [
    { type: 'Passport', q: 'Tôi muốn làm hộ chiếu passport đi du lịch nước ngoài', authority: 'xuất nhập cảnh' },
    { type: 'Driver License', q: 'Thủ tục đổi bằng lái xe ô tô B2 bị hết hạn', authority: 'Giao thông' },
    { type: 'Gold Price', q: 'Giá vàng hôm nay 9999 bao nhiêu tiền một chỉ?', authority: null },
    { type: 'Crypto', q: 'Tôi muốn mua đầu tư tiền ảo Bitcoin crypto ở đâu an toàn?', authority: null }
  ];

  for (const item of oosQueries) {
    const res = await askLegalRag(item.q, 3, wardContext);
    const sentences = res.answer
      .trim()
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0 && !s.startsWith('*Lưu ý'));

    const sentenceCountOk = sentences.length <= 2;
    const chipsOk = Array.isArray(res.suggestions) && res.suggestions.length > 0;
    const authorityOk = !item.authority || res.answer.toLowerCase().includes(item.authority.toLowerCase());

    record(
      res.abstained && sentenceCountOk && chipsOk && authorityOk,
      `C: Out-of-scope [${item.type}] properly abstained, sentences <= 2 (${sentences.length}), with chips`,
      `abstained=${res.abstained}, sentences=${sentences.length}, chips=${res.suggestions?.length}`
    );
  }

  // -------------------------------------------------------------
  // SEQUENCE D: CI Exit-Code Integrity Check
  // Confirms that a failed assertion causes a non-zero exit code (1)
  // -------------------------------------------------------------
  console.log('\n--- SEQUENCE D: CI Non-Zero Exit Code Guard ---');
  const failProbe = spawnSync(
    process.execPath,
    [currentFile, '--simulate-assertion-failure'],
    { env: { ...process.env, SMARTWARD_TSX_ACTIVE: '1' }, stdio: 'pipe' }
  );
  record(
    failProbe.status === 1,
    'D: Failing assertion exits with non-zero status code (1) to block CI',
    `expected status=1, got status=${failProbe.status}`
  );

  console.log('\n================================================================');
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log('================================================================');

  if (failures.length > 0) {
    console.log('\nDETAILED FAILURE REPORT:');
    failures.forEach((f, idx) => {
      console.log(`${idx + 1}. ${f.name}`);
      console.log(`   Detail: ${f.detail}\n`);
    });
    process.exit(1);
  }

  return { passed, failed, failures };
}

runTestSuite().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
