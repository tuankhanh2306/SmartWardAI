/**
 * SmartWard AI Mobile — Trình Xem Ảnh Giấy Tờ Zero-Trust Vault 1 Lần (MOB-5.4)
 * - Giải mã AES-256-GCM và giữ ảnh hoàn toàn trong RAM (Data URI), tuyệt đối KHÔNG lưu xuống đĩa hay thư viện ảnh
 * - Khi gọi lại token đã tiêu thụ -> hiển thị cảnh báo đỏ HTTP 410 GONE theo NĐ 13/2023/NĐ-CP
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Lock, ShieldAlert, X } from 'lucide-react-native';
import {
  loadVaultImageInMemoryOnly,
  VAULT_410_GONE_MESSAGE,
  type VaultOneTimeViewResult,
} from '../core/officerAuditService';
import { COLORS, RADIUS, SPACING } from '../theme/tokens';

export interface OfficerVaultViewerModalProps {
  visible: boolean;
  token: string | null;
  officerBadgeId?: string;
  alreadyConsumed?: boolean;
  onTokenConsumed: (token: string) => void;
  onClose: () => void;
}

export const OfficerVaultViewerModal: React.FC<OfficerVaultViewerModalProps> = ({
  visible,
  token,
  officerBadgeId,
  alreadyConsumed = false,
  onTokenConsumed,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VaultOneTimeViewResult | null>(null);

  useEffect(() => {
    if (!visible || !token) {
      setResult(null);
      return;
    }

    if (alreadyConsumed) {
      setResult({
        success: false,
        consumed410: true,
        message: VAULT_410_GONE_MESSAGE,
      });
      return;
    }

    let mounted = true;
    setLoading(true);
    setResult(null);

    void loadVaultImageInMemoryOnly(token).then((res) => {
      if (!mounted) return;
      setLoading(false);
      setResult(res);
      if (res.success || res.consumed410) {
        onTokenConsumed(token);
      }
    });

    return () => {
      mounted = false;
      // Clear RAM reference on modal unmount
      setResult(null);
    };
  }, [alreadyConsumed, onTokenConsumed, token, visible]);

  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'ios' ? 54 : Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0,
  );
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'ios' ? 24 : Platform.OS === 'android' ? 12 : 0,
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.safeArea, { paddingTop: topInset, paddingBottom: bottomInset }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Lock size={16} color={COLORS.officerAccentSky} />
            <Text style={styles.headerTitle} numberOfLines={1}>
              Zero-Trust Vault (Xem 1 lần)
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng trình xem Vault"
            onPress={onClose}
            style={styles.closeBtn}
          >
            <X size={20} color={COLORS.onPrimary} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={COLORS.officerAccentSky} />
              <Text style={styles.loadingText}>
                Đang giải mã AES-256-GCM &amp; đóng dấu Watermark...
              </Text>
            </View>
          ) : result?.consumed410 ? (
            <View style={styles.goneCard}>
              <ShieldAlert size={36} color={COLORS.errorAccent} />
              <Text style={styles.goneTitle}>HTTP 410 GONE</Text>
              <Text style={styles.goneMessage}>{result.message}</Text>
            </View>
          ) : result?.success && result.dataUri ? (
            <View style={styles.imageStage}>
              <Image
                source={{ uri: result.dataUri }}
                style={styles.vaultImage}
                resizeMode="contain"
              />
              {/* Diagonal RAM-only Watermark Overlay */}
              <View pointerEvents="none" style={styles.watermarkOverlay}>
                <Text style={styles.watermarkText}>
                  SMARTWARD ZERO-TRUST • {officerBadgeId || 'OFFICER'} • XEM 1 LẦN
                </Text>
              </View>
              <View style={styles.ramNotice}>
                <Text style={styles.ramNoticeText}>
                  ✓ {result.message} Không lưu vào bộ nhớ điện thoại.
                </Text>
              </View>
            </View>
          ) : result ? (
            <View style={styles.goneCard}>
              <AlertTriangle size={32} color={COLORS.warningAccent} />
              <Text style={styles.goneTitle}>Không thể mở tài liệu</Text>
              <Text style={styles.goneMessage}>{result.message}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    height: 54,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    color: COLORS.onPrimary,
    fontSize: 14.5,
    fontWeight: '800',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  centerBox: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    color: '#CBD5E1',
    fontSize: 13.5,
    textAlign: 'center',
  },
  goneCard: {
    backgroundColor: COLORS.errorBg,
    borderWidth: 1.5,
    borderColor: COLORS.errorBorder,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  goneTitle: {
    color: COLORS.errorAccent,
    fontSize: 18,
    fontWeight: '800',
  },
  goneMessage: {
    color: COLORS.errorText,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  imageStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  vaultImage: {
    width: '100%',
    flex: 1,
    borderRadius: RADIUS.lg,
    backgroundColor: '#0F172A',
  },
  watermarkOverlay: {
    position: 'absolute',
    transform: [{ rotate: '-24deg' }],
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  watermarkText: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  ramNotice: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    width: '100%',
  },
  ramNoticeText: {
    color: '#99F6E4',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
});
