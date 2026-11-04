import React, { useState } from 'react';
import {
  precheckForm,
  reportIssue,
  type FormPrecheckResponse,
  type IssueReportResponse
} from '../api/client';
import {
  FileCheck2,
  AlertTriangle,
  MapPin,
  Camera,
  CheckCircle2,
  XCircle,
  Sparkles,
  Send,
  PenTool,
  Layers,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

export const FormAndIssueReporting: React.FC = () => {
  // Active Tab
  const [activeTab, setActiveTab] = useState<'form' | 'incident'>('form');

  // Form Precheck State
  const [fullName, setFullName] = useState('NGUYỄN VĂN AN');
  const [cccd, setCccd] = useState('079095012345');
  const [dob, setDob] = useState('1995-08-15');
  const [issueDate, setIssueDate] = useState('2021-09-20');
  const [address, setAddress] = useState('Số 15 Võ Oanh, Phường 25, Bình Thạnh, TP.HCM');
  const [formLoading, setFormLoading] = useState(false);
  const [precheckResult, setPrecheckResult] = useState<FormPrecheckResponse | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Civic Incident Reporting State
  const [category, setCategory] = useState('ROAD_DAMAGE');
  const [description, setDescription] = useState('Ổ gà sâu khoảng 25cm tại ngã ba Võ Oanh - D5 gây nguy hiểm cho người đi xe máy.');
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
        procedureCode: 'TTHC-CT-01',
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
        alert('Không thể lấy tọa độ GPS tự động. Vui lòng nhập địa chỉ cụ thể bằng tay.');
        setGpsLoading(false);
      },
      { timeout: 10000 }
    );
  };

  // Handle Incident Report
  const handleReport = async () => {
    if (!description.trim()) {
      alert('Vui lòng nhập mô tả sự cố hiện trường.');
      return;
    }
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
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 md:px-8 py-8 gap-8">
      {/* Top Segmented Navigation Tab Pill with Spring Transitions */}
      <div className="flex justify-center">
        <div className="p-1 bg-[#F2F3FF] rounded-2xl border border-[#EAEDFF] shadow-inner flex items-center gap-1">
          <button
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 active:scale-95 ${
              activeTab === 'form'
                ? 'bg-[#00236F] text-white shadow-md shadow-[#00236F]/20'
                : 'text-[#444651] hover:text-[#00236F] hover:bg-[#EAEDFF]'
            }`}
          >
            <FileCheck2 className={`w-4 h-4 ${activeTab === 'form' ? 'text-[#57DFFE]' : 'text-[#757682]'}`} />
            <span>Tiền Kiểm Định Tờ Khai CT01</span>
          </button>

          <button
            id="incident"
            onClick={() => setActiveTab('incident')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 active:scale-95 ${
              activeTab === 'incident'
                ? 'bg-[#00236F] text-white shadow-md shadow-[#00236F]/20'
                : 'text-[#444651] hover:text-[#00236F] hover:bg-[#EAEDFF]'
            }`}
          >
            <AlertTriangle className={`w-4 h-4 ${activeTab === 'incident' ? 'text-[#57DFFE]' : 'text-[#757682]'}`} />
            <span>Báo Sự Cố Hiện Trường (GPS & AI Triage)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FORM PRECHECK ENGINE */}
      {/* ========================================================================= */}
      {activeTab === 'form' && (
        <section className="flex flex-col gap-6 animate-fadeIn">
          {/* Administrative Protocol Alert Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#EAEDFF]/80 via-white to-[#F2F3FF] border border-[#DAE2FD] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#00236F] text-white flex items-center justify-center shrink-0 shadow-sm">
                <PenTool className="w-5 h-5 text-[#57DFFE]" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base md:text-lg font-bold text-[#00236F]">
                    Tiền Kiểm Định Tờ Khai Cư Trú (Mẫu CT01)
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCE1FF] text-[#00164E]">
                    Chống Sai Sót Hành Chính
                  </span>
                </div>
                <p className="text-xs text-[#444651] mt-1 leading-relaxed max-w-3xl">
                  <strong>Quy chuẩn bắt buộc:</strong> Hệ thống AI rà soát tính hợp lệ cấu trúc 12 số CCCD, đối chiếu mốc tuổi và ngày cấp. 
                  <span className="text-[#BA1A1A] font-semibold"> Hệ thống chỉ nhắc nhở người dân sửa trực tiếp bằng bút mực trên tờ khai giấy gốc</span>, tuyệt đối không can thiệp sửa đổi trực tiếp trên màn hình số để bảo đảm giá trị pháp lý.
                </p>
              </div>
            </div>

            {/* Stepper Status Pill */}
            <div className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-xl bg-white border border-[#DAE2FD] text-[11px] font-semibold text-[#00687A]">
              <span className="w-2 h-2 rounded-full bg-[#00687A] animate-pulse" />
              <span>Đề Án 06/CP Verified</span>
            </div>
          </div>

          {/* Core Interactive Layout: Left Form vs Right Visual Result */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT: Input Form Card (7 Cols) */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-[#EAEDFF] shadow-sm flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAEDFF]">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-[#00236F]" />
                  <span className="text-sm font-bold text-[#131B2E]">Thông Tin Bản Khai Giấy Cần Rà Soát</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCameraActive(!isCameraActive)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
                    isCameraActive
                      ? 'bg-[#00236F] text-white shadow-xs'
                      : 'bg-[#F2F3FF] hover:bg-[#EAEDFF] text-[#00236F] border border-[#DAE2FD]'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isCameraActive ? 'Đóng Quét Ảnh' : 'Chụp Ảnh Scan Tờ Khai'}</span>
                </button>
              </div>

              {/* Simulated Camera Viewfinder with Dynamic Laser Scan Animation */}
              {isCameraActive && (
                <div className="relative w-full h-48 rounded-2xl bg-[#131B2E] overflow-hidden flex items-center justify-center border-2 border-dashed border-[#57DFFE]/80 shadow-inner">
                  {/* Moving Laser Scan Line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-[#57DFFE] shadow-[0_0_12px_#57DFFE] animate-laser pointer-events-none" />
                  <div className="flex flex-col items-center gap-2 text-white/90 z-10 p-4 text-center">
                    <Camera className="w-8 h-8 text-[#57DFFE] animate-pulse" />
                    <span className="text-xs font-semibold">Khung Nhận Diện OCR Thị Giác Máy Tính</span>
                    <span className="text-[11px] text-white/70 max-w-xs">
                      Hướng camera điện thoại vuông góc với tờ khai CT01 để trích xuất văn bản tự động.
                    </span>
                  </div>
                </div>
              )}

              {/* Form Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-[#444651]">
                    1. Họ và tên công dân (theo bản khai giấy):
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF] text-xs md:text-sm text-[#131B2E] focus:outline-none focus:border-[#00236F] focus:bg-white transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#444651]">
                    2. Số CCCD gắn chip (12 chữ số):
                  </label>
                  <input
                    type="text"
                    value={cccd}
                    maxLength={12}
                    onChange={(e) => setCccd(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF] font-mono text-xs md:text-sm text-[#00236F] font-bold focus:outline-none focus:border-[#00236F] focus:bg-white transition-all tracking-wider"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#444651]">
                    3. Ngày sinh (DOB):
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF] text-xs md:text-sm text-[#131B2E] focus:outline-none focus:border-[#00236F] focus:bg-white transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#444651]">
                    4. Ngày cấp thẻ CCCD:
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF] text-xs md:text-sm text-[#131B2E] focus:outline-none focus:border-[#00236F] focus:bg-white transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-[#444651]">
                    5. Nơi thường trú đề nghị đăng ký:
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF] text-xs md:text-sm text-[#131B2E] focus:outline-none focus:border-[#00236F] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Action Trigger Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <span className="text-[11px] text-[#757682]">
                  Động cơ Java Rule Engine chạy tức thì (&lt; 15ms)
                </span>

                <button
                  type="button"
                  onClick={handlePrecheck}
                  disabled={formLoading}
                  className="px-6 py-2.5 bg-[#00236F] hover:bg-[#1E3A8A] text-white rounded-xl font-semibold text-xs shadow-md shadow-[#00236F]/20 flex items-center gap-2 active:scale-95 transition-all duration-200"
                >
                  {formLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#57DFFE]" />
                      <span>Đang Kiểm Tra...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#57DFFE]" />
                      <span>Kiểm Tra Biểu Mẫu Bằng AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RIGHT: Real-Time Diagnostic Result Card (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {precheckResult ? (
                <div className="p-6 rounded-3xl bg-white border border-[#EAEDFF] shadow-sm flex flex-col gap-4 animate-scaleUp">
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-2xl flex items-start gap-3 ${
                      precheckResult.overallValid
                        ? 'bg-[#E8F5E9] border border-[#A5D6A7] text-[#2E7D32]'
                        : 'bg-[#FFEBEE] border border-[#FFCDD2] text-[#C62828]'
                    }`}
                  >
                    {precheckResult.overallValid ? (
                      <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5 text-[#2E7D32]" />
                    ) : (
                      <XCircle className="w-6 h-6 shrink-0 mt-0.5 text-[#C62828]" />
                    )}
                    <div>
                      <h3 className="font-bold text-sm">
                        {precheckResult.overallValid
                          ? 'Tờ Khai Hợp Lệ - Sẵn Sàng Nộp'
                          : 'Phát Hiện Lỗi Cần Chỉnh Sửa Bằng Bút Mực'}
                      </h3>
                      <p className="text-xs mt-1 leading-relaxed">
                        {precheckResult.overallValid
                          ? 'Tất cả các trường thông tin CCCD, thời gian và địa chỉ cư trú đều khớp logic quy định của Bộ Công an.'
                          : 'Bà con vui lòng dùng bút mực gạch ngang và ghi lại thông tin chính xác trực tiếp trên bản giấy trước khi mang đến UBND.'}
                      </p>
                    </div>
                  </div>

                  {/* Field Breakdown Diagnostic Checklist */}
                  <div className="flex flex-col divide-y divide-[#EAEDFF] text-xs">
                    {precheckResult.fieldValidations.map((field, idx) => (
                      <div key={idx} className="py-2.5 flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          {field.valid ? (
                            <CheckCircle2 className="w-4 h-4 text-[#00687A] shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[#BA1A1A] shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-semibold text-[#131B2E]">{field.fieldName}</span>
                            {field.errorMessage && (
                              <p className="text-[11px] text-[#BA1A1A] mt-0.5 font-medium leading-tight">
                                {field.errorMessage}
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 ${
                            field.valid
                              ? 'bg-[#ACEDFF] text-[#004E5C]'
                              : 'bg-[#FFDAD6] text-[#93000A]'
                          }`}
                        >
                          {field.valid ? 'Hợp Lệ' : 'Sai Lệch'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Warnings if any */}
                  {precheckResult.warnings.length > 0 && (
                    <div className="p-3 rounded-xl bg-[#FFF8E1] border border-[#FFE082] text-xs text-[#8D6E63] flex flex-col gap-1">
                      <strong className="text-[#E65100]">Lưu ý bổ sung:</strong>
                      {precheckResult.warnings.map((w, idx) => (
                        <span key={idx} className="text-[11px] leading-tight">• {w}</span>
                      ))}
                    </div>
                  )}

                  {/* Footer Meta */}
                  <div className="pt-2 border-t border-[#EAEDFF] flex items-center justify-between text-[10px] text-[#757682] font-mono">
                    <span>Mã tra cứu: {precheckResult.submissionId}</span>
                    <span>Xử lý: {precheckResult.processingTimeMs}ms</span>
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div className="p-8 rounded-3xl bg-white border border-[#EAEDFF] shadow-sm flex flex-col items-center justify-center text-center text-[#757682] gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#F2F3FF] flex items-center justify-center text-[#00236F]">
                    <ShieldCheck className="w-7 h-7 text-[#00687A]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#131B2E]">Sẵn Sàng Rà Soát</h3>
                    <p className="text-xs text-[#757682] mt-1 max-w-xs leading-relaxed">
                      Điền thông tin bản khai giấy bên trái và bấm nút "Kiểm Tra Biểu Mẫu Bằng AI" để đối chiếu CSDL Đề án 06.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INCIDENT REPORTING & TWO-STAGE TRIAGE */}
      {/* ========================================================================= */}
      {activeTab === 'incident' && (
        <section className="flex flex-col gap-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#EAEDFF]/80 via-white to-[#F2F3FF] border border-[#DAE2FD] shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#BA1A1A] text-white flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-[#00236F]">
                  Phản Ánh Sự Cố Đô Thị & An Ninh Trật Tự
                </h2>
                <p className="text-xs text-[#444651] mt-1 leading-relaxed">
                  Ứng dụng thuật toán phân luồng 2 pha: Lọc bán kính địa lý R=75m (Redis GEO) và so khớp ngữ nghĩa vector τ=0.82 để tự động phát hiện và gộp các phản ánh trùng lặp.
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#DAE2FD] text-[11px] font-semibold text-[#BA1A1A]">
              <span className="w-2 h-2 rounded-full bg-[#BA1A1A] animate-pulse" />
              <span>Tiếp Nhận 24/7</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Incident Input Form (7 Cols) */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-[#EAEDFF] shadow-sm flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#444651]">
                  Phân loại lĩnh vực phản ánh:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'ROAD_DAMAGE', label: 'Hạ Tầng Đường' },
                    { id: 'FLOODING', label: 'Ngập Nước' },
                    { id: 'ENVIRONMENT', label: 'Môi Trường' },
                    { id: 'LIGHTING', label: 'Chiếu Sáng' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition active:scale-95 ${
                        category === cat.id
                          ? 'bg-[#00236F] text-white border-[#00236F] shadow-xs'
                          : 'bg-[#FAF8FF] hover:bg-[#EAEDFF] text-[#444651] border-[#EAEDFF]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#444651]">
                  Mô tả chi tiết sự cố tại hiện trường:
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF] text-xs md:text-sm text-[#131B2E] focus:outline-none focus:border-[#00236F] focus:bg-white resize-none transition-all"
                  placeholder="Mô tả mức độ nguy hiểm, kích thước, ảnh hưởng đến người đi đường..."
                />
              </div>

              {/* Address & GPS Coordinates */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#444651]">
                    Vị trí hiện trường sự cố:
                  </label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={gpsLoading}
                    className="text-xs font-semibold text-[#00687A] hover:underline flex items-center gap-1 active:scale-95"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{gpsLoading ? 'Đang Bắt Sóng GPS...' : 'Lấy Vị Trí GPS Tự Động'}</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF] text-xs md:text-sm text-[#131B2E] focus:outline-none focus:border-[#00236F] focus:bg-white"
                />

                <div className="flex items-center gap-4 text-xs font-mono text-[#757682] px-1">
                  <span>Vĩ độ (Lat): <strong className="text-[#00236F]">{latitude.toFixed(4)}</strong></span>
                  <span>Kinh độ (Lon): <strong className="text-[#00236F]">{longitude.toFixed(4)}</strong></span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleReport}
                  disabled={reportLoading}
                  className="px-6 py-2.5 bg-[#BA1A1A] hover:bg-[#BA1A1A]/90 text-white rounded-xl font-semibold text-xs shadow-md shadow-[#BA1A1A]/20 flex items-center gap-2 active:scale-95 transition-all duration-200"
                >
                  {reportLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang Phân Luồng...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Gửi Phản Ánh Hiện Trường</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Incident Triage Live Result (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {reportResult ? (
                <div className="p-6 rounded-3xl bg-white border border-[#EAEDFF] shadow-sm flex flex-col gap-4 animate-scaleUp">
                  <div
                    className={`p-4 rounded-2xl flex items-start gap-3 ${
                      reportResult.assignedAction === 'MERGED_INTO_EXISTING_CLUSTER'
                        ? 'bg-[#E0F7FA] border border-[#80DEEA] text-[#006064]'
                        : 'bg-[#FFF3E0] border border-[#FFE082] text-[#E65100]'
                    }`}
                  >
                    <Layers className="w-6 h-6 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-sm">
                        {reportResult.assignedAction === 'MERGED_INTO_EXISTING_CLUSTER'
                          ? 'Đã Tự Động Gom Cụm Với Sự Cố Gốc'
                          : 'Khởi Tạo Cụm Sự Cố Mới Trên Bản Đồ'}
                      </h3>
                      <p className="text-xs mt-1 leading-relaxed">{reportResult.message}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 p-3 bg-[#FAF8FF] border border-[#EAEDFF] rounded-2xl text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#757682]">Mã cụm sự cố:</span>
                      <strong className="font-mono text-[#00236F]">{reportResult.clusterCode}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#757682]">Tổng số người báo:</span>
                      <span className="font-bold text-[#00687A]">{reportResult.totalReportsInCluster} người dân</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#757682]">Độ tương đồng ngữ nghĩa:</span>
                      <span className="font-bold text-[#00236F]">
                        {(reportResult.similarityWithClusterCentroid * 100).toFixed(1)}% (ngưỡng τ = 82%)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-white border border-[#EAEDFF] shadow-sm flex flex-col items-center justify-center text-center text-[#757682] gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#F2F3FF] flex items-center justify-center text-[#BA1A1A]">
                    <Layers className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#131B2E]">Thuật Toán Phân Luồng Tự Động</h3>
                    <p className="text-xs text-[#757682] mt-1 max-w-xs leading-relaxed">
                      Khi gửi phản ánh, hệ thống sẽ tự động quét bán kính R=75m trên Redis GEO và đo Cosine để phân luồng tức thì.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default FormAndIssueReporting;
