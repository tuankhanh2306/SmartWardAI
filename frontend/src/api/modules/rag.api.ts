import { api } from './http';
import { isGeminiConfigured, askGeminiWithRAG, buildStructuredProcedureResponse } from '../../services/geminiClient';
import { searchLegalKnowledge, normalizeVietnameseQuery } from '../../services/legalKnowledgeBase';
import { preprocessQuery } from '../../services/diacriticsRestorer';
import {
  isWardOfficeQuery,
  checkOutOfScopeQuery,
  isProcedureListQuery,
  isIncidentReportQuery,
  classifySmallTalk,
  buildProcedureCatalogResponse,
  getRealTimeScheduleContext,
} from '../../services/intentClassifier';

// 1. Legal RAG Types & API
export interface LegalCitation {
  chunkCode: string;
  procedureCode: string;
  procedureName: string;
  title: string;
  legalReference: string;
  content: string;
  relevanceScore: number;
}

export interface ConversationTurn {
  sender: 'citizen' | 'bot' | 'user' | 'assistant';
  text: string;
  procedureCode?: string;
}

export interface AgentStep {
  stepIndex: number;
  toolName: string;
  label: string;
  success: boolean;
  latencyMs: number;
}

export interface AgentActionCard {
  type: 'OPEN_PREFILLED_FORM' | 'DOSSIER_STATUS' | 'WARD_ANALYTICS' | string;
  title: string;
  subtitle?: string;
  payload: Record<string, any>;
}

export interface AgentChatResponse {
  answer: string;
  role: string;
  steps: AgentStep[];
  actionCards: AgentActionCard[];
  citations: LegalCitation[];
  abstained: boolean;
  fallbackUsed: boolean;
  budgetExhausted: boolean;
  injectionBlocked?: boolean;
  traceId?: string;
  totalLatencyMs: number;
  disclaimer?: string;
}

export interface RagResponse {
  answer: string;
  abstained: boolean;
  abstentionReason?: string;
  maxSimilarity: number;
  appliedThreshold: number;
  citations: LegalCitation[];
  cached: boolean;
  responseTimeMs: number;
  disclaimer: string;
  suggestions?: string[];
  agentSteps?: AgentStep[];
  agentActionCards?: AgentActionCard[];
  traceId?: string;
}

function mapProcedureCodeToName(code?: string): string | null {
  if (!code) return null;
  const clean = code.trim().toUpperCase();
  switch (clean) {
    case 'TTHC-HT-01':
    case 'KS-01-DK':
      return 'đăng ký khai sinh';
    case 'TTHC-HT-02':
    case 'HT-02-DK':
      return 'đăng ký kết hôn';
    case 'TTHC-HT-03':
    case 'TTHC-HT-11':
      return 'cấp giấy xác nhận tình trạng hôn nhân';
    case 'TTHC-HT-04':
      return 'cấp bản sao trích lục hộ tịch';
    case 'TTHC-HT-05':
      return 'đăng ký khai tử';
    case 'TTHC-CR-01':
    case 'CT-01':
      return 'đăng ký thường trú (Mẫu CT01)';
    case 'TTHC-CR-03':
      return 'đăng ký tạm trú';
    case 'TTHC-CR-08':
      return 'xác nhận thông tin về cư trú (Mẫu CT07)';
    case 'TTHC-CR-04':
      return 'khai báo tạm vắng và thông báo lưu trú';
    case 'TTHC-CT-01':
      return 'chứng thực sao y bản sao';
    case 'TTHC-BT-01':
      return 'trợ cấp bảo trợ xã hội';
    default:
      return null;
  }
}

function extractProcedureFromText(text: string): string | null {
  if (!text) return null;

  // 1. Ignore safe refusal / clarification messages to avoid picking example procedures
  if (
    text.includes('hiện chưa nhận diện rõ') ||
    text.includes('nằm ngoài thẩm quyền') ||
    text.includes('chưa tìm thấy thông tin')
  ) {
    return null;
  }

  // 2. Priority 1: Extract from structured bot response header
  const headerMatch = text.match(/(?:1\.\s*TÓM\s*TẮT\s*THỦ\s*TỤC[:\s]*\n*Thủ\s*tục\s+)([^(\n]+)/i);
  if (headerMatch && headerMatch[1]) {
    const headerTitle = headerMatch[1].trim().toLowerCase();
    if (headerTitle.includes('khai sinh')) return 'đăng ký khai sinh';
    if (headerTitle.includes('kết hôn')) return 'đăng ký kết hôn';
    if (headerTitle.includes('thường trú') || headerTitle.includes('cư trú')) return 'đăng ký thường trú (Mẫu CT01)';
    if (headerTitle.includes('tạm trú')) return 'đăng ký tạm trú';
    if (headerTitle.includes('khai tử')) return 'đăng ký khai tử';
    if (headerTitle.includes('chứng thực') || headerTitle.includes('sao y')) return 'chứng thực sao y bản sao';
    if (headerTitle.includes('hôn nhân') || headerTitle.includes('độc thân')) return 'cấp giấy xác nhận tình trạng hôn nhân';
    if (headerTitle.includes('trích lục')) return 'cấp bản sao trích lục hộ tịch';
    if (headerTitle.includes('bảo trợ') || headerTitle.includes('người cao tuổi')) return 'trợ cấp bảo trợ xã hội';
  }

  // 3. Raw text analysis (citizen inquiry): strip example parentheses and sanitize dossier keywords
  const lower = text.toLowerCase().replace(/\(ví\s*dụ:[^)]*\)/gi, '');

  // Check specialized procedures BEFORE marriage
  if (lower.includes('khai sinh') || lower.includes('sinh con') || lower.includes('mới sinh') || lower.includes('khai sanh') || lower.includes('sanh con') || lower.includes('mới sanh')) {
    return 'đăng ký khai sinh';
  }
  if (lower.includes('tạm trú')) {
    return 'đăng ký tạm trú';
  }
  if (
    lower.includes('thường trú') ||
    lower.includes('cư trú') ||
    lower.includes('ct01') ||
    lower.includes('nhập khẩu') ||
    lower.includes('hộ khẩu')
  ) {
    return 'đăng ký thường trú (Mẫu CT01)';
  }
  if (lower.includes('khai tử') || lower.includes('chứng tử')) {
    return 'đăng ký khai tử';
  }
  if (lower.includes('độc thân') || lower.includes('tình trạng hôn nhân')) {
    return 'cấp giấy xác nhận tình trạng hôn nhân';
  }
  if (lower.includes('trích lục')) {
    return 'cấp bản sao trích lục hộ tịch';
  }
  if (lower.includes('bảo trợ') || lower.includes('tiền già') || lower.includes('người cao tuổi')) {
    return 'trợ cấp bảo trợ xã hội';
  }
  if (lower.includes('chứng thực') || lower.includes('sao y')) {
    return 'chứng thực sao y bản sao';
  }

  // Sanitize "Giấy chứng nhận kết hôn của cha mẹ" in birth dossier
  const sanitizedForMarriage = lower
    .replace(/giấy\s+(?:chứng\s+nhận\s+)?kết\s+hôn/g, 'giay_to_khac')
    .replace(/kết\s+hôn\s+của\s+cha\s+mẹ/g, 'giay_to_khac');

  if (
    sanitizedForMarriage.includes('kết hôn') ||
    sanitizedForMarriage.includes('hôn nhân') ||
    sanitizedForMarriage.includes('lấy vợ') ||
    sanitizedForMarriage.includes('lấy chồng')
  ) {
    return 'đăng ký kết hôn';
  }

  return null;
}

