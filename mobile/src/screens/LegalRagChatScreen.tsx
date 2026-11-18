/**
 * SmartWard AI Mobile — Tab 1: LegalRagChatScreen
 * Hỏi đáp 40 TTHC An Giang 2026 (Online + Offline SQLite Cache),
 * Chốt chặn chống ảo giác (θ = 0.78, HITL vùng xám [0.42, 0.78)),
 * Nút Đọc Giọng Nói TTS 2 chế độ (MỞ/TẮT), Tải trực tiếp .DOCX/.PDF (0 nút In),
 * và Chuyển tiếp nhanh sang Tab Sơ duyệt đơn.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Send,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from 'lucide-react-native';
import { askLegalRag, fetchProcedures } from '../api/client';
import { TemplateDownloadBar } from '../components/TemplateDownloadBar';
import { VoiceReaderToggle } from '../components/VoiceReaderToggle';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import {
  AN_GIANG_40_PROCEDURES,
  AN_GIANG_SUGGESTED_QUESTIONS,
  buildFivePartAnswer,
  evaluateOfflineLegalRag,
  evaluateRagGuardrailState,
  matchesProcedureFilter,
  PROCEDURE_FILTER_CHIPS,
  resolveCoreFormTypeForProcedure,
  type FivePartLegalAnswer,
  type ProcedureFilterKey,
} from '../core/legalKnowledgeBase';
import type { RootTabParamList } from '../navigation/BottomTabNavigator';
import {
  getCachedProcedures,
  upsertCachedProcedures,
} from '../storage/sqliteDb';
import {
  COLORS,
  DOMAIN_THRESHOLDS,
  MIN_TOUCH_TARGET,
  RADIUS,
  SPACING,
} from '../theme/tokens';
import type { CoreFormType, ProcedureItem, RagAskResponse } from '../types/api.types';

interface RagTurn {
  id: string;
  question: string;
  response: RagAskResponse;
  fiveParts?: FivePartLegalAnswer;
  sourceMode: 'ONLINE' | 'OFFLINE_CACHE';
  createdAt: string;
}

export const LegalRagChatScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { currentWard } = useWard();
  const { typography, stopSpeaking } = useAccessibility();

  const [procedures, setProcedures] = useState<ProcedureItem[]>(AN_GIANG_40_PROCEDURES);
  const [catalogSource, setCatalogSource] = useState<'ONLINE' | 'SQLITE' | 'BUNDLED'>('BUNDLED');
  const [activeFilter, setActiveFilter] = useState<ProcedureFilterKey>('ALL');
  const [questionInput, setQuestionInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [turns, setTurns] = useState<RagTurn[]>([]);
  const [showAllCatalog, setShowAllCatalog] = useState(false);

  // MOB-2.6: Stop TTS immediately when user leaves Tab 1 or component unmounts
  useEffect(() => {
    const unsubscribeBlur = navigation.addListener('blur', () => {
      stopSpeaking();
    });
    return () => {
      unsubscribeBlur();
      stopSpeaking();
    };
  }, [navigation, stopSpeaking]);

  // MOB-2.1: Sync 40 TTHC from Backend -> SQLite cache -> Bundled fallback
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const remoteList = await fetchProcedures();
        if (mounted && remoteList.length > 0) {
          setProcedures(remoteList);
          setCatalogSource('ONLINE');
          await upsertCachedProcedures(remoteList);
          return;
        }
      } catch {
        // Fallback to SQLite cached_procedures
      }

      try {
        const cached = await getCachedProcedures();
        if (mounted && cached.length > 0) {
          setProcedures(
            cached.map((row) => ({
              procedureCode: row.procedure_code,
              officialPortalCode: row.legal_basis || undefined,
              procedureName: row.procedure_name,
              category: row.category,
              agency: 'UBND cấp xã / phường',
              processingTime: row.processing_time || 'Theo quy định',
              fee: row.fee_text || 'Theo quy định',
              status: 'ACTIVE',
              chunksCount: 4,
              formType: (row.form_type as CoreFormType | null) || undefined,
            }))
          );
          setCatalogSource('SQLITE');
          return;
        }
      } catch {
        // Fallback to bundled 40 TTHC
      }

      if (mounted) {
        setProcedures(AN_GIANG_40_PROCEDURES);
        setCatalogSource('BUNDLED');
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProcedures = useMemo(
    () => procedures.filter((p) => matchesProcedureFilter(p, activeFilter)),
    [procedures, activeFilter]
  );

  const visibleCatalog = showAllCatalog
    ? filteredProcedures
    : filteredProcedures.slice(0, 6);

  const handleAskQuestion = useCallback(
    async (rawQuestion: string) => {
      const cleanQ = rawQuestion.trim();
      if (!cleanQ || isAsking) return;

      // MOB-2.6: Always stop active speech before submitting a new query
      stopSpeaking();
      setIsAsking(true);
      setQuestionInput('');

      const turnId = `rag-${Date.now()}`;
      try {
        const onlineResp = await askLegalRag({
          question: cleanQ,
          wardName: currentWard.name,
          wardCode: currentWard.code,
          threshold: DOMAIN_THRESHOLDS.ragDirectAnswerSimilarity,
        });

        const matchedCode = onlineResp.citations?.[0]?.procedureCode;
        const matchedOfflineEntry = matchedCode
          ? AN_GIANG_40_PROCEDURES.find((p) => p.procedureCode === matchedCode)
          : undefined;

        setTurns((prev) => [
          {
            id: turnId,
            question: cleanQ,
            response: onlineResp,
            fiveParts: matchedOfflineEntry
              ? buildFivePartAnswer(
                  matchedOfflineEntry,
                  currentWard.name,
                  currentWard.officeAddress
                )
              : undefined,
            sourceMode: 'ONLINE',
            createdAt: new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
          ...prev,
        ]);
      } catch {
        const offlineResp = evaluateOfflineLegalRag(
          cleanQ,
          currentWard.name,
          currentWard.officeAddress
        );
        setTurns((prev) => [
          {
            id: turnId,
            question: cleanQ,
            response: offlineResp,
            fiveParts: offlineResp.fiveParts,
            sourceMode: 'OFFLINE_CACHE',
            createdAt: new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
          ...prev,
        ]);
      } finally {
        setIsAsking(false);
      }
    },
    [currentWard.code, currentWard.name, currentWard.officeAddress, isAsking, stopSpeaking]
  );

  const handleNavigateToPrecheck = (formType: CoreFormType) => {
    stopSpeaking();
    navigation.navigate('SmartFormTab', { initialFormType: formType });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header Banner */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.ragBadge}>
            <Sparkles size={14} color={COLORS.primary} />
            <Text style={styles.ragBadgeText}>
              LEGAL RAG • θ = {DOMAIN_THRESHOLDS.ragDirectAnswerSimilarity}
            </Text>
          </View>
          <View style={styles.syncPill}>
            {catalogSource === 'ONLINE' ? (
              <CheckCircle2 size={13} color={COLORS.successAccent} />
            ) : (
              <WifiOff size={13} color={COLORS.warningAccent} />
            )}
            <Text style={styles.syncPillText}>
              {catalogSource === 'ONLINE'
                ? `${procedures.length} TTHC Trực tuyến`
                : `${procedures.length} TTHC Offline`}
            </Text>
          </View>
        </View>

        <Text style={[styles.heroTitle, typography.headingLg]}>
          Hỏi Đáp Pháp Lý 40 TTHC — UBND {currentWard.name}
        </Text>
        <Text style={[styles.heroSubtitle, typography.captionSm]}>
          Trả lời chuẩn 5 mục theo văn bản 2026 • Tự chối an toàn khi S_max &lt; 0.78 • Hỗ trợ giọng đọc tiếng Việt cho người cao tuổi.
        </Text>

        {/* Input Bar */}
        <View style={styles.inputRow}>
          <TextInput
            value={questionInput}
            onChangeText={setQuestionInput}
            placeholder="Nhập câu hỏi thủ tục (VD: Làm CT01 cần gì?)..."
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
            returnKeyType="send"
            onSubmitEditing={() => {
              void handleAskQuestion(questionInput);
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gửi câu hỏi pháp lý"
            disabled={isAsking || !questionInput.trim()}
            onPress={() => {
              void handleAskQuestion(questionInput);
            }}
            style={({ pressed }) => [
              styles.sendBtn,
              (!questionInput.trim() || isAsking) && styles.sendBtnDisabled,
              pressed && styles.btnPressed,
            ]}
          >
            {isAsking ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <Send size={18} color={COLORS.onPrimary} />
            )}
          </Pressable>
        </View>
      </View>

      {/* MOB-2.2: One-Tap Suggested Questions for Elderly Citizens */}
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, typography.bodyBold]}>
          Câu hỏi phổ biến 1 chạm tại An Giang
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalRow}
        >
          {AN_GIANG_SUGGESTED_QUESTIONS.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => {
                void handleAskQuestion(item.question);
              }}
              style={({ pressed }) => [
                styles.suggestionChip,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={[styles.suggestionChipText, typography.captionSm]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Answer History (MOB-2.3, 2.4, 2.5, 2.7, 2.9, 2.10) */}
      {turns.map((turn) => {
        const guardrail = evaluateRagGuardrailState(turn.response);
        const primaryCitation = turn.response.citations?.[0];
        const procedureCode =
          primaryCitation?.procedureCode || turn.fiveParts?.procedureCode || 'TTHC-AG';
        const procedureName =
          primaryCitation?.procedureName || turn.fiveParts?.procedureName || turn.question;
        const matchedFormType = resolveCoreFormTypeForProcedure(procedureCode);
        const legalBasis =
          primaryCitation?.legalReference || turn.fiveParts?.legalBasis;

        return (
          <View key={turn.id} style={styles.turnCard}>
            <View style={styles.questionBubble}>
              <Text style={[styles.questionText, typography.bodyBold]}>
                “{turn.question}”
              </Text>
              <Text style={[styles.timeText, typography.captionSm]}>
                {turn.createdAt} • {turn.sourceMode === 'ONLINE' ? 'Máy chủ AI' : 'Kho 40 TTHC Offline'}
              </Text>
            </View>

            {/* Score & Procedure Badge */}
            <View style={styles.scoreRow}>
              <View
                style={[
                  styles.scoreBadge,
                  guardrail.isAbstained ? styles.scoreBadgeWarn : styles.scoreBadgeOk,
                ]}
              >
                <Text
                  style={[
                    styles.scoreBadgeText,
                    guardrail.isAbstained
                      ? styles.scoreBadgeTextWarn
                      : styles.scoreBadgeTextOk,
                  ]}
                >
                  {guardrail.badgeText}
                </Text>
              </View>
            </View>

            {/* MOB-2.4: Abstention Guardrail Card when S_max < 0.78 */}
            {guardrail.isAbstained ? (
              <View
                style={[
                  styles.abstentionCard,
                  guardrail.isHitlGrayZone
                    ? styles.abstentionHitl
                    : styles.abstentionHard,
                ]}
              >
                <View style={styles.abstentionHeader}>
                  <AlertTriangle
                    size={18}
                    color={
                      guardrail.isHitlGrayZone
                        ? COLORS.warningAccent
                        : COLORS.errorAccent
                    }
                  />
                  <Text
                    style={[
                      typography.bodyBold,
                      guardrail.isHitlGrayZone
                        ? styles.abstentionTitleWarn
                        : styles.abstentionTitleErr,
                    ]}
                  >
                    {guardrail.isHitlGrayZone
                      ? 'Chuyển Hàng đợi Thẩm định (HITL Queue)'
                      : 'Chốt chặn An toàn Pháp lý (Từ chối suy đoán)'}
                  </Text>
                </View>

                <Text style={[styles.abstentionBody, typography.bodyMd]}>
                  {turn.response.answer}
                </Text>

                {guardrail.isHitlGrayZone ? (
                  <View style={styles.hitlNoticeBox}>
                    <Clock size={14} color={COLORS.warningText} />
                    <Text style={[styles.hitlNoticeText, typography.captionSm]}>
                      Điểm tương đồng nằm trong vùng xám (0.42 ≤ S_max &lt; 0.78). Câu hỏi đã được chuyển tới Cán bộ Tư pháp - Hộ tịch UBND {currentWard.name} thẩm định.
                    </Text>
                  </View>
                ) : null}

                <VoiceReaderToggle
                  itemId={turn.id}
                  textToRead={turn.response.answer}
                />
              </View>
            ) : (
              /* MOB-2.3: Grounded 5-Part Legal Answer */
              <View style={styles.answerBodyWrap}>
                <VoiceReaderToggle
                  itemId={turn.id}
                  textToRead={`${procedureName}. ${turn.response.answer}`}
                />

                {turn.fiveParts ? (
                  <View style={styles.fivePartList}>
                    <View style={styles.partBox}>
                      <Text style={[styles.partLabel, typography.bodyBold]}>
                        1. Thành phần hồ sơ
                      </Text>
                      <Text style={[styles.partText, typography.bodyMd]}>
                        {turn.fiveParts.requiredDocs}
                      </Text>
                    </View>

                    <View style={styles.partBox}>
                      <Text style={[styles.partLabel, typography.bodyBold]}>
                        2. Thời hạn giải quyết
                      </Text>
                      <Text style={[styles.partText, typography.bodyMd]}>
                        {turn.fiveParts.processingTime}
                      </Text>
                    </View>

                    <View style={styles.partBox}>
                      <Text style={[styles.partLabel, typography.bodyBold]}>
                        3. Lệ phí &amp; Đối tượng miễn giảm
                      </Text>
                      <Text style={[styles.partText, typography.bodyMd]}>
                        {turn.fiveParts.feeAndExemption}
                      </Text>
                    </View>

                    <View style={styles.partBox}>
                      <Text style={[styles.partLabel, typography.bodyBold]}>
                        4. Nơi tiếp nhận
                      </Text>
                      <Text style={[styles.partText, typography.bodyMd]}>
                        {turn.fiveParts.receivingOffice}
                      </Text>
                    </View>

                    <View style={styles.partBox}>
                      <Text style={[styles.partLabel, typography.bodyBold]}>
                        5. Căn cứ pháp lý trích dẫn (2026)
                      </Text>
                      <Text style={[styles.partText, typography.bodyMd]}>
                        {turn.fiveParts.legalBasis}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.rawAnswerText, typography.bodyMd]}>
                    {turn.response.answer}
                  </Text>
                )}

                {/* MOB-2.7 & MOB-2.8: Direct .DOCX & .PDF Download (Zero Print Buttons) */}
                <TemplateDownloadBar
                  procedureCode={procedureCode}
                  procedureName={procedureName}
                  wardName={currentWard.name}
                  formType={matchedFormType}
                  legalBasis={legalBasis}
                />

                {/* MOB-2.9: Quick Handoff CTA to Tab 2 SmartFormPrecheckScreen */}
                {matchedFormType ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleNavigateToPrecheck(matchedFormType)}
                    style={({ pressed }) => [
                      styles.handoffBtn,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <ShieldCheck size={18} color={COLORS.primary} />
                    <Text style={[styles.handoffBtnText, typography.bodyBold]}>
                      🛡️ Chuyển sang Sơ duyệt &amp; Kiểm tra tờ khai này ({matchedFormType})
                    </Text>
                    <ArrowRight size={16} color={COLORS.primary} />
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        );
      })}

      {/* MOB-2.2: Filterable 40 Procedures Directory */}
      <View style={styles.sectionBlock}>
        <View style={styles.catalogHeaderRow}>
          <BookOpen size={18} color={COLORS.primary} />
          <Text style={[styles.sectionTitle, typography.headingMd]}>
            Danh mục {procedures.length} Thủ tục Hành chính Cấp xã (2026)
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalRow}
        >
          {PROCEDURE_FILTER_CHIPS.map((chip) => {
            const active = activeFilter === chip.key;
            return (
              <Pressable
                key={chip.key}
                accessibilityRole="button"
                onPress={() => setActiveFilter(chip.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.catalogList}>
          {visibleCatalog.map((proc) => (
            <Pressable
              key={proc.procedureCode}
              accessibilityRole="button"
              onPress={() => {
                void handleAskQuestion(
                  `Hướng dẫn chi tiết thủ tục ${proc.procedureCode}: ${proc.procedureName}`
                );
              }}
              style={({ pressed }) => [
                styles.procItemCard,
                pressed && styles.btnPressed,
              ]}
            >
              <View style={styles.procItemTop}>
                <Text style={[styles.procCode, typography.monoCode]}>
                  {proc.procedureCode}
                </Text>
                <Text style={styles.procCategory}>{proc.category}</Text>
              </View>
              <Text style={[styles.procName, typography.bodyBold]}>
                {proc.procedureName}
              </Text>
              <Text style={[styles.procMeta, typography.captionSm]}>
                ⏱ {proc.processingTime} • 💰 {proc.fee}
              </Text>
            </Pressable>
          ))}
        </View>

        {filteredProcedures.length > 6 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowAllCatalog((v) => !v)}
            style={styles.expandBtn}
          >
            <Text style={[styles.expandBtnText, typography.bodyBold]}>
              {showAllCatalog
                ? 'Thu gọn danh sách thủ tục'
                : `Xem tất cả ${filteredProcedures.length} thủ tục trong nhóm này`}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  ragBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  ragBadgeText: {
    color: COLORS.primary,
    fontSize: 11.5,
    fontWeight: '800',
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.mutedSurface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  syncPillText: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  heroTitle: {
    color: COLORS.textPrimary,
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
  },
  inputRow: {
    marginTop: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    color: COLORS.textPrimary,
  },
  sendBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.textDisabled,
  },
  btnPressed: {
    opacity: 0.85,
  },
  sectionBlock: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
  },
  horizontalRow: {
    gap: SPACING.sm,
    paddingVertical: 2,
  },
  suggestionChip: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  suggestionChipText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  turnCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  questionBubble: {
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 4,
  },
  questionText: {
    color: COLORS.textPrimary,
  },
  timeText: {
    color: COLORS.textMuted,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreBadge: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  scoreBadgeOk: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
  },
  scoreBadgeWarn: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warningBorder,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  scoreBadgeTextOk: {
    color: COLORS.successText,
  },
  scoreBadgeTextWarn: {
    color: COLORS.warningText,
  },
  abstentionCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  abstentionHitl: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warningBorder,
  },
  abstentionHard: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.errorBorder,
  },
  abstentionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  abstentionTitleWarn: {
    color: COLORS.warningText,
    flex: 1,
  },
  abstentionTitleErr: {
    color: COLORS.errorText,
    flex: 1,
  },
  abstentionBody: {
    color: COLORS.textPrimary,
  },
  hitlNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  hitlNoticeText: {
    color: COLORS.warningText,
    flex: 1,
  },
  answerBodyWrap: {
    gap: SPACING.md,
  },
  fivePartList: {
    gap: SPACING.sm,
  },
  partBox: {
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.md,
    gap: 4,
  },
  partLabel: {
    color: COLORS.primary,
  },
  partText: {
    color: COLORS.textPrimary,
  },
  rawAnswerText: {
    color: COLORS.textPrimary,
  },
  handoffBtn: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  handoffBtnText: {
    color: COLORS.primary,
    flex: 1,
  },
  catalogHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  filterChip: {
    minHeight: 40,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: COLORS.onPrimary,
  },
  catalogList: {
    gap: SPACING.sm,
  },
  procItemCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    padding: SPACING.md,
    gap: 4,
  },
  procItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  procCode: {
    color: COLORS.primary,
  },
  procCategory: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    fontWeight: '700',
  },
  procName: {
    color: COLORS.textPrimary,
  },
  procMeta: {
    color: COLORS.textSecondary,
  },
  expandBtn: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  expandBtnText: {
    color: COLORS.primary,
  },
});
