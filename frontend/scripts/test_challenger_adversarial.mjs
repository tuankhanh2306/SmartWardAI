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

async function testSequences() {
  console.log('=== TEST CHALLENGER EMPIRICAL VERIFICATION ===\n');

  // -------------------------------------------------------------
  // Sequence A: Birth Registration (TTHC-HT-01) Multi-Turn
  // -------------------------------------------------------------
  console.log('--- SEQUENCE A: Birth Registration Multi-Turn ---');
  const historyA = [];

  // Step A1: Ask about birth registration
  const qA1 = 'Tôi muốn tìm hiểu thủ tục đăng ký khai sinh (TTHC-HT-01) cần giấy tờ gì?';
  const resA1 = await askLegalRag(qA1, 3, wardContext, historyA);
  console.log(`[A1] Query: "${qA1}"`);
  console.log(`     Abstained: ${resA1.abstained}`);
  console.log(`     Answer preview: ${resA1.answer.slice(0, 100)}...`);
  console.log(`     Suggestions: ${JSON.stringify(resA1.suggestions)}`);

  historyA.push({ sender: 'citizen', text: qA1 });
  historyA.push({ sender: 'bot', text: resA1.answer, procedureCode: resA1.citations?.[0]?.procedureCode || 'TTHC-HT-01' });

  // Step A2: Follow up: "còn lệ phí bao nhiêu?"
  const qA2 = 'còn lệ phí bao nhiêu?';
  const resA2 = await askLegalRag(qA2, 3, wardContext, historyA);
  console.log(`\n[A2] Query: "${qA2}"`);
  console.log(`     Abstained: ${resA2.abstained}`);
  console.log(`     Answer preview: ${resA2.answer.slice(0, 150)}...`);
  console.log(`     Mentions khai sinh: ${resA2.answer.toLowerCase().includes('khai sinh')}`);
  console.log(`     Mentions fee: ${resA2.answer.toLowerCase().includes('lệ phí') || resA2.answer.toLowerCase().includes('miễn phí')}`);

  historyA.push({ sender: 'citizen', text: qA2 });
  historyA.push({ sender: 'bot', text: resA2.answer, procedureCode: 'TTHC-HT-01' });

  // Step A3: Follow up: "thời hạn trong bao lâu?"
  const qA3 = 'thời hạn trong bao lâu?';
  const resA3 = await askLegalRag(qA3, 3, wardContext, historyA);
  console.log(`\n[A3] Query: "${qA3}"`);
  console.log(`     Abstained: ${resA3.abstained}`);
  console.log(`     Answer preview: ${resA3.answer.slice(0, 150)}...`);
  console.log(`     Mentions khai sinh: ${resA3.answer.toLowerCase().includes('khai sinh')}`);
  console.log(`     Mentions time/duration: ${resA3.answer.toLowerCase().includes('thời hạn') || resA3.answer.toLowerCase().includes('ngày làm việc')}`);

  historyA.push({ sender: 'citizen', text: qA3 });
  historyA.push({ sender: 'bot', text: resA3.answer, procedureCode: 'TTHC-HT-01' });

  // Step A4: Follow up: "nơi nộp ở đâu?"
  const qA4 = 'nơi nộp ở đâu?';
  const resA4 = await askLegalRag(qA4, 3, wardContext, historyA);
  console.log(`\n[A4] Query: "${qA4}"`);
  console.log(`     Abstained: ${resA4.abstained}`);
  console.log(`     Answer preview: ${resA4.answer.slice(0, 150)}...`);
  console.log(`     Mentions khai sinh: ${resA4.answer.toLowerCase().includes('khai sinh')}`);
  console.log(`     Mentions submission location: ${resA4.answer.toLowerCase().includes('tiếp nhận') || resA4.answer.toLowerCase().includes('một cửa') || resA4.answer.toLowerCase().includes('ubnd')}`);

  // -------------------------------------------------------------
  // Sequence B: Residence Registration (TTHC-CT-01) Multi-Turn
  // -------------------------------------------------------------
  console.log('\n--- SEQUENCE B: Residence Registration Multi-Turn ---');
  
  // Test B variant 1: "Thủ tục đăng ký cư trú (TTHC-CT-01) cần giấy tờ gì?"
  console.log('\nTest B1: Query mentioning residence with code TTHC-CT-01');
  const historyB1 = [];
  const qB1 = 'Tôi muốn hỏi về thủ tục đăng ký cư trú (TTHC-CT-01) cần giấy tờ gì?';
  const resB1 = await askLegalRag(qB1, 3, wardContext, historyB1);
  console.log(`[B1] Query: "${qB1}"`);
  console.log(`     Abstained: ${resB1.abstained}`);
  console.log(`     Answer preview: ${resB1.answer.slice(0, 150)}...`);
  console.log(`     Top citation: ${resB1.citations?.[0]?.procedureCode} - ${resB1.citations?.[0]?.procedureName}`);

  historyB1.push({ sender: 'citizen', text: qB1 });
  historyB1.push({ sender: 'bot', text: resB1.answer, procedureCode: resB1.citations?.[0]?.procedureCode || 'TTHC-CR-01' });

  const qB1_2 = 'còn lệ phí bao nhiêu?';
  const resB1_2 = await askLegalRag(qB1_2, 3, wardContext, historyB1);
  console.log(`[B1_2] Follow-up: "${qB1_2}"`);
  console.log(`       Abstained: ${resB1_2.abstained}`);
  console.log(`       Answer preview: ${resB1_2.answer.slice(0, 200)}...`);
  console.log(`       Mentions residence/thường trú/cư trú: ${resB1_2.answer.toLowerCase().includes('thường trú') || resB1_2.answer.toLowerCase().includes('cư trú') || resB1_2.answer.toLowerCase().includes('ct01')}`);
  console.log(`       Fee details: ${resB1_2.answer.toLowerCase().includes('lệ phí') || resB1_2.answer.toLowerCase().includes('10.000') || resB1_2.answer.toLowerCase().includes('20.000') || resB1_2.answer.toLowerCase().includes('miễn phí')}`);

  // Test B variant 2: "Thủ tục đăng ký thường trú (TTHC-CR-01)"
  console.log('\nTest B2: Query mentioning residence registration TTHC-CR-01');
  const historyB2 = [];
  const qB2 = 'Tôi muốn đăng ký thường trú thì cần giấy tờ gì?';
  const resB2 = await askLegalRag(qB2, 3, wardContext, historyB2);
  console.log(`[B2] Query: "${qB2}"`);
  console.log(`     Answer preview: ${resB2.answer.slice(0, 120)}...`);
  historyB2.push({ sender: 'citizen', text: qB2 });
  historyB2.push({ sender: 'bot', text: resB2.answer, procedureCode: 'TTHC-CR-01' });

  const qB2_2 = 'còn lệ phí bao nhiêu?';
  const resB2_2 = await askLegalRag(qB2_2, 3, wardContext, historyB2);
  console.log(`[B2_2] Follow-up: "${qB2_2}"`);
  console.log(`       Abstained: ${resB2_2.abstained}`);
  console.log(`       Answer preview: ${resB2_2.answer.slice(0, 180)}...`);
  console.log(`       Mentions residence/thường trú: ${resB2_2.answer.toLowerCase().includes('thường trú') || resB2_2.answer.toLowerCase().includes('cư trú')}`);

  // -------------------------------------------------------------
  // Sequence C: Out-of-Scope Queries (Passport, Driver License, Gold Price, Crypto)
  // -------------------------------------------------------------
  console.log('\n--- SEQUENCE C: Out-of-Scope Queries ---');
  const outOfScopeCases = [
    { name: 'Passport', q: 'Tôi muốn làm hộ chiếu passport để đi du lịch nước ngoài thì làm ở đâu?' },
    { name: 'Driver License', q: 'Cho tôi hỏi thủ tục đổi bằng lái xe ô tô B2 hết hạn?' },
    { name: 'Gold Price', q: 'Hôm nay giá vàng miếng SJC bao nhiêu tiền một chỉ vậy bạn?' },
    { name: 'Crypto', q: 'Tôi muốn mua đồng tiền ảo Bitcoin crypto thì đầu tư sàn nào an toàn?' }
  ];

  for (const c of outOfScopeCases) {
    const res = await askLegalRag(c.q, 3, wardContext);
    const sentences = res.answer
      .trim()
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0 && !s.startsWith('*Lưu ý'));
    
    console.log(`\nCase [${c.name}]: Query "${c.q}"`);
    console.log(`   Abstained: ${res.abstained}`);
    console.log(`   Sentence count: ${sentences.length} (must be <= 2)`);
    console.log(`   Sentences:`);
    sentences.forEach((s, idx) => console.log(`     ${idx + 1}. ${s}`));
    console.log(`   Suggestions: ${JSON.stringify(res.suggestions)}`);
  }
}

testSequences().catch(err => {
  console.error('Test error:', err);
});
