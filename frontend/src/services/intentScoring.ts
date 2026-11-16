/**
 * SmartWard AI — Shared Intent Scoring & Decision Guardrails
 * ==========================================================
 * Đồng bộ hóa logic đánh giá độ tin cậy giữa RAG Backend (θ = 0.78, θ_lower = 0.42)
 * và Fallback Matcher khi chạy offline.
 *
 * Ngưỡng quyết định (Decision Thresholds):
 * 1. FALLBACK_THRESHOLD = 0.60:
 *    Điểm tự tin tối thiểu để trả lời trực tiếp. Nếu S_max < 0.60, hệ thống từ chối trả lời (Abstain)
 *    và hướng dẫn công dân mô tả rõ hơn hoặc chọn từ 40 TTHC, tuyệt đối không đoán mò.
 *
 * 2. FALLBACK_AMBIGUOUS_GAP = 0.12:
 *    Khoảng cách an toàn tối thiểu giữa Hạng 1 và Hạng 2. Nếu (S_top1 - S_top2) < 0.12,
 *    câu hỏi thuộc "Vùng xám nghi vấn" (Ambiguous). Hệ thống sẽ trả về câu hỏi làm rõ:
 *    "Bạn đang hỏi về [Thủ tục 1] hay [Thủ tục 2]?" kèm 2 nút chọn nhanh.
 *
 * 3. FALLBACK_LOWER_BOUND = 0.42:
 *    Ngưỡng sàn tương đương θ_lower của Backend RagQueryService.
 */

import type { LegalProcedureItem } from './legalKnowledgeBase';
import { removeVietnameseAccents } from './intentClassifier';

export const FALLBACK_THRESHOLD = 0.60;
export const FALLBACK_AMBIGUOUS_GAP = 0.12;
export const FALLBACK_LOWER_BOUND = 0.42;

export interface ScoredProcedure {
  item: LegalProcedureItem;
  score: number;
}

export interface IntentDecision {
  status: 'CONFIDENT' | 'AMBIGUOUS' | 'ABSTAIN';
  top1?: ScoredProcedure;
  top2?: ScoredProcedure;
  maxScore: number;
  scoreGap: number;
  reason: string;
  ambiguousCandidates?: LegalProcedureItem[];
  clarifyingQuestion?: string;
  clarifyingSuggestions?: string[];
  abstentionMessage?: string;
}

/**
 * Word-boundary aware phrase matcher to eliminate false-positive substring collisions
 * (e.g. prevents "bao tro" from matching "o tro" in temporary residence TTHC-CR-03).
 */
export function matchesPhrase(text: string, phrase: string): boolean {
  if (!text || !phrase) return false;
  const t = text.toLowerCase();
  const p = phrase.toLowerCase().trim();
  if (!p) return false;
  if (t === p) return true;
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const boundaryRegex = new RegExp(
    `(^|[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ])${escaped}($|[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ])`,
    'i'
  );
  return boundaryRegex.test(t);
}

const STOP_WORDS = new Set([
  'la', 'là', 'va', 'và', 'cua', 'của', 'cho', 'co', 'có', 'tai', 'tại', 'o', 'ở',
  'gi', 'gì', 'nao', 'nào', 'dau', 'đâu', 'duoc', 'được', 'nhu', 'như', 'the', 'thế',
  'thi', 'thì', 'ra', 'sao', 'toi', 'tôi', 'muon', 'muốn', 'hay', 'hãy', 'lam', 'làm',
  'can', 'cần', 'giup', 'giúp', 'em', 'anh', 'chi', 'chị', 'minh', 'mình', 'nay', 'này',
  'do', 'đó', 'voi', 'với', 've', 'về', 'trong', 'cac', 'các', 'nhung', 'những', 'mot', 'một',
  'da', 'dạ', 'a', 'ạ', 'nhe', 'nhé', 'nha', 'di', 'đi', 'giùm', 'dum', 'hi', 'hello', 'alo', 'chao', 'chào'
]);

/**
 * Chấm điểm tương đồng ngữ nghĩa & từ khóa giữa câu hỏi và danh mục thủ tục
 */
