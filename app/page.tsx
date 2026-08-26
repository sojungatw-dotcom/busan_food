const photos = {
  lake: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=86',
  woods: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=86',
  field: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1200&q=86',
  sunset: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=86',
  mountain: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=86',
};

export default function Home() {
  return (
    <main>
      <nav className="topbar" aria-label="주요 메뉴">
        <a className="brand" href="#top">MORI<span>°</span></a>
        <div className="navlinks">
          <a href="#story">이야기</a><a href="#archive">아카이브</a><a href="#join">함께하기</a>
        </div>
        <a className="nav-cta" href="#join">기록 시작하기</a>
      </nav>

      <section className="hero" id="top" style={{ '--hero': `url(${photos.lake})` } as React.CSSProperties}>
        <div className="hero-wash" />
        <p className="eyebrow">A SMALL ARCHIVE OF ORDINARY DAYS</p>
        <h1><span>오래 남는</span><br />여름의 기록</h1>
        <p className="hero-copy">흘러가는 계절의 빛과 목소리,<br />사소해서 더 소중한 장면을 모읍니다.</p>
        <a className="circle-link" href="#story" aria-label="이야기 섹션으로 이동">↓</a>
        <div className="hero-photo hero-photo-left"><img src={photos.woods} alt="햇살이 비치는 숲길" /><span>01 / A quiet walk</span></div>
        <div className="hero-photo hero-photo-right"><img src={photos.sunset} alt="노을이 물든 들판" /><span>remember this light</span></div>
        <p className="hero-note">notes from<br />the countryside</p>
      </section>

      <section className="intro paper" id="story">
        <div className="section-index">01</div>
        <div className="intro-title"><p className="kicker">ABOUT THE PROJECT</p><h2>우리는 평범한 하루가<br /><em>가장 좋은 이야기</em>라고 믿어요.</h2></div>
        <div className="intro-copy"><p>모리는 멀리 떠나지 않아도 만날 수 있는 장면을 기록하는 작은 아카이브입니다. 바람에 흔들리는 커튼, 늦은 오후의 그늘, 오래된 사진 속 웃음처럼요.</p><p>카메라와 몇 줄의 문장으로 나만의 계절을 천천히 수집해 보세요.</p><a href="#archive">우리의 기록 보기 <span>↗</span></a></div>
        <div className="tape-photo intro-image"><img src={photos.field} alt="초록 들판의 풍경" /></div>
        <p className="scribble">collect what<br />you love —</p>
      </section>

      <section className="film-section" id="archive">
        <div className="film-edge film-edge-top" aria-hidden="true" />
        <div className="film-heading"><p>THE MEMORY KEEPERS</p><h2>누구나 기록자가<br />될 수 있어요.</h2></div>
        <div className="roles">
          <article><span>01</span><h3>사진으로</h3><p>빛과 표정, 우연히 마주친 풍경을 한 장의 이미지로 남겨요.</p></article>
          <article><span>02</span><h3>문장으로</h3><p>그날의 온도와 마음을 짧고 솔직한 언어로 적어 보세요.</p></article>
          <article><span>03</span><h3>함께, 천천히</h3><p>서로의 기억을 나누며 평범한 날의 의미를 다시 발견해요.</p></article>
        </div>
        <div className="film-strip" aria-label="여름 기록 사진 모음">
          <figure><img src={photos.woods} alt="푸른 숲" /><figcaption>JUNE, 2026</figcaption></figure>
          <figure><img src={photos.field} alt="여름 들판" /><figcaption>AFTER THE RAIN</figcaption></figure>
          <figure><img src={photos.sunset} alt="저녁 노을" /><figcaption>THE LONGEST DAY</figcaption></figure>
          <figure><img src={photos.mountain} alt="고요한 산과 길" /><figcaption>ON OUR WAY HOME</figcaption></figure>
        </div>
        <div className="film-edge film-edge-bottom" aria-hidden="true" />
      </section>

      <section className="how paper">
        <div className="section-index">02</div><p className="kicker">HOW TO KEEP A MOMENT</p><h2>한 장의 사진에서 시작되는<br />작은 기록 습관</h2>
        <div className="steps">
          <article><strong>01</strong><div><h3>오늘의 장면 고르기</h3><p>마음이 잠시 머문 풍경 하나를 가볍게 담아보세요.</p></div></article>
          <article><strong>02</strong><div><h3>기억의 문장 적기</h3><p>날짜, 날씨, 소리처럼 떠오르는 감각을 짧게 기록해요.</p></div></article>
          <article><strong>03</strong><div><h3>나만의 아카이브 만들기</h3><p>쌓인 조각들을 돌아보며 계절의 이야기를 완성합니다.</p></div></article>
        </div>
        <div className="collage" aria-hidden="true"><img className="collage-a" src={photos.mountain} alt="" /><img className="collage-b" src={photos.sunset} alt="" /><div className="postcard">DEAR SUMMER,<br /><span>please stay a little longer.</span></div></div>
      </section>

      <section className="quote" style={{ '--quote': `url(${photos.field})` } as React.CSSProperties}><p>“기억은 대단한 순간보다<br />반복되던 작은 장면 속에 남는다.”</p><span>— MORI ARCHIVE, VOL. 01</span></section>

      <section className="join paper" id="join">
        <p className="kicker">YOUR STORY BELONGS HERE</p><h2>이번 계절을<br /><em>한 페이지에</em> 남겨보세요.</h2><p>매주 한 번, 기록을 시작할 수 있는 작은 질문과 영감을 보내드려요.</p>
        <form className="join-form"><label className="sr-only" htmlFor="email">이메일 주소</label><input id="email" type="email" placeholder="your@email.com" required /><button type="submit">소식 받기 <span>→</span></button></form>
        <div className="join-meta"><span>NO SPAM, ONLY SLOW LETTERS.</span><span>SEOUL · 2026</span></div>
      </section>

      <footer><a className="brand" href="#top">MORI<span>°</span></a><p>평범한 날을 오래 기억하는 방법.</p><div><a href="#story">ABOUT</a><a href="#archive">ARCHIVE</a><a href="#join">CONTACT</a></div><small>© 2026 MORI ARCHIVE</small></footer>
    </main>
  );
}
