import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type Restaurant = {
  id: string; name: string; district: string; category: string; menu: string;
  address: string; phone: string; designatedAt: string; dataDate: string;
  latitude: number | null; longitude: number | null;
};
export class DataError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}
export const endpoint = 'https://apis.data.go.kr/6260000/BusanTblFnrstrnStusService/getTblFnrstrnStusInfo';
const clean = (v: unknown): string => v == null || v === 'null' ? '' : String(v).trim();
const coordinate = (v: unknown, limit: number) => {
  const n = Number(v);
  return clean(v) && Number.isFinite(n) && n !== 0 && Math.abs(n) <= limit ? n : null;
};
export function normalize(row: Record<string, unknown>): Restaurant {
  const address = clean(row.addrRoad) || clean(row.addrJibun);
  const name = clean(row.bsnsNm);
  return {
    id: `${name}|${address}`, name, address,
    district: clean(row.gugun), category: clean(row.bsnsCond) || '기타',
    menu: clean(row.menu), phone: clean(row.tel),
    designatedAt: clean(row.specDate), dataDate: clean(row.dataDay),
    latitude: coordinate(row.lat, 90), longitude: coordinate(row.lng, 180),
  };
}
// The key is read only in this server module; it never enters a client bundle.
// Reading on each request lets the local registration script take effect immediately.
export async function readApiKey(variable: 'BUSAN_API_KEY' | 'PARKING_API_KEY' = 'BUSAN_API_KEY'): Promise<string> {
  // Hosted deployments use Vercel's server environment, never a bundled .env.
  if (process.env.VERCEL) return process.env[variable]?.trim() || '';
  try {
    const env = await readFile(join(process.cwd(), '.env'), 'utf8');
    const match = env.match(new RegExp(`^${variable}[ \t]*=[ \t]*(.*)$`, 'm'));
    if (match) {
      const value = match[1].trim();
      return value.startsWith('"') ? JSON.parse(value) : value.replace(/^'|'$/g, '');
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new DataError('CONFIG_ERROR', '서버의 키 설정을 확인해 주세요.');
  }
  return process.env[variable]?.trim() || '';
}
const errorMessages: Record<string, string> = {
  '20': '이 API의 활용신청과 승인 상태를 공공데이터포털에서 확인해 주세요.',
  '22': '공공데이터 API의 일일 요청 한도를 초과했습니다. 나중에 다시 시도해 주세요.',
  '23': '요청이 잠시 몰렸습니다. 잠시 후 다시 시도해 주세요.',
  '30': '인증키가 등록되지 않았습니다. 공공데이터포털의 키와 활용승인을 확인해 주세요.',
  '31': '인증키의 사용 기간이 만료되었습니다. 공공데이터포털에서 갱신해 주세요.',
};
export function parsePage(payload: unknown): { items: Restaurant[]; total: number } {
  const root = payload as Record<string, any>; // provider's two documented response envelopes
  const response = root?.response ?? root?.getTblFnrstrnStusInfo ?? root;
  const code = clean(response?.header?.resultCode ?? response?.resultCode);
  if (code && !['00', '0', '0000'].includes(code)) throw new DataError('PROVIDER_ERROR', errorMessages[String(Number(code))] || '공공데이터 서버에서 오류를 반환했습니다. 잠시 후 다시 시도해 주세요.');
  const body = response?.body ?? response;
  let rows = body?.items?.item ?? body?.item ?? body?.items;
  if (rows === '' || rows == null) rows = [];
  if (!Array.isArray(rows)) rows = [rows];
  const total = Number(body?.totalCount);
  if (!Number.isSafeInteger(total) || total < 0 || rows.some((r: any) => !r || typeof r !== 'object')) throw new DataError('INVALID_DATA', '음식점 데이터 형식을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  return { items: rows.map(normalize).filter((r: Restaurant) => r.name), total };
}
type Fetcher = typeof fetch;
export async function fetchAll(key: string, request: Fetcher = fetch): Promise<Restaurant[]> {
  let decoded: string;
  try { decoded = decodeURIComponent(key); } catch { throw new DataError('CONFIG_ERROR', '인증키 형식을 확인해 주세요.'); }
  const result: Restaurant[] = [];
  for (let page = 1; page <= 100; page++) {
    const url = new URL(endpoint);
    url.search = new URLSearchParams({ ServiceKey: decoded, pageNo: String(page), numOfRows: '100', resultType: 'json' }).toString();
    let response: Response;
    try { response = await request(url, { signal: AbortSignal.timeout(12000), cache: 'no-store' }); }
    catch { throw new DataError('NETWORK_ERROR', '공공데이터 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
    // Never return or log upstream text or request URLs: they can contain the key.
    if (!response.ok) throw new DataError('UPSTREAM_ERROR', '공공데이터 서버 응답이 원활하지 않습니다. 키와 활용승인 상태를 확인해 주세요.');
    const text = await response.text();
    let payload: unknown;
    try { payload = JSON.parse(text); }
    catch {
      const code = text.match(/<(?:returnReasonCode|resultCode)>(\d+)<\//)?.[1];
      throw new DataError('PROVIDER_ERROR', errorMessages[String(Number(code))] || '공공데이터 서버가 JSON 데이터를 반환하지 않았습니다. 키와 활용승인 상태를 확인해 주세요.');
    }
    const { items, total } = parsePage(payload);
    result.push(...items);
    if (result.length >= total) return [...new Map(result.map(r => [r.id, r])).values()];
    if (!items.length) throw new DataError('INCOMPLETE_DATA', '음식점 데이터를 모두 가져오지 못했습니다. 다시 시도해 주세요.');
  }
  throw new DataError('INCOMPLETE_DATA', '음식점 데이터가 조회 범위를 초과했습니다.');
}
let cached: { key: string; expires: number; items: Restaurant[]; fetchedAt: string } | undefined;
let pending: { key: string; request: Promise<{ items: Restaurant[]; fetchedAt: string }> } | undefined;
export async function getRestaurants(key: string) {
  if (cached?.key === key && cached.expires > Date.now()) return { items: cached.items, fetchedAt: cached.fetchedAt };
  if (pending?.key === key) return pending.request;
  const request = fetchAll(key).then(items => {
    const fetchedAt = new Date().toISOString();
    cached = { key, expires: Date.now() + 30 * 60 * 1000, items, fetchedAt };
    return { items, fetchedAt };
  });
  pending = { key, request };
  try { return await request; } finally { if (pending?.request === request) pending = undefined; }
}

// Explicitly labelled historical examples from the supplied API guide (2018-10-22).
export const sampleRestaurants = [
  { bsnsNm: '장수장꼬리곰탕', bsnsCond: '한식', menu: '꼬리곰탕', addrRoad: '부산광역시 수영구 무학로9번길 83, 1층 (광안동)', tel: '051-751-7096', specDate: '2012-11-27' },
  { bsnsNm: '광안리 부산횟집', bsnsCond: '회집', menu: '생선회', addrRoad: '부산광역시 수영구 민락수변로 29, 4층 (민락동)', tel: '051-753-8881', specDate: '2011-10-26' },
  { bsnsNm: '구가네', bsnsCond: '한식', menu: '한정식', addrRoad: '부산광역시 수영구 망미배산로24번길 2, 1층 (망미동)', tel: '051-755-2100', specDate: '2011-10-26' },
  { bsnsNm: '송원일식', bsnsCond: '일식', menu: '일식코스요리', addrRoad: '부산광역시 수영구 남천동로9번길 41, 1~2층 (남천동)', tel: '051-626-6100', specDate: '2012-11-27' },
  { bsnsNm: '향래원', bsnsCond: '중국식', menu: '코스요리', addrRoad: '부산광역시 수영구 민락수변로 127-7, 1~4층 (민락동)', tel: '051-751-0901', specDate: '2012-11-27' },
  { bsnsNm: '다케다야', bsnsCond: '일식', menu: '우동', addrRoad: '부산광역시 수영구 남천동로108번길 31, 2층 (남천동)', tel: '051-611-5711', specDate: '2011-10-26' },
  { bsnsNm: '통통장어', bsnsCond: '한식', menu: '장어구이', addrRoad: '부산광역시 수영구 광안해변로344번길 9-15', tel: '051-754-9001', specDate: '2015-11-02' },
].map((row, index) => {
  const coordinates = [[35.165531, 129.115435], [35.153277, 129.124629], [35.17439, 129.105741], [35.144131, 129.109645], [35.155452, 129.133966], [35.144131, 129.109645], [35.155565, 129.13152]];
  return normalize({ ...row, gugun: '수영구', dataDay: '2018-10-22', lat: coordinates[index][0], lng: coordinates[index][1] });
});
