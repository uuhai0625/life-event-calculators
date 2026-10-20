// 楽天関連の設定・共通処理は../rakuten-shared.jsに集約(2026-09-01)。このファイルより先にHTMLで読み込まれる。

let productRequestId = 0;

// ご祝儀袋は実売価格が金額に連動しないため、goshugi-kodenと同じ人気順4件表示を採用(価格帯比較は不採用)。
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

// いとこ(従兄弟姉妹)への結婚式ご祝儀の相場データ(2026-09-06、全互協「第6回婚礼に関するアンケート調査報告書」
// n=3,137の従兄弟/従姉妹区分より、年代別の最多回答額をそのまま採用。50代は3万/5万が拮抗のため平均に近い
// 4万円を採用(詳細はrate-table-boxの注記を参照)。ベース×倍率の推定ではなく実データの直接引用のため、
// 他ページの「係数」方式とは異なりage→amountの直接ルックアップを用いる。
const AGE_TABLE = {
  '20s': 30000,
  '30s': 30000,
  '40s': 30000,
  '50s': 40000,
  '60s': 50000,
  '70s': 30000,
};

// 全互協 令和5年度の従兄弟/従姉妹区分の年代別回答件数(回答が30件未満の年代は結果欄で参考値と示す)。
const AGE_N = { '20s': 86, '30s': 42, '40s': 42, '50s': 15, '60s': 8, '70s': 4 };
const SMALL_N = 30;

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

function calc() {
  const ageTier = getChipValue(chipAge);
  const base = AGE_TABLE[ageTier];
  if (!base) return;

  const amount = base;
  const adviceText = '結婚式(披露宴)に出席する場合の目安です。';

  const rangeLow = Math.max(1000, roundTo(amount * 0.8, 1000));
  const rangeHigh = roundTo(amount * 1.2, 1000);

  resultAmount.textContent = amount.toLocaleString('ja-JP');
  resultRange.textContent = `目安レンジ:¥${rangeLow.toLocaleString('ja-JP')} 〜 ¥${rangeHigh.toLocaleString('ja-JP')}`;
  resultAdvice.textContent = adviceText;
  const ageLabel = ageTier === '70s' ? '70代以上' : ageTier.replace('s', '代');
  const baseLabel = ageTier === '50s' ? '最多回答額(3万円/5万円)の中間的な目安' : '最多回答額';
  const n = AGE_N[ageTier];
  const nNote = n < SMALL_N ? `(回答${n}件のため参考値)` : `(回答${n}件)`;
  resultBreakdown.textContent = `内訳の目安: 全互協調査における${ageLabel}の${baseLabel}¥${base.toLocaleString('ja-JP')}${nNote}`;
  resultCard.classList.add('show');
  if (nextTools) nextTools.classList.add('show');
  lastAmount = amount;
  shareRow.classList.add('show');
  document.querySelector('.survey-banner')?.classList.add('show');

  { const l = affCard.querySelector('a'); if (l) l.href = affiliateUrl('ご祝儀袋'); }
  showProducts('ご祝儀袋', '🛒 人気のご祝儀袋');
}

document.querySelectorAll('#chip-age .chip').forEach((btn) => {
  btn.addEventListener('click', () => selectChip(chipAge, btn.dataset.value));
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
  gtag('event', 'affiliate_cta_click', { link_label: 'ご祝儀袋を探す' });
});
document.querySelector('.survey-banner a')?.addEventListener('click', () => {
  if (typeof gtag !== 'function') return;
  gtag('event', 'survey_click', {});
});

// 共有URLは、共有ボタンを押したときに作る(入力のたびにアドレスバーを書き換えない。履歴変更によるPVの水増しを避けるため)。
function shareUrl() {
  return `${location.origin}${location.pathname}?age=${encodeURIComponent(getChipValue(chipAge))}`;
}

function shareText(amount) {
  return `いとこの結婚式のご祝儀の相場を計算しました。\n目安:¥${amount.toLocaleString('ja-JP')}\n`;
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
  const url = shareUrl();
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('clipboard-timeout')), 1500));
    await Promise.race([navigator.clipboard.writeText(url), timeout]);
    showCopied();
  } catch (e) {
    if (legacyCopyFallback(url)) showCopied();
  }
});
btnShareX.addEventListener('click', () => {
  const text = shareText(lastAmount);
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl())}`;
  window.open(intentUrl, '_blank', 'noopener');
});
btnShareLine.addEventListener('click', () => {
  const text = shareText(lastAmount);
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl())}&text=${encodeURIComponent(text)}`;
  window.open(lineUrl, '_blank', 'noopener');
});

// 共有URLからの復元。値は検証してから使う(旧URLの attend= は無視する)。
const initialParams = new URLSearchParams(location.search);
function initFromQuery() {
  const age = initialParams.get('age');
  if (!Object.prototype.hasOwnProperty.call(AGE_TABLE, age)) return;
  setChipActive(chipAge, age);
  calc();
}

// 祝儀袋ジャンルの人気ランキング(2026-09-06追加)。計算結果とは独立した固定コンテンツのため、
// 計算ボタンの押下を待たずページ読み込み時に表示する。
showRanking(210194, 'ranking-grid');

// took.jp型UX: 全項目にデフォルト値があるため、ページ読み込み時から結果を表示する。
calc();
initFromQuery();
