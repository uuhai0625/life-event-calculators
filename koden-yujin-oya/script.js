// 楽天関連の設定・共通処理は../rakuten-shared.jsに集約(2026-09-01)。このファイルより先にHTMLで読み込まれる。

let productRequestId = 0;

// 香典袋は実売価格が金額に連動しないため、goshugi-koden/koden-sofuboと同じ人気順4件表示を採用。
async function showProducts(keyword, labelText) {
  const grid = document.getElementById('product-grid');
  const label = document.getElementById('product-grid-label');
  if (!grid) return;
  const requestId = ++productRequestId;
  grid.innerHTML = '';
  // CLS対策(2026-09-01): 商品カード取得中も枠を表示状態にしてmin-heightで高さを確保する。
  grid.classList.add('show');
  if (label) label.style.display = 'none';
  try {
    const items = await fetchRakutenProducts(keyword, 4, null, null);
    if (requestId !== productRequestId) return;
    if (!items.length) { grid.classList.remove('show'); return; }
    grid.innerHTML = '<div class="product-band-grid">' + items.map((item, index) => {
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
    }).join('') + '</div>';
    grid.classList.add('show');
    if (label) { label.textContent = labelText; label.style.display = ''; }
  } catch (e) {
    // API失敗時はaff-card(検索リンクCTA)がフォールバックとして機能するため静かに諦める
    grid.classList.remove('show');
  }
}

// 友人の親への香典: WebSearch調査(2026-08-21、みんなが選んだ終活・複数の葬儀社サイトを比較)に基づく金額表。
// 一般的な友人の親は20-30代3,000〜5,000円/40代以上5,000〜10,000円、特に親しい・家族ぐるみは年代を問わず10,000円程度まで、という複数ソース共通の傾向を反映。
const AMOUNTS = {
  general: { '20s': 3000, '30s': 5000, '40s': 5000, '50s': 5000 },
  close:   { '20s': 5000, '30s': 10000, '40s': 10000, '50s': 10000 },
};

function roundTo(amount, step) {
  return Math.round(amount / step) * step;
}

const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultRange = document.getElementById('result-range');
const resultAdvice = document.getElementById('result-advice');
const affCard = document.getElementById('aff-card');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
let lastAmount = 0;

function calc() {
  const ageTier = document.getElementById('select-age').value;
  const closeness = document.querySelector('input[name="closeness"]:checked').value;

  const amount = AMOUNTS[closeness][ageTier];
  const adviceText = closeness === 'close'
    ? '家族ぐるみの付き合いなど特に親しい関係の目安です。年代を問わず1万円程度まで包むケースも珍しくありません。'
    : '一般的な友人関係の目安です。面識が少ない場合は控えめでも問題ありません。';

  const rangeLow = Math.max(1000, roundTo(amount * 0.8, 1000));
  const rangeHigh = roundTo(amount * 1.2, 1000);

  resultAmount.textContent = amount.toLocaleString('ja-JP');
  resultRange.textContent = `目安レンジ:¥${rangeLow.toLocaleString('ja-JP')} 〜 ¥${rangeHigh.toLocaleString('ja-JP')}`;
  resultAdvice.textContent = adviceText;
  resultCard.classList.add('show');
  lastAmount = amount;
  updateShareUrl();
  shareRow.classList.add('show');

  affCard.href = affiliateUrl('不祝儀袋 香典袋');
  showProducts('不祝儀袋', '不祝儀袋(香典袋)');

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc').addEventListener('click', calc);

document.getElementById('product-grid')?.addEventListener('click', (e) => {
  const card = e.target.closest('.product-card');
  if (!card || typeof gtag !== 'function') return;
  gtag('event', 'product_click', {
    item_name: card.dataset.gaName || '',
    price: Number(card.dataset.gaPrice) || 0,
  });
});
document.getElementById('aff-card')?.addEventListener('click', () => {
  if (typeof gtag !== 'function') return;
  gtag('event', 'affiliate_cta_click', { link_label: '不祝儀袋(香典袋)を探す' });
});

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('age', document.getElementById('select-age').value);
  params.set('closeness', document.querySelector('input[name="closeness"]:checked').value);
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
function initFromQuery() {
  const params = new URLSearchParams(location.search);
  const age = params.get('age');
  const closeness = params.get('closeness');
  if (!age || !AMOUNTS.general[age]) return;
  if (closeness !== 'close' && closeness !== 'general') return;
  document.getElementById('select-age').value = age;
  document.querySelector(`input[name="closeness"][value="${closeness}"]`).checked = true;
  calc();
}

initFromQuery();
