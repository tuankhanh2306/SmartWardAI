import { useState, useEffect } from 'react';
import OfficerSidebar from '../components/OfficerSidebar';
import {
  FileText,
  CreditCard,
  Home,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Contrast,
  Filter,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Clock,
  ExternalLink,
  ChevronUp,
  X,
  Send,
  Lock,
  Key,
  Award
} from 'lucide-react';

export default function OfficerFormAudit() {
  // Viewer state
  const [zoom, setZoom] = useState<number>(100);
  const [rotate, setRotate] = useState<number>(0);
  const [isContrast, setIsContrast] = useState<boolean>(false);
  const [isBw, setIsBw] = useState<boolean>(false);
  const [highlightedBox, setHighlightedBox] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<'ct01' | 'cccd' | 'contract'>('ct01');

  // Popovers & Modals
  const [isSupplementOpen, setIsSupplementOpen] = useState<boolean>(false);
  const [isHttp410Open, setIsHttp410Open] = useState<boolean>(false);
  const [isApprovedOpen, setIsApprovedOpen] = useState<boolean>(false);
  const [supplementReason, setSupplementReason] = useState<string[]>([]);
  const [supplementNote, setSupplementNote] = useState<string>('');

  // TTL Countdown state (Simulating Redis single-use vault token)
  const [ttlSeconds, setTtlSeconds] = useState<number>(85512); // ~23:45:12

  useEffect(() => {
    const timer = setInterval(() => {
      setTtlSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTtl = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 175));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 70));
  const handleRotate = () => setRotate((prev) => (prev + 90) % 360);

  const toggleReason = (reason: string) => {
    setSupplementReason((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  return (
    <div className="flex bg-[#FAF8FF] min-h-screen text-[#131B2E]">
      {/* Officer Fixed Sidebar */}
      <OfficerSidebar activeMenu="audit" />

      {/* Main Content Pane */}
      <main className="flex-1 ml-64 flex flex-col min-w-0">
        {/* Breadcrumb & Dossier Meta Header */}
        <section className="bg-white border-b border-[#EAEDFF] px-6 py-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#444651] mb-1 font-medium">
                <span>Hệ Thống Quản Trị Phường 25</span>
                <span>/</span>
                <span>Tiếp Nhận Sơ Duyệt Cư Trú</span>
                <span>/</span>
                <span className="text-[#00236F] font-bold">Hồ Sơ CT01-2026-0894</span>
              </div>
              <h1 className="text-xl font-bold text-[#00236F] flex items-center gap-2">
                Bàn Sơ Duyệt Tờ Khai Cư Trú (Mẫu CT01)
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#ACEDFF] text-[#004E5C]">
                  Đang Xử Lý
                </span>
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#444651] mt-1.5">
                <span>
                  Hồ sơ: <strong className="text-[#131B2E]">CT01-2026-0894</strong>
                </span>
                <span>
                  Công dân: <strong className="text-[#131B2E]">Nguyễn Văn An (P.25)</strong>
                </span>
                <span>
                  Cán bộ thụ lý: <strong className="text-[#131B2E]">Trần Thị Hương (P.25)</strong>
                </span>
                <span className="flex items-center gap-1 text-[#00687A]">
                  <Clock className="w-3.5 h-3.5" />
                  Khởi tạo: 04/11/2026 08:50:14
                </span>
              </div>
            </div>

            {/* Zero-Trust Vault Security Status Widget */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-3 bg-[#F2F3FF] rounded-xl border border-[#EAEDFF]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#00236F]/10 flex items-center justify-center text-[#00236F] shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-[#444651] tracking-wider">
                    Kho Bảo Mật Zero-Trust
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-[#131B2E]">
                    <span className="w-2 h-2 rounded-full bg-[#00687A] animate-pulse" />
                    <span className="font-mono text-[11px]">GET /vault/view/tk_9a8f21cd7</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:pl-4 sm:border-l sm:border-[#DAE2FD]">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#444651]">TTL Liên Kết Tự Hủy</span>
                  <span className="text-base font-mono font-bold text-[#00236F] tracking-tight">
                    {formatTtl(ttlSeconds)}
                  </span>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DCE1FF] text-[#00164E] text-[10px] font-semibold">
                    <ShieldCheck className="w-3 h-3" /> NĐ 13/2023/NĐ-CP
                  </span>
                  <button
                    onClick={() => setIsHttp410Open(true)}
                    className="text-[11px] text-[#00236F] hover:underline flex items-center gap-0.5 font-medium"
                    type="button"
                  >
                    <span>Mô phỏng HTTP 410</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Side-by-Side Verification Core Desk */}
        <section className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1">
          {/* LEFT PANE: Citizen Original Scan Document Viewer (6 cols) */}
          <div className="xl:col-span-6 flex flex-col bg-white rounded-xl shadow-sm border border-[#EAEDFF] overflow-hidden">
            {/* Document Controls & Metatags */}
            <div className="p-3 bg-[#EAEDFF] flex flex-wrap items-center justify-between gap-2 border-b border-[#DAE2FD]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00236F]" />
                <span className="font-bold text-sm text-[#131B2E]">Tờ Khai CT01 & CCCD Bản Gốc</span>
                <span className="px-2 py-0.5 bg-[#DAE2FD] text-[#00236F] text-xs rounded-md font-semibold">
                  Trang 1/2
                </span>
              </div>

              {/* Zoom & Filter Toolbar */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-sm border border-[#DAE2FD]">
                <button
                  onClick={handleZoomOut}
                  className="p-1 rounded hover:bg-[#EAEDFF] text-[#444651] transition"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs px-1 font-mono font-bold min-w-[42px] text-center text-[#131B2E]">
                  {zoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1 rounded hover:bg-[#EAEDFF] text-[#444651] transition"
                  title="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-[#C5C5D3] mx-1" />
                <button
                  onClick={handleRotate}
                  className="p-1 rounded hover:bg-[#EAEDFF] text-[#444651] transition"
                  title="Xoay 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsContrast(!isContrast)}
                  className={`p-1 rounded transition ${isContrast ? 'bg-[#00236F] text-white' : 'hover:bg-[#EAEDFF] text-[#444651]'}`}
                  title="Tăng tương phản"
                >
                  <Contrast className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsBw(!isBw)}
                  className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
                    isBw ? 'bg-[#00236F] text-white' : 'bg-[#EAEDFF] text-[#00236F] hover:bg-[#DAE2FD]'
                  }`}
                  title="Bộ lọc OCR Trắng Đen"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>OCR B/W</span>
                </button>
              </div>
            </div>

            {/* Scanned Canvas Viewport with Diagonal Watermark */}
            <div className="relative w-full h-[620px] bg-[#D2D9F4]/40 overflow-auto flex items-center justify-center p-4 select-none">
              <div
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotate}deg)`,
                  filter: `${isContrast ? 'contrast(1.4)' : ''} ${isBw ? 'grayscale(1) contrast(1.6)' : ''}`
                }}
                className="relative w-[480px] min-h-[660px] bg-white rounded shadow-md p-6 overflow-hidden transition-transform duration-200"
              >
                {/* FRAUD-PREVENTION DIAGONAL WATERMARK */}
                <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-around overflow-hidden opacity-25 select-none">
                  {[1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className="-rotate-45 transform whitespace-nowrap text-[#BA1A1A] font-mono text-[10px] font-bold tracking-wider uppercase text-center py-3"
                    >
                      CHỈ DÙNG ĐỂ SƠ DUYỆT TẠI UBND PHƯỜNG 25 - 04/11/2026 08:50 - CÁN BỘ: TRẦN THỊ HƯƠNG - KHÔNG CÓ GIÁ TRỊ THỰC THI PHÁP LÝ NGOÀI PHIÊN LÀM VIỆC
                    </div>
                  ))}
                </div>

                {/* Document Header */}
                <div className="relative z-10 text-center pb-2">
                  <span className="text-[10px] uppercase font-bold text-[#131B2E] block leading-tight">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </span>
                  <span className="text-[9px] text-[#444651] block font-semibold">
                    Độc lập - Tự do - Hạnh phúc
                  </span>
                  <div className="w-14 h-0.5 bg-[#131B2E] mx-auto my-1.5" />
                  <span className="text-xs font-bold text-[#131B2E] block tracking-wide mt-1">
                    TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ
                  </span>
                  <span className="text-[9px] text-[#444651] italic block">
                    (Mẫu CT01 ban hành kèm theo Thông tư số 56/2021/TT-BCA)
                  </span>
                </div>

                {/* Document Body with Interactive OCR Bounding Boxes */}
                <div className="relative z-10 mt-3 flex flex-col gap-2.5 text-[11px] leading-tight text-[#131B2E]">
                  <div className="flex items-center">
                    <span className="font-semibold w-24">Kính gửi:</span>
                    <span className="flex-1 font-medium bg-[#EAEDFF]/60 px-1.5 py-0.5 rounded text-[11px]">
                      Công an Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh
                    </span>
                  </div>

                  {/* OCR Box 1: Name */}
                  <div
                    onMouseEnter={() => setHighlightedBox('name')}
                    onMouseLeave={() => setHighlightedBox(null)}
                    className={`p-1 rounded relative cursor-pointer transition-all ${
                      highlightedBox === 'name'
                        ? 'bg-[#ACEDFF]/60 ring-2 ring-[#00687A]'
                        : 'bg-[#57DFFE]/10 hover:bg-[#57DFFE]/20'
                    }`}
                  >
                    <span className="absolute -top-2.5 right-1 bg-[#00687A] text-white font-mono text-[8px] px-1 py-0.2 rounded font-bold">
                      OCR 99.1%
                    </span>
                    <div className="flex items-baseline">
                      <span className="font-semibold w-28 text-[#444651]">1. Họ, chữ đệm và tên:</span>
                      <span className="font-bold text-[#00236F] tracking-wide text-xs">NGUYỄN VĂN AN</span>
                    </div>
                  </div>

                  {/* OCR Box 2: DOB & Gender */}
                  <div
                    onMouseEnter={() => setHighlightedBox('dob')}
                    onMouseLeave={() => setHighlightedBox(null)}
                    className={`p-1 rounded relative cursor-pointer transition-all ${
                      highlightedBox === 'dob'
                        ? 'bg-[#ACEDFF]/60 ring-2 ring-[#00687A]'
                        : 'bg-[#57DFFE]/10 hover:bg-[#57DFFE]/20'
                    }`}
                  >
                    <span className="absolute -top-2.5 right-1 bg-[#00687A] text-white font-mono text-[8px] px-1 py-0.2 rounded font-bold">
                      OCR 96.0%
                    </span>
                    <div className="grid grid-cols-2">
                      <div className="flex items-baseline">
                        <span className="font-semibold w-20 text-[#444651]">2. Ngày sinh:</span>
                        <span className="font-bold text-[#131B2E]">15/08/1995</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="font-semibold w-16 text-[#444651]">3. Giới tính:</span>
                        <span className="font-bold text-[#131B2E]">Nam</span>
                      </div>
                    </div>
                  </div>

                  {/* OCR Box 3: Citizen ID */}
                  <div
                    onMouseEnter={() => setHighlightedBox('id')}
                    onMouseLeave={() => setHighlightedBox(null)}
                    className={`p-1 rounded relative cursor-pointer transition-all ${
                      highlightedBox === 'id'
                        ? 'bg-[#ACEDFF]/60 ring-2 ring-[#00687A]'
                        : 'bg-[#57DFFE]/10 hover:bg-[#57DFFE]/20'
                    }`}
                  >
                    <span className="absolute -top-2.5 right-1 bg-[#00687A] text-white font-mono text-[8px] px-1 py-0.2 rounded font-bold">
                      OCR 98.7%
                    </span>
                    <div className="grid grid-cols-2">
                      <div className="flex items-baseline">
                        <span className="font-semibold w-20 text-[#444651]">4. Số CCCD:</span>
                        <span className="font-mono font-bold text-[#00236F]">079095012345</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="font-semibold w-16 text-[#444651]">5. Ngày cấp:</span>
                        <span className="font-bold text-[#131B2E]">20/09/2021</span>
                      </div>
                    </div>
                  </div>

                  {/* OCR Box 4: Address */}
                  <div
                    onMouseEnter={() => setHighlightedBox('address')}
                    onMouseLeave={() => setHighlightedBox(null)}
                    className={`p-1 rounded relative cursor-pointer transition-all ${
                      highlightedBox === 'address'
                        ? 'bg-[#ACEDFF]/60 ring-2 ring-[#00687A]'
                        : 'bg-[#57DFFE]/10 hover:bg-[#57DFFE]/20'
                    }`}
                  >
                    <span className="absolute -top-2.5 right-1 bg-[#00687A] text-white font-mono text-[8px] px-1 py-0.2 rounded font-bold">
                      OCR 93.4%
                    </span>
                    <div className="flex items-baseline">
                      <span className="font-semibold w-28 text-[#444651]">6. Nơi thường trú:</span>
                      <span className="font-bold text-[#131B2E]">Số 15 Võ Oanh, Phường 25, Bình Thạnh, TP.HCM</span>
                    </div>
                  </div>

                  <div className="flex items-baseline">
                    <span className="font-semibold w-28 text-[#444651]">7. Nội dung đề nghị:</span>
                    <span className="font-medium text-[#131B2E]">Đăng ký thường trú theo diện chuyển chỗ ở hợp pháp</span>
                  </div>

                  {/* Signatures */}
                  <div className="mt-6 pt-3 grid grid-cols-2 text-center">
                    <div>
                      <span className="text-[10px] text-[#444651] block font-semibold">Ý KIẾN CỦA CHỦ HỘ</span>
                      <span className="text-[8px] italic text-[#444651] block">(Ký, ghi rõ họ tên)</span>
                      <div className="h-12 flex items-center justify-center font-serif italic text-[#00236F]/70 text-base">
                        Nguyễn Văn Tuấn
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#131B2E] block font-semibold">NGƯỜI KÊ KHAI</span>
                      <span className="text-[8px] italic text-[#444651] block">(Ký, ghi rõ họ tên)</span>
                      <div
                        onMouseEnter={() => setHighlightedBox('signature')}
                        onMouseLeave={() => setHighlightedBox(null)}
                        className={`h-12 flex items-center justify-center font-serif italic text-[#00236F] text-lg font-bold rounded cursor-pointer relative ${
                          highlightedBox === 'signature'
                            ? 'bg-[#ACEDFF]/60 ring-2 ring-[#00687A]'
                            : 'bg-[#57DFFE]/10'
                        }`}
                      >
                        <span className="absolute -top-2 right-1 bg-[#00687A] text-white font-mono text-[8px] px-1 py-0.2 rounded font-bold">
                          Match 98%
                        </span>
                        Nguyễn Văn An
                      </div>
                    </div>
                  </div>

                  {/* Footprint */}
                  <div className="flex items-center justify-between text-[8px] text-[#444651] mt-3 pt-2 border-t border-[#EAEDFF]">
                    <span className="font-mono">MÃ KIỂM TRA ĐIỆN TỬ: 7F82-D09B-12C4</span>
                    <span>Được số hóa bởi Hệ thống SmartWard AI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scanned Thumbnail Strip */}
            <div className="p-2.5 bg-[#F2F3FF] flex items-center gap-2 overflow-x-auto border-t border-[#DAE2FD]">
              <span className="text-xs font-semibold text-[#00236F] shrink-0 pl-1">
                Tài liệu kèm theo:
              </span>
              <button
                onClick={() => setActiveDoc('ct01')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeDoc === 'ct01' ? 'bg-[#1E3A8A] text-white' : 'bg-white hover:bg-[#EAEDFF] text-[#131B2E]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Bản scan CT01 (2 trang)</span>
              </button>
              <button
                onClick={() => setActiveDoc('cccd')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeDoc === 'cccd' ? 'bg-[#1E3A8A] text-white' : 'bg-white hover:bg-[#EAEDFF] text-[#131B2E]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-[#00687A]" />
                <span>CCCD Gắn Chip (2 mặt)</span>
              </button>
              <button
                onClick={() => setActiveDoc('contract')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeDoc === 'contract' ? 'bg-[#1E3A8A] text-white' : 'bg-white hover:bg-[#EAEDFF] text-[#131B2E]'
                }`}
              >
                <Home className="w-3.5 h-3.5 text-[#00687A]" />
                <span>Hợp đồng thuê nhà / Sổ hồng</span>
              </button>
            </div>
          </div>

          {/* RIGHT PANE: AI Rule Engine Audit Report (6 cols) */}
          <div className="xl:col-span-6 flex flex-col gap-4">
            {/* OCR AI Health Confidence Banner */}
            <div className="p-4 bg-white rounded-xl shadow-sm border border-[#EAEDFF]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* SVG Gauge for 94.2% AI Confidence */}
                  <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-[#DAE2FD]"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                      />
                      <path
                        className="text-[#00687A] transition-all duration-1000 ease-out"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray="94.2, 100"
                        strokeLinecap="round"
                        strokeWidth="3.5"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#00236F]">
                      94.2%
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[#00236F]">
                        Điểm Tin Cậy OCR: 94.2%
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#ACEDFF] text-[#004E5C] text-xs font-bold">
                        ĐẠT CHUẨN SƠ DUYỆT
                      </span>
                    </div>
                    <p className="text-xs text-[#444651] mt-0.5">
                      Được AI Rule Engine Phường 25 tự động đối chiếu chéo thời gian thực với CSDL Dân cư Quốc gia (Đề án 06/CP).
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0">
                  <span className="text-xs text-[#444651]">Trạng thái xác thực</span>
                  <span className="text-sm text-[#00687A] font-bold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> 4/4 Trường Hợp Lệ
                  </span>
                </div>
              </div>
            </div>

            {/* Field-by-Field Cross Verification Audit Table */}
            <div className="bg-white rounded-xl shadow-sm border border-[#EAEDFF] overflow-hidden flex-1 flex flex-col">
              <div className="px-4 py-3 bg-[#EAEDFF] flex items-center justify-between border-b border-[#DAE2FD]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#00236F]" />
                  <span className="font-bold text-sm text-[#131B2E]">
                    Bảng Đối Soát Từng Trường Dữ Liệu
                  </span>
                </div>
                <span className="text-xs text-[#444651]">
                  Hover vào từng dòng để định vị toạ độ scan
                </span>
              </div>

              <div className="divide-y divide-[#EAEDFF] flex-1 overflow-y-auto">
                {/* Field Row 1: Full Name */}
                <div
                  onMouseEnter={() => setHighlightedBox('name')}
                  onMouseLeave={() => setHighlightedBox(null)}
                  className={`p-3.5 transition-colors cursor-pointer group ${
                    highlightedBox === 'name' ? 'bg-[#F2F3FF]' : 'hover:bg-[#FAF8FF]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#00687A] shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#444651] uppercase">
                            1. Họ và tên công dân
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-[#EAEDFF] font-mono text-[10px] text-[#131B2E] font-semibold">
                            99.1% conf.
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-sm font-bold text-[#00236F]">NGUYỄN VĂN AN</span>
                          <span className="text-xs text-[#444651] flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-[#00687A]" />
                            Khớp 100% CSDL Dân cư Quốc gia
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#ACEDFF] text-[#004E5C] text-xs font-semibold shrink-0">
                      Hợp Lệ
                    </span>
                  </div>
                </div>

                {/* Field Row 2: CCCD & Logic Breakdown */}
                <div
                  onMouseEnter={() => setHighlightedBox('id')}
                  onMouseLeave={() => setHighlightedBox(null)}
                  className={`p-3.5 transition-colors cursor-pointer group ${
                    highlightedBox === 'id' ? 'bg-[#F2F3FF]' : 'hover:bg-[#FAF8FF]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#00687A] shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#444651] uppercase">
                            2. Số CCCD Gắn Chip
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-[#EAEDFF] font-mono text-[10px] text-[#131B2E] font-semibold">
                            98.7% conf.
                          </span>
                        </div>
                        <div className="mt-1">
                          <span className="text-sm font-mono font-bold text-[#00236F] tracking-wider">
                            079095012345
                          </span>
                        </div>
                        {/* Logic breakdown pills */}
                        <div className="mt-2 p-2 bg-[#F2F3FF] rounded-lg flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white font-mono text-[11px] border border-[#DAE2FD]">
                            Mã tỉnh: <strong className="text-[#00236F]">079</strong> (TP.HCM)
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white font-mono text-[11px] border border-[#DAE2FD]">
                            Giới tính: <strong className="text-[#00236F]">0</strong> (Nam, TK 20)
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white font-mono text-[11px] border border-[#DAE2FD]">
                            Năm sinh: <strong className="text-[#00236F]">95</strong> (1995)
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white font-mono text-[11px] border border-[#DAE2FD]">
                            Ngẫu nhiên: <strong className="text-[#00236F]">012345</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#ACEDFF] text-[#004E5C] text-xs font-semibold shrink-0">
                      Hợp Lệ
                    </span>
                  </div>
                </div>

                {/* Field Row 3: DOB & Age */}
                <div
                  onMouseEnter={() => setHighlightedBox('dob')}
                  onMouseLeave={() => setHighlightedBox(null)}
                  className={`p-3.5 transition-colors cursor-pointer group ${
                    highlightedBox === 'dob' ? 'bg-[#F2F3FF]' : 'hover:bg-[#FAF8FF]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#00687A] shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#444651] uppercase">
                            3. Ngày sinh / Ngày cấp thẻ
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-[#EAEDFF] font-mono text-[10px] text-[#131B2E] font-semibold">
                            96.0% conf.
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span>
                            Sinh: <strong className="text-[#131B2E]">15/08/1995</strong>
                          </span>
                          <span>
                            Cấp: <strong className="text-[#131B2E]">20/09/2021</strong>
                          </span>
                          <span className="text-[#444651]">
                            (Tuổi cấp thẻ: <strong className="text-[#00236F]">26 tuổi</strong> - Đúng mốc quy định 25 tuổi, hợp lệ)
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#ACEDFF] text-[#004E5C] text-xs font-semibold shrink-0">
                      Hợp Lệ
                    </span>
                  </div>
                </div>

                {/* Field Row 4: Permanent Address */}
                <div
                  onMouseEnter={() => setHighlightedBox('address')}
                  onMouseLeave={() => setHighlightedBox(null)}
                  className={`p-3.5 transition-colors cursor-pointer group ${
                    highlightedBox === 'address' ? 'bg-[#F2F3FF]' : 'hover:bg-[#FAF8FF]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#00687A] shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#444651] uppercase">
                            4. Nơi thường trú đề nghị
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-[#EAEDFF] font-mono text-[10px] text-[#131B2E] font-semibold">
                            93.4% conf.
                          </span>
                        </div>
                        <div className="mt-1">
                          <span className="text-xs font-bold text-[#131B2E]">
                            Số 15 Võ Oanh, Phường 25, Quận Bình Thạnh, TP.HCM
                          </span>
                        </div>
                        <p className="text-[11px] text-[#444651] mt-0.5">
                          Địa chỉ hợp lệ trong địa bàn hành chính Phường 25. Trùng khớp cơ sở dữ liệu số nhà địa chính.
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#ACEDFF] text-[#004E5C] text-xs font-semibold shrink-0">
                      Hợp Lệ
                    </span>
                  </div>
                </div>
              </div>

              {/* Biometric Signature Verification Alert */}
              <div
                onMouseEnter={() => setHighlightedBox('signature')}
                onMouseLeave={() => setHighlightedBox(null)}
                className="p-3.5 bg-[#F2F3FF] border-t border-[#EAEDFF] flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#00687A]/15 flex items-center justify-center text-[#00687A] shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#131B2E]">
                        Xác Thực Sinh Trắc Chữ Ký Số Hóa:
                      </span>
                      <span className="text-xs font-bold text-[#00687A]">Trùng khớp 98%</span>
                    </div>
                    <span className="text-[11px] text-[#444651]">
                      Chữ ký của công dân trùng khớp với hồ sơ cấp CCCD gắn chip lưu tại Bộ Công an.
                    </span>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-[#00687A] shrink-0" />
              </div>
            </div>

            {/* Zero-Trust Ephemeral Vault summary card */}
            <div className="p-4 bg-white rounded-xl shadow-sm border border-[#EAEDFF] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] flex items-center justify-center text-white shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#131B2E]">
                      Mã Khóa Dữ Liệu Tự Động Phường 25
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#EAEDFF] text-[#00236F] font-mono font-bold text-[10px]">
                      AES-256-GCM Ephemeral
                    </span>
                  </div>
                  <p className="text-[11px] text-[#444651] mt-0.5">
                    Dữ liệu được tải trực tiếp từ Kho Bảo Mật Zero-Trust với cơ chế bảo vệ danh tính công dân.
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-[#444651] block">Phiên làm việc:</span>
                <span className="text-xs font-bold text-[#00687A]">Single-Use Token</span>
              </div>
            </div>
          </div>
        </section>

        {/* Space for sticky action dock */}
        <div className="h-20" />

        {/* STICKY BOTTOM ACTION BAR */}
        <aside className="fixed bottom-0 right-0 left-64 z-30 bg-white/95 backdrop-blur-md border-t border-[#EAEDFF] px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#00687A] animate-pulse" />
              <span className="text-xs font-semibold text-[#131B2E]">Tình trạng hồ sơ:</span>
              <span className="px-2.5 py-0.5 rounded bg-[#ACEDFF] text-[#004E5C] text-xs font-bold">
                SẴN SÀNG DUYỆT
              </span>
            </div>
            <span className="hidden md:inline text-xs text-[#444651]">
              Tất cả 4/4 tiêu chí đều đạt điểm tin cậy trên 90%.
            </span>
          </div>

          <div className="flex items-center gap-2.5 relative">
            {/* Popover toggle: Yêu Cầu Bổ Sung */}
            <div className="relative">
              <button
                onClick={() => setIsSupplementOpen(!isSupplementOpen)}
                className="h-9 px-3.5 bg-[#BA1A1A] text-white hover:bg-[#BA1A1A]/90 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition"
                type="button"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Yêu Cầu Bổ Sung</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>

              {/* Popover form */}
              {isSupplementOpen && (
                <div className="absolute bottom-12 right-0 w-80 bg-white rounded-xl shadow-2xl border border-[#EAEDFF] p-4 flex flex-col gap-2.5 z-50">
                  <div className="flex items-center justify-between pb-1 border-b border-[#EAEDFF]">
                    <span className="text-xs font-bold text-[#131B2E]">Lý do yêu cầu bổ sung</span>
                    <button
                      onClick={() => setIsSupplementOpen(false)}
                      className="text-[#444651] hover:text-[#131B2E]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs">
                    {[
                      'Thiếu giấy xác nhận tình trạng hôn nhân',
                      'Ảnh scan bị cắt góc / mờ thông tin',
                      'Sai thông tin nơi sinh so với CCCD',
                      'Chưa có văn bản đồng ý của chủ sở hữu nhà'
                    ].map((reason) => (
                      <label
                        key={reason}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-[#F2F3FF] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={supplementReason.includes(reason)}
                          onChange={() => toggleReason(reason)}
                          className="w-3.5 h-3.5 rounded text-[#00236F] focus:ring-[#00236F]"
                        />
                        <span className="text-[#131B2E] text-[11px]">{reason}</span>
                      </label>
                    ))}
                  </div>

                  <textarea
                    value={supplementNote}
                    onChange={(e) => setSupplementNote(e.target.value)}
                    placeholder="Ghi chú thêm cho công dân..."
                    className="w-full h-14 p-2 rounded-lg bg-[#FAF8FF] border border-[#EAEDFF] text-xs text-[#131B2E] focus:outline-none focus:ring-1 focus:ring-[#00236F] resize-none"
                  />

                  <button
                    onClick={() => {
                      alert('Đã gửi thông báo yêu cầu bổ sung thành công qua VNeID & SMS!');
                      setIsSupplementOpen(false);
                    }}
                    className="w-full h-8 bg-[#BA1A1A] text-white rounded-lg text-xs font-semibold hover:bg-[#BA1A1A]/90 transition flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi thông báo qua VNeID & SMS</span>
                  </button>
                </div>
              )}
            </div>

            {/* Chuyển Lãnh Đạo Ký Số */}
            <button
              onClick={() => alert('Đã chuyển hồ sơ lên Lãnh đạo UBND Phường 25 ký số!')}
              className="h-9 px-3.5 bg-[#EAEDFF] text-[#00236F] hover:bg-[#DAE2FD] text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
              type="button"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Chuyển Lãnh Đạo Ký Số</span>
            </button>

            {/* Chấp thuận sơ duyệt */}
            <button
              onClick={() => setIsApprovedOpen(true)}
              className="h-9 px-4 bg-[#00236F] text-white hover:bg-[#1E3A8A] text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2 transition"
              type="button"
            >
              <CheckCircle className="w-4 h-4 text-[#57DFFE]" />
              <span>Chấp Thuận Sơ Duyệt - Đủ Điều Kiện Nộp Chính Thức</span>
            </button>
          </div>
        </aside>
      </main>

      {/* HTTP 410 GONE MODAL (Demonstrating Redis Single-Use Token Vault) */}
      {isHttp410Open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center border border-[#EAEDFF]">
            <div className="w-16 h-16 rounded-full bg-[#FFDAD6] text-[#BA1A1A] flex items-center justify-center mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFDAD6] text-[#93000A] font-mono text-xs font-bold uppercase mb-2">
              HTTP 410 GONE - TOKEN EXPIRED
            </span>
            <h3 className="text-lg font-bold text-[#131B2E]">
              Liên Kết Đã Tự Hủy Vĩnh Viễn
            </h3>
            <p className="text-xs text-[#444651] mt-2 leading-relaxed">
              Theo quy định bảo mật tại Điều 17 Nghị định 13/2023/NĐ-CP và cơ chế{' '}
              <strong className="text-[#00236F]">Redis GETDEL Single-Use Token</strong> của hệ thống SmartWard AI,
              phiên làm việc xem hồ sơ công dân chỉ cho phép truy xuất một lần duy nhất.
            </p>
            <div className="my-4 p-3 bg-[#FAF8FF] border border-[#EAEDFF] rounded-lg text-left w-full font-mono text-[11px] text-[#444651]">
              <div>&gt; REDIS EVAL "redis.call('GETDEL', KEYS[1])" 1</div>
              <div className="text-[#BA1A1A]">&gt; Status: (nil) - Key deleted upon initial fetch</div>
              <div className="text-[#00687A]">&gt; Audit Log: Hash sha256_e81c... recorded</div>
            </div>
            <button
              onClick={() => setIsHttp410Open(false)}
              className="w-full py-2 bg-[#00236F] text-white rounded-lg text-xs font-semibold hover:bg-[#1E3A8A] transition"
            >
              Đóng Mô Phỏng & Trở Lại Phiên Sơ Duyệt
            </button>
          </div>
        </div>
      )}

      {/* APPROVED MODAL */}
      {isApprovedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center border border-[#EAEDFF]">
            <div className="w-16 h-16 rounded-full bg-[#ACEDFF] text-[#004E5C] flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#00236F]">
              Đã Chấp Thuận Sơ Duyệt Thành Công!
            </h3>
            <p className="text-xs text-[#444651] mt-2 leading-relaxed">
              Hồ sơ CT01-2026-0894 của công dân <strong className="text-[#131B2E]">Nguyễn Văn An</strong> đã được
              đánh dấu đủ điều kiện. Hệ thống đã tự động gửi mã hẹn và thông báo xác nhận qua ứng dụng VNeID và SMS.
            </p>
            <button
              onClick={() => setIsApprovedOpen(false)}
              className="mt-5 w-full py-2 bg-[#00236F] text-white rounded-lg text-xs font-semibold hover:bg-[#1E3A8A] transition"
            >
              Hoàn Tất & Tiếp Nhận Hồ Sơ Tiếp Theo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
