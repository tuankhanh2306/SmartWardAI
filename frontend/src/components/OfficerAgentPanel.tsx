import React, { useState } from 'react';
import { Bot, Loader2, Send, Sparkles, X } from 'lucide-react';
import { askOfficerAgent, type AgentChatResponse } from '../api/client';
import { AgentActionCards } from './AgentActionCards';

interface OfficerAgentPanelProps {
  wardName: string;
  wardCode: string;
  onClose: () => void;
}

const OFFICER_QUICK_PROMPTS = [
  'Tuần này xã mình có bao nhiêu hồ sơ sắp quá hạn SLA và cụm sự cố nào tồn đọng?',
  'Thủ tục nào đang tồn đọng hoặc trả bổ sung nhiều nhất tại địa bàn?',
];

export const OfficerAgentPanel: React.FC<OfficerAgentPanelProps> = ({
  wardName,
  wardCode,
  onClose,
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AgentChatResponse | null>(null);

  const handleSend = async (promptText?: string) => {
    const q = (promptText ?? input).trim();
    if (!q || loading) return;
    setInput('');
    setLoading(true);
    setErrorMsg(null);
    try {
      const resp = await askOfficerAgent(q);
      setResult(resp);
    } catch {
      setErrorMsg('Không thể kết nối Trợ lý AI Vận hành lúc này. Vui lòng thử lại khi máy chủ sẵn sàng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 mt-4 w-full">
      <div className="p-4 rounded-2xl bg-white border border-[#94A3B8] shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#0F2942] text-[#38BDF8] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-[#0F2942] truncate">
                Trợ lý AI Vận hành — UBND {wardName} ({wardCode})
              </h3>
              <p className="text-[11px] text-slate-500">
                Thống kê SLA hồ sơ, thủ tục tồn đọng &amp; cụm sự cố theo địa bàn phân công (SEC-09)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
            aria-label="Đóng trợ lý AI cán bộ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {OFFICER_QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={() => void handleSend(q)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50 text-left"
            >
              <Sparkles className="w-3 h-3 text-[#00796B] shrink-0" />
              <span>{q}</span>
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi nhanh thống kê SLA, hồ sơ trả bổ sung, hoặc quy định nghiệp vụ..."
            className="flex-1 min-w-0 px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-xl bg-[#0F2942] hover:bg-[#1E3A5F] text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Hỏi AI</span>
          </button>
        </form>

        {errorMsg && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            {errorMsg}
          </p>
        )}

        {result && (
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
            <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {result.answer}
            </p>
            <AgentActionCards steps={result.steps} cards={result.actionCards} />
          </div>
        )}
      </div>
    </div>
  );
};