function isFollowUpQuestion(q: string): boolean {
  const lower = q.toLowerCase();
  for (const kw of ['khai sinh', 'kết hôn', 'khai tử', 'thường trú', 'tạm trú', 'cư trú', 'ct01', 'chứng thực', 'sao y', 'độc thân', 'trích lục', 'bảo trợ']) {
    if (lower.includes(kw)) return false;
  }
  const patterns = [
    'lệ phí', 'chi phí', 'bao nhiêu tiền', 'hết bao nhiêu', 'mất tiền', 'mất phí', 'có mất tiền không',
    'bao lâu', 'mấy ngày', 'thời hạn', 'thời gian', 'khi nào có',
    'hồ sơ', 'giấy tờ', 'cần gì', 'chuẩn bị gì', 'mang theo gì',
    'nộp ở đâu', 'ở đâu', 'đến đâu', 'nơi nộp', 'ai nộp',
    'còn', 'thế còn', 'vậy còn'
  ];
  return patterns.some(p => lower.includes(p));
}

function getProcedureSuggestions(procName: string): string[] {
  const lower = procName.toLowerCase();
  if (lower.includes('kết hôn')) {
    return ['Hồ sơ kết hôn cần gì?', 'Lệ phí kết hôn bao nhiêu?', 'Nơi nộp hồ sơ kết hôn ở đâu?', 'Thời hạn giải quyết bao lâu?'];
  }
  if (lower.includes('khai sinh')) {
    return ['Hồ sơ khai sinh cần gì?', 'Lệ phí khai sinh bao nhiêu?', 'Nơi nộp hồ sơ khai sinh ở đâu?', 'Thời hạn giải quyết bao lâu?'];
  }
  if (lower.includes('thường trú') || lower.includes('cư trú')) {
    return ['Hồ sơ thường trú gồm những gì?', 'Thời hạn đăng ký thường trú?', 'Nơi nộp hồ sơ thường trú?', 'Hướng dẫn điền CT01'];
  }
  if (lower.includes('chứng thực')) {
    return ['Lệ phí chứng thực bản sao?', 'Giấy tờ cần xuất trình khi chứng thực?', 'Thời hạn trả kết quả chứng thực?'];
  }
  return ['Hồ sơ cần những gì?', 'Lệ phí bao nhiêu?', 'Nơi nộp hồ sơ ở đâu?', 'Thời hạn giải quyết bao lâu?'];
}

