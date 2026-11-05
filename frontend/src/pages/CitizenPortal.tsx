import React, { useState, useRef, useEffect, useMemo } from 'react';
import { askLegalRag, type RagResponse, type LegalCitation } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useWard } from '../context/WardContext';
import { useAccessibility } from '../context/AccessibilityContext';
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
  PhoneCall,
  Calendar
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
  const { isAudioAutoPlay, setIsAudioAutoPlay } = useAccessibility();
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<LegalCitation | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);

  // Mobile tab switcher ('chat' vs 'catalog') for small screens
  const [mobileTab, setMobileTab] = useState<'chat' | 'catalog'>('chat');

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

  // Text-To-Speech (Hỗ trợ người cao tuổi & khiếm thị theo Đề án 06)
  const toggleSpeech = (text: string, id: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt của bạn hiện chưa hỗ trợ tính năng đọc âm thanh.');
      return;
    }

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean brackets, chunk codes, and special markdown characters for natural pronunciation
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

  const handleAsk = async (questionText?: string) => {
    const q = questionText || query;
    if (!q.trim() || loading) return;

    // If on mobile and currently on catalog tab, switch to chat tab so user sees the answer
    if (mobileTab !== 'chat') {
      setMobileTab('chat');
    }

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

      const botMsgId = `msg-${Date.now()}-bot`;
      const botMsg: ChatMessage = {
        id: botMsgId,
        sender: 'bot',
        text: resp.answer,
        ragData: resp,
        suggestions: resp.suggestions || ['Hồ sơ cần những gì?', 'Lệ phí bao nhiêu?', 'Thời hạn giải quyết?', 'Nơi nộp hồ sơ?'],
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);

      // Auto-play audio if enabled by user (for elderly citizens)
      if (isAudioAutoPlay) {
        setTimeout(() => {
          toggleSpeech(resp.answer, botMsgId);
        }, 300);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        sender: 'bot',
        text: `Hệ thống đang kết nối hoặc câu hỏi cần liên hệ trực tiếp Bộ phận Một cửa ${currentWard.name} qua số điện thoại ${currentWard.phoneNumber} để được cán bộ hỗ trợ chu đáo nhất.`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        suggestions: ['👶 Đăng ký khai sinh', '💍 Đăng ký kết hôn', '🏠 Đăng ký thường trú (CT01)', '📋 Xem danh mục 40 thủ tục'],
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
    { label: '👵 Trợ cấp người cao tuổi', q: 'Hồ sơ và điều kiện hưởng trợ cấp xã hội hằng tháng cho người cao tuổi, người khuyết tật gồm những gì?' },
  ];

  const bentoCards = [
    {
      code: 'TTHC-HT-01',
      title: 'Đăng Ký Khai Sinh',
      category: 'Hộ tịch & Khai sinh',
      time: 'Trong 01 ngày làm việc',
      fee: 'Miễn phí hoàn toàn',
      badge: 'Phổ Biến Nhất',
      badgeColor: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
      icon: '👶',
      description: 'Đăng ký khai sinh cho trẻ mới sinh trong vòng 60 ngày kể từ ngày sinh.',
      prompt: `Thủ tục đăng ký khai sinh tại ${currentWard.name} gồm những giấy tờ gì và giải quyết trong bao lâu?`,
    },
    {
      code: 'TTHC-HT-02',
      title: 'Đăng Ký Kết Hôn',
      category: 'Hôn nhân & Gia đình',
      time: 'Giải quyết trong ngày',
      fee: 'Miễn phí cho công dân',
      badge: 'Thủ Tục Nhanh',
      badgeColor: 'bg-[#FDF2F8] text-[#9D174D] border-[#FBCFE8]',
      icon: '💍',
      description: 'Hai bên nam nữ trực tiếp nộp hồ sơ tại UBND cấp xã nơi cư trú.',
      prompt: `Hai bên nam nữ cần chuẩn bị gì khi đến UBND ${currentWard.name} đăng ký kết hôn?`,
    },
    {
      code: 'TTHC-CT-01',
      title: 'Chứng Thực Bản Sao (Sao Y)',
      category: 'Tư pháp & Chứng thực',
      time: 'Nhận ngay trong ngày',
      fee: '2.000đ / trang',
      badge: 'Sao Y Giấy Tờ',
      badgeColor: 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]',
      icon: '📜',
      description: 'Chứng thực bản sao từ bản chính các loại giấy tờ tùy thân, học bạ, văn bằng.',
      prompt: `Thủ tục chứng thực bản sao từ bản chính các loại giấy tờ tại ${currentWard.name}?`,
    },
    {
      code: 'TTHC-BT-01',
      title: 'Trợ Cấp Xã Hội Hàng Tháng',
      category: 'Bảo trợ xã hội',
      time: '10 ngày làm việc',
      fee: 'Miễn phí hoàn toàn',
      badge: 'Chính Sách An Sinh',
      badgeColor: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
      icon: '👵',
      description: 'Hỗ trợ người cao tuổi (từ đủ 80 tuổi), người khuyết tật nặng theo quy định.',
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

  const categories = [
    { id: 'ALL', label: 'Tất cả (40)' },
    { id: 'Hộ tịch', label: 'Hộ tịch (15)' },
    { id: 'Cư trú', label: 'Cư trú (5)' },
    { id: 'Chứng thực', label: 'Chứng thực (6)' },
    { id: 'Bảo trợ xã hội', label: 'Bảo trợ (8)' },
    { id: 'Đất đai', label: 'Đất đai (6)' },
  ];

  // Formatted Message Renderer with Clear 5-Section Structured Cards
  const renderMessageContent = (msg: ChatMessage) => {
    const text = msg.text;
    const lines = text.split('\n');

    const sectionHeaders = [
      { key: '1. TÓM TẮT THỦ TỤC:', title: '1. TÓM TẮT THỦ TỤC', icon: '📋', badgeColor: 'bg-[#EFF6FF] text-[#1E3A8A] border-[#BFDBFE]' },
      { key: '2. THÀNH PHẦN HỒ SƠ:', title: '2. THÀNH PHẦN HỒ SƠ CẦN CHUẨN BỊ', icon: '📄', badgeColor: 'bg-[#EEF2FF] text-[#312E81] border-[#C7D2FE]' },
      { key: '3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:', title: '3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ', icon: '⏱️', badgeColor: 'bg-[#FFFBEB] text-[#78350F] border-[#FDE68A]' },
      { key: '4. NƠI TIẾP NHẬN & XỬ LÝ:', title: '4. NƠI TIẾP NHẬN & GIẢI QUYẾT', icon: '🏛️', badgeColor: 'bg-[#F0FDFA] text-[#134E4A] border-[#99F6E4]' },
      { key: '5. CĂN CỨ PHÁP LÝ & LƯU Ý:', title: '5. CĂN CỨ PHÁP LÝ & LƯU Ý QUAN TRỌNG', icon: '⚖️', badgeColor: 'bg-[#F8FAFC] text-[#1E293B] border-[#E2E8F0]' },
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
              className="inline-flex items-center px-2 py-0.5 mx-1 rounded-md font-mono text-[11px] font-bold bg-[#E0E7FF] text-[#1E3A8A] hover:bg-[#C7D2FE] border border-[#A5B4FC] transition-all cursor-pointer active:scale-95 shadow-2xs"
              title={`Xem căn cứ pháp lý ${code}`}
            >
              📖 {part}
            </button>
          );
        }
        return <span key={pIdx}>{part}</span>;
      });
    };

    return (
      <div className="flex flex-col gap-3 text-sm md:text-base leading-relaxed text-[#0F172A]">
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          const foundHeader = sectionHeaders.find((h) => trimmed.startsWith(h.key));
          if (foundHeader) {
            const rest = trimmed.substring(foundHeader.key.length).trim();
            return (
              <div key={lIdx} className="mt-3.5 pt-3 border-t border-[#E2E8F0] first:mt-0 first:pt-0 first:border-0">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${foundHeader.badgeColor} shadow-2xs`}>
                  <span>{foundHeader.icon}</span>
                  <span>{foundHeader.title}</span>
                </div>
                {rest && (
                  <p className="mt-2.5 pl-1 font-medium text-[#1E293B] leading-relaxed">
                    {renderTextWithCitations(rest)}
                  </p>
                )}
              </div>
            );
          }
          if (!trimmed) {
            return <div key={lIdx} className="h-1" />;
          }
          return (
            <p key={lIdx} className="pl-1 leading-relaxed text-[#1E293B]">
              {renderTextWithCitations(line)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full pb-20">
      {/* CIVIC HERO BANNER: Warm, Respectful, Trust-First (Anti-Slop) */}
      <section className="relative w-full bg-gradient-to-b from-[#EAEDFF]/70 via-[#F5F7FF]/50 to-white px-4 md:px-8 pt-8 pb-10 border-b border-[#DAE2FD] overflow-hidden">
        {/* Soft Civic Ambient Glow */}
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-[#38BDF8]/15 blur-3xl pointer-events-none" />
        <div className="absolute left-1/4 -bottom-24 w-96 h-96 rounded-full bg-[#00236F]/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col gap-5 relative z-10">
          {/* Top Triage Ribbon: Ward Badge + Operating Status + Policy Seals */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white border border-[#CBD5E1] shadow-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${isOfficeOpen ? 'bg-[#10B981] animate-pulse' : 'bg-[#F59E0B]'}`} />
              <span className="text-xs font-extrabold text-[#00236F] uppercase tracking-wider">
                UBND {currentWard.name.toUpperCase()}
              </span>
              <span className="text-xs text-[#64748B] font-semibold">• TỈNH AN GIANG</span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${isOfficeOpen ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]' : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'}`}>
                {isOfficeOpen ? 'Đang mở cửa tiếp dân' : 'Ngoài giờ hành chính (Tư vấn 24/7)'}
              </span>
              <button
                onClick={() => navigate('/onboarding')}
                className="text-[11px] font-bold text-[#00236F] hover:text-[#1E3A8A] hover:underline flex items-center gap-1 border-l border-[#CBD5E1] pl-2.5 ml-1 cursor-pointer"
                title="Bấm để chọn Xã/Phường khác tại An Giang"
              >
                <MapPin className="w-3.5 h-3.5 text-[#00687A]" />
                <span>Đổi Xã/Phường</span>
              </button>
            </div>

            {/* Accessible Audio Auto-Play Toggle for Elderly Citizens */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAudioAutoPlay(!isAudioAutoPlay)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                  isAudioAutoPlay
                    ? 'bg-[#00236F] text-white border-[#00236F]'
                    : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                }`}
                title="Bật/Tắt chế độ tự động đọc câu trả lời bằng giọng nói tiếng Việt cho bà con"
              >
                {isAudioAutoPlay ? <Volume2 className="w-3.5 h-3.5 text-[#57DFFE]" /> : <VolumeX className="w-3.5 h-3.5 text-[#94A3B8]" />}
                <span>{isAudioAutoPlay ? 'Tự đọc to: Bật' : 'Tự đọc to: Tắt'}</span>
              </button>

              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#DCE1FF] text-[#00164E]">
                Nghị Định 13/2023
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#ACEDFF] text-[#004E5C]">
                Đề Án 06/CP
              </span>
            </div>
          </div>

          {/* Main Hero Title & Welcoming Introduction */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#00236F] tracking-tight leading-tight">
                Cổng Hỗ Trợ Dân Sinh & Thủ Tục Hành Chính Điện Tử
              </h1>
              <p className="mt-2.5 text-sm md:text-base text-[#334155] leading-relaxed font-normal">
                Kính chào bà con và quý công dân! Hệ thống hỗ trợ giải đáp <strong>40 thủ tục hành chính</strong> thuộc thẩm quyền giải quyết của UBND {currentWard.name}, hướng dẫn hồ sơ giấy tờ cần mang theo, lệ phí, thời hạn và kiểm tra tờ khai trước khi đến nộp.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
                <span className="flex items-center gap-1">
                  <PhoneCall className="w-3.5 h-3.5 text-[#00687A]" />
                  Đường dây nóng: <strong>{currentWard.phoneNumber}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#00687A]" />
                  Giờ làm việc: <strong>{currentWard.workingHours}</strong>
                </span>
              </div>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => navigate('/citizen/form')}
                className="group px-4 py-2.5 bg-[#00236F] hover:bg-[#1E3A8A] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-[#00236F]/20 active:scale-[0.97] transition-all flex items-center gap-2 cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4 text-[#57DFFE]" />
                <span>Kiểm Tra Tờ Khai CT01</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/citizen/form#incident')}
                className="px-4 py-2.5 bg-white text-[#00236F] border border-[#CBD5E1] rounded-xl font-bold text-xs sm:text-sm hover:bg-[#F1F5F9] active:scale-[0.97] transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                <span>Báo Sự Cố Dân Sinh</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MOBILE RESPONSIVE SEGMENTED SWITCHER (< lg screens) */}
      <div className="lg:hidden max-w-7xl mx-auto w-full px-4 mt-4">
        <div className="flex rounded-xl bg-[#F1F5F9] p-1 border border-[#CBD5E1]">
          <button
            type="button"
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'chat'
                ? 'bg-white text-[#00236F] shadow-xs'
                : 'text-[#64748B] hover:text-[#00236F]'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Trợ Lý Hỏi Đáp AI</span>
            {messages.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#00236F] text-white text-[10px] flex items-center justify-center font-bold">
                {messages.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('catalog')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'catalog'
                ? 'bg-white text-[#00236F] shadow-xs'
                : 'text-[#64748B] hover:text-[#00236F]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Danh Mục 40 Thủ Tục</span>
          </button>
        </div>
      </div>

      {/* MAIN INTERACTIVE WORKSPACE (Two-Column Desktop, Tabbed Mobile) */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        {/* LEFT COLUMN: 4 Bento Cards OR Full 40 Procedures Catalog */}
        <div className={`lg:col-span-5 flex flex-col gap-4 ${mobileTab === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Segmented Mode Switcher */}
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <div className="inline-flex p-1 bg-[#F1F5F9] rounded-xl border border-[#CBD5E1]">
              <button
                onClick={() => setCatalogViewMode('bento')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  catalogViewMode === 'bento'
                    ? 'bg-white text-[#00236F] shadow-xs'
                    : 'text-[#64748B] hover:text-[#00236F]'
                }`}
              >
                ✨ 4 Thủ Tục Phổ Biến
              </button>
              <button
                onClick={() => setCatalogViewMode('catalog')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  catalogViewMode === 'catalog'
                    ? 'bg-white text-[#00236F] shadow-xs'
                    : 'text-[#64748B] hover:text-[#00236F]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#00687A]" />
                <span>Toàn Bộ 40 Thủ Tục</span>
              </button>
            </div>
            <span className="text-xs text-[#64748B] font-medium hidden sm:inline">1 chạm hỏi AI ngay</span>
          </div>

          {/* VIEW MODE 1: Bento Cards (4 Clean Civic Cards) */}
          {catalogViewMode === 'bento' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
              {bentoCards.map((card) => (
                <div
                  key={card.code}
                  onClick={() => handleAsk(card.prompt)}
                  className="group relative p-4 rounded-2xl bg-white border border-[#E2E8F0] hover:border-[#00236F] shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.99] flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl" role="img" aria-label={card.title}>
                        {card.icon}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${card.badgeColor}`}>
                        {card.badge}
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-[#F1F5F9] group-hover:bg-[#00236F] text-[#00236F] group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-2xs">
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#0F172A] group-hover:text-[#00236F] transition-colors leading-snug">
                      {card.title}
                    </h3>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#334155]">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#00687A]" />
                      {card.time}
                    </span>
                    <span className="font-bold text-[#00687A] bg-[#F0FDFA] px-2 py-0.5 rounded border border-[#99F6E4]">
                      {card.fee}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* VIEW MODE 2: Full 40 Procedures Catalog with Search & Filter */
            <div className="flex flex-col gap-3 bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
              {/* Search in Catalog */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Gõ tên thủ tục cần tìm (khai sinh, kết hôn, đất đai...)"
                  className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus:outline-none focus:border-[#00236F] focus:bg-white text-[#0F172A] transition-all"
                />
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCatalogCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg shrink-0 font-semibold transition cursor-pointer ${
                      catalogCategory === cat.id
                        ? 'bg-[#00236F] text-white shadow-2xs'
                        : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Procedures List */}
              <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1 divide-y divide-[#F1F5F9]">
                {filteredCatalog.map((item) => (
                  <div
                    key={item.code}
                    onClick={() => handleAsk(`Thủ tục ${item.name} tại ${currentWard.name} cần giấy tờ gì, thời gian và lệ phí ra sao?`)}
                    className="pt-2.5 first:pt-0 p-2.5 rounded-xl border border-transparent hover:border-[#00236F] hover:bg-[#F8FAFC] transition cursor-pointer flex flex-col gap-1 active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-[#00236F] bg-[#EAEDFF] px-2 py-0.5 rounded">
                        {item.code}
                      </span>
                      <span className="text-[#00687A] font-semibold">{item.category}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#0F172A] line-clamp-2 leading-snug">
                      {item.name}
                    </span>
                    <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
                      <span>{item.chunksCount} căn cứ pháp lý</span>
                      <span className="text-[#00236F] font-bold flex items-center gap-0.5">
                        Hỏi hướng dẫn <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}

                {filteredCatalog.length === 0 && (
                  <div className="p-6 text-center text-[#64748B] text-xs">
                    Không tìm thấy thủ tục phù hợp với từ khóa "{catalogSearch}".
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Guidance Box */}
          <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-[#166534] shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-[#14532D] leading-relaxed">
              <strong className="block font-bold text-[#166534] mb-0.5">Bộ phận Một cửa luôn sẵn sàng đón tiếp bà con</strong>
              Bà con nộp hồ sơ trực tiếp tại UBND {currentWard.name} ({currentWard.officeAddress}). Hotline giải đáp thắc mắc: <strong>{currentWard.phoneNumber}</strong>.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Legal RAG Chat Workspace */}
        <div className={`lg:col-span-7 flex flex-col bg-white rounded-3xl border border-[#CBD5E1] shadow-sm overflow-hidden min-h-[640px] max-h-[760px] ${mobileTab === 'catalog' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Chat Workspace Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-[#00236F] to-[#1E3A8A] text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#57DFFE] border border-white/20 shadow-xs">
                <Bot className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-tight">Trợ Lý Pháp Lý Một Cửa AI</span>
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                </div>
                <span className="text-xs text-[#BAE6FD]">
                  Cơ sở dữ liệu 40 TTHC & Chốt chặn pháp lý UBND {currentWard.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (confirm('Bà con có chắc muốn xóa lịch sử cuộc trò chuyện này để bắt đầu lại?')) {
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    setSpeakingId(null);
                    setMessages([]);
                  }
                }}
                title="Làm mới cuộc trò chuyện"
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            </div>
          </div>

          {/* Messages Scroll Viewport */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-5 bg-[#FAF8FF]/50">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#64748B]">
                <Bot className="w-14 h-14 text-[#CBD5E1] mb-3" />
                <p className="text-base font-bold text-[#0F172A]">Kính chào bà con! Tôi có thể giúp gì cho bà con?</p>
                <p className="text-xs sm:text-sm text-[#64748B] mt-1 max-w-md leading-relaxed">
                  Bà con có thể bấm vào các gợi ý bên dưới hoặc gõ câu hỏi bất kỳ về thủ tục khai sinh, kết hôn, chứng thực, cư trú...
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-md">
                  {quickPrompts.slice(0, 3).map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAsk(p.q)}
                      className="px-3 py-1.5 rounded-full bg-white text-[#00236F] border border-[#CBD5E1] text-xs font-medium hover:bg-[#EAEDFF] transition cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'citizen' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-9 h-9 rounded-full bg-[#00236F] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-5 h-5 text-[#57DFFE]" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[82%] flex flex-col gap-2 rounded-2xl p-4 transition-all ${
                    msg.sender === 'citizen'
                      ? 'bg-[#00236F] text-white rounded-br-xs shadow-sm'
                      : 'bg-white text-[#0F172A] border border-[#E2E8F0] rounded-bl-xs shadow-xs'
                  }`}
                >
                  {/* Message body text with 5-section badge highlights */}
                  {msg.sender === 'bot' ? (
                    renderMessageContent(msg)
                  ) : (
                    <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.text}</p>
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
                      <p className="text-xs leading-relaxed text-[#78350F]">
                        {msg.ragData.abstentionReason || 'Hệ thống nhận thấy câu hỏi có thể liên quan đến thủ tục nhưng cần làm rõ thêm để đảm bảo an toàn tuyệt đối.'}
                      </p>
                    </div>
                  )}

                  {/* SAFE ABSTENTION GUARDRAIL: S_max < 0.42 */}
                  {msg.ragData?.abstained && msg.ragData.maxSimilarity < 0.42 && (
                    <div className="mt-2 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] flex items-start gap-2.5 shadow-2xs">
                      <ShieldAlert className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
                      <div className="text-xs leading-relaxed">
                        <strong className="text-[#B91C1C] block mb-0.5 font-bold">Chốt Chặn An Toàn Pháp Lý (Safe Abstention)</strong>
                        {msg.ragData.abstentionReason || 'Hệ thống chỉ cung cấp hướng dẫn trong phạm vi 40 thủ tục hành chính công cấp xã/phường.'}
                      </div>
                    </div>
                  )}

                  {/* RESIDENCE / POLICE ROUTING BUTTON: When query touches residence/VNeID */}
                  {(msg.text.includes('Công an cấp xã') || msg.text.includes('VNeID')) && (
                    <div className="mt-2 pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
                      <span className="text-xs text-[#00687A] font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" />
                        Đề án 06 — Cổng DVC Bộ Công An
                      </span>
                      <a
                        href="https://dichvucong.bocongan.gov.vn/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#00687A] hover:bg-[#004E5C] text-white text-xs font-bold transition shadow-xs"
                      >
                        <span>Truy cập Cổng Bộ Công An</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Bot Interactive Action Dock & Citations */}
                  {msg.sender === 'bot' && (
                    <div className="mt-3.5 pt-3 border-t border-[#E2E8F0] flex flex-col gap-2.5">
                      {/* Meta Tags & Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
                        <span className="flex items-center gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-[#00687A]" />
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
                          {/* Text-To-Speech Button (Prominent for Seniors) */}
                          <button
                            onClick={() => toggleSpeech(msg.text, msg.id)}
                            className={`flex items-center gap-1.5 font-bold text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                              speakingId === msg.id
                                ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]'
                                : 'bg-[#F1F5F9] text-[#00236F] hover:bg-[#E2E8F0] border border-[#CBD5E1]'
                            }`}
                            title={speakingId === msg.id ? 'Dừng đọc âm thanh' : 'Bấm để nghe đọc bằng giọng nói tiếng Việt'}
                          >
                            {speakingId === msg.id ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5 text-[#DC2626]" />
                                <span>Dừng đọc</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5 text-[#00236F]" />
                                <span>🔊 Nghe đọc to</span>
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
                                <Check className="w-3.5 h-3.5 text-[#10B981]" />
                                <span className="text-[#10B981] font-bold">Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Sao chép</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* EMBEDDED ACTION PILLS */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {/* Action 1: Form Precheck Navigation */}
                        <button
                          onClick={() => navigate('/citizen/form')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EAEDFF] hover:bg-[#DAE2FD] text-[#00236F] text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <FileCheck2 className="w-3.5 h-3.5 text-[#00687A]" />
                          <span>Kiểm tra tờ khai CT01</span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                        </button>

                        {/* Action 2: View Legal Citations Drawer */}
                        {msg.ragData?.citations && msg.ragData.citations.length > 0 && (
                          <button
                            onClick={() => setActiveCitation(msg.ragData!.citations[0])}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#00687A] text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Căn cứ pháp lý ({msg.ragData.citations.length})</span>
                          </button>
                        )}

                        {/* Action 3: Incident Report Anchor */}
                        <button
                          onClick={() => navigate('/citizen/form#incident')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Báo sự cố tại chỗ</span>
                        </button>
                      </div>

                      {/* QUICK SUGGESTION CHIPS DIRECTLY UNDER ASSISTANT MESSAGE */}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-[#E2E8F0] flex flex-col gap-1.5">
                          <span className="text-xs font-bold text-[#64748B] flex items-center gap-1">
                            💡 Gợi ý câu hỏi tiếp theo cho bà con:
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {msg.suggestions.map((chip, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                disabled={loading}
                                onClick={() => handleAsk(chip)}
                                className="px-3 py-1.5 rounded-full bg-[#F8FAFC] hover:bg-[#00236F] hover:text-white text-[#00236F] text-xs font-semibold border border-[#CBD5E1] transition-all duration-200 active:scale-95 shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="w-9 h-9 rounded-full bg-[#EAEDFF] text-[#00236F] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
            ))}

            {/* Staggered Typing Indicator */}
            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#00236F] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-5 h-5 text-[#57DFFE] animate-pulse" />
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-2xl rounded-bl-xs px-4 py-3 shadow-xs flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-[#475569] font-medium">Cán bộ AI đang tra cứu văn bản pháp lý...</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#00236F] animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 rounded-full bg-[#00687A] animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 rounded-full bg-[#57DFFE] animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} className="h-6 shrink-0" />
          </div>

          {/* Quick Prompts Carousel Bar */}
          <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-[#64748B] uppercase shrink-0">Hỏi nhanh:</span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(p.q)}
                className="shrink-0 px-3 py-1.5 rounded-full bg-white hover:bg-[#EAEDFF] text-[#00236F] text-xs font-semibold border border-[#CBD5E1] transition active:scale-95 shadow-2xs cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Interactive Chat Input Dock with Large Accessible Buttons */}
          <div className="p-3.5 bg-white border-t border-[#CBD5E1]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
              className="flex items-center gap-2"
            >
              {/* Dictation Simulation Button for Voice Input */}
              <button
                type="button"
                onClick={toggleMic}
                title="Bấm để nói câu hỏi (Mô phỏng nhận diện giọng nói tiếng Việt)"
                className={`p-3 rounded-xl border transition-all active:scale-90 cursor-pointer min-h-[46px] min-w-[46px] flex items-center justify-center ${
                  isMicActive
                    ? 'bg-[#DC2626] text-white border-[#DC2626] animate-pulse'
                    : 'bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#00687A] border-[#CBD5E1]'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* Text Input Field */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  maxLength={1000}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nhập câu hỏi thủ tục (ví dụ: làm khai sinh, kết hôn, CT01)..."
                  className="w-full h-12 pl-4 pr-10 rounded-xl bg-[#FAF8FF] border border-[#CBD5E1] focus:border-[#00236F] focus:bg-white text-sm sm:text-base text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00236F]/15 transition-all"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] cursor-pointer p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Send Button with Tactile Physics */}
              <button
                type="submit"
                disabled={!query.trim() || loading}
                className={`h-12 px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer min-h-[46px] ${
                  query.trim() && !loading
                    ? 'bg-[#00236F] hover:bg-[#1E3A8A] text-white shadow-md shadow-[#00236F]/20'
                    : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                }`}
              >
                <span>Gửi</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Citation Detail Modal / Drawer with Smooth Animation */}
      {activeCitation !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-[#CBD5E1] flex flex-col gap-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#00236F]" />
                <h3 className="font-bold text-sm sm:text-base text-[#00236F]">
                  Căn Cứ Pháp Lý Trích Xuất
                </h3>
              </div>
              <button
                onClick={() => setActiveCitation(null)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs sm:text-sm">
              <div>
                <span className="text-[#64748B] block text-xs font-medium">Văn bản quy phạm pháp luật:</span>
                <span className="font-bold text-[#0F172A] text-sm">
                  {activeCitation.legalReference || activeCitation.title}
                </span>
              </div>

              <div>
                <span className="text-[#64748B] block text-xs font-medium">Nội dung điều khoản trích dẫn:</span>
                <p className="p-3.5 bg-[#FAF8FF] border border-[#CBD5E1] rounded-xl text-xs sm:text-sm text-[#0F172A] leading-relaxed mt-1">
                  "{activeCitation.content}"
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
                <span>Mã đoạn: <code>{activeCitation.chunkCode}</code></span>
                <span className="font-bold text-[#00687A]">
                  Độ tương đồng Cosine: {((activeCitation.relevanceScore || 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveCitation(null)}
              className="w-full py-2.5 bg-[#00236F] hover:bg-[#1E3A8A] text-white text-xs sm:text-sm font-bold rounded-xl transition active:scale-95 cursor-pointer shadow-xs"
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
