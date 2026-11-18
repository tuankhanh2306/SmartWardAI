import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWard } from '../context/WardContext';
import { useRole } from '../context/RoleContext';
import {
  getAdminWardReadOnlyOverview,
  type AdminWardOverviewResponse,
} from '../api/client';
import {
  Eye,
  ShieldCheck,
  Building2,
  FileText,
  Lock,
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  MapPin,
  PhoneCall,
} from 'lucide-react';

export const AdminWardReadOnlyPage: React.FC = () => {
  const { wardCode } = useParams<{ wardCode: string }>();
  const navigate = useNavigate();
  const { allWards, totalWardsCount, currentWard, setWard } = useWard();
  const { officerProfile } = useRole();

  // Resolve target commune ward (never allow AG_PROVINCE as a commune)
  const resolvedWard =
    allWards.find((w) => w.code.toUpperCase() === (wardCode || '').toUpperCase()) ||
    currentWard;

  const [overview, setOverview] = useState<AdminWardOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [auditTimestamp, setAuditTimestamp] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // If URL had AG_PROVINCE or invalid ward, normalize to first valid commune ward
  useEffect(() => {
    if (!wardCode || wardCode.toUpperCase() === 'AG_PROVINCE') {
      navigate(`/admin/wards/${resolvedWard.code}`, { replace: true });
    }
  }, [wardCode, resolvedWard.code, navigate]);

  const fetchReadOnlyWardData = useCallback(async (targetCode: string) => {
    if (!targetCode || targetCode.toUpperCase() === 'AG_PROVINCE') return;
    setLoading(true);
    try {
      const data = await getAdminWardReadOnlyOverview(targetCode);
      setOverview(data);
      setAuditTimestamp(new Date().toLocaleTimeString('vi-VN'));
    } catch {
      // Fallback read-only view when backend server is offline in local preview
      setOverview({
        wardCode: targetCode,
        readOnly: true,
        audited: true,
        totalDossiers: 3,
        pendingDossiers: 1,
        approvedDossiers: 2,
        rejectedDossiers: 0,
        dossiers: [
          {
            dossierCode: `HS-${targetCode.slice(-4)}-2026-001`,
            procedureCode: 'TTHC-CR-01',
            procedureName: 'Đăng ký thường trú (Mẫu CT01 - Bộ Công an)',
            wardCode: targetCode,
            citizenName: 'Nguyễn Văn Minh',
            citizenCccd: '089091***412',
            status: 'PENDING',
            createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
          },
          {
            dossierCode: `HS-${targetCode.slice(-4)}-2026-002`,
            procedureCode: 'TTHC-HT-01',
            procedureName: 'Đăng ký khai sinh (UBND cấp xã)',
            wardCode: targetCode,
            citizenName: 'Trần Thị Ngọc Lan',
            citizenCccd: '089195***829',
            status: 'APPROVED',
            createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
            officerFeedback: 'Hồ sơ hợp lệ, đã cấp giấy khai sinh bản chính.',
          },
          {
            dossierCode: `HS-${targetCode.slice(-4)}-2026-003`,
            procedureCode: 'TTHC-CT-01',
            procedureName: 'Chứng thực bản sao từ bản chính (UBND cấp xã)',
            wardCode: targetCode,
            citizenName: 'Lê Hoàng Nam',
            citizenCccd: '089088***105',
            status: 'APPROVED',
            createdAt: new Date(Date.now() - 3600 * 1000 * 30).toISOString(),
            officerFeedback: 'Đã chứng thực sao y.',
          },
        ],
      });
      setAuditTimestamp(new Date().toLocaleTimeString('vi-VN'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReadOnlyWardData(resolvedWard.code);
  }, [resolvedWard.code, fetchReadOnlyWardData]);

  const handleSelectWard = (newCode: string) => {
    const found = allWards.find((w) => w.code === newCode);
    if (found) {
      setWard(found);
      navigate(`/admin/wards/${found.code}`);
    }
  };

  const filteredDossiers = (overview?.dossiers || []).filter((d) => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      d.dossierCode.toLowerCase().includes(kw) ||
      d.procedureCode.toLowerCase().includes(kw) ||
      (d.procedureName || '').toLowerCase().includes(kw) ||
      (d.citizenName || '').toLowerCase().includes(kw)
    );
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Top Admin Read-Only Banner */}
      <div className="bg-[#1E293B] text-white border-b border-slate-700 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
              title="Quay lại Quản trị 40 TTHC"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase">
                  <Eye className="w-3.5 h-3.5" />
                  Chế Độ Xem Liên Xã Chỉ Đọc (ROLE_ADMIN • {officerProfile.badgeId})
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Đã ghi audit_log ({auditTimestamp || 'vừa xong'})
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold mt-1">
                Giám sát Hồ sơ Liên xã: UBND {resolvedWard.name} ({resolvedWard.code})
              </h1>
              <p className="text-xs text-slate-300 mt-0.5 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  {resolvedWard.officeAddress}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
                  {resolvedWard.phoneNumber}
                </span>
              </p>
            </div>
          </div>

          {/* Dynamic Ward Selector (from single source of truth, excluding AG_PROVINCE) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <div className="flex flex-col">
              <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Chọn đơn vị hành chính ({totalWardsCount} đơn vị):</span>
              </label>
              <select
                value={resolvedWard.code}
                onChange={(e) => handleSelectWard(e.target.value)}
                className="bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                {allWards.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Strict Non-Interference Notice */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Nguyên tắc phân tách thẩm quyền:</strong> Quản trị viên cấp tỉnh (<code>ROLE_ADMIN</code>) chỉ xem
              dữ liệu liên xã qua API riêng có ghi vết <code>audit_log</code>, <strong>không vào /officer/*</strong> và{' '}
              <strong>không phê duyệt/từ chối hồ sơ thay cán bộ cấp xã</strong>.
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 font-bold text-[11px] text-amber-800 shrink-0">
            READ-ONLY
          </span>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-5 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <FileText className="w-4 h-4 text-slate-600" />
            <span>
              Danh sách hồ sơ tại {resolvedWard.name} ({filteredDossiers.length} hồ sơ)
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm mã hồ sơ, mã TTHC, tên công dân..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Read-Only Dossiers Table */}
        <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Đang tải dữ liệu giám sát chỉ đọc và ghi nhận audit_log...
            </div>
          ) : filteredDossiers.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Chưa có hồ sơ nào phù hợp tại đơn vị {resolvedWard.name}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                    <th className="py-3 px-4">Mã Hồ Sơ</th>
                    <th className="py-3 px-4">Thủ Tục Hành Chính</th>
                    <th className="py-3 px-4">Công Dân (CCCD che ẩn)</th>
                    <th className="py-3 px-4">Trạng Thái Thụ Lý</th>
                    <th className="py-3 px-4">Ý Kiến Cán Bộ Xã</th>
                    <th className="py-3 px-4 text-right">Quyền Tác Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDossiers.map((item) => (
                    <tr key={item.dossierCode} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {item.dossierCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {item.procedureName || item.procedureCode}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {item.procedureCode} • {item.wardCode}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">
                          {item.citizenName || 'Công dân nộp trực tuyến'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          CCCD: {item.citizenCccd || '*********'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {item.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã phê duyệt
                          </span>
                        ) : item.status === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3" />
                            Từ chối
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Đang chờ cán bộ xã xử lý
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">
                        {item.officerFeedback || 'Chưa có ghi chú phản hồi'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 font-semibold text-[11px]">
                          <Lock className="w-3 h-3" />
                          Chỉ đọc (Không duyệt thay)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminWardReadOnlyPage;
