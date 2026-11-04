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
  console.log('Answer:\n' + resHi.answer);
  if (resHi.answer.includes('Đăng ký khai sinh là thủ tục ghi nhận')) {
    console.error('❌ FAILED: Still returning Birth Registration on "hi"!');
    process.exit(1);
  }
  if (!resHi.answer.includes('Xin chào! Tôi là Trợ lý Pháp lý Một Cửa tại UBND Xã An Phú')) {
    console.error('❌ FAILED: Missing friendly greeting!');
    process.exit(1);
  }

  // Test 2: User asks for Birth Registration
  console.log('\n[TEST 2] User asks: "Tôi muốn làm khai sinh cho con mới sinh cần giấy tờ gì"');
  const resBirth = await askLegalRag('Tôi muốn làm khai sinh cho con mới sinh cần giấy tờ gì', 3, ward);
  console.log('Abstained:', resBirth.abstained);
  console.log('Answer excerpt:\n' + resBirth.answer.substring(0, 300) + '...');
  if (!resBirth.answer.includes('1. TÓM TẮT THỦ TỤC:') || !resBirth.answer.includes('2. THÀNH PHẦN HỒ SƠ:')) {
    console.error('❌ FAILED: Procedure response not in 5-part format!');
    process.exit(1);
  }

  // Test 3: User asks for ward address/hours
  console.log('\n[TEST 3] User asks: "địa chỉ ủy ban ở đâu"');
  const resAddr = await askLegalRag('địa chỉ ủy ban ở đâu', 3, ward);
  console.log('Answer:\n' + resAddr.answer);
  if (!resAddr.answer.includes('Đường Thoại Ngọc Hầu, Xã An Phú')) {
    console.error('❌ FAILED: Ward office address not returned correctly!');
    process.exit(1);
  }

  // Test 4: User asks out-of-scope question
  console.log('\n[TEST 4] User asks: "làm hộ chiếu đi du lịch nước ngoài"');
  const resOos = await askLegalRag('làm hộ chiếu đi du lịch nước ngoài', 3, ward);
  console.log('Abstained:', resOos.abstained);
  console.log('Answer:\n' + resOos.answer);
  if (!resOos.abstained || !resOos.answer.includes('Phòng Quản lý xuất nhập cảnh')) {
    console.error('❌ FAILED: Out of scope not directing to Immigration!');
    process.exit(1);
  }

  console.log('\n🎉 ALL 4 END-TO-END RAG RESPONSE TESTS PASSED WITH DISTINCTION!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
