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

async function verifyAll() {
  console.log('================================================================');
  console.log('CHALLENGER V2 EMPIRICAL AUDIT & VERIFICATION HARNESS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const failures = [];

  function check(condition, name, detail = '') {
    if (condition) {
      passed++;
      console.log(`  [PASS] ${name}`);
    } else {
      failed++;
      console.log(`  [FAIL] ${name} -> ${detail}`);
      failures.push({ name, detail });
    }
  }

  // 1. SEQUENCE A: Birth Registration Follow-ups
  console.log('--- TEST SET 1: Sequence A (Birth Registration Follow-ups) ---');
  const histA = [];
  const qA1 = 'Thủ tục đăng ký khai sinh (TTHC-HT-01) cần chuẩn bị giấy tờ gì?';
  const resA1 = await askLegalRag(qA1, 3, wardContext, histA);
  check(!resA1.abstained && resA1.answer.toLowerCase().includes('khai sinh'), 'A1: Initial birth registration inquiry answered');

  histA.push({ sender: 'citizen', text: qA1 });
  histA.push({ sender: 'bot', text: resA1.answer, procedureCode: resA1.citations?.[0]?.procedureCode || 'TTHC-HT-01' });

  // A2: fee
  const resA2 = await askLegalRag('còn lệ phí bao nhiêu?', 3, wardContext, histA);
  const a2IsBirthNotMarriage = resA2.answer.toLowerCase().includes('khai sinh') && !resA2.answer.toLowerCase().includes('kết hôn');
  check(a2IsBirthNotMarriage, 'A2: Follow-up fee resolves to birth registration (NOT marriage)', `Answer: ${resA2.answer.slice(0, 100)}`);

  histA.push({ sender: 'citizen', text: 'còn lệ phí bao nhiêu?' });
  histA.push({ sender: 'bot', text: resA2.answer, procedureCode: 'TTHC-HT-01' });

  // A3: duration
  const resA3 = await askLegalRag('thời hạn trong bao lâu?', 3, wardContext, histA);
  const a3IsBirthNotMarriage = resA3.answer.toLowerCase().includes('khai sinh') && !resA3.answer.toLowerCase().includes('kết hôn');
  check(a3IsBirthNotMarriage, 'A3: Follow-up timeframe resolves to birth registration (NOT marriage)', `Answer: ${resA3.answer.slice(0, 100)}`);

  histA.push({ sender: 'citizen', text: 'thời hạn trong bao lâu?' });
  histA.push({ sender: 'bot', text: resA3.answer, procedureCode: 'TTHC-HT-01' });

  // A4: location
  const resA4 = await askLegalRag('nơi nộp ở đâu?', 3, wardContext, histA);
  const a4IsBirthNotMarriage = resA4.answer.toLowerCase().includes('khai sinh') && !resA4.answer.toLowerCase().includes('kết hôn');
  check(a4IsBirthNotMarriage, 'A4: Follow-up location resolves to birth registration (NOT marriage)', `Answer: ${resA4.answer.slice(0, 100)}`);

  // 2. SEQUENCE B: Residence Registration Follow-up
  console.log('\n--- TEST SET 2: Sequence B (Residence Registration Follow-up) ---');
  const histB = [];
  const qB1 = 'Tôi muốn làm thủ tục đăng ký cư trú (TTHC-CT-01) cần giấy tờ gì?';
  const resB1 = await askLegalRag(qB1, 3, wardContext, histB);
  histB.push({ sender: 'citizen', text: qB1 });
  histB.push({ sender: 'bot', text: resB1.answer, procedureCode: resB1.citations?.[0]?.procedureCode || 'TTHC-CR-01' });

  const resB2 = await askLegalRag('còn lệ phí bao nhiêu?', 3, wardContext, histB);
  const b2Ok = (resB2.answer.toLowerCase().includes('thường trú') || resB2.answer.toLowerCase().includes('cư trú')) &&
               (resB2.answer.includes('10.000') || resB2.answer.includes('20.000') || resB2.answer.toLowerCase().includes('hđnd'));
  check(b2Ok, 'B: Follow-up fee after residence inquiry resolves to residence fee', `Answer: ${resB2.answer.slice(0, 120)}`);

  // 3. SEQUENCE C: Out-of-Scope Queries (Conciseness <= 2 sentences, chips, routing)
  console.log('\n--- TEST SET 3: Sequence C (Out-of-Scope Safety Guardrails) ---');
  const oosCases = [
    { type: 'Passport', q: 'Tôi muốn làm hộ chiếu passport đi du lịch nước ngoài', authority: 'xuất nhập cảnh' },
    { type: 'Driver License', q: 'Thủ tục đổi bằng lái xe ô tô B2 bị hết hạn', authority: 'Giao thông' },
    { type: 'Gold Price', q: 'Giá vàng hôm nay 9999 bao nhiêu tiền một chỉ?', authority: null },
    { type: 'Crypto', q: 'Tôi muốn mua đầu tư tiền ảo Bitcoin crypto ở đâu an toàn?', authority: null }
  ];

  for (const c of oosCases) {
    const res = await askLegalRag(c.q, 3, wardContext);
    const sentences = res.answer
      .trim()
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0 && !s.startsWith('*Lưu ý'));
    const sentenceCountOk = sentences.length <= 2;
    const chipsOk = Array.isArray(res.suggestions) && res.suggestions.length > 0;
    const authorityOk = !c.authority || res.answer.toLowerCase().includes(c.authority.toLowerCase());

    check(
      res.abstained && sentenceCountOk && chipsOk && authorityOk,
      `C: Out-of-scope [${c.type}] properly abstained, sentences <= 2 (${sentences.length}), chips provided`,
      `abstained=${res.abstained}, sentences=${sentences.length}, chips=${res.suggestions?.length}`
    );
  }

  // 4. ADVERSARIAL CHALLENGE: Missing procedureCode in history (fallback robustness)
  console.log('\n--- TEST SET 4: Adversarial Edge Cases (Missing procedureCode fallback) ---');
  const histNoCode = [];
  const resNoCode1 = await askLegalRag('Thủ tục khai sinh cho bé', 3, wardContext, histNoCode);
  histNoCode.push({ sender: 'citizen', text: 'Thủ tục khai sinh cho bé' });
  // Do NOT pass procedureCode to test raw text extraction
  histNoCode.push({ sender: 'bot', text: resNoCode1.answer });

  const resNoCode2 = await askLegalRag('còn lệ phí bao nhiêu?', 3, wardContext, histNoCode);
  const noCodeOk = resNoCode2.answer.toLowerCase().includes('khai sinh') && !resNoCode2.answer.toLowerCase().includes('kết hôn');
  check(noCodeOk, 'ADV-1: Unannotated history (no procedureCode) still correctly resolves to birth registration (NOT marriage)', `Answer: ${resNoCode2.answer.slice(0, 100)}`);

  // 5. ADVERSARIAL CHALLENGE: Topic Switching in Multi-Turn
  console.log('\n--- TEST SET 5: Adversarial Topic Switching ---');
  const histSwitch = [];
  const resSwitch1 = await askLegalRag('Thủ tục đăng ký kết hôn', 3, wardContext, histSwitch);
  histSwitch.push({ sender: 'citizen', text: 'Thủ tục đăng ký kết hôn' });
  histSwitch.push({ sender: 'bot', text: resSwitch1.answer, procedureCode: 'TTHC-HT-02' });

  const resSwitch2 = await askLegalRag('còn lệ phí bao nhiêu?', 3, wardContext, histSwitch);
  check(resSwitch2.answer.toLowerCase().includes('kết hôn'), 'ADV-2: Marriage follow-up fee correctly resolves to marriage');

  histSwitch.push({ sender: 'citizen', text: 'còn lệ phí bao nhiêu?' });
  histSwitch.push({ sender: 'bot', text: resSwitch2.answer, procedureCode: 'TTHC-HT-02' });

  // Switch to Birth
  const resSwitch3 = await askLegalRag('thủ tục khai sinh', 3, wardContext, histSwitch);
  histSwitch.push({ sender: 'citizen', text: 'thủ tục khai sinh' });
  histSwitch.push({ sender: 'bot', text: resSwitch3.answer, procedureCode: 'TTHC-HT-01' });

  const resSwitch4 = await askLegalRag('còn lệ phí bao nhiêu?', 3, wardContext, histSwitch);
  check(resSwitch4.answer.toLowerCase().includes('khai sinh') && !resSwitch4.answer.toLowerCase().includes('kết hôn'), 'ADV-3: After topic switch to birth, follow-up fee resolves to birth (NOT marriage)');

  console.log('\n================================================================');
  console.log(`TOTAL AUDIT CHECKS: ${passed + failed}`);
  console.log(`PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

verifyAll().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
