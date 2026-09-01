// 楽天関連の設定・共通処理(RAKUTEN_AFFILIATE_ID・affiliateUrl()・RAKUTEN_APP_ID等・
// fetchRakutenProducts())は../rakuten-shared.jsに集約(2026-09-01)。このファイルより先にHTMLで読み込まれる。

// 連打・素早い選択変更で複数のAPIリクエストが同時に飛んだ場合、後から返ってきたはずの古いレスポンスが
// 新しい選択結果を上書きしてしまうレース状態を防ぐためのリクエストID(2026-08-11)。
let productRequestId = 0;

// 価格帯別の比較表示(2026-08-14): 単一の人気順4件だけだと似た商品が並びがちで決め手に欠けるという
// 競合分析・Perplexity提案を反映し、「予算ぴったり(計算結果のレンジ内)」「少し奮発するなら(レンジ上限〜1.6倍)」
// の2グループに分けて2件ずつ比較できるようにする。
function cardHtml(item, index) {
  const imgRaw = item.mediumImageUrls && item.mediumImageUrls[0];
  const img = typeof imgRaw === 'string' ? imgRaw : (imgRaw && imgRaw.imageUrl) || '';
  const price = Number(item.itemPrice).toLocaleString('ja-JP');
  const name = String(item.itemName || '').replace(/</g, '&lt;');
  // レビュー件数・評価の表示(2026-08-15、ユーザー目線レビューで追加): APIはsort=-reviewCountで
  // 人気順取得しているのに根拠(件数・評価)を見せていなかったため、購買後押しの機会損失だった。
  // レビュー0件の商品は星評価がないため表示しない。
  const reviewCount = Number(item.reviewCount) || 0;
  const reviewAverage = Number(item.reviewAverage) || 0;
  const reviewHtml = reviewCount > 0
    ? `<p class="product-review">★${reviewAverage.toFixed(1)}<span class="product-review-count">(${reviewCount.toLocaleString('ja-JP')}件)</span></p>`
    : '';
  // データ根拠バッジ(2026-08-15追加): 個々の商品に「なぜこれが選ばれているか」の一言もないという
  // ユーザー目線レビュー指摘を受け、楽天APIの実データ(バンド内順位・レビュー件数・送料フラグ)のみから
  // 客観的に判定できる範囲でバッジ化。憶測は含めない。
  const badges = [];
  if (index === 0) badges.push({ text: 'レビュー数1位', cls: 'product-badge--rank', title: '表示された商品の中でレビュー件数が最も多い商品です(市場全体の1位という意味ではありません)' });
  else if (reviewCount >= 3000) badges.push({ text: 'レビュー多数', cls: 'product-badge--rank' });
  if (Number(item.postageFlag) === 0) badges.push({ text: '送料無料', cls: 'product-badge--shipping' });
  const badgeHtml = badges.length
    ? `<div class="product-badges">${badges.map((b) => `<span class="product-badge ${b.cls}" title="${b.title || ''}">${b.text}</span>`).join('')}</div>`
    : '';
  return `
    <a class="product-card" href="${String(item.itemUrl || '').replace(/"/g, '&quot;')}" target="_blank" rel="noopener sponsored" data-ga-name="${name.replace(/"/g, '&quot;').slice(0, 60)}" data-ga-price="${Number(item.itemPrice) || 0}">
      <div class="product-image-wrap">
        <img src="${img.replace(/"/g, '&quot;')}" alt="${name.replace(/"/g, '&quot;')}" loading="lazy"><span class="product-pr">PR</span>
        ${badgeHtml}
      </div>
      <p class="product-name">${name}</p>
      ${reviewHtml}
      <p class="product-price">¥${price}</p>
    </a>`;
}


