import React, { useState } from 'react';
import {
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Eye,
  EyeOff,
  BookOpen
} from 'lucide-react';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  testGeminiConnection
} from '../services/geminiClient';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [apiKey, setApiKey] = useState(getGeminiApiKey());
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Vui lòng nhập API Key trước khi kiểm tra.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const res = await testGeminiConnection(apiKey);
    setTestResult(res);
    setTesting(false);
  };

  const handleSave = () => {
    setGeminiApiKey(apiKey.trim());
    if (onSaved) onSaved();
    onClose();
  };

  const handleClear = () => {
    setApiKey('');
    setGeminiApiKey('');
    setTestResult(null);
    if (onSaved) onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#00164E]/40 backdrop-blur-xs animate-fadeIn">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl border border-[#DAE2FD] shadow-2xl p-6 md:p-8 flex flex-col gap-6"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#00236F] to-[#00687A] text-white shadow-md shadow-[#00236F]/20">
              <Sparkles className="w-6 h-6 text-[#57DFFE]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#00236F] tracking-tight">
                Cấu Hình Gemini Mini (AI Có Tư Duy)
              </h2>
              <p className="text-xs text-[#444651] font-medium mt-0.5">
                Gắn não bộ suy luận Google Gemini vào CSDL 40 TTHC của dự án
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#757682] hover:text-[#00236F] hover:bg-[#F2F3FF] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Value Proposition & Grounding Explanation */}
        <div className="p-4 rounded-2xl bg-[#F2F3FF] border border-[#EAEDFF] flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#00236F]">
            <Cpu className="w-4 h-4 text-[#00687A]" />
            <span>Cơ Chế Hoạt Động Của Gemini Trong SmartWard AI</span>
          </div>
          <p className="text-xs text-[#444651] leading-relaxed">
            Mặc định ứng dụng chạy bộ mô phỏng offline. Khi bật <strong>Gemini Flash</strong>, AI sẽ có sẵn năng lực <strong>tư duy phân tích nhạy bén</strong> để hiểu hoàn cảnh người dân, nhưng được <strong>neo chặt (Grounded RAG)</strong> vào đúng CSDL 40 thủ tục hành chính, căn cứ pháp lý và thời hạn giải quyết của dự án.
          </p>
          <div className="flex items-center gap-3 pt-1 text-[11px] text-[#00687A] font-semibold border-t border-[#DAE2FD]/60">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> 40 TTHC Cấp Xã
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Chống Ảo Giác NĐ 13
            </span>
          </div>
        </div>

        {/* Input Gemini API Key */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#131B2E] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#00236F]" />
              Google Gemini API Key
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#00687A] hover:underline font-semibold flex items-center gap-1"
            >
              Lấy key miễn phí (Google AI Studio)
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="relative flex items-center">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
              placeholder="Dán mã API Key bắt đầu bằng AIzaSy..."
              className="w-full px-4 py-3 pr-11 text-xs font-mono rounded-xl bg-white border border-[#DAE2FD] focus:outline-hidden focus:border-[#00236F] focus:ring-2 focus:ring-[#00236F]/10 transition-all text-[#131B2E]"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 p-1 text-[#757682] hover:text-[#00236F]"
              title={showKey ? 'Ẩn' : 'Hiện'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <span className="text-[10px] text-[#757682]">
            API Key chỉ lưu trên trình duyệt của bạn (Local Storage) và giao tiếp trực tiếp với Google Gemini API.
          </span>
        </div>

        {/* Test Result Alert */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
              testResult.success
                ? 'bg-[#EBFDF3] border-[#86EFAC] text-[#166534]'
                : 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16A34A]" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
            )}
            <span className="font-medium leading-snug">{testResult.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[#EAEDFF]">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-bold text-[#BA1A1A] hover:underline px-2 py-1.5"
          >
            Xóa Key (Về Offline)
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !apiKey.trim()}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-[#DAE2FD] text-[#00236F] hover:bg-[#F2F3FF] disabled:opacity-50 transition-colors"
            >
              {testing ? 'Đang thử...' : 'Kiểm Tra'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#00236F] text-white hover:bg-[#1E3A8A] shadow-md shadow-[#00236F]/20 active:scale-95 transition-all"
            >
              Lưu & Kích Hoạt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
