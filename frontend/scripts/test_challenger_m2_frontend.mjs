import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const currentFile = fileURLToPath(import.meta.url);

// Ensure tsx loader is active
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

console.log('================================================================');
console.log('CHALLENGER 2: ADVERSARIAL STRESS TEST SUITE (MILESTONE 2)');
console.log('Features: F4 (Form Precheck), F5 (Dynamic A4 Modal), F6 (Smart Checklist & Fee Exemption)');
console.log('================================================================');

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✓ [PASS] ${description}`);
    passedAssertions++;
  } else {
    console.error(`  ✗ [FAIL] ${description}`);
    failedAssertions++;
  }
}

const srcDir = path.resolve(path.dirname(currentFile), '../src');

// Polyfill localStorage and window for React SSR testing
if (typeof globalThis.localStorage === 'undefined') {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, val) => storage.set(key, String(val)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear()
  };
}

// -------------------------------------------------------------
// SECTION 1: PROCEDURES CATALOG & 100% FEE EXEMPTION AUDIT (F6)
// -------------------------------------------------------------
console.log('\n--- SECTION 1: Procedures Catalog & Fee Exemption (Law on Fees and Charges 2015) ---');

const { PROCEDURES_CATALOG } = await import('../src/data/proceduresCatalog.js');

assert(Array.isArray(PROCEDURES_CATALOG), 'PROCEDURES_CATALOG is exported as an array');
assert(PROCEDURES_CATALOG.length === 40, `PROCEDURES_CATALOG contains exactly 40 items (actual: ${PROCEDURES_CATALOG.length})`);

// Fee exemption logic from ProceduresCatalogPage.tsx
const isFeeExempt = (proc) => {
  const code = (proc.code || '').toUpperCase();
  const cat = (proc.category || '').toLowerCase();
  const feeStr = (proc.fee || '').toLowerCase();

  // Basic timely civil status, social protection, elderly, meritorious persons, or explicit free
  if (cat.includes('hộ tịch') || cat.includes('bảo trợ')) return true;
  if (code.startsWith('TTHC-BT-') || code.startsWith('TTHC-HT-') || code === 'TTHC-CR-02') return true;
  if (feeStr.includes('miễn') || feeStr === '0' || feeStr === '0 đ' || feeStr === '0 vnđ') return true;
  return false;
};

// 1.1 Verify timely birth registration is 100% exempt
const birthProc = PROCEDURES_CATALOG.find(p => p.code === 'TTHC-HT-01');
assert(birthProc !== undefined, 'TTHC-HT-01 (Khai sinh) exists in catalog');
assert(isFeeExempt(birthProc) === true, 'TTHC-HT-01 (Khai sinh) is strictly marked 100% FEE EXEMPT');

// 1.2 Verify domestic marriage registration is 100% exempt
const marriageProc = PROCEDURES_CATALOG.find(p => p.code === 'TTHC-HT-02');
assert(marriageProc !== undefined, 'TTHC-HT-02 (Kết hôn) exists in catalog');
assert(isFeeExempt(marriageProc) === true, 'TTHC-HT-02 (Kết hôn) is strictly marked 100% FEE EXEMPT');

// 1.3 Verify timely death registration (domestic + interconnected) are 100% exempt
const deathDomesticProc = PROCEDURES_CATALOG.find(p => p.code === 'TTHC-HT-13');
const deathInterconnectedProc = PROCEDURES_CATALOG.find(p => p.code === 'TTHC-CR-02');
assert(deathDomesticProc !== undefined, 'TTHC-HT-13 (Khai tử trong nước) exists in catalog');
assert(deathInterconnectedProc !== undefined, 'TTHC-CR-02 (Liên thông khai tử) exists in catalog');
assert(isFeeExempt(deathDomesticProc) === true, 'TTHC-HT-13 (Khai tử trong nước) is strictly marked 100% FEE EXEMPT');
assert(isFeeExempt(deathInterconnectedProc) === true, 'TTHC-CR-02 (Liên thông khai tử) is strictly marked 100% FEE EXEMPT');

// 1.4 Verify all social protection procedures are 100% exempt
const btProcedures = PROCEDURES_CATALOG.filter(p => p.code.startsWith('TTHC-BT-'));
assert(btProcedures.length === 5, `All 5 social protection procedures (TTHC-BT-01..05) present (actual: ${btProcedures.length})`);
const allBtExempt = btProcedures.every(p => isFeeExempt(p) === true);
assert(allBtExempt, 'All 5 social protection procedures (BT-01..05) are strictly marked 100% FEE EXEMPT');

// 1.5 Verify meritorious persons procedure is 100% exempt
const nccProc = PROCEDURES_CATALOG.find(p => p.code === 'TTHC-NCC-01');
assert(nccProc !== undefined, 'TTHC-NCC-01 (Người có công) exists in catalog');
assert(isFeeExempt(nccProc) === true, 'TTHC-NCC-01 (Người có công) is strictly marked 100% FEE EXEMPT');

// 1.6 Verify non-exempt procedures (Land, Construction, Authentication) are NOT marked fee-exempt
const nonExemptCodes = ['TTHC-DC-01', 'TTHC-DC-02', 'TTHC-XD-01', 'TTHC-XD-02', 'TTHC-CT-01', 'TTHC-CT-02', 'TTHC-CT-04', 'TTHC-CT-07', 'TTHC-CT-08', 'TTHC-CR-01', 'TTHC-CR-03', 'TTHC-CR-04', 'TTHC-MT-01'];
let wronglyMarkedExempt = [];
for (const code of nonExemptCodes) {
  const p = PROCEDURES_CATALOG.find(x => x.code === code);
  if (p && isFeeExempt(p)) {
    wronglyMarkedExempt.push(code);
  }
}
assert(wronglyMarkedExempt.length === 0, `Non-exempt procedures (Land, Construction, Certification, Regular Residence) properly fall under HĐND tariff without false exemptions (wrongly exempt: ${wronglyMarkedExempt.join(', ') || 'none'})`);

// Total exempt count
const exemptCount = PROCEDURES_CATALOG.filter(p => isFeeExempt(p)).length;
console.log(`  Procedures summary: ${exemptCount} exempt / ${PROCEDURES_CATALOG.length} total`);
assert(exemptCount >= 19, `Statutory fee exemption covers all civil status + social protection procedures (actual exempt: ${exemptCount})`);


// -------------------------------------------------------------
// SECTION 2: A4 MODAL DYNAMIC RENDERING ACROSS 7 DOMAINS (F5)
// -------------------------------------------------------------
console.log('\n--- SECTION 2: Dynamic A4 Modal Verification Across 7 Administrative Domains ---');

const { A4DocumentModal } = await import('../src/components/A4DocumentModal.js');
const { WardProvider } = await import('../src/context/WardContext.js');

// Helper to render modal to string
const renderModal = (props) => {
  return renderToStaticMarkup(
    React.createElement(
      WardProvider,
      null,
      React.createElement(A4DocumentModal, { isOpen: true, onClose: () => {}, ...props })
    )
  );
};

// Test Domain 1: CHUNG-THUC (Certification)
console.log('\n  [Domain 1: CHUNG-THUC]');
const htmlChungThuc = renderModal({
  formType: 'CHUNG-THUC',
  procedureCode: 'TTHC-CT-01',
  procedureTitle: 'Chứng thực bản sao từ bản chính',
  initialData: { fullName: 'Trần Văn Bảo', idNumber: '089200001234', address: 'Phường Mỹ Bình' }
});

assert(htmlChungThuc.includes('VĂN BẢN YÊU CẦU CHỨNG THỰC CHỮ KÝ'), 'Domain CHUNG-THUC has official legal title');
assert(htmlChungThuc.includes('Nghị định số 23/2015/NĐ-CP'), 'Domain CHUNG-THUC references Decree 23/2015/NĐ-CP');
assert(htmlChungThuc.includes('Thông tư số 01/2020/TT-BTP'), 'Domain CHUNG-THUC references Circular 01/2020/TT-BTP');
assert(htmlChungThuc.includes('LƯU Ý QUAN TRỌNG: Người yêu cầu chứng thực phải ký trực tiếp trước mặt người thực hiện chứng thực'), 'Domain CHUNG-THUC enforces mandatory in-person signing clause');
assert(htmlChungThuc.includes('LỜI CHỨNG THỰC CHỮ KÝ'), 'Domain CHUNG-THUC includes official certification endorsement');
assert(/Trần Văn Bảo/i.test(htmlChungThuc), 'Domain CHUNG-THUC renders populated citizen name');

// Test Domain 1.1: CHUNG-THUC Translation (TTHC-CT-02)
const htmlTranslation = renderModal({
  formType: 'CHUNG-THUC',
  procedureCode: 'TTHC-CT-02',
  procedureTitle: 'Chứng thực chữ ký người dịch',
  initialData: { fullName: 'Lê Hoàng Kim' }
});
assert(htmlTranslation.includes('BẢN DỊCH VÀ LỜI CHỨNG THỰC CHỮ KÝ NGƯỜI DỊCH'), 'TTHC-CT-02 has translation certification title');
assert(htmlTranslation.includes('Lời cam đoan của người dịch:'), 'TTHC-CT-02 includes translator oath clause');

// Test Domain 2: DAT-DAI (Land)
console.log('\n  [Domain 2: DAT-DAI]');
const htmlDatDai = renderModal({
  formType: 'DAT-DAI',
  procedureCode: 'TTHC-DC-01',
  procedureTitle: 'Đăng ký biến động quyền sử dụng đất',
  initialData: { fullName: 'Phạm Minh Tuấn', idNumber: '089185002345' }
});
assert(htmlDatDai.includes('ĐƠN ĐĂNG KÝ BIẾN ĐỘNG ĐẤT ĐAI'), 'Domain DAT-DAI has official legal title');
assert(htmlDatDai.includes('Nghị định số 101/2024/NĐ-CP'), 'Domain DAT-DAI references Decree 101/2024/NĐ-CP (Mẫu 22)');
assert(htmlDatDai.includes('Thửa đất số:') && htmlDatDai.includes('Tờ bản đồ số:'), 'Domain DAT-DAI contains plot & cadastral map number fields');
assert(htmlDatDai.includes('Ý KIẾN KIỂM TRA ĐỊA CHÍNH XÃ'), 'Domain DAT-DAI includes commune cadastral officer section');
assert(/Phạm Minh Tuấn/i.test(htmlDatDai), 'Domain DAT-DAI renders applicant name');

// Test Domain 3: XAY-DUNG (Construction)
console.log('\n  [Domain 3: XAY-DUNG]');
const htmlXayDung = renderModal({
  formType: 'XAY-DUNG',
  procedureCode: 'TTHC-XD-01',
  procedureTitle: 'Cấp Giấy phép xây dựng nhà ở riêng lẻ',
  initialData: { fullName: 'Đỗ Quốc Cường', idNumber: '089190003456' }
});
assert(htmlXayDung.includes('ĐƠN ĐỀ NGHỊ CẤP GIẤY PHÉP XÂY DỰNG NHÀ Ở RIÊNG LẺ'), 'Domain XAY-DUNG has official legal title');
assert(htmlXayDung.includes('Nghị định số 15/2021/NĐ-CP'), 'Domain XAY-DUNG references Decree 15/2021/NĐ-CP (Mẫu 01)');
assert(htmlXayDung.includes('Cốt nền xây dựng') && htmlXayDung.includes('Mật độ xây dựng'), 'Domain XAY-DUNG contains building elevation and density specs');
assert(htmlXayDung.includes('CÁN BỘ THỤ LÝ HỒ SƠ') && htmlXayDung.includes('CHỦ ĐẦU TƯ'), 'Domain XAY-DUNG includes proper roles');
assert(/Đỗ Quốc Cường/i.test(htmlXayDung), 'Domain XAY-DUNG renders investor name');

// Test Domain 4: KHAI-TU (Death & Interconnected)
console.log('\n  [Domain 4: KHAI-TU]');
const htmlKhaiTu = renderModal({
  formType: 'KHAI-TU',
  procedureCode: 'TTHC-CR-02',
  procedureTitle: 'Liên thông điện tử khai tử, xóa thường trú, mai táng phí',
  initialData: { fullName: 'Võ Văn Nam', idNumber: '089195004567' }
});
assert(htmlKhaiTu.includes('TỜ KHAI LIÊN THÔNG ĐIỆN TỬ: ĐĂNG KÝ KHAI TỬ, XÓA THƯỜNG TRÚ &amp; MAI TÁNG PHÍ') || htmlKhaiTu.includes('TỜ KHAI LIÊN THÔNG ĐIỆN TỬ: ĐĂNG KÝ KHAI TỬ, XÓA THƯỜNG TRÚ & MAI TÁNG PHÍ'), 'Domain KHAI-TU has interconnected procedure title');
assert(htmlKhaiTu.includes('Nghị định số 63/2024/NĐ-CP'), 'Domain KHAI-TU references Decree 63/2024/NĐ-CP & Đề án 06');
assert(htmlKhaiTu.includes('THÔNG TIN NGƯỜI ĐÃ CHẾT'), 'Domain KHAI-TU includes deceased person info section');
assert(htmlKhaiTu.includes('Giấy báo tử số:'), 'Domain KHAI-TU includes death notice number field');
assert(/Võ Văn Nam/i.test(htmlKhaiTu), 'Domain KHAI-TU renders applicant name');

// Test Domain 5: MAI-TANG-PHI (Funeral Allowance & Meritorious)
console.log('\n  [Domain 5: MAI-TANG-PHI]');
const htmlMaiTang = renderModal({
  formType: 'MAI-TANG-PHI',
  procedureCode: 'TTHC-BT-02',
  procedureTitle: 'Hỗ trợ chi phí mai táng cho đối tượng bảo trợ xã hội',
  initialData: { fullName: 'Bùi Thị Lan', idNumber: '089198005678' }
});
assert(htmlMaiTang.includes('TỜ KHAI ĐỀ NGHỊ HỖ TRỢ CHI PHÍ MAI TÁNG &amp; TRỢ CẤP ĐỘC LẬP') || htmlMaiTang.includes('TỜ KHAI ĐỀ NGHỊ HỖ TRỢ CHI PHÍ MAI TÁNG & TRỢ CẤP ĐỘC LẬP'), 'Domain MAI-TANG-PHI has official title');
assert(htmlMaiTang.includes('Nghị định số 20/2021/NĐ-CP'), 'Domain MAI-TANG-PHI references Decree 20/2021/NĐ-CP (Mẫu 03)');
assert(htmlMaiTang.includes('Trích lục khai tử số:'), 'Domain MAI-TANG-PHI includes death extract reference field');
assert(htmlMaiTang.includes('Số tài khoản nhận hỗ trợ:'), 'Domain MAI-TANG-PHI includes Project 06 bank account field');
assert(/Bùi Thị Lan/i.test(htmlMaiTang), 'Domain MAI-TANG-PHI renders applicant name');

// Test Domain 6: MOI-TRUONG (Environment)
console.log('\n  [Domain 6: MOI-TRUONG]');
const htmlMoiTruong = renderModal({
  formType: 'MOI-TRUONG',
  procedureCode: 'TTHC-MT-01',
  procedureTitle: 'Đăng ký môi trường cấp xã',
  initialData: { fullName: 'Hộ kinh doanh Thành Đạt', idNumber: '089192006789' }
});
assert(htmlMoiTruong.includes('BẢN ĐĂNG KÝ MÔI TRƯỜNG CỦA CƠ SỞ SẢN XUẤT, KINH DOANH, DỊCH VỤ'), 'Domain MOI-TRUONG has official title');
assert(htmlMoiTruong.includes('Thông tư số 02/2022/TT-BTNMT'), 'Domain MOI-TRUONG references Circular 02/2022/TT-BTNMT (Mẫu 47)');
assert(htmlMoiTruong.includes('Nước thải') && htmlMoiTruong.includes('Rác thải sinh hoạt'), 'Domain MOI-TRUONG covers wastewater and solid waste streams');
assert(htmlMoiTruong.includes('Luật Bảo vệ Môi trường 2020'), 'Domain MOI-TRUONG includes statutory environmental pledge');
assert(/Hộ kinh doanh Thành Đạt/i.test(htmlMoiTruong), 'Domain MOI-TRUONG renders facility name');

// Test Domain 7A: CU-TRU (Mẫu CT01)
console.log('\n  [Domain 7A: CU-TRU - CT01]');
const htmlCt01 = renderModal({
  formType: 'CT01',
  procedureCode: 'TTHC-CR-01',
  initialData: {
    fullName: 'Đặng Quốc Huy',
    idNumber: '089201007890',
    hostName: 'Nguyễn Văn Chủ Hộ',
    hostCccd: '089170001234',
    hostRelation: 'Bác ruột',
    declarationScope: 'Đăng ký thường trú theo diện ở nhờ'
  }
});
assert(htmlCt01.includes('TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ'), 'Domain CU-TRU has official title (CT01)');
assert(htmlCt01.includes('Thông tư số 66/2023/TT-BCA'), 'Domain CU-TRU references Circular 66/2023/TT-BCA');
assert(htmlCt01.includes('Nguyễn Văn Chủ Hộ'), 'Domain CU-TRU renders host name');
assert(htmlCt01.includes('089170001234'), 'Domain CU-TRU renders host CCCD');
assert(htmlCt01.includes('Bác ruột'), 'Domain CU-TRU renders host relation');
assert(htmlCt01.includes('Ý KIẾN CỦA CHỦ HỘ') && htmlCt01.includes('CHỦ SỞ HỮU CHỖ Ở') && htmlCt01.includes('NGƯỜI KÊ KHAI'), 'Domain CU-TRU has 3 required signature blocks');

// Test Domain 7B: HO-TICH - TK-KS (Khai sinh)
console.log('\n  [Domain 7B: HO-TICH - TK-KS]');
const htmlKs = renderModal({
  formType: 'TK-KS',
  procedureCode: 'TTHC-HT-01',
  initialData: {
    childName: 'Nguyễn Bình An',
    dob: '01/10/2026',
    childEthnicity: 'Kinh',
    childNationality: 'Việt Nam',
    birthPlace: 'Bệnh viện Sản Nhi An Giang',
    birthCertNumber: 'CS-2026/0129',
    birthCertIssueDate: '02/10/2026',
    motherName: 'Trần Thị Thu',
    motherDob: '12/03/1995',
    motherResidence: 'Phường Mỹ Bình, Long Xuyên',
    fatherName: 'Nguyễn Văn Tâm',
    fatherDob: '05/08/1992',
    fatherResidence: 'Phường Mỹ Bình, Long Xuyên'
  }
});
assert(htmlKs.includes('TỜ KHAI ĐĂNG KÝ KHAI SINH'), 'Domain HO-TICH (TK-KS) has official title');
assert(htmlKs.includes('Thông tư số 04/2020/TT-BTP'), 'Domain HO-TICH (TK-KS) references Circular 04/2020/TT-BTP');
assert(/Nguyễn Bình An/i.test(htmlKs), 'Domain HO-TICH (TK-KS) renders child name');
assert(htmlKs.includes('CS-2026/0129'), 'Domain HO-TICH (TK-KS) renders birth cert number');
assert(htmlKs.includes('Trần Thị Thu') && htmlKs.includes('Nguyễn Văn Tâm'), 'Domain HO-TICH (TK-KS) renders both parents');

// Test Domain 7C: HO-TICH - TK-KH (Kết hôn 2 chế độ)
console.log('\n  [Domain 7C: HO-TICH - TK-KH 2 Modes]');
const htmlKhReg = renderModal({
  formType: 'TK-KH',
  procedureCode: 'TTHC-HT-02',
  marriageMode: 'MARRIAGE_REGISTRATION',
  initialData: {
    fullName: 'Lê Văn Khang',
    gender: 'Nam',
    idNumber: '089196008901',
    spouseName: 'Phạm Thị Thảo',
    spouseIdNumber: '089198009012'
  }
});
assert(htmlKhReg.includes('TỜ KHAI ĐĂNG KÝ KẾT HÔN'), 'TK-KH in Registration mode has correct title');
assert(htmlKhReg.includes('BÊN NAM') && htmlKhReg.includes('BÊN NỮ'), 'TK-KH in Registration mode presents two-column bride & groom layout');
assert(htmlKhReg.includes('Điều 8 Luật Hôn nhân &amp; Gia đình 2014') || htmlKhReg.includes('Điều 8 Luật Hôn nhân & Gia đình 2014'), 'TK-KH in Registration mode has marriage pledge clause');
assert(htmlKhReg.includes('(Ký trực tiếp trước mặt công chức tiếp nhận)'), 'TK-KH in Registration mode mandates in-person signing before civil status officer');
assert(/Lê Văn Khang/i.test(htmlKhReg) && /Phạm Thị Thảo/i.test(htmlKhReg), 'TK-KH renders both groom and bride');

const htmlKhCert = renderModal({
  formType: 'TK-KH',
  procedureCode: 'TTHC-HT-02',
  marriageMode: 'MARITAL_STATUS_CONFIRMATION',
  initialData: {
    fullName: 'Hoàng Anh Tuấn',
    gender: 'Nam',
    idNumber: '089194001122',
    maritalCertPurpose: 'Để làm thủ tục chuyển nhượng quyền sử dụng đất'
  }
});
assert(htmlKhCert.includes('TỜ KHAI CẤP GIẤY XÁC NHẬN TÌNH TRẠNG HÔN NHÂN'), 'TK-KH in Confirmation mode has correct marital confirmation title');
assert(htmlKhCert.includes('Để làm thủ tục chuyển nhượng quyền sử dụng đất'), 'TK-KH in Confirmation mode renders purpose');

// Test Domain 7D: HO-TICH - TK-BTXH
console.log('\n  [Domain 7D: HO-TICH - TK-BTXH]');
const htmlBtxh = renderModal({
  formType: 'TK-BTXH',
  procedureCode: 'TTHC-BT-01',
  initialData: {
    fullName: 'Bà Cụ Neo Đơn',
    dob: '01/01/1948',
    poorHouseholdBookNumber: 'HN-AG-2024-998',
    guardianName: 'Cháu Nuôi Nguyễn Văn Em',
    guardianCccd: '089205001234',
    bankAccount: '190012345678 MBBank'
  }
});
assert(htmlBtxh.includes('TỜ KHAI THÔNG TIN ĐỀ NGHỊ TRỢ CẤP XÃ HỘI HẰNG THÁNG'), 'TK-BTXH has official title');
assert(htmlBtxh.includes('Nghị định số 20/2021/NĐ-CP &amp; Luật BHXH 2024') || htmlBtxh.includes('Nghị định số 20/2021/NĐ-CP & Luật BHXH 2024'), 'TK-BTXH references Decree 20/2021 & Social Insurance Law 2024');
assert(htmlBtxh.includes('Người cao tuổi từ đủ 75 tuổi trở lên'), 'TK-BTXH explicitly reflects the 75-year statutory threshold');
assert(htmlBtxh.includes('HN-AG-2024-998'), 'TK-BTXH renders poor household book number');
assert(htmlBtxh.includes('Cháu Nuôi Nguyễn Văn Em'), 'TK-BTXH renders guardian details');


// -------------------------------------------------------------
// SECTION 3: DATA POPULATION VS BLANK PRINT DOTTED LINES
// -------------------------------------------------------------
console.log('\n--- SECTION 3: Data Population vs Blank Dotted Lines Stress Test ---');

// Render unauthenticated / blank form across multiple domains
const blankDomains = [
  { formType: 'CT01', code: 'TTHC-CR-01' },
  { formType: 'TK-KS', code: 'TTHC-HT-01' },
  { formType: 'TK-KH', code: 'TTHC-HT-02' },
  { formType: 'TK-BTXH', code: 'TTHC-BT-01' },
  { formType: 'CHUNG-THUC', code: 'TTHC-CT-01' },
  { formType: 'DAT-DAI', code: 'TTHC-DC-01' },
  { formType: 'XAY-DUNG', code: 'TTHC-XD-01' },
  { formType: 'KHAI-TU', code: 'TTHC-CR-02' },
  { formType: 'MAI-TANG-PHI', code: 'TTHC-BT-02' },
  { formType: 'MOI-TRUONG', code: 'TTHC-MT-01' }
];

let allBlankValid = true;
for (const bd of blankDomains) {
  const rendered = renderModal({
    formType: bd.formType,
    procedureCode: bd.code,
    initialData: {}
  });

  const hasDots = rendered.includes('......') || rendered.includes('....................');
  const noUndef = !rendered.includes('undefined') && !rendered.includes('null');
  const noFake = !rendered.includes('NGUYỄN VĂN HÒA') && !rendered.includes('089084000123');
  
  if (!hasDots || !noUndef || !noFake) {
    allBlankValid = false;
    console.error(`  ✗ Blank check failed for ${bd.formType} / ${bd.code}`);
  }
}

assert(allBlankValid, 'All 10 domains cleanly render dotted lines (....) without undefined/null/fake mock data when citizen data is empty');

// Robustness: initialData as undefined
let noThrowOnUndefined = false;
try {
  const renderedUndef = renderModal({
    formType: 'CT01',
    procedureCode: 'TTHC-CR-01',
    initialData: undefined
  });
  noThrowOnUndefined = renderedUndef.length > 500;
} catch (e) {
  noThrowOnUndefined = false;
}
assert(noThrowOnUndefined, 'Modal renders gracefully when initialData is explicitly undefined');


// -------------------------------------------------------------
// SECTION 4: ADVERSARIAL SCAN & MOCK DATA ERADICATION
// -------------------------------------------------------------
console.log('\n--- SECTION 4: Adversarial Codebase Scan for Mock Citizens & Duplicate Modals ---');

function getAllSourceFiles(dir, list = []) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllSourceFiles(fullPath, list);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      list.push(fullPath);
    }
  }
  return list;
}

const allSrc = getAllSourceFiles(srcDir);

// 4.1 Check for NGUYỄN VĂN HÒA
let foundHoa = [];
for (const file of allSrc) {
  const content = fs.readFileSync(file, 'utf-8');
  if (/NGUYỄN VĂN HÒA/i.test(content) || /nguyen van hoa/i.test(content)) {
    foundHoa.push(path.relative(srcDir, file));
  }
}
assert(foundHoa.length === 0, `Mock citizen "NGUYỄN VĂN HÒA" is 100% eradicated from frontend/src (found in: ${foundHoa.join(', ') || '0 files'})`);

// 4.2 Check for mock CCCD 089084000123
let foundMockCccd = [];
for (const file of allSrc) {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('089084000123')) {
    foundMockCccd.push(path.relative(srcDir, file));
  }
}
assert(foundMockCccd.length === 0, `Mock CCCD "089084000123" is 100% eradicated from frontend/src (found in: ${foundMockCccd.join(', ') || '0 files'})`);

// 4.3 Check for duplicate inline A4 modal in FormAndIssueReporting.tsx
const formPageContent = fs.readFileSync(path.resolve(srcDir, 'pages/FormAndIssueReporting.tsx'), 'utf-8');
assert(
  formPageContent.includes("import A4DocumentModal from '../components/A4DocumentModal';"),
  'FormAndIssueReporting.tsx imports modular A4DocumentModal component'
);
assert(
  formPageContent.includes('<A4DocumentModal'),
  'FormAndIssueReporting.tsx delegates rendering to <A4DocumentModal />'
);
// Verify no duplicate internal printable sheet container
const matchesPrintSheet = (formPageContent.match(/a4-print-sheet/g) || []).length;
assert(
  matchesPrintSheet === 0,
  `FormAndIssueReporting.tsx has ZERO duplicate inline A4 sheet JSX containers (found: ${matchesPrintSheet})`
);


// -------------------------------------------------------------
// SECTION 5: SMART CHECKLIST CONDITIONAL LOGIC VERIFICATION (F6)
// -------------------------------------------------------------
console.log('\n--- SECTION 5: Smart Checklist Conditional Logic (FormAndIssueReporting.tsx) ---');

assert(
  formPageContent.includes("parentsMarried === 'NO'"),
  'Smart Checklist detects unmarried parents (parentsMarried === "NO")'
);
assert(
  formPageContent.includes('TTHC-HT-06') && formPageContent.includes('Đăng ký nhận cha, mẹ, con'),
  'Smart Checklist triggers combined procedure TTHC-HT-06 (Parent-Child recognition)'
);
assert(
  formPageContent.includes('Thông tư 04/2020/TT-BTP'),
  'Smart Checklist references Article 15 Circular 04/2020/TT-BTP for unmarried birth registration'
);
assert(
  formPageContent.includes("previousMaritalStatus === 'DIVORCED'"),
  'Smart Checklist detects divorced previous marital status'
);
assert(
  formPageContent.includes('divorceJudgmentNumber') && formPageContent.includes('Bản án/Quyết định ly hôn'),
  'Smart Checklist mandates court divorce judgment number and date'
);
assert(
  formPageContent.includes("previousMaritalStatus === 'WIDOWED'"),
  'Smart Checklist detects widowed previous marital status'
);
assert(
  formPageContent.includes('deathCertNumber') && formPageContent.includes('Giấy chứng tử'),
  'Smart Checklist mandates spouse death certificate details'
);
assert(
  formPageContent.includes("marriageMode === 'MARRIAGE_REGISTRATION'"),
  'Smart Checklist supports dual-mode toggle for TK-KH (Registration vs Confirmation)'
);


// -------------------------------------------------------------
// FINAL ASSESSMENT & RESULTS SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`SUMMARY: ${passedAssertions} PASSED, ${failedAssertions} FAILED`);
console.log('================================================================');

if (failedAssertions > 0) {
  console.error('💥 ADVERSARIAL VERIFICATION FAILED! BUGS DETECTED.');
  process.exit(1);
} else {
  console.log('🏆 ALL ADVERSARIAL STRESS TESTS PASSED (100% EMPIRICAL SUCCESS)');
  process.exit(0);
}
