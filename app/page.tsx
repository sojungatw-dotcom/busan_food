'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Restaurant } from '../lib/restaurants';
import NearbyParkingPanel from './components/nearby-parking';

type IconName = 'shuffle' | 'pin' | 'heart' | 'arrow' | 'check' | 'close' | 'search' | 'phone' | 'clock' | 'bowl';
function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    shuffle: <><path d="m16 3 4 4-4 4M4 7h3c5 0 5 10 10 10h3M16 13l4 4-4 4M4 17h3c2 0 3-2 4-4M13 9c1-1 2-2 4-2h3"/></>,
    pin: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    check: <path d="m5 12 4 4L19 6"/>, close: <path d="m6 6 12 12M6 18 18 6"/>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    phone: <path d="m7 3-4 2c-1 8 8 17 16 16l2-4-5-3-2 2c-3-1-5-3-6-6l2-2Z"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    bowl: <><path d="M3 12h18a9 9 0 0 1-18 0Zm4 8h10M8 8c-3-3 3-3 0-6M14 8c-3-3 3-3 0-6"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
const districts = ['전체 지역', '강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'];
const categories = [{ label: '모두 좋아요', emoji: '🍽️' }, { label: '한식', emoji: '🍚' }, { label: '중식', emoji: '🥟' }, { label: '일식', emoji: '🍣' }, { label: '해산물', emoji: '🦐' }, { label: '양식·기타', emoji: '🍝' }];
function categoryOf(r: Restaurant) {
  if (/회집|횟집|해산물|생선회/.test(r.category)) return '해산물';
  if (/중국|중식/.test(r.category)) return '중식';
  if (/일식/.test(r.category)) return '일식';
  if (/한식|식육|탕류|분식/.test(r.category)) return '한식';
  return '양식·기타';
}
function foodEmoji(r: Restaurant) { return categories.find(c => c.label === categoryOf(r))?.emoji || '🍽️'; }
function readSaved(): Restaurant[] {
  try { const rows = JSON.parse(localStorage.getItem('busan-table:saved') || '[]'); return Array.isArray(rows) ? rows.filter(r => r && typeof r.id === 'string' && typeof r.name === 'string' && typeof r.address === 'string').slice(0, 100) : []; } catch { return []; }
}
function mapLink(r: Restaurant) { return `https://map.naver.com/p/search/${encodeURIComponent(`${r.name} ${r.address}`)}`; }

