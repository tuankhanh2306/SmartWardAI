/**
 * SmartWard AI Mobile — Khung Camera Chụp Giấy Tờ (TASK-057)
 * - Khung dọc tỉ lệ A4 cho tờ khai / Giấy chứng sinh, khung ngang cho thẻ CCCD
 * - Có bật/tắt đèn flash, nút chụp và nút chọn từ thư viện đi chung 1 luồng kiểm định
 */

import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X, Zap, ZapOff } from 'lucide-react-native';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';

export interface CapturedMediaAsset {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string | null;
  mimeType?: string | null;
  source: 'CAMERA' | 'LIBRARY';
}

export interface DocumentCameraModalProps {
  visible: boolean;
  frameMode: 'A4' | 'CCCD';
  title: string;
  hint?: string;
  onClose: () => void;
  onPhotoSelected: (asset: CapturedMediaAsset) => void;
}

export const DocumentCameraModal: React.FC<DocumentCameraModalProps> = ({
  visible,
  frameMode,
  title,
  hint,
  onClose,
  onPhotoSelected,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  const defaultHint =
    hint ||
    (frameMode === 'CCCD'
      ? 'Đưa đủ 4 góc thẻ CCCD nằm gọn trong khung ngang, tránh lóa sáng'
      : 'Đưa đủ 4 góc tờ giấy vào khung dọc A4, giữ chắc tay nơi đủ sáng');

  const handleSnap = async () => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      const pic = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });
      if (pic?.uri) {
        setTorchOn(false);
        onClose();
        onPhotoSelected({
          uri: pic.uri,
          width: pic.width,
          height: pic.height,
          fileName: `doc_camera_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          source: 'CAMERA',
        });
      }
    } catch {
      // Fall back to system library if camera capture fails on simulator
    } finally {
      setBusy(false);
    }
  };

  const handlePickFromLibrary = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const lib = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });
      if (!lib.canceled && lib.assets?.[0]) {
        const asset = lib.assets[0];
        setTorchOn(false);
        onClose();
        onPhotoSelected({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          fileName: asset.fileName || `doc_library_${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
          source: 'LIBRARY',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'ios' ? 54 : Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0,
  );
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'ios' ? 24 : Platform.OS === 'android' ? 12 : 0,
  );
  const canShowLiveCamera = Platform.OS !== 'web' && Boolean(permission?.granted);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingTop: topInset, paddingBottom: bottomInset }]}>
        <StatusBar barStyle="light-content" />
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng camera chụp giấy tờ"
            onPress={() => {
              setTorchOn(false);
              onClose();
            }}
            style={styles.topIconBtn}
          >
            <X size={20} color="#FFFFFF" />
          </Pressable>

          <View style={styles.titleCol}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.frameLabel}>
              {frameMode === 'CCCD' ? 'Khung ngang thẻ CCCD' : 'Khung dọc giấy A4'}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={torchOn ? 'Tắt đèn flash' : 'Bật đèn flash'}
            disabled={!canShowLiveCamera}
            onPress={() => setTorchOn((v) => !v)}
            style={[styles.topIconBtn, torchOn && styles.topIconBtnActive]}
          >
            {torchOn ? (
              <Zap size={18} color="#750715" />
            ) : (
              <ZapOff size={18} color="#FFFFFF" />
            )}
          </Pressable>
        </View>

        {/* Camera Viewport with Guide Overlay */}
        <View style={styles.viewport}>
          {canShowLiveCamera ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torchOn}
            />
          ) : (
            <View style={styles.permissionBox}>
              <Camera size={36} color="#94A3B8" />
              <Text style={styles.permissionTitle}>
                {Platform.OS === 'web'
                  ? 'Bản xem trước Web — chọn ảnh từ máy'
                  : 'Cần quyền Camera để chụp giấy tờ'}
              </Text>
              <Text style={styles.permissionDesc}>
                Ảnh chụp từ camera và ảnh chọn từ thư viện đều đi qua cùng một bước kiểm định chất lượng và nhận diện nội dung.
              </Text>
              {Platform.OS !== 'web' && !permission?.granted ? (
                <Pressable
                  onPress={() => {
                    void requestPermission();
                  }}
                  style={styles.grantBtn}
                >
                  <Text style={styles.grantBtnText}>Cấp quyền Camera</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {/* Alignment Frame Overlay */}
          <View pointerEvents="none" style={styles.overlayCenter}>
            <View style={styles.hintPill}>
              <Text style={styles.hintText}>{defaultHint}</Text>
            </View>
            <View
              style={[
                styles.guideFrame,
                frameMode === 'CCCD' ? styles.frameCccd : styles.frameA4,
              ]}
            >
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomBar}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              void handlePickFromLibrary();
            }}
            style={({ pressed }) => [styles.libraryBtn, pressed && styles.pressed]}
          >
            <ImageIcon size={18} color="#FFFFFF" />
            <Text style={styles.libraryBtnText}>Thư viện</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chụp ảnh giấy tờ"
            disabled={busy || !canShowLiveCamera}
            onPress={() => {
              void handleSnap();
            }}
            style={({ pressed }) => [
              styles.shutterOuter,
              !canShowLiveCamera && { opacity: 0.45 },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.shutterInner}>
              {busy ? <ActivityIndicator size="small" color={COLORS.citizenCrimson} /> : null}
            </View>
          </Pressable>

          <View style={styles.rightSpacer} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  topIconBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topIconBtnActive: {
    backgroundColor: '#FDE047',
  },
  titleCol: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  frameLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  viewport: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  permissionBox: {
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  permissionDesc: {
    color: '#CBD5E1',
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  grantBtn: {
    minHeight: MIN_TOUCH_TARGET - 4,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.citizenCrimson,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  grantBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  overlayCenter: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  hintPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  hintText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  guideFrame: {
    borderWidth: 2,
    borderColor: 'rgba(253, 224, 71, 0.9)',
    borderRadius: RADIUS.md,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  frameA4: {
    width: '82%',
    aspectRatio: 0.707, // A4 portrait (1 : 1.414)
    maxHeight: '72%',
  },
  frameCccd: {
    width: '88%',
    aspectRatio: 1.586, // ISO/IEC 7810 ID-1 CCCD landscape
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#FDE047',
  },
  cornerTL: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 6 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 6 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 6 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#0B1220',
  },
  libraryBtn: {
    minWidth: 96,
    minHeight: MIN_TOUCH_TARGET - 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  libraryBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSpacer: {
    width: 96,
  },
  pressed: { opacity: 0.8 },
});