async function showProducts(keyword, labelText, rangeLow, rangeHigh) {
  const grid = document.getElementById('product-grid');
  const label = document.getElementById('product-grid-label');
  if (!grid) return;
  const requestId = ++productRequestId;
  grid.innerHTML = '';
  // CLS対策(2026-09-01): 商品カード取得中も枠を表示状態にしてmin-heightで高さを確保する。
  grid.classList.add('show');
  if (label) label.style.display = 'none';

  const bands = [
    { title: '予算ぴったり', reason: 'ちょうど目安の金額帯の商品です', minPrice: rangeLow, maxPrice: rangeHigh },
    { title: '少し奮発するなら', reason: '予算を少し上げると選べる商品です', minPrice: rangeHigh, maxPrice: Math.round(rangeHigh * 1.6) },
  ];
  const results = await Promise.all(bands.map((b) => fetchRakutenProducts(keyword, 2, b.minPrice, b.maxPrice)));
  if (requestId !== productRequestId) return; // このリクエストより後の選択操作が発生済み、結果を破棄

  let bandBlocks = bands.map((band, i) => ({ band, items: results[i] })).filter((b) => b.items.length);
  // 「予算ぴったり」帯(先頭)が0件だった場合、無言で省略せず一言添える
  // (2026-08-15、ユーザー目線レビューで「無言で上位価格帯だけ出るのは不親切」と判明)。
  const fitBandMissing = !results[0].length;
  let notice = '';
  if (!bandBlocks.length) {
    const fallback = await fetchRakutenProducts(keyword, 4, null, null);
    if (requestId !== productRequestId) return;
    if (!fallback.length) { grid.classList.remove('show'); return; }
    bandBlocks = [{ band: { title: '', reason: '' }, items: fallback }];
    notice = 'この価格帯にぴったりの商品は見つかりませんでした。人気の商品をご紹介します。';
  } else if (fitBandMissing) {
    notice = 'ちょうどの価格帯の商品は見つからなかったため、近い価格帯からご紹介します。';
  }

  const noticeHtml = notice ? `<p class="product-band-notice">${notice}</p>` : '';
  grid.innerHTML = noticeHtml + bandBlocks.map(({ band, items }) => `
    <div class="product-band" data-band-title="${band.title || 'なし'}">
      ${band.title ? `<p class="product-band-label">${band.title}<span class="product-band-reason">${band.reason}</span></p>` : ''}
      <div class="product-band-grid">${items.map(cardHtml).join('')}</div>
    </div>`).join('');
  grid.classList.add('show');
  if (label) { label.textContent = labelText; label.style.display = ''; }
}

const RELATIONS = {
  girlfriend: { label: '彼女', base: 15000 },
  boyfriend:  { label: '彼氏', base: 10000 },
  wife:       { label: '妻',   base: 15000 },
  husband:    { label: '夫',   base: 10000 },
  // 性別を前提としない関係性向けの選択肢(2026-08-31、多様な家族形態レビュー対応)。
  // 専門データが見当たらないため、彼女/彼氏(妻/夫)の中間値を暫定的な参考値としている。
  partner:    { label: 'パートナー', base: 12500 },
};

// productKeyword: 商品検索に使う語(2026-08-15追加)。以前はrelation.keywordのみで検索していたため、
// 例えば「バレンタインデー」を選んでもアドバイス文は「本命チョコ+小物」なのに商品は無関係な
// ネックレスや美顔器が出るというレビュー指摘があった(ユーザー目線レビューで発覚)。
// イベントごとに検索語を分けることで、アドバイス文と商品の整合性を取る。
// 各組み合わせ×価格帯で実際に数百〜数千件の該当商品があることをcurlで事前確認済み。
const EVENTS = {
  birthday:    { label: '誕生日',        productKeyword: '誕生日プレゼント',  multiplier: 1.0,
    advice: '相手の好きなものをさりげなくリサーチしておくと失敗が少ないです。' },
  christmas:   { label: 'クリスマス',     productKeyword: 'クリスマスプレゼント', multiplier: 1.0,
    advice: '年間で最も予算が上がりやすいイベントです。食事代は予算に含めず別枠で考えると安心です。' },
  valentine:   { label: 'バレンタインデー', productKeyword: 'バレンタイン プレゼント', multiplier: 0.4,
    advice: '本命チョコ+ちょっとした小物を組み合わせるのが近年の定番です。' },
  whiteday:    { label: 'ホワイトデー',    productKeyword: 'ホワイトデー プレゼント', multiplier: 0.4,
    advice: '「もらった額の3倍返し」は都市伝説に近く、実際は同額〜1.5倍程度のお返しが主流です。' },
  anniversary: { label: '交際・結婚記念日', productKeyword: '記念日 プレゼント', multiplier: 0.8,
    advice: '交際5年・結婚10年など節目の年は相場が上がる傾向があります。ペアアイテムやジュエリーも人気です。' },
};

const YEARS_MULTIPLIER = { under1: 1.15, '1to3': 1.0, over3: 0.9 };

function roundTo(amount, step) {
  return Math.round(amount / step) * step;
}

