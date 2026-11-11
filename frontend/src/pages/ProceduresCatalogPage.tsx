import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Megaphone,
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Printer,
  ChevronRight,
  X,
  Sparkles,
  Bot,
  Check
} from 'lucide-react';
import { PROCEDURES_CATALOG, type ProcedureCatalogItem } from '../data/proceduresCatalog';
import { useWard } from '../context/WardContext';
import A4DocumentModal from '../components/A4DocumentModal';

export const ProceduresCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentWard } = useWard();

  // Search & Category Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // A4 Document Preview Modal State
  const [selectedProcedureForModal, setSelectedProcedureForModal] = useState<ProcedureCatalogItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Right Panel: Tab 'LOGIN' vs 'TRACKING'
  const [rightPanelTab, setRightPanelTab] = useState<'LOGIN' | 'TRACKING'>('LOGIN');

  // Login Form States (Mock for UTH Citizen/Student)
  const [loginAccount, setLoginAccount] = useState('089205023490');
  const [loginPassword, setLoginPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccessMessage, setLoginSuccessMessage] = useState<string | null>(null);

  // Tracking Form States (Mock Dossier Lookup)
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingResult, setTrackingResult] = useState<{
    code: string;
    procedure: string;
    applicant: string;
    submissionDate: string;
    expectedDate: string;
    status: 'PROCESSING' | 'READY' | 'NEED_MORE_DOCS';
    officer: string;
  } | null>(null);

  // Categories list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(PROCEDURES_CATALOG.map((p) => p.category)));
    return ['ALL', ...cats];
  }, []);

  // Filtered procedures
  const filteredProcedures = useMemo(() => {
    return PROCEDURES_CATALOG.filter((item) => {
      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchSearch =
        searchTerm.trim() === '' ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.portalCode.includes(searchTerm);
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchTerm]);

  // Handler to open A4 Modal
  const handleOpenA4 = (proc: ProcedureCatalogItem) => {
    setSelectedProcedureForModal(proc);
    setIsModalOpen(true);
  };

  // Determine form type for the modal
  const getFormType = (code: string): 'CT01' | 'TK-KS' | 'TK-KH' | 'TK-BTXH' | 'GENERAL' => {
    if (code === 'TTHC-CR-01') return 'CT01';
    if (code === 'TTHC-HT-01') return 'TK-KS';
    if (code === 'TTHC-HT-02') return 'TK-KH';
    if (code === 'TTHC-BT-01') return 'TK-BTXH';
    return 'GENERAL';
  };

  // Check if procedure has direct online form declaration
  const hasDirectForm = (code: string) => {
    return ['TTHC-CR-01', 'TTHC-HT-01', 'TTHC-HT-02', 'TTHC-BT-01'].includes(code);
  };

  const getFormUrl = (code: string) => {
    if (code === 'TTHC-CR-01') return '/citizen/form#form';
    if (code === 'TTHC-HT-01') return '/citizen/form#form';
    if (code === 'TTHC-HT-02') return '/citizen/form#form';
    if (code === 'TTHC-BT-01') return '/citizen/form#form';
    return '/citizen/form#form';
  };

  // Handle Login Mock Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSuccessMessage(`Đăng nhập thành công với tài khoản ${loginAccount}! Chào mừng bạn đến Cổng Một Cửa UTH SmartWard.`);
    setTimeout(() => setLoginSuccessMessage(null), 4000);
  };

  // Handle Tracking Lookup
  const handleTrackingLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = trackingCode.trim().toUpperCase();
    if (!clean) return;

    if (clean.includes('01') || clean.includes('KS')) {
      setTrackingResult({
        code: clean,
        procedure: 'Đăng ký khai sinh cho trẻ mới sinh (TK-KS)',
        applicant: 'Nguyễn Văn Hòa',
        submissionDate: '10/11/2026',
        expectedDate: '11/11/2026 (Trong ngày)',
        status: 'READY',
        officer: 'Đ/c Trần Thị Mai - Tư pháp Hộ tịch',
      });
    } else if (clean.includes('02') || clean.includes('KH')) {
      setTrackingResult({
        code: clean,
        procedure: 'Đăng ký kết hôn (TK-KH)',
        applicant: 'Lê Minh Tuấn & Đỗ Thị Lan',
        submissionDate: '09/11/2026',
        expectedDate: '12/11/2026',
        status: 'PROCESSING',
        officer: 'Đ/c Phạm Văn Hùng - Trưởng bộ phận Một cửa',
      });
    } else {
      setTrackingResult({
        code: clean,
        procedure: 'Thay đổi thông tin cư trú (CT01)',
        applicant: 'Công dân An Giang',
        submissionDate: '08/11/2026',
        expectedDate: '11/11/2026',
        status: 'PROCESSING',
        officer: 'Công an Phường/Xã',
      });
    }
  };

  return (
    <main className="bg-uth-canvas bg-uth-watermark min-h-[calc(100vh-4rem)] p-3 sm:p-6 lg:p-8 flex flex-col justify-start relative">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: TIN TỨC & DANH MỤC THỦ TỤC HÀNH CHÍNH (Matching Reference UI) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-[0_4px_24px_rgba(0,121,107,0.08)] border border-teal-100/90 flex flex-col">
            
            {/* Header section with Megaphone and Title */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#00796B] flex items-center justify-center shrink-0 shadow-2xs">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-[#00796B] font-bold text-base sm:text-lg tracking-tight uppercase">
                    TIN TỨC & THÔNG BÁO THỦ TỤC HÀNH CHÍNH
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Cập nhật mới nhất từ Bộ phận Tiếp nhận & Trả kết quả UBND {currentWard.name}
                  </p>
                </div>
              </div>

              {/* Top-Right "Xem tất cả" pill */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('ALL');
                  setSearchTerm('');
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#00796B] text-[#00796B] hover:bg-teal-50 text-xs font-semibold transition active:scale-95 cursor-pointer shadow-2xs"
              >
                <span>Xem tất cả ({PROCEDURES_CATALOG.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search and Category Filter Pills */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm thủ tục (khai sinh, cư trú, kết hôn, bảo trợ, đất đai...)"
                  className="w-full pl-9 pr-8 py-2 bg-[#EEF2F6] hover:bg-slate-100 focus:bg-white text-xs sm:text-sm text-slate-800 rounded-xl border border-slate-200 focus:border-[#00796B] focus:ring-1 focus:ring-[#00796B] outline-none transition"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Clear Filter if Active */}
              {selectedCategory !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 shrink-0"
                >
                  <X className="w-3 h-3" />
                  <span>Xóa lọc</span>
                </button>
              )}
            </div>

            {/* Horizontal Scrollable Category Chips */}
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const count =
                  cat === 'ALL'
                    ? PROCEDURES_CATALOG.length
                    : PROCEDURES_CATALOG.filter((p) => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-[#00796B] text-white shadow-xs font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span>{cat === 'ALL' ? 'Tất cả lĩnh vực' : cat}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Procedure Items List (Formatted faithfully to the image) */}
            <div className="mt-4 flex flex-col gap-3">
              {filteredProcedures.length === 0 ? (
                <div className="text-center py-12 text-slate-500 flex flex-col items-center">
                  <FileText className="w-12 h-12 text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700">Không tìm thấy thủ tục phù hợp với từ khóa</p>
                  <p className="text-xs text-slate-400 mt-1">Vui lòng thử tìm với từ khóa khác hoặc bấm 'Xem tất cả'.</p>
                </div>
              ) : (
                filteredProcedures.map((proc) => {
                  const isTop4 = hasDirectForm(proc.code);

                  return (
                    <article
                      key={proc.code}
                      className="group p-3.5 sm:p-4 rounded-2xl border border-slate-100 hover:border-teal-200 hover:shadow-md transition-all duration-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative"
                    >
                      {/* Left: Document Icon + Content */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Certificate/Document Illustration Thumbnail */}
                        <div className="w-12 h-14 sm:w-14 sm:h-16 rounded-xl bg-gradient-to-b from-[#E0F2F1] to-[#B2DFDB] border border-teal-200 flex flex-col items-center justify-center p-1.5 shrink-0 shadow-2xs relative overflow-hidden group-hover:scale-105 transition-transform">
                          <div className="w-7 h-9 bg-white rounded-xs border border-teal-300 flex flex-col p-1 gap-0.5 shadow-2xs">
                            <div className="w-full h-1 bg-teal-600 rounded-xs" />
                            <div className="w-4/5 h-0.5 bg-slate-300 rounded-xs" />
                            <div className="w-full h-0.5 bg-slate-200 rounded-xs" />
                            <div className="w-3/5 h-0.5 bg-slate-200 rounded-xs" />
                          </div>
                          {/* Green Leaf or Seal Emblem */}
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-bold shadow-2xs">
                            ✓
                          </div>
                        </div>

                        {/* Middle Text Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-[#00796B] border border-teal-200">
                              {proc.code}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {proc.category}
                            </span>
                            {isTop4 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                Kê khai trực tuyến
                              </span>
                            )}
                          </div>

                          <h2
                            onClick={() => handleOpenA4(proc)}
                            className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#00796B] transition-colors leading-snug cursor-pointer line-clamp-2"
                            title={proc.name}
                          >
                            {proc.name}
                          </h2>

                          {/* Metadata row with date icon like in reference image */}
                          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1 font-mono text-slate-600">
                              <Calendar className="w-3.5 h-3.5 text-teal-600" />
                              <span>03/11/2026</span>
                            </span>

                            <span className="text-slate-300">•</span>

                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {proc.category === 'Hộ tịch'
                                  ? 'Giải quyết trong 01 ngày'
                                  : proc.category === 'Cư trú'
                                  ? '01 - 03 ngày làm việc'
                                  : '03 - 05 ngày làm việc'}
                              </span>
                            </span>

                            <span className="text-slate-300">•</span>

                            <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                              {proc.category === 'Hộ tịch' || proc.category === 'Bảo trợ xã hội'
                                ? 'Miễn phí'
                                : 'Theo quy định HĐND'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center mt-2 sm:mt-0">
                        {/* A4 Printable Document Preview */}
                        <button
                          type="button"
                          onClick={() => handleOpenA4(proc)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-[#00796B] hover:bg-teal-50 text-slate-700 hover:text-[#00796B] text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          title="Xem trước mẫu văn bản A4 chuẩn Nghị định 30/2020/NĐ-CP"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#00796B]" />
                          <span className="hidden md:inline">Mẫu A4</span>
                        </button>

                        {/* Direct Form or AI Consultation */}
                        {isTop4 ? (
                          <button
                            type="button"
                            onClick={() => navigate(getFormUrl(proc.code))}
                            className="px-3 py-1.5 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-bold flex items-center gap-1 transition shadow-xs cursor-pointer active:scale-95"
                          >
                            <span>Kê Khai</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/citizen?query=${encodeURIComponent('Thủ tục ' + proc.name + ' cần chuẩn bị giấy tờ gì?')}`)
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-100 text-[#00796B] text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                            title="Hỏi Trợ lý AI về thủ tục này"
                          >
                            <Bot className="w-3.5 h-3.5 text-[#00796B]" />
                            <span className="hidden lg:inline">Hỏi AI</span>
                          </button>
                        )}

                        <div className="text-teal-600 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all pl-1">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {/* Pagination / Summary Footer */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Hiển thị <strong>{filteredProcedures.length}</strong> / <strong>{PROCEDURES_CATALOG.length}</strong> thủ tục hành chính cấp Xã/Phường
              </span>
              <div className="flex items-center gap-1.5 text-teal-800 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#00796B]" />
                <span>Quy chuẩn Cổng Dịch Vụ Công Quốc Gia</span>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: UTH BRANDED ĐĂNG NHẬP HỆ THỐNG / TRA CỨU HỒ SƠ (From Image) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-4 sticky top-20">
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,121,107,0.08)] border border-teal-100/90 flex flex-col">
            
            {/* UTH Brand Header */}
            <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl sm:text-3xl font-black font-serif tracking-tight text-[#00796B]">
                  UTH
                </span>
                <div className="text-left leading-tight pl-2 border-l-2 border-[#B91C1C]">
                  <span className="block text-[10px] sm:text-[11px] font-black uppercase text-[#B91C1C] tracking-wider">
                    UNIVERSITY OF TRANSPORT
                  </span>
                  <span className="block text-[9px] sm:text-[10px] font-bold uppercase text-[#B91C1C] tracking-wide">
                    HOCHIMINH CITY
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-medium text-slate-500 mt-1">
                Hệ Thống Dịch Vụ Công Một Cửa Điện Tử
              </span>
            </div>

            {/* Mode Switcher: Login vs Dossier Tracking */}
            <div className="mt-4 flex rounded-xl bg-[#EEF2F6] p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setRightPanelTab('LOGIN')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  rightPanelTab === 'LOGIN'
                    ? 'bg-white text-[#00796B] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đăng Nhập
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('TRACKING')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  rightPanelTab === 'TRACKING'
                    ? 'bg-white text-[#00796B] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tra Cứu Tiến Độ
              </button>
            </div>

            {/* TAB 1: ĐĂNG NHẬP HỆ THỐNG (Matching Reference Image) */}
            {rightPanelTab === 'LOGIN' && (
              <form onSubmit={handleLoginSubmit} className="mt-5 flex flex-col gap-4">
                <div className="text-center">
                  <h2 className="text-[#B91C1C] font-extrabold text-base sm:text-lg tracking-wide uppercase">
                    ĐĂNG NHẬP HỆ THỐNG
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Dành cho công dân & sinh viên thực hiện thủ tục trực tuyến
                  </p>
                </div>

                {loginSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{loginSuccessMessage}</span>
                  </div>
                )}

                {/* Tài khoản đăng nhập */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Tài khoản đăng nhập
                  </label>
                  <input
                    type="text"
                    value={loginAccount}
                    onChange={(e) => setLoginAccount(e.target.value)}
                    placeholder="Nhập số CCCD hoặc Mã SV..."
                    className="w-full px-3.5 py-2.5 bg-[#EEF2F6] hover:bg-slate-100 focus:bg-white text-xs sm:text-sm font-medium text-slate-800 rounded-xl border border-slate-200 focus:border-[#00796B] focus:ring-1 focus:ring-[#00796B] outline-none transition"
                    required
                  />
                </div>

                {/* Mật khẩu with toggle visibility */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Nhập mật khẩu..."
                      className="w-full pl-3.5 pr-10 py-2.5 bg-[#EEF2F6] hover:bg-slate-100 focus:bg-white text-xs sm:text-sm font-medium text-slate-800 rounded-xl border border-slate-200 focus:border-[#00796B] focus:ring-1 focus:ring-[#00796B] outline-none transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary Button in Solid Teal (#00796B) */}
                <button
                  type="submit"
                  className="w-full mt-2 py-3 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-white font-bold text-xs sm:text-sm tracking-wider uppercase transition shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>ĐĂNG NHẬP</span>
                </button>

                {/* Sublink in Red (#B91C1C) */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => alert('Vui lòng liên hệ Bộ phận Một cửa hoặc xuất trình CCCD tại UBND cấp xã để cấp lại mật khẩu.')}
                    className="text-[#B91C1C] hover:text-red-800 text-xs font-bold uppercase tracking-wide hover:underline cursor-pointer"
                  >
                    QUÊN MẬT KHẨU?
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: TRA CỨU TIẾN ĐỘ HỒ SƠ CÔNG DÂN */}
            {rightPanelTab === 'TRACKING' && (
              <form onSubmit={handleTrackingLookup} className="mt-5 flex flex-col gap-4">
                <div className="text-center">
                  <h2 className="text-[#00796B] font-extrabold text-base sm:text-lg tracking-wide uppercase">
                    TRA CỨU TIẾN ĐỘ HỒ SƠ
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Nhập mã biên nhận hồ sơ Một Cửa để kiểm tra kết quả tức thì
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Mã hồ sơ / Số biên nhận Một Cửa
                  </label>
                  <input
                    type="text"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="VD: HSO-2026-KS-01, HSO-2026-CT01..."
                    className="w-full px-3.5 py-2.5 bg-[#EEF2F6] hover:bg-slate-100 focus:bg-white text-xs sm:text-sm font-mono text-slate-800 rounded-xl border border-slate-200 focus:border-[#00796B] focus:ring-1 focus:ring-[#00796B] outline-none transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-white font-bold text-xs uppercase tracking-wider transition shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Tra Cứu Ngay</span>
                </button>

                {/* Tracking Result Card */}
                {trackingResult && (
                  <div className="mt-2 p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 text-xs flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#00796B]">{trackingResult.code}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          trackingResult.status === 'READY'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {trackingResult.status === 'READY' ? 'Đã có kết quả' : 'Đang xử lý'}
                      </span>
                    </div>

                    <p className="font-bold text-slate-800">{trackingResult.procedure}</p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-teal-200/60">
                      <div>Người nộp: <strong>{trackingResult.applicant}</strong></div>
                      <div>Cán bộ: <strong>{trackingResult.officer}</strong></div>
                      <div>Ngày tiếp nhận: <strong>{trackingResult.submissionDate}</strong></div>
                      <div>Hẹn trả: <strong className="text-teal-800">{trackingResult.expectedDate}</strong></div>
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* Quick Helper Tips */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#00796B]" />
                <span>Tiện ích công dân trực tuyến:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600">
                <li>Tra cứu miễn phí toàn bộ 40 thủ tục hành chính cấp xã.</li>
                <li>Xem trước & in mẫu tờ khai A4 chuẩn Nghị định 30/2020/NĐ-CP.</li>
                <li>Hỏi đáp trợ lý AI 24/7 có trích dẫn điều khoản luật.</li>
              </ul>
            </div>

          </div>
        </div>

      </div>

      {/* A4 Printable Document Modal */}
      {selectedProcedureForModal && (
        <A4DocumentModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProcedureForModal(null);
          }}
          formType={getFormType(selectedProcedureForModal.code)}
          procedureCode={selectedProcedureForModal.code}
          procedureTitle={selectedProcedureForModal.name}
          legalBasis="Theo Quyết định công bố TTHC cấp Xã/Phường"
          initialData={{
            fullName: 'NGUYỄN VĂN HÒA',
            gender: 'Nam',
            dob: '15/08/1990',
            idNumber: '089205023490',
            phone: currentWard.phoneNumber,
            address: `${currentWard.name}, Tỉnh An Giang`,
          }}
        />
      )}
    </main>
  );
};

export default ProceduresCatalogPage;