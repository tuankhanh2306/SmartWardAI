import React from 'react';
import {
  AlertCircle, AlertTriangle, Check, CheckCircle2,
  Layers, MapPin, Navigation, PhoneCall, Radio, RefreshCw, RotateCcw, Send, Shield
} from 'lucide-react';
import { AN_GIANG_WARDS, type WardItem } from '../../data/anGiangWards';
import type { IssueReportResponse, LiveCitizenIncident } from '../../api/client';
import { IncidentLocationMap } from './IncidentLocationMap';

export interface CivicIncidentTabProps {
  currentWard: WardItem;
  manualWardCode: string;
  setManualWardCode: (v: string) => void;
  handleGetLocation: (silent?: boolean) => void;
  gpsLoading: boolean;
  handleSimulateCrossWardGps: (code: string, addr: string) => void;
  unverifiedSampleWard?: WardItem;
  locationSource: 'GPS' | 'PIN_DRAGGED' | 'WARD_DEFAULT' | 'MANUAL' | 'gps' | 'manual_pin' | 'address_geocode';
  addressText: string;
  setAddressText: (v: string) => void;
  resolvedJurisdiction: any;
  manualWardSelectRef: React.RefObject<HTMLSelectElement | null>;
  setLatitude: (v: number) => void;
  setLongitude: (v: number) => void;
  category: string;
  setCategory: (v: string) => void;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  setUrgency: (v: 'HIGH' | 'MEDIUM' | 'LOW') => void;
  description: string;
  setDescription: (v: string) => void;
  phoneInputRef: React.RefObject<HTMLInputElement | null>;
  reporterPhone: string;
  setReporterPhone: (v: string) => void;
  phoneError: string | null;
  setPhoneError: (v: string | null) => void;
  isValidPhone: (p: string) => boolean;
  handleReport: () => void;
  reportLoading: boolean;
  gpsScanBanner: string | null;
  gpsAccuracy: number | null;
  latitude: number;
  longitude: number;
  incidentMapContainerRef?: React.RefObject<HTMLDivElement | null>;
  reportResult: IssueReportResponse | null;
  myIncidents: LiveCitizenIncident[];
  userGpsLocation?: { lat: number; lon: number; accuracy: number } | null;
  onLocationChange?: (lat: number, lon: number, source: 'GPS' | 'PIN_DRAGGED', accuracyM?: number) => void;
  onRecenterToGps?: () => void;
  isAddressManuallyEdited?: boolean;
  isGeocodingAddress?: boolean;
  onResetAddressFromPin?: () => void;
  incidentErrors?: Record<string, string>;
  onClearIncidentError?: (field: string) => void;
}

