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
export const CHAT_MODELS = ['gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-2.5-flash'];
export const DEFAULT_MODEL = 'gemini-3-flash-preview';

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
 * Behavior 3: Câu hỏi pháp lý ngoài phạm vi: nói rõ giới hạn và không tự suy đoán.
 * Phân định rõ thẩm quyền và hướng dẫn kênh chính thức theo pháp luật Việt Nam.
 */
export async function answerIntelligentCivicInquiry(
  query: string,
  wardName: string,
  officeAddress: string,
  phoneNumber: string,
  authorityHint?: string
): Promise<RagResponse> {
  const startTime = performance.now();
  const apiKey = getGeminiApiKey();

  const prompt = `Bạn là Trợ lý Hành chính Thông minh SmartWard AI tại Bộ phận Tiếp nhận & Trả kết quả UBND ${wardName}.
Người dân gửi câu hỏi:
"${query}"

QUY TẮC BẮT BUỘC (TUÂN THỦ 100%):
1. NÓI RÕ GIỚI HẠN (NGAY ĐOẠN ĐẦU):
   - Nói rõ ràng, lịch sự: Thủ tục/yêu cầu này KHÔNG thuộc thẩm quyền giải quyết trực tiếp của UBND cấp xã/phường (nằm ngoài phạm vi dịch vụ công cấp xã).
   - Chỉ rõ cơ quan có thẩm quyền theo quy định pháp luật Việt Nam ${authorityHint ? `(Gợi ý: ${authorityHint})` : ''} (ví dụ: Phòng Quản lý Xuất nhập cảnh Công an tỉnh, Cơ quan Bảo hiểm Xã hội, Chi cục Thuế, Văn phòng Đăng ký Đất đai, Tòa án nhân dân, Phòng Tư pháp...).

2. TUYỆT ĐỐI KHÔNG TỰ SUY ĐOÁN:
   - Tuyệt đối không phỏng đoán, không suy diễn tình huống hay đưa ra lời khuyên pháp lý võ đoán/chủ quan.
   - Chỉ dẫn khách quan kênh tiếp nhận: Nộp hồ sơ trực tuyến qua Cổng Dịch vụ công Quốc gia (dichvucong.gov.vn) hoặc cổng dịch vụ công chuyên ngành (ví dụ: dichvucong.bocongan.gov.vn, VNeID, VssID) nếu có hỗ trợ online.
   - Nêu tóm tắt thành phần hồ sơ và điều kiện cơ bản theo luật định (nếu có căn cứ pháp lý rõ ràng).
   - Khuyên công dân liên hệ trực tiếp cơ quan có thẩm quyền hoặc tra cứu cổng DVC chính thức để được hỗ trợ chính xác.

3. PHONG CÁCH:
   - Trả lời tự nhiên, ân cần, ngắn gọn, súc tích và chuẩn mực công vụ.`;

  if (apiKey) {
    for (const model of CHAT_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2500,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates?.[0];
          let text = '';
          for (const p of candidate?.content?.parts || []) {
            if (p.text) text += p.text;
          }

          if (text.trim()) {
            const elapsed = Math.round(performance.now() - startTime);
            return {
              answer: text.trim(),
              abstained: false,
              maxSimilarity: 0.85,
              appliedThreshold: 0.50,
              responseTimeMs: elapsed,
              cached: false,
              disclaimer: `*Thông tin phân định thẩm quyền theo quy định pháp luật Việt Nam (${model}). Thủ tục này không do UBND cấp xã trực tiếp thụ lý.*`,
              citations: [
                {
                  chunkCode: 'NATIONAL_PORTAL_GUIDANCE',
                  procedureCode: 'HUONG-DAN-THAM-QUYEN',
                  procedureName: authorityHint || 'Cơ quan có thẩm quyền liên quan',
                  title: 'Cổng Dịch vụ công Quốc gia (dichvucong.gov.vn)',
                  legalReference: 'Hệ thống Văn bản Quy phạm Pháp luật Việt Nam',
                  content: `Thẩm quyền giải quyết: ${authorityHint || 'Cơ quan chuyên môn cấp huyện/tỉnh/bộ'}. Tra cứu và nộp hồ sơ trực tuyến tại dichvucong.gov.vn hoặc cổng dịch vụ công chuyên ngành.`,
                  relevanceScore: 0.88,
                },
              ],
            };
          }
        }
      } catch {
        // Continue to next model
      }
    }
  }

  // Graceful fallback if offline
  const elapsed = Math.round(performance.now() - startTime);
  return {
    answer:
      `Thủ tục/yêu cầu này nằm ngoài phạm vi giải quyết trực tiếp của UBND cấp xã/phường.\n\n` +
      `👉 Thẩm quyền giải quyết: Quý công dân vui lòng liên hệ ${authorityHint || 'Cơ quan chuyên môn cấp trên'} hoặc nộp trực tuyến tại Cổng Dịch vụ công Quốc gia (dichvucong.gov.vn) để được thụ lý đúng quy định.\n\n` +
      `Bộ phận Một cửa ${wardName} (Địa chỉ: ${officeAddress} • Hotline: ${phoneNumber}) luôn sẵn sàng hỗ trợ giải đáp thêm cho bà con.`,
    abstained: false,
    maxSimilarity: 0.50,
    appliedThreshold: 0.50,
    responseTimeMs: elapsed,
    cached: false,
    disclaimer: 'Thông tin hướng dẫn thẩm quyền theo quy định pháp luật Việt Nam.',
    citations: [],
  };
}

