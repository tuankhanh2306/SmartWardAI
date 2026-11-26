import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FileText,
  Clock,
  ShieldCheck,
  ChevronRight,
  X,
  Bot,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { PROCEDURES_CATALOG, type ProcedureCatalogItem } from '../data/proceduresCatalog';
import { getProcedures } from '../api/client';
import { useWard } from '../context/WardContext';
import DownwardDropdown from '../components/DownwardDropdown';
import { ProcedureSummaryCard } from '../components/ProcedureSummaryCard';
import { normalizeVi, highlightMatchedText } from '../utils/highlightMatch';
const A4DocumentModal = React.lazy(() => import('../components/A4DocumentModal'));

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

  // Search Recommendation Popover State
  const [searchFocused, setSearchFocused] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const resultsHeadingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchFocused) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchFocused]);

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

  const getFormUrl = (code: string, wardCode: string = currentWard.code) => {
    const cleanCode = code.trim().toUpperCase();
    if (['TTHC-CR-01', 'TTHC-HT-01', 'TTHC-HT-02', 'TTHC-BT-01'].includes(cleanCode)) {
      return `/citizen/form?procedure=${encodeURIComponent(cleanCode)}&ward=${encodeURIComponent(wardCode)}#form`;
    }
    return `/citizen/form?ward=${encodeURIComponent(wardCode)}#form`;
  };

  const quickProcedures = useMemo(
    () =>
      procedures.filter((p) =>
        ['TTHC-CR-01', 'TTHC-HT-01', 'TTHC-HT-02', 'TTHC-BT-01'].includes(p.code)
      ),
    [procedures]
  );

  // Dropdown options with live counts
  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        value: cat,
        label: cat === 'ALL' ? 'Tất cả nhóm' : cat,
        count: cat === 'ALL' ? procedures.length : procedures.filter((p) => p.category === cat).length,
      })),
    [categories, procedures]
  );

  const feeOptions = useMemo(() => {
    const freeCount = procedures.filter((p) => isFeeExempt(p)).length;
    const paidCount = procedures.length - freeCount;
    return [
      { value: 'ALL', label: 'Tất cả', count: procedures.length },
      { value: 'FREE', label: 'Miễn phí', count: freeCount },
      { value: 'PAID', label: 'Có lệ phí', count: paidCount },
    ];
  }, [procedures]);

  const modeOptions = useMemo(() => {
    const onlineCount = procedures.filter((p) => hasDirectForm(p.code)).length;
    const directCount = procedures.length - onlineCount;
    return [
      { value: 'ALL', label: 'Tất cả', count: procedures.length },
      { value: 'ONLINE', label: 'Kê khai trực tuyến', count: onlineCount },
      { value: 'DIRECT', label: 'Tải mẫu A4', count: directCount },
    ];
  }, [procedures]);

  // Search Recommend Groups (Matching user screenshot with highlighted matched terms)
  const searchRecommendationGroups = useMemo(() => {
    if (!searchFocused) return [];
    const cleanKw = normalizeVi(searchTerm).trim();

    if (!cleanKw) {
      // When focused with empty input, show common procedures grouped by category to aid forgotten names
      const preferredCats = ['Hộ tịch', 'Cư trú', 'Bảo trợ xã hội'];
      const groups: Array<[string, ProcedureCatalogItem[]]> = [];
      for (const cat of preferredCats) {
        const items = procedures.filter((p) => p.category === cat).slice(0, 2);
        if (items.length > 0) groups.push([cat, items]);
      }
      return groups;
    }

    const matched = procedures
      .filter(
        (p) =>
          normalizeVi(p.name).includes(cleanKw) ||
          normalizeVi(p.code).includes(cleanKw) ||
          normalizeVi(p.category).includes(cleanKw) ||
          normalizeVi(p.portalCode).includes(cleanKw)
      )
      .slice(0, 8);

    const map = new Map<string, ProcedureCatalogItem[]>();
    for (const item of matched) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries()).slice(0, 4);
  }, [searchFocused, searchTerm, procedures]);

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
            <span className="truncate">{officeStatusLabel}</span>
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
          className="relative z-30 w-full bg-white rounded-2xl p-5 sm:p-6 shadow-[0_6px_28px_rgba(15,23,42,0.06)] border border-slate-200/80"
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
            <div className="relative z-40 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
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

                <div ref={searchBoxRef} className="relative z-50">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="proc-keyword-input"
                    type="text"
                    value={searchTerm}
                    onFocus={() => setSearchFocused(true)}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSearchFocused(true);
                    }}
                    placeholder="Nhập tên hoặc mã thủ tục (VD: khai sinh, CT01...)"
                    className="w-full h-10 pl-10 pr-9 bg-white text-xs sm:text-sm text-slate-900 rounded-lg border border-slate-300 focus:border-[#B90E23] focus:ring-2 focus:ring-[#B90E23]/15 outline-none transition"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      aria-label="Xóa từ khóa tìm kiếm"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Search Recommend Autocomplete Popover (Highlighted Keywords & Category Grouping) */}
                  {searchRecommendationGroups.length > 0 && (
                    <div
                      role="region"
                      aria-label="Gợi ý thủ tục tìm kiếm"
                      className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 max-h-80 overflow-y-auto space-y-2.5"
                    >
                      <div className="px-2 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                        <span>
                          {searchTerm.trim()
                            ? 'Gợi ý khớp từ khóa'
                            : 'Thủ tục phổ biến'}
                        </span>
                        <span className="text-[10px] text-slate-600">Chọn nhanh</span>
                      </div>

                      {searchRecommendationGroups.map(([catName, items]) => (
                        <div key={catName} className="space-y-1">
                          <div className="flex items-center gap-2 px-2 py-1 text-xs font-bold text-slate-800">
                            <span className="w-5 h-5 rounded-md bg-[#FFF3E6] text-[#C2410C] flex items-center justify-center shrink-0">
                              <FolderOpen className="w-3.5 h-3.5" />
                            </span>
                            <span>{catName}</span>
                          </div>
                          {items.map((proc) => (
                            <button
                              key={proc.code}
                              type="button"
                              onClick={() => {
                                setSearchScope('ALL');
                                setSearchTerm(proc.name);
                                setSearchFocused(false);
                                resultsHeadingRef.current?.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'start',
                                });
                              }}
                              className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 transition flex items-start gap-2.5 cursor-pointer gov-focus-ring"
                            >
                              <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs sm:text-sm font-medium text-slate-900 truncate">
                                  {highlightMatchedText(proc.name, searchTerm)}
                                </div>
                                <div className="text-[11px] text-slate-600 truncate mt-0.5">
                                  &ldquo;Mã {highlightMatchedText(proc.code, searchTerm)} •{' '}
                                  {isFeeExempt(proc) ? 'Miễn 100% lệ phí' : 'Thu phí HĐND'}&rdquo;
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col gap-2">
                <label
                  id="proc-category-label"
                  htmlFor="proc-category-select"
                  className="text-xs font-bold text-slate-800"
                >
                  Nhóm thủ tục
                </label>
                <DownwardDropdown
                  id="proc-category-select"
                  labelId="proc-category-label"
                  value={selectedCategory}
                  options={categoryOptions}
                  onChange={setSelectedCategory}
                />
              </div>
            </div>

            {/* Row 2: Fee Status + Submission Mode + Authority */}
            <div className="relative z-30 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  id="proc-fee-label"
                  htmlFor="proc-fee-select"
                  className="text-xs font-semibold text-slate-700"
                >
                  Tình trạng lệ phí
                </label>
                <DownwardDropdown
                  id="proc-fee-select"
                  labelId="proc-fee-label"
                  value={feeFilter}
                  options={feeOptions}
                  onChange={(val) => setFeeFilter(val as 'ALL' | 'FREE' | 'PAID')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  id="proc-mode-label"
                  htmlFor="proc-mode-select"
                  className="text-xs font-semibold text-slate-700"
                >
                  Hình thức thực hiện
                </label>
                <DownwardDropdown
                  id="proc-mode-select"
                  labelId="proc-mode-label"
                  value={modeFilter}
                  options={modeOptions}
                  onChange={(val) => setModeFilter(val as 'ALL' | 'ONLINE' | 'DIRECT')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-700">Cơ quan tiếp nhận</span>
                <div className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center text-xs sm:text-sm font-medium text-slate-800 truncate">
                  UBND {currentWard.name}
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
                  Chuẩn NĐ 30/2020
                </span>
              </div>
              <span className="block w-14 h-[3px] bg-[#B90E23]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-stretch">
              {filteredProcedures.length === 0 ? (
                <div className="sm:col-span-2 bg-white rounded-xl border border-slate-200 text-center py-12 px-4 text-slate-600 flex flex-col items-center">
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
                  const freeFee = isFeeExempt(proc);
                  const supportedFormType =
                    proc.code === 'TTHC-CR-01'
                      ? 'CT01'
                      : proc.code === 'TTHC-HT-01'
                      ? 'TK-KS'
                      : proc.code === 'TTHC-HT-02'
                      ? 'TK-KH'
                      : proc.code === 'TTHC-BT-01'
                      ? 'TK-BTXH'
                      : null;
                  return (
                    <ProcedureSummaryCard
                      key={proc.code}
                      procedureCode={proc.code}
                      procedureName={proc.name}
                      category={proc.category}
                      isFeeExempt={freeFee}
                      feeLabel={freeFee ? 'Miễn phí' : 'Có thu phí'}
                      supportedFormType={supportedFormType}
                      ward={currentWard}
                      onStartForm={(code, _ft, wardCode) => navigate(getFormUrl(code, wardCode))}
                      onViewDocsAndOffice={() => handleOpenA4(proc)}
                    />
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
                4 thủ tục kê khai trực tuyến:
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
                  <span>Tra cứu hồ sơ</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* A4 Printable Document Modal */}
      {selectedProcedureForModal && isModalOpen && (
        <React.Suspense fallback={null}>
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
        </React.Suspense>
      )}
    </main>
  );
};

export default ProceduresCatalogPage;
