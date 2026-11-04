import { isGreetingQuery, isWardOfficeQuery, checkOutOfScopeQuery } from '../src/services/intentClassifier.js';
import { searchLegalKnowledge } from '../src/services/legalKnowledgeBase.js';

console.log('Testing SmartWard AI Intent Classification & Legal Search:');

const testCases = [
  { query: 'hi', expectedGreeting: true, expectedInScope: false },
  { query: 'hello', expectedGreeting: true, expectedInScope: false },
  { query: 'xin chào', expectedGreeting: true, expectedInScope: false },
  { query: 'chào cán bộ', expectedGreeting: true, expectedInScope: false },
  { query: 'bạn là ai', expectedGreeting: true, expectedInScope: false },
  { query: 'bạn có thể làm gì', expectedGreeting: true, expectedInScope: false },
  { query: 'Tôi muốn làm thủ tục đăng ký khai sinh cho cháu mới sinh tại Xã An Phú cần giấy tờ gì và mất bao lâu?', expectedGreeting: false, expectedInScope: true, expectedProc: 'TTHC-HT-01' },
  { query: 'kết hôn cần mang gì', expectedGreeting: false, expectedInScope: true, expectedProc: 'TTHC-HT-02' },
  { query: 'hướng dẫn nộp mẫu CT01 thường trú', expectedGreeting: false, expectedInScope: true, expectedProc: 'TTHC-CR-01' },
  { query: 'địa chỉ ubnd ở đâu', expectedWardInfo: true, expectedGreeting: false },
  { query: 'mấy giờ tiếp dân', expectedWardInfo: true, expectedGreeting: false },
  { query: 'giá vàng hôm nay', expectedOutOfScope: true },
  { query: 'làm hộ chiếu đi nước ngoài', expectedOutOfScope: true },
];

let failed = 0;

for (const tc of testCases) {
  const isGreet = isGreetingQuery(tc.query);
  const isWard = isWardOfficeQuery(tc.query);
  const oos = checkOutOfScopeQuery(tc.query);
  const legal = searchLegalKnowledge(tc.query, 1);

  console.log(`\nQuery: "${tc.query}"`);
  console.log(`  -> isGreeting: ${isGreet}`);
  console.log(`  -> isWardOffice: ${isWard}`);
  console.log(`  -> isOutOfScope: ${oos.isOutOfScope}`);
  console.log(`  -> isInScope (Procedure): ${legal.isInScope}, topMatch: ${legal.items[0]?.code || 'NONE'}`);

  if (tc.expectedGreeting !== undefined && isGreet !== tc.expectedGreeting) {
    console.error(`  FAIL: expectedGreeting=${tc.expectedGreeting}, got=${isGreet}`);
    failed++;
  }
  if (tc.expectedWardInfo !== undefined && isWard !== tc.expectedWardInfo) {
    console.error(`  FAIL: expectedWardInfo=${tc.expectedWardInfo}, got=${isWard}`);
    failed++;
  }
  if (tc.expectedOutOfScope !== undefined && oos.isOutOfScope !== tc.expectedOutOfScope) {
    console.error(`  FAIL: expectedOutOfScope=${tc.expectedOutOfScope}, got=${oos.isOutOfScope}`);
    failed++;
  }
  if (tc.expectedInScope !== undefined && legal.isInScope !== tc.expectedInScope) {
    console.error(`  FAIL: expectedInScope=${tc.expectedInScope}, got=${legal.isInScope}`);
    failed++;
  }
  if (tc.expectedProc && legal.items[0]?.code !== tc.expectedProc) {
    console.error(`  FAIL: expectedProc=${tc.expectedProc}, got=${legal.items[0]?.code}`);
    failed++;
  }
}

if (failed === 0) {
  console.log('\n✅ ALL INTENT AND RAG TESTS PASSED SUCCESSFULLY!');
} else {
  console.error(`\n❌ ${failed} TEST(S) FAILED!`);
  process.exit(1);
}
