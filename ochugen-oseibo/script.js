// 楽天関連の設定・共通処理(RAKUTEN_AFFILIATE_ID・affiliateUrl()・RAKUTEN_APP_ID等・
// fetchRakutenProducts())は../rakuten-shared.jsに集約(2026-09-01)。このファイルより先にHTMLで読み込まれる。

// 連打・素早い選択変更で複数のAPIリクエストが同時に飛んだ場合、後から返ってきたはずの古いレスポンスが
// 新しい選択結果を上書きしてしまうレース状態を防ぐためのリクエストID。
let productRequestId = 0;

// 価格帯別の比較表示(「予算ぴったり」「少し奮発するなら」)。お中元・お歳暮ギフトは実際の商品価格が
// 予算と連動するカテゴリのため適用する(ご祝儀袋・香典袋のような安価な付随品とは異なり、
// 2026-08-15のデバッグで判明した「価格帯とカテゴリのミスマッチ」問題には該当しないことをcurlで事前確認済み)。
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
    { title: '手堅く選ぶなら', reason: '目安より抑えめの金額帯の商品です', minPrice: Math.max(500, Math.round(rangeLow * 0.5)), maxPrice: rangeLow },
    { title: '予算ぴったり', reason: 'ちょうど目安の金額帯の商品です', minPrice: rangeLow, maxPrice: rangeHigh },
    { title: '少し奮発するなら', reason: '予算を少し上げると選べる商品です', minPrice: rangeHigh, maxPrice: Math.round(rangeHigh * 1.6) },
  ];
  const results = await Promise.all(bands.map((b) => fetchRakutenProducts(keyword, 2, b.minPrice, b.maxPrice)));
  if (requestId !== productRequestId) return;

  let bandBlocks = bands.map((band, i) => ({ band, items: results[i] })).filter((b) => b.items.length);
  // 「予算ぴったり」帯(先頭)が0件だった場合、無言で省略せず一言添える
  // (2026-08-15、ユーザー目線レビューで「無言で上位価格帯だけ出るのは不親切」と判明)。
  const fitBandMissing = !results[1].length;
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

// 相場データ(2026-08-15、シャディギフトモール・西武そごう等の実データを突き合わせて設定)。
// お中元・お歳暮とも間柄別の金額帯はほぼ同水準(3,000円/5,000円が基本、特別な間柄はその上位帯)のため、
// シーン(季節)によらず共通のRELATIONSテーブルを使う。
const RELATIONS = {
  friend:   { label: '友人・知人',           normal: 3000, special: 5000 },
  neighbor: { label: 'ご近所・職場の同僚',   normal: 3000, special: 5000 },
  parent:   { label: '親',           normal: 3000, special: 5000 },
  relative: { label: '親戚',                 normal: 3000, special: 5000 },
  boss:     { label: '職場の上司',           normal: 5000, special: 10000 },
  business: { label: '取引先',               normal: 5000, special: 10000 },
  mentor:   { label: '恩師・仲人など',       normal: 5000, special: 10000 },
};

const SCENES = {
  chugen: { label: 'お中元', keyword: 'お中元 ギフト', icon: '🎐', advice: '時期は7月上旬〜15日頃が目安です(地域により異なる場合があります)。' },
  seibo:  { label: 'お歳暮', keyword: 'お歳暮 ギフト', icon: '🎍', advice: '時期は12月上旬〜25日頃が目安です。関東は他地域よりやや早めに贈る傾向があります。' },
};

function roundTo(amount, step) {
  return Math.round(amount / step) * step;
}

let currentScene = 'chugen';

const relationSelect = document.getElementById('select-relation');
const resultCard = document.getElementById('result-card');
const resultLabel = document.getElementById('result-label');
const resultAmount = document.getElementById('result-amount');
const resultRange = document.getElementById('result-range');
const resultAdvice = document.getElementById('result-advice');
const resultBreakdown = document.getElementById('result-breakdown');
const affCard = document.getElementById('aff-card');
const affIcon = document.getElementById('aff-icon');
const affTitle = document.getElementById('aff-title');
const mannerChugen = document.getElementById('manner-chugen');
const mannerSeibo = document.getElementById('manner-seibo');
const rateTableChugen = document.getElementById('rate-table-chugen');
const rateTableSeibo = document.getElementById('rate-table-seibo');
const calcPanel = document.getElementById('calc-panel');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
let lastAmount = 0;

