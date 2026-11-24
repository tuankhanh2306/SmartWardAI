/**
 * SmartWard AI Mobile — Modal Camera Quét QR CCCD 60fps (MOB-3.2)
 * - Tích hợp CameraView từ expo-camera (barcodeTypes: ['qr'])
 * - Khung ngắm căn chỉnh góc thẻ CCCD + tia laser #2DD4BF chuyển động mượt
 * - Nút "Dùng QR CCCD mẫu (Demo)" cho máy ảo / Expo Web không có thẻ vật lý
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QrCode, Sparkles, X } from 'lucide-react-native';
import { parseCccdQrString, type DecodedCccdQr } from '../core/cccdQrParser';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';

export const DEMO_CCCD_QR_STRING =
  '089205023490|352123456|NGUYỄN MINH TUẤN KHANH|23062005|Nam|Số 18 Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang|15082022';

export interface CccdQrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onDecoded: (decoded: DecodedCccdQr) => void;
}

export const CccdQrScannerModal: React.FC<CccdQrScannerModalProps> = ({
  visible,
  onClose,
  onDecoded,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanError, setScanError] = useState<string | null>(null);
  const hasScannedRef = useRef(false);
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      hasScannedRef.current = false;
      setScanError(null);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [laserAnim, visible]);

  const handleRawQr = (rawData: string) => {
    if (hasScannedRef.current) return;
    const parsed = parseCccdQrString(rawData);
    if (!parsed.valid || !parsed.data) {
      setScanError(parsed.error || 'Mã QR không đúng chuẩn CCCD Bộ Công An.');
      return;
    }
    hasScannedRef.current = true;
    setScanError(null);
    onDecoded(parsed.data);
    onClose();
  };

  const handleUseDemoQr = () => {
    hasScannedRef.current = false;
    handleRawQr(DEMO_CCCD_QR_STRING);
  };

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 196],
  });

  const canUseLiveCamera = Platform.OS !== 'web' && permission?.granted;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <QrCode size={18} color={COLORS.scannerLaser} />
            <Text style={styles.headerTitle}>Quét QR trên thẻ CCCD</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng camera quét QR"
            onPress={onClose}
            style={styles.closeBtn}
          >
            <X size={20} color={COLORS.onPrimary} />
          </Pressable>
        </View>

        <View style={styles.viewportWrap}>
          {canUseLiveCamera ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => {
                if (data) handleRawQr(data);
              }}
            />
          ) : (
            <View style={styles.fallbackStage}>
              <Text style={styles.fallbackText}>
                {Platform.OS === 'web'
                  ? 'Đang ở chế độ xem thử Web — bấm nút bên dưới để quét dữ liệu CCCD mẫu.'
                  : 'Cấp quyền Camera để quét trực tiếp mã QR góc trên bên phải thẻ CCCD gắn chip.'}
              </Text>
              {Platform.OS !== 'web' && !permission?.granted ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void requestPermission();
                  }}
                  style={styles.permissionBtn}
                >
                  <Text style={styles.permissionBtnText}>Cho phép mở Camera</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {/* Viewfinder Frame with #2DD4BF Animated Laser */}
          <View pointerEvents="none" style={styles.frameOverlay}>
            <View style={styles.viewfinderBox}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <Animated.View
                style={[
                  styles.laserLine,
                  { transform: [{ translateY: laserTranslateY }] },
                ]}
              />
            </View>
            <Text style={styles.hintText}>
              Đưa mã QR góc phải thẻ CCCD vào khung ngắm
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          {scanError ? <Text style={styles.errorText}>{scanError}</Text> : null}
          <Pressable
            accessibilityRole="button"
            onPress={handleUseDemoQr}
            style={({ pressed }) => [styles.demoBtn, pressed && styles.pressed]}
          >
            <Sparkles size={16} color={COLORS.onPrimary} />
            <Text style={styles.demoBtnText}>Dùng dữ liệu QR CCCD mẫu (Demo)</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cameraOverlay,
  },
  header: {
    height: 54,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    color: COLORS.onPrimary,
    fontSize: 15,
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
  viewportWrap: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fallbackStage: {
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  fallbackText: {
    color: '#CBD5E1',
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBtnText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  frameOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  viewfinderBox: {
    width: 224,
    height: 214,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.scannerLaser,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  laserLine: {
    height: 2.5,
    marginHorizontal: 10,
    backgroundColor: COLORS.scannerLaser,
    borderRadius: 2,
  },
  hintText: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    padding: SPACING.lg,
    gap: SPACING.sm,
    backgroundColor: '#020617',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12.5,
    textAlign: 'center',
  },
  demoBtn: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  demoBtnText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.84,
  },
});
