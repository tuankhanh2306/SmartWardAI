import { askLegalRag } from '../src/api/client.js';

async function run() {
  console.log('--- Testing askLegalRag Responses ---');

  const ward = {
    wardName: 'Xã An Phú, Tỉnh An Giang',
    officeAddress: 'Đường Thoại Ngọc Hầu, Xã An Phú, Tỉnh An Giang',
    phoneNumber: '(0296) 3826 123',
    workingHours: 'Sáng: 07:00 – 11:00 | Chiều: 13:00 – 17:00 (Thứ 2 – Thứ 6)',
  };

  // Test 1: User says "hi"
  console.log('\n[TEST 1] User asks: "hi"');
  const resHi = await askLegalRag('hi', 3, ward);
  console.log('Abstained:', resHi.abstained);
  console.log('Answer excerpt:\n' + resHi.answer.substring(0, 150) + '...');
  if (resHi.abstained) {
    console.error('❌ FAILED: "hi" should NOT be abstained!');
    process.exit(1);
  }
  if (!resHi.answer.includes('Xin chào! Tôi là Trợ lý Pháp lý Một Cửa tại UBND Xã An Phú')) {
    console.error('❌ FAILED: Missing friendly greeting!');
    process.exit(1);
  }

  // Test 2: User asks "hôm nay thế nào"
  console.log('\n[TEST 2] User asks: "hôm nay thế nào"');
  const resWellbeing = await askLegalRag('hôm nay thế nào', 3, ward);
  console.log('Abstained:', resWellbeing.abstained);
  console.log('Answer:\n' + resWellbeing.answer);
  if (resWellbeing.abstained) {
    console.error('❌ FAILED: "hôm nay thế nào" should NOT be abstained!');
    process.exit(1);
  }
  if (!resWellbeing.answer.toLowerCase().includes('hôm nay tôi vẫn hoạt động bình thường 24/7')) {
    console.error('❌ FAILED: Wellbeing response did not match expected phrasing!');
    process.exit(1);
  }

  // Test 3: User asks "nêu 40 thủ tục"
  console.log('\n[TEST 3] User asks: "nêu 40 thủ tục"');
  const resList = await askLegalRag('nêu 40 thủ tục', 3, ward);
  console.log('Abstained:', resList.abstained);
  console.log('Answer excerpt:\n' + resList.answer.substring(0, 300) + '...');
  if (resList.abstained) {
    console.error('❌ FAILED: "nêu 40 thủ tục" should NOT be abstained!');
    process.exit(1);
  }
  if (!resList.answer.includes('LĨNH VỰC HỘ TỊCH & NHÂN THÂN') || !resList.answer.includes('TTHC-HT-01')) {
    console.error('❌ FAILED: Procedure catalog not returned!');
    process.exit(1);
  }

  // Test 4: User asks for Birth Registration
  console.log('\n[TEST 4] User asks: "Tôi muốn làm khai sinh cho con mới sinh cần giấy tờ gì"');
  const resBirth = await askLegalRag('Tôi muốn làm khai sinh cho con mới sinh cần giấy tờ gì', 3, ward);
  console.log('Abstained:', resBirth.abstained);
  console.log('Answer excerpt:\n' + resBirth.answer.substring(0, 200) + '...');
  if (!resBirth.answer.includes('1. TÓM TẮT THỦ TỤC:') || !resBirth.answer.includes('2. THÀNH PHẦN HỒ SƠ:')) {
    console.error('❌ FAILED: Procedure response not in 5-part format!');
    process.exit(1);
  }

  // Test 5: User asks for ward address/hours
  console.log('\n[TEST 5] User asks: "địa chỉ ủy ban ở đâu"');
  const resAddr = await askLegalRag('địa chỉ ủy ban ở đâu', 3, ward);
  console.log('Answer:\n' + resAddr.answer);
  if (!resAddr.answer.includes('Đường Thoại Ngọc Hầu, Xã An Phú')) {
    console.error('❌ FAILED: Ward office address not returned correctly!');
    process.exit(1);
  }

  // Test 6: User asks out-of-scope question
  console.log('\n[TEST 6] User asks: "làm hộ chiếu đi du lịch nước ngoài"');
  const resOos = await askLegalRag('làm hộ chiếu đi du lịch nước ngoài', 3, ward);
  console.log('Abstained:', resOos.abstained);
  console.log('Answer:\n' + resOos.answer);
  if (!resOos.abstained || !resOos.answer.includes('Phòng Quản lý xuất nhập cảnh')) {
    console.error('❌ FAILED: Out of scope not directing to Immigration!');
    process.exit(1);
  }

  console.log('\n🎉 ALL 6 END-TO-END RAG RESPONSE TESTS PASSED WITH DISTINCTION!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
