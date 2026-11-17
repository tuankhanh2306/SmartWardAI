import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { askLegalRag, submitRagFeedback, type RagResponse, type LegalCitation } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useWard } from '../context/WardContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { useVoiceInput } from '../hooks/useVoiceInput';
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
  MicOff,
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
  Phone,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  FileText,
  Scale,
  Building2,
  ClipboardList,
  Users,
  HeartHandshake,
  Stamp,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Eye,
  Info
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'citizen' | 'bot';
  text: string;
  userQuestion?: string;
  ragData?: RagResponse;
  measuredLatencyMs?: number;
  timestamp: string;
  suggestions?: string[];
  feedbackSent?: 'useful' | 'not-useful';
}

interface StructuredBotMessageProps {
  msg: ChatMessage;
  isSimpleMode: boolean;
  onOpenCitation: (citation: LegalCitation) => void;
}

interface ParsedSection {
  id: number;
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
  lines: string[];
}

/**
 * Xác định mục thủ tục cụ thể mà công dân đang trực tiếp hỏi để mở đúng accordion đó,
 * còn toàn bộ 5 mục còn lại mặc định ĐÓNG (P2 - Giảm tải nhận thức).
 */
function detectRequestedSectionId(questionText?: string): number | null {
  if (!questionText) return null;
  const q = questionText.toLowerCase();
  if (/(lệ phí|mức phí|bao nhiêu tiền|mất tiền|thời hạn|mất bao lâu|bao nhiêu ngày|mấy ngày|trả kết quả)/i.test(q)) {
    return 3;
  }
  if (/(nơi nộp|nộp ở đâu|làm ở đâu|địa chỉ|chỗ nào|bộ phận một cửa|quầy nào)/i.test(q)) {
    return 4;
  }
  if (/(căn cứ|luật nào|nghị định|thông tư|quyết định|quy định nào)/i.test(q)) {
    return 5;
  }
  if (/(hồ sơ cần|cần giấy tờ gì|giấy tờ gì|mang theo gì|thành phần hồ sơ)/i.test(q)) {
    return 2;
  }
  return null;
}

