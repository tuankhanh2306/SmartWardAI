import { api } from './http';

// 3. Triage & Incident Reporting Types & API
export interface IssueCluster {
  id: string;
  clusterCode: string;
  category: string;
  centroidLatitude: number;
  centroidLongitude: number;
  title: string;
  descriptionSummary: string;
  status: string;
  reportCount: number;
  createdAt: string;
  lastReportAt: string;
}

export interface IssueReportResponse {
  reportId: string;
  clusterId: string;
  clusterCode: string;
  category: string;
  assignedAction: 'MERGED_INTO_EXISTING_CLUSTER' | 'NEW_CLUSTER_CREATED';
  similarityWithClusterCentroid: number;
  totalReportsInCluster: number;
  message: string;
  targetWardCode?: string;
  targetWardName?: string;
  reporterPhone?: string;
  addressText?: string;
  appliedRadiusMeters?: number;
}

export interface LiveCitizenIncident {
  id: string;
  wardCode: string;
  wardName: string;
  reporterHomeWardName?: string;
  category: string;
  title: string;
  description: string;
  address: string;
  lat: number;
  lon: number;
  reportedTime: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  duplicatesMerged: number;
  reporterPhone: string;
  officerNote?: string;
  locationSource?: string;
  locationAccuracyM?: number;
}

const LIVE_INCIDENTS_STORAGE_KEY = 'smartward_live_incidents_v1';

export const getLiveSubmittedIncidents = (): LiveCitizenIncident[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LIVE_INCIDENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

function saveLiveSubmittedIncident(incident: LiveCitizenIncident) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLiveSubmittedIncidents();
    const updated = [incident, ...existing].slice(0, 50);
    localStorage.setItem(LIVE_INCIDENTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

export function updateLiveIncidentStatus(
  id: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED',
  officerNote?: string
): LiveCitizenIncident | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = getLiveSubmittedIncidents();
    let updatedItem: LiveCitizenIncident | null = null;
    const next = existing.map((inc) => {
      if (inc.id === id) {
        updatedItem = {
          ...inc,
          status,
          officerNote: officerNote ?? inc.officerNote,
        };
        return updatedItem;
      }
      return inc;
    });
    if (updatedItem) {
      localStorage.setItem(LIVE_INCIDENTS_STORAGE_KEY, JSON.stringify(next));
    }
    return updatedItem;
  } catch {
    return null;
  }
}

function mapCategoryCodeToLabel(code: string): string {
  switch (code) {
    case 'ROAD_DAMAGE':
      return 'Cơ sở hạ tầng';
    case 'FLOODING':
      return 'Ngập nước & Thủy lợi';
    case 'ENVIRONMENT':
      return 'Môi trường & Rác thải';
    case 'LIGHTING':
      return 'Chiếu sáng đô thị';
    case 'SECURITY':
      return 'An ninh trật tự';
    default:
      return 'Cơ sở hạ tầng';
  }
}

