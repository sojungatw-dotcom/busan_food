import { DataError } from './restaurants.ts';

export type Parking = {
  id: string; name: string; address: string; kind: string; type: string;
  latitude: number; longitude: number; spaces: number | null;
  fee: string; weekday: string; saturday: string; holiday: string;
  operatingDays: string; phone: string; dataDate: string; notes: string;
};
export type NearbyParking = Parking & { distanceMeters: number };
export const parkingEndpoint = 'https://api.data.go.kr/openapi/tn_pubr_prkplce_info_api';
const text = (v: unknown) => v == null || v === 'null' ? '' : String(v).trim();
const amount = (v: unknown) => {
  if (!text(v)) return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
function hours(open: unknown, close: unknown) {
  return text(open) && text(close) ? `${text(open)} ~ ${text(close)}` : '정보 없음';
}
export function normalizeParking(row: Record<string, unknown>): Parking | null {
  const latitude = Number(row.latitude), longitude = Number(row.longitude);
  if (!text(row.latitude) || !text(row.longitude) || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 33 || latitude > 39 || longitude < 124 || longitude > 132 || !text(row.prkplceNm)) return null;
  const address = text(row.rdnmadr) || text(row.lnmadr);
  const basicTime = amount(row.basicTime), basicCharge = amount(row.basicCharge);
  const addTime = amount(row.addUnitTime), addCharge = amount(row.addUnitCharge);
  let fee = text(row.parkingchrgeInfo) || '요금 정보 없음';
  if (basicTime !== null && basicTime > 0 && basicCharge !== null) fee += ` · 기본 ${basicTime}분 ${basicCharge.toLocaleString('ko-KR')}원`;
  if (addTime !== null && addTime > 0 && addCharge !== null) fee += ` · 추가 ${addTime}분 ${addCharge.toLocaleString('ko-KR')}원`;
  return {
    id: text(row.prkplceNo) || `${text(row.prkplceNm)}|${address}`,
    name: text(row.prkplceNm), address, latitude, longitude,
    kind: text(row.prkplceSe), type: text(row.prkplceType), spaces: amount(row.prkcmprt), fee,
    weekday: hours(row.weekdayOperOpenHhmm, row.weekdayOperColseHhmm),
    saturday: hours(row.satOperOperOpenHhmm, row.satOperCloseHhmm),
    holiday: hours(row.holidayOperOpenHhmm, row.holidayCloseOpenHhmm),
    operatingDays: text(row.operDay), phone: text(row.phoneNumber),
    dataDate: text(row.referenceDate), notes: text(row.spcmnt),
  };
}
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = (n: number) => n * Math.PI / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
export function nearestParking(items: Parking[], latitude: number, longitude: number): NearbyParking[] {
  return items.map(p => ({ ...p, distanceMeters: distanceMeters(latitude, longitude, p.latitude, p.longitude) }))
    .filter(p => p.distanceMeters <= 2000)
    .sort((a, b) => a.distanceMeters - b.distanceMeters || a.id.localeCompare(b.id))
    .slice(0, 5).map(p => ({ ...p, distanceMeters: Math.round(p.distanceMeters) }));
}
const invalidData = () => new DataError('PARKING_INVALID_DATA', '주차장 데이터 형식을 확인할 수 없습니다. 잠시 후 다시 조회해 주세요.');
const providerError = (code: string) => new DataError('PARKING_PROVIDER_ERROR',
  code === '22' ? '주차장 API의 일일 호출 한도를 초과했습니다. 나중에 다시 시도해 주세요.' :
  String(Number(code)) === '30' ? '주차장 API가 등록되지 않은 서비스키(오류 30)를 반환했습니다. 전국주차장정보표준데이터의 활용승인 상태와 해당 서비스 인증키를 확인해 주세요.' :
  ['20', '21', '31'].includes(String(Number(code))) ? '주차장 API 인증에 실패했습니다. 전국주차장정보표준데이터의 활용승인과 등록 키를 확인해 주세요.' :
  '주차장 데이터 제공 서버에서 오류가 발생했습니다. 잠시 후 다시 조회해 주세요.');
export function parseParkingPage(payload: unknown): { rows: Record<string, unknown>[]; total: number } {
  const root = payload as Record<string, any>;
  const response = root?.response ?? root;
  const code = text(root?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnReasonCode ?? response?.header?.resultCode);
  if (code === '03') return { rows: [], total: 0 };
  if (code && !['00', '0', '0000'].includes(code)) throw providerError(code);
  const body = response?.body;
  const total = Number(body?.totalCount);
  let rows = body?.items?.item ?? body?.items;
  if (rows == null || rows === '') rows = [];
  if (!Array.isArray(rows)) rows = [rows];
  if (!Number.isSafeInteger(total) || total < 0 || rows.some((r: unknown) => !r || typeof r !== 'object' || Array.isArray(r))) throw invalidData();
  return { rows, total };
}
export async function fetchBusanParking(key: string, request: typeof fetch = fetch): Promise<Parking[]> {
  let decoded: string;
  try { decoded = decodeURIComponent(key); } catch { throw new DataError('PARKING_CONFIG_ERROR', '주차장 인증키 형식을 확인해 주세요.'); }
  const entries = new Map<string, Parking>();
  // The provider returns no data for bare-city address filters (e.g. 부산).
  // Fetch the complete national dataset and select Busan locally by either address.
  const deadline = Date.now() + 55000;
  let received = 0;
    for (let page = 1; page <= 500; page++) {
      if (Date.now() >= deadline) throw new DataError('PARKING_TIMEOUT', '주차장 조회 시간이 길어지고 있습니다. 잠시 후 다시 조회해 주세요.');
      const url = new URL(parkingEndpoint);
      url.search = new URLSearchParams({ serviceKey: decoded, type: 'json', pageNo: String(page), numOfRows: '1000' }).toString();
      let response: Response;
      try { response = await request(url, { signal: AbortSignal.timeout(Math.min(12000, Math.max(1, deadline - Date.now()))), cache: 'no-store' }); }
      catch { throw new DataError('PARKING_NETWORK_ERROR', '주차장 서버에 연결하지 못했습니다. 잠시 후 다시 조회해 주세요.'); }
      const raw = await response.text();
      let payload: unknown;
      try { payload = JSON.parse(raw); }
      catch { throw providerError(raw.match(/<(?:returnReasonCode|resultCode)>(\d+)<\//)?.[1] || ''); }
      if (!response.ok) {
        const root = payload as Record<string, any>;
        const code = text(root?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnReasonCode ?? (root?.response ?? root)?.header?.resultCode);
        if (code && !['00', '0', '0000'].includes(code)) throw providerError(code);
        throw new DataError('PARKING_UPSTREAM_ERROR', '주차장 서버 응답이 원활하지 않습니다. API 활용승인과 키를 확인해 주세요.');
      }
      const { rows, total } = parseParkingPage(payload);
      received += rows.length;
      for (const row of rows) {
        if (!/부산/.test(`${text(row.rdnmadr)} ${text(row.lnmadr)}`)) continue;
        const parking = normalizeParking(row);
        if (parking) entries.set(parking.id, parking);
      }
      if (received >= total) return [...entries.values()];
      if (!rows.length || page === 500) throw new DataError('PARKING_INCOMPLETE', '주차장 데이터를 모두 가져오지 못했습니다. 다시 조회해 주세요.');
    }
  throw new DataError('PARKING_INCOMPLETE', '주차장 데이터를 모두 가져오지 못했습니다. 다시 조회해 주세요.');
}
let cache: { key: string; expires: number; items: Parking[]; fetchedAt: string } | undefined;
let pending: { key: string; promise: Promise<{ items: Parking[]; fetchedAt: string }> } | undefined;
export async function getParking(key: string) {
  if (cache?.key === key && cache.expires > Date.now()) return { items: cache.items, fetchedAt: cache.fetchedAt };
  if (pending?.key === key) return pending.promise;
  const promise = fetchBusanParking(key).then(items => {
    const fetchedAt = new Date().toISOString();
    cache = { key, items, fetchedAt, expires: Date.now() + 30 * 60 * 1000 };
    return { items, fetchedAt };
  });
  pending = { key, promise };
  try { return await promise; } finally { if (pending?.promise === promise) pending = undefined; }
}
