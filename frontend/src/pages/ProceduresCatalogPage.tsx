import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  X,
  Bot,
  Loader2,
  FileDown,
} from 'lucide-react';
import { PROCEDURES_CATALOG, type ProcedureCatalogItem } from '../data/proceduresCatalog';
import { getProcedures } from '../api/client';
import { useWard } from '../context/WardContext';
import A4DocumentModal from '../components/A4DocumentModal';

export const ProceduresCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentWard, isOfficeOpen, officeStatusLabel } = useWard();

  // Dynamic Procedures from REST API
  const [procedures, setProcedures] = useState<ProcedureCatalogItem[]>(PROCEDURES_CATALOG);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    getProcedures()
      .then((data) => {
        if (!isMounted || !data || data.length === 0) return;
        const deprecatedCodes = new Set(['TTHC-BT-06', 'TTHC-CR-05', 'TTHC-CT-03']);
        const mapped: ProcedureCatalogItem[] = data
          .filter((p) => !deprecatedCodes.has((p.procedureCode || '').trim().toUpperCase()))
          .map((p) => ({
            code: p.procedureCode,
            name: p.procedureName,
            category: p.category,
            portalCode: p.officialPortalCode || '',
            chunksCount: p.chunksCount || 4,
          }));
        setProcedures(mapped);
      })
      .catch((err) => {
        console.warn('Could not load dynamic procedures from backend API:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Multi-Criteria Search & Filter State (BCA Electronic Portal Layout)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState<'ALL' | 'CODE' | 'NAME'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [feeFilter, setFeeFilter] = useState<'ALL' | 'FREE' | 'PAID'>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'ONLINE' | 'DIRECT'>('ALL');

  // A4 Document Preview Modal State
  const [selectedProcedureForModal, setSelectedProcedureForModal] = useState<ProcedureCatalogItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const resultsHeadingRef = useRef<HTMLDivElement>(null);

  // Categories list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(procedures.map((p) => p.category)));
    return ['ALL', ...cats];
  }, [procedures]);

  // 100% Fee Exemption rule per Law on Fees and Charges 2015 (Luật Phí và Lệ phí 2015)
  const isFeeExempt = (proc: ProcedureCatalogItem): boolean => {
    const code = proc.code.toUpperCase();
    const cat = (proc.category || '').toLowerCase();
    const feeStr = (proc.fee || '').toLowerCase();

    if (cat.includes('hộ tịch') || cat.includes('bảo trợ')) return true;
    if (code.startsWith('TTHC-BT-') || code.startsWith('TTHC-HT-') || code === 'TTHC-CR-02') return true;
    if (feeStr.includes('miễn') || feeStr === '0' || feeStr === '0 đ' || feeStr === '0 vnđ') return true;
    return false;
  };

  // Check if procedure has direct online form declaration
  const hasDirectForm = (code: string) => {
    return ['TTHC-CR-01', 'TTHC-HT-01', 'TTHC-HT-02', 'TTHC-BT-01'].includes(code);
  };

  // Filtered procedures
  const filteredProcedures = useMemo(() => {
    const kw = searchTerm.trim().toLowerCase();
    return procedures.filter((item) => {
      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const feeFree = isFeeExempt(item);
      const matchFee =
        feeFilter === 'ALL' || (feeFilter === 'FREE' && feeFree) || (feeFilter === 'PAID' && !feeFree);
      const directForm = hasDirectForm(item.code);
      const matchMode =
        modeFilter === 'ALL' ||
        (modeFilter === 'ONLINE' && directForm) ||
        (modeFilter === 'DIRECT' && !directForm);

      let matchSearch = true;
      if (kw) {
        if (searchScope === 'CODE') {
          matchSearch =
            item.code.toLowerCase().includes(kw) || item.portalCode.toLowerCase().includes(kw);
        } else if (searchScope === 'NAME') {
          matchSearch =
            item.name.toLowerCase().includes(kw) || item.category.toLowerCase().includes(kw);
        } else {
          matchSearch =
            item.name.toLowerCase().includes(kw) ||
            item.code.toLowerCase().includes(kw) ||
            item.category.toLowerCase().includes(kw) ||
            item.portalCode.toLowerCase().includes(kw);
        }
      }

      return matchCat && matchFee && matchMode && matchSearch;
    });
  }, [procedures, selectedCategory, feeFilter, modeFilter, searchTerm, searchScope]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSearchScope('ALL');
    setSelectedCategory('ALL');
    setFeeFilter('ALL');
    setModeFilter('ALL');
  };

  // Handler to open A4 Modal
  const handleOpenA4 = (proc: ProcedureCatalogItem) => {
    setSelectedProcedureForModal(proc);
    setIsModalOpen(true);
  };

  // Determine form type for the modal covering all 40 commune procedures
  const getFormType = (code: string): string => {
    if (code === 'TTHC-CR-01') return 'CT01';
    if (code === 'TTHC-HT-01') return 'TK-KS';
    if (code === 'TTHC-HT-02') return 'TK-KH';
    if (code === 'TTHC-BT-01') return 'TK-BTXH';
    if (code === 'TTHC-CT-01' || code === 'TTHC-CT-02') return 'CHUNG-THUC';
    if (code === 'TTHC-DC-01') return 'DAT-DAI';
    if (code === 'TTHC-XD-01') return 'XAY-DUNG';
    if (code === 'TTHC-CR-02') return 'KHAI-TU';
    if (code === 'TTHC-BT-02') return 'MAI-TANG-PHI';
    if (code === 'TTHC-MT-01') return 'MOI-TRUONG';
    return 'GENERAL';
  };

  const getFormUrl = (code: string) => {
    if (code === 'TTHC-CR-01') return '/citizen/form?type=CT01#form';
    if (code === 'TTHC-HT-01') return '/citizen/form?type=TK-KS#form';
    if (code === 'TTHC-HT-02') return '/citizen/form?type=TK-KH#form';
    if (code === 'TTHC-BT-01') return '/citizen/form?type=TK-BTXH#form';
    return '/citizen/form#form';
  };

  const quickProcedures = useMemo(
    () =>
      procedures.filter((p) =>
        ['TTHC-CR-01', 'TTHC-HT-01', 'TTHC-HT-02', 'TTHC-BT-01'].includes(p.code)
      ),
    [procedures]
  );

  return (
    <main className="bg-[#F5F6F8] min-h-[calc(100vh-4rem)] px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col justify-start relative">
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-6 relative z-10">
        {/* Top Civic Office Hours Meta Line (like BCA Portal) */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 px-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOfficeOpen ? 'bg-[#16A34A]' : 'bg-[#CA8A04]'
                }`}
              />
              <span>UBND {currentWard.name}</span>
            </span>
            <span className="text-slate-300">|</span>
            <span>{officeStatusLabel}</span>
            <span className="hidden md:inline text-slate-300">|</span>
            <span className="hidden md:inline text-slate-600">{currentWard.workingHours}</span>
          </div>

          {isLoading && (
            <span className="inline-flex items-center gap-1.5 text-[#9F0C1E] font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang đồng bộ danh mục...</span>
            </span>
          )}
        </div>

        {/* Elevated White Multi-Criteria Search Card (BCA Reference Style) */}
        <section
          aria-label="Bộ lọc tra cứu thủ tục hành chính"
          className="w-full bg-white rounded-2xl p-5 sm:p-6 shadow-[0_6px_28px_rgba(15,23,42,0.06)] border border-slate-200/80"
        >
          <h1 className="sr-only">
            Danh mục và Tra cứu {procedures.length} Thủ tục hành chính UBND {currentWard.name}
          </h1>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              resultsHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="flex flex-col gap-4"
          >
            {/* Row 1: Keyword + Scope Radios (Left) & Procedure Group Select (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-8 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                  <label htmlFor="proc-keyword-input" className="text-xs font-bold text-slate-800">
                    Từ khóa tìm kiếm
                  </label>
                  <div
                    className="flex flex-wrap items-center gap-4 text-xs text-slate-700"
                    role="radiogroup"
                    aria-label="Phạm vi tìm kiếm"
                  >
                    {(
                      [
                        { id: 'ALL', label: 'Tất cả' },
                        { id: 'CODE', label: 'Mã thủ tục' },
                        { id: 'NAME', label: 'Tên & lĩnh vực' },
                      ] as const
                    ).map((opt) => (
                      <label
                        key={opt.id}
                        className="inline-flex items-center gap-1.5 cursor-pointer font-medium"
                      >
                        <input
                          type="radio"
                          name="proc-search-scope"
                          value={opt.id}
                          checked={searchScope === opt.id}
                          onChange={() => setSearchScope(opt.id)}
                          className="accent-[#B90E23] w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="proc-keyword-input"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nhập từ khóa (ví dụ: thông tin cư trú, khai sinh, kết hôn, CT01...)"
                    className="w-full h-10 pl-10 pr-9 bg-white text-xs sm:text-sm text-slate-900 rounded-lg border border-slate-300 focus:border-[#B90E23] focus:ring-2 focus:ring-[#B90E23]/15 outline-none transition"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      aria-label="Xóa từ khóa tìm kiếm"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col gap-2">
                <label htmlFor="proc-category-select" className="text-xs font-bold text-slate-800">
                  Nhóm thủ tục
                </label>
                <select
                  id="proc-category-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-10 px-3 bg-white text-xs sm:text-sm text-slate-900 rounded-lg border border-slate-300 focus:border-[#B90E23] focus:ring-2 focus:ring-[#B90E23]/15 outline-none transition cursor-pointer"
                >
                  {categories.map((cat) => {
                    const count =
                      cat === 'ALL'
                        ? procedures.length
                        : procedures.filter((p) => p.category === cat).length;
                    return (
                      <option key={cat} value={cat}>
                        {cat === 'ALL' ? `Tất cả nhóm thủ tục (${count})` : `${cat} (${count})`}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Row 2: Fee Status + Submission Mode + Authority */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="proc-fee-select" className="text-xs font-semibold text-slate-700">
                  Tình trạng lệ phí
                </label>
                <select
                  id="proc-fee-select"
                  value={feeFilter}
                  onChange={(e) => setFeeFilter(e.target.value as 'ALL' | 'FREE' | 'PAID')}
                  className="w-full h-10 px-3 bg-white text-xs sm:text-sm text-slate-900 rounded-lg border border-slate-300 focus:border-[#B90E23] outline-none transition cursor-pointer"
                >
                  <option value="ALL">Tất cả mức lệ phí</option>
                  <option value="FREE">Miễn 100% lệ phí (Luật 2015)</option>
                  <option value="PAID">Thu phí theo quy định HĐND</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="proc-mode-select" className="text-xs font-semibold text-slate-700">
                  Hình thức thực hiện
                </label>
                <select
                  id="proc-mode-select"
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value as 'ALL' | 'ONLINE' | 'DIRECT')}
                  className="w-full h-10 px-3 bg-white text-xs sm:text-sm text-slate-900 rounded-lg border border-slate-300 focus:border-[#B90E23] outline-none transition cursor-pointer"
                >
                  <option value="ALL">Tất cả hình thức</option>
                  <option value="ONLINE">Kê khai & tiền kiểm trực tuyến</option>
                  <option value="DIRECT">Mẫu biểu A4 chuẩn NĐ 30/2020</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-700">Cơ quan tiếp nhận</span>
                <div className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center text-xs sm:text-sm font-medium text-slate-800 truncate">
                  UBND {currentWard.name} (Một cửa cấp xã)
                </div>
              </div>
            </div>

            {/* Row 3: Right-Aligned Secondary Outline + Crimson Primary CTA */}
            <div className="pt-1 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-5 py-2.5 rounded-lg border border-[#B90E23] bg-white hover:bg-[#FEF2F2] text-[#9F0C1E] text-xs sm:text-sm font-semibold transition active:scale-[0.98] cursor-pointer gov-focus-ring"
              >
                Đặt lại bộ lọc
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-[#B90E23] hover:bg-[#8F0A1B] text-white text-xs sm:text-sm font-semibold transition active:scale-[0.98] cursor-pointer shadow-xs gov-focus-ring"
              >
                Tìm kiếm thủ tục ({filteredProcedures.length})
              </button>
            </div>
          </form>
        </section>

        {/* Asymmetric 2-Column Content (8 cols Left Results + 4 cols Right Quick Lookup) */}
        <div ref={resultsHeadingRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (8 Cols): KẾT QUẢ TRA CỨU */}
          <section aria-label="Kết quả tra cứu thủ tục" className="lg:col-span-8 flex flex-col gap-4">
            <div className="border-b border-slate-200 pb-0">
              <div className="flex items-center justify-between gap-2 pb-2">
                <h2 className="text-sm sm:text-base font-extrabold text-[#881320] uppercase tracking-wide">
                  KẾT QUẢ TRA CỨU ({filteredProcedures.length}/{procedures.length})
                </h2>
                <span className="text-xs text-slate-600 hidden sm:inline">
                  Chuẩn Nghị định 30/2020/NĐ-CP
                </span>
              </div>
              <span className="block w-14 h-[3px] bg-[#B90E23]" />
            </div>

            <div className="flex flex-col gap-3">
              {filteredProcedures.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 text-center py-12 px-4 text-slate-600 flex flex-col items-center">
                  <FileText className="w-10 h-10 text-slate-400 mb-2" />
                  <p className="font-semibold text-slate-800 text-sm">
                    Không tìm thấy thủ tục phù hợp với điều kiện lọc
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Vui lòng đổi từ khóa hoặc bấm &apos;Đặt lại bộ lọc&apos;.
                  </p>
                </div>
              ) : (
                filteredProcedures.map((proc) => {
                  const isTop4 = hasDirectForm(proc.code);
                  return (
                    <article
                      key={proc.code}
                      className="group p-4 rounded-xl border border-slate-200/90 hover:border-[#FCA5A5] hover:shadow-sm transition-all bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#FEF2F2] text-[#9F0C1E] border border-[#FECACA]">
                            {proc.code}
                          </span>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {proc.category}
                          </span>
                          {isTop4 && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                              Kê khai trực tuyến
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#9F0C1E] transition-colors leading-snug">
                          <button
                            type="button"
                            onClick={() => handleOpenA4(proc)}
                            className="text-left hover:underline cursor-pointer gov-focus-ring rounded"
                          >
                            {proc.name}
                          </button>
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>
                              {proc.category === 'Hộ tịch'
                                ? '01 ngày làm việc'
                                : proc.category === 'Cư trú'
                                ? '01 - 03 ngày làm việc'
                                : '03 - 05 ngày làm việc'}
                            </span>
                          </span>

                          <span className="text-slate-300">•</span>

                          {isFeeExempt(proc) ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded text-[11px]">
                              Miễn 100% lệ phí (Luật 2015)
                            </span>
                          ) : (
                            <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              Theo quy định HĐND
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleOpenA4(proc)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 hover:border-[#B90E23] hover:bg-[#FEF2F2] text-slate-700 hover:text-[#9F0C1E] text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer gov-focus-ring"
                          title="Xem trước và tải về bản Word (.docx) hoặc PDF chuẩn Nghị định 30/2020/NĐ-CP"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>Mẫu A4</span>
                        </button>

                        {isTop4 ? (
                          <button
                            type="button"
                            onClick={() => navigate(getFormUrl(proc.code))}
                            className="px-3.5 py-1.5 rounded-lg bg-[#B90E23] hover:bg-[#8F0A1B] text-white text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer shadow-2xs gov-focus-ring"
                          >
                            <span>Kê khai</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/citizen?query=${encodeURIComponent('Thủ tục ' + proc.name + ' cần chuẩn bị giấy tờ gì?')}`)
                            }
                            className="px-3 py-1.5 rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#9F0C1E] border border-[#FECACA] text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer gov-focus-ring"
                          >
                            <Bot className="w-3.5 h-3.5" />
                            <span>Hỏi AI</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          {/* RIGHT COLUMN (4 Cols): TRA CỨU NHANH */}
          <aside aria-label="Tra cứu nhanh" className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-28">
            <div className="border-b border-slate-200 pb-0">
              <div className="pb-2">
                <h2 className="text-sm sm:text-base font-extrabold text-[#881320] uppercase tracking-wide">
                  TRA CỨU NHANH
                </h2>
              </div>
              <span className="block w-14 h-[3px] bg-[#B90E23]" />
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4 flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-slate-700">
                4 thủ tục hỗ trợ tiền kiểm & kê khai trực tuyến:
              </p>
              <div className="flex flex-col divide-y divide-slate-100">
                {quickProcedures.map((qp) => (
                  <button
                    key={qp.code}
                    type="button"
                    onClick={() => navigate(getFormUrl(qp.code))}
                    className="py-2.5 px-1 text-left flex items-center justify-between gap-2 group hover:text-[#9F0C1E] transition cursor-pointer gov-focus-ring rounded"
                  >
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-slate-900 group-hover:text-[#9F0C1E] truncate">
                        {qp.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-600">{qp.code}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#B90E23] shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#F7EEDF] rounded-xl border border-[#E5D4B3] p-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-[#750715]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wide">Hỗ trợ Một cửa số</span>
              </div>
              <p className="text-xs text-[#2B1B17] leading-relaxed">
                Cần hỏi chi tiết điều kiện hoặc mẫu giấy tờ? Trợ lý AI sẵn sàng giải đáp 24/7 cho UBND {currentWard.name}.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/citizen')}
                  className="px-3 py-2 rounded-lg bg-[#B90E23] hover:bg-[#8F0A1B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer gov-focus-ring"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Hỏi đáp AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/citizen/form#tracking')}
                  className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-[#750715] border border-[#E5D4B3] text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer gov-focus-ring"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Tra cứu SLA</span>
                </button>
              </div>
            </div>
          </aside>
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
          initialData={(() => {
            try {
              const saved = localStorage.getItem('smartward_citizen_profile');
              if (saved) {
                const p = JSON.parse(saved);
                return {
                  fullName: p.fullName,
                  gender: p.gender,
                  dob: p.dob || p.dateOfBirth,
                  idNumber: p.idNumber || p.citizenCccd,
                  phone: p.phone || p.phoneNumber || currentWard.phoneNumber,
                  address: p.address || `${currentWard.name}, Tỉnh An Giang`,
                };
              }
            } catch {
              // Ignore JSON parse errors
            }
            return undefined;
          })()}
        />
      )}
    </main>
  );
};

export default ProceduresCatalogPage;