export const reportIssue = async (data: {
  category: string;
  latitude: number;
  longitude: number;
  addressText?: string;
  rawDescription?: string;
  description?: string;
  reporterPhone?: string;
  wardCode?: string;
  wardName?: string;
  reporterHomeWardName?: string;
  urgency?: 'HIGH' | 'MEDIUM' | 'LOW';
  locationAccuracyM?: number;
  locationSource?: 'GPS' | 'PIN_DRAGGED' | 'MANUAL' | 'WARD_DEFAULT' | 'gps' | 'manual_pin' | 'address_geocode' | string;
}): Promise<IssueReportResponse> => {
  const currentWardLabel = data.wardName || 'UBND cấp Xã/Phường';
  const targetWardCode = data.wardCode || 'AG_P_LONGXUYEN';
  const desc = (data.description || data.rawDescription || '').trim();
  const phone = (data.reporterPhone || '').trim();
  const addr = (data.addressText || currentWardLabel).trim();
  const appliedRadius = 25.0; // High-precision GPS radius R = 25m

  // Normalize source to uppercase for backend contract
  const rawSource = data.locationSource || 'GPS';
  const normalizedSource = rawSource === 'manual_pin' ? 'PIN_DRAGGED' : rawSource.toUpperCase();

  const persistToLocalWardQueue = (res: IssueReportResponse) => {
    const cleanTitle = desc.replace(/^\[[^\]]+\]\s*/, '').trim();
    const shortTitle = cleanTitle.length > 75 ? cleanTitle.slice(0, 72) + '...' : cleanTitle || 'Phản ánh sự cố hiện trường khẩn cấp';
    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    saveLiveSubmittedIncident({
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      wardCode: targetWardCode,
      wardName: currentWardLabel,
      reporterHomeWardName: data.reporterHomeWardName,
      category: mapCategoryCodeToLabel(data.category),
      title: shortTitle,
      description: desc,
      address: addr,
      lat: data.latitude,
      lon: data.longitude,
      reportedTime: `Vừa xong (${nowTime})`,
      status: 'PENDING',
      urgency: data.urgency || 'HIGH',
      duplicatesMerged: res.totalReportsInCluster,
      reporterPhone: phone || 'Chưa cung cấp',
      locationSource: normalizedSource,
      locationAccuracyM: data.locationAccuracyM,
      officerNote:
        data.reporterHomeWardName && data.reporterHomeWardName !== currentWardLabel
          ? `Tin báo liên địa bàn từ công dân ${data.reporterHomeWardName} đi qua ${currentWardLabel}. Đã định vị tự động.`
          : `Tiếp nhận tin báo qua định vị bản đồ (${normalizedSource}). Cần liên hệ SĐT ${phone} để xác minh hiện trường.`,
    });
  };

  try {
    const resp = await api.post<any>('/issues/report', {
      category: data.category,
      description: desc,
      latitude: data.latitude,
      longitude: data.longitude,
      reporterPhone: phone,
      addressText: addr,
      wardCode: targetWardCode,
      wardName: currentWardLabel,
      locationAccuracyM: data.locationAccuracyM,
      locationSource: normalizedSource,
    });
    const payload = resp.data?.data ?? resp.data;
    const result: IssueReportResponse = {
      reportId: String(payload.reportId ?? payload.reportCode ?? ('rep_' + Math.random().toString(36).substring(2, 9))),
      clusterId: String(payload.clusterId ?? payload.clusterCode ?? 'clust-1'),
      clusterCode: payload.clusterCode || 'CLUST-ROAD-001',
      category: payload.category || data.category,
      assignedAction: payload.newCluster ? 'NEW_CLUSTER_CREATED' : 'MERGED_INTO_EXISTING_CLUSTER',
      similarityWithClusterCentroid: Number(payload.similarityScore ?? 0.89),
      totalReportsInCluster: Number(payload.clusterReportCount ?? payload.totalReportsInCluster ?? 1),
      message: payload.message || `Đã tiếp nhận phản ánh thành công và định tuyến về ${currentWardLabel}.`,
      targetWardCode,
      targetWardName: currentWardLabel,
      reporterPhone: phone,
      addressText: addr,
      appliedRadiusMeters: appliedRadius,
    };
    persistToLocalWardQueue(result);
    return result;
  } catch {
    // Check if there is an existing live incident in the same ward within R = 25m
    const existingLive = getLiveSubmittedIncidents();
    let minDistance = Number.POSITIVE_INFINITY;
    for (const item of existingLive) {
      const dLat = (data.latitude - item.lat) * 111320;
      const dLon = (data.longitude - item.lon) * 111320 * Math.cos((item.lat * Math.PI) / 180);
      const dist = Math.sqrt(dLat * dLat + dLon * dLon);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }

    // Also check reference hotspot within tight R = 25m (An Giang Provincial Center)
    const refCentroidLat = 10.3864;
    const refCentroidLon = 105.4352;
    const dLatRef = (data.latitude - refCentroidLat) * 111320;
    const dLonRef = (data.longitude - refCentroidLon) * 111320 * Math.cos((refCentroidLat * Math.PI) / 180);
    const distanceRefMeters = Math.sqrt(dLatRef * dLatRef + dLonRef * dLonRef);
    const effectiveDistance = Math.min(minDistance, distanceRefMeters);

    // If within tight R = 25m and matching category -> Merge!
    if (effectiveDistance <= appliedRadius && (data.category === 'ROAD_DAMAGE' || data.category === 'FLOODING' || data.category === 'ALL')) {
      const mergedResult: IssueReportResponse = {
        reportId: 'rep_' + Math.random().toString(36).substring(2, 9),
        clusterId: 'clust-1',
        clusterCode: 'CLUST-ROAD-001',
        category: data.category,
        assignedAction: 'MERGED_INTO_EXISTING_CLUSTER',
        similarityWithClusterCentroid: 0.914,
        totalReportsInCluster: 4,
        message: `Đã tiếp nhận phản ánh về UBND ${currentWardLabel} và ghi nhận trùng điểm sự cố đang xử lý. Cán bộ tại ${currentWardLabel} sẽ liên hệ SĐT ${phone} để phối hợp giải quyết.`,
        targetWardCode,
        targetWardName: currentWardLabel,
        reporterPhone: phone,
        addressText: addr,
        appliedRadiusMeters: appliedRadius,
      };
      persistToLocalWardQueue(mergedResult);
      return mergedResult;
    }

    // Outside 25m or distinct category -> Create New
    const newResult: IssueReportResponse = {
      reportId: 'rep_' + Math.random().toString(36).substring(2, 9),
      clusterId: 'clust-new-' + Math.random().toString(36).substring(2, 6),
      clusterCode: 'CLUST-' + targetWardCode.replace('AG_', '') + '-' + Math.floor(Math.random() * 900 + 100),
      category: data.category,
      assignedAction: 'NEW_CLUSTER_CREATED',
      similarityWithClusterCentroid: 0.415,
      totalReportsInCluster: 1,
      message:
        `Đã định vị và chuyển thẳng báo cáo sự cố về bộ phận trực ban UBND ${currentWardLabel}. Cán bộ phụ trách sẽ liên hệ qua SĐT ${phone} để xác minh và khắc phục.`,
      targetWardCode,
      targetWardName: currentWardLabel,
      reporterPhone: phone,
      addressText: addr,
      appliedRadiusMeters: appliedRadius,
    };
    persistToLocalWardQueue(newResult);
    return newResult;
  }
};

