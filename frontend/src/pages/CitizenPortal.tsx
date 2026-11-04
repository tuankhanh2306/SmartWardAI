import React, { useState, useRef, useEffect } from 'react';
import { askLegalRag, type RagResponse } from '../api/client';
import { isGeminiConfigured } from '../services/geminiClient';
import { AiSettingsModal } from '../components/AiSettingsModal';
import { useNavigate } from 'react-router-dom';
import { useWard } from '../context/WardContext';
import {
  Send,
  Sparkles,
  Bot,
  User,
  ShieldAlert,
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
  MapPin
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'citizen' | 'bot';
  text: string;
  ragData?: RagResponse;
  timestamp: string;
}

export const CitizenPortal: React.FC = () => {
  const navigate = useNavigate();
  const { currentWard, isOfficeOpen } = useWard();
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [geminiActive, setGeminiActive] = useState(isGeminiConfigured());

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
      text: 'Thủ tục Đăng ký khai sinh được giải quyết trong 01 ngày làm việc (trường hợp cần xác minh thì không quá 05 ngày làm việc). Lệ phí: Miễn phí hoàn toàn khi đăng ký đúng hạn trong vòng 60 ngày kể từ ngày sinh. Hồ sơ gồm: Tờ khai theo mẫu và Giấy chứng sinh của cơ sở y tế.',
      timestamp: '08:45',
      ragData: {
        answer:
          'Thủ tục Đăng ký khai sinh được giải quyết trong 01 ngày làm việc (trường hợp cần xác minh thì không quá 05 ngày làm việc). Lệ phí: Miễn phí hoàn toàn khi đăng ký đúng hạn trong vòng 60 ngày kể từ ngày sinh.',
        abstained: false,
        maxSimilarity: 0.942,
        appliedThreshold: 0.78,
        responseTimeMs: 18.5,
        cached: true,
        disclaimer: 'Thông tin có giá trị tham khảo và trích xuất từ Cổng Dịch vụ công Quốc gia & Luật Hộ tịch 2014.',
        citations: [
          {
            chunkCode: 'TTHC-HT-01_CHK_003',
            procedureCode: 'TTHC-HT-01',
            procedureName: 'Đăng ký khai sinh',
            title: 'Thành phần hồ sơ và thời hạn giải quyết Đăng ký khai sinh',
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
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleAsk = async (questionText?: string) => {
    const q = questionText || query;
    if (!q.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'citizen',
      text: q,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const resp = await askLegalRag(q, 3, {
        wardName: `${currentWard.name}, ${currentWard.province}`,
        officeAddress: currentWard.officeAddress,
      });
      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        sender: 'bot',
        text: resp.answer,
        ragData: resp,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        sender: 'bot',
        text: `Hệ thống đang bận hoặc câu hỏi cần liên hệ trực tiếp Bộ phận Một cửa ${currentWard.name} (${currentWard.phoneNumber}) để được hỗ trợ cụ thể.`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
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
    setQuery(`Tôi muốn kiểm tra điều kiện đăng ký thường trú tại ${currentWard.name}...`);
    setTimeout(() => {
      setIsMicActive(false);
    }, 1500);
  };

  const quickPrompts = [
    { label: '👶 Khai sinh cần giấy tờ gì?', q: `Tôi muốn làm thủ tục đăng ký khai sinh cho cháu mới sinh tại ${currentWard.name} cần giấy tờ gì và mất bao lâu?` },
    { label: '💍 Đăng ký kết hôn tại UBND', q: `Thủ tục đăng ký kết hôn tại UBND ${currentWard.name} cần hai bên chuẩn bị hồ sơ gì và lệ phí bao nhiêu?` },
    { label: '🏠 Hướng dẫn điền mẫu CT01', q: `Hướng dẫn các bước làm thủ tục đăng ký thường trú theo mẫu tờ khai CT01 tại ${currentWard.name}?` },
    { label: '⚠️ Câu hỏi bẫy ngoài thẩm quyền', q: 'Thủ tục tranh chấp chia thừa kế quyền sử dụng đất nông nghiệp cấp tỉnh và giá vàng hôm nay?' },
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
      title: 'Đăng Ký Cư Trú (CT01)',
      subtitle: 'Quản lý Cư trú & Số định danh',
      time: '03 ngày làm việc',
      fee: 'Theo quy định Bộ CA',
      badge: 'Có Tiền Kiểm Định',
      prompt: `Hướng dẫn thủ tục nộp tờ khai CT01 và kiểm tra giấy tờ cư trú tại ${currentWard.name}?`,
    },
    {
      code: 'TTHC-HT-03',
      title: 'Xác Nhận Độc Thân',
      subtitle: 'Tình trạng hôn nhân',
      time: '03 ngày làm việc',
      fee: 'Lệ phí hành chính',
      badge: 'Hồ Sơ Đề Án 06',
      prompt: 'Làm giấy xác nhận tình trạng hôn nhân cần mang theo những giấy tờ gì?',
    },
  ];

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
                Trợ lý ảo pháp lý ứng dụng mô hình RAG phân cấp và Google Gemini 2.5 Flash, chốt chặn chống ảo giác ($\theta = 0.78$), 
                phối hợp công nghệ cùng Viettel An Giang. Hỗ trợ tra cứu tức thì 40 TTHC cấp xã/phường tại <strong>{currentWard.name}</strong> và tiền kiểm tra hồ sơ trước khi nộp.
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
        {/* LEFT COLUMN: 4 Bento Shortcut Cards (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00687A]" />
              <h2 className="text-sm font-bold text-[#131B2E] uppercase tracking-wider">
                Thủ Tục Phổ Biến (Hỏi Nhanh 1 Chạm)
              </h2>
            </div>
            <span className="text-[11px] text-[#757682]">Bấm thẻ để kích hoạt AI</span>
          </div>

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
                  <button
                    onClick={() => setAiModalOpen(true)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition active:scale-95 flex items-center gap-1 cursor-pointer ${
                      geminiActive
                        ? 'bg-[#10B981]/20 border-[#10B981]/40 text-[#6EE7B7]'
                        : 'bg-white/10 border-white/20 text-[#ACEDFF] hover:bg-white/20'
                    }`}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    {geminiActive ? 'Gemini Flash' : 'Cấu hình AI'}
                  </button>
                </div>
                <span className="text-[11px] text-[#ACEDFF] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#57DFFE] animate-pulse" />
                  Cơ sở dữ liệu 40 TTHC & Pháp điển điện tử
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (confirm('Bà con có chắc muốn xóa lịch sử cuộc trò chuyện này?')) {
                  setMessages([]);
                }
              }}
              title="Làm mới cuộc trò chuyện"
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* AI Engine Notification Bar */}
          {geminiActive ? (
            <div className="px-4 py-2 bg-[#ECFDF5] border-b border-[#A7F3D0] flex items-center justify-between text-xs transition-colors">
              <span className="text-[#065F46] flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                Đang kích hoạt <strong>Google Gemini Flash Mini</strong> — Có tư duy, hiểu câu hỏi tự nhiên & đối chiếu 40 TTHC dự án!
              </span>
              <button
                onClick={() => setAiModalOpen(true)}
                className="text-[11px] text-[#059669] hover:underline font-bold shrink-0 ml-2"
              >
                Cài đặt
              </button>
            </div>
          ) : (
            <div className="px-4 py-2 bg-gradient-to-r from-[#EFF6FF] to-[#FAF8FF] border-b border-[#DBEAFE] flex items-center justify-between text-xs transition-colors">
              <span className="text-[#1E40AF] flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                Đang dùng AI mô phỏng. Bật <strong>Gemini Mini</strong> để AI tự tư duy và trả lời tự nhiên theo dữ liệu dự án!
              </span>
              <button
                onClick={() => setAiModalOpen(true)}
                className="px-2.5 py-1 bg-[#2563EB] text-white rounded-lg font-bold hover:bg-[#1D4ED8] transition text-[11px] shrink-0 ml-2"
              >
                Bật Gemini
              </button>
            </div>
          )}

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
                  className={`max-w-[85%] sm:max-w-[78%] flex flex-col gap-2 rounded-2xl p-4 transition-all ${
                    msg.sender === 'citizen'
                      ? 'bg-[#00236F] text-white rounded-br-xs shadow-sm'
                      : 'bg-white text-[#131B2E] border border-[#EAEDFF] rounded-bl-xs shadow-xs'
                  }`}
                >
                  {/* Message body text */}
                  <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                  {/* Abstention Guardrail Alert Banner */}
                  {msg.ragData?.abstained && (
                    <div className="mt-2 p-3 rounded-xl bg-[#FFF8E1] border border-[#FFE082] text-[#8D6E63] flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-[#F57F17] shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <strong className="text-[#E65100] block mb-0.5">Chốt Chặn Chống Ảo Giác (Abstention Guardrail)</strong>
                        {msg.ragData.abstentionReason || 'Hệ thống chủ động từ chối trả lời tự động đối với các câu hỏi nằm ngoài danh mục thủ tục có thẩm quyền.'}
                      </div>
                    </div>
                  )}

                  {/* Bot Interactive Action Dock & Citations */}
                  {msg.sender === 'bot' && (
                    <div className="mt-3 pt-2.5 border-t border-[#EAEDFF] flex flex-col gap-2">
                      {/* Meta Tags */}
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

                        <button
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          className="hover:text-[#00236F] flex items-center gap-1 active:scale-90 transition font-medium"
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

                      {/* EMBEDDED ACTION PILLS: Cách ô chat tương tác với hành động */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {/* Action 1: Form Precheck Navigation */}
                        <button
                          onClick={() => navigate('/citizen/form')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EAEDFF] hover:bg-[#DAE2FD] text-[#00236F] text-[11px] font-semibold transition active:scale-95"
                        >
                          <FileCheck2 className="w-3 h-3 text-[#00687A]" />
                          <span>Tiền kiểm tra tờ khai CT01</span>
                          <ChevronRight className="w-3 h-3 opacity-60" />
                        </button>

                        {/* Action 2: View Legal Citations Drawer */}
                        {msg.ragData?.citations && msg.ragData.citations.length > 0 && (
                          <button
                            onClick={() => setActiveCitation(0)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F2F3FF] hover:bg-[#EAEDFF] text-[#00687A] text-[11px] font-semibold transition active:scale-95"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>Căn cứ pháp lý ({msg.ragData.citations.length})</span>
                          </button>
                        )}

                        {/* Action 3: Incident Report Anchor */}
                        <button
                          onClick={() => navigate('/citizen/form#incident')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFF2F2] hover:bg-[#FFDAD6] text-[#BA1A1A] text-[11px] font-semibold transition active:scale-95"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Báo sự cố tại chỗ</span>
                        </button>
                      </div>
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

            {/* Staggered Typing Indicator (Chuyển động mượt mà) */}
            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00236F] text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-[#57DFFE]" />
                </div>
                <div className="bg-white border border-[#EAEDFF] rounded-2xl rounded-bl-xs px-4 py-3 shadow-xs flex items-center gap-1.5">
                  <span className="text-xs text-[#757682] mr-1 font-medium">AI đang truy xuất Điều-Khoản</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00236F] animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00687A] animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#57DFFE] animate-bounce" />
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Quick Prompts Carousel Bar */}
          <div className="px-4 py-2 bg-[#F2F3FF]/70 border-t border-[#EAEDFF] flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-[#757682] uppercase shrink-0">Gợi ý:</span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(p.q)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-white hover:bg-[#EAEDFF] text-[#00236F] text-[11px] font-medium border border-[#DAE2FD] transition active:scale-95 shadow-2xs"
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
                className={`p-2.5 rounded-xl border transition-all active:scale-90 ${
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
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nhập câu hỏi TTHC (ví dụ: đăng ký khai sinh, kết hôn, CT01)..."
                  className="w-full h-11 pl-4 pr-10 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF] focus:border-[#00236F] focus:bg-white text-xs md:text-sm text-[#131B2E] placeholder-[#757682] focus:outline-none focus:ring-2 focus:ring-[#00236F]/10 transition-all"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#757682] hover:text-[#131B2E]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Send Button with Tactile Physics */}
              <button
                type="submit"
                disabled={!query.trim() || loading}
                className={`h-11 px-4 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all duration-200 active:scale-95 ${
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
      {activeCitation !== null && messages[1]?.ragData?.citations[0] && (
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
                className="p-1 rounded-lg text-[#757682] hover:text-[#131B2E] hover:bg-[#F2F3FF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <div>
                <span className="text-[#757682] block text-[11px]">Văn bản quy phạm:</span>
                <span className="font-bold text-[#131B2E] text-xs">
                  {messages[1].ragData.citations[0].legalReference}
                </span>
              </div>

              <div>
                <span className="text-[#757682] block text-[11px]">Nội dung điều khoản:</span>
                <p className="p-3 bg-[#FAF8FF] border border-[#EAEDFF] rounded-xl text-xs text-[#131B2E] leading-relaxed mt-1">
                  "{messages[1].ragData.citations[0].content}"
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#757682] pt-1">
                <span>Mã đoạn: <code>{messages[1].ragData.citations[0].chunkCode}</code></span>
                <span className="font-bold text-[#00687A]">
                  Độ tương đồng Cosine: {(messages[1].ragData.citations[0].relevanceScore * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveCitation(null)}
              className="w-full py-2 bg-[#00236F] hover:bg-[#1E3A8A] text-white text-xs font-semibold rounded-xl transition active:scale-95"
            >
              Đóng Căn Cứ Pháp Lý
            </button>
          </div>
        </div>
      )}

      {/* Gemini AI Settings Modal */}
      <AiSettingsModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onSaved={() => setGeminiActive(isGeminiConfigured())}
      />
    </div>
  );
};

export default CitizenPortal;
