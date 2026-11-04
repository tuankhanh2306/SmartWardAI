import React, { useState } from 'react';
import { precheckForm, reportIssue, type FormPrecheckResponse, type IssueReportResponse } from '../api/client';

export const FormAndIssueReporting: React.FC = () => {
  // Form Precheck State
  const [fullName, setFullName] = useState('NGUYỄN VĂN AN');
  const [cccd, setCccd] = useState('079095012345');
  const [dob, setDob] = useState('1995-08-15');
  const [issueDate, setIssueDate] = useState('2021-09-20');
  const [address, setAddress] = useState('Số 15 Võ Oanh, Phường 25, Bình Thạnh, TP.HCM');
  const [formLoading, setFormLoading] = useState(false);
  const [precheckResult, setPrecheckResult] = useState<FormPrecheckResponse | null>(null);

  // Civic Incident Reporting State
  const [category, setCategory] = useState('ROAD_DAMAGE');
  const [description, setDescription] = useState('Ổ gà sâu khoảng 25cm tại ngã ba gây nguy hiểm cho người đi xe máy.');
  const [addressText, setAddressText] = useState('Gần số 15 Võ Oanh, Phường 25, Bình Thạnh, TP.HCM');
  const [latitude, setLatitude] = useState(10.8035);
  const [longitude, setLongitude] = useState(106.7145);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResult, setReportResult] = useState<IssueReportResponse | null>(null);

  // Handle Form Precheck
  const handlePrecheck = async () => {
    setFormLoading(true);
    try {
      const res = await precheckForm({
        procedureCode: 'TTHC-CR-01',
        formType: 'CT01',
        citizenCccd: cccd,
        fullName,
        dateOfBirth: dob,
        cccdIssueDate: issueDate,
        address,
        formData: {
          permanentAddress: address,
          requestContent: 'Đăng ký thường trú theo diện chuyển chỗ ở hợp pháp',
        },
      });
      setPrecheckResult(res);
    } catch {
      alert('Không thể kết nối đến máy chủ backend để kiểm tra tờ khai.');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle HTML5 Geolocation API
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsLoading(false);
      },
      () => {
        // Fallback to ward coordinate
        setLatitude(10.8038);
        setLongitude(106.7148);
        setGpsLoading(false);
        alert('Không lấy được GPS tự động, hệ thống sử dụng tọa độ trung tâm Phường 25.');
      },
      { timeout: 8000 }
    );
  };

  // Handle Incident Report Submit
  const handleReport = async () => {
    if (!description.trim() || reportLoading) return;
    setReportLoading(true);
    try {
      const res = await reportIssue({
        category,
        latitude,
        longitude,
        addressText,
        rawDescription: description,
      });
      setReportResult(res);
    } catch {
      alert('Không thể gửi phản ánh tới hệ thống phân luồng.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 md:px-8 py-6 gap-8">
      {/* SECTION 1: FORM PRECHECK & WARNING ENGINE */}
      <section className="flex flex-col gap-4">
        {/* Header alert */}
        <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-surface-container-high text-primary flex items-center justify-center shrink-0 border border-outline-variant/40">
              <span className="material-symbols-outlined text-[26px]">fact_check</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold text-on-surface">
                  Tiền Kiểm Định Tờ Khai & Nhắc Nhở Lỗi Mẫu CT01
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-primary font-bold text-xs">
                  Rule Engine Định Thức
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                <strong className="text-on-surface">Lưu ý cho công dân:</strong> Hệ thống tự động đối chiếu số CCCD, ngày sinh và ngày cấp để nhắc nhở trên bản giấy. Hệ thống không chỉnh sửa hồ sơ thay người dân.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              // Fill with faulty test CCCD (9 numbers) to test validation!
              setCccd('079195012');
              setIssueDate('2021-09-20');
              setDob('2022-08-15');
            }}
            className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary text-xs font-bold transition-colors shrink-0"
          >
            Thử Điền Mẫu Lỗi Nghiêm Trọng
          </button>
        </div>

        {/* Form Inputs & Visual Sheet Preview */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column: Form Simulator Inputs (5 cols) */}
          <div className="xl:col-span-5 bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <span className="text-sm font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-secondary">edit_document</span>
                Thông Tin Kê Khai Trên Tờ Khai CT01
              </span>
              <span className="text-xs text-secondary font-bold">Mẫu 01 Cư Trú</span>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">1. Họ và tên người kê khai:</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-surface-container-low px-3.5 py-2.5 rounded-xl text-sm border border-outline-variant/30 focus:outline-none font-semibold text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">2. Ngày sinh:</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-surface-container-low px-3 py-2 rounded-xl text-xs border border-outline-variant/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">3. Giới tính:</label>
                  <select className="w-full bg-surface-container-low px-3 py-2 rounded-xl text-xs border border-outline-variant/30 focus:outline-none">
                    <option value="NAM">Nam</option>
                    <option value="NU">Nữ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">
                  4. Số Căn cước công dân (12 chữ số):
                </label>
                <input
                  type="text"
                  value={cccd}
                  onChange={(e) => setCccd(e.target.value)}
                  placeholder="Ví dụ: 079095012345"
                  className="w-full bg-surface-container-low px-3.5 py-2.5 rounded-xl text-sm font-mono border border-outline-variant/30 focus:outline-none font-bold text-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">5. Ngày cấp CCCD:</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full bg-surface-container-low px-3 py-2 rounded-xl text-xs border border-outline-variant/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">6. Nơi thường trú đề nghị:</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-surface-container-low px-3.5 py-2.5 rounded-xl text-xs border border-outline-variant/30 focus:outline-none"
                />
              </div>

              <button
                onClick={handlePrecheck}
                disabled={formLoading}
                className="mt-2 w-full py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                {formLoading ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-[18px]">refresh</span>
                    <span>Đang Kiểm Tra Logic...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">spellcheck</span>
                    <span>Bấm Để Kiểm Tra Tờ Khai</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Precheck Result & Rule Engine Feedback (7 cols) */}
          <div className="xl:col-span-7 bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <span className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-secondary">analytics</span>
                Kết Quả Hậu Kiểm Định Tờ Khai (Rule Engine)
              </span>
              {precheckResult && (
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                    precheckResult.overallValid
                      ? 'bg-secondary-fixed text-on-secondary-fixed'
                      : 'bg-error-container text-on-error-container'
                  }`}
                >
                  {precheckResult.overallValid ? 'HỢP LỆ HOÀN TOÀN' : 'CÓ LỖI CẦN SỬA'}
                </span>
              )}
            </div>

            {precheckResult ? (
              <div className="flex flex-col gap-3">
                {/* Field-by-Field Table */}
                <div className="divide-y divide-outline-variant/20 border border-outline-variant/20 rounded-xl overflow-hidden">
                  {precheckResult.fieldValidations.map((f, i) => (
                    <div
                      key={i}
                      className={`p-3 flex items-start justify-between gap-3 ${
                        f.valid ? 'bg-surface-container-lowest' : 'bg-error-container/20'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${
                            f.valid ? 'text-secondary' : 'text-error'
                          }`}
                        >
                          {f.valid ? 'check_circle' : 'error'}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-on-surface">
                            {f.fieldName}: <span className="font-mono text-primary">{f.providedValue || '(Trống)'}</span>
                          </div>
                          {!f.valid && (
                            <p className="text-xs text-error font-medium mt-0.5">
                              {f.errorMessage} (Mã lỗi: {f.errorCode})
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          f.valid ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-error text-on-error'
                        }`}
                      >
                        {f.valid ? 'HỢP LỆ' : 'CẦN SỬA'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Warnings banner */}
                {precheckResult.warnings && precheckResult.warnings.length > 0 && (
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 flex flex-col gap-1 text-xs">
                    <span className="font-bold text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-secondary">info</span>
                      Khuyến nghị từ Cán bộ:
                    </span>
                    {precheckResult.warnings.map((w, i) => (
                      <span key={i} className="text-on-surface-variant">
                        • {w}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-10 flex flex-col items-center justify-center text-center text-on-surface-variant gap-2">
                <span className="material-symbols-outlined text-[48px] text-outline">description</span>
                <p className="text-sm">Chưa có kết quả kiểm tra. Hãy bấm nút "Bấm Để Kiểm Tra Tờ Khai" ở bên trái.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 2: CIVIC INCIDENT REPORTING WITH GPS */}
      <section id="report-section" className="flex flex-col gap-4 pt-4 border-t border-outline-variant/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-on-secondary shadow-xs">
            <span className="material-symbols-outlined text-[24px]">fmd_bad</span>
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-primary">Gửi Phản Ánh Hiện Trường Đô Thị Phường 25</h2>
            <span className="text-xs text-on-surface-variant">
              Tự động gom cụm phản ánh bằng mô hình Hai Pha: Không gian Redis GEO (R=75m) + Ngữ nghĩa Cosine (τ=0.82)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-4">
            {/* Category selection */}
            <div>
              <label className="text-xs font-bold text-on-surface block mb-2">1. Chọn Lĩnh Vực Phản Ánh:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { code: 'ROAD_DAMAGE', label: 'Hạ Tầng Giao Thông', icon: 'traffic' },
                  { code: 'FLOODING', label: 'Ngập Nước Đô Thị', icon: 'water_damage' },
                  { code: 'GARBAGE', label: 'Vệ Sinh Môi Trường', icon: 'delete_sweep' },
                  { code: 'STREETLIGHT', label: 'Chiếu Sáng Công Cộng', icon: 'lightbulb' },
                ].map((cat) => (
                  <button
                    key={cat.code}
                    onClick={() => setCategory(cat.code)}
                    className={`p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center transition-all ${
                      category === cat.code
                        ? 'bg-primary text-on-primary shadow-xs font-bold'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">{cat.icon}</span>
                    <span className="text-xs">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-on-surface block mb-1">2. Mô Tả Chi Tiết Sự Cố:</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả cụ thể sự cố để thuật toán NLP đo lường tương đồng ngữ nghĩa..."
                className="w-full bg-surface-container-low px-3.5 py-2.5 rounded-xl text-xs md:text-sm border border-outline-variant/30 focus:outline-none text-on-surface"
              ></textarea>
            </div>

            {/* GPS Geolocation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-on-surface">3. Tọa Độ GPS & Địa Chỉ Hiện Trường:</label>
                <button
                  onClick={handleGetLocation}
                  disabled={gpsLoading}
                  className="text-xs font-bold text-secondary hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">my_location</span>
                  {gpsLoading ? 'Đang lấy vị trí...' : 'Lấy Vị Trí Hiện Tại'}
                </button>
              </div>
              <input
                type="text"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                placeholder="Số nhà, tên đường hoặc giao lộ lân cận..."
                className="w-full bg-surface-container-low px-3.5 py-2 rounded-xl text-xs border border-outline-variant/30 focus:outline-none mb-2"
              />
              <div className="grid grid-cols-2 gap-3 text-xs font-mono text-on-surface-variant bg-surface-container-low p-2 rounded-lg">
                <span>Vĩ độ (Lat): {latitude.toFixed(6)}</span>
                <span>Kinh độ (Lon): {longitude.toFixed(6)}</span>
              </div>
            </div>

            <button
              onClick={handleReport}
              disabled={reportLoading}
              className="w-full py-3.5 rounded-xl bg-secondary hover:bg-on-secondary-container text-on-secondary font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              {reportLoading ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-[18px]">refresh</span>
                  <span>Đang Phân Luồng Triage 2 Pha...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  <span>Gửi Phản Ánh Hiện Trường</span>
                </>
              )}
            </button>
          </div>

          {/* Right Result Card (5 cols) */}
          <div className="lg:col-span-5 bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-4">
            <span className="text-sm font-bold text-on-surface flex items-center gap-2 pb-2 border-b border-outline-variant/20">
              <span className="material-symbols-outlined text-[20px] text-secondary">hub</span>
              Kết Quả Xử Lý Của Thuật Toán Gom Cụm Triage
            </span>

            {reportResult ? (
              <div className="flex flex-col gap-3">
                <div
                  className={`p-4 rounded-xl border flex flex-col gap-2 ${
                    reportResult.assignedAction === 'MERGED_INTO_EXISTING_CLUSTER'
                      ? 'bg-secondary-fixed/30 border-secondary'
                      : 'bg-primary-fixed/30 border-primary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[24px]">
                      {reportResult.assignedAction === 'MERGED_INTO_EXISTING_CLUSTER' ? 'join_full' : 'add_circle'}
                    </span>
                    <span className="font-bold text-sm text-on-surface">
                      {reportResult.assignedAction === 'MERGED_INTO_EXISTING_CLUSTER'
                        ? 'TỰ ĐỘNG GỘP VÀO CỤM CÓ SẴN'
                        : 'KHỞI TẠO CỤM SỰ CỐ MỚI'}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface leading-relaxed">{reportResult.message}</p>
                </div>

                <div className="p-3 bg-surface-container-low rounded-xl text-xs space-y-1.5 font-mono">
                  <div>Mã Cụm: <strong className="text-primary">{reportResult.clusterCode}</strong></div>
                  <div>Độ Tương Đồng Cosine: <strong className="text-secondary">{(reportResult.similarityWithClusterCentroid * 100).toFixed(1)}%</strong> (Ngưỡng τ = 82%)</div>
                  <div>Tổng Tin Báo Trong Cụm: <strong className="text-primary">{reportResult.totalReportsInCluster} người dân</strong></div>
                </div>
              </div>
            ) : (
              <div className="p-10 flex flex-col items-center justify-center text-center text-on-surface-variant gap-2">
                <span className="material-symbols-outlined text-[48px] text-outline">spatial_tracking</span>
                <p className="text-sm">Khi bà con gửi phản ánh, hệ thống sẽ tự động quét bán kính R=75m trên Redis GEO và đo Cosine để phân luồng tức thì.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default FormAndIssueReporting;

