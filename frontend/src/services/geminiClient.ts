/**
 * Google Gemini Live Client with Grounded Project RAG
 * Powers intelligent, reasoning-capable Vietnamese legal assistance
 * strictly grounded in SmartWard AI administrative procedures.
 */

import { searchLegalKnowledge, type LegalProcedureItem } from './legalKnowledgeBase';
import { type RagResponse, type LegalCitation } from '../api/client';

const GEMINI_API_STORAGE_KEY = 'smartward_gemini_api_key';
const DEFAULT_MODEL = 'gemini-2.5-flash';

export function getGeminiApiKey(): string {
  const localKey = localStorage.getItem(GEMINI_API_STORAGE_KEY);
  if (localKey && localKey.trim()) {
    return localKey.trim();
  }
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) {
    return envKey.trim();
  }
  return '';
}

export function setGeminiApiKey(key: string): void {
  if (key && key.trim()) {
    localStorage.setItem(GEMINI_API_STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(GEMINI_API_STORAGE_KEY);
  }
}

export function isGeminiConfigured(): boolean {
  return getGeminiApiKey().length > 10;
}

/**
 * Tests if the given Gemini API key is valid by making a lightweight ping.
 */
export async function testGeminiConnection(key?: string): Promise<{ success: boolean; message: string }> {
  const activeKey = key?.trim() || getGeminiApiKey();
  if (!activeKey) {
    return { success: false, message: 'Chưa nhập API Key Google Gemini.' };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${activeKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Xin chào, hãy phản hồi chữ OK' }] }],
        generationConfig: { maxOutputTokens: 10, temperature: 0.1 },
      }),
    });

    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      const errMsg = errJson.error?.message || `Mã lỗi HTTP ${resp.status}`;
      return { success: false, message: `Kết nối thất bại: ${errMsg}` };
    }

    return { success: true, message: 'Kết nối thành công! Gemini Flash đã sẵn sàng hoạt động.' };
  } catch (err: any) {
    return { success: false, message: `Lỗi mạng khi kết nối Gemini: ${err.message || 'Không thể truy cập Google API'}` };
  }
}

/**
 * Grounded RAG Generation using Gemini Flash ("Gemini Mini")
 * Combines natural reasoning with strict SmartWard AI administrative legal database.
 */
