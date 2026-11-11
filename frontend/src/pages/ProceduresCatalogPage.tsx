import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Megaphone,
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Printer,
  ChevronRight,
  X,
  Bot,
  Loader2
} from 'lucide-react';
import { PROCEDURES_CATALOG, type ProcedureCatalogItem } from '../data/proceduresCatalog';
import { getProcedures } from '../api/client';
import { useWard } from '../context/WardContext';
import A4DocumentModal from '../components/A4DocumentModal';

export const ProceduresCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentWard } = useWard();

  // Dynamic Procedures from REST API
  const [procedures, setProcedures] = useState<ProcedureCatalogItem[]>(PROCEDURES_CATALOG);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    getProcedures()
      .then((data) => {
        if (!isMounted || !data || data.length === 0) return;
        const mapped: ProcedureCatalogItem[] = data.map((p) => ({
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

  // Search & Category Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // A4 Document Preview Modal State
  const [selectedProcedureForModal, setSelectedProcedureForModal] = useState<ProcedureCatalogItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Categories list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(procedures.map((p) => p.category)));
    return ['ALL', ...cats];
  }, [procedures]);

  // Filtered procedures
  const filteredProcedures = useMemo(() => {
    return procedures.filter((item) => {
      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchSearch =
        searchTerm.trim() === '' ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.portalCode.includes(searchTerm);
      return matchCat && matchSearch;
    });
  }, [procedures, selectedCategory, searchTerm]);

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

  return (
    <main className="bg-uth-canvas bg-uth-watermark min-h-[calc(100vh-4rem)] p-3 sm:p-6 lg:p-8 flex flex-col justify-start relative">
      {/* Centered Main Layout Container (Không còn chia cột phụ đăng nhập) */}
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-6 items-center relative z-10">
        
        {/* Main Procedures Container */}
        <div className="w-full bg-white rounded-3xl p-5 sm:p-8 shadow-[0_4px_24px_rgba(0,121,107,0.08)] border border-teal-100/90 flex flex-col">
          
          {/* Header section with Megaphone and Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 text-[#00796B] flex items-center justify-center shrink-0 shadow-2xs border border-teal-200">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-[#00796B] font-bold text-base sm:text-xl tracking-tight uppercase">
                  DANH MỤC THỦ TỤC & GIẤY TỜ HÀNH CHÍNH
                </h1>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-2">
                  <span>Cập nhật mới nhất từ Cổng Dịch Vụ Công Quốc Gia • UBND {currentWard.name}</span>
                  {isLoading && (
                    <span className="inline-flex items-center gap-1 text-[#00796B] font-semibold text-[11px]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Đang đồng bộ...</span>
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Actions / Reset Filter */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('ALL');
                  setSearchTerm('');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#00796B] text-[#00796B] hover:bg-teal-50 text-xs font-semibold transition active:scale-95 cursor-pointer shadow-2xs"
              >
                <span>Xem tất cả ({procedures.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm thủ tục (khai sinh, cư trú, kết hôn, bảo trợ, đất đai, cấp giấy...)"
                className="w-full pl-9 pr-8 py-2.5 bg-[#EEF2F6] hover:bg-slate-100 focus:bg-white text-xs sm:text-sm text-slate-800 rounded-xl border border-slate-200 focus:border-[#00796B] focus:ring-1 focus:ring-[#00796B] outline-none transition"
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

            {selectedCategory !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>

          {/* Horizontal Scrollable Category Chips */}
          <div className="mt-3.5 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count =
                cat === 'ALL'
                  ? procedures.length
                  : procedures.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
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

          {/* Procedures List */}
          <div className="mt-5 flex flex-col gap-3">
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
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Hiển thị <strong>{filteredProcedures.length}</strong> / <strong>{procedures.length}</strong> thủ tục hành chính cấp Xã/Phường
            </span>
            <div className="flex items-center gap-1.5 text-teal-800 font-medium">
              <ShieldCheck className="w-4 h-4 text-[#00796B]" />
              <span>Quy chuẩn Cổng Dịch Vụ Công Quốc Gia</span>
            </div>
          </div>

        </div>
      </div>

      {/* MINI FLOATING CHATBOT AT BOTTOM RIGHT WITH LEAD-IN ANIMATION */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {/* Animated Tooltip Bubble leading to full chat */}
        <button
          type="button"
          onClick={() => navigate('/citizen')}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-800 rounded-2xl shadow-xl border border-teal-200 text-xs font-semibold hover:border-[#00796B] hover:bg-teal-50/50 transition-all cursor-pointer animate-bounce active:scale-95 group"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span>Hỏi đáp thủ tục với <strong>Trợ lý AI</strong></span>
          <ArrowRight className="w-3.5 h-3.5 text-[#00796B] group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Floating Action Button */}
        <button
          type="button"
          onClick={() => navigate('/citizen')}
          className="relative p-4 rounded-full bg-[#00796B] hover:bg-[#00695C] text-white shadow-[0_8px_25px_rgba(0,121,107,0.4)] hover:shadow-[0_12px_32px_rgba(0,121,107,0.5)] transition-all duration-300 active:scale-90 cursor-pointer flex items-center justify-center group"
          title="Mở Trợ Lý Pháp Lý AI Một Cửa (Toàn Màn Hình)"
        >
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[9px] font-bold text-white items-center justify-center">1</span>
          </span>
          <Bot className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
        </button>
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