/**
 * Behavior 2: Chào hỏi hoặc câu hỏi ngoài lề nhẹ: trò chuyện tự nhiên, rồi hướng người dùng về các dịch vụ UBND.
 */
export async function answerCasualAndGuideToCommuneServices(
  query: string,
  wardName: string,
  officeAddress: string,
  phoneNumber: string
): Promise<RagResponse> {
  const startTime = performance.now();
  const apiKey = getGeminiApiKey();

  const prompt = `Bạn là Trợ lý Hành chính Một Cửa SmartWard AI tại UBND ${wardName} (Trụ sở: ${officeAddress}, Hotline: ${phoneNumber}).
Người dân nói hoặc hỏi câu ngoài lề nhẹ:
"${query}"

QUY TẮC PHẢN HỒI (TUÂN THỦ 100%):
1. TRÒ CHUYỆN TỰ NHIÊN: Trả lời ngắn gọn (1-2 câu), ân cần, tự nhiên, gần gũi và tích cực.
2. HƯỚNG VỀ DỊCH VỤ UBND: Sau đó khéo léo và tự nhiên hướng người dùng về các dịch vụ hành chính công của UBND ${wardName} (như khai sinh, kết hôn, chứng thực sao y, xác nhận cư trú CT01, xác nhận độc thân, bảo trợ xã hội...).
Hỏi xem hôm nay người dân có cần giải quyết giấy tờ gì để được hướng dẫn chuẩn bị hồ sơ chu đáo.`;

  if (apiKey) {
    for (const model of CHAT_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 600,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const candidate = data.candidates?.[0];
          let text = '';
          for (const p of candidate?.content?.parts || []) {
            if (p.text) text += p.text;
          }
          if (text.trim()) {
            return {
              answer: text.trim(),
              abstained: false,
              maxSimilarity: 0.9,
              appliedThreshold: 0.5,
              responseTimeMs: Math.round(performance.now() - startTime),
              cached: false,
              disclaimer: 'Trợ lý SmartWard AI luôn sẵn sàng đồng hành cùng bà con.',
              citations: [],
            };
          }
        }
      } catch {
        // Next model
      }
    }
  }

  // Fallback response
  return {
    answer:
      `Dạ chào bà con! Tôi là Trợ lý Hành chính Một Cửa tại UBND ${wardName}, luôn sẵn sàng đồng hành và hỗ trợ giải quyết công việc hành chính cho bà con.\n\n` +
      `Hôm nay bà con đang cần làm giấy tờ hoặc tìm hiểu thủ tục nào (như khai sinh, kết hôn, xác nhận cư trú CT01, chứng thực sao y, giấy độc thân...) để tôi hướng dẫn chi tiết nhé!`,
    abstained: false,
    maxSimilarity: 1.0,
    appliedThreshold: 0.5,
    responseTimeMs: Math.round(performance.now() - startTime),
    cached: false,
    disclaimer: 'Trợ lý SmartWard AI luôn sẵn sàng đồng hành cùng bà con.',
    citations: [],
  };
}
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
      appliedThreshold: 0.50,
      responseTimeMs: elapsed,
      cached: false,
      disclaimer: 'Danh mục 40 TTHC cấp xã chuẩn hóa theo Nghị định 13/2023 và Đề án 06.',
      citations: [],
    };
  }

  // 2. Natural Conversational Intent: Small Talk, Wellbeing, Gratitude, Farewell, Greeting, Light off-topic
  const smallTalk = classifySmallTalk(query);
  if (smallTalk.matched) {
    return await answerCasualAndGuideToCommuneServices(
      query,
      wardName,
      officeAddress,
      phoneNumber
    );
  }

  // 3. Out-of-commune / Higher authority inquiry: Answer intelligently with Gemini 3 Flash without rigid rejection
  const outOfScopeCheck = checkOutOfScopeQuery(query);
  if (outOfScopeCheck.isOutOfScope) {
    return await answerIntelligentCivicInquiry(
      query,
      wardName,
      officeAddress,
      phoneNumber,
      outOfScopeCheck.authority
    );
  }

  // 4. Commune Office Information (Address, Working Hours, Hotline)
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
      appliedThreshold: 0.50,
      responseTimeMs: elapsed,
      cached: false,
      disclaimer: 'Thông tin chính thức từ Danh bạ hành chính UBND cấp xã/phường.',
      citations: [],
    };
  }

  // 5. Semantic Retrieval over SmartWard AI Legal Knowledge Base (with Southern dialect normalization)
  let normalizedSearchQuery = query.toLowerCase();
  if (normalizedSearchQuery.includes('cư trú') && normalizedSearchQuery.includes('tthc-ct-01')) {
    normalizedSearchQuery = normalizedSearchQuery.replaceAll('tthc-ct-01', 'mẫu ct01');
  }
  normalizedSearchQuery = normalizedSearchQuery
    .replaceAll('giấy khai sanh', 'giấy khai sinh')
    .replaceAll('chứng sanh', 'chứng sinh')
    .replaceAll('khai sanh', 'khai sinh')
    .replaceAll('sanh con', 'sinh con')
    .replaceAll('mới sanh', 'mới sinh')
    .replaceAll(/\bsanh\b/g, 'sinh')
    .replaceAll('mần giấy giá thú', 'đăng ký kết hôn')
    .replaceAll('giá thú', 'kết hôn')
    .replaceAll('hôn thư', 'kết hôn')
    .replaceAll('chế độ tiền già', 'trợ cấp xã hội người cao tuổi')
    .replaceAll('lãnh tiền già', 'trợ cấp xã hội người cao tuổi')
    .replaceAll('tiền già', 'trợ cấp xã hội người cao tuổi')
    .replaceAll('mần giấy tử', 'khai tử')
    .replaceAll('chứng giấy tờ', 'chứng thực sao y')
    .replaceAll('chứng giấy', 'chứng thực sao y')
    .replaceAll('mần giấy', 'chứng thực sao y');
  const searchResult = searchLegalKnowledge(normalizedSearchQuery, 3);

  // 6. Semantic Retrieval Guardrail: Check if outside 40 commune procedures
  if (!searchResult.isInScope || searchResult.items.length === 0) {
    // If the citizen is asking a legal, public service, or administrative question outside commune scope -> Behavior 3
    const isCivicQuery = /(?:thủ tục|giấy tờ|hồ sơ|đăng ký|ở đâu|làm sao|cách làm|lệ phí|bao nhiêu tiền|thời hạn|mất bao lâu|quy định|luật|nghĩa vụ|chế độ|trợ cấp|bảo hiểm|bhxh|bhyt|đất đai|sổ đỏ|hộ chiếu|căn cước|bằng lái|gplx|thuế|tòa án|khiếu nại|tố cáo|công chứng)/i.test(query);

    if (isCivicQuery) {
      return await answerIntelligentCivicInquiry(
        query,
        wardName,
        officeAddress,
        phoneNumber,
        outOfScopeCheck.authority
      );
    }

    // Otherwise light off-topic or conversational question -> Behavior 2: chat naturally, then guide to commune services
    return await answerCasualAndGuideToCommuneServices(
      query,
      wardName,
      officeAddress,
      phoneNumber
    );
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
Bạn là Cán bộ Tiếp nhận và Trả kết quả (Một Cửa) tại UBND ${wardName}.
NHIỆM VỤ: Hướng dẫn thủ tục hành chính công trực tiếp, chính xác, ân cần và chuẩn mực cho nhân dân.

QUY TẮC CỐT LÕI (TUÂN THỦ 100%):
1. TÌM CĂN CỨ TRƯỚC:
   - Dựa vào căn cứ pháp lý và dữ liệu chính thức được cung cấp bên dưới để giải đáp. TUYỆT ĐỐI KHÔNG tự suy đoán hay bịa đặt điều luật, số liệu.
2. TRẢ LỜI TỰ NHIÊN, NGẮN GỌN VÀ DẪN NGUỒN:
   - Mở đầu tự nhiên, thân thiện và đi thẳng vào việc giải đáp cho người dân (ví dụ: "Dạ thưa bà con, về thủ tục...", "Để thực hiện thủ tục... tại UBND ${wardName}, bà con cần chuẩn bị...").
   - Trình bày ngắn gọn, mạch lạc, dễ hiểu, gồm các nội dung cốt lõi:
     • Thành phần hồ sơ cần chuẩn bị (các giấy tờ phải nộp và xuất trình) [kèm mã thủ tục].
     • Thời hạn giải quyết và lệ phí quy định [kèm mã thủ tục] (nếu thiếu thông tin ghi: "Chưa có dữ liệu, vui lòng liên hệ Bộ phận Một cửa").
     • Nơi tiếp nhận & xử lý hồ sơ: Bộ phận Một cửa của UBND ${wardName} (Địa chỉ: ${officeAddress}).
   - DẪN NGUỒN CĂN CỨ: Nêu rõ căn cứ pháp luật và mã thủ tục trích dẫn theo định dạng [MÃ_THỦ_TỤC] Căn cứ: [Tên văn bản pháp luật].
3. KHUYẾN CÁO BẮT BUỘC Ở CUỐI:
   "${mandatoryDisclaimer}"

DỮ LIỆU THỦ TỤC HÀNH CHÍNH CHÍNH THỨC ĐƯỢC CUNG CẤP:
${retrievedText}
`;

  try {
    let generatedText = '';

    for (const model of CHAT_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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

        if (response.ok) {
          const resJson = await response.json();
          const candidate = resJson.candidates?.[0];
          const parts = candidate?.content?.parts;
          if (Array.isArray(parts)) {
            generatedText = parts.map((p: any) => p?.text || '').join('');
          }
          if (generatedText.trim()) {
            break;
          }
        }
      } catch {
        // Try next model in cascade
      }
    }

    if (!generatedText.trim()) {
      throw new Error('ALL_MODELS_FAILED');
    }

    // Ensure mandatory disclaimer is present at the end
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
      appliedThreshold: 0.50,
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
        appliedThreshold: 0.50,
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
        appliedThreshold: 0.50,
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
      appliedThreshold: 0.50,
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

/**
 * Normalizes common Vietnamese and international date formats to strict HTML5 YYYY-MM-DD
 */
export function normalizeDateToYMD(dateStr?: string | null): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  if (!clean) return '';

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const ymd = clean.match(/^(\d{4})[\/\.](\d{1,2})[\/\.](\d{1,2})$/);
  if (ymd) {
    const year = ymd[1];
    const month = ymd[2].padStart(2, '0');
    const day = ymd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // MM/DD/YYYY (if month <= 12 and day <= 31)
  const mdy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy && Number(mdy[1]) <= 12 && Number(mdy[2]) <= 31) {
    const month = mdy[1].padStart(2, '0');
    const day = mdy[2].padStart(2, '0');
    const year = mdy[3];
    return `${year}-${month}-${day}`;
  }

  // Year only YYYY
  if (/^\d{4}$/.test(clean)) {
    return `${clean}-01-01`;
  }

  return clean;
}

/**
 * Structured OCR Field Extraction Result from Vision AI
 */
export interface ExtractedFormFieldsResult {
  success: boolean;
  fullName: string;
  cccd: string;
  dob: string;
  gender?: string;
  issueDate: string;
  address: string;
  confidence: number;
  detectedDocType: string;
  message: string;
  extractedFieldsCount: number;
}

/**
 * Converts a browser File or Blob into base64 string
 */
export function fileToBase64(file: File | Blob): Promise<{ base64Data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIndex = result.indexOf(',');
      const base64Data = commaIndex !== -1 ? result.substring(commaIndex + 1) : result;
      resolve({ base64Data, mimeType: file.type || 'image/jpeg' });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

import { extractFormWithTesseract } from './tesseractOcr';

/**
 * Performs Genuine Vision OCR Extraction using Google Gemini 2.5 Flash Multimodal API.
 * Automatically falls back to In-Browser Tesseract.js WebAssembly OCR if Google API quota is exceeded (HTTP 429)
 * or if network/API key is unavailable.
 */
export async function extractFormWithVision(file: File | Blob): Promise<ExtractedFormFieldsResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    // Zero config fallback: directly use client-side Tesseract.js
    return await extractFormWithTesseract(file);
  }

  try {
    const { base64Data, mimeType } = await fileToBase64(file);
    const effectiveMimeType = mimeType || 'image/jpeg';

    const ocrSystemPrompt = `Bạn là hệ thống AI Chuyên gia Thị giác Máy tính & Trích xuất Biểu mẫu Hành chính Việt Nam chuyên sâu cho Tờ khai CT01 cư trú (ban hành kèm theo Thông tư của Bộ trưởng Bộ Công an) và Căn cước công dân.
Nhiệm vụ: Dò quét hình ảnh và CHỈ trích xuất dữ liệu KHI VÀ CHỈ KHI tìm thấy đúng mục/tiêu đề trường tương ứng trên biểu mẫu:

QUY TẮC ANCHOR TRÍCH XUẤT CHUẨN XÁC THEO MẪU CT01 (BẮT BUỘC TUÂN THỦ 100%):
1. "fullName": BẮT BUỘC dò tìm đúng mục "1. Họ, chữ đệm và tên khai sinh" (hoặc "Họ, chữ đệm và tên").
   - Chỉ lấy chữ viết tay hoặc chữ in điền tên người khai sau mục 1 này (viết in hoa có dấu, ví dụ: "NGUYỄN TÚ").
   - NẾU KHÔNG CÓ mục này hoặc mục này bị để trống: Để chuỗi rỗng "". TUYỆT ĐỐI KHÔNG lấy quốc hiệu "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" hay tên mẫu đơn "TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ" gán vào họ tên!
2. "dob": BẮT BUỘC dò tìm đúng mục "2. Ngày, tháng, năm sinh".
   - Chuẩn hóa sang YYYY-MM-DD (ví dụ: "2015-06-08"). Nếu không có mục này hoặc để trống: để "".
3. "gender": BẮT BUỘC dò tìm đúng mục "3. Giới tính" (Nam hoặc Nữ). Nếu không có: để "".
4. "cccd": BẮT BUỘC dò tìm đúng mục "4. Số định danh cá nhân" (dãy 12 ô vuông của người khai).
   - Chỉ lấy chuỗi số ghi trong mục 4. TUYỆT ĐỐI KHÔNG lấy số điện thoại ở mục 5, KHÔNG lấy số ĐDCN của chủ hộ ở mục 9. Nếu không có hoặc chưa điền: để "".
5. "address": BẮT BUỘC dò tìm đúng mục "10. Nội dung đề nghị" (hoặc "tại địa chỉ:").
   - Trích xuất địa chỉ nơi đề nghị đăng ký thường trú / tạm trú ghi trong mục 10.
   - NẾU KHÔNG CÓ mục này hoặc để trống: để "". TUYỆT ĐỐI KHÔNG lấy câu khẩu hiệu hay quốc hiệu.
6. TUYỆT ĐỐI KHÔNG TRÍCH XUẤT "NGÀY CẤP CCCD" CHO TỜ KHAI CT01:
   - Trên Mẫu CT01 HOÀN TOÀN KHÔNG CÓ TRƯỜNG "Ngày cấp CCCD".
   - Ngày tháng năm ở cuối tờ khai là Ngày lập tờ khai/kê khai, TUYỆT ĐỐI KHÔNG điền thí đại vào ngày cấp thẻ CCCD. Luôn trả về "issueDate": "".

Nếu ảnh không phải biểu mẫu hành chính hoặc không thể đọc được chữ nào, hãy trả về confidence: 0, message: "Không thể nhận diện văn bản từ hình ảnh này", và các trường để rỗng "".

Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ không có markdown code fence backticks:
{
  "detectedDocType": "Tờ khai CT01 cư trú",
  "fullName": "...",
  "dob": "...",
  "gender": "...",
  "cccd": "...",
  "address": "...",
  "issueDate": "",
  "confidence": 95.0,
  "message": "Đã trích xuất chính xác theo đúng các mục Mẫu CT01"
}`;

    const VISION_CANDIDATE_MODELS = ['gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-2.5-flash'];
    let textOutput = '';
    let apiSuccess = false;

    for (const model of VISION_CANDIDATE_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const requestBody = {
          contents: [
            {
              role: 'user',
              parts: [
                { text: ocrSystemPrompt },
                {
                  inlineData: {
                    mimeType: effectiveMimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 0 },
          },
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates?.[0];
          for (const p of candidate?.content?.parts || []) {
            if (p.text) {
              textOutput += p.text;
            }
          }
          if (textOutput.trim()) {
            apiSuccess = true;
            break;
          }
        }
      } catch {
        // Try next candidate model
      }
    }

    if (!apiSuccess || !textOutput.trim()) {
      return await extractFormWithTesseract(file);
    }

    // Robust JSON extraction using regex in case model wraps with commentary or code fence
    let cleanJson = textOutput.trim();
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(cleanJson);
      const fullName = (parsed.fullName || '').trim();
      const cccd = (parsed.cccd || parsed.cccdNumber || '').trim().replace(/[^0-9]/g, '');
      const rawDob = (parsed.dob || parsed.birthDate || '').trim();
      const rawIssueDate = (parsed.issueDate || '').trim();
      const dob = normalizeDateToYMD(rawDob);
      const issueDate = normalizeDateToYMD(rawIssueDate);
      const gender = (parsed.gender || '').trim();
      const address = (parsed.address || parsed.permanentAddress || '').trim();
      const confidence = typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, parsed.confidence)) : 85.0;
      const detectedDocType = parsed.detectedDocType || 'Tờ khai CT01 cư trú';
      const message = parsed.message || 'Đã trích xuất thông tin thành công từ hình ảnh!';

      let count = 0;
      if (fullName) count++;
      if (cccd) count++;
      if (dob) count++;
      if (gender) count++;
      if (address) count++;
      if (issueDate) count++;

      return {
        success: count > 0,
        fullName,
        cccd,
        dob,
        gender,
        issueDate,
        address,
        confidence: count > 0 ? confidence : 0,
        detectedDocType,
        message: count > 0 ? message : 'Không trích xuất được trường thông tin nào từ ảnh. Vui lòng điền tay.',
        extractedFieldsCount: count,
      };
    } catch {
      // In case JSON parsing fails, fallback to Tesseract
      return await extractFormWithTesseract(file);
    }
  } catch (error: any) {
    console.warn(`[Gemini Vision] Exception: ${error.message}. Falling back to in-browser Tesseract.js OCR...`);
    return await extractFormWithTesseract(file);
  }
}
