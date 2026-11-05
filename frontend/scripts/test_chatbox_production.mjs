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

async function runProductionChatboxTests() {
  console.log('================================================================');
  console.log('SMARTWARD AI PRODUCTION CHATBOX ACCEPTANCE TEST SUITE (M1)');
  console.log('================================================================');

  const wardContext = {
    wardName: 'Xã An Phú, Tỉnh An Giang',
    officeAddress: 'Đường Thoại Ngọc Hầu, Xã An Phú, Huyện An Phú, Tỉnh An Giang',
    phoneNumber: '(0296) 3826 123',
    workingHours: 'Sáng: 07:30 – 11:30 | Chiều: 13:30 – 17:00 (Thứ 2 – Thứ 6)',
  };

  let totalPassed = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (!condition) {
      console.error(`  ❌ FAILED: ${message}`);
      process.exit(1);
    }
    console.log(`  ✓ [PASS] ${message}`);
    totalPassed++;
  }

  // =================================================================
  // SCENARIO 1: Misspelled & Telex Greetings ("chaogf ban", "xin chaof")
  // =================================================================
  console.log('\n--- SCENARIO 1: Misspelled & Telex Greetings ---');

  const typoQueries = ['chaogf ban', 'xin chaof', 'chao ban', 'helo'];
  for (const tq of typoQueries) {
    const res = await askLegalRag(tq, 3, wardContext);
    assert(!res.abstained, `Typo greeting "${tq}" must NOT be abstained (abstained=${res.abstained})`);
    assert(
      res.answer.includes('Trợ lý Pháp lý Một Cửa') || res.answer.includes('Xin chào'),
      `Typo greeting "${tq}" must return friendly greeting welcoming citizens`
    );
    assert(
      Array.isArray(res.suggestions) && res.suggestions.length > 0,
      `Typo greeting "${tq}" must provide quick suggestion chips (found: ${res.suggestions?.length || 0})`
    );
  }

  // =================================================================
  // SCENARIO 2: Vague & Open Consultation ("bạn có thể tư vấn cho tôi không")
  // =================================================================
  console.log('\n--- SCENARIO 2: Vague & Open Consultation Inquiries ---');

  const vagueQueries = [
    'bạn có thể tư vấn cho tôi không',
    'tư vấn giúp tôi',
    'cho tôi hỏi chút',
    'tu van giup toi',
  ];
  for (const vq of vagueQueries) {
    const res = await askLegalRag(vq, 3, wardContext);
    assert(!res.abstained, `Vague inquiry "${vq}" must NOT trigger safe abstention (abstained=${res.abstained})`);
    assert(
      res.answer.includes('tư vấn') && (res.answer.includes('Hộ tịch') || res.answer.includes('khai sinh')),
      `Vague inquiry "${vq}" proactively clarifies needs with civic service domains`
    );
    assert(
      Array.isArray(res.suggestions) && res.suggestions.length >= 3,
      `Vague inquiry "${vq}" provides at least 3 domain suggestion chips`
    );
  }

  // =================================================================
  // SCENARIO 3: Multi-turn Conversational Context (3-5 turns)
  // =================================================================
  console.log('\n--- SCENARIO 3: Multi-turn Context Conversation (Marriage Inquiry Follow-ups) ---');

  const conversationHistory = [];

  // Turn 1: Initial Marriage Inquiry
  console.log('\n  [Turn 1] Initial Inquiry: "Thủ tục đăng ký kết hôn cần giấy tờ gì?"');
  const t1Query = 'Thủ tục đăng ký kết hôn cần giấy tờ gì?';
  const t1Res = await askLegalRag(t1Query, 3, wardContext, conversationHistory);
  assert(!t1Res.abstained, 'Turn 1 marriage registration inquiry must be answered');
  assert(t1Res.answer.includes('1. TÓM TẮT THỦ TỤC:'), 'Turn 1 contains 5-section administrative format');
  assert(
    Array.isArray(t1Res.suggestions) && t1Res.suggestions.length > 0,
    'Turn 1 provides relevant follow-up suggestion chips'
  );

  conversationHistory.push({ sender: 'citizen', text: t1Query });
  conversationHistory.push({
    sender: 'bot',
    text: t1Res.answer,
    procedureCode: t1Res.citations?.[0]?.procedureCode || 'TTHC-HT-02',
  });

  // Turn 2: Follow-up on Fee without explicit procedure subject
  console.log('\n  [Turn 2] Follow-up Fee: "còn lệ phí bao nhiêu?"');
  const t2Query = 'còn lệ phí bao nhiêu?';
  const t2Res = await askLegalRag(t2Query, 3, wardContext, conversationHistory);
  assert(!t2Res.abstained, 'Turn 2 follow-up "còn lệ phí bao nhiêu?" must NOT be abstained');
  assert(
    t2Res.answer.toLowerCase().includes('kết hôn') || t2Res.answer.toLowerCase().includes('miễn phí'),
    'Turn 2 accurately answers marriage fee (Miễn phí) using conversational context'
  );

  conversationHistory.push({ sender: 'citizen', text: t2Query });
  conversationHistory.push({
    sender: 'bot',
    text: t2Res.answer,
    procedureCode: 'TTHC-HT-02',
  });

  // Turn 3: Follow-up on Time Duration
  console.log('\n  [Turn 3] Follow-up Duration: "mất bao lâu có kết quả?"');
  const t3Query = 'mất bao lâu có kết quả?';
  const t3Res = await askLegalRag(t3Query, 3, wardContext, conversationHistory);
  assert(!t3Res.abstained, 'Turn 3 follow-up duration must NOT be abstained');
  assert(
    t3Res.answer.toLowerCase().includes('ngày làm việc') || t3Res.answer.toLowerCase().includes('thời hạn'),
    'Turn 3 accurately returns resolution timeframe for the active procedure'
  );

  conversationHistory.push({ sender: 'citizen', text: t3Query });
  conversationHistory.push({
    sender: 'bot',
    text: t3Res.answer,
    procedureCode: 'TTHC-HT-02',
  });

  // Turn 4: Follow-up on Submission Location
  console.log('\n  [Turn 4] Follow-up Location: "nộp ở đâu?"');
  const t4Query = 'nộp ở đâu?';
  const t4Res = await askLegalRag(t4Query, 3, wardContext, conversationHistory);
  assert(!t4Res.abstained, 'Turn 4 follow-up location must NOT be abstained');
  assert(
    t4Res.answer.toLowerCase().includes('một cửa') || t4Res.answer.toLowerCase().includes('ubnd'),
    'Turn 4 accurately returns receiving authority for the active procedure'
  );

  // =================================================================
  // SCENARIO 4: Out-of-Scope Concise Safe Refusal (<= 2 sentences + guidance)
  // =================================================================
  console.log('\n--- SCENARIO 4: Out-of-Scope Concise Safe Refusal ---');

  const outOfScopeQueries = [
    { q: 'làm hộ chiếu đi nước ngoài', authority: 'xuất nhập cảnh' },
    { q: 'đổi bằng lái xe b2', authority: 'Giao thông' },
    { q: 'giá vàng hôm nay', authority: null },
  ];

  for (const item of outOfScopeQueries) {
    const res = await askLegalRag(item.q, 3, wardContext);
    assert(res.abstained, `Out-of-scope query "${item.q}" must be safely abstained (abstained=true)`);

    // Sentence count validation: split by sentence terminators
    const rawSentences = res.answer
      .trim()
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0 && !s.startsWith('*Lưu ý'));
    assert(
      rawSentences.length <= 2,
      `Safe refusal for "${item.q}" must be concise and NOT exceed 2 sentences (actual count: ${rawSentences.length})`
    );

    if (item.authority) {
      assert(
        res.answer.toLowerCase().includes(item.authority.toLowerCase()),
        `Safe refusal for "${item.q}" must direct to competent authority (${item.authority})`
      );
    }

    assert(
      Array.isArray(res.suggestions) && res.suggestions.length > 0,
      `Safe refusal for "${item.q}" must include suggestion chips redirecting citizen to valid procedures`
    );
  }

  console.log('\n================================================================');
  console.log(`SUMMARY: All ${totalPassed}/${totalTests} production chatbox tests PASSED!`);
  console.log('================================================================\n');
}

runProductionChatboxTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