export default function Home() {
  const [items, setItems] = useState<Restaurant[]>([]);
  const [mode, setMode] = useState<'sample' | 'live'>('sample');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [district, setDistrict] = useState('전체 지역');
  const [category, setCategory] = useState('모두 좋아요');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [saved, setSaved] = useState<Restaurant[]>([]);
  const [history, setHistory] = useState<Restaurant[]>([]);
  const [tab, setTab] = useState<'recommend' | 'saved'>('recommend');
  const [spinning, setSpinning] = useState(false);
  const [toast, setToast] = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError(''); setSelected(null);
    try {
      const response = await fetch('/api/restaurants', { cache: 'no-store' });
      const result = await response.json() as { message?: string; items: Restaurant[]; mode: 'sample' | 'live'; fetchedAt?: string };
      if (!response.ok) throw new Error(result.message || '데이터를 가져오지 못했습니다.');
      setItems(result.items); setMode(result.mode); setFetchedAt(result.fetchedAt || '');
    } catch (e) { setItems([]); setError(e instanceof Error ? e.message : '연결 상태를 확인해 주세요.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { setSaved(readSaved()); void load(); }, [load]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); }, [toast]);
  const filtered = useMemo(() => items.filter(r => (district === '전체 지역' || r.district === district) && (category === '모두 좋아요' || categoryOf(r) === category) && `${r.name} ${r.menu} ${r.address}`.toLowerCase().includes(query.trim().toLowerCase())), [items, district, category, query]);
  function toggleSaved(r: Restaurant) {
    const has = saved.some(s => s.id === r.id);
    const next = has ? saved.filter(s => s.id !== r.id) : [r, ...saved].slice(0, 100);
    setSaved(next);
    try { localStorage.setItem('busan-table:saved', JSON.stringify(next)); setToast(has ? '찜한 식당에서 삭제했어요.' : '찜한 식당에 담았어요.'); }
    catch { setToast('브라우저 저장 공간이 부족해 이번 방문에만 저장됩니다.'); }
  }
  async function recommend() {
    if (!filtered.length || spinning) return;
    setSpinning(true);
    await new Promise(resolve => setTimeout(resolve, 550));
    const pool = filtered.length > 1 ? filtered.filter(r => r.id !== selected?.id) : filtered;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    setSelected(choice); setHistory(old => [choice, ...old.filter(r => r.id !== choice.id)].slice(0, 6)); setSpinning(false);
    document.getElementById('recommendation')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function reset() { setDistrict('전체 지역'); setCategory('모두 좋아요'); setQuery(''); setSelected(null); }
  const sample = mode === 'sample';
  const dataDates = [...new Set(items.map(r => r.dataDate).filter(Boolean))].sort();
  const dataDateLabel = dataDates.length > 1 ? `${dataDates[0]} ~ ${dataDates[dataDates.length - 1]}` : dataDates[0];
  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="/" aria-label="부산 한 끼 홈"><span className="brand-icon"><Icon name="bowl" size={25}/></span><span>부산<span className="brand-light">한끼</span><small>BUSAN, ONE BITE AT A TIME</small></span></a><nav aria-label="주요 메뉴"><button className={tab === 'recommend' ? 'nav-active' : ''} onClick={() => setTab('recommend')}>오늘의 추천</button><button className={tab === 'saved' ? 'nav-active' : ''} onClick={() => setTab('saved')}><Icon name="heart" size={16}/>찜한 식당<span className="count">{saved.length}</span></button></nav><a className="header-source" href="https://www.data.go.kr/data/15034029/openapi.do" target="_blank" rel="noreferrer"><span className="status-dot"/>부산 공공데이터와 함께<span>↗</span></a></header>
    <main>
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span/>오늘의 메뉴 고민, 여기까지</div><h1>부산의 맛있는 우연,<br/><span>오늘 한 끼는 어디?</span></h1><p>고르는 건 가볍게, 한 끼는 든든하게.<br/>부산의 모범음식점 중 당신의 다음 한 끼를 찾아드려요.</p><div className="hero-tags"><span><Icon name="check" size={14}/>부산시 지정 모범음식점</span><span><Icon name="shuffle" size={14}/>취향대로 랜덤 추천</span></div></div><div className="hero-art"><img src="/busan-table.svg" alt="광안대교와 부산 바다 앞에 차려진 한 상 일러스트"/><span className="art-note">뜻밖의 발견이<br/><b>맛있는 하루로.</b><i>✳</i></span><span className="art-caption">A LITTLE ADVENTURE ON YOUR PLATE.</span></div></section>
      <div className={`data-notice ${!sample && !error ? 'live' : ''}`} role="status"><span className="notice-symbol">{error ? '!' : sample ? 'i' : '✓'}</span><p>{error ? error : loading ? '부산의 음식점을 불러오고 있어요.' : sample ? <><b>지금은 미리보기예요.</b> API 키 등록 전에는 첨부 문서의 예시 7곳을 보여드려요. (2018년 자료)</> : <><b>부산 공공데이터 연결 완료</b> 모범음식점 {items.length}곳에서 추천해 드려요.</>}</p><button onClick={load} disabled={loading || spinning}>{loading ? '불러오는 중…' : '데이터 새로고침'}<span>↻</span></button></div>
      {tab === 'recommend' ? <>
        <section className="discovery" aria-labelledby="discovery-title"><div className="section-heading"><div><div className="section-kicker">FIND YOUR NEXT BITE</div><h2 id="discovery-title">어떤 한 끼가 끌리세요?</h2></div><span className="step-label">01 취향 선택 <span>―</span> 02 맛있는 발견</span></div>
          <div className="discovery-grid"><div className="filter-panel"><div className="filter-label"><span className="label-icon"><Icon name="pin" size={18}/></span><h3>어디에서 먹을까요?</h3><span className="optional">선택사항</span></div><label className="sr-only" htmlFor="district">지역 선택</label><select id="district" disabled={spinning} value={district} onChange={e => { setDistrict(e.target.value); setSelected(null); }}><option value="전체 지역">부산 어디든 좋아요</option>{districts.slice(1).map(d => <option key={d}>{d}</option>)}</select>
          <div className="filter-label cuisine-label"><span className="label-icon"><Icon name="bowl" size={18}/></span><h3>무엇을 먹을까요?</h3></div><div className="cuisine-options">{categories.map(c => <button key={c.label} disabled={spinning} className={category === c.label ? 'chosen' : ''} aria-pressed={category === c.label} onClick={() => { setCategory(c.label); setSelected(null); }}><span>{c.emoji}</span>{c.label}{category === c.label && <Icon name="check" size={13}/>}</button>)}</div>
          <label className="search-field"><Icon name="search" size={18}/><span className="sr-only">식당명 또는 메뉴 검색</span><input disabled={spinning} placeholder="생각나는 메뉴나 식당이 있나요?" value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }}/>{query && <button disabled={spinning} aria-label="검색 지우기" onClick={() => setQuery('')}><Icon name="close" size={14}/></button>}</label>
          <div className="filter-summary"><span>{loading ? '불러오는 중' : <><strong>{filtered.length}</strong>곳의 {sample ? '예시 식당' : '모범음식점'}이 기다리고 있어요</>}</span><button onClick={reset} disabled={spinning}>초기화 ↻</button></div><button className="primary-button" onClick={recommend} disabled={loading || spinning || !filtered.length}><Icon name="shuffle"/>{spinning ? '맛있는 우연을 찾는 중…' : selected ? '다른 식당 추천받기' : '오늘의 한 끼 뽑기'}<Icon name="arrow"/></button><p className="under-button">{!loading && !error && !filtered.length ? '선택한 조건에 맞는 식당이 없어요. 조건을 바꿔보세요.' : '선택한 조건 안에서 무작위로 한 곳을 추천해요.'}</p></div>
          <div id="recommendation" className={`result-panel ${selected ? 'has-result' : ''} ${spinning ? 'spinning' : ''}`} aria-live="polite" aria-busy={spinning}>{selected ? <><div className="result-top"><span className="result-label"><span/>오늘의 한 끼, 찾았어요!</span><button className={`save-button ${saved.some(s => s.id === selected.id) ? 'is-saved' : ''}`} aria-label={saved.some(s => s.id === selected.id) ? '찜 취소' : '식당 찜하기'} aria-pressed={saved.some(s => s.id === selected.id)} onClick={() => toggleSaved(selected)}><Icon name="heart"/></button></div><div className="result-food">{foodEmoji(selected)}</div><div className="restaurant-tags"><span>{selected.district}</span><span>{selected.category}</span>{sample && <span>문서 예시</span>}</div><h3>{selected.name}</h3><p className="menu-name">{selected.menu || '대표 메뉴 정보가 없어요'}</p><div className="restaurant-details"><p><Icon name="pin" size={16}/>{selected.address || '주소 정보 없음'}</p><p><Icon name="phone" size={16}/>{selected.phone || '전화번호 정보 없음'}</p></div><a className="map-button" href={mapLink(selected)} target="_blank" rel="noreferrer">네이버 지도에서 보기<Icon name="arrow" size={16}/></a><span className="result-footnote">{sample ? '2018년 문서 예시 · 현재 영업 및 지정 여부는 확인이 필요해요.' : `데이터 기준 ${selected.dataDate || '미제공'} · 방문 전 영업 여부를 확인해 주세요.`}</span></> : <div className="empty-result"><span className="spark spark-one">✧</span><span className="spark spark-two">✳</span><div className="empty-plate"><span>🍽️</span><i>?</i></div><span className="small-overline">YOUR NEXT DELICIOUS DISCOVERY</span><h3>{spinning ? '오늘의 한 끼를 고르고 있어요' : '어떤 맛있는 우연이 기다릴까요?'}</h3><p>취향을 골랐다면, 뽑기 버튼을 눌러보세요.<br/>당신을 위한 부산의 한 끼가 나타나요.</p><span className="empty-bottom"><Icon name="shuffle" size={15}/>고민은 줄이고, 새로운 맛은 더하고</span></div>}</div></div>
        </section>
        <NearbyParkingPanel restaurant={selected} sample={sample}/>
        {history.length > 0 && <section className="history-section"><div className="section-heading"><h2><Icon name="clock"/>방금 만난 식당</h2><span>최근 추천 {history.length}곳</span></div><div className="restaurant-grid">{history.map(r => <RestaurantCard key={r.id} r={r} isSaved={saved.some(s => s.id === r.id)} toggle={() => toggleSaved(r)}/>)}</div></section>}
      </> : <section className="saved-section"><div className="section-heading"><div><div className="section-kicker">YOUR DELICIOUS LIST</div><h2>찜한 식당 <span className="orange">{saved.length}</span></h2></div><button className="text-link" onClick={() => setTab('recommend')}>새로운 한 끼 찾기 →</button></div><p className="saved-note">찜한 식당은 이 브라우저에 저장돼요. 미리보기에서 찜한 항목은 2018년 문서 예시입니다.</p>{saved.length ? <div className="restaurant-grid">{saved.map(r => <RestaurantCard key={r.id} r={r} isSaved toggle={() => toggleSaved(r)}/>)}</div> : <div className="saved-empty"><Icon name="heart" size={40}/><h3>다음에 가고 싶은 식당을 모아보세요.</h3><p>추천받은 식당의 하트를 누르면 여기에 담겨요.</p><button className="primary-button" onClick={() => setTab('recommend')}>오늘의 한 끼 찾기<Icon name="arrow"/></button></div>}</section>}
      <section className="trust-strip"><div><span className="trust-number">01</span><div><h3>부산이 지정한 모범음식점</h3><p>부산광역시 구·군의 공공데이터를 활용해요.</p></div><span className="trust-icon">✧</span></div><div><span className="trust-number">02</span><div><h3>작은 선택, 새로운 발견</h3><p>익숙한 동네에서도 새로운 한 끼를 만나보세요.</p></div><Icon name="shuffle" size={27}/></div><div><span className="trust-number">03</span><div><h3>마음에 들면, 찜</h3><p>가고 싶은 식당을 나만의 목록에 담아두세요.</p></div><Icon name="heart" size={27}/></div></section>
      <section className="source-note"><span className="source-mark">B</span><p><b>좋은 데이터로, 맛있는 연결을 만듭니다.</b><br/>데이터 출처: 부산광역시 · 구군 모범음식점 현황{!sample && dataDateLabel ? ` · 자료 기준 ${dataDateLabel}` : ''}{fetchedAt ? ` · 조회 ${new Date(fetchedAt).toLocaleDateString('ko-KR')}` : ''}<br/><span>메뉴·지정 현황은 제공기관의 자료 기준이며, 실제 영업 정보와 다를 수 있어요.</span></p><a href="https://www.data.go.kr/data/15034029/openapi.do" target="_blank" rel="noreferrer">공공데이터 살펴보기 ↗</a></section>
    </main><footer><a className="footer-brand" href="/">부산한끼<span>부산의 맛있는 우연을 만나다.</span></a><span>© {new Date().getFullYear()} 부산한끼. Made for your next bite.</span><span>BUSAN, SOUTH KOREA <span className="orange">↗</span></span></footer>{toast && <div role="status" className="toast"><Icon name="check" size={18}/>{toast}</div>}
  </div>;
}
function RestaurantCard({ r, isSaved, toggle }: { r: Restaurant; isSaved: boolean; toggle: () => void }) {
  return <article className="restaurant-card"><div className="card-top"><span className="card-food">{foodEmoji(r)}</span><button className={`save-button ${isSaved ? 'is-saved' : ''}`} onClick={toggle} aria-label={`${r.name} ${isSaved ? '찜 취소' : '찜하기'}`} aria-pressed={isSaved}><Icon name="heart" size={18}/></button></div><span className="card-district">{r.district} · {r.category}</span><h3>{r.name}</h3><p>{r.menu || '메뉴 정보 없음'}<small className="card-data-date">자료 기준 {r.dataDate || '미제공'}</small></p><a href={mapLink(r)} target="_blank" rel="noreferrer">지도에서 보기<Icon name="arrow" size={15}/></a></article>;
}
