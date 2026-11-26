import { useEffect, useState } from 'react';
import {
  getLiveSubmittedDossiers,
  trackDossier,
  type DossierTrackingResponse,
  type LiveFormDossier,
} from '../../api/client';
import { dossierTrackingSchema, extractZodFieldErrors } from '../../schemas/formValidation';

export function useDossierTrackingHook(
  setMyDossiers: React.Dispatch<React.SetStateAction<LiveFormDossier[]>>
) {
  const [trackingDossierCode, setTrackingDossierCode] = useState<string>('');
  const [trackingLast4Cccd, setTrackingLast4Cccd] = useState<string>('');
  const [trackingLoading, setTrackingLoading] = useState<boolean>(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingFieldErrors, setTrackingFieldErrors] = useState<Record<string, string>>({});
  const [trackingResult, setTrackingResult] = useState<DossierTrackingResponse | null>(null);

  const handleTrackDossier = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = dossierTrackingSchema.safeParse({
      dossierCode: trackingDossierCode,
      last4Cccd: trackingLast4Cccd,
    });
    if (!parsed.success) {
      const errs = extractZodFieldErrors(parsed.error);
      setTrackingFieldErrors(errs);
      setTrackingError(errs.dossierCode || errs.last4Cccd || 'Vui lòng kiểm tra lại thông tin tra cứu.');
      return;
    }
    setTrackingFieldErrors({});
    setTrackingLoading(true);
    setTrackingError(null);
    setTrackingResult(null);
    try {
      const res = await trackDossier(trackingDossierCode.trim(), trackingLast4Cccd.trim());
      setTrackingResult(res);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Không tìm thấy hồ sơ hoặc 4 số cuối CCCD không trùng khớp.';
      setTrackingError(msg);
    } finally {
      setTrackingLoading(false);
    }
  };

  useEffect(() => {
    if (!trackingDossierCode || !trackingLast4Cccd) return;

    let isMounted = true;
    const pollInterval = setInterval(async () => {
      try {
        const res = await trackDossier(trackingDossierCode, trackingLast4Cccd);
        if (isMounted && res) {
          setTrackingResult(res);
          if (res.appointmentCode) {
            const currentDossiers = getLiveSubmittedDossiers();
            let changed = false;
            const updated = currentDossiers.map((d) => {
              if (d.id === res.dossierCode && !d.appointmentCode) {
                changed = true;
                return {
                  ...d,
                  appointmentCode: res.appointmentCode,
                  status: (res.status === 'APPROVED' ? 'VALID' : d.status) as any,
                  officerFeedback: res.officerFeedback || d.officerFeedback,
                  reviewedBy: d.reviewedBy || 'Bộ phận Một cửa',
                };
              }
              return d;
            });
            if (changed) {
              localStorage.setItem('smartward_live_dossiers_v1', JSON.stringify(updated));
              setMyDossiers(updated);
            }
          }
        }
      } catch {
        // Silent polling catch
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [trackingDossierCode, trackingLast4Cccd, setMyDossiers]);

  return {
    trackingDossierCode,
    setTrackingDossierCode,
    trackingLast4Cccd,
    setTrackingLast4Cccd,
    trackingLoading,
    trackingError,
    trackingFieldErrors,
    setTrackingFieldErrors,
    trackingResult,
    setTrackingResult,
    handleTrackDossier,
  };
}
