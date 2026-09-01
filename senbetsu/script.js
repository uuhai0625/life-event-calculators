// 楽天関連の設定・共通処理(RAKUTEN_AFFILIATE_ID・affiliateUrl()・RAKUTEN_APP_ID等・
// fetchRakutenProducts())は../rakuten-shared.jsに集約(2026-09-01)。このファイルより先にHTMLで読み込まれる。

let productRequestId = 0;

function cardHtml(item, index) {
  const imgRaw = item.mediumImageUrls && item.mediumImageUrls[0];
  const img = typeof imgRaw === 'string' ? imgRaw : (imgRaw && imgRaw.imageUrl) || '';
  const price = Number(item.itemPrice).toLocaleString('ja-JP');
  const name = String(item.itemName || '').replace(/</g, '&lt;');
  const reviewCount = Number(item.reviewCount) || 0;
  const reviewAverage = Number(item.reviewAverage) || 0;
  const reviewHtml = reviewCount > 0
    ? `<p class="product-review">★${reviewAverage.toFixed(1)}<span class="product-review-count">(${reviewCount.toLocaleString('ja-JP')}件)</span></p>`
    : '';
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
  if (requestId !== productRequestId) return;

  let bandBlocks = bands.map((band, i) => ({ band, items: results[i] })).filter((b) => b.items.length);
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

// 相場データ(2026-08-17、QUOカード「餞別とは」・大人のためのビジネスマナー「お餞別・金額相場」・WebSearch複数ソース突き合わせ)。
// 個人で贈る場合はBASE×シーン倍率。連名(職場でまとめて)の場合は間柄によらずシーンごとの1人あたり相場を使う
// (出典データが「職場単位/個人」の2区分のみで関係性別の連名データがないため、実データに忠実な設計)。
const RELATIONS = {
  boss:        { label: '上司',       base: 8000 },
  colleague:   { label: '同僚・後輩', base: 4000 },
  subordinate: { label: '部下',       base: 4000 },
};

const SCENES = {
  teinen: {
    label: '定年退職', productKeyword: '退職祝い ギフト', soloMultiplier: 2.5,
    groupAmount: 3000, groupRange: [1000, 5000],
    advice: '長年の勤続への感謝を込めて、個人で贈る場合は他の退職シーンより高めの金額が一般的です。',
  },
  taishoku: {
    label: '退職・転職', productKeyword: '退職祝い ギフト', soloMultiplier: 1.0,
    groupAmount: 2000, groupRange: [500, 3000],
    advice: '円満退職であれば気持ちのこもった品を。高額すぎるとお返しの心配をさせてしまうため、負担にならない金額を心がけましょう。',
  },
  tenkin: {
    label: '転勤・異動', productKeyword: '転勤 プレゼント', soloMultiplier: 1.0,
    groupAmount: 2000, groupRange: [1000, 3000],
    advice: '同じ会社に残るケースが多いため、次の職場でも使いやすい実用品が好まれます。',
  },
};

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
const sceneSelect = document.getElementById('select-scene');
const relationSelect = document.getElementById('select-relation');
let lastAmount = 0;

function calc() {
  const scene = SCENES[sceneSelect.value];
  const relation = RELATIONS[relationSelect.value];
  if (!scene || !relation) return;
  const giving = document.querySelector('input[name="giving"]:checked').value;

  let amount, rangeLow, rangeHigh;
  if (giving === 'solo') {
    amount = roundTo(relation.base * scene.soloMultiplier, 1000);
    rangeLow = Math.max(1000, roundTo(amount * 0.8, 1000));
    rangeHigh = roundTo(amount * 1.2, 1000);
  } else {
    amount = scene.groupAmount;
    rangeLow = scene.groupRange[0];
    rangeHigh = scene.groupRange[1];
  }

  let advice = scene.advice;
  if (giving === 'group') {
    advice += ' 職場でまとめる場合の1人あたりの金額です(間柄によらず一律)。表書きは「御餞別」、代表者名や「〇〇部一同」とするのが一般的です。';
  }

  resultAmount.textContent = amount.toLocaleString('ja-JP');
  resultRange.textContent = `目安レンジ:¥${rangeLow.toLocaleString('ja-JP')} 〜 ¥${rangeHigh.toLocaleString('ja-JP')}`;
  resultAdvice.textContent = advice;
  resultCard.classList.add('show');
  lastAmount = amount;
  updateShareUrl();
  shareRow.classList.add('show');

  affTitle.textContent = `${scene.label}の送別ギフトを探す`;
  affCard.href = affiliateUrl(scene.productKeyword);
  affCard.classList.add('show');
  showProducts(scene.productKeyword, `🛒 人気の${scene.label}ギフト`, rangeLow, rangeHigh);

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc').addEventListener('click', calc);

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

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('scene', sceneSelect.value);
  params.set('relation', relationSelect.value);
  params.set('giving', document.querySelector('input[name="giving"]:checked').value);
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function shareText(amount) {
  const scene = SCENES[sceneSelect.value];
  const relation = RELATIONS[relationSelect.value];
  return `${scene.label}(${relation.label})への餞別の相場を計算しました。\n目安:¥${amount.toLocaleString('ja-JP')}\n`;
}

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
  const scene = params.get('scene');
  const relation = params.get('relation');
  const giving = params.get('giving');
  if (!scene || !SCENES[scene]) return;
  if (!relation || !RELATIONS[relation]) return;
  if (giving !== 'solo' && giving !== 'group') return;
  sceneSelect.value = scene;
  relationSelect.value = relation;
  document.querySelector(`input[name="giving"][value="${giving}"]`).checked = true;
  calc();
}

initFromQuery();
