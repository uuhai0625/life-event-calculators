// 楽天関連の設定・共通処理は../rakuten-shared.jsに集約(2026-09-01)。このファイルより先にHTMLで読み込まれる。

let productRequestId = 0;

// 香典袋は実売価格が金額に連動しないため、koden-sofuboと同じ人気順4件表示を採用(価格帯比較は不採用)。
async function showProducts(keyword, labelText) {
  const grid = document.getElementById('product-grid');
  const label = document.getElementById('product-grid-label');
  if (!grid) return;
  const requestId = ++productRequestId;
  grid.innerHTML = '';
  grid.classList.add('show');
  if (label) label.style.display = 'none';
  try {
    const items = await fetchRakutenProducts(keyword, 4, null, null);
    if (requestId !== productRequestId) return;
    if (!items.length) { grid.classList.remove('show'); return; }
    grid.innerHTML = '<div class="product-band-grid">' + items.map((item, index) => {
      const img = rakutenImage(item);
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
    grid.classList.remove('show');
  }
}

// おじ・おばへの香典の相場データ(2026-09-06、全互協「第6回香典に関するアンケート調査報告書」
// n=5,177のおじ・おば区分より、年代別の平均額をそのまま採用。10〜20代は出典側もサンプル僅少・
// 参考値と明記しておりかつ他の年代より高い逆転した数値のため、誤解を招かないよう30代の目安に統合。
const AGE_TABLE = {
  '30s': 9000,
  '40s': 15000,
  '50s': 16000,
  '60s': 24000,
};

function roundTo(amount, step) {
  return Math.round(amount / step) * step;
}

// took.jp型UX: ドロップダウン+計算ボタンをやめ、チップをクリックした瞬間に結果が更新される方式
// (goshugi-koden/script.jsで実証済みのパターンをそのまま踏襲)。
function getChipValue(container) {
  return container.querySelector('.chip.active')?.dataset.value;
}
function setChipActive(container, value) {
  [...container.children].forEach((btn) => btn.classList.toggle('active', btn.dataset.value === value));
}
function selectChip(container, value) {
  setChipActive(container, value);
  calc();
}

const chipAge = document.getElementById('chip-age');
const resultCard = document.getElementById('result-card');
const nextTools = document.querySelector('.next-tools');
const resultAmount = document.getElementById('result-amount');
const resultRange = document.getElementById('result-range');
const resultAdvice = document.getElementById('result-advice');
const resultBreakdown = document.getElementById('result-breakdown');
const affCard = document.getElementById('aff-card');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
const btnShareLine = document.getElementById('btn-share-line');
let lastAmount = 0;

function shareText(amount) {
  return `おじ・おばへの香典の相場を計算しました。\n目安:¥${amount.toLocaleString('ja-JP')}\n`;
}

function calc() {
  const ageTier = getChipValue(chipAge);
  const meal = document.querySelector('input[name="meal"]:checked').value;
  const base = AGE_TABLE[ageTier];
  if (!base) return;

  let amount = base;
  let adviceText = '通夜・葬儀に参列する場合の目安です。';
  if (meal === 'yes') {
    amount += 5000;
    adviceText += ' 会食(通夜振る舞い・お斎)にも参加されるため、少し多めの金額を上乗せしています。';
  }

  const rangeLow = Math.max(1000, roundTo(amount * 0.8, 1000));
  const rangeHigh = roundTo(amount * 1.2, 1000);

  const ageLabel = ageTier === '30s' ? '30代以下' : ageTier === '60s' ? '60代以上' : ageTier.replace('s', '代');

  resultAmount.textContent = amount.toLocaleString('ja-JP');
  resultRange.textContent = `目安レンジ:¥${rangeLow.toLocaleString('ja-JP')} 〜 ¥${rangeHigh.toLocaleString('ja-JP')}`;
  resultAdvice.textContent = adviceText;
  resultBreakdown.textContent = `内訳の目安: 全互協調査における${ageLabel}の平均額¥${base.toLocaleString('ja-JP')}${meal === 'yes' ? '(+会食分¥5,000)' : ''}`;
  resultCard.classList.add('show');
  if (nextTools) nextTools.classList.add('show');
  lastAmount = amount;
  updateShareUrl();
  shareRow.classList.add('show');
  document.querySelector('.survey-banner')?.classList.add('show');

  affCard.href = affiliateUrl('不祝儀袋 香典袋');
  showProducts('不祝儀袋', '不祝儀袋(香典袋)');
}

document.querySelectorAll('#chip-age .chip').forEach((btn) => {
  btn.addEventListener('click', () => selectChip(chipAge, btn.dataset.value));
});
document.querySelectorAll('input[name="meal"]').forEach((input) => {
  input.addEventListener('change', calc);
});

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
document.querySelector('.survey-banner a')?.addEventListener('click', () => {
  if (typeof gtag !== 'function') return;
  gtag('event', 'survey_click', {});
});

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('age', getChipValue(chipAge));
  params.set('meal', document.querySelector('input[name="meal"]:checked').value);
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
  const text = shareText(lastAmount);
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`;
  window.open(intentUrl, '_blank', 'noopener');
});
btnShareLine.addEventListener('click', () => {
  const text = shareText(lastAmount);
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(location.href)}&text=${encodeURIComponent(text)}`;
  window.open(lineUrl, '_blank', 'noopener');
});

// 共有URLからの復元: took.jp型UXではページ読み込み直後にcalc()が自動発火しupdateShareUrl()が
// URLをデフォルト値で上書きしてしまうため、「本来のクエリ」を先に退避しておく
// (詳細はgoshugi-koden/script.jsの同名コメント参照)。
const initialParams = new URLSearchParams(location.search);
function initFromQuery() {
  const params = initialParams;
  const age = params.get('age');
  const meal = params.get('meal');
  if (!age || !AGE_TABLE[age]) return;
  if (meal !== 'yes' && meal !== 'no') return;
  setChipActive(chipAge, age);
  document.querySelector(`input[name="meal"][value="${meal}"]`).checked = true;
  calc();
}

// 香典袋ジャンルの人気ランキング(2026-09-06追加)。計算結果とは独立した固定コンテンツのため、
// 計算ボタンの押下を待たずページ読み込み時に表示する。
showRanking(567467, 'ranking-grid');

// took.jp型UX: 全項目にデフォルト値があるため、ページ読み込み時から結果を表示する。
calc();
initFromQuery();
