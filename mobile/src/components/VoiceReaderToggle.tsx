/**
 * SmartWard AI Mobile — Nút Đọc Giọng Nói Tiếng Việt 2 Chế độ (VoiceReaderToggle)
 * - Trạng thái 1 (OFF — Mặc định): Nền #FFFFFF, viền #A7F3D0, chữ #065F46, nhãn "🔊 Nghe đọc to" + badge #00796B chữ trắng "MỞ"
 * - Trạng thái 2 (ON — Đang đọc):  Nền #FEF2F2, viền #FCA5A5, chữ #DC2626, nhãn "🔇 Đang đọc..." + badge #DC2626 chữ trắng "TẮT"
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Volume2, VolumeX } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';

export interface VoiceReaderToggleProps {
  itemId: string;
  textToRead: string;
}

export const VoiceReaderToggle: React.FC<VoiceReaderToggleProps> = ({
  itemId,
  textToRead,
}) => {
  const { isSpeaking, speakingId, speakVietnamese, stopSpeaking, typography } =
    useAccessibility();

  const isActive = isSpeaking && speakingId === itemId;

  // Cleanup: never leave TTS speaking after component unmounts
  useEffect(() => {
    return () => {
      if (speakingId === itemId) {
        stopSpeaking();
      }
    };
  }, [itemId, speakingId, stopSpeaking]);

  const handleToggle = () => {
    if (isActive) {
      stopSpeaking();
    } else {
      speakVietnamese(textToRead, itemId);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={
        isActive ? 'Đang đọc to câu trả lời. Nhấn để tắt.' : 'Nghe đọc to câu trả lời bằng tiếng Việt.'
      }
      onPress={handleToggle}
      style={({ pressed }) => [
        styles.button,
        isActive ? styles.buttonActive : styles.buttonIdle,
        pressed && styles.buttonPressed,
      ]}
    >
      <View style={styles.leftRow}>
        {isActive ? (
          <VolumeX size={18} color={COLORS.errorAccent} />
        ) : (
          <Volume2 size={18} color={COLORS.successText} />
        )}
        <Text
          style={[
            typography.bodyBold,
            isActive ? styles.labelActive : styles.labelIdle,
          ]}
        >
          {isActive ? '🔇 Đang đọc...' : '🔊 Nghe đọc to'}
        </Text>
      </View>

      <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeIdle]}>
        <Text style={styles.badgeText}>{isActive ? 'TẮT' : 'MỞ'}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: RADIUS.full,
    borderWidth: 1.25,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  buttonIdle: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.successBorder, // #A7F3D0
  },
  buttonActive: {
    backgroundColor: COLORS.errorBg, // #FEF2F2
    borderColor: COLORS.errorBorder, // #FCA5A5
  },
  buttonPressed: {
    opacity: 0.85,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  labelIdle: {
    color: COLORS.successText, // #065F46
  },
  labelActive: {
    color: COLORS.errorAccent, // #DC2626
  },
  badge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  badgeIdle: {
    backgroundColor: COLORS.primary, // #00796B
  },
  badgeActive: {
    backgroundColor: COLORS.errorAccent, // #DC2626
  },
  badgeText: {
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
});