export const CivicIncidentTab: React.FC<CivicIncidentTabProps> = (props) => {
  const {
    currentWard, manualWardCode, setManualWardCode, handleGetLocation, gpsLoading,
    handleSimulateCrossWardGps, unverifiedSampleWard, locationSource, addressText, setAddressText,
    resolvedJurisdiction, manualWardSelectRef, setLatitude, setLongitude,
    category, setCategory, urgency, setUrgency, description, setDescription,
    phoneInputRef, reporterPhone, setReporterPhone, phoneError, setPhoneError,
    isValidPhone, handleReport, reportLoading, gpsScanBanner, gpsAccuracy,
    latitude, longitude, reportResult, myIncidents,
    userGpsLocation, onLocationChange, onRecenterToGps, isAddressManuallyEdited, isGeocodingAddress, onResetAddressFromPin,
    incidentErrors, onClearIncidentError,
  } = props;

  return (
        <section className="flex flex-col gap-5 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN (6 Cols / 50%): Compact Citizen Incident Form */}
            <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_6px_28px_rgba(15,23,42,0.05)] flex flex-col gap-5">
              {/* STEP 1: LOCATION & MANUAL OVERRIDE GUARD */}
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs sm:text-sm font-extrabold text-[#881320] flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-[#B90E23]" />
                    <span>1. Vị trí sự cố</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setManualWardCode('');
                      onClearIncidentError?.('locationSource');
                      handleGetLocation(false);
                    }}
                    disabled={gpsLoading}
                    className="px-3 py-1.5 rounded-xl bg-[#B90E23] hover:bg-[#8F0A1B] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-60 gov-focus-ring"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{gpsLoading ? 'Đang định vị...' : 'Định vị GPS'}</span>
                  </button>
                </div>

                {/* Quick Presets from SSOT AN_GIANG_WARDS */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#475569] mr-1">
                    Thử nhanh:
                  </span>
                  {(['AG_P_CHAUDOC', 'AG_P_LONGXUYEN', 'AG_X_ANPHU'] as const).map((code) => {
                    const w = AN_GIANG_WARDS.find((item) => item.code === code);
                    if (!w) return null;
                    return (
                      <button
                        key={w.code}
                        type="button"
                        onClick={() => {
                          onClearIncidentError?.('locationSource');
                          handleSimulateCrossWardGps(w.code, w.officeAddress);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FEF2F2] text-[#750715] border border-[#CBD5E1] hover:border-[#FECACA] text-[11px] font-bold transition cursor-pointer gov-focus-ring"
                      >
                        {w.name}
                      </button>
                    );
                  })}
                  {unverifiedSampleWard && (
                    <button
                      type="button"
                      onClick={() => {
                        onClearIncidentError?.('locationSource');
                        handleSimulateCrossWardGps(
                          unverifiedSampleWard.code,
                          `Khu vực ${unverifiedSampleWard.name}`
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[11px] font-bold transition cursor-pointer gov-focus-ring"
                      title="Thử trường hợp địa bàn có dữ liệu tọa độ 'unverified'"
                    >
                      Xã &apos;unverified&apos;
                    </button>
                  )}
                </div>

                {/* Editable Location Input Box */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#334155]">
                    <label htmlFor="p4-address-text" className="font-bold">
                      Địa chỉ sự cố:
                    </label>
                    <div className="flex items-center gap-2">
                      {isGeocodingAddress && (
                        <span className="text-[10.5px] font-bold text-blue-700 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Đang tìm địa chỉ...</span>
                        </span>
                      )}
                      {isAddressManuallyEdited && onResetAddressFromPin && (
                        <button
                          type="button"
                          onClick={onResetAddressFromPin}
                          className="text-[11px] text-[#B90E23] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Theo ghim</span>
                        </button>
                      )}
                      <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                        locationSource === 'WARD_DEFAULT'
                          ? 'bg-amber-100 text-amber-800'
                          : locationSource === 'PIN_DRAGGED' || locationSource === 'manual_pin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {locationSource === 'WARD_DEFAULT'
                          ? 'Mặc định (Chưa chốt)'
                          : locationSource === 'PIN_DRAGGED' || locationSource === 'manual_pin'
                          ? 'Ghim kéo thả'
                          : 'Định vị GPS'}
                      </span>
                    </div>
                  </div>
                  <input
                    id="p4-address-text"
                    type="text"
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    placeholder={isGeocodingAddress ? 'Đang tìm địa chỉ...' : 'Số nhà, tên đường hoặc để trống dùng tọa độ...'}
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#CBD5E1] text-xs md:text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#B90E23] shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                    <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Chỉ dùng để xác định vị trí xử lý sự cố.</span>
                  </p>
                </div>

                {/* Manual Ward Selector — Mandatory when coordinate data is 'unverified' or undetermined */}
                <div
                  className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                    !resolvedJurisdiction.canAutoRoute
                      ? 'bg-[#FFFBEB] border-[#F59E0B] text-[#92400E]'
                      : 'bg-white border-[#CBD5E1] text-[#334155]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="p4-manual-ward-select" className="text-xs font-bold">
                      {!resolvedJurisdiction.canAutoRoute
                        ? 'Chọn xã/phường tiếp nhận:'
                        : 'Đơn vị tiếp nhận:'}
                    </label>
                    {manualWardCode && (
                      <button
                        type="button"
                        onClick={() => setManualWardCode('')}
                        className="text-[11px] font-bold text-[#9F0C1E] underline cursor-pointer"
                      >
                        Tự động lại
                      </button>
                    )}
                  </div>
                  <select
                    id="p4-manual-ward-select"
                    ref={manualWardSelectRef}
                    value={manualWardCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setManualWardCode(code);
                      const chosen = AN_GIANG_WARDS.find((w) => w.code === code);
                      // Only move map center to ward office if user has not confirmed GPS/Pin yet
                      if (chosen && locationSource === 'WARD_DEFAULT') {
                        setLatitude(chosen.lat);
                        setLongitude(chosen.lon);
                      }
                    }}
                    className="w-full h-9 px-3 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] gov-focus-ring"
                  >
                    <option value="">
                      {resolvedJurisdiction.canAutoRoute && resolvedJurisdiction.ward
                        ? `Tự động: ${resolvedJurisdiction.ward.name}`
                        : '-- Chọn xã/phường thủ công --'}
                    </option>
                    {AN_GIANG_WARDS.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.name}{w.coordSource === 'unverified' ? ' (chọn thủ công)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* STEP 2: CATEGORY, URGENCY & DESCRIPTION */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <span id="p4-cat-label" className="text-xs font-bold text-[#334155]">
                    2. Lĩnh vực &amp; Mức độ:
                  </span>
                  <div role="group" aria-labelledby="p4-cat-label" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'ROAD_DAMAGE', label: 'Hạ Tầng Đường' },
                      { id: 'FLOODING', label: 'Ngập Nước' },
                      { id: 'LIGHTING_ELECTRICAL', label: 'Chiếu Sáng / Điện' },
                      { id: 'ENVIRONMENT', label: 'Môi Trường' },
                      { id: 'ORDER_SECURITY', label: 'Trật Tự Đô Thị' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer gov-focus-ring ${
                          category === cat.id
                            ? 'bg-[#B90E23] text-white border-[#8F0A1B] shadow-xs'
                            : 'bg-[#F8FAFC] hover:bg-[#FEF2F2] text-[#334155] border-[#CBD5E1]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Urgency Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <span id="p4-urgency-label" className="text-xs font-bold text-[#334155] mr-1">
                    Mức độ:
                  </span>
                  <div role="group" aria-labelledby="p4-urgency-label" className="flex flex-1 items-center gap-1.5 min-w-[200px]">
                    {([
                      { id: 'HIGH', label: 'Tin Khẩn' },
                      { id: 'MEDIUM', label: 'Cần Sớm' },
                      { id: 'LOW', label: 'Thường' },
                    ] as const).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setUrgency(u.id)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer gov-focus-ring ${
                          urgency === u.id
                            ? u.id === 'HIGH'
                              ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                              : 'bg-[#B90E23] text-white border-[#8F0A1B] shadow-xs'
                            : 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description Content Box */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="p4-description" className="text-xs font-bold text-[#334155]">
                    Mô tả sự cố:
                  </label>
                  <textarea
                    id="p4-description"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (incidentErrors?.description) onClearIncidentError?.('description');
                    }}
                    aria-invalid={Boolean(incidentErrors?.description)}
                    rows={3}
                    className={`w-full p-3 rounded-xl bg-[#F8FAFC] border text-xs md:text-sm text-[#0F172A] focus:outline-none focus:bg-white resize-none transition-all ${
                      incidentErrors?.description
                        ? 'border-red-500 ring-2 ring-red-200'
                        : 'border-[#CBD5E1] focus:border-[#B90E23]'
                    }`}
                    placeholder="Mô tả ngắn gọn hiện trạng, mức độ ảnh hưởng..."
                  />
                  {incidentErrors?.description && (
                    <p role="alert" className="text-xs font-medium text-red-700">
                      {incidentErrors.description}
                    </p>
                  )}
                </div>
              </div>

              {/* STEP 3: OPTIONAL CONTACT PHONE NUMBER */}
              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="p4-reporter-phone" className="text-xs sm:text-sm font-extrabold text-[#0F172A] flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-[#B90E23]" />
                    <span>3. SĐT liên hệ</span>
                  </label>
                  <span className="px-2 py-0.5 rounded-full bg-[#F7EEDF] text-[#750715] border border-[#E5D4B3] text-[10px] font-bold">
                    Không bắt buộc
                  </span>
                </div>

                <input
                  id="p4-reporter-phone"
                  ref={phoneInputRef}
                  type="tel"
                  value={reporterPhone}
                  onChange={(e) => {
                    setReporterPhone(e.target.value);
                    if (phoneError) setPhoneError(null);
                    if (incidentErrors?.reporterPhone) onClearIncidentError?.('reporterPhone');
                  }}
                  aria-invalid={Boolean(incidentErrors?.reporterPhone || phoneError)}
                  placeholder="Không bắt buộc (VD: 0918234567)"
                  className={`w-full h-10 px-3.5 rounded-xl bg-white border text-xs md:text-sm font-mono font-semibold text-[#0F172A] focus:outline-none ${
                    incidentErrors?.reporterPhone || phoneError
                      ? 'border-[#DC2626] ring-2 ring-[#FECACA]'
                      : reporterPhone.trim() && isValidPhone(reporterPhone)
                      ? 'border-[#16A34A]'
                      : 'border-[#CBD5E1] focus:border-[#B90E23]'
                  }`}
                />

                {(incidentErrors?.reporterPhone || phoneError) ? (
                  <p role="alert" className="text-xs font-bold text-[#991B1B] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{incidentErrors?.reporterPhone || phoneError}</span>
                  </p>
                ) : reporterPhone.trim() && isValidPhone(reporterPhone) ? (
                  <p className="text-xs font-semibold text-[#065F46] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-[#065F46]" />
                    <span>SĐT hợp lệ ({reporterPhone.trim()})</span>
                  </p>
                ) : null}
              </div>

              {/* Block submission if location has not been confirmed by user */}
              {(locationSource === 'WARD_DEFAULT' || incidentErrors?.locationSource) && (
                <div role="alert" className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{incidentErrors?.locationSource || 'Chạm bản đồ hoặc kéo ghim đỏ để chốt vị trí.'}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-[#475569] font-medium">
                  {resolvedJurisdiction.canAutoRoute && resolvedJurisdiction.ward ? (
                    <>
                      Nơi nhận: <strong className="text-[#750715]">UBND {resolvedJurisdiction.ward.name}</strong>
                    </>
                  ) : (
                    <strong className="text-[#92400E]">Chưa xác định được xã, vui lòng chọn thủ công</strong>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleReport}
                  disabled={reportLoading || !resolvedJurisdiction.canAutoRoute || !resolvedJurisdiction.ward || locationSource === 'WARD_DEFAULT'}
                  className="w-full sm:w-auto px-6 py-3 bg-[#B90E23] hover:bg-[#8F0A1B] disabled:bg-[#94A3B8] active:scale-[0.98] text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed gov-focus-ring"
                >
                  {reportLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang Gửi Báo Cáo...</span>
                    </>
                  ) : locationSource === 'WARD_DEFAULT' ? (
                    <>
                      <MapPin className="w-4 h-4 text-white" />
                      <span>Chạm Bản Đồ Để Xác Nhận Vị Trí</span>
                    </>
                  ) : resolvedJurisdiction.canAutoRoute && resolvedJurisdiction.ward ? (
                    <>
                      <Send className="w-4 h-4 text-white" />
                      <span>Gửi Báo Cáo Về UBND {resolvedJurisdiction.ward.name}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-white" />
                      <span>Chọn Xã Thủ Công Để Gửi</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN (6 Cols / 50%): Verified Jurisdiction Routing Card + GIS R=25m Map + Live Results */}
            <div className="lg:col-span-6 flex flex-col gap-4 lg:sticky lg:top-28">
              {/* Dynamic SSOT Jurisdiction Routing Card (No Hardcoded Names/Hotlines) */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_6px_28px_rgba(15,23,42,0.05)] flex flex-col gap-3.5">
                {resolvedJurisdiction.canAutoRoute && resolvedJurisdiction.ward ? (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex flex-col gap-1.5 transition-all ${
                      resolvedJurisdiction.ward.code !== currentWard.code
                        ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                        : 'bg-[#F7EEDF] border-[#E5D4B3] text-[#750715]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-[#B90E23] shrink-0" />
                        <span>
                          Đơn vị tiếp nhận:{' '}
                          <strong className="underline text-[#750715]">
                            UBND {resolvedJurisdiction.ward.name}
                          </strong>
                        </span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-[#0F172A] border border-[#CBD5E1]">
                        {resolvedJurisdiction.matchedBy === 'MANUAL_SELECT'
                          ? 'Chọn thủ công'
                          : resolvedJurisdiction.matchedBy === 'TEXT_BOX'
                          ? 'Theo địa chỉ'
                          : 'Theo GPS'}
                      </span>
                    </div>
                    <div className="text-[11px] leading-relaxed space-y-0.5">
                      <p>
                        <strong>Trực ban:</strong>{' '}
                        <span className="font-mono font-bold">{resolvedJurisdiction.ward.phoneNumber}</span>
                      </p>
                      <p className="opacity-95">
                        <strong>Trụ sở:</strong> {resolvedJurisdiction.ward.officeAddress}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border-2 border-[#F59E0B] bg-[#FFFBEB] text-[#92400E] text-xs flex flex-col gap-1.5">
                    <div className="font-extrabold flex items-center gap-2 text-sm text-[#92400E]">
                      <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />
                      <span>Chưa xác định được xã, vui lòng chọn thủ công</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#78350F]">
                      {resolvedJurisdiction.statusReason} Hệ thống <strong>không chuyển tuyến tự động</strong> khi tọa độ chưa được xác minh. Vui lòng chọn trực tiếp đơn vị tiếp nhận trong mục chọn xã ở khung bên trái.
                    </p>
                  </div>
                )}

                {/* Live GPS Status & Low Accuracy Warning */}
                {gpsScanBanner && (
                  <div className="p-2.5 rounded-xl bg-[#ECFDF5] border border-[#86EFAC] text-[11px] text-[#065F46] font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#065F46] shrink-0" />
                    <span>{gpsScanBanner}</span>
                  </div>
                )}

                {gpsAccuracy && gpsAccuracy > 100 && (
                  <div className="p-2.5 rounded-xl bg-[#FEF3C7] border border-[#F59E0B] text-[11px] text-[#92400E] font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />
                    <span>
                      Vị trí chưa chính xác (sai số ±{gpsAccuracy}m). Kéo ghim đỏ trên bản đồ để chỉnh lại vị trí hiện trường.
                    </span>
                  </div>
                )}

                {/* Dual-Engine Incident Location Map (Google Maps JS API + Leaflet/OSM Fallback) */}
                <IncidentLocationMap
                  latitude={latitude}
                  longitude={longitude}
                  locationSource={
                    (locationSource === 'manual_pin'
                      ? 'PIN_DRAGGED'
                      : locationSource === 'gps'
                      ? 'GPS'
                      : locationSource === 'address_geocode'
                      ? 'PIN_DRAGGED'
                      : locationSource) as 'GPS' | 'PIN_DRAGGED' | 'WARD_DEFAULT'
                  }
                  userGpsLocation={userGpsLocation}
                  gpsAccuracy={gpsAccuracy}
                  gpsLoading={gpsLoading}
                  onLocationChange={onLocationChange || ((lat, lon) => { setLatitude(lat); setLongitude(lon); })}
                  onRecenterToGps={onRecenterToGps || (() => handleGetLocation(false))}
                  wardName={currentWard.name}
                />
              </div>

              {/* Live Incident Report Result Card */}
              {reportResult ? (
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_6px_28px_rgba(15,23,42,0.05)] flex flex-col gap-3.5 animate-scaleUp">
                  <div
                    className={`p-3.5 rounded-xl flex items-start gap-3 ${
                      reportResult.assignedAction === 'MERGED_INTO_EXISTING_CLUSTER'
                        ? 'bg-[#F7EEDF] border border-[#E5D4B3] text-[#750715]'
                        : 'bg-[#ECFDF5] border border-[#86EFAC] text-[#065F46]'
                    }`}
                  >
                    <Layers className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-sm">
                        {reportResult.assignedAction === 'MERGED_INTO_EXISTING_CLUSTER'
                          ? 'Đã Ghi Nhận & Gom Chung Cùng Điểm Sự Cố'
                          : `Đã Chuyển Báo Cáo Về UBND ${reportResult.targetWardName || resolvedJurisdiction.ward?.name || ''}`}
                      </h3>
                      <p className="text-xs mt-1 leading-relaxed">{reportResult.message}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                      <span className="text-[#475569]">Đơn vị tiếp nhận:</span>
                      <strong className="text-[#750715] font-extrabold">
                        UBND {reportResult.targetWardName || resolvedJurisdiction.ward?.name || ''}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">SĐT người báo:</span>
                      <strong className="font-mono text-[#0F172A] bg-white px-2 py-0.5 rounded border border-[#CBD5E1]">
                        {reportResult.reporterPhone || reporterPhone.trim() || 'Không cung cấp (Tùy chọn)'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Vị trí hiện trường:</span>
                      <span className="font-semibold text-[#0F172A] text-right max-w-[220px] truncate">
                        {reportResult.addressText || addressText}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Mã hồ sơ sự cố:</span>
                      <strong className="font-mono text-[#9F0C1E]">{reportResult.clusterCode}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Số phản ánh tại điểm này:</span>
                      <span className="font-bold text-[#750715]">{reportResult.totalReportsInCluster} phản ánh</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#9F0C1E] shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="text-xs text-[#334155] space-y-1 leading-relaxed">
                    <h3 className="font-bold text-sm text-[#0F172A]">Chuyển Tuyến An Toàn</h3>
                    <p>
                      Tự động chuyển đúng UBND theo tọa độ GPS.
                    </p>
                  </div>
                </div>
              )}

              {/* CITIZEN INCIDENT TRACKER */}
              {myIncidents.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <span className="text-xs font-extrabold text-[#881320] flex items-center gap-1.5 uppercase tracking-wide">
                      <Radio className="w-4 h-4 text-[#B90E23]" />
                      <span>Tiến Độ Xử Lý Sự Cố Đã Báo ({myIncidents.length})</span>
                    </span>
                    <span className="text-[11px] text-[#475569]">Đồng bộ theo dõi</span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                    {myIncidents.slice(0, 4).map((inc) => (
                      <div key={inc.id} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#0F172A] truncate">{inc.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              inc.status === 'RESOLVED'
                                ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                                : inc.status === 'IN_PROGRESS'
                                ? 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]'
                                : 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]'
                            }`}
                          >
                            {inc.status === 'RESOLVED'
                              ? 'Đã khắc phục xong'
                              : inc.status === 'IN_PROGRESS'
                              ? 'Đang cử cán bộ xử lý'
                              : 'Chờ tiếp nhận'}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#475569] truncate">
                          UBND {inc.wardName} • {inc.address}
                        </span>
                        {inc.officerNote && (
                          <div className="mt-1 p-2 rounded-lg bg-white border border-[#CBD5E1] text-[11px] text-[#750715] font-medium">
                            <strong>Ghi nhận xử lý:</strong> {inc.officerNote}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
  );
};
