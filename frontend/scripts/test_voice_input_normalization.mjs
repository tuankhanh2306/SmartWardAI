import assert from 'node:assert';
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

const { normalizeVoiceTranscript } = await import('../src/hooks/useVoiceInput.ts');

console.log('================================================================');
console.log('SMARTWARD AI - VOICE INPUT SPEECH-TO-TEXT NORMALIZATION TEST');
console.log('================================================================');

let passed = 0;
let total = 0;

function test(description, input, expectedSubstring) {
  total++;
  const result = normalizeVoiceTranscript(input);
  const ok = result.toLowerCase().includes(expectedSubstring.toLowerCase());
  if (ok) {
    passed++;
    console.log(`  ✓ PASS: "${input}" -> "${result}" (contains "${expectedSubstring}")`);
  } else {
    console.error(`  ✗ FAIL: "${input}" -> "${result}" (expected to contain "${expectedSubstring}")`);
    assert.fail(`Test failed: expected "${result}" to contain "${expectedSubstring}"`);
  }
}

// 1. Phục hồi mã mẫu đơn hành chính cư trú (CT01, CT02, CT07, CT08...)
test('Spoken CT01 with xe te', 'tôi muốn làm tờ khai xê tê không một', 'CT01');
test('Spoken CT01 with ce te', 'hướng dẫn nộp mẫu cê tê không một', 'CT01');
test('Spoken CT01 with c t', 'nộp biểu mẫu c t không một ở đâu', 'CT01');
test('Spoken CT01 with digits space', 'mẫu c t 0 1 đăng ký thường trú', 'CT01');
test('Spoken CT07 (xác nhận thông tin cư trú)', 'xin giấy xác nhận cư trú xê tê không bảy', 'CT07');
test('Spoken CT08 (thông báo cư trú)', 'hướng dẫn xê tê không tám cho chủ trọ', 'CT08');
test('Spoken generic CT abbreviation', 'thủ tục khai xê tê', 'CT');

// 2. Viết tắt cơ quan và ứng dụng công vụ
test('Spoken UBND', 'đến u b e n đ ê rạch giá lúc mấy giờ', 'UBND');
test('Spoken VNeID (ve ne i d)', 'hướng dẫn đăng ký tài khoản v e n e i d mức hai', 'VNeID');
test('Spoken VNeID (ve ne ai đi)', 'tích hợp giấy tờ vào vê nê ai đi', 'VNeID');
test('Spoken CCCD', 'quên mang theo c c c d gắn chip', 'CCCD');

// 3. Số đếm ghép chữ tiếng Việt
test('Spoken numbers "không một"', 'thủ tục số không một', '01');
test('Spoken numbers "không hai"', 'thủ tục số không hai', '02');
test('Spoken numbers "không bảy"', 'mẫu giấy số không bảy', '07');

// 4. Giữ nguyên câu nói thông thường không có mã
test('Normal civic speech unaffected', 'tôi muốn làm khai sinh cho con', 'tôi muốn làm khai sinh cho con');
test('Normal marriage speech unaffected', 'thủ tục đăng ký kết hôn cần giấy gì', 'thủ tục đăng ký kết hôn cần giấy gì');
test('Empty string check', '', '');

console.log('================================================================');
console.log(`VOICE NORMALIZATION TEST RESULTS:`);
console.log(`  Total: ${total}`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${total - passed}`);
console.log('================================================================');
console.log('🎉 ALL VOICE TRANSCRIPT NORMALIZATION TESTS PASSED!\n');