const StructuredBotMessage: React.FC<StructuredBotMessageProps> = ({
  msg,
  isSimpleMode,
  onOpenCitation,
}) => {
  const requestedSectionId = useMemo(() => detectRequestedSectionId(msg.userQuestion), [msg.userQuestion]);
  const [detailExpanded, setDetailExpanded] = useState<boolean>(() => requestedSectionId !== null);
  const [openSections, setOpenSections] = useState<Set<number>>(() =>
    requestedSectionId !== null ? new Set([requestedSectionId]) : new Set()
  );
  const [currentStep, setCurrentStep] = useState<number>(0);
  const accordionTriggerRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const { parsedSections, preambleLines, primaryCode, primaryTitle } = useMemo(() => {
    const rawLines = msg.text.split('\n');
    const sections: ParsedSection[] = [];
    const preamble: string[] = [];

    const matchDef = (lineStr: string) => {
      const t = lineStr.trim();
      if (/^1\.\s*TÓM\s*TẮT\s*THỦ\s*TỤC/i.test(t)) {
        return { id: 1, title: '1. TÓM TẮT THỦ TỤC', Icon: ClipboardList, badgeColor: 'bg-[#F8FAFC] text-[#0F2942] border-[#CBD5E1]' };
      }
      if (/^2\.\s*THÀNH\s*PHẦN\s*HỒ\s*SƠ/i.test(t)) {
        return { id: 2, title: '2. THÀNH PHẦN HỒ SƠ CẦN CHUẨN BỊ', Icon: FileText, badgeColor: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]' };
      }
      if (/^3\.\s*THỜI\s*HẠN\s*GIẢI\s*QUYẾT/i.test(t)) {
        return { id: 3, title: '3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ', Icon: Clock, badgeColor: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]' };
      }
      if (/^4\.\s*NƠI\s*TIẾP\s*NHẬN/i.test(t)) {
        return { id: 4, title: '4. NƠI TIẾP NHẬN & GIẢI QUYẾT', Icon: Building2, badgeColor: 'bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]' };
      }
      if (/^5\.\s*CĂN\s*CỨ\s*PHÁP\s*LÝ/i.test(t)) {
        return { id: 5, title: '5. CĂN CỨ PHÁP LÝ & LƯU Ý QUAN TRỌNG', Icon: Scale, badgeColor: 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1]' };
      }
      return null;
    };

    let activeSection: ParsedSection | null = null;

    for (const rawLine of rawLines) {
      const matched = matchDef(rawLine);
      if (matched) {
        activeSection = {
          id: matched.id,
          title: matched.title,
          Icon: matched.Icon,
          badgeColor: matched.badgeColor,
          lines: [],
        };
        sections.push(activeSection);
        const rest = rawLine.replace(/^[\d.]+\s*[^:]+:\s*/i, '').trim();
        if (rest) {
          activeSection.lines.push(rest);
        }
      } else if (activeSection) {
        activeSection.lines.push(rawLine);
      } else {
        preamble.push(rawLine);
      }
    }

    // Determine primary procedure code & title
    const pCode =
      msg.ragData?.citations?.[0]?.procedureCode ||
      msg.text.match(/\[(TTHC-[A-Za-z0-9_\-]+)\]/)?.[1] ||
      '';

    let pTitle = msg.ragData?.citations?.[0]?.title || '';
    if (!pTitle && sections.length > 0 && sections[0].lines.length > 0) {
      const firstLine = sections[0].lines.find((l) => l.trim().length > 0) || '';
      const match = firstLine.match(/Thủ tục\s+([^,.]+?)(?:\s+\(|\s+được|\s+tại|$)/i);
      if (match) {
        pTitle = `Thủ tục ${match[1].trim()}`;
      }
    }

    return {
      parsedSections: sections,
      preambleLines: preamble,
      primaryCode: pCode,
      primaryTitle: pTitle,
    };
  }, [msg]);

  const renderTextWithCitations = (lineStr: string) => {
    const parts = lineStr.split(/(\[[A-Za-z0-9_\-]+\]|\*\*[^*]+\*\*)/g);
    return parts.map((part, pIdx) => {
      const match = part.match(/^\[([A-Za-z0-9_\-]+)\]$/);
      if (match) {
        const code = match[1];
        if (isSimpleMode) {
          return null;
        }
        return (
          <button
            key={pIdx}
            type="button"
            onClick={() => {
              const found = msg.ragData?.citations.find(
                (c) => c.chunkCode.toUpperCase() === code.toUpperCase() || c.procedureCode.toUpperCase() === code.toUpperCase()
              );
              if (found) {
                onOpenCitation(found);
              } else if (msg.ragData?.citations && msg.ragData.citations.length > 0) {
                onOpenCitation(msg.ragData.citations[0]);
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

  const renderLine = (lineStr: string, idx: number) => {
    const stripped = isSimpleMode
      ? lineStr.replace(/\s*\[[A-Za-z0-9_\-]+\]/g, '')
      : lineStr.replace(/\s*\[TTHC-[A-Za-z0-9_\-]+\]/g, '');
    const trimmed = stripped.trim();

    if (trimmed.startsWith('*Lưu ý:') || trimmed.startsWith('Lưu ý:')) {
      return (
        <div key={idx} className="mt-2.5 p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed italic">{renderTextWithCitations(trimmed.replace(/^\*+|\*+$/g, ''))}</div>
        </div>
      );
    }

    if (trimmed.startsWith('•') || trimmed.startsWith('- ')) {
      const content = trimmed.replace(/^[•\-]\s*/, '');
      return (
        <div key={idx} className="flex items-start gap-2.5 py-1 px-2 rounded-lg bg-slate-50/60 hover:bg-slate-50/90 border border-slate-100 transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00796B] shrink-0 mt-2" />
          <div className="leading-relaxed text-[#1E293B] flex-1 text-sm sm:text-base">
            {renderTextWithCitations(content)}
          </div>
        </div>
      );
    }

    if (!trimmed) {
      return <div key={idx} className="h-0.5" />;
    }

    return (
      <p key={idx} className="pl-1 leading-relaxed text-[#1E293B] text-sm sm:text-base">
        {renderTextWithCitations(stripped)}
      </p>
    );
  };

  // If not structured into multiple sections, render standard markdown lines
  if (parsedSections.length === 0) {
    return (
      <div className="flex flex-col gap-2.5 text-sm md:text-base leading-relaxed text-[#0F172A]">
        {msg.text.split('\n').map((line, lIdx) => renderLine(line, lIdx))}
      </div>
    );
  }

  // BƯỚC 5: Chế độ đơn giản (Wizard xem từng bước cho người cao tuổi)
  if (isSimpleMode) {
    const validStep = Math.min(Math.max(0, currentStep), parsedSections.length - 1);
    const activeSection = parsedSections[validStep];
    const ActiveIcon = activeSection.Icon;

    return (
      <div className="flex flex-col gap-3 text-base sm:text-lg leading-relaxed text-[#0F172A]">
        {/* Header thân thiện, không có mã kỹ thuật */}
        {primaryTitle && (
          <div className="pb-2.5 border-b border-amber-200">
            <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 leading-snug">
              {primaryTitle}
            </h3>
          </div>
        )}

        {/* Wizard Step Indicator Card */}
        <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-amber-950 mb-2">
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-amber-800" />
              <span>Chế độ đơn giản — Mục {validStep + 1} / {parsedSections.length}</span>
            </span>
            <span className="text-xs font-semibold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-md border border-amber-200">
              {activeSection.title}
            </span>
          </div>
          <div className="w-full h-2.5 bg-amber-200/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00796B] transition-all duration-300"
              style={{ width: `${((validStep + 1) / parsedSections.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Active Step Content */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs flex flex-col gap-3 min-h-[140px]">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold border ${activeSection.badgeColor} w-fit`}>
            <ActiveIcon className="w-4 h-4 shrink-0" />
            <span>{activeSection.title}</span>
          </div>
          <div className="flex flex-col gap-2.5 pt-1">
            {activeSection.lines.map((l, lIdx) => renderLine(l, lIdx))}
          </div>
        </div>

        {/* Wizard Navigation Controls */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={validStep === 0}
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition cursor-pointer ${
              validStep === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs active:scale-95'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Mục trước</span>
          </button>

          {validStep < parsedSections.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(parsedSections.length - 1, prev + 1))}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-[#00796B] hover:bg-[#00695C] text-white flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer"
            >
              <span>Xem mục tiếp theo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Đã xem đủ các mục</span>
            </span>
          )}
        </div>
      </div>
    );
  }

  // P2: Giảm mật độ mặc định — chỉ hiện tóm tắt + nguồn rút gọn + 1 vùng "Xem chi tiết" thu gọn;
  // 5 mục accordion mặc định ĐÓNG (trừ mục công dân trực tiếp hỏi).
  const detailRegionId = `detail-region-${msg.id}`;
  const citations = msg.ragData?.citations || [];
  const accordionSections = parsedSections.length > 1 ? parsedSections : [];

  const handleAccordionKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const total = accordionSections.length;
    if (total === 0) return;
    let nextIdx: number | null = null;
    if (e.key === 'ArrowDown') nextIdx = (idx + 1) % total;
    else if (e.key === 'ArrowUp') nextIdx = (idx - 1 + total) % total;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = total - 1;

    if (nextIdx !== null) {
      e.preventDefault();
      accordionTriggerRefs.current[nextIdx]?.focus();
    }
  };

  return (
    <div className="flex flex-col gap-2.5 text-sm md:text-base leading-relaxed text-[#0F172A]">
      {/* Header duy nhất của thủ tục */}
      {(primaryCode || primaryTitle) && (
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200/80">
          {primaryCode && (
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold font-mono bg-teal-50 text-[#00695C] border border-teal-200">
              {primaryCode}
            </span>
          )}
          {primaryTitle && (
            <h3 className="font-semibold text-sm sm:text-base text-[#0F172A]">
              {primaryTitle}
            </h3>
          )}
        </div>
      )}

      {/* Phần trả lời tóm tắt trực tiếp (2-3 câu ngắn gọn) */}
      {preambleLines.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {preambleLines.map((l, lIdx) => renderLine(l, lIdx))}
        </div>
      )}
      {parsedSections.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {parsedSections[0].lines.slice(0, 3).map((l, lIdx) => renderLine(l, lIdx))}
        </div>
      )}

      {/* Nguồn căn cứ pháp lý rút gọn */}
      {citations.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-medium text-slate-600">Nguồn:</span>
          {citations.slice(0, 2).map((cit, cIdx) => (
            <button
              key={`${cit.chunkCode}-${cIdx}`}
              type="button"
              onClick={() => onOpenCitation(cit)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 hover:bg-teal-50 text-[#00695C] border border-slate-200 hover:border-teal-300 transition-colors cursor-pointer gov-focus-ring"
            >
              <BookOpen className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[240px] sm:max-w-[340px]">
                {cit.legalReference || cit.procedureCode}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 1 vùng "Xem chi tiết" thu gọn mặc định (tự mở nếu hỏi đúng mục 2-5) */}
      {accordionSections.length > 0 && (
        <div className="pt-1.5">
          <button
            type="button"
            aria-expanded={detailExpanded}
            aria-controls={detailRegionId}
            onClick={() => setDetailExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-50 hover:bg-teal-50 text-[#00695C] text-xs font-semibold border border-slate-200 hover:border-teal-300 transition-colors cursor-pointer gov-focus-ring"
          >
            {detailExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>
              {detailExpanded
                ? 'Thu gọn chi tiết thủ tục'
                : `Xem chi tiết (${accordionSections.length} mục: Hồ sơ, Thời hạn, Lệ phí, Nơi nộp)`}
            </span>
          </button>

          {detailExpanded && (
            <div id={detailRegionId} className="mt-2.5 flex flex-col gap-2">
              {accordionSections.map((section, idx) => {
                const isOpen = openSections.has(section.id);
                const HeaderIcon = section.Icon;
                const triggerId = `accordion-trigger-${msg.id}-${section.id}`;
                const panelId = `accordion-panel-${msg.id}-${section.id}`;
                return (
                  <div key={section.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <button
                      ref={(el) => {
                        accordionTriggerRefs.current[idx] = el;
                      }}
                      id={triggerId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onKeyDown={(e) => handleAccordionKeyDown(e, idx)}
                      onClick={() => {
                        setOpenSections((prev) => {
                          const next = new Set(prev);
                          if (next.has(section.id)) {
                            next.delete(section.id);
                          } else {
                            next.add(section.id);
                          }
                          return next;
                        });
                      }}
                      className="w-full flex items-center justify-between py-2.5 px-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer select-none gov-focus-ring"
                    >
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border ${section.badgeColor}`}>
                        <HeaderIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{section.title}</span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-700 text-xs font-medium shrink-0 ml-2">
                        <span>{isOpen ? 'Thu gọn' : 'Mở'}</span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-700" /> : <ChevronDown className="w-4 h-4 text-slate-700" />}
                      </span>
                    </button>
                    {isOpen && (
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={triggerId}
                        className="p-3 border-t border-slate-200/80 flex flex-col gap-2 bg-white"
                      >
                        {section.lines.map((l, lIdx) => renderLine(l, lIdx))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const CitizenPortal: React.FC = () => {
  const navigate = useNavigate();
  const { currentWard, isOfficeOpen, officeStatusLabel } = useWard();
  const {
    isAudioAutoPlay,
    setIsAudioAutoPlay,
    isSimpleMode,
    setIsSimpleMode,
    textScale,
    setTextScale,
  } = useAccessibility();
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const latestBotMsgRef = useRef<HTMLDivElement>(null);
  const citationModalRef = useRef<HTMLDivElement>(null);
  const citationCloseBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<LegalCitation | null>(null);
  const [isChatExpanded, setIsChatExpanded] = useState<boolean>(false);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);

  // Focus Trap & Escape key handling for Citation Drawer / Dialog (WCAG 2.1 AA)
  useEffect(() => {
    if (!activeCitation) {
      previousFocusRef.current?.focus?.();
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const focusTimer = setTimeout(() => {
      citationCloseBtnRef.current?.focus();
    }, 30);

    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setActiveCitation(null);
        return;
      }
      if (e.key === 'Tab' && citationModalRef.current) {
        const focusables = citationModalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleModalKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleModalKeyDown);
    };
  }, [activeCitation]);

  // Speech-to-Text 2-Way Voice Input Hook (Web Speech API)
  const {
    isListening: isVoiceListening,
    interimText: voiceInterimText,
    voiceError,
    startListening: startVoiceInput,
    stopListening: stopVoiceInput,
    clearVoiceError,
  } = useVoiceInput((finalText) => {
    // KHÔNG tự động gửi ngay — điền vào ô input để dân xem lại, tự bấm Gửi
    setQuery((prev) => (prev ? `${prev} ${finalText}` : finalText));
  });

  // Scroll listener to detect when user has scrolled away from bottom
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Show quick scroll-to-bottom button when user scrolls up > 120px
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBottom(!isNearBottom);
  }, []);

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

  // Index of latest bot message for smart top-anchored scrolling
  const latestBotIdx = useMemo(() => {
    return messages.map((m) => m.sender).lastIndexOf('bot');
  }, [messages]);

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

  // Smart Auto Scroll (khóa phạm vi bên trong khung chat, không đẩy trang ngoài xuống dưới fixed Header)
  useEffect(() => {
    const timer = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      if (loading) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.sender === 'bot' && latestBotMsgRef.current) {
          const topOffset = Math.max(0, latestBotMsgRef.current.offsetTop - 12);
          container.scrollTo({ top: topOffset, behavior: 'smooth' });
        } else {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
      }
    }, 120);
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

      const reqStart = performance.now();
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
      const elapsedMs = Math.round(performance.now() - reqStart);

      const botMsgId = `msg-${Date.now()}-bot`;
      const fallbackAnswer = `Dạ, đối với thủ tục này tại ${currentWard.name}, bà con có thể chọn các gợi ý bên dưới hoặc liên hệ trực tiếp Bộ phận Một cửa qua số điện thoại ${currentWard.phoneNumber} để được hướng dẫn chi tiết.`;
      const botMsg: ChatMessage = {
        id: botMsgId,
        sender: 'bot',
        text: resp?.answer || fallbackAnswer,
        userQuestion: q,
        ragData: resp,
        measuredLatencyMs: resp?.answer && elapsedMs > 0 ? elapsedMs : undefined,
        suggestions: (resp?.suggestions || ['Hồ sơ cần những gì?', 'Lệ phí bao nhiêu?', 'Thời hạn giải quyết?']).slice(0, 3),
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);

      // Auto-play audio if enabled by user (for elderly citizens)
      if (isAudioAutoPlay && resp?.answer) {
        setTimeout(() => {
          toggleSpeech(resp.answer, botMsgId);
        }, 300);
      }
    } catch (err) {
      console.warn('CitizenPortal RAG fallback activated:', err);
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

  // BƯỚC 4: Gợi ý nhanh 2-3 nút theo ngữ cảnh câu vừa hỏi (thay vì cố định 5 nút)
  const contextualPrompts = useMemo(() => {
    // 1. Tìm tin nhắn bot gần nhất
    const lastBotMsg = [...messages].reverse().find((m) => m.sender === 'bot');

    // 2. Nếu có tin nhắn bot gần nhất và có suggestions
    if (lastBotMsg && lastBotMsg.suggestions && lastBotMsg.suggestions.length > 0) {
      const limit = isSimpleMode ? 2 : 3;
      return lastBotMsg.suggestions.slice(0, limit).map((sug) => {
        const clean = sug.replace(/^[👉👶💍🏠📋\s]+/, '').trim();
        return {
          label: clean,
          q: `Hướng dẫn thủ tục ${clean} tại UBND ${currentWard.name}`,
        };
      });
    }

    // 3. Nếu tin nhắn bot gần nhất có citations về một thủ tục cụ thể
    if (lastBotMsg && lastBotMsg.ragData?.citations && lastBotMsg.ragData.citations.length > 0) {
      const code = lastBotMsg.ragData.citations[0].procedureCode;
      const limit = isSimpleMode ? 2 : 3;
      if (code === 'TTHC-HT-01') {
        return [
          { label: 'Nhập hộ khẩu cho con', q: `Thủ tục nhập khẩu (thường trú) cho con mới sinh tại UBND ${currentWard.name} cần giấy tờ gì?` },
          { label: 'Trích lục khai sinh', q: `Làm sao để xin cấp lại bản sao trích lục giấy khai sinh tại UBND ${currentWard.name}?` },
          { label: 'Đăng ký kết hôn', q: `Hồ sơ đăng ký kết hôn tại UBND ${currentWard.name} gồm những gì?` },
        ].slice(0, limit);
      }
      if (code === 'TTHC-HT-02') {
        return [
          { label: 'Giấy chứng nhận độc thân', q: `Xin cấp Giấy xác nhận tình trạng hôn nhân tại ${currentWard.name} mất bao lâu?` },
          { label: 'Đăng ký khai sinh', q: `Đăng ký khai sinh cho con tại UBND ${currentWard.name} cần giấy gì?` },
          { label: 'Chứng thực bản sao', q: `Chứng thực bản sao giấy tờ tại UBND ${currentWard.name}` },
        ].slice(0, limit);
      }
      if (code.startsWith('TTHC-CR-')) {
        return [
          { label: 'Đăng ký tạm trú', q: `Thủ tục đăng ký tạm trú tại ${currentWard.name} cần hồ sơ gì?` },
          { label: 'Xác nhận cư trú (CT07)', q: `Xin cấp giấy xác nhận thông tin cư trú CT07 tại ${currentWard.name}` },
          { label: 'Khai báo tạm vắng', q: `Khai báo tạm vắng khi đi làm ăn xa tại ${currentWard.name}` },
        ].slice(0, limit);
      }
      if (code.startsWith('TTHC-BT-')) {
        return [
          { label: 'Tiền trợ cấp hàng tháng', q: `Mức chi trả trợ cấp bảo trợ xã hội hàng tháng tại ${currentWard.name} là bao nhiêu?` },
          { label: 'Hỗ trợ mai táng phí', q: `Hồ sơ đề nghị hỗ trợ chi phí mai táng cho đối tượng bảo trợ xã hội` },
          { label: 'Hồ sơ người khuyết tật', q: `Hồ sơ xác định mức độ khuyết tật tại UBND ${currentWard.name}` },
        ].slice(0, limit);
      }
    }

    // 4. Trạng thái khởi đầu (chưa chat hoặc câu chào): 3 gợi ý phổ biến (2 nút trong Chế độ đơn giản)
    const basePrompts = [
      { label: 'Đăng ký khai sinh', q: `Tôi muốn làm thủ tục đăng ký khai sinh cho cháu mới sinh tại ${currentWard.name} cần giấy tờ gì và mất bao lâu?` },
      { label: 'Đăng ký kết hôn', q: `Thủ tục đăng ký kết hôn tại UBND ${currentWard.name} cần hai bên chuẩn bị hồ sơ gì và lệ phí bao nhiêu?` },
      { label: 'Trợ cấp người cao tuổi', q: 'Hồ sơ và điều kiện hưởng trợ cấp xã hội hằng tháng cho người cao tuổi, người khuyết tật gồm những gì?' },
    ];
    return basePrompts.slice(0, isSimpleMode ? 2 : 3);
  }, [messages, isSimpleMode, currentWard.name]);

  const quickPrompts = contextualPrompts;

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

  return (
    <div className="flex flex-col w-full pb-2 lg:pb-8 bg-uth-canvas bg-uth-watermark min-h-0 lg:min-h-[calc(100dvh-4rem)]">
      {/* SINGLE-LINE CIVIC STATUS STRIP (Compact on mobile so composer clears the fixed bottom nav) */}
      <section className="w-full bg-white px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2.5 border-b border-slate-200">
        <div className="max-w-[98vw] 2xl:max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-xs">
          {/* Left: Real-Time Working Hours Status + Office Address + Hotline */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[#475569]">
            <span
              className={`inline-flex items-center gap-1.5 font-semibold px-2 sm:px-2.5 py-0.5 rounded-md ${
                isOfficeOpen
                  ? 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]'
                  : 'bg-[#FEFCE8] text-[#854D0E] border border-[#FEF08A]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${isOfficeOpen ? 'bg-[#16A34A]' : 'bg-[#CA8A04]'}`} />
              <span className="sm:hidden">{isOfficeOpen ? 'Trong giờ • Trực' : 'Ngoài giờ • AI 24/7'}</span>
              <span className="hidden sm:inline">{officeStatusLabel}</span>
            </span>

            <span className="hidden md:inline text-[#CBD5E1]">|</span>

            <span className="hidden md:flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#00796B] shrink-0" />
              <span>Trụ sở: <strong className="text-[#0F172A]">{currentWard.officeAddress}</strong></span>
            </span>

            <span className="hidden sm:inline text-[#CBD5E1]">|</span>

            <span className="hidden sm:flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-[#00796B] shrink-0" />
              <span>Đường dây nóng: <strong className="text-[#00695C] font-mono">{currentWard.phoneNumber}</strong></span>
            </span>

            <span className="hidden xl:inline text-[#CBD5E1]">|</span>

            <span className="hidden xl:flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#00796B] shrink-0" />
              <span>{currentWard.workingHours}</span>
            </span>
          </div>

          {/* Right: Accessibility Audio Read Toggle */}
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
              className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer shadow-2xs gov-focus-ring ${
                isAudioAutoPlay
                  ? 'bg-[#00796B] text-white border-[#00695C] shadow-xs'
                  : 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]'
              }`}
              title="Bật hoặc Tắt chế độ tự động đọc câu trả lời bằng giọng nói cho người lớn tuổi"
            >
              {isAudioAutoPlay ? (
                <Volume2 className="w-3.5 h-3.5 text-white" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span className="hidden sm:inline">Tự động đọc:</span>
              <span className="sm:hidden">Đọc:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  isAudioAutoPlay ? 'bg-white text-[#004D40]' : 'bg-[#E2E8F0] text-[#334155]'
                }`}
              >
                {isAudioAutoPlay ? 'MỞ' : 'TẮT'}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* MOBILE RESPONSIVE SEGMENTED SWITCHER (< lg screens; ẩn hoàn toàn trong Chế độ đơn giản) */}
      {!isSimpleMode && (
        <div className="lg:hidden max-w-[98vw] 2xl:max-w-[1920px] mx-auto w-full px-3 mt-2">
          <div className="flex rounded-lg bg-[#E2E8F0]/80 p-1 border border-[#CBD5E1]">
            <button
              type="button"
              onClick={() => setMobileTab('chat')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer gov-focus-ring ${
                mobileTab === 'chat'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Hỏi Đáp AI</span>
              {messages.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#0F2942] text-white text-[10px] flex items-center justify-center font-bold">
                  {messages.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('catalog')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer gov-focus-ring ${
                mobileTab === 'catalog'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>40 Thủ Tục</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN INTERACTIVE WORKSPACE */}
      <div
        className={`mx-auto px-2 sm:px-4 lg:px-6 transition-all duration-300 w-full ${
          isChatExpanded
            ? 'max-w-full 2xl:max-w-[2100px] mt-2'
            : 'max-w-[99vw] 2xl:max-w-[2100px] mt-2 sm:mt-3'
        } flex flex-col lg:flex-row gap-3.5 lg:gap-4 xl:gap-5 lg:items-stretch`}
      >
        {/* LEFT COLUMN: Cột danh mục 40 TTHC — ẩn mặc định trên mobile và khi ở Chế độ đơn giản */}
        <div
          className={`${
            isChatExpanded || isSimpleMode
              ? 'hidden'
              : `w-full lg:w-[270px] xl:w-[290px] 2xl:w-[310px] shrink-0 flex-col justify-between gap-3 h-[calc(100dvh-13.5rem)] min-h-[380px] lg:h-[calc(100vh-132px)] lg:min-h-[560px] lg:max-h-[90vh] ${
                  mobileTab === 'catalog' ? 'flex' : 'hidden lg:flex'
                }`
          }`}
        >
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            {/* Dedicated Link Banner to Dedicated 40 Procedures Page */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00796B] border border-teal-200 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-[#0F172A] truncate">Danh Mục 40 Thủ Tục</h4>
                  <p className="text-[11px] text-slate-600 truncate">Văn bản mẫu A4 & thời hạn</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/citizen/procedures')}
                className="w-full py-1.5 px-3 rounded-md bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs gov-focus-ring"
              >
                <span>Mở Trang Thủ Tục Riêng</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Header: 4 Thủ Tục Trọng Tâm */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#00796B]" />
                <h3 className="text-xs font-semibold text-[#0F172A]">
                  Thủ tục thường gặp
                </h3>
              </div>
              <span className="text-[11px] text-slate-600 font-medium">Bấm hỏi ngay</span>
            </div>

            {/* Bento Cards Scrollable Container (Accessible focusable buttons) */}
            <div
              tabIndex={0}
              role="region"
              aria-label="Danh sách thủ tục thường gặp"
              className="flex flex-col gap-2.5 overflow-y-auto pr-0.5 flex-1 gov-focus-ring rounded-lg"
            >
              {bentoCards.map((card) => {
                const CardIcon = card.IconComponent;
                return (
                  <button
                    key={card.code}
                    type="button"
                    onClick={() => handleAsk(card.prompt)}
                    className="group relative text-left p-3 rounded-lg bg-white border border-slate-200 hover:border-[#00796B] shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer flex flex-col justify-between gap-1.5 shrink-0 gov-focus-ring"
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-[#00796B] group-hover:bg-[#00796B] group-hover:text-white transition-colors shrink-0">
                          <CardIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border truncate ${card.badgeColor}`}>
                          {card.badge}
                        </span>
                      </div>

                      <div className="w-6 h-6 rounded-md bg-slate-50 group-hover:bg-[#00796B] text-slate-600 group-hover:text-white flex items-center justify-center transition-all duration-150 border border-slate-200 shrink-0">
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    <div className="w-full">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-[#00695C] transition-colors leading-snug line-clamp-1">
                        {card.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
                        {card.description}
                      </p>
                    </div>

                    <div className="w-full pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                      <span className="flex items-center gap-1 font-medium text-[10px]">
                        <Clock className="w-3 h-3 text-[#00796B]" />
                        {card.time}
                      </span>
                      <span className="font-semibold text-[#00695C] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 text-[10px]">
                        {card.fee}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Guidance Box */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2 shrink-0">
            <HelpCircle className="w-4 h-4 text-[#00796B] shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-800 leading-snug">
              <strong>Tiếp dân Một cửa:</strong> UBND {currentWard.name}. ĐT: <strong>{currentWard.phoneNumber}</strong>.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Legal RAG Chat Workspace */}
        <div
          className={`lg:flex-1 min-w-0 w-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-300 relative ${
            isChatExpanded
              ? 'h-[calc(100dvh-14rem)] md:h-[calc(100dvh-15rem)] lg:h-[calc(100vh-110px)] min-h-[340px] lg:min-h-[640px] max-h-[95vh]'
              : 'h-[calc(100dvh-15.5rem)] sm:h-[calc(100dvh-18.5rem)] lg:h-[calc(100vh-132px)] min-h-[340px] lg:min-h-[560px] max-h-[90vh]'
          } ${!isSimpleMode && mobileTab === 'catalog' ? 'hidden lg:flex' : 'flex'}`}
        >
          {/* Chat Workspace Header */}
          <div className="px-4 sm:px-5 py-3 bg-[#00796B] text-white flex items-center justify-between border-b border-[#004D40] shrink-0 gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#005B4F] flex items-center justify-center text-white border border-white/25 shrink-0">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm sm:text-base font-semibold tracking-tight truncate">Trợ Lý Pháp Lý Một Cửa</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-300 shrink-0" />
                  {isChatExpanded && (
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#004D40] text-white border border-white/20">
                      Toàn màn hình
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-teal-50 truncate">
                  Tra cứu 40 TTHC UBND {currentWard.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Nút Chế độ đơn giản */}
              <button
                type="button"
                onClick={() => {
                  const next = !isSimpleMode;
                  setIsSimpleMode(next);
                  if (next && textScale === 'normal') {
                    setTextScale('large');
                  }
                  if (next && mobileTab !== 'chat') {
                    setMobileTab('chat');
                  }
                }}
                title="Bật hoặc Tắt chế độ giao diện đơn giản, chữ to cho người cao tuổi"
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer gov-focus-ring ${
                  isSimpleMode
                    ? 'bg-amber-400 text-slate-900 border border-amber-300 font-bold'
                    : 'bg-[#005B4F] hover:bg-[#004D40] text-white border border-white/25'
                }`}
              >
                {isSimpleMode ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-slate-900" />
                    <span className="font-bold">Đơn giản: BẬT</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-white" />
                    <span className="sr-only sm:not-sr-only">Giao diện đơn giản</span>
                  </>
                )}
              </button>

              {/* Nút Phóng to / Thu nhỏ */}
              <button
                type="button"
                onClick={() => setIsChatExpanded((prev) => !prev)}
                title={isChatExpanded ? 'Thu nhỏ khung chat về mặc định' : 'Phóng to khung chat toàn màn hình'}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer gov-focus-ring border border-white/25 ${
                  isChatExpanded
                    ? 'bg-[#004D40] text-white ring-1 ring-white/40'
                    : 'bg-[#005B4F] hover:bg-[#004D40] text-white'
                }`}
              >
                {isChatExpanded ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-white" />
                    <span className="sr-only sm:not-sr-only font-semibold">Thu nhỏ</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-white" />
                    <span className="sr-only sm:not-sr-only font-semibold">Phóng to</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Bà con có chắc muốn xóa lịch sử cuộc trò chuyện này để bắt đầu lại?')) {
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    setSpeakingId(null);
                    setMessages([]);
                  }
                }}
                title="Làm mới cuộc trò chuyện"
                className="px-2.5 sm:px-3 py-1.5 rounded-md bg-[#005B4F] hover:bg-[#004D40] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-white/25 gov-focus-ring"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="sr-only sm:not-sr-only">Làm mới</span>
              </button>
            </div>
          </div>

          {/* Messages Scroll Viewport */}
          <div
            ref={scrollContainerRef}
            tabIndex={0}
            role="log"
            aria-label="Lịch sử hỏi đáp pháp lý"
            onScroll={handleScroll}
            className="flex-1 min-h-0 p-3.5 sm:p-5 overflow-y-auto space-y-4 bg-[#F8FAFC] relative scroll-smooth gov-focus-ring"
          >
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

            {messages.map((msg, idx) => {
              const isLatestBot = idx === latestBotIdx;
              return (
                <div
                  key={msg.id}
                  ref={isLatestBot ? latestBotMsgRef : undefined}
                  className={`flex gap-3 ${msg.sender === 'citizen' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-[#00796B] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-4 h-4 text-teal-100" />
                    </div>
                  )}

                  <div
                    className={`${
                      msg.sender === 'bot'
                        ? 'w-full max-w-full sm:max-w-[97%]'
                        : isChatExpanded
                        ? 'max-w-[85%] sm:max-w-[70%] md:max-w-[60%]'
                        : 'max-w-[88%] sm:max-w-[75%] md:max-w-[65%]'
                    } flex flex-col gap-2 rounded-xl p-4 sm:p-5 transition-all ${
                      msg.sender === 'citizen'
                        ? 'bg-[#00796B] text-white shadow-xs'
                        : 'bg-white text-[#0F172A] border border-slate-200/90 shadow-xs'
                    }`}
                  >
                  {/* Message body text with 5-section badge highlights */}
                  {msg.sender === 'bot' ? (
                    <StructuredBotMessage
                      msg={msg}
                      isSimpleMode={isSimpleMode}
                      onOpenCitation={setActiveCitation}
                    />
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

                  {/* Clarifying suggestion buttons shown inline only when query was ambiguous/abstained (max 2-3) */}
                  {msg.sender === 'bot' && msg.ragData?.abstained && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-xs flex flex-wrap items-center gap-1.5 text-slate-700">
                      <span className="font-semibold text-[#00695C] flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-[#00796B]" />
                        <span>Chọn thủ tục cần hỏi:</span>
                      </span>
                      {msg.suggestions.slice(0, isSimpleMode ? 2 : 3).map((sug, sIdx) => {
                        const clean = sug.replace(/^[👉👶💍🏠📋\s]+/, '').trim();
                        return (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => handleAsk(clean)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-50 hover:bg-teal-100 text-[#00695C] border border-teal-200 font-medium transition cursor-pointer gov-focus-ring"
                          >
                            <span>{clean}</span>
                            <ArrowRight className="w-3 h-3 text-[#00695C]" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Bot Interactive Action Dock & Real Measured Latency */}
                  {msg.sender === 'bot' && (
                    <>
                      {/* Clear Safe Abstention State Banner */}
                      {msg.ragData?.abstained && (
                        <div className="mt-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                            <span>Hệ thống chưa đủ căn cứ pháp lý để trả lời. Bà con vui lòng liên hệ Bộ phận Một cửa:</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={`tel:${currentWard.phoneNumber.replace(/\s+/g, '')}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 font-semibold text-amber-950 transition gov-focus-ring"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>{currentWard.phoneNumber}</span>
                            </a>
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(currentWard.officeAddress)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-amber-300 hover:bg-amber-100 font-semibold text-amber-950 transition gov-focus-ring"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Chỉ đường</span>
                            </a>
                          </div>
                        </div>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                        {/* Clean Timestamp & Real Measured Latency (shown only when genuinely measured) */}
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#00695C] font-medium">
                            <Clock className="w-3.5 h-3.5 text-[#00796B]" />
                            {msg.timestamp}
                          </span>
                          {typeof msg.measuredLatencyMs === 'number' && msg.measuredLatencyMs > 0 && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-700"
                              title="Thời gian phản hồi thực tế đo được"
                            >
                              {msg.measuredLatencyMs} ms
                            </span>
                          )}
                        </div>

                        {/* Action Buttons: Citations, TTS, Feedback & Copy */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          {/* Legal Citations Drawer Button */}
                          {msg.ragData?.citations && msg.ragData.citations.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setActiveCitation(msg.ragData!.citations[0])}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 hover:bg-teal-100 text-[#00695C] text-xs font-semibold transition cursor-pointer border border-teal-200 gov-focus-ring"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Căn cứ ({msg.ragData.citations.length})</span>
                            </button>
                          )}

                          {/* Text-To-Speech Button */}
                          <button
                            type="button"
                            onClick={() => toggleSpeech(msg.text, msg.id)}
                            className={`group inline-flex items-center gap-1.5 font-semibold text-xs px-2.5 py-1 rounded-md border transition cursor-pointer select-none gov-focus-ring ${
                              speakingId === msg.id
                                ? 'bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]'
                                : 'bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#00695C] border-[#99F6E4]'
                            }`}
                            title={
                              speakingId === msg.id
                                ? 'Chế độ: ĐANG MỞ ĐỌC. Bấm vào để TẮT ngay'
                                : 'Chế độ: ĐANG TẮT. Bấm vào để MỞ nghe đọc to bằng giọng nói tiếng Việt'
                            }
                            aria-pressed={speakingId === msg.id}
                          >
                            {speakingId === msg.id ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5 text-[#DC2626]" />
                                <span className="font-bold text-[#991B1B]">Đang đọc...</span>
                                <span className="ml-0.5 px-1.5 py-0.5 rounded bg-[#DC2626] text-white text-[10px] font-bold uppercase">
                                  TẮT
                                </span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5 text-[#00695C]" />
                                <span>Nghe đọc to</span>
                                <span className="ml-0.5 px-1.5 py-0.5 rounded bg-[#00695C] text-white text-[10px] font-bold uppercase">
                                  MỞ
                                </span>
                              </>
                            )}
                          </button>

                          {/* RAG Feedback Buttons */}
                          <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200">
                            <button
                              type="button"
                              onClick={() => {
                                submitRagFeedback(msg.text, true);
                                setMessages((prev) =>
                                  prev.map((m) => (m.id === msg.id ? { ...m, feedbackSent: 'useful' } : m))
                                );
                              }}
                              className={`p-1 rounded-md transition cursor-pointer gov-focus-ring ${
                                msg.feedbackSent === 'useful'
                                  ? 'bg-teal-100 text-[#00695C]'
                                  : 'hover:bg-slate-100 text-slate-600 hover:text-[#00695C]'
                              }`}
                              title="Câu trả lời hữu ích"
                              aria-label="Câu trả lời hữu ích"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                submitRagFeedback(msg.text, false);
                                setMessages((prev) =>
                                  prev.map((m) => (m.id === msg.id ? { ...m, feedbackSent: 'not-useful' } : m))
                                );
                              }}
                              className={`p-1 rounded-md transition cursor-pointer gov-focus-ring ${
                                msg.feedbackSent === 'not-useful'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'hover:bg-slate-100 text-slate-600 hover:text-rose-700'
                              }`}
                              title="Câu trả lời chưa đúng ý"
                              aria-label="Câu trả lời chưa đúng ý"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                            {msg.feedbackSent && (
                              <span className="text-[10px] text-[#00695C] font-medium ml-0.5">Cảm ơn!</span>
                            )}
                          </div>

                          {/* Copy to clipboard */}
                          <button
                            type="button"
                            onClick={() => copyToClipboard(msg.text, msg.id)}
                            className="text-slate-700 hover:text-[#00695C] flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 transition font-medium cursor-pointer gov-focus-ring"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                                <span className="text-[#166534] font-semibold">Đã chép</span>
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
                    </>
                  )}
                </div>

                {msg.sender === 'citizen' && (
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-[#00695C] flex items-center justify-center shrink-0 mt-0.5 border border-teal-200">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

            {/* Staggered Typing Indicator */}
            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#00796B] text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-slate-700 font-medium">Cán bộ AI đang tra cứu văn bản pháp lý...</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#00796B] animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 rounded-full bg-[#26A69A] animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 rounded-full bg-[#80CBC4] animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} className="h-2 shrink-0" />
          </div>

          {/* Quick Prompts Contextual Bar (2-3 gợi ý theo ngữ cảnh + nút Cuộn xuống gọn không đè text) */}
          <div className="px-3 sm:px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-xs font-semibold text-slate-700 shrink-0">
              {isSimpleMode ? 'Gợi ý:' : 'Hỏi nhanh:'}
            </span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAsk(p.q)}
                className={`shrink-0 rounded-md font-semibold border transition cursor-pointer gov-focus-ring ${
                  isSimpleMode
                    ? 'px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#004D40] border-emerald-300 text-sm'
                    : 'px-2.5 py-1 bg-white hover:bg-teal-50 text-[#00695C] border-slate-200 hover:border-teal-300 text-xs shadow-2xs'
                }`}
              >
                {p.label}
              </button>
            ))}
            {showScrollBottom && (
              <button
                type="button"
                onClick={() => {
                  const el = scrollContainerRef.current;
                  if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                }}
                className="ml-auto shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-semibold transition cursor-pointer gov-focus-ring"
                title="Cuộn nhanh xuống cuối để xem câu trả lời mới nhất"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Xuống cuối</span>
              </button>
            )}
          </div>

          {/* Interactive Chat Input Dock */}
          <div className="p-2.5 sm:p-3.5 bg-white border-t border-slate-200 shrink-0">
            {/* Simple Mode Guidance Banner */}
            {isSimpleMode && (
              <div className="mb-2 p-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[#004D40] text-xs sm:text-sm font-semibold flex items-center gap-2">
                <Info className="w-4 h-4 text-[#00695C] shrink-0" />
                <span>Bấm vào biểu tượng micro để đọc câu hỏi bằng giọng nói thay vì gõ chữ.</span>
              </div>
            )}

            {/* Inline Voice Error Alert Banner */}
            {voiceError && (
              <div className="mb-2 p-2 px-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs sm:text-sm flex items-center justify-between gap-2 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{voiceError}</span>
                </div>
                <button
                  type="button"
                  onClick={clearVoiceError}
                  aria-label="Đóng thông báo lỗi giọng nói"
                  className="text-amber-800 hover:text-amber-950 p-1 cursor-pointer gov-focus-ring rounded"
                  title="Đóng thông báo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Active Listening Indicator Bar */}
            {isVoiceListening && (
              <div className="mb-2 p-2 px-3 rounded-lg bg-red-50 border border-red-200 text-red-950 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
                  </span>
                  <span className={`font-semibold ${isSimpleMode ? 'text-sm sm:text-base text-red-950' : 'text-xs text-red-950'}`}>
                    Đang ghi nhận giọng nói... vui lòng đặt câu hỏi
                  </span>
                  {voiceInterimText && (
                    <span className="text-xs italic text-red-800 truncate max-w-[180px] sm:max-w-[360px]">
                      "{voiceInterimText}"
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={stopVoiceInput}
                  className="px-2.5 py-1 rounded-md bg-red-700 hover:bg-red-800 text-white text-xs font-semibold transition cursor-pointer shrink-0 gov-focus-ring"
                >
                  Dừng nghe
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
              className="flex items-center gap-2"
            >
              {/* Mic Button */}
              <button
                type="button"
                onClick={isVoiceListening ? stopVoiceInput : startVoiceInput}
                title={
                  isVoiceListening
                    ? 'Đang nghe... Bấm để dừng nhận diện giọng nói'
                    : isSimpleMode
                    ? 'Bấm vào đây để nói câu hỏi (Không cần gõ chữ)'
                    : 'Bấm để nói câu hỏi (Nhận diện giọng nói tiếng Việt)'
                }
                aria-label={isVoiceListening ? 'Dừng nghe' : 'Nói câu hỏi'}
                className={`transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0 gov-focus-ring ${
                  isSimpleMode
                    ? isVoiceListening
                      ? 'min-h-[48px] min-w-[48px] p-2.5 rounded-lg bg-[#DC2626] text-white border-2 border-[#DC2626]'
                      : 'min-h-[48px] min-w-[48px] p-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#004D40] border-2 border-emerald-500 font-bold'
                    : isVoiceListening
                    ? 'min-h-[44px] min-w-[44px] p-2.5 rounded-md bg-[#DC2626] text-white border border-[#DC2626]'
                    : 'min-h-[44px] min-w-[44px] p-2.5 rounded-md bg-[#F8FAFC] hover:bg-teal-50 text-[#00695C] border border-slate-300'
                }`}
              >
                {isVoiceListening ? (
                  <MicOff className={`${isSimpleMode ? 'w-5 h-5' : 'w-4 h-4'} text-white`} />
                ) : (
                  <Mic className={`${isSimpleMode ? 'w-5 h-5 text-[#004D40]' : 'w-4 h-4'}`} />
                )}
              </button>

              {/* Text Input Field */}
              <div className="flex-1 relative min-w-0">
                <input
                  type="text"
                  aria-label="Nhập câu hỏi thủ tục hành chính"
                  value={
                    isVoiceListening && voiceInterimText
                      ? query
                        ? `${query} ${voiceInterimText}`
                        : voiceInterimText
                      : query
                  }
                  maxLength={1000}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    isSimpleMode
                      ? 'Nói vào micro hoặc gõ câu hỏi tại đây...'
                      : 'Nhập câu hỏi thủ tục (ví dụ: làm khai sinh, kết hôn, CT01)...'
                  }
                  className={`w-full h-11 pl-3.5 pr-9 rounded-md bg-[#F8FAFC] border border-slate-300 focus:border-[#00796B] focus:bg-white text-[#0F172A] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00796B]/20 transition-all ${
                    isSimpleMode ? 'text-base sm:text-lg font-medium' : 'text-sm'
                  }`}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Xóa nội dung câu hỏi"
                    onClick={() => setQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 cursor-pointer p-1 gov-focus-ring rounded"
                    title="Xóa chữ"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Primary Send Button (accessible text across 375px-1280px) */}
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className={`h-11 px-3.5 sm:px-5 rounded-md bg-[#00796B] hover:bg-[#00695C] text-white font-semibold text-sm shadow-xs disabled:opacity-50 disabled:hover:bg-[#00796B] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer gov-focus-ring ${
                  isSimpleMode ? 'min-w-[68px]' : ''
                }`}
              >
                <span className="sr-only sm:not-sr-only">Gửi</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Accessible Citation Detail Modal / Drawer with Focus Trap & Escape Handler */}
      {activeCitation !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveCitation(null);
          }}
        >
          <div
            ref={citationModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="citation-dialog-title"
            className="bg-white max-w-lg w-full rounded-xl p-6 shadow-xl border border-[#CBD5E1] flex flex-col gap-4 animate-scaleUp"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#00796B]" />
                <h3 id="citation-dialog-title" className="font-semibold text-sm sm:text-base text-[#0F172A]">
                  Căn Cứ Pháp Lý Trích Xuất
                </h3>
              </div>
              <button
                ref={citationCloseBtnRef}
                type="button"
                aria-label="Đóng hộp thoại căn cứ pháp lý"
                onClick={() => setActiveCitation(null)}
                className="p-1.5 rounded-md text-slate-600 hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer gov-focus-ring"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs sm:text-sm">
              <div>
                <span className="text-slate-600 block text-xs font-medium">Văn bản quy phạm pháp luật:</span>
                <span className="font-semibold text-[#0F172A] text-sm">
                  {activeCitation.legalReference || activeCitation.title}
                </span>
              </div>

              <div>
                <span className="text-slate-600 block text-xs font-medium">Nội dung điều khoản trích dẫn:</span>
                <p className="p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs sm:text-sm text-[#0F172A] leading-relaxed mt-1">
                  "{activeCitation.content}"
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <span>Nguồn: Bộ thủ tục hành chính công cấp xã</span>
                <span className="font-semibold text-[#00695C]">
                  UBND {currentWard.name}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveCitation(null)}
              className="w-full py-2.5 bg-[#00796B] hover:bg-[#00695C] text-white text-xs sm:text-sm font-semibold rounded-md transition cursor-pointer shadow-xs gov-focus-ring"
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