export function scoreProcedureCatalog(query: string, catalog: LegalProcedureItem[]): ScoredProcedure[] {
  const q = query.toLowerCase().trim();
  const qNoAccent = removeVietnameseAccents(q);

  const queryTokens = q
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  const scored: ScoredProcedure[] = catalog.map((item) => {
    let score = 0;

    // 1. So khớp từ khóa đặc trưng (Highest Confidence: +0.50 + độ dài cụm từ)
    let bestKwScore = 0;
    for (const kw of item.keywords) {
      const kwNoAccent = removeVietnameseAccents(kw);
      if (matchesPhrase(q, kw) || matchesPhrase(qNoAccent, kwNoAccent)) {
        const wordCount = kw.split(/\s+/).length;
        const kwScore = 0.50 + Math.min(0.20, Math.max(0, (wordCount - 1) * 0.05));
        if (kwScore > bestKwScore) {
          bestKwScore = kwScore;
        }
      }
    }
    score += bestKwScore;

    // 2. So khớp tên thủ tục chính thức (+0.40)
    const nameNoAccent = removeVietnameseAccents(item.name);
    if (matchesPhrase(q, item.name) || matchesPhrase(qNoAccent, nameNoAccent)) {
      score += 0.40;
    }

    // Trừ điểm xung đột ngữ nghĩa rõ ràng:
    // "mai táng" / "mai tang" là tử tuất / mai táng, không phải trợ cấp sống hàng tháng TTHC-BT-01
    if ((q.includes('mai táng') || q.includes('mai tang')) && item.code === 'TTHC-BT-01') {
      score -= 0.35;
    }
    // "trích lục" là xin cấp lại bản sao TTHC-HT-04, không phải đăng ký mới lần đầu TTHC-HT-01, 02, 03
    if ((q.includes('trích lục') || q.includes('trich luc')) && ['TTHC-HT-01', 'TTHC-HT-02', 'TTHC-HT-03'].includes(item.code)) {
      score -= 0.35;
    }

    // 3. Toàn bộ nội dung quy định, hồ sơ, thẩm quyền (+0.30 theo tỷ lệ token overlap)
    if (queryTokens.length > 0) {
      const fullText = (
        item.name + ' ' + item.category + ' ' + item.keyRules.join(' ') + ' ' + item.dossier.join(' ')
      ).toLowerCase();
      const docTokens = new Set(
        fullText
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .split(/\s+/)
          .filter(Boolean)
      );

      let matchedTokens = 0;
      for (const token of queryTokens) {
        if (docTokens.has(token)) {
          matchedTokens++;
        }
      }
      score += (matchedTokens / queryTokens.length) * 0.30;
    }

    // Giới hạn điểm chuẩn hóa trong khoảng [0.0, 0.98]
    const normalizedScore = Number(Math.min(0.98, Math.max(0.0, score)).toFixed(3));
    return { item, score: normalizedScore };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/**
 * Đánh giá độ tin cậy quyết định (Confidence Decision Guardrail):
 * Áp dụng logic 3 phân loại: CONFIDENT, AMBIGUOUS, ABSTAIN.
 */
export function evaluateIntentDecision(
  query: string,
  scoredProcedures: ScoredProcedure[],
  wardName: string = 'UBND cấp xã'
): IntentDecision {
  const [top1, top2] = scoredProcedures;
  const maxScore = top1?.score || 0.0;
  const secondScore = top2?.score || 0.0;
  const scoreGap = top1 && top2 ? Number((top1.score - top2.score).toFixed(3)) : maxScore;

  // 1. Trường hợp không tìm thấy hoặc điểm quá thấp < FALLBACK_THRESHOLD (0.60)
  if (!top1 || maxScore < FALLBACK_THRESHOLD) {
    const reason = `Điểm tương đồng cao nhất (${maxScore}) thấp hơn ngưỡng tin cậy an toàn (${FALLBACK_THRESHOLD}).`;
    const abstentionMessage =
      `Hệ thống chưa chắc chắn về câu hỏi này (${reason}). ` +
      `Bà con vui lòng mô tả rõ hơn nhu cầu hoặc chọn đúng thủ tục từ danh mục 40 TTHC ${wardName} bên dưới để được hướng dẫn chính xác.`;

    // Log phục vụ vòng lặp cải thiện liên tục (Bước 5)
    console.warn(`[INTENT_ABSTAIN] Query: "${query}" | S_max: ${maxScore} < ${FALLBACK_THRESHOLD}`);

    return {
      status: 'ABSTAIN',
      top1,
      top2,
      maxScore,
      scoreGap,
      reason,
      abstentionMessage,
      clarifyingSuggestions: [
        '👶 Đăng ký khai sinh',
        '💍 Đăng ký kết hôn',
        '🏠 Đăng ký thường trú (CT01)',
        '📋 Xem 40 thủ tục',
      ],
    };
  }

  // 2. Trường hợp Vùng xám mơ hồ (Ambiguous): Gap giữa Top 1 và Top 2 < FALLBACK_AMBIGUOUS_GAP (0.12)
  if (top2 && secondScore >= FALLBACK_LOWER_BOUND && scoreGap < FALLBACK_AMBIGUOUS_GAP) {
    const reason = `Khoảng cách điểm giữa 2 thủ tục đứng đầu quá hẹp (Gap = ${scoreGap} < ${FALLBACK_AMBIGUOUS_GAP}).`;
    const clarifyingQuestion =
      `Dạ, câu hỏi của bà con có thể liên quan đến cả 2 thủ tục hành chính sau tại ${wardName}:\n\n` +
      `1. **${top1.item.name}** (${top1.item.category})\n` +
      `2. **${top2.item.name}** (${top2.item.category})\n\n` +
      `Bà con vui lòng bấm chọn 1 trong 2 nút bên dưới để Cán bộ AI hướng dẫn hồ sơ và lệ phí chính xác nhất:`;

    console.warn(
      `[INTENT_AMBIGUOUS] Query: "${query}" | Top1: "${top1.item.name}" (${top1.score}) vs Top2: "${top2.item.name}" (${top2.score}) | Gap: ${scoreGap}`
    );

    return {
      status: 'AMBIGUOUS',
      top1,
      top2,
      maxScore,
      scoreGap,
      reason,
      ambiguousCandidates: [top1.item, top2.item],
      clarifyingQuestion,
      clarifyingSuggestions: [
        `👉 ${top1.item.name}`,
        `👉 ${top2.item.name}`,
        '📋 Danh mục 40 thủ tục',
      ],
    };
  }

  // 3. Trường hợp Tự tin cao (CONFIDENT): S_max >= 0.60 và Gap >= 0.12
  return {
    status: 'CONFIDENT',
    top1,
    top2,
    maxScore,
    scoreGap,
    reason: `Độ tin cậy cao (${maxScore} >= ${FALLBACK_THRESHOLD}) và cách biệt rõ ràng (Gap ${scoreGap} >= ${FALLBACK_AMBIGUOUS_GAP}).`,
  };
}
