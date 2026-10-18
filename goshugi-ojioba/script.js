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

// 叔父・叔母として甥・姪の結婚式に出席した人のご祝儀の相場データ(2026-09-06、2026-10-18に向きを訂正)。
// 全互協「第6回婚礼に関するアンケート調査報告書」(令和5年度)の叔父/叔母区分(回答者が叔父・叔母の側。有効回答448件、うち50代以上398件)の、
// 年代別の最多回答額・平均額・件数をそのまま採用(実データの直接ルックアップ)。年代は回答した人自身の年代。
// 欠席時の金額は、親族向けの出典が見つかっていないため出さない(2026-10-18に÷3の計算を撤去)。
const AGE_DATA = {
  '20s': { label: '20代', mode: 30000, avg: 23571, n: 14 },
  '30s': { label: '30代', mode: 50000, avg: 51667, n: 6 },
  '40s': { label: '40代', mode: 50000, avg: 79037, n: 30 },
  '50s': { label: '50代', mode: 100000, avg: 79039, n: 152 },
  '60s': { label: '60代', mode: 100000, avg: 91297, n: 158 },
  '70s': { label: '70代以上', mode: 50000, avg: 80909, n: 88 },
};
const SMALL_N = 30;

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
let lastAgeLabel = '';

function currentAgeData() {
  const key = getChipValue(chipAge);
  return Object.prototype.hasOwnProperty.call(AGE_DATA, key) ? AGE_DATA[key] : null;
}

function calc() {
  const d = currentAgeData();
  if (!d) return;
  const small = d.n < SMALL_N;
  resultAmount.textContent = d.mode.toLocaleString('ja-JP');
  resultRange.textContent = `回答${d.n}件${small ? '(少ないため参考値)' : ''}/平均額 ${d.avg.toLocaleString('ja-JP')}円`;
  resultAdvice.textContent = '甥・姪の結婚式に叔父・叔母として出席した人が、最も多く贈った金額です。結婚式(披露宴)に出席する場合の目安で、夫婦で出席した人の分が含まれる可能性があります。'
    + (small ? 'この年代は回答が少なく、参考値です。' : '');
  resultBreakdown.textContent = `全互協調査(令和5年度)の、叔父・叔母(${d.label})の最多回答額`;
  resultCard.classList.add('show');
  if (nextTools) nextTools.classList.add('show');
  lastAmount = d.mode;
  lastAgeLabel = d.label;
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
  return `甥・姪の結婚式のご祝儀の相場(叔父・叔母として出席した人の最多回答額・全互協)\n${lastAgeLabel}:¥${amount.toLocaleString('ja-JP')}\n`;
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
  const url = shareUrl();
  const showCopied = () => {
    btnCopyLink.textContent = 'コピーしました✓';
    setTimeout(() => { btnCopyLink.textContent = original; }, 2000);
  };
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

// 祝儀袋ジャンルの人気ランキング(2026-09-06追加)。計算結果とは独立した固定コンテンツのため、
// 計算ボタンの押下を待たずページ読み込み時に表示する。
showRanking(210194, 'ranking-grid');

// 共有URLからの復元。値は検証してから使う(旧URLの attend= は無視する)。
const initialParams = new URLSearchParams(location.search);
function initFromQuery() {
  const age = initialParams.get('age');
  if (!Object.prototype.hasOwnProperty.call(AGE_DATA, age)) return false;
  setChipActive(chipAge, age);
  calc();
  return true;
}

// took.jp型UX: 全項目にデフォルト値があるため、ページ読み込み時から結果を表示する。
if (!initFromQuery()) calc();