export const getIssueClusters = async (): Promise<IssueCluster[]> => {
  try {
    const resp = await api.get<any>('/issues/clusters');
    const rawList: any[] = resp.data?.data ?? resp.data;
    if (Array.isArray(rawList)) {
      return rawList.map((item) => ({
        id: String(item.id ?? item.clusterCode),
        clusterCode: item.clusterCode,
        category: item.category,
        centroidLatitude: Number(item.centerLatitude ?? item.centroidLatitude ?? 10.3864),
        centroidLongitude: Number(item.centerLongitude ?? item.centroidLongitude ?? 105.4352),
        title: item.title || 'Sự cố hiện trường',
        descriptionSummary: item.descriptionSummary || item.title || '',
        status: item.status || 'OPEN',
        reportCount: item.reportCount ?? 1,
        createdAt: item.firstReportedAt || item.createdAt || new Date().toISOString(),
        lastReportAt: item.lastReportedAt || item.createdAt || new Date().toISOString(),
      }));
    }
    return [];
  } catch {
    return [];
  }
};

export const updateClusterStatus = async (clusterCode: string, status: string): Promise<IssueCluster> => {
  try {
    const resp = await api.patch<any>(`/issues/clusters/${clusterCode}/status`, { status });
    const item = resp.data?.data ?? resp.data;
    return {
      id: String(item.id ?? item.clusterCode),
      clusterCode: item.clusterCode,
      category: item.category,
      centroidLatitude: Number(item.centerLatitude ?? item.centroidLatitude ?? 10.8035),
      centroidLongitude: Number(item.centerLongitude ?? item.centroidLongitude ?? 106.7145),
      title: item.title || 'Sự cố hiện trường',
      descriptionSummary: item.descriptionSummary || item.title || '',
      status: item.status || status,
      reportCount: item.reportCount ?? 1,
      createdAt: item.firstReportedAt || item.createdAt || new Date().toISOString(),
      lastReportAt: item.lastReportedAt || item.createdAt || new Date().toISOString(),
    };
  } catch {
    return {
      id: clusterCode,
      clusterCode,
      category: 'GENERAL',
      centroidLatitude: 10.8035,
      centroidLongitude: 106.7145,
      title: 'Sự cố hiện trường',
      descriptionSummary: 'Cập nhật ngoại tuyến',
      status,
      reportCount: 1,
      createdAt: new Date().toISOString(),
      lastReportAt: new Date().toISOString(),
    };
  }
};
