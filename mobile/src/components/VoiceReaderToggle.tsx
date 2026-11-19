/**
 * SmartWard AI Mobile — Nút Đọc Giọng Nói Tiếng Việt 2 Chế độ (Tối giản, gọn đẹp)
 * - OFF: Nền #FFFFFF, viền #A7F3D0, chữ #065F46, badge #00796B "MỞ"
 * - ON:  Nền #FEF2F2, viền #FCA5A5, chữ #DC2626, badge #DC2626 "TẮT"
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Volume2, VolumeX } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { COLORS, RADIUS, SPACING } from '../theme/tokens';

export interface VoiceReaderToggleProps {
  itemId: string;
  textToRead: string;
}

export const VoiceReaderToggle: React.FC<VoiceReaderToggleProps> = ({
  itemId,
  textToRead,
}) => {
  const { isSpeaking, speakingId, speakVietnamese, stopSpeaking } =
    useAccessibility();

  const isActive = isSpeaking && speakingId === itemId;

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
      accessibilityLabel={isActive ? 'Tắt đọc giọng nói' : 'Nghe đọc to tiếng Việt'}
      onPress={handleToggle}
      style={({ pressed }) => [
        styles.button,
        isActive ? styles.buttonActive : styles.buttonIdle,
        pressed && styles.buttonPressed,
      ]}
    >
      {isActive ? (
        <VolumeX size={15} color={COLORS.errorAccent} />
      ) : (
        <Volume2 size={15} color={COLORS.successText} />
      )}
      <Text style={[styles.label, isActive ? styles.labelActive : styles.labelIdle]}>
        {isActive ? 'Đang đọc' : 'Nghe'}
      </Text>
      <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeIdle]}>
        <Text style={styles.badgeText}>{isActive ? 'TẮT' : 'MỞ'}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 36,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingLeft: SPACING.sm + 2,
    paddingRight: 4,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  buttonIdle: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.successBorder,
  },
  buttonActive: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.errorBorder,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  labelIdle: {
    color: COLORS.successText,
  },
  labelActive: {
    color: COLORS.errorAccent,
  },
  badge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeIdle: {
    backgroundColor: COLORS.primary,
  },
  badgeActive: {
    backgroundColor: COLORS.errorAccent,
  },
  badgeText: {
    color: COLORS.onPrimary,
    fontSize: 10.5,
    fontWeight: '800',
  },
});