function setScene(scene) {
  currentScene = scene;
  document.querySelectorAll('.scene-tab').forEach((btn) => {
    const isActive = btn.dataset.scene === scene;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
    if (isActive) calcPanel.setAttribute('aria-labelledby', btn.id);
  });
  resultCard.classList.remove('show');
  shareRow.classList.remove('show');
  affCard.classList.remove('show');
  mannerChugen.classList.toggle('show', scene === 'chugen');
  mannerSeibo.classList.toggle('show', scene === 'seibo');
  rateTableChugen.classList.toggle('show', scene === 'chugen');
  rateTableSeibo.classList.toggle('show', scene === 'seibo');
  const grid = document.getElementById('product-grid');
  const gridLabel = document.getElementById('product-grid-label');
  if (grid) { grid.innerHTML = ''; grid.classList.remove('show'); }
  if (gridLabel) gridLabel.style.display = 'none';
}

function calc() {
  const relationValue = relationSelect.value;
  const closeness = document.querySelector('input[name="closeness"]:checked').value;
  const config = RELATIONS[relationValue];
  const scene = SCENES[currentScene];
  if (!config || !scene) return;

  const amount = closeness === 'special' ? config.special : config.normal;
  const rangeLow = Math.max(1000, roundTo(amount * 0.8, 1000));
  const rangeHigh = roundTo(amount * 1.2, 1000);

  let advice = scene.advice;
  if (closeness === 'special') {
    advice += ' 特にお世話になっている相手には、通常より一段上の金額帯を選ぶのが一般的です。';
  }

  resultLabel.textContent = `${scene.label}の目安`;
  resultAmount.textContent = amount.toLocaleString('ja-JP');
  resultRange.textContent = `目安レンジ:¥${rangeLow.toLocaleString('ja-JP')} 〜 ¥${rangeHigh.toLocaleString('ja-JP')}`;
  resultAdvice.textContent = advice;
  resultBreakdown.textContent = `内訳の目安: ${config.label}(${closeness === 'special' ? '特にお世話になっている' : '一般的な間柄'})の価格帯¥${amount.toLocaleString('ja-JP')}`;
  resultCard.classList.add('show');
  lastAmount = amount;
  updateShareUrl();
  shareRow.classList.add('show');

  affIcon.textContent = scene.icon;
  affTitle.textContent = `${scene.label}ギフトを探す`;
  affCard.href = affiliateUrl(scene.keyword);
  affCard.classList.add('show');
  showProducts(scene.keyword, `🛒 人気の${scene.label}ギフト`, rangeLow, rangeHigh);

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.querySelectorAll('.scene-tab').forEach((btn) => {
  btn.addEventListener('click', () => setScene(btn.dataset.scene));
});
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

// 結果の共有機能: 詳細はgoshugi-koden/script.jsのコメント参照
function paramsFromState() {
  const params = new URLSearchParams();
  params.set('scene', currentScene);
  params.set('relation', relationSelect.value);
  params.set('closeness', document.querySelector('input[name="closeness"]:checked').value);
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function shareText(amount) {
  const relationLabel = (RELATIONS[relationSelect.value] || {}).label || '';
  const sceneLabel = SCENES[currentScene].label;
  return `${relationLabel}への${sceneLabel}の相場を計算しました。\n目安:¥${amount.toLocaleString('ja-JP')}\n`;
}

// クリップボードAPIが権限待ちなどで応答しない環境があるため、1.5秒でタイムアウトし
// 古いexecCommand('copy')にフォールバックする。
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
  if (scene !== 'chugen' && scene !== 'seibo') return;
  setScene(scene);
  const relation = params.get('relation');
  if (relation && RELATIONS[relation]) relationSelect.value = relation;
  const closeness = params.get('closeness');
  if (closeness === 'normal' || closeness === 'special') {
    document.querySelector(`input[name="closeness"][value="${closeness}"]`).checked = true;
  }
  calc();
}

setScene('chugen');
initFromQuery();