const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultRange = document.getElementById('result-range');
const resultAdvice = document.getElementById('result-advice');
const affCard = document.getElementById('aff-card');
const affTitle = document.getElementById('aff-title');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
let lastAmount = 0;

function calc() {
  const relation = RELATIONS[document.getElementById('select-relation').value];
  const event = EVENTS[document.getElementById('select-event').value];
  const yearsMultiplier = YEARS_MULTIPLIER[document.getElementById('select-years').value];

  const amount = roundTo(relation.base * event.multiplier * yearsMultiplier, 1000);
  const rangeLow = Math.max(1000, roundTo(amount * 0.8, 1000));
  const rangeHigh = roundTo(amount * 1.2, 1000);

  resultAmount.textContent = amount.toLocaleString('ja-JP');
  resultRange.textContent = `目安レンジ:¥${rangeLow.toLocaleString('ja-JP')} 〜 ¥${rangeHigh.toLocaleString('ja-JP')}`;
  resultAdvice.textContent = event.advice;
  resultCard.classList.add('show');
  lastAmount = amount;
  updateShareUrl();
  shareRow.classList.add('show');

  const eventKeyword = `${relation.label} ${event.productKeyword}`;
  affTitle.textContent = `${relation.label}への${event.label}プレゼントを探す`;
  affCard.href = affiliateUrl(eventKeyword);
  affCard.classList.add('show');
  showProducts(eventKeyword, `🛒 人気の${relation.label}への${event.label}プレゼント`, rangeLow, rangeHigh);

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc').addEventListener('click', calc);

// GA4クリック計測(2026-08-15追加): 詳細はgoshugi-koden/script.jsのコメント参照
document.getElementById('product-grid')?.addEventListener('click', (e) => {
  const card = e.target.closest('.product-card');
  if (!card || typeof gtag !== 'function') return;
  const band = card.closest('.product-band');
  gtag('event', 'product_click', {
    item_name: card.dataset.gaName || '',
    price: Number(card.dataset.gaPrice) || 0,
    band: band ? band.dataset.bandTitle || '' : '',
  });
});
document.getElementById('aff-card')?.addEventListener('click', () => {
  if (typeof gtag !== 'function') return;
  gtag('event', 'affiliate_cta_click', {
    link_label: document.querySelector('.aff-title')?.textContent || '',
  });
});

// 結果の共有機能(2026-08-14): 詳細はgoshugi-koden/script.jsのコメント参照
function paramsFromState() {
  const params = new URLSearchParams();
  params.set('relation', document.getElementById('select-relation').value);
  params.set('event', document.getElementById('select-event').value);
  params.set('years', document.getElementById('select-years').value);
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function shareText(amount) {
  const relation = RELATIONS[document.getElementById('select-relation').value];
  const event = EVENTS[document.getElementById('select-event').value];
  return `${relation.label}への${event.label}プレゼント予算を計算しました。\n目安:¥${amount.toLocaleString('ja-JP')}\n`;
}

// クリップボードAPIが権限待ちなどで応答しない環境があるため、1.5秒でタイムアウトし
// 古いexecCommand('copy')にフォールバックする(2026-08-15、デバッグで発見した堅牢化)。
function legacyCopyFallback(text) {
  try {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(input);
    return ok;
  } catch (e) {
    return false;
  }
}

btnCopyLink.addEventListener('click', async () => {
  const original = btnCopyLink.textContent;
  const showCopied = () => {
    btnCopyLink.textContent = 'コピーしました✓';
    setTimeout(() => { btnCopyLink.textContent = original; }, 2000);
  };
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('clipboard-timeout')), 1500));
    await Promise.race([navigator.clipboard.writeText(location.href), timeout]);
    showCopied();
  } catch (e) {
    if (legacyCopyFallback(location.href)) showCopied();
  }
});
btnShareX.addEventListener('click', () => {
  const text = shareText(lastAmount);
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`;
  window.open(intentUrl, '_blank', 'noopener');
});

function initFromQuery() {
  const params = new URLSearchParams(location.search);
  const relation = params.get('relation');
  const event = params.get('event');
  const years = params.get('years');
  if (!relation || !RELATIONS[relation]) return;
  if (!event || !EVENTS[event]) return;
  if (!years || !YEARS_MULTIPLIER[years]) return;
  document.getElementById('select-relation').value = relation;
  document.getElementById('select-event').value = event;
  document.getElementById('select-years').value = years;
  calc();
}

initFromQuery();