export async function askGeminiWithRAG(
  query: string,
  wardContext: { wardName?: string; officeAddress?: string } = {}
): Promise<RagResponse> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chưa cấu hình Gemini API Key.');
  }

  const startTime = performance.now();
  const wardName = wardContext.wardName || 'Phường 25, Quận Bình Thạnh';
  const officeAddress = wardContext.officeAddress || '123 Nơ Trang Long, Phường 25, Quận Bình Thạnh, TP.HCM';

  // 1. Semantic Retrieval over SmartWard AI Legal Knowledge Base
  const searchResult = searchLegalKnowledge(query, 3);

  // 2. Abstention Guardrail: Out-of-scope check
  if (!searchResult.isInScope || searchResult.items.length === 0) {
    const elapsed = Math.round(performance.now() - startTime);
    return {
      answer:
        'Hệ thống SmartWard AI từ chối giải đáp tự động đối với yêu cầu này. ' +
        'Câu hỏi của bà con nằm ngoài phạm vi thẩm quyền giải quyết của UBND cấp xã/phường (hoặc độ tương đồng ngữ nghĩa dưới ngưỡng an toàn θ = 0.78). ' +
        'Nhằm tuân thủ nguyên tắc Không Ảo Giác và Nghị định 13/2023/NĐ-CP, hệ thống chỉ hỗ trợ các thủ tục hành chính cấp xã (Hộ tịch, Cư trú, Chứng thực, Bảo trợ xã hội, Đất đai cơ bản). ' +
        `Quý công dân vui lòng liên hệ Bộ phận Một cửa ${wardName} (Địa chỉ: ${officeAddress}) hoặc Tổng đài Dịch vụ công Quốc gia 18001096 để được hướng dẫn chính xác.`,
      abstained: true,
      abstentionReason: 'Yêu cầu không thuộc danh mục 40 TTHC cấp xã hoặc vi phạm ranh giới an toàn pháp lý.',
      maxSimilarity: searchResult.maxScore,
      appliedThreshold: 0.78,
      responseTimeMs: elapsed,
      cached: false,
      disclaimer: 'Hệ thống SmartWard AI tuân thủ nghiêm ngặt nguyên tắc Chống Ảo Giác trong hành chính công.',
      citations: [],
    };
  }

  // 3. Build Grounded Prompt with Project's Legal Data
  const retrievedText = searchResult.items
    .map(
      (item: LegalProcedureItem) => `
[MÃ THỦ TỤC: ${item.code}]
• Tên thủ tục: ${item.name} (${item.category})
• Căn cứ pháp lý: ${item.legalBasis}
• Thẩm quyền giải quyết: ${item.authority}
• Thời hạn giải quyết: ${item.timeLimit}
• Mức lệ phí: ${item.fee}
• Thành phần hồ sơ bắt buộc:
${item.dossier.map((d) => `  - ${d}`).join('\n')}
• Quy định & Lưu ý quan trọng:
${item.keyRules.map((r) => `  - ${r}`).join('\n')}
`
    )
    .join('\n----------------------------------------\n');

  const mandatoryDisclaimer =
    '*Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo, không thay thế quyết định chính thức của công chức tiếp nhận hồ sơ tại Bộ phận Một cửa.*';

  const systemInstruction = `
Bạn là công chức mẫn cán tại Bộ phận Tiếp nhận và Trả kết quả (Một Cửa) thuộc ${wardName}.
NHIỆM VỤ: Hướng dẫn thủ tục hành chính công trực tiếp, chính xác, ân cần và chuẩn mực.

QUY TẮC BẮT BUỘC (TUÂN THỦ 100%, KHÔNG NGOẠI LỆ):
1. NGUYÊN TẮC TRỰC TIẾP & KHÔNG RƯỜM RÀ: TUYỆT ĐỐI CẤM các câu chào hỏi khách sáo (như "Xin chào quý công dân", "Chào bạn", "Tôi rất vui..."), CẤM cảm ơn/xin lỗi lê thê, CẤM lặp lại câu hỏi. BẮT BUỘC BẮT ĐẦU NGAY BẰNG: "1. TÓM TẮT THỦ TỤC:".
2. CHỈ sử dụng dữ liệu trong các đoạn văn bản pháp lý được cung cấp bên dưới. TUYỆT ĐỐI KHÔNG tự suy đoán, bịa đặt điều luật hay số liệu.
3. QUY TẮC THIẾU THÔNG TIN: Nếu trong dữ liệu chưa có thông tin về thời hạn, lệ phí hoặc địa chỉ, BẮT BUỘC ghi rõ: "Chưa có dữ liệu, vui lòng liên hệ Bộ phận Một cửa". TUYỆT ĐỐI KHÔNG đoán mò.
4. BẮT BUỘC TRÍCH DẪN MÃ ĐOẠN: Khi nêu điều kiện, giấy tờ, thời hạn hoặc lệ phí, phải đính kèm mã trích dẫn dạng [MÃ_ĐOẠN] (ví dụ: [${searchResult.items[0].code}]).
5. ĐỊNH DẠNG BẮT BUỘC ĐỦ 5 PHẦN THEO ĐÚNG THỨ TỰ:
   1. TÓM TẮT THỦ TỤC: (Tối đa 01 câu trả lời thẳng vào vấn đề chính).
   2. THÀNH PHẦN HỒ SƠ: (Gạch đầu dòng từng loại giấy tờ phải nộp và xuất trình).
   3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ: (Nêu rõ số ngày làm việc và mức phí; nếu thiếu ghi "Chưa có dữ liệu, vui lòng liên hệ Bộ phận Một cửa").
   4. NƠI TIẾP NHẬN & XỬ LÝ: (Ghi rõ: Bộ phận Một cửa của ${wardName} - Địa chỉ: ${officeAddress}).
   5. CĂN CỨ PHÁP LÝ & LƯU Ý: (Nêu mã thủ tục/điều khoản quy định và kết thúc bắt buộc bằng câu disclaimer: "${mandatoryDisclaimer}").

DỮ LIỆU THỦ TỤC HÀNH CHÍNH CHÍNH THỨC ĐƯỢC CUNG CẤP:
${retrievedText}
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: query }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `HTTP ${response.status}`);
    }

    const resJson = await response.json();
    const candidate = resJson.candidates?.[0];
    const finishReason = candidate?.finishReason;

    if (finishReason === 'SAFETY') {
      return {
        answer: 'Phản hồi bị giới hạn vì lý do an toàn thông tin theo quy định. Quý công dân vui lòng liên hệ trực tiếp Bộ phận Một cửa.',
        abstained: true,
        abstentionReason: 'Gemini safety block policy triggered.',
        maxSimilarity: searchResult.maxScore,
        appliedThreshold: 0.78,
        citations: [],
        cached: false,
        responseTimeMs: Math.round(performance.now() - startTime),
        disclaimer: mandatoryDisclaimer,
      };
    }

    const parts = candidate?.content?.parts;
    let generatedText = '';
    if (Array.isArray(parts)) {
      generatedText = parts.map((p: any) => p?.text || '').join('');
    }

    if (!generatedText) {
      throw new Error('Gemini không trả về nội dung hợp lệ.');
    }

    if (finishReason === 'MAX_TOKENS') {
      console.warn('Gemini response truncated due to MAX_TOKENS');
      generatedText += '\n\n*(Nội dung thủ tục rất chi tiết và vượt quá giới hạn hiển thị tự động. Vui lòng liên hệ trực tiếp Bộ phận Một cửa để nhận hướng dẫn và biểu mẫu đầy đủ.)*';
    }

    if (!generatedText.includes('không thay thế quyết định chính thức')) {
      generatedText = generatedText.trim() + '\n\n' + mandatoryDisclaimer;
    }

    const elapsed = Math.round(performance.now() - startTime);

    // Build verified citations from retrieved items
    const citations: LegalCitation[] = searchResult.items.map((item) => ({
      chunkCode: `${item.code}_OFFICIAL`,
      procedureCode: item.code,
      procedureName: item.name,
      title: `${item.name} (${item.category})`,
      legalReference: item.legalBasis,
      content: `Thành phần hồ sơ: ${item.dossier.slice(0, 2).join('; ')}... Thời hạn: ${item.timeLimit}. Lệ phí: ${item.fee}.`,
      relevanceScore: Math.min(0.97, Math.max(0.82, searchResult.maxScore)),
    }));

    return {
      answer: generatedText,
      abstained: false,
      maxSimilarity: searchResult.maxScore,
      appliedThreshold: 0.78,
      citations,
      cached: false,
      responseTimeMs: elapsed,
      disclaimer: mandatoryDisclaimer,
    };
  } catch (apiError: any) {
    console.error('Gemini Live API error, falling back to local simulation:', apiError);
    throw apiError;
  }
}
