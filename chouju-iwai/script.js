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

// 長寿祝いの一覧(2026-08-19、実データ調査に基づく)。年齢は満年齢を基準に統一
// (還暦だけは数え年61歳=満年齢60歳が一致するため、他の祝いも満年齢基準にそろえた方が
// 利用者にとって分かりやすいと判断)。
// 出典: VMG「長寿のお祝い」(vmg.co.jp)、OZmall「長寿祝い」(ozmall.co.jp) ほか(2026年8月確認)。
const CELEBRATIONS = [
  { age: 60,  key: 'kanreki', name: '還暦', reading: 'かんれき' },
  { age: 70,  key: 'koki',    name: '古希', reading: 'こき' },
  { age: 77,  key: 'kiju',    name: '喜寿', reading: 'きじゅ' },
  { age: 80,  key: 'sanju',   name: '傘寿', reading: 'さんじゅ' },
  { age: 88,  key: 'beiju',   name: '米寿', reading: 'べいじゅ' },
  { age: 90,  key: 'sotsuju', name: '卒寿', reading: 'そつじゅ' },
  { age: 99,  key: 'hakuju',  name: '白寿', reading: 'はくじゅ' },
  { age: 100, key: 'kiju100', name: '百寿(紀寿)', reading: 'ひゃくじゅ' },
];

// 年齢帯ごとに贈り物予算の出典データの粒度が異なるため、3段階のtierにまとめている
// (地域差ボックスと同じ考え方: 出典にない精度を無理に補間して捏造しない)。
function tierOf(age) {
  if (age === 60) return 'kanreki';
  if (age === 88 || age === 90 || age === 99 || age === 100) return 'senior';
  return 'mid'; // 70, 77, 80
}

// 贈り物予算の目安(2026-08-19、実データ調査に基づく)。
// 出典: fujimaki-select.com(還暦・関係性別)、shinbun20.com(古希)、babylog.jp(喜寿・米寿)、
// nakajimataishodo-shop.jp(米寿)、oiwai-tyouju.com(百寿) いずれも2026年8月確認。
const AMOUNTS = {
  child: {
    label: '子として(親御さんへ)',
    kanreki: { low: 10000, high: 50000 },
    mid:     { low: 10000, high: 100000 },
    senior:  { low: 20000, high: 50000 },
  },
  grandchild: {
    label: '孫として(祖父母へ)',
    kanreki: { low: 5000, high: 20000, note: '還暦は「孫」単独の相場データが少ないため、親戚・友人と同水準のレンジを目安として掲載しています。' },
    mid:     { low: 10000, high: 30000, note: '成人した孫から祖父母へは5,000〜1万円程度とやや控えめになる場合もあります(喜寿の実データより)。' },
    senior:  { low: 10000, high: 30000 },
  },
  relative: {
    label: '親戚として',
    kanreki: { low: 5000, high: 20000 },
    mid:     { low: 5000, high: 10000 },
    senior:  { low: 5000, high: 10000 },
  },
  friend_colleague: {
    label: '友人・職場の方として',
    kanreki: { low: 5000, high: 20000 },
    mid:     { low: 5000, high: 10000 },
    senior:  { low: 5000, high: 10000, note: '米寿以降の友人・職場向け相場データは確認できなかったため、古希〜傘寿と同水準を参考として掲載しています。' },
  },
};

function roundTo(amount, step) {
  return Math.round(amount / step) * step;
}

const resultCard = document.getElementById('result-card');
const resultLabel = document.getElementById('result-label');
const resultCeleb = document.getElementById('result-celeb');
const resultTiming = document.getElementById('result-timing');
const resultAdvice = document.getElementById('result-advice');
const affCard = document.getElementById('aff-card');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
const birthYearInput = document.getElementById('input-birthyear');
const birthYearError = document.getElementById('birthyear-error');
const relationSelect = document.getElementById('select-relation');
let lastShareText = '';

