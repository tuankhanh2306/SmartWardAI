import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { askLegalRag, type RagResponse, type LegalCitation } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useWard } from '../context/WardContext';
import { useAccessibility } from '../context/AccessibilityContext';
import {
  Send,
  Bot,
  User,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Copy,
  Check,
  RotateCcw,
  Mic,
  AlertTriangle,
  Clock,
  HelpCircle,
  X,
  MapPin,
  Volume2,
  VolumeX,
  Layers,
  ExternalLink,
  PhoneCall,
  Calendar,
  FileText,
  Scale,
  Building2,
  ClipboardList,
  Users,
  HeartHandshake,
  Stamp
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
  const { currentWard, isOfficeOpen, officeStatusLabel } = useWard();
  const { isAudioAutoPlay, setIsAudioAutoPlay } = useAccessibility();
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<LegalCitation | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Mobile tab switcher ('chat' vs 'catalog') for small screens
  const [mobileTab, setMobileTab] = useState<'chat' | 'catalog'>('chat');

  const initialTimeStr = useMemo(
    () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    []
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-0',
      sender: 'citizen',
      text: 'Tôi muốn làm thủ tục đăng ký khai sinh cho cháu mới sinh cần giấy tờ gì và mất bao lâu?',
      timestamp: initialTimeStr,
    },
    {
      id: 'msg-1',
      sender: 'bot',
      text: `1. TÓM TẮT THỦ TỤC:\nThủ tục Đăng ký khai sinh cho trẻ mới sinh được tiếp nhận và giải quyết tại UBND ${currentWard.name} nơi cư trú của cha hoặc mẹ.\n\n2. THÀNH PHẦN HỒ SƠ:\n• [TTHC-HT-01_CHUNK_003] Tờ khai đăng ký khai sinh theo mẫu quy định.\n• [TTHC-HT-01_CHUNK_003] Bản chính Giấy chứng sinh do cơ sở khám bệnh, chữa bệnh cấp (hoặc văn bản xác nhận của người làm chứng/giấy cam đoan).\n• Xuất trình CCCD/Hộ chiếu còn hiệu lực của cha mẹ và Giấy chứng nhận kết hôn (nếu có).\n\n3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n• Thời hạn: Giải quyết ngay trong 01 ngày làm việc (trường hợp cần xác minh thì không quá 05 ngày làm việc).\n• Lệ phí: Miễn phí hoàn toàn khi đăng ký đúng hạn trong vòng 60 ngày kể từ ngày sinh.\n\n4. NƠI TIẾP NHẬN & XỬ LÝ:\nBộ phận Tiếp nhận và Trả kết quả (Một cửa) thuộc UBND ${currentWard.name} (${currentWard.officeAddress}).\n\n5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n[TTHC-HT-01_CHUNK_004] Căn cứ Luật Hộ tịch 2014 & Nghị định 123/2015/NĐ-CP.\n\n*Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo, không thay thế quyết định chính thức của công chức tiếp nhận hồ sơ tại Bộ phận Một cửa.*`,
      timestamp: initialTimeStr,
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

  // Keep seed welcome message synchronized when citizen switches Ward/Commune
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === 'msg-1'
          ? {
              ...m,
              text: `1. TÓM TẮT THỦ TỤC:\nThủ tục Đăng ký khai sinh cho trẻ mới sinh được tiếp nhận và giải quyết tại UBND ${currentWard.name} nơi cư trú của cha hoặc mẹ.\n\n2. THÀNH PHẦN HỒ SƠ:\n• [TTHC-HT-01_CHUNK_003] Tờ khai đăng ký khai sinh theo mẫu quy định.\n• [TTHC-HT-01_CHUNK_003] Bản chính Giấy chứng sinh do cơ sở khám bệnh, chữa bệnh cấp (hoặc văn bản xác nhận của người làm chứng/giấy cam đoan).\n• Xuất trình CCCD/Hộ chiếu còn hiệu lực của cha mẹ và Giấy chứng nhận kết hôn (nếu có).\n\n3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n• Thời hạn: Giải quyết ngay trong 01 ngày làm việc (trường hợp cần xác minh thì không quá 05 ngày làm việc).\n• Lệ phí: Miễn phí hoàn toàn khi đăng ký đúng hạn trong vòng 60 ngày kể từ ngày sinh.\n\n4. NƠI TIẾP NHẬN & XỬ LÝ:\nBộ phận Tiếp nhận và Trả kết quả (Một cửa) thuộc UBND ${currentWard.name} (${currentWard.officeAddress}).\n\n5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n[TTHC-HT-01_CHUNK_004] Căn cứ Luật Hộ tịch 2014 & Nghị định 123/2015/NĐ-CP.\n\n*Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo, không thay thế quyết định chính thức của công chức tiếp nhận hồ sơ tại Bộ phận Một cửa.*`,
            }
          : m
      )
    );
  }, [currentWard.code, currentWard.name, currentWard.officeAddress]);

  // Auto scroll to chat bottom
  useEffect(() => {
    const timer = setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  // Reference to current active utterance to prevent Chromium garbage-collection bug
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop speech synthesis cleanly across all browsers
  const stopSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
      } catch (err) {
        console.warn('speechSynthesis cancel warning:', err);
      }
    }
    currentUtteranceRef.current = null;
    setSpeakingId(null);
  }, []);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  // Start speech synthesis with Vietnamese voice preference
  const startSpeech = useCallback((text: string, id: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt của bạn hiện chưa hỗ trợ tính năng đọc âm thanh.');
      return;
    }

    // Stop any currently playing audio first
    stopSpeech();

    // Clean brackets, chunk codes, hashtags and markdown characters for natural pronunciation
    const clean = text
      .replace(/\[[A-Za-z0-9_\-]+\]/g, '')
      .replace(/[*#_~`>]/g, ' ')
      .replace(/•/g, ', ')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return;

    // Small delay to allow Chrome's cancel() queue to settle cleanly
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = 'vi-VN';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        // Pick Vietnamese voice if present in system voices
        if ('speechSynthesis' in window) {
          const voices = window.speechSynthesis.getVoices();
          const viVoice = voices.find((v) => v.lang.toLowerCase().includes('vi'));
          if (viVoice) {
            utterance.voice = viVoice;
          }
        }

        utterance.onend = () => {
          currentUtteranceRef.current = null;
          setSpeakingId(null);
        };
        utterance.onerror = () => {
          currentUtteranceRef.current = null;
          setSpeakingId(null);
        };

        // Pin reference to prevent GC while speaking
        currentUtteranceRef.current = utterance;
        setSpeakingId(id);
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('Speech synthesis speak error:', err);
        setSpeakingId(null);
      }
    }, 50);
  }, [stopSpeech]);

  // Text-To-Speech (Hỗ trợ 2 chế độ TẮT & MỞ rõ ràng để người dân nghe và tắt khi cần)
  const toggleSpeech = useCallback((text: string, id: string) => {
    if (speakingId === id) {
      // Đang Mở đọc tin nhắn này -> Tắt ngay
      stopSpeech();
    } else {
      // Đang Tắt hoặc chuyển sang tin nhắn mới -> Mở đọc
      startSpeech(text, id);
    }
  }, [speakingId, stopSpeech, startSpeech]);

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
        suggestions: ['Đăng ký khai sinh', 'Đăng ký kết hôn', 'Đăng ký thường trú (CT01)', 'Xem danh mục 40 thủ tục'],
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
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Graceful fallback simulation if browser does not support Web Speech API
      setIsMicActive(true);
      setQuery(`Tôi muốn làm thủ tục đăng ký khai sinh cho con tại ${currentWard.name}`);
      setTimeout(() => {
        setIsMicActive(false);
      }, 1500);
      return;
    }

    if (isMicActive) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsMicActive(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsMicActive(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setQuery((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsMicActive(false);
      };

      recognition.onend = () => {
        setIsMicActive(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsMicActive(false);
    }
  };

  const quickPrompts = [
    { label: 'Đăng ký khai sinh', q: `Tôi muốn làm thủ tục đăng ký khai sinh cho cháu mới sinh tại ${currentWard.name} cần giấy tờ gì và mất bao lâu?` },
    { label: 'Đăng ký kết hôn', q: `Thủ tục đăng ký kết hôn tại UBND ${currentWard.name} cần hai bên chuẩn bị hồ sơ gì và lệ phí bao nhiêu?` },
    { label: 'Trích lục khai sinh', q: 'Tôi bị mất bản gốc giấy khai sinh, muốn xin cấp bản sao trích lục khai sinh tại xã thì cần làm thế nào?' },
    { label: 'Thủ tục thường trú (CT01)', q: 'Tôi muốn làm thủ tục đăng ký thường trú thì nộp hồ sơ ở đâu?' },
    { label: 'Trợ cấp người cao tuổi', q: 'Hồ sơ và điều kiện hưởng trợ cấp xã hội hằng tháng cho người cao tuổi, người khuyết tật gồm những gì?' },
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
      IconComponent: FileText,
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
      badgeColor: 'bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]',
      IconComponent: HeartHandshake,
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
      IconComponent: Stamp,
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
      IconComponent: Users,
      description: 'Hỗ trợ người cao tuổi (từ đủ 80 tuổi), người khuyết tật nặng theo quy định.',
      prompt: 'Hồ sơ và điều kiện hưởng trợ cấp xã hội hằng tháng cho người cao tuổi, khuyết tật gồm những gì?',
    },
  ];

  // Formatted Message Renderer with Clear 5-Section Structured Cards
  const renderMessageContent = (msg: ChatMessage) => {
    const text = msg.text;
    const lines = text.split('\n');

    const sectionHeaders = [
      { key: '1. TÓM TẮT THỦ TỤC:', title: '1. TÓM TẮT THỦ TỤC', Icon: ClipboardList, badgeColor: 'bg-[#F8FAFC] text-[#0F2942] border-[#CBD5E1]' },
      { key: '2. THÀNH PHẦN HỒ SƠ:', title: '2. THÀNH PHẦN HỒ SƠ CẦN CHUẨN BỊ', Icon: FileText, badgeColor: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]' },
      { key: '3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:', title: '3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ', Icon: Clock, badgeColor: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]' },
      { key: '4. NƠI TIẾP NHẬN & XỬ LÝ:', title: '4. NƠI TIẾP NHẬN & GIẢI QUYẾT', Icon: Building2, badgeColor: 'bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]' },
      { key: '5. CĂN CỨ PHÁP LÝ & LƯU Ý:', title: '5. CĂN CỨ PHÁP LÝ & LƯU Ý QUAN TRỌNG', Icon: Scale, badgeColor: 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1]' },
    ];

    const renderTextWithCitations = (lineStr: string) => {
      const parts = lineStr.split(/(\[[A-Za-z0-9_\-]+\]|\*\*[^*]+\*\*)/g);
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
              className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-md font-mono text-[11px] font-bold bg-teal-50/70 text-[#00796B] hover:bg-teal-100/70 border border-teal-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
              title={`Xem căn cứ pháp lý ${code}`}
            >
              <BookOpen className="w-3 h-3 text-[#00796B]" />
              <span>{part}</span>
            </button>
          );
        }
        const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
        if (boldMatch) {
          return (
            <strong key={pIdx} className="font-bold text-[#0F172A]">
              {boldMatch[1]}
            </strong>
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
            const HeaderIcon = foundHeader.Icon;
            return (
              <div key={lIdx} className="mt-3.5 pt-3 border-t border-[#E2E8F0] first:mt-0 first:pt-0 first:border-0">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${foundHeader.badgeColor} shadow-2xs`}>
                  <HeaderIcon className="w-3.5 h-3.5 shrink-0" />
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
    <div className="flex flex-col w-full pb-12 bg-uth-canvas bg-uth-watermark min-h-[calc(100vh-4rem)]">
      {/* SINGLE-LINE CIVIC STATUS STRIP (No Duplicate Header / No Duplicate CTA) */}
      <section className="w-full bg-white px-4 md:px-8 py-2.5 border-b border-teal-100/80">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Left: Real-Time Working Hours Status + Office Address + Hotline */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[#475569]">
            <span
              className={`inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-full ${
                isOfficeOpen
                  ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                  : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOfficeOpen ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`} />
              <span>{officeStatusLabel}</span>
            </span>

            <span className="hidden md:inline text-[#CBD5E1]">|</span>

            <span className="hidden md:flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#00796B] shrink-0" />
              <span>Trụ sở: <strong className="text-[#0F172A]">{currentWard.officeAddress}</strong></span>
            </span>

            <span className="text-[#CBD5E1]">|</span>

            <span className="flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-[#00796B] shrink-0" />
              <span>Đường dây nóng: <strong className="text-[#00796B] font-mono">{currentWard.phoneNumber}</strong></span>
            </span>

            <span className="hidden xl:inline text-[#CBD5E1]">|</span>

            <span className="hidden xl:flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#00796B] shrink-0" />
              <span>{currentWard.workingHours}</span>
            </span>
          </div>

          {/* Right: Accessibility Audio Read Toggle (2 Chế độ Rõ Ràng MỞ / TẮT) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const nextState = !isAudioAutoPlay;
                setIsAudioAutoPlay(nextState);
                if (!nextState) {
                  stopSpeech();
                }
              }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                isAudioAutoPlay
                  ? 'bg-[#00796B] text-white border-[#00695C] shadow-xs'
                  : 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]'
              }`}
              title="Bật hoặc Tắt chế độ tự động đọc câu trả lời bằng giọng nói cho người lớn tuổi"
            >
              {isAudioAutoPlay ? (
                <Volume2 className="w-3.5 h-3.5 text-[#80CBC4]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-[#94A3B8]" />
              )}
              <span>Tự động đọc:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                  isAudioAutoPlay ? 'bg-[#80CBC4] text-[#004D40]' : 'bg-[#E2E8F0] text-[#475569]'
                }`}
              >
                {isAudioAutoPlay ? 'MỞ' : 'TẮT'}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* MOBILE RESPONSIVE SEGMENTED SWITCHER (< lg screens) */}
      <div className="lg:hidden max-w-7xl mx-auto w-full px-4 mt-3">
        <div className="flex rounded-xl bg-[#E2E8F0]/70 p-1 border border-[#CBD5E1]">
          <button
            type="button"
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'chat'
                ? 'bg-white text-[#0F2942] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F2942]'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Hỏi Đáp AI</span>
            {messages.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#0F2942] text-white text-[10px] flex items-center justify-center font-bold">
                {messages.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('catalog')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'catalog'
                ? 'bg-white text-[#0F2942] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F2942]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>40 Thủ Tục</span>
          </button>
        </div>
      </div>

      {/* MAIN INTERACTIVE WORKSPACE (Two-Column Desktop: 1/4 Info & Procedures, 3/4 Spacious Chat) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 w-full lg:items-stretch">
        {/* LEFT COLUMN: 1/4 Khung Thông Tin Gọn & 4 Thủ Tục Trọng Tâm */}
        <div className={`lg:col-span-4 xl:col-span-3 flex flex-col justify-between gap-3.5 lg:h-[750px] ${mobileTab === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            {/* Dedicated Link Banner to the new Dedicated 40 Procedures Page */}
            <div className="p-3.5 rounded-2xl bg-white border border-teal-200/90 shadow-[0_2px_12px_rgba(0,121,107,0.06)] flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#00796B] border border-teal-200 flex items-center justify-center shrink-0 shadow-2xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-[#00796B] truncate">Danh Mục 40 Thủ Tục</h4>
                  <p className="text-[11px] text-slate-500 truncate">Văn bản mẫu A4 & thời hạn</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/citizen/procedures')}
                className="w-full py-1.5 px-3 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <span>Mở Trang Thủ Tục Riêng</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Header: 4 Thủ Tục Trọng Tâm To Rõ Dễ Nhìn */}
            <div className="flex items-center justify-between pb-1.5 border-b border-teal-100 shrink-0">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#00796B]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#00796B]">
                  Thủ Tục Thường Gặp
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Bấm hỏi ngay</span>
            </div>

            {/* VIEW MODE 1: Bento Cards (To rõ, dễ nhìn, dễ thao tác) */}
            <div className="flex flex-col gap-2.5 overflow-y-auto pr-0.5 flex-1">
              {bentoCards.map((card) => {
                const CardIcon = card.IconComponent;
                return (
                  <div
                    key={card.code}
                    onClick={() => handleAsk(card.prompt)}
                    className="group relative p-3 rounded-2xl bg-white border border-slate-200 hover:border-[#00796B] shadow-2xs hover:shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.99] flex flex-col justify-between gap-1.5 shrink-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-[#00796B] group-hover:bg-[#00796B] group-hover:text-white transition-colors shrink-0">
                          <CardIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border truncate ${card.badgeColor}`}>
                          {card.badge}
                        </span>
                      </div>

                      <div className="w-6 h-6 rounded-full bg-slate-50 group-hover:bg-[#00796B] text-slate-600 group-hover:text-white flex items-center justify-center transition-all duration-200 border border-slate-200 shrink-0">
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#00796B] transition-colors leading-snug line-clamp-1">
                        {card.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                        {card.description}
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                      <span className="flex items-center gap-1 font-medium text-[10px]">
                        <Clock className="w-3 h-3 text-[#00796B]" />
                        {card.time}
                      </span>
                      <span className="font-bold text-[#00796B] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 text-[10px]">
                        {card.fee}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Guidance Box Gọn Nhẹ */}
          <div className="p-3 rounded-2xl bg-teal-50/60 border border-teal-200 flex items-start gap-2 shrink-0">
            <HelpCircle className="w-4 h-4 text-[#00796B] shrink-0 mt-0.5" />
            <div className="text-[11px] text-teal-900 leading-snug">
              <strong>Tiếp dân Một cửa:</strong> UBND {currentWard.name}. ĐT: <strong>{currentWard.phoneNumber}</strong>.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Legal RAG Chat Workspace (Chiếm 3/4 Khung: To Rộng & Thoáng Đãng) */}
        <div className={`lg:col-span-8 xl:col-span-9 flex flex-col bg-white rounded-3xl border border-teal-100 shadow-[0_4px_24px_rgba(0,121,107,0.06)] overflow-hidden min-h-[580px] lg:h-[750px] ${mobileTab === 'catalog' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Chat Workspace Header */}
          <div className="px-5 py-3.5 bg-[#00796B] text-white flex items-center justify-between border-b border-[#004D40]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white border border-white/20 shadow-2xs">
                <Bot className="w-5 h-5 text-teal-100" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold tracking-tight">Trợ Lý Pháp Lý Một Cửa</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-300" />
                </div>
                <span className="text-[11px] text-teal-100">
                  Tra cứu 40 TTHC UBND {currentWard.name}
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
                className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            </div>
          </div>

          {/* Messages Scroll Viewport */}
          <div className="flex-1 p-4 md:p-5 overflow-y-auto space-y-4 bg-[#F8FAFC]">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#64748B]">
                <Bot className="w-12 h-12 text-teal-300 mb-3" />
                <p className="text-base font-bold text-[#0F172A]">Kính chào bà con! Tôi có thể giúp gì cho bà con?</p>
                <p className="text-xs sm:text-sm text-[#64748B] mt-1 max-w-md leading-relaxed">
                  Bấm vào gợi ý bên dưới hoặc gõ câu hỏi về khai sinh, kết hôn, chứng thực, cư trú...
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-md">
                  {quickPrompts.slice(0, 3).map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAsk(p.q)}
                      className="px-3 py-1.5 rounded-full bg-white text-[#00796B] border border-teal-200 text-xs font-semibold hover:bg-teal-50 transition cursor-pointer shadow-2xs"
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
                  <div className="w-8 h-8 rounded-full bg-[#00796B] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-4 h-4 text-teal-100" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[82%] flex flex-col gap-2 rounded-2xl p-4 transition-all ${
                    msg.sender === 'citizen'
                      ? 'bg-[#00796B] text-white rounded-br-xs shadow-xs'
                      : 'bg-white text-[#0F172A] border border-teal-100/90 rounded-bl-xs shadow-2xs'
                  }`}
                >
                  {/* Message body text with 5-section badge highlights */}
                  {msg.sender === 'bot' ? (
                    renderMessageContent(msg)
                  ) : (
                    <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  )}

                  {/* POLITE CIVIC CONTACT NOTE WHEN QUERY NEEDS DIRECT SUPPORT */}
                  {msg.ragData?.abstained && (
                    <div className="mt-2 p-3 rounded-xl bg-teal-50/50 border border-teal-200 text-[#334155] flex items-center justify-between gap-2 text-xs">
                      <span>
                        Câu hỏi đã được chuyển vào Hàng đợi Cán bộ Một cửa <strong>UBND {currentWard.name}</strong> để kiểm duyệt và phản hồi chính xác.
                      </span>
                      <a
                        href={`tel:${currentWard.phoneNumber.replace(/\s+/g, '')}`}
                        className="shrink-0 px-2.5 py-1.5 rounded-lg bg-[#00796B] text-white font-bold hover:bg-[#00695C] transition inline-flex items-center gap-1 shadow-xs"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-teal-200" />
                        <span>{currentWard.phoneNumber}</span>
                      </a>
                    </div>
                  )}

                  {/* RESIDENCE / POLICE ROUTING BUTTON: When query touches residence/VNeID */}
                  {(msg.text.includes('Công an cấp xã') || msg.text.includes('VNeID')) && (
                    <div className="mt-2 pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
                      <span className="text-xs text-[#00796B] font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" />
                        Cổng Dịch vụ công Cư trú
                      </span>
                      <a
                        href="https://dichvucong.bocongan.gov.vn/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-bold transition shadow-xs"
                      >
                        <span>Mở Cổng Bộ Công An</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* INCIDENT ROUTING BUTTON: When citizen asks about road/infrastructure incidents */}
                  {msg.sender === 'bot' && msg.text.includes('Báo Sự Cố Hiện Trường') && (
                    <div className="mt-2 pt-2.5 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-[#B45309] font-bold flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#D97706]" />
                        Tự động định vị & chuyển về đúng UBND Xã/Phường
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate('/citizen/form#incident')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Mở Trang Báo Sự Cố Ngay</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Bot Interactive Action Dock & Citations */}
                  {msg.sender === 'bot' && (
                    <div className="mt-2.5 pt-2 border-t border-teal-100 flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
                      {/* Clean Timestamp */}
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#00796B]">
                        <Clock className="w-3.5 h-3.5 text-[#00796B]" />
                        {msg.timestamp}
                      </span>

                      {/* Action Buttons: Citations (if present), TTS & Copy */}
                      <div className="flex items-center gap-2">
                        {/* Legal Citations Drawer Button */}
                        {msg.ragData?.citations && msg.ragData.citations.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveCitation(msg.ragData!.citations[0])}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#00796B] text-xs font-semibold transition active:scale-95 cursor-pointer shadow-2xs border border-teal-200"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Căn cứ pháp lý ({msg.ragData.citations.length})</span>
                          </button>
                        )}

                        {/* Text-To-Speech Button (2 Chế độ Rõ Ràng: MỞ & TẮT để nghe và tắt khi cần) */}
                        <button
                          type="button"
                          onClick={() => toggleSpeech(msg.text, msg.id)}
                          className={`group inline-flex items-center gap-1.5 font-bold text-xs px-2.5 py-1.5 rounded-xl border transition-all duration-150 cursor-pointer shadow-2xs select-none active:scale-95 ${
                            speakingId === msg.id
                              ? 'bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5] ring-2 ring-[#FECACA]'
                              : 'bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#00796B] border-[#99F6E4]'
                          }`}
                          title={
                            speakingId === msg.id
                              ? 'Chế độ: ĐANG MỞ ĐỌC. Bấm vào để TẮT ngay'
                              : 'Chế độ: ĐANG TẮT. Bấm vào để MỞ nghe đọc to bằng giọng nói tiếng Việt'
                          }
                          aria-label={
                            speakingId === msg.id
                              ? 'Tắt nghe đọc to'
                              : 'Mở nghe đọc to'
                          }
                        >
                          {speakingId === msg.id ? (
                            <>
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DC2626]"></span>
                              </span>
                              <VolumeX className="w-3.5 h-3.5 text-[#DC2626]" />
                              <span className="font-extrabold text-[#B91C1C]">Đang đọc...</span>
                              <span className="ml-0.5 px-2 py-0.5 rounded-md bg-[#DC2626] text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                TẮT
                              </span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-[#00796B] group-hover:scale-110 transition-transform" />
                              <span>Nghe đọc to</span>
                              <span className="ml-0.5 px-2 py-0.5 rounded-md bg-[#00796B] text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                MỞ
                              </span>
                            </>
                          )}
                        </button>

                        {/* Copy to clipboard */}
                        <button
                          type="button"
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          className="hover:text-[#00796B] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 active:scale-90 transition font-medium cursor-pointer"
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
                  )}
                </div>

                {msg.sender === 'citizen' && (
                  <div className="w-9 h-9 rounded-full bg-teal-100 text-[#00796B] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
            ))}

            {/* Staggered Typing Indicator */}
            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#00796B] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-5 h-5 text-teal-100 animate-pulse" />
                </div>
                <div className="bg-white border border-teal-100 rounded-2xl rounded-bl-xs px-4 py-3 shadow-xs flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-slate-700 font-medium">Cán bộ AI đang tra cứu văn bản pháp lý...</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#00796B] animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 rounded-full bg-[#26A69A] animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 rounded-full bg-[#80CBC4] animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} className="h-6 shrink-0" />
          </div>

          {/* Quick Prompts Carousel Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 uppercase shrink-0">Hỏi nhanh:</span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(p.q)}
                className="shrink-0 px-3 py-1.5 rounded-full bg-white hover:bg-teal-50 text-[#00796B] text-xs font-semibold border border-teal-200 transition active:scale-95 shadow-2xs cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Interactive Chat Input Dock with Large Accessible Buttons */}
          <div className="p-3.5 bg-white border-t border-slate-200">
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
                title="Bấm để nói câu hỏi (Nhận diện giọng nói tiếng Việt)"
                className={`p-3 rounded-xl border transition-all active:scale-90 cursor-pointer min-h-[46px] min-w-[46px] flex items-center justify-center ${
                  isMicActive
                    ? 'bg-[#DC2626] text-white border-[#DC2626] animate-pulse'
                    : 'bg-[#F8FAFC] hover:bg-teal-50 text-[#00796B] border-slate-200'
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
                  className="w-full h-12 pl-4 pr-10 rounded-xl bg-[#F8FAFC] border border-slate-200 focus:border-[#00796B] focus:bg-white text-sm sm:text-base text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00796B]/15 transition-all"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Primary Send Button in Solid Teal */}
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="h-12 px-5 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-white font-bold text-sm shadow-xs hover:shadow-md disabled:opacity-40 disabled:hover:bg-[#00796B] disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shrink-0 active:scale-95 cursor-pointer"
              >
                <span className="hidden sm:inline">Gửi</span>
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
                <BookOpen className="w-5 h-5 text-[#00796B]" />
                <h3 className="font-bold text-sm sm:text-base text-[#00796B]">
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
                <p className="p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs sm:text-sm text-[#0F172A] leading-relaxed mt-1">
                  "{activeCitation.content}"
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
                <span>Nguồn: Bộ thủ tục hành chính công cấp xã</span>
                <span className="font-semibold text-[#0F766E]">
                  UBND {currentWard.name}
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveCitation(null)}
              className="w-full py-2.5 bg-[#00796B] hover:bg-[#00695C] text-white text-xs sm:text-sm font-bold rounded-xl transition active:scale-95 cursor-pointer shadow-xs"
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
