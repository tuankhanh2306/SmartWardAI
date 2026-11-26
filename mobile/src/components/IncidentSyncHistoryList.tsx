/**
 * SmartWard AI Mobile — Danh sách trạng thái & lịch sử từng phản ánh hiện trường (TASK-055)
 * Hiển thị rõ: Chờ mạng | Đang gửi | Cần thử lại | Cần chỉnh sửa | Đã tiếp nhận,
 * kèm mã phản ánh, UBND thụ lý và nút Thử gửi lại / Sửa vị trí theo từng mục.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Building2, CheckCircle2, Clock, Edit3, RefreshCw } from 'lucide-react-native';
import { getIncidentSyncStatusMeta } from '../core/incidentSyncHistory';
import type { IncidentSyncHistoryRow } from '../storage/sqliteDb';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';

interface IncidentSyncHistoryListProps {
  items: IncidentSyncHistoryRow[];
  busyLocalId?: string | null;
  onRetryItem: (localId: string) => void;
  onEditItem: (item: IncidentSyncHistoryRow) => void;
}

export const IncidentSyncHistoryList: React.FC<IncidentSyncHistoryListProps> = ({
  items,
  busyLocalId,
  onRetryItem,
  onEditItem,
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Lịch sử gửi & đồng bộ từng phản ánh ({items.length})</Text>
      {items.map((item) => {
        const meta = getIncidentSyncStatusMeta(item.sync_status);
        const isBusy = busyLocalId === item.local_id || item.sync_status === 'SENDING';

        return (
          <View key={item.local_id} style={styles.card}>
            <View style={styles.topRow}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: meta.bgColor, borderColor: meta.borderColor },
                ]}
              >
                <Text style={[styles.statusText, { color: meta.textColor }]}>{meta.label}</Text>
              </View>
            </View>

            <Text style={styles.descText} numberOfLines={2}>
              {item.description}
            </Text>

            <View style={styles.metaRow}>
              <Building2 size={13} color={COLORS.primary} />
              <Text style={styles.metaText} numberOfLines={1}>
                UBND {item.target_ward_name || item.target_ward_code}
              </Text>
            </View>

            {item.sync_status === 'ACCEPTED' && (item.report_code || item.cluster_code) ? (
              <View style={styles.receiptBox}>
                <CheckCircle2 size={13} color="#166534" />
                <Text style={styles.receiptText}>
                  Mã phản ánh: {item.report_code || item.cluster_code}
                  {item.cluster_code && item.report_code ? ` (Cụm ${item.cluster_code})` : ''}
                </Text>
              </View>
            ) : null}

            {item.last_error && item.sync_status !== 'ACCEPTED' ? (
              <Text style={styles.errorText}>
                {item.error_category === 'LOCATION_OR_VALIDATION'
                  ? `Cần chỉnh sửa vị trí/nội dung: ${item.last_error}`
                  : `Lỗi mạng (lần ${item.retry_count}): ${item.last_error}`}
              </Text>
            ) : null}

            <View style={styles.bottomRow}>
              <View style={styles.timeRow}>
                <Clock size={11} color={COLORS.textMuted} />
                <Text style={styles.timeText}>
                  {new Date(item.updated_at || item.created_at).toLocaleString('vi-VN')}
                </Text>
              </View>

              {(item.sync_status === 'WAITING_NETWORK' || item.sync_status === 'RETRY_NEEDED') && (
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => onRetryItem(item.local_id)}
                  style={styles.retryBtn}
                >
                  <RefreshCw size={12} color="#FFFFFF" />
                  <Text style={styles.retryBtnText}>{isBusy ? 'Đang gửi...' : 'Thử gửi lại'}</Text>
                </Pressable>
              )}

              {item.sync_status === 'EDIT_REQUIRED' && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onEditItem(item)}
                  style={styles.editBtn}
                >
                  <Edit3 size={12} color="#FFFFFF" />
                  <Text style={styles.retryBtnText}>Sửa vị trí / nội dung</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: SPACING.md,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  descText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  receiptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  receiptText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991B1B',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  retryBtn: {
    minHeight: Math.max(32, MIN_TOUCH_TARGET - 12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  editBtn: {
    minHeight: Math.max(32, MIN_TOUCH_TARGET - 12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#B91C1C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
