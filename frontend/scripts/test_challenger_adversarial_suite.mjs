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
    process.exit(res.status ?? 0);
  }
}

const { askLegalRag } = await import('../src/api/client.js');

const wardContext = {
  wardName: 'Phường Bến Nghé, Quận 1',
  officeAddress: 'Số 29 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  phoneNumber: '028 3829 7458',
  workingHours: 'Sáng 07:30 - 11:30 | Chiều 13:30 - 17:00 (Thứ 2 - Thứ 6)'
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
  // SEQUENCE A: Birth Registration Multi-Turn Context Continuity
  // -------------------------------------------------------------
  console.log('--- SEQUENCE A: Birth Registration Multi-Turn ---');
  const historyA = [];

  // Step A1: Ask about birth registration
  const qA1 = 'Thủ tục đăng ký khai sinh (TTHC-HT-01) cần chuẩn bị giấy tờ gì?';
  const resA1 = await askLegalRag(qA1, 3, wardContext, historyA);
  record(
    !resA1.abstained && resA1.answer.toLowerCase().includes('khai sinh'),
    'A1: Initial inquiry about birth registration is answered',
    `abstained=${resA1.abstained}`
  );

  historyA.push({ sender: 'citizen', text: qA1 });
  historyA.push({
    sender: 'bot',
    text: resA1.answer,
    procedureCode: resA1.citations?.[0]?.procedureCode || 'TTHC-HT-01'
  });

  // Step A2: Follow up: "còn lệ phí bao nhiêu?"
  const qA2 = 'còn lệ phí bao nhiêu?';
  const resA2 = await askLegalRag(qA2, 3, wardContext, historyA);
  const a2RefersBirth = resA2.answer.toLowerCase().includes('khai sinh') && !resA2.answer.toLowerCase().includes('kết hôn');
  record(
    a2RefersBirth,
    'A2: Follow-up fee inquiry must resolve to birth registration fee (NOT marriage)',
    `Resolved answer text: "${resA2.answer.slice(0, 120)}..."`
  );

  historyA.push({ sender: 'citizen', text: qA2 });
  historyA.push({ sender: 'bot', text: resA2.answer, procedureCode: 'TTHC-HT-01' });

  // Step A3: Follow up: "thời hạn trong bao lâu?"
  const qA3 = 'thời hạn trong bao lâu?';
  const resA3 = await askLegalRag(qA3, 3, wardContext, historyA);
  const a3RefersBirth = resA3.answer.toLowerCase().includes('khai sinh') && !resA3.answer.toLowerCase().includes('kết hôn');
  record(
    a3RefersBirth,
    'A3: Follow-up timeframe inquiry must resolve to birth registration timeframe (NOT marriage)',
    `Resolved answer text: "${resA3.answer.slice(0, 120)}..."`
  );

  historyA.push({ sender: 'citizen', text: qA3 });
  historyA.push({ sender: 'bot', text: resA3.answer, procedureCode: 'TTHC-HT-01' });

  // Step A4: Follow up: "nơi nộp ở đâu?"
  const qA4 = 'nơi nộp ở đâu?';
  const resA4 = await askLegalRag(qA4, 3, wardContext, historyA);
  const a4RefersBirth = resA4.answer.toLowerCase().includes('khai sinh') && !resA4.answer.toLowerCase().includes('kết hôn');
  record(
    a4RefersBirth,
    'A4: Follow-up location inquiry must resolve to birth registration location (NOT marriage)',
    `Resolved answer text: "${resA4.answer.slice(0, 120)}..."`
  );

  // -------------------------------------------------------------
  // SEQUENCE B: Residence Registration Context Resolution & Fees
  // -------------------------------------------------------------
  console.log('\n--- SEQUENCE B: Residence Registration Context Resolution & Fees ---');
  
  // B1: Initial inquiry with residence registration and code TTHC-CT-01 or CT-01
  const historyB = [];
  const qB1 = 'Tôi muốn làm thủ tục đăng ký cư trú (TTHC-CT-01) cần giấy tờ gì?';
  const resB1 = await askLegalRag(qB1, 3, wardContext, historyB);
  
  historyB.push({ sender: 'citizen', text: qB1 });
  historyB.push({
    sender: 'bot',
    text: resB1.answer,
    procedureCode: resB1.citations?.[0]?.procedureCode || 'TTHC-CR-01'
  });

  const qB2 = 'còn lệ phí bao nhiêu?';
  const resB2 = await askLegalRag(qB2, 3, wardContext, historyB);
  const b2ResolvesResidenceFee = (resB2.answer.toLowerCase().includes('thường trú') || resB2.answer.toLowerCase().includes('cư trú')) &&
                                (resB2.answer.includes('10.000') || resB2.answer.includes('20.000') || resB2.answer.toLowerCase().includes('hđnd'));
  record(
    b2ResolvesResidenceFee,
    'B: Follow-up "còn lệ phí bao nhiêu?" after residence registration inquiry must resolve residence fee',
    `Resolved answer text: "${resB2.answer.slice(0, 150)}..."`
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
  }

  return { passed, failed, failures };
}

runTestSuite().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
