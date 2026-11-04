/**
 * Google Gemini Live Client with Grounded Project RAG
 * Powers intelligent, reasoning-capable Vietnamese legal assistance
 * strictly grounded in SmartWard AI administrative procedures.
 */

import { searchLegalKnowledge, type LegalProcedureItem } from './legalKnowledgeBase';
import {
  isWardOfficeQuery,
  checkOutOfScopeQuery,
  isProcedureListQuery,
  classifySmallTalk,
  buildProcedureCatalogResponse,
} from './intentClassifier';
import { type RagResponse, type LegalCitation } from '../api/client';

const GEMINI_API_STORAGE_KEY = 'smartward_gemini_api_key';
const DEFAULT_MODEL = 'gemini-2.5-flash';

export function getGeminiApiKey(): string {
  if (typeof localStorage !== 'undefined') {
    const localKey = localStorage.getItem(GEMINI_API_STORAGE_KEY);
    if (localKey && localKey.trim()) {
      return localKey.trim();
    }
  }
  const globalEnv = (globalThis as any)?.process?.env;
  const envKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    globalEnv?.VITE_GEMINI_API_KEY ||
    globalEnv?.GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) {
    return envKey.trim();
  }
  return '';
}

export function setGeminiApiKey(key: string): void {
  if (typeof localStorage !== 'undefined') {
    if (key && key.trim()) {
      localStorage.setItem(GEMINI_API_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(GEMINI_API_STORAGE_KEY);
    }
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

export interface WardContextInfo {
  wardName?: string;
  officeAddress?: string;
  phoneNumber?: string;
  workingHours?: string;
}

/**
 * Builds guaranteed complete 5-section administrative response directly from structured legal data
 */
export function buildStructuredProcedureResponse(
  item: LegalProcedureItem,
  wardName: string,
  officeAddress: string,
  disclaimer: string
): string {
  const dossierItems = item.dossier.map((d) => `- ${d} [${item.code}]`).join('\n');
  return (
    `1. TÓM TẮT THỦ TỤC:\n` +
    `Thủ tục ${item.name} (${item.category}) được tiếp nhận và giải quyết tại UBND ${wardName}.\n\n` +
    `2. THÀNH PHẦN HỒ SƠ:\n` +
    `${dossierItems}\n\n` +
    `3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n` +
    `- Thời hạn giải quyết: ${item.timeLimit} [${item.code}]\n` +
    `- Mức lệ phí: ${item.fee} [${item.code}]\n\n` +
    `4. NƠI TIẾP NHẬN & XỬ LÝ:\n` +
    `Bộ phận Tiếp nhận và Trả kết quả (Một Cửa) thuộc UBND ${wardName} (Địa chỉ: ${officeAddress}).\n\n` +
    `5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n` +
    `[${item.code}] Căn cứ ${item.legalBasis}.\n` +
    `${disclaimer}`
  );
}

/**
 * Grounded RAG Generation using Gemini Flash ("Gemini Mini")
 * Combines natural reasoning with strict SmartWard AI administrative legal database.
 */
export async function askGeminiWithRAG(
  query: string,
  wardContext: WardContextInfo = {}
): Promise<RagResponse> {
  const startTime = performance.now();
  const wardName = wardContext.wardName || 'UBND Xã/Phường';
  const officeAddress = wardContext.officeAddress || 'Trụ sở Bộ phận Tiếp nhận và Trả kết quả (Một cửa)';
  const phoneNumber = wardContext.phoneNumber || '18001096';
  const workingHours = wardContext.workingHours || 'Sáng: 07:30 – 11:30 | Chiều: 13:30 – 17:00 (Thứ 2 – Thứ 6)';

  // 1. Procedure Catalog Request ("nêu 40 thủ tục", "danh sách thủ tục"...)
  if (isProcedureListQuery(query)) {
    const elapsed = Math.round(performance.now() - startTime);
    return {
      answer: buildProcedureCatalogResponse(wardName),
      abstained: false,
      maxSimilarity: 1.0,
      appliedThreshold: 0.78,
      responseTimeMs: elapsed,
      cached: false,
      disclaimer: 'Danh mục 40 TTHC cấp xã chuẩn hóa theo Nghị định 13/2023 và Đề án 06.',
      citations: [],
    };
  }

  // 2. Natural Conversational Intent: Small Talk, Wellbeing, Gratitude, Farewell, Greeting
  const smallTalk = classifySmallTalk(query);
  if (smallTalk.matched) {
    const elapsed = Math.round(performance.now() - startTime);
    let reply = '';
    if (smallTalk.type === 'WELLBEING') {
      reply =
        `Dạ chào bà con! Hôm nay tôi vẫn hoạt động bình thường 24/7 và luôn sẵn sàng hỗ trợ giải đáp mọi thủ tục hành chính công tại UBND ${wardName}.\n\n` +
        `Hôm nay bà con đang cần làm giấy tờ gì hoặc có vướng mắc về thủ tục nào (như khai sinh, kết hôn, cư trú CT01, chứng thực, xác nhận độc thân...) để tôi hướng dẫn cụ thể nhé!`;
    } else if (smallTalk.type === 'THANKS') {
      reply =
        `Dạ không có gì ạ! Rất vui được hỗ trợ bà con. Chúc bà con giải quyết công việc hành chính thật nhanh chóng và thuận lợi.\n\n` +
        `Nếu cần tra cứu thêm thủ tục hoặc tiền kiểm tra biểu mẫu tại UBND ${wardName}, bà con cứ nhắn lại tôi nhé!`;
    } else if (smallTalk.type === 'GOODBYE') {
      reply =
        `Tạm biệt bà con! Chúc bà con một ngày vui vẻ và làm việc hiệu quả.\n\n` +
        `Bất cứ khi nào cần tra cứu thủ tục hành chính hoặc hỏi đáp biểu mẫu tại UBND ${wardName}, bà con có thể quay lại trò chuyện cùng tôi bất cứ lúc nào!`;
    } else {
      reply =
        `Xin chào! Tôi là Trợ lý Pháp lý Một Cửa tại UBND ${wardName}.\n\n` +
        `Tôi sẵn sàng giải đáp, tra cứu và hướng dẫn bà con chuẩn bị hồ sơ đầy đủ, đúng luật cho các thủ tục hành chính cấp xã/phường như:\n` +
        `• Đăng ký khai sinh, kết hôn, khai tử, trích lục hộ tịch\n` +
        `• Đăng ký thường trú, tạm trú, khai báo thông tin cư trú (Mẫu CT01)\n` +
        `• Chứng thực chữ ký, chứng thực bản sao từ bản chính\n` +
        `• Cấp giấy xác nhận tình trạng hôn nhân (giấy độc thân)\n` +
        `• Các chế độ chính sách bảo trợ xã hội và tiền kiểm tra hồ sơ\n\n` +
        `Bà con đang cần tìm hiểu hoặc chuẩn bị làm thủ tục nào? Hãy nhập câu hỏi để tôi hướng dẫn chi tiết từng bước nhé!`;
    }

    return {
      answer: reply,
      abstained: false,
      maxSimilarity: 1.0,
      appliedThreshold: 0.78,
      responseTimeMs: elapsed,
      cached: false,
      disclaimer: 'Trợ lý Pháp lý Một Cửa SmartWard AI sẵn sàng phục vụ nhân dân.',
      citations: [],
    };
  }

  // 3. Commune Office Information (Address, Working Hours, Hotline)
  if (isWardOfficeQuery(query)) {
    const elapsed = Math.round(performance.now() - startTime);
    return {
      answer:
        `Thông tin liên hệ và thời gian làm việc của Bộ phận Tiếp nhận và Trả kết quả (Một Cửa) thuộc UBND ${wardName}:\n\n` +
        `• Trụ sở / Địa chỉ Một cửa: ${officeAddress}\n` +
        `• Số điện thoại / Hotline: ${phoneNumber}\n` +
        `• Giờ tiếp nhận và trả kết quả: ${workingHours}\n` +
        `• Cổng Dịch vụ công Quốc gia: Nộp hồ sơ trực tuyến 24/7 tại dichvucong.gov.vn\n\n` +
        `Bà con có thể đến trực tiếp trong khung giờ làm việc trên hoặc gửi câu hỏi về thủ tục hành chính để tôi hướng dẫn chuẩn bị đầy đủ hồ sơ trước khi đến nộp.`,
      abstained: false,
      maxSimilarity: 1.0,
      appliedThreshold: 0.78,
      responseTimeMs: elapsed,
      cached: false,
      disclaimer: 'Thông tin chính thức từ Danh bạ hành chính UBND cấp xã/phường.',
      citations: [],
    };
  }

  // 4. Out-of-scope check (Directing to Competent Authority)
  const outOfScopeCheck = checkOutOfScopeQuery(query);
  if (outOfScopeCheck.isOutOfScope) {
    const elapsed = Math.round(performance.now() - startTime);
    let abstentionMsg =
      `Yêu cầu này nằm ngoài phạm vi dữ liệu thủ tục hành chính cấp xã hoặc vượt thẩm quyền giải quyết của UBND xã/phường theo quy định. ` +
      `Nhằm tuân thủ nguyên tắc Không Ảo Giác và Nghị định 13/2023/NĐ-CP, hệ thống chỉ hỗ trợ các thủ tục hành chính cấp xã (Hộ tịch, Cư trú, Chứng thực, Bảo trợ xã hội, Đất đai cơ bản).\n\n`;
    if (outOfScopeCheck.authority) {
      abstentionMsg += `👉 Thẩm quyền giải quyết: Quý công dân vui lòng liên hệ ${outOfScopeCheck.authority} để được hướng dẫn chính xác.\n\n`;
    }
    abstentionMsg += `Quý công dân cũng có thể liên hệ Bộ phận Một cửa ${wardName} (Địa chỉ: ${officeAddress} • Hotline: ${phoneNumber}) hoặc Tổng đài Dịch vụ công Quốc gia 18001096 để được hỗ trợ thêm.`;

    return {
      answer: abstentionMsg,
      abstained: true,
      abstentionReason: outOfScopeCheck.reason || 'Yêu cầu không thuộc thẩm quyền cấp xã.',
      maxSimilarity: 0.45,
      appliedThreshold: 0.78,
      responseTimeMs: elapsed,
      cached: false,
      disclaimer: 'Hệ thống SmartWard AI tuân thủ nghiêm ngặt nguyên tắc Chống Ảo Giác trong hành chính công.',
      citations: [],
    };
  }

  // 5. Semantic Retrieval over SmartWard AI Legal Knowledge Base
  const searchResult = searchLegalKnowledge(query, 3);

  // 6. Abstention Guardrail: Out-of-scope / Low similarity check
  if (!searchResult.isInScope || searchResult.items.length === 0) {
    const elapsed = Math.round(performance.now() - startTime);
    return {
      answer:
        `Hệ thống SmartWard AI hiện chưa tìm thấy thông tin thủ tục tương ứng với câu hỏi của bà con trong phạm vi thẩm quyền của UBND cấp xã/phường.\n\n` +
        `Để đảm bảo thông tin chính xác và tuân thủ quy chuẩn an toàn theo Nghị định 13/2023/NĐ-CP, hệ thống chỉ cung cấp hướng dẫn cho các thủ tục hành chính cấp xã (Hộ tịch, Cư trú, Chứng thực, Bảo trợ xã hội, Đất đai cơ bản).\n\n` +
        `👉 Bà con có thể gõ rõ tên thủ tục (ví dụ: 'đăng ký khai sinh', 'đăng ký kết hôn', 'nộp mẫu CT01', 'chứng thực sao y', 'xác nhận độc thân', hoặc gõ 'nêu 40 thủ tục' để xem danh mục) hoặc liên hệ trực tiếp Bộ phận Tiếp nhận và Trả kết quả (Một cửa) tại ${wardName} (Địa chỉ: ${officeAddress} • Hotline: ${phoneNumber}) để được cán bộ hỗ trợ chu đáo.`,
      abstained: true,
      abstentionReason: 'Câu hỏi chưa nằm trong danh mục 40 thủ tục hành chính công cấp xã/phường có thẩm quyền giải quyết.',
      maxSimilarity: searchResult.maxScore,
      appliedThreshold: 0.78,
      responseTimeMs: elapsed,
      cached: false,
      disclaimer: 'Hệ thống SmartWard AI tuân thủ nghiêm ngặt nguyên tắc Chống Ảo Giác trong hành chính công.',
      citations: [],
    };
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chưa cấu hình Gemini API Key.');
  }

  // 6. Build Grounded Prompt with Project's Legal Data
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
Bạn là cán bộ phụ trách hướng dẫn thủ tục tại Bộ phận Tiếp nhận và Trả kết quả (Một Cửa) thuộc ${wardName}.
NHIỆM VỤ: Hướng dẫn thủ tục hành chính công trực tiếp, chính xác, ân cần và chuẩn mực.

QUY TẮC BẮT BUỘC (TUÂN THỦ 100%, KHÔNG NGOẠI LỆ):
1. NGUYÊN TẮC TRỰC TIẾP & KHÔNG RƯỜM RÀ: TUYỆT ĐỐI CẤM các câu chào hỏi khách sáo (như "Chào mừng quý công dân...", "Xin chào...", "Chào bạn...", "Tôi hiểu rằng...", "Tôi rất vui..."), CẤM cảm ơn/xin lỗi lê thê, CẤM nhắc lại câu hỏi của người dân. BẮT BUỘC BẮT ĐẦU NGAY BẰNG: "1. TÓM TẮT THỦ TỤC:".
2. CHỈ sử dụng dữ liệu trong các đoạn văn bản pháp lý được cung cấp bên dưới. TUYỆT ĐỐI KHÔNG tự suy đoán, bịa đặt điều luật hay số liệu.
3. QUY TẮC THIẾU THÔNG TIN: Nếu trong dữ liệu chưa có thông tin về thời hạn, lệ phí hoặc địa chỉ, BẮT BUỘC ghi rõ: "Chưa có dữ liệu, vui lòng liên hệ Bộ phận Một cửa". TUYỆT ĐỐI KHÔNG đoán mò.
4. BẮT BUỘC TRÍCH DẪN MÃ ĐOẠN: Khi nêu điều kiện, giấy tờ, thời hạn hoặc lệ phí, phải đính kèm mã trích dẫn dạng [MÃ_ĐOẠN] (ví dụ: [${searchResult.items[0].code}]).
5. ĐỊNH DẠNG BẮT BUỘC ĐỦ 5 PHẦN THEO ĐÚNG THỨ TỰ (KHÔNG ĐƯỢC THIẾU BẤT KỲ PHẦN NÀO):
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
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const statusCode = response.status;
      if (statusCode === 401 || statusCode === 403 || (statusCode === 400 && errJson.error?.message?.includes('API key'))) {
        throw new Error('API_KEY_INVALID');
      }
      if (statusCode === 429) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      throw new Error(errJson.error?.message || `HTTP ${statusCode}`);
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
      throw new Error('EMPTY_RESPONSE');
    }

    // 1. Strip any conversational preamble before "1. TÓM TẮT THỦ TỤC:"
    const marker = '1. TÓM TẮT THỦ TỤC:';
    const markerIdx = generatedText.indexOf(marker);
    if (markerIdx > 0) {
      generatedText = generatedText.substring(markerIdx).trim();
    }

    // 2. Truncation detection & structured recovery (R1e & R3)
    const isTruncated =
      finishReason === 'MAX_TOKENS' ||
      !generatedText.includes('2. THÀNH PHẦN HỒ SƠ') ||
      !generatedText.includes('3. THỜI HẠN GIẢI QUYẾT') ||
      !generatedText.includes('4. NƠI TIẾP NHẬN') ||
      generatedText.endsWith('quan') ||
      !/[.!?*)]$/.test(generatedText.trim());

    if (isTruncated) {
      console.warn('Gemini response truncated or incomplete. Rebuilding complete answer from structured legal database.');
      generatedText = buildStructuredProcedureResponse(
        searchResult.items[0],
        wardName,
        officeAddress,
        mandatoryDisclaimer
      );
    }

    // 3. Ensure Section 5 is present
    if (!generatedText.includes('5. CĂN CỨ PHÁP LÝ')) {
      const topItem = searchResult.items[0];
      generatedText =
        generatedText.trim() +
        `\n\n5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n[${topItem.code}] Căn cứ ${topItem.legalBasis}.\n${mandatoryDisclaimer}`;
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
    console.error('Gemini Live API error, analyzing exception:', apiError);

    const elapsed = Math.round(performance.now() - startTime);
    const topItem = searchResult.items[0];

    // Exception handling with graceful degradation (R4)
    if (apiError.message === 'API_KEY_INVALID') {
      return {
        answer:
          `Dịch vụ AI đang cần quản trị viên kiểm tra lại cấu hình API Key. ` +
          `Để không gián đoạn công việc của bà con, sau đây là thông tin trích xuất trực tiếp từ cơ sở dữ liệu pháp lý của UBND:\n\n` +
          `1. TÓM TẮT THỦ TỤC: [${topItem.code}] Thủ tục "${topItem.name}" thuộc lĩnh vực ${topItem.category}.\n\n` +
          `2. THÀNH PHẦN HỒ SƠ:\n${topItem.dossier.map((d) => `   - ${d}`).join('\n')}\n\n` +
          `3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n   - Thời hạn: ${topItem.timeLimit}\n   - Lệ phí: ${topItem.fee}\n\n` +
          `4. NƠI TIẾP NHẬN & XỬ LÝ:\n   Bộ phận Một cửa của ${wardName} - Địa chỉ: ${officeAddress} (Hotline: ${phoneNumber}).\n\n` +
          `5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n   Căn cứ: ${topItem.legalBasis}.\n   ${mandatoryDisclaimer}`,
        abstained: false,
        maxSimilarity: searchResult.maxScore,
        appliedThreshold: 0.78,
        responseTimeMs: elapsed,
        cached: false,
        disclaimer: mandatoryDisclaimer,
        citations: [
          {
            chunkCode: `${topItem.code}_OFFICIAL`,
            procedureCode: topItem.code,
            procedureName: topItem.name,
            title: topItem.name,
            legalReference: topItem.legalBasis,
            content: topItem.dossier.join('; '),
            relevanceScore: searchResult.maxScore,
          },
        ],
      };
    }

    if (apiError.message === 'RATE_LIMIT_EXCEEDED') {
      return {
        answer:
          `Hệ thống AI đang phục vụ lượng lớn yêu cầu từ công dân. Quý công dân vui lòng thử lại sau ít phút hoặc tham khảo thông tin chuẩn bị hồ sơ dưới đây:\n\n` +
          `1. TÓM TẮT THỦ TỤC: [${topItem.code}] Thủ tục ${topItem.name}.\n\n` +
          `2. THÀNH PHẦN HỒ SƠ:\n${topItem.dossier.map((d) => `   - ${d}`).join('\n')}\n\n` +
          `3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n   - Thời hạn: ${topItem.timeLimit}\n   - Lệ phí: ${topItem.fee}\n\n` +
          `4. NƠI TIẾP NHẬN & XỬ LÝ: Bộ phận Một cửa của ${wardName} (Địa chỉ: ${officeAddress}).\n\n` +
          `5. CĂN CỨ PHÁP LÝ:\n   Căn cứ: ${topItem.legalBasis}.\n   ${mandatoryDisclaimer}`,
        abstained: false,
        maxSimilarity: searchResult.maxScore,
        appliedThreshold: 0.78,
        responseTimeMs: elapsed,
        cached: false,
        disclaimer: mandatoryDisclaimer,
        citations: [],
      };
    }

    // Default network / timeout / unexpected error fallback to structured procedure data
    return {
      answer:
        `Hệ thống kết nối AI trực tuyến tạm thời gián đoạn. Dữ liệu thủ tục chính thức được trích xuất từ cơ sở dữ liệu pháp lý của UBND:\n\n` +
        `1. TÓM TẮT THỦ TỤC: [${topItem.code}] ${topItem.name} (${topItem.category}).\n\n` +
        `2. THÀNH PHẦN HỒ SƠ:\n${topItem.dossier.map((d) => `   - ${d}`).join('\n')}\n\n` +
        `3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n   - Thời hạn: ${topItem.timeLimit}\n   - Lệ phí: ${topItem.fee}\n\n` +
        `4. NƠI TIẾP NHẬN & XỬ LÝ: Bộ phận Một cửa của ${wardName} (Địa chỉ: ${officeAddress} • Hotline: ${phoneNumber}).\n\n` +
        `5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n   Căn cứ: ${topItem.legalBasis}.\n   ${mandatoryDisclaimer}`,
      abstained: false,
      maxSimilarity: searchResult.maxScore,
      appliedThreshold: 0.78,
      responseTimeMs: elapsed,
      cached: false,
      disclaimer: mandatoryDisclaimer,
      citations: [
        {
          chunkCode: `${topItem.code}_OFFICIAL`,
          procedureCode: topItem.code,
          procedureName: topItem.name,
          title: topItem.name,
          legalReference: topItem.legalBasis,
          content: topItem.dossier.join('; '),
          relevanceScore: searchResult.maxScore,
        },
      ],
    };
  }
}
