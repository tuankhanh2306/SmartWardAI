import { afterEach, expect, it, vi } from 'vitest';
import { apiClient, fetchOfficerIncidentPhoto, fetchOfficerIssueClusters } from '../api/client';

afterEach(() => vi.restoreAllMocks());

it('keeps the report and its photos together and leaves missing coordinates empty', async () => {
  const url = '/api/v1/issues/officer/photos/AG__photo.jpg';
  const report = { reportCode: 'PA-1', description: 'Ngập trước cổng trường', photoUrls: [url] };
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: [
    { clusterCode: 'C1', centerLatitude: '10.5', centerLongitude: 105.1, reports: [report] },
    { clusterCode: 'C2', centerLongitude: 190 },
  ] } });
  const [first, second] = await fetchOfficerIssueClusters();
  expect(first).toMatchObject({ centroidLatitude: 10.5, centroidLongitude: 105.1, reports: [report] });
  expect(second).toMatchObject({ centroidLatitude: null, centroidLongitude: null, reports: [] });
});

it('loads officer photo bytes from the configured API only', async () => {
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
    data: new ArrayBuffer(4), headers: { 'content-type': 'image/jpeg' },
  });
  const signal = new AbortController().signal;
  expect((await fetchOfficerIncidentPhoto('/api/v1/issues/officer/photos/AG__1.jpg', signal)).mime).toBe('image/jpeg');
  expect(get).toHaveBeenCalledWith('/issues/officer/photos/AG__1.jpg', { responseType: 'arraybuffer', signal });
  await expect(fetchOfficerIncidentPhoto('https://example.com/photo.jpg', signal)).rejects.toThrow();
  expect(get).toHaveBeenCalledTimes(1);
});
