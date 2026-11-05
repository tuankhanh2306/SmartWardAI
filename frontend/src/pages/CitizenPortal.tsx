import React, { useState, useRef, useEffect, useMemo } from 'react';
import { askLegalRag, type RagResponse, type LegalCitation } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useWard } from '../context/WardContext';
import { PROCEDURES_CATALOG } from '../data/proceduresCatalog';
import {
  Send,
  Bot,
  User,
  ShieldAlert,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Copy,
  Check,
  RotateCcw,
  Mic,
  FileCheck2,
  AlertTriangle,
  Clock,
  ChevronRight,
  HelpCircle,
  X,
  MapPin,
  Volume2,
  VolumeX,
  Layers,
  ExternalLink,
  Search,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'citizen' | 'bot';
  text: string;
  ragData?: RagResponse;
  timestamp: string;
  suggestions?: string[];
}

export const CitizenPortal: React.FC = () => {
  const navigate = useNavigate();
  const { currentWard, isOfficeOpen } = useWard();
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<LegalCitation | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);

  // Left panel view mode: 'bento' (4 cards) vs 'catalog' (full 40 procedures)
  const [catalogViewMode, setCatalogViewMode] = useState<'bento' | 'catalog'>('bento');
  const [catalogCategory, setCatalogCategory] = useState<string>('ALL');
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-0',
      sender: 'citizen',
      text: 'Tôi muốn làm thủ tục đăng ký khai sinh cho cháu mới sinh cần giấy tờ gì và mất bao lâu?',
      timestamp: '08:45',
    },
    {
      id: 'msg-1',
      sender: 'bot',
      text: `1. TÓM TẮT THỦ TỤC:\nThủ tục Đăng ký khai sinh cho trẻ mới sinh được tiếp nhận và giải quyết tại UBND cấp xã nơi cư trú của cha hoặc mẹ.\n\n2. THÀNH PHẦN HỒ SƠ:\n• [TTHC-HT-01_CHUNK_003] Tờ khai đăng ký khai sinh theo mẫu quy định.\n• [TTHC-HT-01_CHUNK_003] Bản chính Giấy chứng sinh do cơ sở khám bệnh, chữa bệnh cấp (hoặc văn bản xác nhận của người làm chứng/giấy cam đoan).\n• Xuất trình CCCD/Hộ chiếu còn hiệu lực của cha mẹ và Giấy chứng nhận kết hôn (nếu có).\n\n3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n• Thời hạn: Giải quyết ngay trong 01 ngày làm việc (trường hợp cần xác minh thì không quá 05 ngày làm việc).\n• Lệ phí: Miễn phí hoàn toàn khi đăng ký đúng hạn trong vòng 60 ngày kể từ ngày sinh.\n\n4. NƠI TIẾP NHẬN & XỬ LÝ:\nBộ phận Tiếp nhận và Trả kết quả (Một cửa) thuộc UBND cấp xã/phường.\n\n5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n[TTHC-HT-01_CHUNK_004] Căn cứ Luật Hộ tịch 2014 & Nghị định 123/2015/NĐ-CP.\n\n*Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo, không thay thế quyết định chính thức của công chức tiếp nhận hồ sơ tại Bộ phận Một cửa.*`,
      timestamp: '08:45',
      suggestions: [
        'Hồ sơ đăng ký khai sinh cần gì?',
        'Lệ phí khai sinh bao nhiêu?',
        'Nơi nộp hồ sơ khai sinh ở đâu?',
        'Thời hạn giải quyết trong bao lâu?',
      ],
      ragData: {
        answer: 'Thủ tục Đăng ký khai sinh được giải quyết trong 01 ngày làm việc...',
        abstained: false,
        maxSimilarity: 0.942,
        appliedThreshold: 0.50,
        responseTimeMs: 14.2,
        cached: true,
        disclaimer: 'Thông tin có giá trị tham khảo và trích xuất từ CSDL UBND cấp xã & Luật Hộ tịch 2014.',
        citations: [
          {
            chunkCode: 'TTHC-HT-01_CHUNK_003',
            procedureCode: 'TTHC-HT-01',
            procedureName: 'Đăng ký khai sinh',
            title: 'Thành phần hồ sơ Đăng ký khai sinh',
            legalReference: 'Điều 15, 16 Luật Hộ tịch 2014 & Nghị định 123/2015/NĐ-CP',
            content:
              'Người yêu cầu đăng ký khai sinh nộp Tờ khai theo mẫu và Giấy chứng sinh cho cơ quan đăng ký hộ tịch. Trường hợp không có giấy chứng sinh thì nộp văn bản của người làm chứng xác nhận về việc sinh; nếu không có người làm chứng thì phải có giấy cam đoan về việc sinh.',
            relevanceScore: 0.942,
          },
        ],
      },
    },
  ]);

  // Auto scroll to chat bottom
  useEffect(() => {
    const timer = setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleAsk = async (questionText?: string) => {
    const q = questionText || query;
    if (!q.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'citizen',
      text: q,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setQuery('');
    setLoading(true);

    try {
      // Pass the conversation history so multi-turn follow-up queries are answered accurately
      const historyPayload = newMessages.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text,
        procedureCode: m.ragData?.citations?.[0]?.procedureCode,
      }));

      const resp = await askLegalRag(
        q,
        3,
        {
          wardName: `${currentWard.name}, ${currentWard.province}`,
          officeAddress: currentWard.officeAddress,
          phoneNumber: currentWard.phoneNumber,
          workingHours: currentWard.workingHours,
        },
        historyPayload
      );
      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        sender: 'bot',
        text: resp.answer,
        ragData: resp,
        suggestions: resp.suggestions || ['Hồ sơ cần những gì?', 'Lệ phí bao nhiêu?', 'Thời hạn giải quyết?', 'Nơi nộp hồ sơ?'],
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        sender: 'bot',
        text: `Hệ thống đang bận hoặc câu hỏi cần liên hệ trực tiếp Bộ phận Một cửa ${currentWard.name} (${currentWard.phoneNumber}) để được hỗ trợ cụ thể.`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        suggestions: ['👶 Đăng ký khai sinh', '💍 Đăng ký kết hôn', '🏠 Đăng ký thường trú (CT01)', '📋 Xem 40 thủ tục'],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Text-To-Speech (Phục vụ bà con lớn tuổi & khiếm thị theo Đề án 06)
  const toggleSpeech = (text: string, id: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt của bạn không hỗ trợ tính năng đọc văn bản âm thanh.');
      return;
    }

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean brackets and special markdown characters for natural pronunciation
    const clean = text
      .replace(/\[[A-Za-z0-9_\-]+\]/g, '')
      .replace(/\*/g, '')
      .replace(/•/g, ', ')
      .replace(/#{1,6}\s?/g, '')
      .replace(/\n+/g, '. ');

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const toggleMic = () => {
    setIsMicActive(true);
    setQuery(`Tôi muốn làm thủ tục đăng ký khai sinh cho con tại ${currentWard.name}...`);
    setTimeout(() => {
      setIsMicActive(false);
    }, 1500);
  };

  const quickPrompts = [
    { label: '👶 Đăng ký khai sinh', q: `Tôi muốn làm thủ tục đăng ký khai sinh cho cháu mới sinh tại ${currentWard.name} cần giấy tờ gì và mất bao lâu?` },
    { label: '💍 Đăng ký kết hôn', q: `Thủ tục đăng ký kết hôn tại UBND ${currentWard.name} cần hai bên chuẩn bị hồ sơ gì và lệ phí bao nhiêu?` },
    { label: '📜 Trích lục khai sinh', q: 'Tôi bị mất bản gốc giấy khai sinh, muốn xin cấp bản sao trích lục khai sinh tại xã thì cần làm thế nào?' },
    { label: '🏠 Thủ tục thường trú (VNeID)', q: 'Tôi muốn làm thủ tục đăng ký thường trú thì nộp hồ sơ ở đâu?' },
    { label: '⚠️ Câu hỏi ngoài thẩm quyền', q: 'Tôi muốn làm hộ chiếu phổ thông để đi du lịch nước ngoài thì đến đâu làm?' },
  ];

  const bentoCards = [
    {
      code: 'TTHC-HT-01',
      title: 'Đăng Ký Khai Sinh',
      subtitle: 'Hộ tịch & Nhân thân',
      time: '01 ngày làm việc',
      fee: 'Miễn phí đúng hạn',
      badge: 'Thường Gặp Nhất',
      prompt: `Thủ tục đăng ký khai sinh tại ${currentWard.name} gồm những giấy tờ gì và giải quyết trong bao lâu?`,
    },
    {
      code: 'TTHC-HT-02',
      title: 'Đăng Ký Kết Hôn',
      subtitle: 'Hôn nhân & Gia đình',
      time: 'Giải quyết trong ngày',
      fee: 'Miễn phí công dân',
      badge: 'Dịch Vụ Nhanh',
      prompt: `Hai bên nam nữ cần chuẩn bị gì khi đến UBND ${currentWard.name} đăng ký kết hôn?`,
    },
    {
      code: 'TTHC-CT-01',
      title: 'Chứng Thực Bản Sao',
      subtitle: 'Tư pháp & Chứng thực',
      time: 'Nhận ngay trong ngày',
      fee: '2.000đ / trang',
      badge: 'Thủ Tục Sao Y',
      prompt: `Thủ tục chứng thực bản sao từ bản chính các loại giấy tờ tại ${currentWard.name}?`,
    },
    {
      code: 'TTHC-BT-01',
      title: 'Trợ Cấp Xã Hội Hàng Tháng',
      subtitle: 'Bảo trợ xã hội',
      time: '10 ngày làm việc',
      fee: 'Miễn phí hoàn toàn',
      badge: 'Chính Sách An Sinh',
      prompt: 'Hồ sơ và điều kiện hưởng trợ cấp xã hội hằng tháng cho người cao tuổi, khuyết tật gồm những gì?',
    },
  ];

  // Filter 40 procedures catalog
  const filteredCatalog = useMemo(() => {
    return PROCEDURES_CATALOG.filter((item) => {
      const matchCat = catalogCategory === 'ALL' || item.category === catalogCategory;
      const matchSearch =
        !catalogSearch.trim() ||
        item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.code.toLowerCase().includes(catalogSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [catalogCategory, catalogSearch]);

  const categories = ['ALL', 'Hộ tịch', 'Cư trú', 'Chứng thực', 'Bảo trợ xã hội', 'Đất đai'];

  // Formatted Message Renderer with 5-Section Highlights & Clickable Citations
  const renderMessageContent = (msg: ChatMessage) => {
    const text = msg.text;
    const lines = text.split('\n');

    const sectionHeaders = [
      { key: '1. TÓM TẮT THỦ TỤC:', title: '1. TÓM TẮT THỦ TỤC', icon: '📋', badgeColor: 'bg-blue-100 text-blue-900 border-blue-300' },
      { key: '2. THÀNH PHẦN HỒ SƠ:', title: '2. THÀNH PHẦN HỒ SƠ', icon: '📄', badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
      { key: '3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:', title: '3. THỜI HẠN & LỆ PHÍ', icon: '⏱️', badgeColor: 'bg-amber-100 text-amber-900 border-amber-300' },
      { key: '4. NƠI TIẾP NHẬN & XỬ LÝ:', title: '4. NƠI TIẾP NHẬN & XỬ LÝ', icon: '🏛️', badgeColor: 'bg-teal-100 text-teal-900 border-teal-300' },
      { key: '5. CĂN CỨ PHÁP LÝ & LƯU Ý:', title: '5. CĂN CỨ PHÁP LÝ & LƯU Ý', icon: '⚖️', badgeColor: 'bg-slate-100 text-slate-900 border-slate-300' },
    ];

    const renderTextWithCitations = (lineStr: string) => {
      const parts = lineStr.split(/(\[[A-Za-z0-9_\-]+\])/g);
      return parts.map((part, pIdx) => {
        const match = part.match(/^\[([A-Za-z0-9_\-]+)\]$/);
        if (match) {
          const code = match[1];
          return (
            <button
              key={pIdx}
              type="button"
              onClick={() => {
                const found = msg.ragData?.citations.find(
                  (c) => c.chunkCode.toUpperCase() === code.toUpperCase() || c.procedureCode.toUpperCase() === code.toUpperCase()
                );
                if (found) {
                  setActiveCitation(found);
                } else if (msg.ragData?.citations && msg.ragData.citations.length > 0) {
                  setActiveCitation(msg.ragData.citations[0]);
                }
              }}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded font-mono text-[10px] font-bold bg-[#E0E7FF] text-[#1E3A8A] hover:bg-[#C7D2FE] border border-[#C7D2FE] transition cursor-pointer active:scale-95 shadow-2xs"
              title={`Xem căn cứ pháp lý ${code}`}
            >
              {part}
            </button>
          );
        }
        return <span key={pIdx}>{part}</span>;
      });
    };

    return (
      <div className="flex flex-col gap-2 text-xs md:text-sm leading-relaxed">
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          const foundHeader = sectionHeaders.find((h) => trimmed.startsWith(h.key));
          if (foundHeader) {
            const rest = trimmed.substring(foundHeader.key.length).trim();
            return (
              <div key={lIdx} className="mt-3 pt-2.5 border-t border-[#EAEDFF] first:mt-0 first:pt-0 first:border-0">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${foundHeader.badgeColor} shadow-2xs`}>
                  <span>{foundHeader.icon}</span>
                  <span>{foundHeader.title}</span>
                </span>
                {rest && <p className="mt-2 pl-0.5 font-medium text-[#131B2E]">{renderTextWithCitations(rest)}</p>}
              </div>
            );
          }
          if (!trimmed) {
            return <div key={lIdx} className="h-0.5" />;
          }
          return <p key={lIdx} className="pl-0.5">{renderTextWithCitations(line)}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full pb-20">
      {/* Top Civic Banner with double-bezel ambient glow */}
      <section className="relative w-full bg-gradient-to-b from-[#EAEDFF]/60 via-[#F2F3FF]/40 to-transparent px-4 md:px-8 py-10 md:py-14 border-b border-[#EAEDFF] overflow-hidden">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-[#57DFFE]/15 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-20 w-80 h-80 rounded-full bg-[#00236F]/10 blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col gap-6 relative z-10">
          {/* Eyebrow & Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#DAE2FD] shadow-xs">
              <span className={`w-2 h-2 rounded-full ${isOfficeOpen ? 'bg-[#10B981] animate-pulse' : 'bg-[#F59E0B]'}`} />
              <span className="text-xs font-bold text-[#00236F] uppercase tracking-wider">
                UBND {currentWard.name.toUpperCase()}
              </span>
              <span className="text-xs text-[#757682]">• TỈNH AN GIANG</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isOfficeOpen ? 'bg-[#ECFDF5] text-[#065F46]' : 'bg-[#FEF3C7] text-[#92400E]'}`}>
                {isOfficeOpen ? 'Mở cửa tiếp dân' : 'Ngoài giờ (Trực tuyến 24/7)'}
              </span>
              <button
                onClick={() => navigate('/onboarding')}
                className="text-[11px] font-bold text-[#00236F] hover:text-[#1E3A8A] hover:underline flex items-center gap-1 border-l border-[#DAE2FD] pl-2 ml-1 cursor-pointer"
                title="Chọn Xã/Phường khác tại An Giang"
              >
                <MapPin className="w-3 h-3 text-[#00687A]" />
                <span>Đổi Xã/Phường</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#444651] font-medium hidden sm:inline">Đối tác Kỹ thuật:</span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#EE0033]/10 text-[#EE0033] border border-[#EE0033]/20">
                Viettel An Giang
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#DCE1FF] text-[#00164E]">
                Nghị Định 13/2023
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#ACEDFF] text-[#004E5C]">
                Đề Án 06/CP
              </span>
            </div>
          </div>

          {/* Headline block */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#00236F] tracking-tight leading-tight">
                Tư Vấn Thủ Tục Hành Chính & Phân Luồng Phản Ánh
              </h1>
              <p className="mt-2.5 text-sm md:text-base text-[#444651] leading-relaxed">
                Trợ lý ảo pháp lý ứng dụng mô hình RAG phân cấp PhoBERT INT8 & Google Gemini 2.5 Flash, chốt chặn an toàn (&theta; = 0.50, vùng xám &theta;<sub>lower</sub> = 0.42), phối hợp công nghệ cùng Viettel An Giang. Hỗ trợ tra cứu tức thì 40 TTHC cấp xã/phường tại <strong>{currentWard.name}</strong> và tiền kiểm tra hồ sơ trước khi nộp.
              </p>
            </div>

            {/* Quick Action Dock */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => navigate('/citizen/form')}
                className="group px-4 py-2.5 bg-[#00236F] text-white rounded-xl font-semibold text-xs shadow-md shadow-[#00236F]/20 hover:bg-[#1E3A8A] active:scale-[0.97] transition-all duration-300 flex items-center gap-2"
              >
                <FileCheck2 className="w-4 h-4 text-[#57DFFE]" />
                <span>Tiền Kiểm Định Tờ Khai CT01</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/citizen/form#incident')}
                className="px-4 py-2.5 bg-white text-[#00236F] border border-[#DAE2FD] rounded-xl font-semibold text-xs hover:bg-[#F2F3FF] active:scale-[0.97] transition-all shadow-xs flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4 text-[#00687A]" />
                <span>Báo Sự Cố Hiện Trường</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Work Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Dual Mode (Bento Shortcuts OR Full 40 Procedures Catalog) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Segmented Mode Switcher */}
          <div className="flex items-center justify-between pb-1 border-b border-[#EAEDFF]">
            <div className="inline-flex p-1 bg-[#F2F3FF] rounded-xl border border-[#DAE2FD]">
              <button
                onClick={() => setCatalogViewMode('bento')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  catalogViewMode === 'bento'
                    ? 'bg-white text-[#00236F] shadow-xs'
                    : 'text-[#757682] hover:text-[#00236F]'
                }`}
              >
                Thủ Tục Tiêu Biểu
              </button>
              <button
                onClick={() => setCatalogViewMode('catalog')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  catalogViewMode === 'catalog'
                    ? 'bg-white text-[#00236F] shadow-xs'
                    : 'text-[#757682] hover:text-[#00236F]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#00687A]" />
                <span>Danh Mục 40 TTHC</span>
              </button>
            </div>
            <span className="text-[11px] text-[#757682] hidden sm:inline">1 Chạm Kích Hoạt AI</span>
          </div>

          {/* VIEW MODE 1: Bento Cards (4 Cards) */}
          {catalogViewMode === 'bento' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
              {bentoCards.map((card) => (
                <div
                  key={card.code}
                  onClick={() => handleAsk(card.prompt)}
                  className="group relative p-1.5 rounded-2xl bg-white border border-[#EAEDFF] hover:border-[#ACEDFF] shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98]"
                >
                  <div className="p-4 rounded-xl bg-gradient-to-br from-white via-white to-[#F2F3FF]/40 flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EAEDFF] text-[#00236F]">
                        {card.badge}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-[#F2F3FF] group-hover:bg-[#00236F] text-[#00236F] group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-xs">
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#131B2E] group-hover:text-[#00236F] transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-xs text-[#757682] mt-0.5">{card.subtitle}</p>
                    </div>

                    <div className="pt-2 border-t border-[#EAEDFF] flex items-center justify-between text-[11px] text-[#444651]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#00687A]" />
                        {card.time}
                      </span>
                      <span className="font-semibold text-[#00687A]">{card.fee}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* VIEW MODE 2: Full 40 Procedures Catalog */
            <div className="flex flex-col gap-3 bg-white p-3.5 rounded-2xl border border-[#EAEDFF] shadow-xs">
              {/* Search in Catalog */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#757682] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Tìm kiếm trong 40 thủ tục..."
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] focus:outline-none focus:border-[#00236F]"
                />
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCatalogCategory(cat)}
                    className={`px-2.5 py-1 rounded-md shrink-0 font-medium transition cursor-pointer ${
                      catalogCategory === cat
                        ? 'bg-[#00236F] text-white'
                        : 'bg-[#F2F3FF] text-[#444651] hover:bg-[#EAEDFF]'
                    }`}
                  >
                    {cat === 'ALL' ? 'Tất cả (40)' : cat}
                  </button>
                ))}
              </div>

              {/* Scrollable Procedures List */}
              <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                {filteredCatalog.map((item) => (
                  <div
                    key={item.code}
                    onClick={() => handleAsk(`Thủ tục ${item.name} tại ${currentWard.name} cần giấy tờ gì, thời gian và lệ phí ra sao?`)}
                    className="p-2.5 rounded-xl border border-[#EAEDFF] hover:border-[#00236F] hover:bg-[#F2F3FF]/30 transition cursor-pointer flex flex-col gap-1 active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono font-bold text-[#00236F] bg-[#EAEDFF] px-1.5 py-0.5 rounded">
                        {item.code}
                      </span>
                      <span className="text-[#00687A] font-semibold">{item.category}</span>
                    </div>
                    <span className="text-xs font-semibold text-[#131B2E] line-clamp-2 leading-snug">
                      {item.name}
                    </span>
                    <div className="flex items-center justify-between text-[10px] text-[#757682] pt-1 border-t border-[#F1F5F9]">
                      <span>{item.chunksCount} căn cứ pháp lý</span>
                      <span className="text-[#00236F] font-bold flex items-center gap-0.5">
                        Hỏi AI <ChevronRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Help Card */}
          <div className="p-4 rounded-2xl bg-[#EAEDFF]/50 border border-[#DAE2FD] flex items-start gap-3 mt-1">
            <HelpCircle className="w-5 h-5 text-[#00236F] shrink-0 mt-0.5" />
            <div className="text-xs text-[#444651] leading-relaxed">
              <strong className="text-[#00236F] block mb-0.5">Cần nộp hồ sơ hoặc liên hệ trực tiếp?</strong>
              Sau khi kiểm tra tờ khai và hỏi đáp AI, bà con có thể nộp trực tiếp tại Bộ phận Một cửa {currentWard.name} (Địa chỉ: {currentWard.officeAddress} • Hotline: {currentWard.phoneNumber}) trong giờ làm việc: {currentWard.workingHours}.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Legal RAG Chat Workspace (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col bg-white rounded-3xl border border-[#EAEDFF] shadow-sm overflow-hidden min-h-[640px] max-h-[750px]">
          {/* Chat Workspace Header */}
          <div className="px-6 py-3.5 bg-gradient-to-r from-[#00236F] to-[#1E3A8A] text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#57DFFE] border border-white/20">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-tight">Trợ Lý Pháp Lý Một Cửa AI</span>
                </div>
                <span className="text-[11px] text-[#ACEDFF] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#57DFFE] animate-pulse" />
                  Cơ sở dữ liệu 40 TTHC & Bi-Encoder PhoBERT INT8
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (confirm('Bà con có chắc muốn xóa lịch sử cuộc trò chuyện này?')) {
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                  setSpeakingId(null);
                  setMessages([]);
                }
              }}
              title="Làm mới cuộc trò chuyện"
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Scroll Viewport */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-5 bg-[#FAF8FF]/40">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#757682]">
                <Bot className="w-12 h-12 text-[#DAE2FD] mb-3" />
                <p className="text-sm font-semibold text-[#131B2E]">Hộp thoại tư vấn pháp lý sẵn sàng</p>
                <p className="text-xs text-[#757682] mt-1 max-w-sm">
                  Hãy chọn một thủ tục phổ biến bên trái hoặc đặt bất kỳ câu hỏi nào về TTHC, biểu mẫu tại UBND {currentWard.name}.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'citizen' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-[#00236F] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4 text-[#57DFFE]" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[80%] flex flex-col gap-2 rounded-2xl p-4 transition-all ${
                    msg.sender === 'citizen'
                      ? 'bg-[#00236F] text-white rounded-br-xs shadow-sm'
                      : 'bg-white text-[#131B2E] border border-[#EAEDFF] rounded-bl-xs shadow-xs'
                  }`}
                >
                  {/* Message body text with 5-section badge highlights */}
                  {msg.sender === 'bot' ? (
                    renderMessageContent(msg)
                  ) : (
                    <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  )}

                  {/* GRAY ZONE ALERT CARD: S_max in [0.42, 0.50) */}
                  {msg.ragData?.abstained && msg.ragData.maxSimilarity >= 0.42 && (
                    <div className="mt-2 p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FCD34D] text-[#92400E] flex flex-col gap-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#B45309]">
                          <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
                          <span>Vùng Xám Nghi Vấn — Đang Chờ Rà Soát (HITL)</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold">
                          Độ khớp: {(msg.ragData.maxSimilarity * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[#78350F]">
                        {msg.ragData.abstentionReason || 'Hệ thống nhận thấy câu hỏi có thể liên quan đến thủ tục nhưng cần làm rõ thêm để đảm bảo an toàn tuyệt đối.'}
                      </p>
                    </div>
                  )}

                  {/* SAFE ABSTENTION GUARDRAIL: S_max < 0.42 */}
                  {msg.ragData?.abstained && msg.ragData.maxSimilarity < 0.42 && (
                    <div className="mt-2 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] flex items-start gap-2.5 shadow-2xs">
                      <ShieldAlert className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <strong className="text-[#B91C1C] block mb-0.5">Chốt Chặn An Toàn Pháp Lý (Safe Abstention)</strong>
                        {msg.ragData.abstentionReason || 'Hệ thống chủ động từ chối trả lời tự động do yêu cầu không thuộc danh mục thẩm quyền của UBND cấp xã.'}
                      </div>
                    </div>
                  )}

                  {/* RESIDENCE / POLICE ROUTING BUTTON: When query touches residence/VNeID */}
                  {(msg.text.includes('Công an cấp xã') || msg.text.includes('VNeID')) && (
                    <div className="mt-2 pt-2 border-t border-[#EAEDFF] flex items-center justify-between">
                      <span className="text-[11px] text-[#00687A] font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Đề án 06 — Luật Cư Trú 2020
                      </span>
                      <a
                        href="https://dichvucong.bocongan.gov.vn/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00687A] hover:bg-[#004E5C] text-white text-[10px] font-bold transition shadow-xs"
                      >
                        <span>Cổng DVC Bộ Công An</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}

                  {/* OFFICIAL DATABASE EXTRACTION SEAL */}
                  {msg.text.includes('thông tin được trích xuất trực tiếp') && (
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[10px] font-bold w-fit">
                      <Check className="w-3 h-3 text-[#10B981]" />
                      <span>Trích xuất trực tiếp từ CSDL Văn bản Hành chính chính thức</span>
                    </div>
                  )}

                  {/* Bot Interactive Action Dock & Citations */}
                  {msg.sender === 'bot' && (
                    <div className="mt-3 pt-2.5 border-t border-[#EAEDFF] flex flex-col gap-2">
                      {/* Meta Tags & Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#757682]">
                        <span className="flex items-center gap-1.5 font-mono">
                          <Clock className="w-3 h-3 text-[#00687A]" />
                          {msg.timestamp}
                          {msg.ragData && (
                            <>
                              <span>•</span>
                              <span>Độ khớp: {(msg.ragData.maxSimilarity * 100).toFixed(1)}%</span>
                              <span>•</span>
                              <span>{msg.ragData.responseTimeMs}ms</span>
                            </>
                          )}
                        </span>

                        <div className="flex items-center gap-3">
                          {/* Text-To-Speech Button */}
                          <button
                            onClick={() => toggleSpeech(msg.text, msg.id)}
                            className={`flex items-center gap-1 font-medium transition cursor-pointer ${
                              speakingId === msg.id ? 'text-[#00236F] font-bold animate-pulse' : 'hover:text-[#00236F]'
                            }`}
                            title={speakingId === msg.id ? 'Dừng đọc' : 'Đọc bằng giọng nói tiếng Việt'}
                          >
                            {speakingId === msg.id ? (
                              <>
                                <VolumeX className="w-3 h-3 text-[#DC2626]" />
                                <span className="text-[#DC2626]">Dừng đọc</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3" />
                                <span>Đọc to</span>
                              </>
                            )}
                          </button>

                          {/* Copy to clipboard */}
                          <button
                            onClick={() => copyToClipboard(msg.text, msg.id)}
                            className="hover:text-[#00236F] flex items-center gap-1 active:scale-90 transition font-medium cursor-pointer"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-[#00687A]" />
                                <span className="text-[#00687A]">Đã sao chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Sao chép</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* EMBEDDED ACTION PILLS */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {/* Action 1: Form Precheck Navigation */}
                        <button
                          onClick={() => navigate('/citizen/form')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EAEDFF] hover:bg-[#DAE2FD] text-[#00236F] text-[11px] font-semibold transition active:scale-95 cursor-pointer"
                        >
                          <FileCheck2 className="w-3 h-3 text-[#00687A]" />
                          <span>Tiền kiểm tra tờ khai CT01</span>
                          <ChevronRight className="w-3 h-3 opacity-60" />
                        </button>

                        {/* Action 2: View Legal Citations Drawer */}
                        {msg.ragData?.citations && msg.ragData.citations.length > 0 && (
                          <button
                            onClick={() => setActiveCitation(msg.ragData!.citations[0])}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F2F3FF] hover:bg-[#EAEDFF] text-[#00687A] text-[11px] font-semibold transition active:scale-95 cursor-pointer"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>Căn cứ pháp lý ({msg.ragData.citations.length})</span>
                          </button>
                        )}

                        {/* Action 3: Incident Report Anchor */}
                        <button
                          onClick={() => navigate('/citizen/form#incident')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFF2F2] hover:bg-[#FFDAD6] text-[#BA1A1A] text-[11px] font-semibold transition active:scale-95 cursor-pointer"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Báo sự cố tại chỗ</span>
                        </button>
                      </div>

                      {/* QUICK SUGGESTION CHIPS DIRECTLY UNDER ASSISTANT MESSAGE */}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-[#EAEDFF]/80 flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold text-[#757682] uppercase tracking-wider flex items-center gap-1">
                            💡 Gợi ý câu hỏi tiếp theo:
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {msg.suggestions.map((chip, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                disabled={loading}
                                onClick={() => handleAsk(chip)}
                                className="px-2.5 py-1 rounded-full bg-[#F2F3FF] hover:bg-[#00236F] hover:text-white text-[#00236F] text-[11px] font-medium border border-[#DAE2FD] transition-all duration-200 active:scale-95 shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {msg.sender === 'citizen' && (
                  <div className="w-8 h-8 rounded-full bg-[#EAEDFF] text-[#00236F] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Staggered Typing Indicator */}
            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00236F] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-4 h-4 text-[#57DFFE] animate-pulse" />
                </div>
                <div className="bg-white border border-[#EAEDFF] rounded-2xl rounded-bl-xs px-4 py-3 shadow-xs flex items-center gap-2">
                  <span className="text-xs text-[#444651] font-medium">Trợ lý AI đang soạn tin...</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00236F] animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00687A] animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#57DFFE] animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} className="h-6 shrink-0" />
          </div>

          {/* Quick Prompts Carousel Bar */}
          <div className="px-4 py-2 bg-[#F2F3FF]/70 border-t border-[#EAEDFF] flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-[#757682] uppercase shrink-0">Gợi ý:</span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(p.q)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-white hover:bg-[#EAEDFF] text-[#00236F] text-[11px] font-medium border border-[#DAE2FD] transition active:scale-95 shadow-2xs cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Interactive Chat Input Dock with Haptic Buttons */}
          <div className="p-3 bg-white border-t border-[#EAEDFF]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
              className="flex items-center gap-2"
            >
              {/* Dictation simulation button */}
              <button
                type="button"
                onClick={toggleMic}
                title="Giọng nói (Mô phỏng)"
                className={`p-2.5 rounded-xl border transition-all active:scale-90 cursor-pointer ${
                  isMicActive
                    ? 'bg-[#BA1A1A] text-white border-[#BA1A1A] animate-pulse'
                    : 'bg-[#F2F3FF] hover:bg-[#EAEDFF] text-[#00687A] border-[#DAE2FD]'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Text Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  maxLength={1000}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nhập câu hỏi TTHC (ví dụ: đăng ký khai sinh, kết hôn, CT01)..."
                  className="w-full h-11 pl-4 pr-10 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF] focus:border-[#00236F] focus:bg-white text-xs md:text-sm text-[#131B2E] placeholder-[#757682] focus:outline-none focus:ring-2 focus:ring-[#00236F]/10 transition-all"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#757682] hover:text-[#131B2E] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Send Button with Tactile Physics */}
              <button
                type="submit"
                disabled={!query.trim() || loading}
                className={`h-11 px-4 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer ${
                  query.trim() && !loading
                    ? 'bg-[#00236F] hover:bg-[#1E3A8A] text-white shadow-md shadow-[#00236F]/20'
                    : 'bg-[#EAEDFF] text-[#757682] cursor-not-allowed'
                }`}
              >
                <span>Gửi</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Citation Detail Modal / Drawer with Smooth Fade-Scale Animation */}
      {activeCitation !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-[#EAEDFF] flex flex-col gap-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-[#EAEDFF]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#00236F]" />
                <h3 className="font-bold text-sm text-[#00236F]">
                  Căn Cứ Pháp Lý Trích Xuất
                </h3>
              </div>
              <button
                onClick={() => setActiveCitation(null)}
                className="p-1 rounded-lg text-[#757682] hover:text-[#131B2E] hover:bg-[#F2F3FF] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <div>
                <span className="text-[#757682] block text-[11px]">Văn bản quy phạm:</span>
                <span className="font-bold text-[#131B2E] text-xs">
                  {activeCitation.legalReference || activeCitation.title}
                </span>
              </div>

              <div>
                <span className="text-[#757682] block text-[11px]">Nội dung điều khoản:</span>
                <p className="p-3 bg-[#FAF8FF] border border-[#EAEDFF] rounded-xl text-xs text-[#131B2E] leading-relaxed mt-1">
                  "{activeCitation.content}"
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#757682] pt-1">
                <span>Mã đoạn: <code>{activeCitation.chunkCode}</code></span>
                <span className="font-bold text-[#00687A]">
                  Độ tương đồng Cosine: {((activeCitation.relevanceScore || 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveCitation(null)}
              className="w-full py-2 bg-[#00236F] hover:bg-[#1E3A8A] text-white text-xs font-semibold rounded-xl transition active:scale-95 cursor-pointer"
            >
              Đóng Căn Cứ Pháp Lý
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CitizenPortal;
