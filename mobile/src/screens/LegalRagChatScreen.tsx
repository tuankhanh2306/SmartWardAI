/**
 * SmartWard AI Mobile — Tab 1: 40 TTHC & Hỏi Đáp AI (Clean Mobile Pro Max)
 * - Bỏ hoàn toàn thanh kỹ thuật thừa (θ = 0.78, Offline 40, mã xã...) khỏi mặt tiền
 * - Nút bấm tối giản, 1 thẻ trả lời trắng phẳng phân cách bằng đường kẻ mảnh (không lồng hộp)
 * - Hỗ trợ đầy đủ: 40 TTHC Online/Offline, Guardrail an toàn, TTS MỞ/TẮT, Tải .DOCX/.PDF (0 nút In)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
  Bot,
  FileCheck2,
  FileText,
  HeartHandshake,
  Home,
  Layers,
  RotateCcw,
  Search,
  Send,
  Users,
  X,
} from 'lucide-react-native';
import { askLegalRag, fetchProcedures } from '../api/client';
import { TemplateDownloadBar } from '../components/TemplateDownloadBar';
import { VoiceReaderToggle } from '../components/VoiceReaderToggle';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { normalizeVietnameseText } from '../core/angiangWards';
import {
  AN_GIANG_40_PROCEDURES,
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
import { useResponsivePhone } from '../theme/responsive';
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
  createdAt: string;
}

export const LegalRagChatScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { currentWard } = useWard();
  const { typography, fontScaleMode, stopSpeaking } = useAccessibility();
  const responsive = useResponsivePhone(fontScaleMode);

  const chatScrollRef = useRef<ScrollView>(null);

  const [subTab, setSubTab] = useState<'chat' | 'catalog'>('chat');
  const [procedures, setProcedures] = useState<ProcedureItem[]>(AN_GIANG_40_PROCEDURES);
  const [activeFilter, setActiveFilter] = useState<ProcedureFilterKey>('ALL');
  const [catalogKeyword, setCatalogKeyword] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [turns, setTurns] = useState<RagTurn[]>([]);

  // Stop TTS immediately when leaving Tab 1 or unmounting
  useEffect(() => {
    const unsubscribeBlur = navigation.addListener('blur', () => {
      stopSpeaking();
    });
    return () => {
      unsubscribeBlur();
      stopSpeaking();
    };
  }, [navigation, stopSpeaking]);

  // Sync 40 TTHC silently in background (Online -> SQLite -> Bundled 40)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const remoteList = await fetchProcedures();
        if (mounted && remoteList.length > 0) {
          setProcedures(remoteList);
          await upsertCachedProcedures(remoteList);
          return;
        }
      } catch {
        // Fallback to SQLite
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
          return;
        }
      } catch {
        // Fallback to bundled
      }

      if (mounted) {
        setProcedures(AN_GIANG_40_PROCEDURES);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const quickCards = useMemo(
    () => [
      {
        code: 'TTHC-CR-01',
        title: 'Thường trú',
        sub: 'Mẫu CT01',
        Icon: Home,
        prompt: `Thủ tục đăng ký thường trú mẫu CT01 tại ${currentWard.name} cần giấy tờ gì?`,
      },
      {
        code: 'TTHC-HT-01',
        title: 'Khai sinh',
        sub: 'Miễn phí',
        Icon: FileText,
        prompt: `Thủ tục đăng ký khai sinh cho trẻ mới sinh tại ${currentWard.name} gồm giấy tờ gì?`,
      },
      {
        code: 'TTHC-HT-02',
        title: 'Kết hôn',
        sub: 'Giấy độc thân',
        Icon: HeartHandshake,
        prompt: `Thủ tục đăng ký kết hôn và giấy xác nhận tình trạng hôn nhân tại ${currentWard.name}?`,
      },
      {
        code: 'TTHC-BT-01',
        title: 'Bảo trợ XH',
        sub: 'Người cao tuổi',
        Icon: Users,
        prompt: `Hồ sơ hưởng trợ cấp bảo trợ xã hội hằng tháng cho người cao tuổi tại ${currentWard.name}?`,
      },
    ],
    [currentWard.name]
  );

  const filteredProcedures = useMemo(() => {
    const normKw = normalizeVietnameseText(catalogKeyword);
    return procedures.filter((p) => {
      if (!matchesProcedureFilter(p, activeFilter)) return false;
      if (!normKw) return true;
      return (
        normalizeVietnameseText(p.procedureName).includes(normKw) ||
        normalizeVietnameseText(p.procedureCode).includes(normKw) ||
        normalizeVietnameseText(p.category).includes(normKw)
      );
    });
  }, [procedures, activeFilter, catalogKeyword]);

  const handleAskQuestion = useCallback(
    async (rawQuestion: string) => {
      const cleanQ = rawQuestion.trim();
      if (!cleanQ || isAsking) return;

      stopSpeaking();
      setSubTab('chat');
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
          ...prev,
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
            createdAt: new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        ]);
      } catch {
        const offlineResp = evaluateOfflineLegalRag(
          cleanQ,
          currentWard.name,
          currentWard.officeAddress
        );
        setTurns((prev) => [
          ...prev,
          {
            id: turnId,
            question: cleanQ,
            response: offlineResp,
            fiveParts: offlineResp.fiveParts,
            createdAt: new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        ]);
      } finally {
        setIsAsking(false);
        setTimeout(() => {
          chatScrollRef.current?.scrollToEnd({ animated: true });
        }, 120);
      }
    },
    [currentWard.code, currentWard.name, currentWard.officeAddress, isAsking, stopSpeaking]
  );

  const handleResetChat = () => {
    stopSpeaking();
    setTurns([]);
  };

  const handleNavigateToPrecheck = (formType: CoreFormType) => {
    stopSpeaking();
    navigation.navigate('SmartFormTab', { initialFormType: formType });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Compact 2-Mode Switcher + Clear Chat Button */}
      <View
        style={[
          styles.segmentedWrap,
          { paddingHorizontal: responsive.horizontalPadding },
        ]}
      >
        <View style={styles.segmentedTrack}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: subTab === 'chat' }}
            onPress={() => setSubTab('chat')}
            style={[
              styles.segmentedBtn,
              subTab === 'chat' && styles.segmentedBtnActive,
            ]}
          >
            <Bot
              size={15}
              color={subTab === 'chat' ? COLORS.citizenBubble : COLORS.textSecondary}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.segmentedText,
                subTab === 'chat' && styles.segmentedTextActive,
              ]}
            >
              Hỏi đáp
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: subTab === 'catalog' }}
            onPress={() => setSubTab('catalog')}
            style={[
              styles.segmentedBtn,
              subTab === 'catalog' && styles.segmentedBtnActive,
            ]}
          >
            <Layers
              size={15}
              color={subTab === 'catalog' ? COLORS.citizenBubble : COLORS.textSecondary}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.segmentedText,
                subTab === 'catalog' && styles.segmentedTextActive,
              ]}
            >
              40 thủ tục
            </Text>
          </Pressable>
        </View>

        {subTab === 'chat' && turns.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Làm mới hội thoại"
            onPress={handleResetChat}
            style={({ pressed }) => [styles.resetIconBtn, pressed && styles.pressed]}
          >
            <RotateCcw size={16} color={COLORS.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {subTab === 'chat' ? (
        <View style={styles.chatWorkspace}>
          <ScrollView
            ref={chatScrollRef}
            style={styles.chatScroll}
            contentContainerStyle={[
              styles.chatScrollContent,
              { paddingHorizontal: responsive.horizontalPadding },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {turns.length === 0 ? (
              <View style={styles.emptyWelcome}>
                <Text style={[styles.welcomeHeading, typography.headingLg]}>
                  Tôi có thể giúp gì cho bạn?
                </Text>
                <Text style={[styles.welcomeSub, typography.captionSm]}>
                  Chọn nhanh thủ tục hoặc đặt câu hỏi bên dưới
                </Text>

                <View style={styles.bentoGrid}>
                  {quickCards.map((card) => {
                    const IconComp = card.Icon;
                    return (
                      <Pressable
                        key={card.code}
                        accessibilityRole="button"
                        onPress={() => {
                          void handleAskQuestion(card.prompt);
                        }}
                        style={({ pressed }) => [
                          styles.bentoCard,
                          {
                            width: responsive.bentoColumns === 2 ? '48.5%' : '100%',
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.bentoIconWrap}>
                          <IconComp size={16} color={COLORS.citizenBubble} />
                        </View>
                        <Text
                          style={[styles.bentoTitle, typography.bodyBold]}
                          numberOfLines={1}
                        >
                          {card.title}
                        </Text>
                        <Text
                          style={[styles.bentoMeta, typography.captionSm]}
                          numberOfLines={1}
                        >
                          {card.sub}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSubTab('catalog')}
                  style={({ pressed }) => [styles.viewCatalogBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.viewCatalogText}>Xem tất cả 40 thủ tục</Text>
                  <ArrowRight size={14} color={COLORS.citizenBubble} />
                </Pressable>
              </View>
            ) : (
              turns.map((turn) => {
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
                  <View key={turn.id} style={styles.turnBlock}>
                    {/* Citizen Bubble */}
                    <View style={styles.citizenRow}>
                      <View style={styles.citizenBubble}>
                        <Text style={[styles.citizenBubbleText, typography.bodyMd]}>
                          {turn.question}
                        </Text>
                      </View>
                    </View>

                    {/* Clean Single-Surface Bot Card */}
                    <View style={[styles.botCard, { padding: responsive.cardPadding }]}>
                      {guardrail.isAbstained ? (
                        <View style={styles.abstentionWrap}>
                          <View style={styles.abstentionHeader}>
                            <AlertTriangle
                              size={16}
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
                                  ? styles.warnTitle
                                  : styles.errTitle,
                              ]}
                            >
                              {guardrail.isHitlGrayZone
                                ? 'Đã chuyển cán bộ xác minh'
                                : 'Ngoài phạm vi 40 TTHC cấp xã'}
                            </Text>
                          </View>
                          <Text style={[styles.partText, typography.bodyMd]}>
                            {turn.response.answer}
                          </Text>
                          <VoiceReaderToggle
                            itemId={turn.id}
                            textToRead={turn.response.answer}
                          />
                        </View>
                      ) : (
                        <View style={styles.answerWrap}>
                          <View style={styles.answerHeader}>
                            <Text
                              style={[styles.answerTitle, typography.headingMd]}
                              numberOfLines={2}
                            >
                              {procedureName}
                            </Text>
                            <VoiceReaderToggle
                              itemId={turn.id}
                              textToRead={`${procedureName}. ${turn.response.answer}`}
                            />
                          </View>

                          <View style={styles.hairline} />

                          {turn.fiveParts ? (
                            <View style={styles.sectionsList}>
                              <View style={styles.sectionItem}>
                                <Text style={[styles.sectionLabel, typography.bodyBold]}>
                                  1. Hồ sơ cần chuẩn bị
                                </Text>
                                <Text style={[styles.partText, typography.bodyMd]}>
                                  {turn.fiveParts.requiredDocs}
                                </Text>
                              </View>

                              <View style={styles.hairline} />

                              <View style={styles.sectionItem}>
                                <Text style={[styles.sectionLabel, typography.bodyBold]}>
                                  2. Thời hạn &amp; Lệ phí
                                </Text>
                                <Text style={[styles.partText, typography.bodyMd]}>
                                  • Thời hạn: {turn.fiveParts.processingTime}
                                  {'\n'}• Lệ phí: {turn.fiveParts.feeAndExemption}
                                </Text>
                              </View>

                              <View style={styles.hairline} />

                              <View style={styles.sectionItem}>
                                <Text style={[styles.sectionLabel, typography.bodyBold]}>
                                  3. Nơi nộp &amp; Căn cứ pháp lý
                                </Text>
                                <Text style={[styles.partText, typography.bodyMd]}>
                                  • {turn.fiveParts.receivingOffice}
                                  {'\n'}• {turn.fiveParts.legalBasis}
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <Text style={[styles.partText, typography.bodyMd]}>
                              {turn.response.answer}
                            </Text>
                          )}

                          <View style={styles.hairline} />

                          <TemplateDownloadBar
                            procedureCode={procedureCode}
                            procedureName={procedureName}
                            wardName={currentWard.name}
                            formType={matchedFormType}
                            legalBasis={legalBasis}
                          />

                          {matchedFormType ? (
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => handleNavigateToPrecheck(matchedFormType)}
                              style={({ pressed }) => [
                                styles.handoffBtn,
                                pressed && styles.pressed,
                              ]}
                            >
                              <FileCheck2 size={16} color={COLORS.citizenCrimson} />
                              <Text style={styles.handoffBtnText} numberOfLines={1}>
                                Kiểm tra tờ khai ({matchedFormType})
                              </Text>
                              <ArrowRight size={15} color={COLORS.citizenCrimson} />
                            </Pressable>
                          ) : null}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Floating Clean Bottom Composer */}
          <View
            style={[
              styles.composerBar,
              { paddingHorizontal: responsive.horizontalPadding },
            ]}
          >
            <TextInput
              value={questionInput}
              onChangeText={setQuestionInput}
              placeholder="Hỏi thủ tục cần làm..."
              placeholderTextColor={COLORS.textMuted}
              style={[styles.composerInput, typography.bodyMd]}
              returnKeyType="send"
              onSubmitEditing={() => {
                void handleAskQuestion(questionInput);
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Gửi câu hỏi"
              disabled={isAsking || !questionInput.trim()}
              onPress={() => {
                void handleAskQuestion(questionInput);
              }}
              style={({ pressed }) => [
                styles.composerSendBtn,
                (!questionInput.trim() || isAsking) && styles.composerSendDisabled,
                pressed && styles.pressed,
              ]}
            >
              {isAsking ? (
                <ActivityIndicator size="small" color={COLORS.onPrimary} />
              ) : (
                <Send size={17} color={COLORS.onPrimary} />
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        /* SUB-TAB 2: Clean 40 Procedures Directory */
        <ScrollView
          style={styles.catalogScroll}
          contentContainerStyle={[
            styles.catalogContent,
            { paddingHorizontal: responsive.horizontalPadding },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.catalogSearchWrap}>
            <Search size={16} color={COLORS.textMuted} />
            <TextInput
              value={catalogKeyword}
              onChangeText={setCatalogKeyword}
              placeholder="Tìm thủ tục (VD: CT01, khai sinh)..."
              placeholderTextColor={COLORS.textMuted}
              style={[styles.catalogSearchInput, typography.bodyMd]}
            />
            {catalogKeyword.length > 0 ? (
              <Pressable onPress={() => setCatalogKeyword('')} hitSlop={8}>
                <X size={16} color={COLORS.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {PROCEDURE_FILTER_CHIPS.map((chip) => {
              const active = activeFilter === chip.key;
              return (
                <Pressable
                  key={chip.key}
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

          <View style={styles.procList}>
            {filteredProcedures.map((proc) => (
              <Pressable
                key={proc.procedureCode}
                accessibilityRole="button"
                onPress={() => {
                  void handleAskQuestion(
                    `Hướng dẫn thủ tục ${proc.procedureCode}: ${proc.procedureName}`
                  );
                }}
                style={({ pressed }) => [
                  styles.procRow,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.procTextCol}>
                  <Text style={[styles.procName, typography.bodyBold]} numberOfLines={2}>
                    {proc.procedureName}
                  </Text>
                  <Text style={[styles.procMeta, typography.captionSm]} numberOfLines={1}>
                    {proc.processingTime} • {proc.fee}
                  </Text>
                </View>
                <ArrowRight size={16} color={COLORS.textMuted} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.citizenSurface,
  },
  segmentedWrap: {
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.citizenSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  segmentedTrack: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    padding: 3,
    gap: 4,
  },
  segmentedBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  segmentedBtnActive: {
    backgroundColor: COLORS.card,
  },
  segmentedText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentedTextActive: {
    color: COLORS.citizenBubble,
  },
  resetIconBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatWorkspace: {
    flex: 1,
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
    flexGrow: 1,
  },
  emptyWelcome: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  welcomeHeading: {
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  welcomeSub: {
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  bentoGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  bentoCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.md,
    gap: 4,
  },
  bentoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.citizenCrimsonSoftBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bentoTitle: {
    color: COLORS.textPrimary,
  },
  bentoMeta: {
    color: COLORS.textMuted,
  },
  viewCatalogBtn: {
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewCatalogText: {
    color: COLORS.citizenBubble,
    fontSize: 13,
    fontWeight: '700',
  },
  turnBlock: {
    gap: SPACING.sm,
  },
  citizenRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  citizenBubble: {
    maxWidth: '84%',
    backgroundColor: COLORS.citizenBubble,
    borderRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  citizenBubbleText: {
    color: COLORS.onPrimary,
  },
  botCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  abstentionWrap: {
    gap: SPACING.sm,
  },
  abstentionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warnTitle: {
    color: COLORS.warningText,
    flex: 1,
  },
  errTitle: {
    color: COLORS.errorText,
    flex: 1,
  },
  answerWrap: {
    gap: SPACING.sm,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  answerTitle: {
    color: COLORS.textPrimary,
    flex: 1,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.borderSubtle,
  },
  sectionsList: {
    gap: SPACING.sm,
  },
  sectionItem: {
    gap: 3,
  },
  sectionLabel: {
    color: COLORS.citizenBubble,
  },
  partText: {
    color: COLORS.textPrimary,
  },
  handoffBtn: {
    minHeight: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.citizenCrimsonSoftBg,
    borderWidth: 1,
    borderColor: COLORS.citizenCrimsonSoftBorder,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  handoffBtnText: {
    color: COLORS.citizenCrimson,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  composerBar: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  composerInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    color: COLORS.textPrimary,
  },
  composerSendBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.citizenCrimson,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  composerSendDisabled: {
    backgroundColor: COLORS.textDisabled,
  },
  catalogScroll: {
    flex: 1,
  },
  catalogContent: {
    paddingBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  catalogSearchWrap: {
    minHeight: 44,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  catalogSearchInput: {
    flex: 1,
    minWidth: 0,
    color: COLORS.textPrimary,
  },
  filterRow: {
    gap: SPACING.xs,
    paddingVertical: 2,
  },
  filterChip: {
    minHeight: 34,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.citizenCrimson,
    borderColor: COLORS.citizenCrimson,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: COLORS.onPrimary,
  },
  procList: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
  },
  procRow: {
    minHeight: MIN_TOUCH_TARGET + 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  procTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  procName: {
    color: COLORS.textPrimary,
  },
  procMeta: {
    color: COLORS.textMuted,
  },
  pressed: {
    opacity: 0.82,
  },
});