function calc() {
  const currentYear = new Date().getFullYear();
  const birthYear = parseInt(birthYearInput.value, 10);
  const relation = relationSelect.value;

  if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > currentYear) {
    birthYearError.classList.add('show');
    birthYearInput.setAttribute('aria-invalid', 'true');
    resultCard.classList.remove('show');
    return;
  }
  birthYearError.classList.remove('show');
  birthYearInput.setAttribute('aria-invalid', 'false');

  const age = currentYear - birthYear;

  // 直近(今年含む)に該当する、または次に迎える長寿祝いを探す。100歳(百寿)を
  // 超えている場合は該当なしのため、贈り物の目安には百寿の金額を参考として使う。
  let targetCeleb = CELEBRATIONS.find((c) => c.age >= age);
  let pastLimit = false;
  if (!targetCeleb) {
    pastLimit = true;
    targetCeleb = CELEBRATIONS[CELEBRATIONS.length - 1];
  }
  const targetYear = birthYear + targetCeleb.age;
  const yearsUntil = targetCeleb.age - age;
  const pastCeleb = [...CELEBRATIONS].reverse().find((c) => c.age < targetCeleb.age && c.age <= age);

  if (pastLimit) {
    resultLabel.textContent = '長寿祝いの節目をこえていらっしゃいます';
    resultCeleb.textContent = `百寿(100歳)超`;
    resultTiming.textContent = 'これからもすこやかに、長寿をお祝いください。';
  } else if (yearsUntil === 0) {
    resultLabel.textContent = `今年(${currentYear}年)迎える長寿祝い`;
    resultCeleb.textContent = `${targetCeleb.name}(${targetCeleb.age}歳)`;
    resultTiming.textContent = `${birthYear}年生まれの方は、今年が${targetCeleb.name}です。`;
  } else if (age < CELEBRATIONS[0].age) {
    resultLabel.textContent = '次の長寿祝い';
    resultCeleb.textContent = `${targetCeleb.name}(${targetCeleb.age}歳)`;
    resultTiming.textContent = `${targetYear}年に迎えます(あと${yearsUntil}年)。`;
  } else {
    resultLabel.textContent = '次の長寿祝い';
    resultCeleb.textContent = `${targetCeleb.name}(${targetCeleb.age}歳)`;
    let timing = `${targetYear}年に迎えます(あと${yearsUntil}年)。`;
    if (pastCeleb) timing = `${pastCeleb.name}(${pastCeleb.age}歳)は迎えられています。次は${timing}`;
    resultTiming.textContent = timing;
  }

  const tier = tierOf(targetCeleb.age);
  const amountConfig = AMOUNTS[relation][tier];
  const rangeLow = amountConfig.low;
  const rangeHigh = amountConfig.high;

  let advice = `${AMOUNTS[relation].label}${targetCeleb.name}を贈る場合の金額目安は¥${rangeLow.toLocaleString('ja-JP')}〜¥${rangeHigh.toLocaleString('ja-JP')}です。`;
  if (amountConfig.note) advice += ` ${amountConfig.note}`;
  resultAdvice.textContent = advice;

  resultCard.classList.add('show');
  lastShareText = `${targetCeleb.name}(${targetCeleb.age}歳)まで${resultTiming.textContent}\n贈り物の目安:¥${rangeLow.toLocaleString('ja-JP')}〜¥${rangeHigh.toLocaleString('ja-JP')}\n`;
  updateShareUrl();
  shareRow.classList.add('show');

  const keyword = `${targetCeleb.name}祝い ギフト`;
  affCard.href = affiliateUrl(keyword);
  affCard.classList.add('show');
  showProducts(keyword, `🛒 人気の${targetCeleb.name}祝いギフト`, rangeLow, rangeHigh);

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc').addEventListener('click', calc);

// GA4クリック計測: 詳細はgoshugi-koden/script.jsのコメント参照
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

// 結果の共有機能: 詳細はgoshugi-koden/script.jsのコメント参照
function paramsFromState() {
  const params = new URLSearchParams();
  params.set('birthyear', birthYearInput.value);
  params.set('relation', relationSelect.value);
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
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
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(lastShareText)}&url=${encodeURIComponent(location.href)}`;
  window.open(intentUrl, '_blank', 'noopener');
});

function initFromQuery() {
  const params = new URLSearchParams(location.search);
  const birthyear = parseInt(params.get('birthyear'), 10);
  const relation = params.get('relation');
  if (!Number.isInteger(birthyear) || !relation || !AMOUNTS[relation]) return;
  birthYearInput.value = String(birthyear);
  relationSelect.value = relation;
  calc();
}

initFromQuery();
