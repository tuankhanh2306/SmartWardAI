/**
 * SmartWard AI Mobile — Tab 1: LegalRagChatScreen (Đồng bộ 100% Web CitizenPortal.tsx)
 * - Segmented Switcher: "Hỏi Đáp AI" <-> "40 Thủ Tục"
 * - Khung Chat chuẩn BCA + Claude/Gemini: Bubble công dân #9F0C1E, Bubble AI trắng viền #E2E8F0
 * - 4 Thẻ Bento 2x2 (tự co 1 cột trên Tiny Phone / A++) + Sticky Bottom Composer + KeyboardAvoidingView
 * - Chốt chặn chống ảo giác θ = 0.78 / HITL [0.42, 0.78) + Hotline UBND xã
 * - VoiceReaderToggle (MỞ/TẮT) + TemplateDownloadBar (.DOCX / .PDF, 0 nút In)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
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
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  FileText,
  HeartHandshake,
  Home,
  Layers,
  PhoneCall,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Users,
  WifiOff,
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
import { getOfficeOpenStatus, useResponsivePhone } from '../theme/responsive';
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
  const { typography, fontScaleMode, stopSpeaking } = useAccessibility();
  const responsive = useResponsivePhone(fontScaleMode);
  const officeStatus = getOfficeOpenStatus();

  const chatScrollRef = useRef<ScrollView>(null);

  const [subTab, setSubTab] = useState<'chat' | 'catalog'>('chat');
  const [procedures, setProcedures] = useState<ProcedureItem[]>(AN_GIANG_40_PROCEDURES);
  const [catalogSource, setCatalogSource] = useState<'ONLINE' | 'SQLITE' | 'BUNDLED'>('BUNDLED');
  const [activeFilter, setActiveFilter] = useState<ProcedureFilterKey>('ALL');
  const [catalogKeyword, setCatalogKeyword] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [turns, setTurns] = useState<RagTurn[]>([]);

  // MOB-2.6: Stop TTS immediately when user leaves Tab 1 or unmounts
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

  const bentoCards = useMemo(
    () => [
      {
        code: 'TTHC-CR-01',
        title: 'Thường Trú (CT01)',
        meta: '07 ngày • 10k online',
        Icon: Home,
        prompt: `Thủ tục đăng ký thường trú mẫu CT01 tại ${currentWard.name} cần giấy tờ gì?`,
      },
      {
        code: 'TTHC-HT-01',
        title: 'Đăng Ký Khai Sinh',
        meta: '01 ngày • Miễn phí',
        Icon: FileText,
        prompt: `Thủ tục đăng ký khai sinh cho trẻ mới sinh tại ${currentWard.name} gồm giấy tờ gì?`,
      },
      {
        code: 'TTHC-HT-02',
        title: 'Đăng Ký Kết Hôn',
        meta: 'Trong ngày • Miễn phí',
        Icon: HeartHandshake,
        prompt: `Thủ tục đăng ký kết hôn và giấy xác nhận tình trạng hôn nhân tại ${currentWard.name}?`,
      },
      {
        code: 'TTHC-BT-01',
        title: 'Trợ Cấp Bảo Trợ XH',
        meta: '07 ngày • Miễn phí',
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
            sourceMode: 'ONLINE',
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
            sourceMode: 'OFFLINE_CACHE',
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

  const handleCallHotline = () => {
    const cleanPhone = currentWard.phoneNumber.replace(/[^0-9+]/g, '');
    if (cleanPhone) {
      void Linking.openURL(`tel:${cleanPhone}`).catch(() => {});
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Synced Segmented Switcher from Web CitizenPortal.tsx (< lg mobile view) */}
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
              Hỏi Đáp AI
            </Text>
            {turns.length > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{turns.length}</Text>
              </View>
            ) : null}
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
              {procedures.length} Thủ Tục
            </Text>
          </Pressable>
        </View>
      </View>

      {subTab === 'chat' ? (
        <View style={styles.chatWorkspace}>
          {/* Minimal Chat Topbar matching CitizenPortal.tsx */}
          <View
            style={[
              styles.chatTopbar,
              { paddingHorizontal: responsive.horizontalPadding },
            ]}
          >
            <View style={styles.chatTopbarLeft}>
              <View
                style={[
                  styles.topbarDot,
                  {
                    backgroundColor: officeStatus.isOfficeOpen
                      ? COLORS.onlineDotDark
                      : COLORS.warningAccent,
                  },
                ]}
              />
              <Text numberOfLines={1} style={styles.chatTopbarTitle}>
                Trợ lý Một cửa • θ = {DOMAIN_THRESHOLDS.ragDirectAnswerSimilarity}
              </Text>
            </View>

            <View style={styles.chatTopbarRight}>
              <View style={styles.modeTag}>
                {catalogSource === 'ONLINE' ? (
                  <CheckCircle2 size={12} color={COLORS.successAccent} />
                ) : (
                  <WifiOff size={12} color={COLORS.warningAccent} />
                )}
                <Text style={styles.modeTagText}>
                  {catalogSource === 'ONLINE' ? 'Online' : 'Offline 40'}
                </Text>
              </View>
              {turns.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Làm mới cuộc trò chuyện"
                  onPress={handleResetChat}
                  style={styles.resetBtn}
                >
                  <RotateCcw size={14} color={COLORS.textSecondary} />
                  {!responsive.isTinyPhone ? (
                    <Text style={styles.resetBtnText}>Mới</Text>
                  ) : null}
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Messages Viewport */}
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
                <View style={styles.welcomeAvatar}>
                  <Bot size={28} color={COLORS.citizenBubble} />
                </View>
                <Text style={[styles.welcomeHeading, typography.headingLg]}>
                  Kính chào bà con! Tôi có thể giúp gì?
                </Text>
                <Text style={[styles.welcomeSub, typography.bodyMd]}>
                  Hỏi đáp 40 TTHC cấp xã tại UBND {currentWard.name} • Có giọng đọc tiếng Việt &amp; tải mẫu trực tiếp.
                </Text>

                {/* Responsive Bento Grid (2x2 on Standard/Large, 1x4 on Tiny/A++) */}
                <View style={styles.bentoGrid}>
                  {bentoCards.map((card) => {
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
                            padding: responsive.cardPadding - 2,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.bentoIconWrap}>
                          <IconComp size={16} color={COLORS.citizenBubble} />
                        </View>
                        <Text
                          style={[styles.bentoTitle, typography.bodyBold]}
                          numberOfLines={2}
                        >
                          {card.title}
                        </Text>
                        <Text
                          style={[styles.bentoMeta, typography.captionSm]}
                          numberOfLines={1}
                        >
                          {card.meta}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Quick 1-Tap Chips matching Web CitizenPortal */}
                <View style={styles.quickPromptsWrap}>
                  {AN_GIANG_SUGGESTED_QUESTIONS.slice(0, 3).map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      onPress={() => {
                        void handleAskQuestion(item.question);
                      }}
                      style={({ pressed }) => [
                        styles.quickPromptPill,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.quickPromptText, typography.captionSm]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
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
                    {/* Citizen Bubble (#9F0C1E right-aligned, synced with CitizenPortal.tsx) */}
                    <View style={styles.citizenRow}>
                      <View style={styles.citizenBubble}>
                        <Text style={[styles.citizenBubbleText, typography.bodyMd]}>
                          {turn.question}
                        </Text>
                        <Text style={styles.citizenTimestamp}>{turn.createdAt}</Text>
                      </View>
                    </View>

                    {/* Bot Response Card (White card with BCA avatar) */}
                    <View style={styles.botRow}>
                      {!responsive.isTinyPhone ? (
                        <View style={styles.botAvatar}>
                          <Bot size={15} color={COLORS.citizenBubble} />
                        </View>
                      ) : null}

                      <View
                        style={[
                          styles.botCard,
                          { padding: responsive.cardPadding },
                        ]}
                      >
                        <View style={styles.botMetaRow}>
                          <View
                            style={[
                              styles.scoreBadge,
                              guardrail.isAbstained
                                ? styles.scoreBadgeWarn
                                : styles.scoreBadgeOk,
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
                          <Text style={styles.sourceTag}>
                            {turn.sourceMode === 'ONLINE' ? 'AI Server' : 'Offline 40'}
                          </Text>
                        </View>

                        {guardrail.isAbstained ? (
                          /* MOB-2.4: Abstention Guardrail & Polite Civic Hotline */
                          <View style={styles.abstentionWrap}>
                            <View
                              style={[
                                styles.abstentionBox,
                                guardrail.isHitlGrayZone
                                  ? styles.abstentionHitl
                                  : styles.abstentionHard,
                              ]}
                            >
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
                                      ? styles.abstentionTitleWarn
                                      : styles.abstentionTitleErr,
                                  ]}
                                >
                                  {guardrail.isHitlGrayZone
                                    ? 'Chuyển Hàng đợi Thẩm định (HITL)'
                                    : 'Chốt chặn An toàn Pháp lý'}
                                </Text>
                              </View>
                              <Text style={[styles.abstentionBody, typography.bodyMd]}>
                                {turn.response.answer}
                              </Text>
                              {guardrail.isHitlGrayZone ? (
                                <View style={styles.hitlStrip}>
                                  <Clock size={13} color={COLORS.warningText} />
                                  <Text style={[styles.hitlStripText, typography.captionSm]}>
                                    Vùng xám (0.42 ≤ S_max &lt; 0.78) — Đã chuyển Cán bộ Tư pháp UBND {currentWard.name}.
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {/* Hotline CTA matching Web CitizenPortal.tsx */}
                            <Pressable
                              accessibilityRole="button"
                              onPress={handleCallHotline}
                              style={({ pressed }) => [
                                styles.hotlineCta,
                                pressed && styles.pressed,
                              ]}
                            >
                              <PhoneCall size={15} color={COLORS.onPrimary} />
                              <Text style={[styles.hotlineCtaText, typography.bodyBold]}>
                                Gọi Một cửa {currentWard.name}: {currentWard.phoneNumber}
                              </Text>
                            </Pressable>

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
                                    3. Lệ phí &amp; Miễn giảm
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
                                    5. Căn cứ pháp lý (2026)
                                  </Text>
                                  <Text style={[styles.partText, typography.bodyMd]}>
                                    {turn.fiveParts.legalBasis}
                                  </Text>
                                </View>
                              </View>
                            ) : (
                              <Text style={[styles.partText, typography.bodyMd]}>
                                {turn.response.answer}
                              </Text>
                            )}

                            {/* MOB-2.7 & MOB-2.8: Direct .DOCX/.PDF Download (Zero Print) */}
                            <TemplateDownloadBar
                              procedureCode={procedureCode}
                              procedureName={procedureName}
                              wardName={currentWard.name}
                              formType={matchedFormType}
                              legalBasis={legalBasis}
                            />

                            {/* MOB-2.9: Quick Handoff CTA to Tab 2 */}
                            {matchedFormType ? (
                              <Pressable
                                accessibilityRole="button"
                                onPress={() => handleNavigateToPrecheck(matchedFormType)}
                                style={({ pressed }) => [
                                  styles.handoffBtn,
                                  pressed && styles.pressed,
                                ]}
                              >
                                <ShieldCheck size={17} color={COLORS.primary} />
                                <Text style={[styles.handoffBtnText, typography.bodyBold]}>
                                  Sơ duyệt &amp; Kiểm tra tờ khai ({matchedFormType})
                                </Text>
                                <ArrowRight size={16} color={COLORS.primary} />
                              </Pressable>
                            ) : null}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Sticky Bottom Chat Composer (Always reachable above 5 Bottom Tabs) */}
          <View
            style={[
              styles.composerBar,
              { paddingHorizontal: responsive.horizontalPadding },
            ]}
          >
            <TextInput
              value={questionInput}
              onChangeText={setQuestionInput}
              placeholder="Hỏi thủ tục (VD: Làm CT01, khai sinh, kết hôn)..."
              placeholderTextColor={COLORS.textMuted}
              style={[styles.composerInput, typography.bodyMd]}
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
                styles.composerSendBtn,
                (!questionInput.trim() || isAsking) && styles.composerSendDisabled,
                pressed && styles.pressed,
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
      ) : (
        /* SUB-TAB 2: Full 40 Procedures Catalog */
        <ScrollView
          style={styles.catalogScroll}
          contentContainerStyle={[
            styles.catalogContent,
            { paddingHorizontal: responsive.horizontalPadding },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.catalogHeader}>
            <BookOpen size={18} color={COLORS.citizenCrimson} />
            <Text style={[styles.catalogTitle, typography.headingMd]}>
              Danh mục {procedures.length} TTHC cấp xã An Giang (2026)
            </Text>
          </View>

          <View style={styles.catalogSearchWrap}>
            <Search size={16} color={COLORS.textMuted} />
            <TextInput
              value={catalogKeyword}
              onChangeText={setCatalogKeyword}
              placeholder="Tìm tên hoặc mã thủ tục (VD: CT01, khai sinh)..."
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
                  styles.procCard,
                  { padding: responsive.cardPadding },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.procTopRow}>
                  <View style={styles.procCodeBadge}>
                    <Text style={styles.procCodeText}>{proc.procedureCode}</Text>
                  </View>
                  <Text style={styles.procCategoryText}>{proc.category}</Text>
                </View>
                <Text style={[styles.procName, typography.bodyBold]}>
                  {proc.procedureName}
                </Text>
                <View style={styles.procBottomRow}>
                  <Text style={[styles.procMeta, typography.captionSm]} numberOfLines={2}>
                    ⏱ {proc.processingTime} • 💰 {proc.fee}
                  </Text>
                  <ArrowRight size={15} color={COLORS.citizenCrimson} />
                </View>
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
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.citizenSurface,
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: COLORS.borderSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    padding: 3,
    gap: 4,
  },
  segmentedBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
  },
  segmentedBtnActive: {
    backgroundColor: COLORS.card,
  },
  segmentedText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  segmentedTextActive: {
    color: COLORS.citizenBubble,
  },
  countBadge: {
    backgroundColor: COLORS.citizenCrimson,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countBadgeText: {
    color: COLORS.onPrimary,
    fontSize: 10.5,
    fontWeight: '800',
  },
  chatWorkspace: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  chatTopbar: {
    minHeight: 40,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingVertical: 6,
  },
  chatTopbarLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topbarDot: {
    width: 7,
    height: 7,
    borderRadius: RADIUS.full,
  },
  chatTopbarTitle: {
    color: COLORS.textPrimary,
    fontSize: 12.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  chatTopbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  modeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.mutedSurface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  modeTagText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  resetBtnText: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '700',
  },
  chatScroll: {
    flex: 1,
    backgroundColor: COLORS.chatCanvas,
  },
  chatScrollContent: {
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    flexGrow: 1,
  },
  emptyWelcome: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  welcomeAvatar: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.citizenCrimsonSoftBg,
    borderWidth: 1.5,
    borderColor: COLORS.citizenCrimsonSoftBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeHeading: {
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  welcomeSub: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
  },
  bentoGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  bentoCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 6,
  },
  bentoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.citizenCrimsonSoftBg,
    borderWidth: 1,
    borderColor: COLORS.citizenCrimsonSoftBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoTitle: {
    color: COLORS.textPrimary,
  },
  bentoMeta: {
    color: COLORS.textMuted,
  },
  quickPromptsWrap: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  quickPromptPill: {
    minHeight: 38,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.citizenCrimsonSoftBorder,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  quickPromptText: {
    color: COLORS.citizenBubble,
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
    maxWidth: '86%',
    backgroundColor: COLORS.citizenBubble,
    borderRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 4,
  },
  citizenBubbleText: {
    color: COLORS.onPrimary,
  },
  citizenTimestamp: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10.5,
    alignSelf: 'flex-end',
  },
  botRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.citizenCrimsonSoftBg,
    borderWidth: 1,
    borderColor: COLORS.citizenCrimsonSoftBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  botCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderTopLeftRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: SPACING.sm,
  },
  botMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  scoreBadge: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
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
    fontSize: 11.5,
    fontWeight: '800',
  },
  scoreBadgeTextOk: {
    color: COLORS.successText,
  },
  scoreBadgeTextWarn: {
    color: COLORS.warningText,
  },
  sourceTag: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  abstentionWrap: {
    gap: SPACING.sm,
  },
  abstentionBox: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.xs,
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
  hitlStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: 2,
  },
  hitlStripText: {
    color: COLORS.warningText,
    flex: 1,
  },
  hotlineCta: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  hotlineCtaText: {
    color: COLORS.onPrimary,
    flexShrink: 1,
  },
  answerBodyWrap: {
    gap: SPACING.sm,
  },
  fivePartList: {
    gap: SPACING.xs,
  },
  partBox: {
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.sm,
    gap: 3,
  },
  partLabel: {
    color: COLORS.citizenBubble,
  },
  partText: {
    color: COLORS.textPrimary,
  },
  handoffBtn: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  handoffBtnText: {
    color: COLORS.primary,
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
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    color: COLORS.textPrimary,
  },
  composerSendBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
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
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  catalogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  catalogTitle: {
    color: COLORS.citizenBubble,
    flex: 1,
  },
  catalogSearchWrap: {
    minHeight: MIN_TOUCH_TARGET,
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
    minHeight: 38,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
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
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: COLORS.onPrimary,
  },
  procList: {
    gap: SPACING.sm,
  },
  procCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 6,
  },
  procTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  procCodeBadge: {
    backgroundColor: COLORS.citizenCrimsonSoftBg,
    borderWidth: 1,
    borderColor: COLORS.citizenCrimsonSoftBorder,
    borderRadius: RADIUS.xs,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  procCodeText: {
    color: COLORS.citizenBubble,
    fontSize: 11,
    fontWeight: '800',
  },
  procCategoryText: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    fontWeight: '700',
  },
  procName: {
    color: COLORS.textPrimary,
  },
  procBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  procMeta: {
    color: COLORS.textSecondary,
    flex: 1,
  },
  pressed: {
    opacity: 0.84,
  },
});
