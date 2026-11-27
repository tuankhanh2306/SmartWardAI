/**
 * SmartWard AI Mobile — Đổi Mã PIN Cán Bộ (Đồng bộ chuẩn 6–32 ký tự với Web ChangePinModal)
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound, Lock, X } from 'lucide-react-native';
import { useOfficerAuth } from '../context/OfficerAuthContext';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';

export interface MobileOfficerChangePinModalProps {
  visible: boolean;
  defaultBadgeId?: string;
  onClose: () => void;
  onSuccess?: (newPin: string) => void;
}

export const MobileOfficerChangePinModal: React.FC<MobileOfficerChangePinModalProps> = ({
  visible,
  defaultBadgeId,
  onClose,
  onSuccess,
}) => {
  const { officer, changePin } = useOfficerAuth();

  const [badgeId, setBadgeId] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setBadgeId(defaultBadgeId || officer?.badgeId || '');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setError(null);
      setSuccessMsg(null);
      setSubmitting(false);
    }
  }, [visible, defaultBadgeId, officer?.badgeId]);

  const handleSubmit = async () => {
    if (submitting) return;
    setError(null);
    setSuccessMsg(null);

    const cleanBadge = badgeId.trim().toUpperCase();
    const cleanCurrent = currentPin.trim();
    const cleanNew = newPin.trim();
    const cleanConfirm = confirmPin.trim();

    if (!cleanBadge) {
      setError('Vui lòng nhập Mã thẻ công chức.');
      return;
    }
    if (!cleanCurrent) {
      setError('Vui lòng nhập Mã PIN hiện tại.');
      return;
    }
    if (!cleanNew) {
      setError('Vui lòng nhập Mã PIN mới.');
      return;
    }
    if (cleanNew.length < 6 || cleanNew.length > 32) {
      setError('Mã PIN mới phải từ 6 đến 32 ký tự.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setError('Xác nhận mã PIN mới không khớp.');
      return;
    }
    if (cleanNew === cleanCurrent) {
      setError('Mã PIN mới không được trùng với mã PIN hiện tại.');
      return;
    }

    setSubmitting(true);
    try {
      await changePin({
        badgeId: cleanBadge,
        currentPin: cleanCurrent,
        newPin: cleanNew,
        confirmPin: cleanConfirm,
      });
      setSuccessMsg('Đổi mã PIN thành công. Vui lòng ghi nhớ mã PIN mới.');
      onSuccess?.(cleanNew);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Đổi mã PIN thất bại. Vui lòng kiểm tra lại thông tin.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.backdrop} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBox}>
                <KeyRound size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.title}>Đổi Mã PIN Cán Bộ</Text>
                <Text style={styles.subtitle}>Bảo mật 6–32 ký tự (chuẩn Một cửa)</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng đổi mã PIN"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <X size={18} color={COLORS.textSecondary} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <View style={styles.field}>
              <Text style={styles.label}>Mã thẻ công chức</Text>
              <TextInput
                value={badgeId}
                onChangeText={(v) => setBadgeId(v.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="VD: CB-AG_P_LONGXUYEN"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Mã PIN hiện tại</Text>
              <View style={styles.passwordRow}>
                <Lock size={15} color={COLORS.textMuted} />
                <TextInput
                  value={currentPin}
                  onChangeText={setCurrentPin}
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={32}
                  placeholder="Nhập mã PIN hiện tại"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.passwordInput}
                />
                <Pressable onPress={() => setShowCurrent((v) => !v)} hitSlop={8}>
                  {showCurrent ? (
                    <EyeOff size={16} color={COLORS.textMuted} />
                  ) : (
                    <Eye size={16} color={COLORS.textMuted} />
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Mã PIN mới (6–32 ký tự)</Text>
              <View style={styles.passwordRow}>
                <Lock size={15} color={COLORS.textMuted} />
                <TextInput
                  value={newPin}
                  onChangeText={setNewPin}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={32}
                  placeholder="Nhập mã PIN mới"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.passwordInput}
                />
                <Pressable onPress={() => setShowNew((v) => !v)} hitSlop={8}>
                  {showNew ? (
                    <EyeOff size={16} color={COLORS.textMuted} />
                  ) : (
                    <Eye size={16} color={COLORS.textMuted} />
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Xác nhận mã PIN mới</Text>
              <View style={styles.passwordRow}>
                <Lock size={15} color={COLORS.textMuted} />
                <TextInput
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={32}
                  placeholder="Nhập lại mã PIN mới"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.passwordInput}
                />
                <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                  {showConfirm ? (
                    <EyeOff size={16} color={COLORS.textMuted} />
                  ) : (
                    <Eye size={16} color={COLORS.textMuted} />
                  )}
                </Pressable>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <AlertTriangle size={15} color={COLORS.errorAccent} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {successMsg ? (
              <View style={styles.successBox}>
                <CheckCircle2 size={15} color={COLORS.successAccent} />
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable onPress={onClose} style={styles.cancelBtn} disabled={submitting}>
                <Text style={styles.cancelText}>Hủy</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void handleSubmit();
                }}
                disabled={submitting}
                style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>Cập nhật PIN</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.citizenCrimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 11.5, color: COLORS.textMuted },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.mutedSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: SPACING.md, gap: SPACING.sm },
  field: { gap: 4 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  input: {
    minHeight: MIN_TOUCH_TARGET - 4,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  passwordRow: {
    minHeight: MIN_TOUCH_TARGET - 4,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  passwordInput: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.textPrimary,
    paddingVertical: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  errorText: { fontSize: 12, fontWeight: '600', color: COLORS.errorText, flex: 1 },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  successText: { fontSize: 12, fontWeight: '600', color: COLORS.successText, flex: 1 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  cancelBtn: {
    minHeight: 42,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  submitBtn: {
    minHeight: 42,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.citizenCrimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});
