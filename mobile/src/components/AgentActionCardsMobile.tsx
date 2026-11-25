import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, CheckCircle2, ClipboardList, FileCheck2 } from 'lucide-react-native';
import type { InitialFormDraft } from '../navigation/BottomTabNavigator';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';
import type { AgentActionCard, AgentStep, CoreFormType } from '../types/api.types';

interface AgentActionCardsMobileProps {
  steps?: AgentStep[];
  cards?: AgentActionCard[];
  onOpenPrefilledForm?: (formType: CoreFormType, draft: InitialFormDraft) => void;
}

const VALID_FORM_TYPES = new Set<CoreFormType>(['CT01', 'TK-KS', 'TK-KH', 'TK-BTXH']);

export const AgentActionCardsMobile: React.FC<AgentActionCardsMobileProps> = ({
  steps,
  cards,
  onOpenPrefilledForm,
}) => {
  const hasSteps = Array.isArray(steps) && steps.length > 0;
  const hasCards = Array.isArray(cards) && cards.length > 0;
  if (!hasSteps && !hasCards) return null;

  return (
    <View style={styles.container}>
      {hasSteps ? (
        <View style={styles.stepsWrap}>
          {steps.map((step) => (
            <View key={`${step.toolName}-${step.stepIndex}`} style={styles.stepPill}>
              <CheckCircle2 size={12} color="#047857" />
              <Text style={styles.stepText} numberOfLines={1}>
                {step.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {hasCards
        ? cards.map((card, idx) => {
            const payload = (card.payload || {}) as Record<string, any>;

            if (card.type === 'DOSSIER_STATUS') {
              return (
                <View key={`m-dossier-${idx}`} style={styles.dossierCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.titleRow}>
                      <ClipboardList size={15} color="#0369A1" />
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {card.title}
                      </Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>
                        {String(payload.statusLabel || payload.status || 'Đang xử lý')}
                      </Text>
                    </View>
                  </View>
                  {payload.procedureName ? (
                    <Text style={styles.cardSub}>{String(payload.procedureName)}</Text>
                  ) : null}
                  {payload.maskedCccd ? (
                    <Text style={styles.metaText}>CCCD: {String(payload.maskedCccd)}</Text>
                  ) : null}
                  {payload.officerFeedback ? (
                    <Text style={styles.feedbackText}>
                      Ghi chú cán bộ: {String(payload.officerFeedback)}
                    </Text>
                  ) : null}
                </View>
              );
            }

            if (card.type === 'OPEN_PREFILLED_FORM') {
              const draftObj = (payload.draftPayload || payload) as Record<string, any>;
              const rawType = String(payload.formType || draftObj.formType || 'CT01').toUpperCase() as CoreFormType;
              const safeType: CoreFormType = VALID_FORM_TYPES.has(rawType) ? rawType : 'CT01';

              return (
                <View key={`m-draft-${idx}`} style={styles.draftCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {card.title}
                    </Text>
                    <Text style={styles.draftBadge}>Bản nháp</Text>
                  </View>
                  {card.subtitle ? <Text style={styles.cardSub}>{card.subtitle}</Text> : null}
                  {onOpenPrefilledForm ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        onOpenPrefilledForm(safeType, {
                          fullName: typeof draftObj.fullName === 'string' ? draftObj.fullName : undefined,
                          citizenCccd: typeof draftObj.citizenCccd === 'string' ? draftObj.citizenCccd : undefined,
                          dateOfBirth: typeof draftObj.dateOfBirth === 'string' ? draftObj.dateOfBirth : undefined,
                          gender: typeof draftObj.gender === 'string' ? draftObj.gender : undefined,
                          address: typeof draftObj.address === 'string' ? draftObj.address : undefined,
                          phoneNumber: typeof draftObj.phoneNumber === 'string' ? draftObj.phoneNumber : undefined,
                        })
                      }
                      style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                    >
                      <FileCheck2 size={15} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Mở tờ khai đã điền sẵn</Text>
                      <ArrowRight size={14} color="#FFFFFF" />
                    </Pressable>
                  ) : null}
                </View>
              );
            }

            return null;
          })
        : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.sm,
    gap: 8,
  },
  stepsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    maxWidth: '100%',
  },
  stepText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
    flexShrink: 1,
  },
  dossierCard: {
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 4,
  },
  draftCard: {
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#0369A1',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  draftBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#5EEAD4',
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  feedbackText: {
    fontSize: 12,
    color: '#92400E',
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: RADIUS.sm,
    marginTop: 2,
  },
  primaryBtn: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: RADIUS.md,
    backgroundColor: '#00796B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
});