export const askLegalRag = async (
  query: string,
  topK: number = 3,
  wardContext: {
    wardName?: string;
    officeAddress?: string;
    phoneNumber?: string;
    workingHours?: string;
  } = {},
  conversationHistory: ConversationTurn[] = []
): Promise<RagResponse> => {
  const currentWardName = wardContext.wardName || 'UBND cấp Xã/Phường';
  const currentAddress = wardContext.officeAddress || 'Bộ phận Một cửa';
  const currentPhone = wardContext.phoneNumber || '18001096';
  const currentWorkingHours = wardContext.workingHours || 'Sáng: 07:30 – 11:30 | Chiều: 13:30 – 17:00 (Thứ 2 – Thứ 6)';
  const mandatoryDisclaimer =
    '*Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo, không thay thế quyết định chính thức của công chức tiếp nhận hồ sơ tại Bộ phận Một cửa.*';

  // BƯỚC 2.2 & 2.3: Tiền xử lý câu hỏi tại ĐÚNG 1 ĐIỂM VÀO DUY NHẤT
  // Khôi phục dấu thanh tiếng Việt cho câu không dấu và chuẩn hóa lỗi gõ phím telex
  const cleanQuery = await preprocessQuery(query);

  // 0. Check Officer-Verified HITL Knowledge Cache first (REA Closed-Loop Duality)
  if (typeof window !== 'undefined') {
    try {
      const rawHitl = localStorage.getItem('smartward_hitl_queue_v1');
      if (rawHitl) {
        const hitlList: HitlGrayZoneItem[] = JSON.parse(rawHitl);
        const qNorm = cleanQuery.trim().toLowerCase();
        const rawNorm = query.trim().toLowerCase();
        const matchedApproved = hitlList.find(
          (item) =>
            item.status === 'APPROVED' &&
            item.suggestedAnswer &&
            (item.query.trim().toLowerCase() === qNorm ||
              item.query.trim().toLowerCase() === rawNorm ||
              (qNorm.length >= 12 && item.query.toLowerCase().includes(qNorm)) ||
              (item.query.length >= 12 && qNorm.includes(item.query.trim().toLowerCase())))
        );
        if (matchedApproved) {
          return {
            answer: matchedApproved.suggestedAnswer,
            abstained: false,
            maxSimilarity: 1.0,
            appliedThreshold: 0.78,
            responseTimeMs: 4.2,
            cached: true,
            disclaimer: `Câu trả lời đã được công chức ${matchedApproved.resolvedBy || 'Bộ phận Một cửa'} kiểm duyệt và xác thực chính thức.`,
            citations: [
              {
                chunkCode: matchedApproved.candidateChunkCode || 'HITL-VERIFIED',
                procedureCode: matchedApproved.candidateChunkCode || 'TTHC-UBND',
                procedureName: matchedApproved.candidateProcedureName || 'Hướng dẫn nghiệp vụ Một cửa',
                title: `Đã xác thực bởi ${matchedApproved.resolvedBy || 'Cán bộ Một cửa'} (${matchedApproved.wardName})`,
                legalReference: matchedApproved.legalReference || 'Quy định pháp luật hiện hành',
                content: matchedApproved.suggestedAnswer,
                relevanceScore: 1.0,
              },
            ],
            suggestions: ['Đăng ký khai sinh', 'Đăng ký kết hôn', 'Đăng ký thường trú (CT01)', 'Xem 40 thủ tục'],
          };
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  // 1. Procedure Catalog Request ("nêu 40 thủ tục", "danh sách thủ tục"...)
  if (isProcedureListQuery(cleanQuery) || isProcedureListQuery(query)) {
    return {
      answer: buildProcedureCatalogResponse(currentWardName),
      abstained: false,
      maxSimilarity: 1.0,
      appliedThreshold: 0.78,
      responseTimeMs: 6.0,
      cached: false,
      disclaimer: 'Danh mục 40 TTHC cấp xã chuẩn hóa theo Nghị định 13/2023 và Đề án 06.',
      citations: [],
      suggestions: ['Đăng ký khai sinh', 'Đăng ký kết hôn', 'Đăng ký thường trú (CT01)', 'Chứng thực sao y', 'Trợ cấp bảo trợ xã hội'],
    };
  }

  // 1.5. Field Incident Report Inquiry ("chỗ tôi hư đường", "sạt lở", "bạn có thể giúp tôi báo lên cán bộ không"...)
  if (isIncidentReportQuery(cleanQuery) || isIncidentReportQuery(query)) {
    return {
      answer:
        `Dạ, để gửi phản ánh hiện trường (hư đường, ngập nước, sạt lở, chiếu sáng, môi trường...) trực tiếp lên Bàn Điều Hành Cán Bộ UBND, bà con vui lòng mở công cụ **Báo Sự Cố Hiện Trường (GPS R=25m)** ngay trên thanh điều hướng.\n\n` +
        `• Hệ thống sẽ **tự động quét tọa độ GPS (bán kính R = 25m)** và điền sẵn địa chỉ vào ô vị trí (bà con có thể sửa tay nếu lệch).\n` +
        `• Bà con nhập **Số điện thoại liên hệ** và bấm gửi: hệ thống sẽ tự động định tuyến về đúng UBND Xã/Phường nơi xảy ra sự cố để cán bộ xử lý ngay!`,
      abstained: false,
      maxSimilarity: 1.0,
      appliedThreshold: 0.78,
      responseTimeMs: 6.0,
      cached: false,
      disclaimer: 'Hệ thống Phản ánh Hiện trường & Định tuyến Không gian Đa Xã/Phường (GPS R=25m).',
      citations: [],
      suggestions: ['Đăng ký khai sinh', 'Đăng ký kết hôn', 'Đăng ký thường trú (CT01)'],
    };
  }

  // 2. Conversational Intent: Small Talk, Wellbeing, Gratitude, Farewell, Greeting
  const smallTalk = classifySmallTalk(cleanQuery) || classifySmallTalk(query);
  if (smallTalk.matched) {
    let reply = '';
    let suggestions = ['Đăng ký khai sinh', 'Đăng ký kết hôn', 'Đăng ký thường trú (CT01)', 'Xem 40 thủ tục'];
    const rt = getRealTimeScheduleContext();

    if (smallTalk.type === 'WELLBEING') {
      if (rt.isWeekend) {
        reply =
          `Dạ chào bà con! Thời gian hiện tại là **${rt.timeStr} (${rt.sessionName} ${rt.dayName}, ngày ${rt.dateStr})**.\n\n` +
          `• **Tại trụ sở UBND ${currentWardName}:** Hôm nay là **${rt.dayName} (ngày nghỉ cuối tuần)** nên Bộ phận Một cửa **tạm nghỉ tiếp nhận hồ sơ giấy trực tiếp** tại quầy (sẽ mở cửa lại vào **${rt.nextOpenText}**).\n` +
          `• **Hỗ trợ trực tuyến 24/7:** Riêng Trợ lý Pháp lý AI và công cụ Tiền kiểm định tờ khai vẫn hoạt động xuyên suốt ngày nghỉ để hướng dẫn bà con chuẩn bị sẵn giấy tờ (khai sinh, kết hôn, cư trú CT01, chứng thực...) trước khi đến nộp vào đầu tuần!`;
      } else if (rt.isOpen) {
        reply =
          `Dạ chào bà con! Thời gian hiện tại là **${rt.timeStr} (${rt.sessionName} ${rt.dayName}, ngày ${rt.dateStr})**.\n\n` +
          `• **Tại trụ sở UBND ${currentWardName}:** ${rt.statusHeadline} (${currentWorkingHours}).\n` +
          `• **Hỗ trợ trực tuyến 24/7:** Hôm nay tôi vẫn hoạt động bình thường 24/7 để hỗ trợ bà con. Bà con đang cần làm giấy tờ gì hoặc có vướng mắc về thủ tục nào (như khai sinh, kết hôn, cư trú CT01, chứng thực...) cứ nhắn để tôi hướng dẫn chuẩn bị trước khi đến quầy nhé!`;
      } else {
        reply =
          `Dạ chào bà con! Thời gian hiện tại là **${rt.timeStr} (${rt.sessionName} ${rt.dayName}, ngày ${rt.dateStr})**.\n\n` +
          `• **Tại trụ sở UBND ${currentWardName}:** Hiện tại đang ngoài giờ tiếp dân trực tiếp (${rt.statusHeadline}). Thời gian mở cửa tiếp theo: **${rt.nextOpenText}**.\n` +
          `• **Hỗ trợ trực tuyến 24/7:** Hôm nay tôi vẫn hoạt động bình thường 24/7. Trợ lý Pháp lý AI vẫn trực 24/7 để hướng dẫn bà con chuẩn bị hồ sơ hoặc tiền kiểm định tờ khai ngay lúc này!`;
      }
    } else if (smallTalk.type === 'THANKS') {
      reply =
        `Dạ không có gì ạ! Rất vui được hỗ trợ bà con. Chúc bà con giải quyết công việc hành chính thật nhanh chóng và thuận lợi.\n\n` +
        `Nếu cần tra cứu thêm thủ tục hoặc tiền kiểm tra biểu mẫu tại UBND ${currentWardName}, bà con cứ nhắn lại tôi nhé!`;
    } else if (smallTalk.type === 'GOODBYE') {
      reply =
        `Tạm biệt bà con! Chúc bà con một ngày vui vẻ và làm việc hiệu quả.\n\n` +
        `Bất cứ khi nào cần tra cứu thủ tục hành chính hoặc hỏi đáp biểu mẫu tại UBND ${currentWardName}, bà con có thể quay lại trò chuyện cùng tôi bất cứ lúc nào!`;
    } else if (smallTalk.type === 'HELP') {
      reply =
        `Dạ được chứ ạ! Tôi có thể tư vấn cho bà con các thủ tục hành chính tại UBND ${currentWardName}.\n\n` +
        `Bà con cho tôi biết đang cần làm việc gì nhé, ví dụ:\n` +
        `• "Con tôi mới sinh, làm khai sinh cần gì?"\n` +
        `• "Tôi thuê trọ, đăng ký tạm trú thế nào?"\n` +
        `• "Xin giấy xác nhận độc thân ở đâu?"\n` +
        `• "Chứng thực sao y mất bao lâu?"\n\n` +
        `Hoặc gõ "nêu 40 thủ tục" để xem toàn bộ danh mục.`;
      suggestions = ['Đăng ký khai sinh', 'Đăng ký kết hôn', 'Đăng ký thường trú (CT01)', 'Chứng thực sao y', 'Xem 40 thủ tục'];
    } else {
      reply =
        `Xin chào! Tôi là Trợ lý Pháp lý Một Cửa tại UBND ${currentWardName} (Hiện tại: ${rt.timeStr} • ${rt.dayName}, ${rt.dateStr}).\n\n` +
        `Tôi sẵn sàng giải đáp, tra cứu và hướng dẫn bà con chuẩn bị hồ sơ đầy đủ, đúng quy định cho các thủ tục hành chính cấp xã/phường như:\n` +
        `• Đăng ký khai sinh, kết hôn, khai tử, trích lục hộ tịch\n` +
        `• Đăng ký thường trú, tạm trú, thông tin cư trú (Mẫu CT01)\n` +
        `• Chứng thực chữ ký, chứng thực bản sao từ bản chính\n` +
        `• Cấp giấy xác nhận tình trạng hôn nhân (giấy độc thân)\n` +
        `• Các chế độ chính sách bảo trợ xã hội và tiền kiểm tra hồ sơ\n\n` +
        `${rt.isWeekend ? `*Lưu ý: Hôm nay là ${rt.dayName} (nghỉ cuối tuần), trụ sở Một cửa mở cửa lại lúc ${rt.nextOpenText}, nhưng tôi vẫn trực 24/7 để hỗ trợ bà con chuẩn bị sẵn hồ sơ ngay hôm nay!*` : `Bà con đang cần tìm hiểu hoặc chuẩn bị làm thủ tục nào? Hãy nhập câu hỏi để tôi hướng dẫn chi tiết từng bước nhé!`}`;
    }

    return {
      answer: reply,
      abstained: false,
      maxSimilarity: 1.0,
      appliedThreshold: 0.78,
      responseTimeMs: 5.0,
      cached: false,
      disclaimer: 'Trợ lý Pháp lý Một Cửa SmartWard AI sẵn sàng phục vụ nhân dân.',
      citations: [],
      suggestions,
    };
  }

  // 2. Pre-filter: Out-of-scope inquiry (Strictly <= 2 concise sentences with direct guidance)
  const outOfScopeCheck = checkOutOfScopeQuery(cleanQuery) || checkOutOfScopeQuery(query);
  if (outOfScopeCheck.isOutOfScope) {
    const authority = outOfScopeCheck.authority;
    const answer = authority
      ? `Yêu cầu này nằm ngoài thẩm quyền của UBND cấp xã và thuộc thẩm quyền giải quyết của ${authority}. Quý công dân vui lòng liên hệ cơ quan trên hoặc tham khảo các thủ tục hành chính cấp xã dưới đây để được hỗ trợ.`
      : `Hệ thống SmartWard AI hiện chưa tìm thấy thông tin thủ tục tương ứng với câu hỏi của bà con trong thẩm quyền cấp xã. Bà con vui lòng liên hệ trực tiếp Bộ phận Một cửa ${currentWardName} hoặc Tổng đài 18001096 để được hỗ trợ.`;

    return {
      answer,
      abstained: true,
      abstentionReason: outOfScopeCheck.reason || 'Yêu cầu không thuộc thẩm quyền cấp xã.',
      maxSimilarity: 0.45,
      appliedThreshold: 0.78,
      responseTimeMs: 8.0,
      cached: false,
      disclaimer: mandatoryDisclaimer,
      citations: [],
      suggestions: ['Đăng ký khai sinh', 'Đăng ký kết hôn', 'Đăng ký thường trú (CT01)', 'Xem 40 thủ tục'],
    };
  }

  // 3. Pre-filter: Ward Office Information & Real-Time Working Hours / Weekend Check
  if (isWardOfficeQuery(cleanQuery) || isWardOfficeQuery(query)) {
    const rt = getRealTimeScheduleContext();
    return {
      answer:
        `Dạ, thời gian hệ thống ghi nhận hiện tại là **${rt.timeStr} (${rt.sessionName} ${rt.dayName}, ngày ${rt.dateStr})**.\n\n` +
        `**1. TRẠNG THÁI HOẠT ĐỘNG HIỆN TẠI CỦA BỘ PHẬN MỘT CỬA — UBND ${currentWardName.toUpperCase()}:**\n` +
        `• **Trạng thái lúc này:** **${rt.statusHeadline}**.\n` +
        `• **Thời gian tiếp nhận trực tiếp gần nhất:** **${rt.nextOpenText}**.\n` +
        `• **Khung giờ hành chính quy định:** ${currentWorkingHours} *(Thứ Bảy, Chủ Nhật và ngày Lễ nghỉ theo quy định)*.\n` +
        `• **Trụ sở / Địa chỉ Một cửa:** ${currentAddress}\n` +
        `• **Số điện thoại / Đường dây nóng:** ${currentPhone}\n\n` +
        `**2. DỊCH VỤ HỖ TRỢ TRỰC TUYẾN 24/7 (KỂ CẢ THỨ BẢY & CHỦ NHẬT):**\n` +
        `• Dù đang ngoài giờ hành chính hay cuối tuần, bà con vẫn có thể **hỏi đáp thủ tục với Trợ lý AI**, dùng công cụ **Tiền Kiểm Định Tờ Khai (4 mẫu)** để rà soát lỗi trước ở nhà, **Báo Sự Cố Hiện Trường (GPS)** hoặc nộp hồ sơ trực tuyến trên Cổng DVC Quốc gia tại \`dichvucong.gov.vn\`.`,
      abstained: false,
      maxSimilarity: 1.0,
      appliedThreshold: 0.78,
      responseTimeMs: 6.0,
      cached: false,
      disclaimer: 'Thông tin lịch làm việc thời gian thực và Danh bạ hành chính UBND cấp xã/phường.',
      citations: [],
      suggestions: ['Xem 40 thủ tục', 'Đăng ký khai sinh', 'Đăng ký kết hôn', 'Đăng ký thường trú (CT01)'],
    };
  }

  // 3.1. Contextual Query Rewriting for Follow-up Inquiries
  let effectiveQuery = cleanQuery;
  if (conversationHistory.length > 0 && (isFollowUpQuestion(cleanQuery) || isFollowUpQuestion(query))) {
    for (let i = conversationHistory.length - 1; i >= Math.max(0, conversationHistory.length - 5); i--) {
      const turn = conversationHistory[i];
      let proc = mapProcedureCodeToName(turn.procedureCode);
      if (!proc && turn.text) {
        proc = extractProcedureFromText(turn.text);
      }
      if (proc) {
        effectiveQuery = `[Thủ tục ${proc}] ${cleanQuery}`;
        break;
      }
    }
  }

  // 4. Attempt to invoke Spring Boot Backend (/api/v1/rag/ask) with fast 3500ms timeout for cold start resilience
  try {
    const historyPayload = conversationHistory.slice(-5).map(h => ({
      role: h.sender === 'citizen' || h.sender === 'user' ? 'citizen' : 'assistant',
      content: h.text,
      procedureCode: h.procedureCode
    }));
    const resp = await api.post<any>(
      '/rag/ask',
      {
        question: effectiveQuery,
        query: effectiveQuery,
        topK,
        wardName: wardContext.wardName,
        officeAddress: wardContext.officeAddress,
        history: historyPayload
      },
      {
        timeout: 3500 // Fast 3.5s timeout: if Render container is in cold start, fall back to 40 TTHC local engine immediately
      }
    );
    const result = resp.data?.data ? resp.data.data : resp.data;
    if (result && result.answer) {
      return result as RagResponse;
    }
    console.info('Backend did not return answer, attempting in-app legal knowledge fallback for query:', effectiveQuery);
  } catch (backendError: any) {
    console.warn('Backend call failed or timed out (Render cold-start), executing in-app fallback:', backendError);
  }

  // 5. If Backend is offline or returned no answer, check if Gemini Live RAG is configured
    if (isGeminiConfigured()) {
      try {
        console.info('Invoking in-app Gemini Flash Live RAG Engine with Project Knowledge...');
        return await askGeminiWithRAG(effectiveQuery, wardContext);
      } catch (geminiError) {
        console.warn('Gemini Live API failed, falling back to local simulation:', geminiError);
      }
    }

    // 6. Local Intelligent Fallback Simulation (Unified Knowledge Base & Resilience)
    let normalizedQuery = normalizeVietnameseQuery(effectiveQuery);
    if (normalizedQuery.includes('cư trú') && normalizedQuery.includes('tthc-ct-01')) {
      normalizedQuery = normalizedQuery.replaceAll('tthc-ct-01', 'mẫu ct01');
    }

    const searchResult = searchLegalKnowledge(normalizedQuery, 3, currentWardName);
    const { decision } = searchResult;

    // 6.1. CONFIDENT MATCH (S_max >= 0.60 && Gap >= 0.12)
    if (decision.status === 'CONFIDENT' && searchResult.items.length > 0) {
      const primaryItem = searchResult.items[0];
      const answer = buildStructuredProcedureResponse(
        primaryItem,
        currentWardName,
        currentAddress,
        mandatoryDisclaimer
      );
      const citations: LegalCitation[] = searchResult.items.map((item) => ({
        chunkCode: `${item.code}_CHK_001`,
        procedureCode: item.code,
        procedureName: item.name,
        title: `${item.name} - ${item.category}`,
        legalReference: item.legalBasis,
        content: item.keyRules.join(' '),
        relevanceScore: decision.maxScore,
      }));

      const suggestions = getProcedureSuggestions(primaryItem.name);

      return {
        answer,
        abstained: false,
        maxSimilarity: decision.maxScore,
        appliedThreshold: 0.60,
        responseTimeMs: 15.0,
        cached: true,
        disclaimer: mandatoryDisclaimer,
        citations,
        suggestions,
      };
    }

    // 6.2. AMBIGUOUS MATCH (Gap < 0.12) - Chủ động hỏi lại công dân để xác nhận
    if (decision.status === 'AMBIGUOUS' && decision.top1 && decision.top2) {
      const top1 = decision.top1.item;
      const top2 = decision.top2.item;

      // Log và đẩy vào HITL Gray-zone queue
      if (typeof window !== 'undefined' && query.trim().length >= 4) {
        try {
          const rawHitl = localStorage.getItem('smartward_hitl_queue_v1');
          const currentQueue: HitlGrayZoneItem[] = rawHitl ? JSON.parse(rawHitl) : DEFAULT_FALLBACK_HITL_QUEUE;
          const alreadyExists = currentQueue.some(
            (i) => i.query.trim().toLowerCase() === query.trim().toLowerCase()
          );
          if (!alreadyExists) {
            const newHitl: HitlGrayZoneItem = {
              id: `HITL-AMB-${Math.floor(1000 + Math.random() * 9000)}`,
              query: query.trim(),
              wardName: `UBND ${currentWardName}`,
              similarityScore: Number(decision.maxScore.toFixed(3)),
              candidateChunkCode: top1.code,
              candidateProcedureName: `${top1.name} / ${top2.name}`,
              legalReference: `${top1.legalBasis} | ${top2.legalBasis}`,
              suggestedAnswer: decision.clarifyingQuestion || `Làm rõ ý định giữa ${top1.name} và ${top2.name}`,
              status: 'PENDING',
              createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              resolvedBy: null,
            };
            localStorage.setItem('smartward_hitl_queue_v1', JSON.stringify([newHitl, ...currentQueue].slice(0, 40)));
          }
        } catch {
          // ignore storage errors
        }
      }

      return {
        answer: decision.clarifyingQuestion || `Bạn đang hỏi về ${top1.name} hay ${top2.name}?`,
        abstained: true,
        abstentionReason: decision.reason,
        maxSimilarity: decision.maxScore,
        appliedThreshold: 0.60,
        responseTimeMs: 15.0,
        cached: false,
        disclaimer: mandatoryDisclaimer,
        citations: [
          {
            chunkCode: `${top1.code}_CHK_001`,
            procedureCode: top1.code,
            procedureName: top1.name,
            title: top1.name,
            legalReference: top1.legalBasis,
            content: top1.keyRules.join(' '),
            relevanceScore: decision.top1.score,
          },
          {
            chunkCode: `${top2.code}_CHK_001`,
            procedureCode: top2.code,
            procedureName: top2.name,
            title: top2.name,
            legalReference: top2.legalBasis,
            content: top2.keyRules.join(' '),
            relevanceScore: decision.top2.score,
          },
        ],
        suggestions: decision.clarifyingSuggestions || [`👉 ${top1.name}`, `👉 ${top2.name}`, '📋 Danh mục 40 thủ tục'],
      };
    }

    // 6.3. ABSTAIN MATCH (S_max < 0.60 hoặc câu hỏi vô nghĩa/ngoài phạm vi)
    if (typeof window !== 'undefined' && query.trim().length >= 4) {
      try {
        const rawHitl = localStorage.getItem('smartward_hitl_queue_v1');
        const currentQueue: HitlGrayZoneItem[] = rawHitl ? JSON.parse(rawHitl) : DEFAULT_FALLBACK_HITL_QUEUE;
        const alreadyExists = currentQueue.some(
          (i) => i.query.trim().toLowerCase() === query.trim().toLowerCase()
        );
        if (!alreadyExists) {
          const topItem = decision.top1?.item;
          const newHitl: HitlGrayZoneItem = {
            id: `HITL-LOW-${Math.floor(1000 + Math.random() * 9000)}`,
            query: query.trim(),
            wardName: `UBND ${currentWardName}`,
            similarityScore: Number(decision.maxScore.toFixed(3)),
            candidateChunkCode: topItem?.code || 'TTHC-HT-01',
            candidateProcedureName: topItem?.name || 'Thủ tục hành chính cấp xã',
            legalReference: topItem?.legalBasis || 'Nghị định 61/2018/NĐ-CP về cơ chế Một cửa',
            suggestedAnswer:
              `1. TÓM TẮT HƯỚNG DẪN: Đối với câu hỏi "${query.trim()}", công dân thực hiện tại Bộ phận Một cửa UBND ${currentWardName}.\n` +
              `2. THÀNH PHẦN HỒ SƠ: Xuất trình CCCD gắn chip (hoặc VNeID mức 2) và tờ khai mẫu quy định.\n` +
              `3. NƠI TIẾP NHẬN: ${currentAddress} (Đường dây nóng: ${currentPhone}).`,
            status: 'PENDING',
            createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            resolvedBy: null,
          };
          localStorage.setItem('smartward_hitl_queue_v1', JSON.stringify([newHitl, ...currentQueue].slice(0, 40)));
        }
      } catch {
        // ignore storage errors
      }
    }

    return {
      answer:
        decision.abstentionMessage ||
        `Hệ thống chưa chắc chắn về câu hỏi này (${decision.reason}). Bà con vui lòng mô tả rõ hơn hoặc chọn đúng thủ tục từ danh mục 40 TTHC bên dưới.`,
      abstained: true,
      abstentionReason: decision.reason,
      maxSimilarity: decision.maxScore,
      appliedThreshold: 0.60,
      responseTimeMs: 15.0,
      cached: false,
      disclaimer: mandatoryDisclaimer,
      citations: [],
      suggestions: decision.clarifyingSuggestions || [
        '👶 Đăng ký khai sinh',
        '💍 Đăng ký kết hôn',
        '🏠 Đăng ký thường trú (CT01)',
        '📋 Xem 40 thủ tục',
      ],
    };
};

/**
 * Submit citizen RAG answer feedback (useful / not useful) (7.4)
 */
export const submitRagFeedback = async (query: string, useful: boolean, comments?: string): Promise<void> => {
  try {
    await api.post('/rag/feedback', { query, useful, comments });
  } catch {
    // non-blocking
  }
};

// 6. Human-in-the-Loop (HITL) Gray-Zone Queue & Spatial Index Warm-up APIs
export interface HitlGrayZoneItem {
  id: string;
  query: string;
  wardName: string;
  similarityScore: number;
  candidateChunkCode: string;
  candidateProcedureName: string;
  legalReference: string;
  suggestedAnswer: string;
  status: 'PENDING' | 'APPROVED';
  createdAt: string;
  resolvedBy?: string | null;
}

const DEFAULT_FALLBACK_HITL_QUEUE: HitlGrayZoneItem[] = [
  {
    id: 'HITL-AG-001',
    query: 'Làm giấy khai sanh cho cháu ngoại mà mẹ nó đi làm ăn xa ở Bình Dương chỉ gửi hình chụp giấy chứng sanh qua Zalo được không?',
    wardName: 'UBND Phường Mỹ Xuyên',
    similarityScore: 0.642,
    candidateChunkCode: 'KS-01-DK',
    candidateProcedureName: 'Đăng ký khai sinh (TTHC-HT-01)',
    legalReference: 'Điều 15, Điều 16 Luật Hộ tịch 2014 & Nghị định 123/2015/NĐ-CP',
    suggestedAnswer:
      '1. TÓM TẮT THỦ TỤC: Ông/bà ngoại có thể đi đăng ký khai sinh cho cháu mà không cần văn bản ủy quyền, nhưng bắt buộc phải nộp Bản chính Giấy chứng sinh (hoặc bản điện tử có ký số liên thông trên DVC), không dùng ảnh chụp qua Zalo.\n2. THÀNH PHẦN HỒ SƠ: Tờ khai mẫu hộ tịch, Bản chính Giấy chứng sinh, CCCD của ông/bà ngoại và giấy tờ chứng minh quan hệ.\n3. THỜI HẠN & LỆ PHÍ: Giải quyết trong ngày làm việc, Miễn phí 100%.\n4. NƠI TIẾP NHẬN: Bộ phận Một cửa UBND cấp xã nơi cư trú của cha hoặc mẹ.',
    status: 'PENDING',
    createdAt: '2026-11-05 08:20:00',
    resolvedBy: null,
  },
  {
    id: 'HITL-AG-002',
    query: 'Tui muốn mần giấy xác nhận chưa có vợ để đi xuất khẩu lao động Đài Loan thì xin ở xã cần đem theo giấy tờ gì?',
    wardName: 'UBND Xã An Phú',
    similarityScore: 0.585,
    candidateChunkCode: 'TTHC-HT-03',
    candidateProcedureName: 'Cấp Giấy xác nhận tình trạng hôn nhân',
    legalReference: 'Điều 21, Điều 22 Nghị định 123/2015/NĐ-CP',
    suggestedAnswer:
      '1. TÓM TẮT THỦ TỤC: Cấp Giấy xác nhận tình trạng hôn nhân để sử dụng vào mục đích đi lao động nước ngoài.\n2. THÀNH PHẦN HỒ SƠ: Tờ khai cấp Giấy xác nhận tình trạng hôn nhân (ghi rõ mục đích sử dụng đi XKLĐ Đài Loan), xuất trình thẻ CCCD gắn chip hoặc VNeID mức 2.\n3. THỜI HẠN & LỆ PHÍ: Không quá 03 ngày làm việc.\n4. NƠI TIẾP NHẬN: Bộ phận Một cửa UBND cấp xã nơi công dân thường trú.',
    status: 'PENDING',
    createdAt: '2026-11-05 09:45:00',
    resolvedBy: null,
  },
  {
    id: 'HITL-AG-003',
    query: 'Bà nội tui năm nay 81 tuổi không có lương hưu thì mần thủ tục lãnh tiền già hàng tháng ở ủy ban xã như thế nào?',
    wardName: 'UBND Phường Châu Phú A',
    similarityScore: 0.618,
    candidateChunkCode: 'TTHC-BT-01',
    candidateProcedureName: 'Trợ cấp xã hội hàng tháng cho người cao tuổi',
    legalReference: 'Điều 5 Nghị định 20/2021/NĐ-CP về chính sách trợ giúp xã hội',
    suggestedAnswer:
      '1. TÓM TẮT THỦ TỤC: Người từ đủ 80 tuổi trở lên không có lương hưu, trợ cấp BHXH hàng tháng được hưởng trợ cấp bảo trợ xã hội hàng tháng.\n2. THÀNH PHẦN HỒ SƠ: Tờ khai đề nghị trợ giúp xã hội (Mẫu số 01 Nghị định 20/2021/NĐ-CP), xuất trình CCCD của người cao tuổi.\n3. THỜI HẠN & LỆ PHÍ: Giải quyết trong 07 - 10 ngày làm việc, Miễn phí 100%.\n4. NƠI TIẾP NHẬN: Bộ phận Một cửa UBND cấp xã hoặc nộp trực tuyến qua Cổng DVC.',
    status: 'PENDING',
    createdAt: '2026-11-05 10:12:00',
    resolvedBy: null,
  },
];

export const getHitlQueue = async (): Promise<HitlGrayZoneItem[]> => {
  const resp = await api.get<any>('/rag/hitl-queue');
  const items = resp.data?.data ? resp.data.data : resp.data;
  return Array.isArray(items) ? (items as HitlGrayZoneItem[]) : [];
};

export const resolveHitlItem = async (
  id: string,
  approvedAnswer: string,
  officerName: string
): Promise<HitlGrayZoneItem> => {
  const resp = await api.post<any>(`/rag/hitl-queue/${encodeURIComponent(id)}/resolve`, {
    approvedAnswer,
    officerName,
  });
  return (resp.data?.data ? resp.data.data : resp.data) as HitlGrayZoneItem;
};

export const rebuildSpatialIndex = async (): Promise<{ syncedClustersCount: number; message: string }> => {
  const resp = await api.post<any>('/issues/clusters/rebuild-index');
  const data = resp.data?.data ? resp.data.data : resp.data;
  return {
    syncedClustersCount: data?.syncedClustersCount ?? 0,
    message:
      data?.message ??
      'Đã đồng bộ hóa chỉ mục không gian Redis GEO từ cơ sở dữ liệu PostgreSQL thành công.',
  };
};

/**
 * Multi-step Civic AI Agent chat (POST /api/v1/agent/chat) with automatic fallback to askLegalRag (/rag/ask + offline 40 TTHC).
 */
export const askCivicAgent = async (
  query: string,
  topK = 3,
  wardContext: {
    wardName: string;
    officeAddress: string;
    phoneNumber?: string;
    workingHours?: string;
  } = {
    wardName: 'UBND Phường Long Xuyên, Tỉnh An Giang',
    officeAddress: 'Số 01 Đường Nguyễn Huệ, Phường Long Xuyên, Tỉnh An Giang',
  },
  conversationHistory: ConversationTurn[] = [],
  formType?: string
): Promise<RagResponse> => {
  const cleanQuery = query.trim();
  const isGreeting = classifySmallTalk(cleanQuery);
  if (isGreeting) {
    return askLegalRag(cleanQuery, topK, wardContext, conversationHistory);
  }

  try {
    const historyPayload = conversationHistory.slice(-6).map((h) => ({
      role: h.sender === 'citizen' || h.sender === 'user' ? 'citizen' : 'assistant',
      content: h.text,
      procedureCode: h.procedureCode,
    }));

    const resp = await api.post<any>(
      '/agent/chat',
      {
        message: cleanQuery,
        formType,
        history: historyPayload,
      },
      { timeout: 6000 }
    );
    const agentData: AgentChatResponse | undefined = resp.data?.data ?? resp.data;
    if (agentData && agentData.answer) {
      const normalizedCitations: LegalCitation[] = Array.isArray(agentData.citations)
        ? agentData.citations.map((c: any) => ({
            chunkCode: c.chunkCode || '',
            procedureCode: c.procedureCode || '',
            procedureName: c.procedureName || '',
            title: c.title || '',
            legalReference: c.legalReference || '',
            content: c.excerpt || c.content || '',
            relevanceScore: c.similarityScore ?? c.relevanceScore ?? 0.85,
          }))
        : [];
      return {
        answer: agentData.answer,
        abstained: Boolean(agentData.abstained),
        maxSimilarity: normalizedCitations[0]?.relevanceScore ?? (agentData.abstained ? 0.4 : 0.9),
        appliedThreshold: 0.78,
        citations: normalizedCitations,
        cached: false,
        responseTimeMs: agentData.totalLatencyMs ?? 0,
        disclaimer:
          agentData.disclaimer ||
          'Trợ lý SmartWard AI hỗ trợ tra cứu và điền nháp tờ khai theo quy định hành chính.',
        agentSteps: Array.isArray(agentData.steps) ? agentData.steps : [],
        agentActionCards: Array.isArray(agentData.actionCards) ? agentData.actionCards : [],
        traceId: agentData.traceId,
      };
    }
  } catch (agentErr) {
    console.warn('POST /api/v1/agent/chat unavailable, falling back to /api/v1/rag/ask:', agentErr);
  }

  return askLegalRag(cleanQuery, topK, wardContext, conversationHistory);
};

/**
 * Direct Officer / Admin operational AI assistant call (POST /api/v1/agent/chat with JWT Bearer).
 */
export const askOfficerAgent = async (message: string, sessionId?: string): Promise<AgentChatResponse> => {
  const resp = await api.post<any>(
    '/agent/chat',
    { message: message.trim(), sessionId },
    { timeout: 12000 }
  );
  return (resp.data?.data ?? resp.data) as AgentChatResponse;
};
