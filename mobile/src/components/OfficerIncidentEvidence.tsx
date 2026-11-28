import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchOfficerIncidentPhoto } from '../api/client';
import { arrayBufferToBase64 } from '../core/officerAuditService';
import type { IssueClusterDto } from '../types/api.types';
import { IncidentLocationPreview } from './MobileIncidentMap';

function EvidencePhoto({ url, caption }: { url: string; caption: string }) {
  const [uri, setUri] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const request = new AbortController();
    setFailed(false);
    setUri('');
    fetchOfficerIncidentPhoto(url, request.signal).then(({ bytes, mime }) => {
      if (!request.signal.aborted) setUri(`data:${mime};base64,${arrayBufferToBase64(bytes)}`);
    }).catch(() => { if (!request.signal.aborted) setFailed(true); });
    return () => request.abort();
  }, [url, attempt]);

  if (failed) return <Pressable accessibilityRole="button" onPress={() => setAttempt(n => n + 1)}>
    <Text style={styles.link}>Ảnh chưa tải được · Thử lại</Text>
  </Pressable>;
  if (!uri) return <ActivityIndicator accessibilityLabel="Đang tải ảnh hiện trường" />;
  return <Image accessibilityLabel={caption} accessible source={{ uri }} resizeMode="contain"
    style={styles.photo} onError={() => setFailed(true)} />;
}

function IncidentDetail({ cluster }: { cluster: IssueClusterDto }) {
  const { centroidLatitude: latitude, centroidLongitude: longitude, reports = [] } = cluster;
  const photos = [...new Set([...reports.flatMap(r => r.photoUrls), ...(cluster.photoUrls ?? [])])];
  const [selected, setSelected] = useState(0);
  const [mapError, setMapError] = useState(false);
  const index = Math.min(selected, photos.length - 1);
  const url = photos[index];
  const owner = reports.find(r => r.photoUrls.includes(url));
  const caption = `Ảnh ${index + 1}/${photos.length}${owner ? ' · ' + owner.reportCode : ''}`;
  return <View style={styles.panel}>
    <Text style={styles.title}>Vị trí cụm sự cố</Text>
    {latitude !== null && longitude !== null ? <>
      <IncidentLocationPreview latitude={latitude} longitude={longitude} />
      <Text>{latitude.toFixed(5)}, {longitude.toFixed(5)}</Text>
      <Pressable accessibilityRole="link" onPress={() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`)
          .catch(() => setMapError(true));
      }}><Text style={styles.link}>Mở vị trí trên bản đồ</Text></Pressable>
      {mapError && <Text>Không mở được ứng dụng bản đồ. Bạn có thể dùng tọa độ ở trên.</Text>}
    </> : <Text>Phản ánh chưa có tọa độ hợp lệ.</Text>}
    <Text style={styles.title}>Ảnh người dân gửi</Text>
    {url ? <>
      <EvidencePhoto key={url} url={url} caption={caption} />
      <View style={styles.navigation}>
        <Pressable accessibilityRole="button" disabled={index === 0} onPress={() => setSelected(index - 1)}>
          <Text style={index > 0 ? styles.link : styles.disabled}>Ảnh trước</Text>
        </Pressable>
        <Text style={styles.caption}>{caption}</Text>
        <Pressable accessibilityRole="button" disabled={index === photos.length - 1} onPress={() => setSelected(index + 1)}>
          <Text style={index < photos.length - 1 ? styles.link : styles.disabled}>Ảnh sau</Text>
        </Pressable>
      </View>
    </> : <Text>{cluster.photoCount ? 'Chưa nhận được đường dẫn xem ảnh.' : 'Phản ánh chưa có ảnh đính kèm.'}</Text>}
    {reports.map(report => <View key={report.reportCode}>
      <Text style={styles.title}>{report.reportCode}</Text>
      <Text>{report.description || 'Chưa có mô tả.'}</Text>
    </View>)}
  </View>;
}

export function OfficerIncidentEvidence({ cluster }: { cluster: IssueClusterDto }) {
  const [open, setOpen] = useState(false);
  return <View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}>
      <Text style={styles.link}>{open ? 'Thu gọn hiện trường' : 'Xem bản đồ và ảnh hiện trường'}</Text>
    </Pressable>
    {open && <IncidentDetail cluster={cluster} />}
  </View>;
}

const styles = StyleSheet.create({
  panel: { gap: 8, paddingVertical: 8 },
  title: { color: '#172B36', fontWeight: '700', marginTop: 6 },
  link: { color: '#075E61', fontWeight: '700', paddingVertical: 10 },
  disabled: { color: '#64748B', paddingVertical: 10 },
  photo: { width: '100%', height: 250, backgroundColor: '#EFF3F4', borderRadius: 8 },
  navigation: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  caption: { flex: 1, textAlign: 'center', color: '#374151' },
});
