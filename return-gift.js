// 内祝い・香典返しの節に付ける「いただいた額から品を探す」と「贈る目安の日付」(2026-10-15追加、5名レビュー反映)。
// 対象: shussan-iwai(出産内祝い)・kekkon-iwai(結婚内祝い)・goshugi-koden(弔事の香典返し)・omimai-kaiki(快気祝い)。
// 読み込み順: rakuten-shared.js → return-gift.js。ページ側は #return-gift-tool に data 属性だけ置く。
//   data-kind     'birth' | 'wedding' | 'recovery' | 'funeral'(日付入力は birth / wedding / recovery のみ。弔事は日付を入力させない)
//   data-keyword  楽天の検索語
//   data-band     GA4 product_click の band に入れる名前
//   data-default  最初に選んでおく「いただいた額」
//   data-options  [[いただいた額, お返しの下限, 上限], ...](ページの早見表の行と同じ値)
// 入力した日付・選んだ額は端末の外へ送らない(GA4イベントは既存の product_click / affiliate_cta_click だけ)。
// TODO: 商品カードの描画(cardHtml)は各ページのscript.jsにも重複がある。次に触るときrakuten-shared.jsへ寄せる。
(function () {
  'use strict';

  const root = document.getElementById('return-gift-tool');
  if (!root) return;

  let options = [];
  try { options = JSON.parse(root.dataset.options || '[]'); } catch (e) { options = []; }
  const keyword = root.dataset.keyword || '';
  const kind = root.dataset.kind || '';
  const bandName = root.dataset.band || '内祝い';
  const defaultAmount = Number(root.dataset.default) || 0;

  const yen = (n) => '¥' + Number(n).toLocaleString('ja-JP');
  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ---------- 贈る目安の日付(出産・結婚・快気祝い。商品取得とは独立) ----------
  const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
  function fmt(d) {
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日(' + WEEK[d.getDay()] + ')';
  }
  function addMonths(d, n) {
    const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last));
  }
  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }
  // 実在する日付で、年が2000〜2100のときだけ返す(入力途中の「0002」「2025-02-31」などは空扱い)
  function parse(v) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    if (!m) return null;
    const y = Number(m[1]), mo = Number(m[2]), da = Number(m[3]);
    if (y < 2000 || y > 2100) return null;
    const d = new Date(y, mo - 1, da);
    if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null;
    return d;
  }
  const DATE_KINDS = {
    birth: {
      label: 'お子さんの誕生日',
      note: '生後1か月頃、お宮参りが済んだ後に贈るのが目安とされ、遅くとも生後2か月頃までに贈るようにしましょう。',
      text: (d) => '贈る目安は ' + fmt(addMonths(d, 1)) + ' 頃から、' + fmt(addMonths(d, 2)) + ' 頃までです。',
    },
    wedding: {
      label: '挙式日(挙式をしない場合は、お祝いを受け取った日)',
      note: '挙式後(挙式をしない場合は、お祝いを受け取った日から)1か月以内に贈るのが目安とされています。',
      text: (d) => '贈る目安は ' + fmt(addMonths(d, 1)) + ' 頃までです。',
    },
    recovery: {
      label: '退院した日(退院後も療養した場合は、療養を終えた日)',
      note: '退院から10日〜1か月ほどとする解説が多くあります。体調の回復を優先し、無理のない時期で構いません。退院後も療養が続く場合は、表書きを「快気内祝い」とするとされています。',
      text: (d) => '贈る目安は ' + fmt(addDays(d, 10)) + ' 頃から、' + fmt(addMonths(d, 1)) + ' 頃までです。',
    },
  };
  const cfg = DATE_KINDS[kind];
  if (cfg) {
    const box = document.createElement('div');
    box.className = 'return-date';
    box.innerHTML =
      '<p class="return-gift-label"><label for="return-date-input">' + cfg.label + '</label></p>' +
      '<input type="date" id="return-date-input" class="return-date-input" min="2000-01-01" max="2100-12-31">' +
      '<p class="return-date-result"></p>' +
      '<p class="return-date-note">' + cfg.note + '</p>';
    root.appendChild(box);
    const input = box.querySelector('input');
    const out = box.querySelector('.return-date-result');
    // aria-liveは入力欄にフォーカスした時点で付ける(属性追加と本文更新を同時にすると、初回が読み上げられないことがある)
    input.addEventListener('focus', () => out.setAttribute('aria-live', 'polite'), { once: true });
    input.addEventListener('change', () => {
      const d = parse(input.value);
      out.textContent = d ? cfg.text(d) : (input.value ? '日付を正しく入力してください。' : '');
    });
  }

  // ---------- いただいた額から品を探す(楽天APIが使えない環境ではここで止める) ----------
  if (typeof fetchRakutenProducts !== 'function' || !options.length || !keyword) return;

  const wrap = document.createElement('div');
  wrap.className = 'return-gift-picker';
  wrap.innerHTML =
    '<p class="return-gift-label" id="return-gift-amount-label">いただいた額を選ぶと、お返しの品の例を表示します</p>' +
    '<div class="chip-group" role="group" aria-labelledby="return-gift-amount-label">' +
    options.map((o) => '<button class="chip" type="button" data-amount="' + o[0] + '">' + yen(o[0]) + '</button>').join('') +
    '</div>' +
    '<p class="return-gift-range"></p>' +
    '<p class="ad-disclosure return-gift-pr"><span class="ad-disclosure-tag">PR</span>以下の商品リンクは広告(楽天アフィリエイト)を含みます。リンク経由の購入で、当サイトが紹介料を受け取ることがあります。</p>' +
    '<div class="product-grid return-gift-grid" aria-live="off"><div class="product-band-grid"></div></div>' +
    '<p class="return-gift-note">楽天市場の検索結果を、レビュー件数の多い順に表示しています(品質やおすすめ度を示すものではありません)。価格・送料・レビューは取得時点の楽天市場の表示で、変更されることがあります。</p>' +
    '<p class="return-gift-more"><span class="ad-disclosure-tag">PR</span><a href="' + esc(affiliateUrl(keyword)) + '" target="_blank" rel="noopener sponsored">楽天市場で「' + esc(keyword) + '」をもっと見る</a></p>';
  root.appendChild(wrap);

  const chips = Array.from(wrap.querySelectorAll('.chip'));
  const rangeEl = wrap.querySelector('.return-gift-range');
  const gridEl = wrap.querySelector('.return-gift-grid');
  const bandEl = gridEl.querySelector('.product-band-grid');
  const noteEl = wrap.querySelector('.return-gift-note');
  noteEl.style.display = 'none';

  function cardHtml(item) {
    const img = typeof rakutenImage === 'function' ? rakutenImage(item) : '';
    const price = Number(item.itemPrice) || 0;
    const name = String(item.itemName || '');
    const reviewCount = Number(item.reviewCount) || 0;
    const reviewAverage = Number(item.reviewAverage) || 0;
    const review = reviewCount > 0
      ? '<p class="product-review">★' + reviewAverage.toFixed(1) + '<span class="product-review-count">(' + reviewCount.toLocaleString('ja-JP') + '件)</span></p>'
      : '';
    const badge = Number(item.postageFlag) === 0
      ? '<div class="product-badges"><span class="product-badge product-badge--shipping">送料無料</span></div>'
      : '';
    return '<a class="product-card" href="' + esc(item.itemUrl) + '" target="_blank" rel="noopener sponsored" data-ga-name="' + esc(name).slice(0, 60) + '" data-ga-price="' + price + '">' +
      '<div class="product-image-wrap">' +
      (img ? '<img src="' + esc(img) + '" alt="' + esc(name) + '" loading="lazy">' : '') +
      '<span class="product-pr">PR</span>' + badge + '</div>' +
      '<p class="product-name">' + esc(name) + '</p>' + review +
      '<p class="product-price">' + yen(price) + '</p></a>';
  }

  let requestId = 0;
  let userTouched = false;
  async function select(amount, button) {
    const row = options.find((o) => Number(o[0]) === Number(amount));
    if (!row) return;
    chips.forEach((c) => c.classList.toggle('active', c === button));
    if (userTouched && !rangeEl.hasAttribute('aria-live')) rangeEl.setAttribute('aria-live', 'polite');
    const base = yen(row[0]) + 'をいただいた場合のお返しの目安は ' + yen(row[1]) + '〜' + yen(row[2]) + ' です。';
    rangeEl.textContent = base + ' 商品を取得しています…';
    gridEl.setAttribute('aria-busy', 'true');
    bandEl.classList.add('is-loading'); // 古いカードは残して薄くする(高さの急変を避ける)
    const myRequest = ++requestId;
    let items = [];
    try {
      items = await fetchRakutenProducts(keyword, 4, row[1], row[2]);
    } catch (e) {
      items = [];
    }
    if (myRequest !== requestId) return;
    gridEl.removeAttribute('aria-busy');
    bandEl.classList.remove('is-loading');
    if (!items.length) {
      bandEl.innerHTML = '';
      gridEl.classList.remove('show');
      noteEl.style.display = 'none';
      rangeEl.textContent = base + ' この価格帯の商品を表示できませんでした。下のリンクから楽天市場で探せます。';
      return;
    }
    rangeEl.textContent = base + ' この価格帯の商品の例です。';
    bandEl.innerHTML = items.map(cardHtml).join('');
    gridEl.classList.add('show');
    noteEl.style.display = '';
  }

  // 範囲文のaria-liveは、チップにフォーカスが来た時点で付ける(初回の自動読み込みでは読み上げない)
  chips.forEach((c) => c.addEventListener('focus', () => { userTouched = true; if (!rangeEl.hasAttribute('aria-live')) rangeEl.setAttribute('aria-live', 'polite'); }));
  chips.forEach((c) => c.addEventListener('click', () => { userTouched = true; started = true; select(c.dataset.amount, c); }));

  // 商品の取得は、この節が画面に近づいてから(または額を選んだとき)だけ。ページを開いただけでは呼ばない。
  let started = false;
  function startOnce() {
    if (started) return;
    started = true;
    const target = chips.find((c) => Number(c.dataset.amount) === defaultAmount) || chips[0];
    select(target.dataset.amount, target);
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); startOnce(); }
    }, { rootMargin: '200px 0px' });
    io.observe(root);
  } else {
    startOnce();
  }

  // クリックの計測(既存の product_click / affiliate_cta_click と同じ形)
  gridEl.addEventListener('click', (e) => {
    const card = e.target.closest('.product-card');
    if (!card || typeof gtag !== 'function') return;
    gtag('event', 'product_click', {
      item_name: card.dataset.gaName || '',
      price: Number(card.dataset.gaPrice) || 0,
      band: bandName,
    });
  });
  wrap.querySelector('.return-gift-more a').addEventListener('click', () => {
    if (typeof gtag !== 'function') return;
    gtag('event', 'affiliate_cta_click', { link_label: bandName + ' もっと見る' });
  });
})();
