'use client';
import { useEffect, useState } from 'react';
import type { Restaurant } from '../../lib/restaurants';
import type { NearbyParking } from '../../lib/parking';

type Result = { mode?: 'live' | 'unconfigured'; items: NearbyParking[]; message?: string };
export default function NearbyParkingPanel({ restaurant, sample }: { restaurant: Restaurant | null; sample: boolean }) {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const lat = restaurant?.latitude, lng = restaurant?.longitude;
  const validLocation = typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
  useEffect(() => {
    setResult(null); setError(''); setLoading(false);
    if (!restaurant || !validLocation) return;
    const controller = new AbortController();
    setLoading(true);
    (async () => {
      try {
        const response = await fetch(`/api/parking?${new URLSearchParams({ lat: String(lat), lng: String(lng) })}`, { cache: 'no-store', signal: controller.signal });
        const body = await response.json() as Result;
        if (!response.ok) throw new Error(body.message || '주차장을 불러오지 못했습니다.');
        if (!controller.signal.aborted) setResult(body);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '연결 상태를 확인해 주세요.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [restaurant, validLocation, lat, lng, retry]);
  return <section className="parking-section" aria-labelledby="parking-title">
    <div className="section-heading"><div><div className="section-kicker">PARK NEAR YOUR NEXT BITE</div><h2 id="parking-title"><span className="parking-symbol">P</span>주차도 가까운 곳으로</h2></div>{restaurant && validLocation && <button className="text-link" disabled={loading} onClick={() => setRetry(r => r + 1)}>{loading ? '조회 중…' : '다시 조회 ↻'}</button>}</div>
    <p className="parking-intro">{restaurant ? <><b>{restaurant.name}</b> 기준 · 부산 내 직선거리 2km 이내 · 가까운 순 최대 5곳</> : '음식점을 추천받으면 근처 주차장도 함께 찾아드려요.'}</p>
    <div aria-live="polite" aria-busy={loading}>
      {!restaurant ? <div className="parking-message"><span>🚙</span><div><h3>한 끼를 고르면, 주차장까지</h3><p>음식점 위치와 전국주차장정보표준데이터를 연결해 가까운 주차장을 찾아요.</p></div></div>
        : !validLocation ? <div className="parking-message"><span>📍</span><p>이 음식점은 좌표 정보가 없어 거리순 주차장 추천을 제공할 수 없어요.</p><a href={`https://map.naver.com/p/search/${encodeURIComponent(`${restaurant.address} 주차장`)}`} target="_blank" rel="noreferrer">지도에서 검색 ↗</a></div>
        : loading ? <div className="parking-message"><span className="parking-loading">↻</span><p>음식점 주변의 주차장을 찾고 있어요. 첫 조회는 잠시 걸릴 수 있어요.</p></div>
        : error ? <div className="parking-message parking-error"><span>!</span><p>{error}</p></div>
        : result?.mode === 'unconfigured' ? <div className="parking-message"><span>🔑</span><div><h3>주차장 API 연결을 기다리고 있어요</h3><p>{result.message} 등록 후 ‘다시 조회’를 눌러주세요.</p></div></div>
        : result?.mode === 'live' && !result.items.length ? <div className="parking-message"><span>Ⓟ</span><p>조회된 부산 주차장 중 직선거리 2km 이내에 좌표가 있는 주차장이 없어요.</p></div>
        : result?.mode === 'live' ? <div className="parking-grid">{result.items.map((p, i) => <article className="parking-card" key={p.id}>
          <div className="parking-card-heading"><span className="parking-rank">{String(i + 1).padStart(2, '0')}</span><span className="parking-distance">직선 {p.distanceMeters < 1000 ? `${p.distanceMeters}m` : `${(p.distanceMeters / 1000).toFixed(1)}km`}</span></div>
          <h3>{p.name}</h3><div className="parking-tags">{[p.kind, p.type].filter(Boolean).map((tag, index) => <span key={index}>{tag}</span>)}<span>{p.spaces === null ? '구획수 미제공' : `총 ${p.spaces}면`}</span></div>
          <p className="parking-address">{p.address || '주소 정보 없음'}</p><p className="parking-fee">{p.fee}</p>
          <details><summary>운영시간·상세 정보</summary><dl><dt>운영요일</dt><dd>{p.operatingDays || '정보 없음'}</dd><dt>평일</dt><dd>{p.weekday}</dd><dt>토요일</dt><dd>{p.saturday}</dd><dt>공휴일</dt><dd>{p.holiday}</dd><dt>전화</dt><dd>{p.phone || '정보 없음'}</dd>{p.notes && <><dt>참고</dt><dd>{p.notes}</dd></>}</dl></details>
          <a className="parking-map" href={`https://map.naver.com/p/search/${encodeURIComponent(`${p.name} ${p.address}`)}`} target="_blank" rel="noreferrer">주차장 지도 보기 ↗</a><small>자료 기준 {p.dataDate || '미제공'}</small>
        </article>)}</div> : null}
    </div>
    <p className="parking-footnote">직선거리는 실제 이동거리와 달라요. 총 주차구획수는 실시간 빈자리가 아니며, 요금과 이용 가능 여부는 방문 전에 확인해 주세요.{sample && restaurant ? ' 현재 음식점 위치는 2018년 API 문서 예시 기준입니다.' : ''}<br/>출처: <a href="https://www.data.go.kr/data/15012896/standard.do" target="_blank" rel="noreferrer">전국주차장정보표준데이터 ↗</a></p>
  </section>;
}
