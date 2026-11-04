import React, { useState } from 'react';
import { askLegalRag, type RagResponse } from '../api/client';
import { Link } from 'react-router-dom';

interface ChatMessage {
  id: string;
  sender: 'citizen' | 'bot';
  text: string;
  ragData?: RagResponse;
  timestamp: string;
}

export const CitizenPortal: React.FC = () => {
  const [query, setQuery] = useState('Tôi muốn làm thủ tục đăng ký khai sinh cho cháu mới sinh cần giấy tờ gì và mất bao lâu?');
  const [loading, setLoading] = useState(false);
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
      text: 'Thủ tục này được giải quyết trong 01 ngày làm việc và hoàn toàn miễn phí lệ phí theo quy định hiện hành.',
      timestamp: '08:45',
      ragData: {
        answer: 'Thủ tục Đăng ký khai sinh lưu động / thường lệ được giải quyết trong 01 ngày làm việc (trường hợp cần xác minh thì không quá 05 ngày làm việc). Lệ phí: Miễn phí hoàn toàn khi đăng ký đúng hạn.',
        abstained: false,
        maxSimilarity: 0.942,
        appliedThreshold: 0.78,
        responseTimeMs: 18.5,
        cached: true,
        disclaimer: 'Thông tin có giá trị tham khảo và trích xuất từ Cổng Dịch vụ công Quốc gia.',
        citations: [
          {
            chunkCode: 'TTHC-HT-01_CHK_003',
            procedureCode: 'TTHC-HT-01',
            procedureName: 'Đăng ký khai sinh',
            title: 'Thành phần hồ sơ Đăng ký khai sinh',
            legalReference: 'Điều 15, 16 Luật Hộ tịch 2014 & Nghị định 123/2015/NĐ-CP',
            content: 'Người yêu cầu đăng ký khai sinh nộp Tờ khai theo mẫu và Giấy chứng sinh. Nếu không có giấy chứng sinh thì nộp văn bản của người làm chứng xác nhận về việc sinh.',
            relevanceScore: 0.942,
          },
        ],
      },
    },
  ]);

  const [activeCitation, setActiveCitation] = useState<number | null>(null);

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
    setLoading(true);

    try {
      const resp = await askLegalRag(q);
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
        text: 'Hệ thống đang bận hoặc câu hỏi cần liên hệ trực tiếp bộ phận Một cửa để được hỗ trợ cụ thể.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Top Visual Civic Banner */}
      <section className="relative w-full bg-surface-container-low px-4 md:px-8 py-10 md:py-14 overflow-hidden border-b border-outline-variant/20">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 -bottom-20 w-80 h-80 rounded-full bg-primary-fixed/30 blur-2xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto flex flex-col gap-6 relative z-10">
          {/* Authority Live State */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 bg-surface-container-lowest px-4 py-2 rounded-full shadow-xs border border-outline-variant/30">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
              <span className="text-xs md:text-sm text-primary font-bold tracking-wide">
                UBND Phường 25 • Cổng Phục Vụ Nhân Dân
              </span>
              <span className="text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md font-semibold">
                Hỗ trợ 24/7
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-xl border border-outline-variant/30">
                <span className="material-symbols-outlined text-[18px] text-secondary">verified_user</span>
                <span className="text-xs font-semibold text-on-surface">Định danh VNeID Cấp 2</span>
              </div>
            </div>
          </div>

          {/* Hero Pitch & Search */}
          <div className="max-w-3xl flex flex-col gap-2">
            <h1 className="text-2xl md:text-4xl font-bold text-primary tracking-tight">
              Bộ Phận Một Cửa Điện Tử & Trợ Lý Hướng Dẫn TTHC Phường 25
            </h1>
            <p className="text-base md:text-lg text-on-surface-variant leading-relaxed">
              Hỏi đáp thủ tục có căn cứ pháp luật rõ ràng, phát hiện lỗi tờ khai trước khi nộp, và gửi phản ánh hiện trường có định vị GPS.
            </p>
          </div>

          {/* Intelligent Legal RAG Search Box */}
          <div className="w-full bg-surface-container-lowest p-2 md:p-3 rounded-2xl shadow-md border border-outline-variant/30">
            <div className="flex flex-col md:flex-row items-stretch gap-2">
              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/40">
                <span className="material-symbols-outlined text-secondary text-[26px]">search</span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                  placeholder="Bà con cần hỏi thủ tục gì? (Ví dụ: Đăng ký kết hôn, khai sinh, thường trú, xác nhận độc thân...)"
                  className="w-full bg-transparent text-sm md:text-base text-on-surface placeholder:text-outline focus:outline-none"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-outline hover:text-on-surface p-1">
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => handleAsk()}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-secondary hover:bg-on-secondary-container text-on-secondary px-6 py-3.5 rounded-xl shadow-xs font-bold text-sm md:text-base transition-colors shrink-0 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-[20px]">refresh</span>
                    <span>Đang Tra Cứu...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">help_center</span>
                    <span>Hỏi Ngay</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3 px-2 pt-1 border-t border-outline-variant/20">
              <span className="text-xs text-on-surface-variant font-medium">Gợi ý nhanh:</span>
              {[
                'Làm giấy khai sinh cho trẻ em cần gì?',
                'Thủ tục đăng ký kết hôn tại UBND phường',
                'Xác nhận thông tin cư trú CT07',
                'Trợ cấp xã hội cho người cao tuổi',
                'Tôi muốn làm hộ chiếu ngoại giao', // Out of scope test question!
              ].map((qText, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(qText);
                    handleAsk(qText);
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-surface-container text-primary hover:bg-surface-container-high transition-colors font-medium"
                >
                  {qText}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Functional Bento Grid */}
      <section className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8 md:py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 text-secondary text-xs uppercase tracking-wider mb-1 font-bold">
              <span className="material-symbols-outlined text-[18px]">apps</span>
              <span>Dịch Vụ Trực Tuyến Thuận Tiện</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-on-surface">4 Phân Hệ Trọng Tâm Cấp Phường</h2>
          </div>
          <p className="text-sm text-on-surface-variant max-w-md">
            Hỗ trợ công dân tự kiểm tra và tương tác với UBND Phường 25 theo thời gian thực.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: Chat RAG */}
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">support_agent</span>
                </div>
                <span className="text-[11px] bg-secondary-fixed/40 text-on-secondary-fixed-variant px-2.5 py-0.5 rounded-full font-bold">
                  Legal RAG
                </span>
              </div>
              <h3 className="font-bold text-base text-on-surface mb-1">Tư Vấn Pháp Lý TTHC</h3>
              <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                Hỏi đáp điều kiện, thành phần hồ sơ và thời hạn giải quyết có trích dẫn điều khoản luật chính xác.
              </p>
            </div>
            <button
              onClick={() => {
                const el = document.getElementById('chat-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="pt-3 border-t border-outline-variant/20 flex items-center justify-between text-secondary font-bold text-xs"
            >
              <span>Trò chuyện ngay</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          {/* Card 2: Form Precheck */}
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">fact_check</span>
                </div>
                <span className="text-[11px] bg-surface-container-highest text-primary font-bold px-2.5 py-0.5 rounded-full">
                  Rule Engine
                </span>
              </div>
              <h3 className="font-bold text-base text-on-surface mb-1">Kiểm Tra Giấy Tờ Trước</h3>
              <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                Tự động kiểm tra số CCCD 12 chữ số, đối soát ngày cấp và tính hợp lệ logic của tờ khai Mẫu CT01.
              </p>
            </div>
            <Link
              to="/citizen/form"
              className="pt-3 border-t border-outline-variant/20 flex items-center justify-between text-primary font-bold text-xs"
            >
              <span>Quét tờ khai ngay</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          {/* Card 3: Civic Incident Reporting */}
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">add_location_alt</span>
                </div>
                <span className="text-[11px] bg-secondary-container text-on-secondary-container font-bold px-2.5 py-0.5 rounded-full">
                  2-Stage Triage
                </span>
              </div>
              <h3 className="font-bold text-base text-on-surface mb-1">Báo Sự Cố Hiện Trường</h3>
              <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                Gửi phản ánh ngập nước, ổ gà, rác thải hoặc đèn đường kèm GPS để hệ thống tự động phân cụm.
              </p>
            </div>
            <Link
              to="/citizen/form#report-section"
              className="pt-3 border-t border-outline-variant/20 flex items-center justify-between text-secondary font-bold text-xs"
            >
              <span>Báo sự cố khu phố</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          {/* Card 4: Officer Audit Desk */}
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center text-on-primary shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">lock_clock</span>
                </div>
                <span className="text-[11px] bg-primary-container text-on-primary font-bold px-2.5 py-0.5 rounded-full">
                  Zero-Trust
                </span>
              </div>
              <h3 className="font-bold text-base text-on-surface mb-1">Bàn Làm Việc Cán Bộ</h3>
              <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                Xem bản đồ cụm GIS và sơ duyệt tờ khai có watermark bảo mật với token tự hủy sau khi xem.
              </p>
            </div>
            <Link
              to="/officer/audit"
              className="pt-3 border-t border-outline-variant/20 flex items-center justify-between text-primary font-bold text-xs"
            >
              <span>Vào bàn làm việc</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Legal RAG Chatbot Section */}
      <section id="chat-section" className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-on-secondary shadow-xs">
            <span className="material-symbols-outlined text-[24px]">chat</span>
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-primary">Trợ Lý Tư Vấn Pháp Lý Một Cửa AI</h2>
            <span className="text-xs text-on-surface-variant font-medium">
              Chống ảo giác bằng Ngưỡng an toàn θ = 0.78 & Hậu kiểm trích dẫn điều luật
            </span>
          </div>
        </div>

        {/* Dual Column Layout: Chat Dialog (8 cols) & Guardrail Sidebar (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Chat Box */}
          <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 p-4 md:p-6 flex flex-col gap-4">
            {/* Conversation Log */}
            <div className="flex flex-col gap-5 max-h-[550px] overflow-y-auto pr-1">
              {messages.map((m) => (
                <div key={m.id} className="flex flex-col gap-2">
                  {m.sender === 'citizen' ? (
                    <div className="flex items-start justify-end gap-2">
                      <div className="max-w-xl bg-primary text-on-primary p-4 rounded-2xl rounded-tr-xs shadow-xs">
                        <div className="flex items-center gap-1.5 text-xs text-primary-fixed mb-1 font-semibold">
                          <span className="material-symbols-outlined text-[16px]">person</span>
                          <span>Bác / Anh chị hỏi:</span>
                        </div>
                        <p className="text-sm md:text-base leading-relaxed">{m.text}</p>
                        <span className="text-[10px] text-primary-fixed/70 mt-1 block text-right">{m.timestamp}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0 mt-1 shadow-xs">
                        <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                      </div>
                      <div className="w-full bg-surface-container-low p-4 rounded-2xl rounded-tl-xs border border-outline-variant/30 flex flex-col gap-3 shadow-xs">
                        {/* If abstained (Out-of-scope / Trap Question) */}
                        {m.ragData?.abstained ? (
                          <div className="p-3.5 rounded-xl bg-error-container/30 border border-error/40 flex items-start gap-3">
                            <span className="material-symbols-outlined text-error text-[24px] shrink-0 mt-0.5">
                              shield_with_heart
                            </span>
                            <div>
                              <span className="text-xs font-bold text-error uppercase tracking-wider block mb-0.5">
                                Chốt Chặn Từ Chối An Toàn (Abstention Guardrail θ = 0.78)
                              </span>
                              <p className="text-sm font-semibold text-on-surface">{m.ragData.answer}</p>
                              {m.ragData.abstentionReason && (
                                <span className="text-xs text-on-surface-variant mt-1 block italic">
                                  Lý do: {m.ragData.abstentionReason}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Standard In-Scope Answer */}
                            <div className="p-3.5 rounded-xl bg-surface-container-lowest border-l-4 border-l-secondary border border-outline-variant/20 shadow-xs flex items-start gap-3">
                              <span className="material-symbols-outlined text-secondary text-[26px] shrink-0 mt-0.5">
                                check_circle
                              </span>
                              <div className="flex-1">
                                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-0.5">
                                  Kết Quả Tư Vấn Hành Chính
                                </span>
                                <p className="text-sm md:text-base text-primary font-medium leading-relaxed">
                                  {m.ragData?.answer || m.text}
                                </p>
                              </div>
                            </div>

                            {/* Citations & Legal Basis */}
                            {m.ragData?.citations && m.ragData.citations.length > 0 && (
                              <div className="flex flex-col gap-2 pt-1">
                                <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[16px] text-primary">gavel</span>
                                  Căn Cứ Pháp Lý Được Kiểm Chứng:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {m.ragData.citations.map((c, i) => (
                                    <div key={i} className="relative">
                                      <button
                                        onClick={() => setActiveCitation(activeCitation === i ? null : i)}
                                        className="text-xs px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-semibold border border-outline-variant/30 flex items-center gap-1 transition-colors"
                                      >
                                        <span className="material-symbols-outlined text-[14px] text-secondary">
                                          menu_book
                                        </span>
                                        <span>{c.legalReference}</span>
                                        <span className="material-symbols-outlined text-[14px]">
                                          {activeCitation === i ? 'expand_less' : 'expand_more'}
                                        </span>
                                      </button>

                                      {activeCitation === i && (
                                        <div className="absolute left-0 bottom-full mb-2 w-80 md:w-96 p-3 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/40 z-30 text-xs">
                                          <div className="font-bold text-secondary mb-1">{c.title}</div>
                                          <p className="text-on-surface leading-relaxed">{c.content}</p>
                                          <div className="mt-2 pt-1 border-t border-outline-variant/20 flex justify-between text-[10px] text-on-surface-variant font-mono">
                                            <span>Mã: {c.chunkCode}</span>
                                            <span>Độ khớp: {(c.relevanceScore * 100).toFixed(1)}%</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Telemetry pill */}
                            {m.ragData && (
                              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-on-surface-variant font-mono">
                                <span>Độ tương đồng: {(m.ragData.maxSimilarity * 100).toFixed(1)}%</span>
                                <span>Thời gian: {m.ragData.responseTimeMs}ms</span>
                                {m.ragData.cached && (
                                  <span className="px-1.5 py-0.2 rounded bg-secondary-fixed text-on-secondary-fixed font-bold">
                                    CACHE HIT
                                  </span>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/30">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                placeholder="Nhập thắc mắc về thủ tục hành chính tại Phường 25..."
                className="flex-1 bg-surface-container-low px-4 py-3 rounded-xl text-sm text-on-surface placeholder:text-outline focus:outline-none border border-outline-variant/30"
              />
              <button
                onClick={() => handleAsk()}
                disabled={loading}
                className="w-11 h-11 rounded-xl bg-primary hover:bg-primary-container text-on-primary flex items-center justify-center transition-colors shadow-xs disabled:opacity-50 shrink-0"
                title="Gửi câu hỏi"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </div>
          </div>

          {/* Right Column: Safe Guardrail Info Box */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-surface-container-lowest p-5 rounded-2xl border-2 border-secondary/30 shadow-xs flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <span className="material-symbols-outlined text-[22px] text-secondary">info</span>
                <span>Lưu Ý Về Thẩm Quyền Giải Quyết</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs text-on-surface leading-relaxed">
                Các thủ tục như <strong className="text-primary">Cấp đổi bằng lái xe</strong>,{' '}
                <strong className="text-primary">Làm thẻ CCCD mới</strong>, hoặc{' '}
                <strong className="text-primary">Đăng ký doanh nghiệp</strong> thuộc thẩm quyền cấp Quận/Sở/Bộ,{' '}
                <span className="text-error font-semibold">không giải quyết tại UBND Phường</span>.
              </div>
              <p className="text-xs text-on-surface-variant">
                Hệ thống SmartWard AI sẽ chủ động từ chối và hướng dẫn bà con tới đúng cơ quan chuyên môn để tránh mất thời gian.
              </p>
              <a
                href="https://dichvucong.gov.vn"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-bold text-xs transition-colors"
              >
                <span>Cổng Dịch Vụ Công Quốc Gia</span>
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </a>
            </div>

            {/* Hot line support for elder citizens */}
            <div className="bg-primary text-on-primary p-5 rounded-2xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-primary-fixed block">Tổng đài hỗ trợ người dân:</span>
                <span className="text-xl font-bold tracking-wider font-mono">1900-25-SMART</span>
                <span className="text-[11px] text-primary-fixed/80 block mt-0.5">Miễn cước cho bà con</span>
              </div>
              <a
                href="tel:1900257627"
                className="w-11 h-11 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-md hover:scale-105 transition-transform"
              >
                <span className="material-symbols-outlined text-[22px]">call</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CitizenPortal;

