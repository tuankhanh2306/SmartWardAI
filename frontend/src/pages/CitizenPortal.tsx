import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { askLegalRag, submitRagFeedback, synthesizeSpeech, type RagResponse, type LegalCitation } from '../api/client';
import { normalizeTextForTts } from '../utils/ttsTextNormalizer';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWard } from '../context/WardContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { PROCEDURES_CATALOG } from '../data/proceduresCatalog';
import { normalizeVi, highlightMatchedText } from '../utils/highlightMatch';
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
  ExternalLink,
  PhoneCall,
  Phone,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Scale,
  Building2,
  ClipboardList,
  Users,
  HeartHandshake,
  Stamp,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Eye,
  Info,
  Sparkles,
  Plus,
  FileCheck2,
  FolderOpen,
  MessageSquare,
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

  const { parsedSections, preambleLines, primaryTitle } = useMemo(() => {
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

    // Determine primary procedure title cleanly
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
            className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-md font-mono text-[11px] font-bold bg-[#FEF2F2] text-[#9F0C1E] hover:bg-[#FEE2E2] border border-[#FECACA] transition-all cursor-pointer active:scale-95 shadow-2xs"
            title={`Xem căn cứ pháp lý ${code}`}
          >
            <BookOpen className="w-3 h-3 text-[#B90E23]" />
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
        <div key={idx} className="flex items-start gap-2.5 py-0.5 pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B90E23] shrink-0 mt-2" />
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

  // P2: Giảm mật độ mặc định — chỉ hiện câu trả lời tóm tắt + 1 vùng "Xem chi tiết" thu gọn;
  // 5 mục accordion mặc định ĐÓNG (trừ mục công dân trực tiếp hỏi), nguồn hiển thị thống nhất ở thanh đáy.
  const detailRegionId = `detail-region-${msg.id}`;
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
    <div className="flex flex-col gap-2 text-sm md:text-base leading-relaxed text-[#0F172A]">
      {/* Clean Claude/Gemini style procedure headline without boxed code pill */}
      {primaryTitle && (
        <h3 className="font-semibold text-base text-[#0F172A] leading-snug">
          {primaryTitle}
        </h3>
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

      {/* 1 vùng "Xem chi tiết" thu gọn mặc định (tự mở nếu hỏi đúng mục 2-5) */}
      {accordionSections.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            aria-expanded={detailExpanded}
            aria-controls={detailRegionId}
            onClick={() => setDetailExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-[#FEF2F2] text-[#9F0C1E] text-xs font-semibold border border-slate-200 hover:border-[#FECACA] transition-colors cursor-pointer gov-focus-ring"
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentWard, isOfficeOpen, officeStatusLabel } = useWard();
  const { isAudioAutoPlay, isSimpleMode, setIsSimpleMode } = useAccessibility();
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const latestBotMsgRef = useRef<HTMLDivElement>(null);
  const citationModalRef = useRef<HTMLDivElement>(null);
  const citationCloseBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const omniboxContainerRef = useRef<HTMLDivElement>(null);
  const initialQueryHandledRef = useRef(false);
  const [query, setQuery] = useState('');
  const [omniboxFocused, setOmniboxFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<LegalCitation | null>(null);

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

  // Close omnibox search recommendation popover on outside click or Escape
  useEffect(() => {
    if (!omniboxFocused) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (omniboxContainerRef.current && !omniboxContainerRef.current.contains(e.target as Node)) {
        setOmniboxFocused(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOmniboxFocused(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [omniboxFocused]);

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

  // Start empty so landing on /citizen shows the Wai Centered AI Welcome Workspace
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Live grouped search recommendations from 40-TTHC catalog as user types
  const searchRecommendations = useMemo(() => {
    const cleanQ = normalizeVi(query).trim();
    if (!omniboxFocused || cleanQ.length < 1) return [];

    const matched = PROCEDURES_CATALOG.filter(
      (p) =>
        normalizeVi(p.name).includes(cleanQ) ||
        normalizeVi(p.code).includes(cleanQ) ||
        normalizeVi(p.category).includes(cleanQ)
    ).slice(0, 6);

    const groups = new Map<string, typeof matched>();
    for (const item of matched) {
      const arr = groups.get(item.category) || [];
      arr.push(item);
      groups.set(item.category, arr);
    }
    return Array.from(groups.entries()).slice(0, 3);
  }, [omniboxFocused, query]);

  // Index of latest bot message for smart top-anchored scrolling
  const latestBotIdx = useMemo(() => {
    return messages.map((m) => m.sender).lastIndexOf('bot');
  }, [messages]);

  // Natural document scroll on new message
  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      if (loading) {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } else {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.sender === 'bot' && latestBotMsgRef.current) {
          latestBotMsgRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  // Reference to current active utterance or audio element to prevent GC and handle clean cancellation
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);

  // Stop speech synthesis cleanly across all engines (Sidecar Piper TTS + Web Speech API)
  const stopSpeech = useCallback(() => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }
    if (currentAudioUrlRef.current) {
      try {
        URL.revokeObjectURL(currentAudioUrlRef.current);
      } catch {}
      currentAudioUrlRef.current = null;
    }
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

  // Fallback to browser Web Speech API if local AI sidecar TTS is unavailable
  const fallbackWebSpeech = useCallback((clean: string, id: string) => {
    if (!('speechSynthesis' in window)) {
      setSpeakingId(null);
      return;
    }
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = 'vi-VN';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find((v) => v.lang.toLowerCase().includes('vi'));
        if (viVoice) {
          utterance.voice = viVoice;
        }

        utterance.onend = () => {
          currentUtteranceRef.current = null;
          setSpeakingId(null);
        };
        utterance.onerror = () => {
          currentUtteranceRef.current = null;
          setSpeakingId(null);
        };

        currentUtteranceRef.current = utterance;
        setSpeakingId(id);
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('Speech synthesis speak error:', err);
        setSpeakingId(null);
      }
    }, 50);
  }, []);

  // Start speech synthesis prioritizing offline Piper TTS AI model with fallback to Web Speech API
  const startSpeech = useCallback((text: string, id: string) => {
    stopSpeech();

    // Clean and expand administrative acronyms (e.g. CCCD -> Căn cước công dân, UBND -> Ủy ban nhân dân)
    const clean = normalizeTextForTts(text);

    if (!clean) return;

    setSpeakingId(id);

    // 1. Try local AI Sidecar Piper TTS first (sub-15ms offline Vietnamese voice)
    synthesizeSpeech(clean)
      .then((blob) => {
        const audioUrl = URL.createObjectURL(blob);
        currentAudioUrlRef.current = audioUrl;
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        audio.onended = () => {
          stopSpeech();
        };
        audio.onerror = () => {
          console.warn('Audio playback error, falling back to Web Speech API');
          stopSpeech();
          fallbackWebSpeech(clean, id);
        };

        audio.play().catch((err) => {
          console.warn('Audio play() rejected:', err);
          stopSpeech();
          fallbackWebSpeech(clean, id);
        });
      })
      .catch((err) => {
        console.info('Sidecar TTS unavailable, falling back to browser Web Speech API:', err);
        fallbackWebSpeech(clean, id);
      });
  }, [stopSpeech, fallbackWebSpeech]);

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

    setOmniboxFocused(false);

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

  // One-shot URL ?query= trigger (e.g., from 40 Procedures Catalog "Hỏi AI" button)
  useEffect(() => {
    if (initialQueryHandledRef.current) return;
    const urlQuery = searchParams.get('query');
    if (urlQuery && urlQuery.trim()) {
      initialQueryHandledRef.current = true;
      setSearchParams({}, { replace: true });
      void handleAsk(urlQuery.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
      title: 'Đăng ký khai sinh',
      desc: 'Giấy tờ khai sinh cho trẻ',
      iconBoxClass: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
      IconComponent: FileText,
      prompt: `Thủ tục đăng ký khai sinh tại ${currentWard.name} gồm những giấy tờ gì và giải quyết trong bao lâu?`,
    },
    {
      code: 'TTHC-HT-02',
      title: 'Đăng ký kết hôn',
      desc: 'Hồ sơ kết hôn & độc thân',
      iconBoxClass: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
      IconComponent: HeartHandshake,
      prompt: `Hai bên nam nữ cần chuẩn bị gì khi đến UBND ${currentWard.name} đăng ký kết hôn?`,
    },
    {
      code: 'TTHC-CT-01',
      title: 'Chứng thực bản sao',
      desc: 'Bản sao, chữ ký đúng quy định',
      iconBoxClass: 'bg-[#FFF3E6] text-[#C2410C] border-[#FED7AA]',
      IconComponent: Stamp,
      prompt: `Thủ tục chứng thực bản sao từ bản chính các loại giấy tờ tại ${currentWard.name}?`,
    },
    {
      code: 'TTHC-BT-01',
      title: 'Trợ cấp xã hội',
      desc: 'Điều kiện & mức trợ cấp',
      iconBoxClass: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
      IconComponent: Users,
      prompt: 'Hồ sơ và điều kiện hưởng trợ cấp xã hội hằng tháng cho người cao tuổi, khuyết tật gồm những gì?',
    },
  ];

  const handleResetChat = () => {
    stopSpeech();
    setQuery('');
    setOmniboxFocused(false);
    setMessages([]);
  };

  const displayInputValue =
    isVoiceListening && voiceInterimText
      ? query
        ? `${query} ${voiceInterimText}`
        : voiceInterimText
      : query;

  return (
    <div className="flex flex-col w-full bg-[#F8FAFC] min-h-[calc(100dvh-5.75rem)] flex-1">
      {messages.length === 0 ? (
        /* ===================================================================== */
        /* WAI STYLE CENTERED AI WELCOME WORKSPACE (EMPTY CONVERSATION STATE)    */
        /* ===================================================================== */
        <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 py-8 sm:py-12 flex flex-col items-center justify-center">
          {/* Simple Mode Quick Banner */}
          {isSimpleMode && (
            <div className="mb-4 px-3.5 py-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 text-xs sm:text-sm font-semibold flex flex-wrap items-center gap-2">
              <Eye className="w-4 h-4 shrink-0" />
              <span>Chế độ giao diện đơn giản đang BẬT</span>
              <button
                type="button"
                onClick={() => setIsSimpleMode(false)}
                className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-xs font-bold hover:bg-amber-50 cursor-pointer"
              >
                Tắt
              </button>
            </div>
          )}

          {/* Brand Lockup */}
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              SmartWard
            </span>
            <Sparkles className="w-6 h-6 text-[#C2410C]" />
          </div>

          <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight text-center">
            Xin chào, tôi là SmartWard AI
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 text-center max-w-xl leading-relaxed">
            Trợ lý AI hành chính công UBND {currentWard.name}. Hỏi nhanh về 40 thủ tục, hồ sơ &amp;
            lệ phí.
          </p>

          {/* Centered Multi-Action Omnibox Card with Live Search Recommendations */}
          <div
            ref={omniboxContainerRef}
            className="w-full max-w-3xl mt-6 relative z-40"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
              className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-[0_8px_30px_rgba(15,23,42,0.06)] p-3 sm:p-4 transition-shadow focus-within:border-[#C2410C] focus-within:shadow-[0_10px_36px_rgba(194,65,12,0.08)]"
            >
              {/* Voice Status / Error Inline Alerts */}
              {voiceError && (
                <div className="mb-2.5 p-2 px-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>{voiceError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={clearVoiceError}
                    aria-label="Đóng thông báo lỗi giọng nói"
                    className="text-amber-800 hover:text-amber-950 p-1 cursor-pointer rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {isVoiceListening && (
                <div className="mb-2.5 p-2 px-3 rounded-lg bg-red-50 border border-red-200 text-red-950 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex rounded-full h-2.5 w-2.5 bg-red-600 shrink-0" />
                    <span className="text-xs font-semibold">
                      Đang nghe giọng nói... vui lòng đặt câu hỏi
                    </span>
                    {voiceInterimText && (
                      <span className="text-xs italic text-red-800 truncate">
                        &ldquo;{voiceInterimText}&rdquo;
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={stopVoiceInput}
                    className="px-2.5 py-1 rounded-md bg-red-700 hover:bg-red-800 text-white text-xs font-semibold cursor-pointer shrink-0"
                  >
                    Dừng nghe
                  </button>
                </div>
              )}

              {/* Omnibox Input Row */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  aria-label="Nhập câu hỏi thủ tục hành chính"
                  value={displayInputValue}
                  maxLength={1000}
                  onFocus={() => setOmniboxFocused(true)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setOmniboxFocused(true);
                  }}
                  placeholder="Hỏi SmartWard về thủ tục, hồ sơ, lệ phí..."
                  className={`w-full py-2 pr-8 bg-transparent text-[#0F172A] placeholder-slate-500 focus:outline-none ${
                    isSimpleMode ? 'text-base sm:text-lg font-medium' : 'text-sm sm:text-base'
                  }`}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Xóa nội dung câu hỏi"
                    onClick={() => setQuery('')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 p-1 rounded cursor-pointer gov-focus-ring"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Bottom Action Toolbar inside Omnibox (Wai Layout) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleResetChat}
                    aria-label="Cuộc trò chuyện mới"
                    title="Làm mới câu hỏi"
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition cursor-pointer gov-focus-ring"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/citizen/form#form')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer gov-focus-ring"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-[#9F0C1E]" />
                    <span>Kiểm tra tờ khai</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/citizen/procedures')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer gov-focus-ring"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>Nguồn thông tin</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <span
                    className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700"
                    title={officeStatusLabel}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOfficeOpen ? 'bg-[#16A34A]' : 'bg-[#CA8A04]'
                      }`}
                    />
                    <span className="truncate max-w-[140px]">UBND {currentWard.name}</span>
                  </span>

                  <button
                    type="button"
                    onClick={isVoiceListening ? stopVoiceInput : startVoiceInput}
                    aria-label={isVoiceListening ? 'Dừng nghe' : 'Nói câu hỏi'}
                    title="Nói câu hỏi tiếng Việt"
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition cursor-pointer gov-focus-ring ${
                      isVoiceListening
                        ? 'bg-[#DC2626] text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isVoiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    aria-label="Gửi"
                    className="h-9 px-3 rounded-lg bg-[#0F172A] hover:bg-[#B90E23] disabled:bg-slate-300 text-white flex items-center justify-center gap-1.5 text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed gov-focus-ring"
                  >
                    <span className="sr-only">Gửi</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>

            {/* Live Search Recommendation Popover Grouped by Category (Wai Search Reference) */}
            {searchRecommendations.length > 0 && (
              <div
                role="region"
                aria-label="Gợi ý thủ tục phù hợp"
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 max-h-80 overflow-y-auto space-y-3"
              >
                {searchRecommendations.map(([categoryName, items]) => (
                  <div key={categoryName} className="space-y-1">
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-bold text-slate-800">
                      <span className="w-5 h-5 rounded-md bg-[#FFF3E6] text-[#C2410C] flex items-center justify-center shrink-0">
                        <FolderOpen className="w-3.5 h-3.5" />
                      </span>
                      <span>{categoryName}</span>
                    </div>
                    {items.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          setOmniboxFocused(false);
                          void handleAsk(
                            `Thủ tục ${item.name} (${item.code}) tại UBND ${currentWard.name} cần hồ sơ gì và lệ phí bao nhiêu?`
                          );
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 transition flex items-start gap-2.5 cursor-pointer gov-focus-ring"
                      >
                        <MessageSquare className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-medium text-slate-900 truncate">
                            {highlightMatchedText(item.name, query)}
                          </div>
                          <div className="text-[11px] text-slate-600 truncate mt-0.5">
                            {item.code} • Xem hồ sơ &amp; lệ phí
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4 HORIZONTAL SUGGESTION CARDS (GỢI Ý CÂU HỎI) */}
          <section aria-label="Gợi ý câu hỏi" className="w-full mt-8 relative z-10">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-600 text-center">
              GỢI Ý CÂU HỎI
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full mt-3.5 items-stretch">
              {bentoCards.map((card) => {
                const CardIcon = card.IconComponent;
                return (
                  <button
                    key={card.code}
                    type="button"
                    onClick={() => handleAsk(card.prompt)}
                    className="h-full text-left p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-[#C2410C] hover:shadow-md transition-all cursor-pointer flex flex-col justify-start gap-2.5 gov-focus-ring"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${card.iconBoxClass}`}
                    >
                      <CardIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 leading-snug">
                        {card.title}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Minimal Bottom Disclaimer */}
          <p className="mt-8 text-center text-[11px] text-slate-600">
            Trích xuất từ văn bản pháp luật hiện hành. Kiểm tra lại trước khi nộp hồ sơ.
          </p>
        </main>
      ) : (
        /* ===================================================================== */
        /* ACTIVE CONVERSATION VIEW — NATURAL PAGE SCROLL + STICKY BOTTOM DOCK   */
        /* ===================================================================== */
        <div className="flex-1 flex flex-col w-full">
          {/* Centered Conversation Stream */}
          <main
            role="log"
            aria-label="Lịch sử hỏi đáp pháp lý"
            className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 pt-4 pb-6 flex flex-col gap-4"
          >
            {/* Compact Top Conversation Header */}
            <div className="px-3.5 py-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isOfficeOpen ? 'bg-[#16A34A]' : 'bg-[#CA8A04]'
                  }`}
                  title={officeStatusLabel}
                />
                <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                  Trợ lý Một cửa · UBND {currentWard.name}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isSimpleMode && (
                  <button
                    type="button"
                    onClick={() => setIsSimpleMode(false)}
                    className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-semibold flex items-center gap-1 cursor-pointer gov-focus-ring"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Đơn giản: BẬT</span>
                    <X className="w-3 h-3" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetChat}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer gov-focus-ring"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Cuộc trò chuyện mới</span>
                </button>
              </div>
            </div>

            {messages.map((msg, idx) => {
              const isLatestBot = idx === latestBotIdx;
              return (
                <div
                  key={msg.id}
                  ref={isLatestBot ? latestBotMsgRef : undefined}
                  className={`flex gap-3 ${msg.sender === 'citizen' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-7 h-7 rounded-full bg-[#FEF2F2] text-[#9F0C1E] border border-[#FECACA] flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`${
                      msg.sender === 'bot'
                        ? 'w-full max-w-full sm:max-w-[95%]'
                        : 'max-w-[88%] sm:max-w-[75%] md:max-w-[65%]'
                    } flex flex-col gap-2 rounded-2xl transition-all ${
                      msg.sender === 'citizen'
                        ? 'px-4 py-3 bg-[#9F0C1E] text-white shadow-xs'
                        : 'p-4 sm:p-5 bg-white text-[#0F172A] border border-slate-200/80 shadow-2xs'
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
                      <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    )}

                    {/* POLITE CIVIC CONTACT NOTE WHEN QUERY NEEDS DIRECT SUPPORT */}
                    {msg.ragData?.abstained && (
                      <div className="mt-2 p-3 rounded-xl bg-teal-50/50 border border-teal-200 text-[#334155] flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span>
                          Câu hỏi đã được chuyển vào Hàng đợi Cán bộ Một cửa{' '}
                          <strong>UBND {currentWard.name}</strong> để kiểm duyệt và phản hồi chính
                          xác.
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

                    {/* RESIDENCE / POLICE ROUTING BUTTON */}
                    {(msg.text.includes('Công an cấp xã') || msg.text.includes('VNeID')) && (
                      <div className="mt-2 pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
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

                    {/* INCIDENT ROUTING BUTTON */}
                    {msg.sender === 'bot' && msg.text.includes('Báo Sự Cố Hiện Trường') && (
                      <div className="mt-2 pt-2.5 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-[#B45309] font-bold flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-[#D97706]" />
                          Tự động định vị &amp; chuyển về đúng UBND Xã/Phường
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

                    {/* Clarifying suggestion buttons */}
                    {msg.sender === 'bot' &&
                      msg.ragData?.abstained &&
                      msg.suggestions &&
                      msg.suggestions.length > 0 && (
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

                    {/* Bot Interactive Action Dock */}
                    {msg.sender === 'bot' && (
                      <>
                        {msg.ragData?.abstained && (
                          <div className="mt-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                              <span>
                                Hệ thống chưa đủ căn cứ pháp lý để trả lời. Bà con vui lòng liên hệ
                                Bộ phận Một cửa:
                              </span>
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
                                href={`https://maps.google.com/?q=${encodeURIComponent(
                                  currentWard.officeAddress
                                )}`}
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

                        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            {msg.ragData?.citations && msg.ragData.citations.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setActiveCitation(msg.ragData!.citations[0])}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 hover:bg-[#FEF2F2] text-[#9F0C1E] text-xs font-medium transition cursor-pointer border border-slate-200 hover:border-[#FECACA] gov-focus-ring max-w-full"
                                title="Bấm xem chi tiết căn cứ pháp lý"
                              >
                                <BookOpen className="w-3.5 h-3.5 shrink-0 text-[#B90E23]" />
                                <span className="truncate max-w-[190px] sm:max-w-[280px]">
                                  {msg.ragData.citations[0].legalReference ||
                                    msg.ragData.citations[0].procedureCode}
                                </span>
                                {msg.ragData.citations.length > 1 && (
                                  <span className="text-[10px] font-semibold text-slate-600 shrink-0">
                                    +{msg.ragData.citations.length - 1}
                                  </span>
                                )}
                              </button>
                            )}

                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {msg.timestamp}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleSpeech(msg.text, msg.id)}
                              className={`inline-flex items-center gap-1 font-medium text-xs px-2 py-1 rounded-lg transition cursor-pointer select-none gov-focus-ring ${
                                speakingId === msg.id
                                  ? 'bg-red-50 text-[#991B1B] border border-red-200 font-semibold'
                                  : 'text-slate-600 hover:text-[#9F0C1E] hover:bg-slate-100'
                              }`}
                              title={
                                speakingId === msg.id
                                  ? 'Đang đọc câu trả lời — Bấm để dừng'
                                  : 'Nghe đọc to câu trả lời'
                              }
                              aria-pressed={speakingId === msg.id}
                            >
                              {speakingId === msg.id ? (
                                <>
                                  <VolumeX className="w-3.5 h-3.5 text-[#DC2626]" />
                                  <span>Dừng</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span>Nghe</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => copyToClipboard(msg.text, msg.id)}
                              className="text-slate-600 hover:text-[#9F0C1E] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition font-medium cursor-pointer gov-focus-ring"
                              title="Sao chép nội dung"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                                  <span className="text-[#166534] font-semibold">Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Sao chép</span>
                                </>
                              )}
                            </button>

                            <div className="flex items-center gap-0.5 pl-1 border-l border-slate-200">
                              <button
                                type="button"
                                onClick={() => {
                                  submitRagFeedback(msg.text, true);
                                  setMessages((prev) =>
                                    prev.map((m) =>
                                      m.id === msg.id ? { ...m, feedbackSent: 'useful' } : m
                                    )
                                  );
                                }}
                                className={`p-1.5 rounded-lg transition cursor-pointer gov-focus-ring ${
                                  msg.feedbackSent === 'useful'
                                    ? 'bg-[#FEF2F2] text-[#9F0C1E]'
                                    : 'hover:bg-slate-100 text-slate-600 hover:text-[#9F0C1E]'
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
                                    prev.map((m) =>
                                      m.id === msg.id ? { ...m, feedbackSent: 'not-useful' } : m
                                    )
                                  );
                                }}
                                className={`p-1.5 rounded-lg transition cursor-pointer gov-focus-ring ${
                                  msg.feedbackSent === 'not-useful'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'hover:bg-slate-100 text-slate-600 hover:text-rose-700'
                                }`}
                                title="Câu trả lời chưa đúng ý"
                                aria-label="Câu trả lời chưa đúng ý"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                              {msg.feedbackSent && (
                                <span className="text-[10px] text-[#9F0C1E] font-medium ml-0.5">
                                  Cảm ơn!
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {msg.sender === 'citizen' && (
                    <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] text-[#9F0C1E] flex items-center justify-center shrink-0 mt-0.5 border border-[#FECACA]">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Staggered Typing Indicator */}
            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#B90E23] text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-slate-700 font-medium">
                    Cán bộ AI đang tra cứu văn bản pháp lý...
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#B90E23] animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 rounded-full bg-[#DC2626] animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 rounded-full bg-[#FCA5A5] animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} className="h-2 shrink-0" />
          </main>

          {/* Sticky Bottom Dock (Natural scroll with Header pinned on top & Input pinned on bottom) */}
          <div className="sticky bottom-0 z-30 bg-[#F8FAFC]/95 backdrop-blur-md border-t border-slate-200/80 py-2.5 px-3 sm:px-6">
            <div className="max-w-4xl mx-auto w-full flex flex-col gap-2">
              {/* Contextual Quick Prompts Strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                <span className="text-xs font-semibold text-slate-700 shrink-0">
                  {isSimpleMode ? 'Gợi ý:' : 'Hỏi tiếp:'}
                </span>
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAsk(p.q)}
                    className={`shrink-0 rounded-full font-semibold border transition cursor-pointer gov-focus-ring ${
                      isSimpleMode
                        ? 'px-3.5 py-1.5 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#750715] border-[#FCA5A5] text-sm'
                        : 'px-3 py-1 bg-white hover:bg-[#FEF2F2] text-[#9F0C1E] border-slate-200 hover:border-[#FCA5A5] text-xs shadow-2xs'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Compact Bottom Omnibox Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAsk();
                }}
                className="flex items-center gap-2 bg-white rounded-xl border border-slate-300 px-2.5 py-1.5 shadow-2xs focus-within:border-[#B90E23] focus-within:ring-2 focus-within:ring-[#B90E23]/15"
              >
                <button
                  type="button"
                  onClick={isVoiceListening ? stopVoiceInput : startVoiceInput}
                  aria-label={isVoiceListening ? 'Dừng nghe' : 'Nói câu hỏi'}
                  className={`p-2 rounded-lg transition cursor-pointer shrink-0 gov-focus-ring ${
                    isVoiceListening
                      ? 'bg-[#DC2626] text-white'
                      : 'bg-slate-100 hover:bg-[#FEF2F2] text-[#9F0C1E]'
                  }`}
                >
                  {isVoiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  aria-label="Nhập câu hỏi thủ tục hành chính"
                  value={displayInputValue}
                  maxLength={1000}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Hỏi tiếp hoặc nhập thủ tục cần tra cứu..."
                  className={`flex-1 min-w-0 py-1.5 bg-transparent text-[#0F172A] placeholder-slate-500 focus:outline-none ${
                    isSimpleMode ? 'text-base font-medium' : 'text-sm'
                  }`}
                />

                {query && (
                  <button
                    type="button"
                    aria-label="Xóa nội dung câu hỏi"
                    onClick={() => setQuery('')}
                    className="text-slate-600 hover:text-slate-900 p-1 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="h-9 px-3.5 rounded-lg bg-[#B90E23] hover:bg-[#8F0A1B] disabled:bg-slate-300 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer disabled:cursor-not-allowed gov-focus-ring"
                >
                  <span className="sr-only sm:not-sr-only">Gửi</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {isSimpleMode && (
                <div className="p-2 px-3 rounded-lg bg-[#F7EEDF] border border-[#E5D4B3] text-[#750715] text-xs font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#B90E23] shrink-0" />
                  <span>Bấm biểu tượng micro để nói câu hỏi thay vì gõ chữ.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                <BookOpen className="w-5 h-5 text-[#B90E23]" />
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
                <span className="font-semibold text-[#9F0C1E]">
                  UBND {currentWard.name}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveCitation(null)}
              className="w-full py-2.5 bg-[#B90E23] hover:bg-[#8F0A1B] text-white text-xs sm:text-sm font-semibold rounded-md transition cursor-pointer shadow-xs gov-focus-ring"
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
