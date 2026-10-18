// 楽天関連の設定・共通処理は../rakuten-shared.jsに集約。このファイルより先にHTMLで読み込まれる。
// 「あわせて用意するもの」(ふくさ)は../return-gift.js(data-kind="extras")が担当する。

let productRequestId = 0;
let productsRequested = false;

// ご祝儀袋は実売価格が金額に連動しないため、kekkon-kessekiと同型の人気順4件表示(キーワードは固定)。
// 取得は1回だけ(失敗・0件でも打鍵・操作のたびに再取得しない。aff-card(検索リンク)がフォールバックになる)。
async function showProducts(keyword, labelText) {
  const grid = document.getElementById('product-grid');
  const label = document.getElementById('product-grid-label');
  if (!grid) return;
  const requestId = ++productRequestId;
  grid.innerHTML = '';
  // CLS対策: 商品カード取得中も枠を表示状態にしてmin-heightで高さを確保する。
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
      if (index === 0 && reviewCount > 0) badges.push({ text: '表示中でレビュー最多', cls: 'product-badge--rank', title: '表示された商品の中でレビュー件数が最も多い商品です(品質や市場全体の順位を示すものではありません)' });
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

// 職場の人の結婚式のご祝儀(2026-10-18新設)。出典は全互協「第6回婚礼に関するアンケート調査報告書」(令和5年度実施・有効回答3,137件)の集計結果。
// 最多回答額は、職場の上司・同僚・部下・取引先のすべてで30,000円(前回の平成29年度も同じ)。
// share=「3万円」を選んだ人の割合(原文: 友人・取引先・勤務先の同僚は80%以上、部下70%、上司64%)。
// avg/prev=平均額(令和5年度/平成29年度)。最多回答額が間柄で変わらないため、金額の見出しは固定で、割合・平均額・説明が変わる。
const MODE_AMOUNT = 30000;
const RELS = {
  colleague: { label: '職場の同僚', short: '同僚', share: '80%以上', avg: 31696, prev: 28424, advice: "新郎新婦の同僚として出席した人は、80%以上が3万円を贈っていました。平均額は31,696円で、3万円に近い水準です。" },
  boss: { label: '職場の上司', short: '上司', share: '64%', avg: 37505, prev: 33872, advice: "新郎新婦の上司として出席した人も、最も多い回答額は3万円ですが、3万円を選んだ人は64%で、ほかの職場関係より少なめです。前回(平成29年度)から「5万円」の割合が6ポイント増えており、平均額は37,505円と高めです。" },
  junior: { label: '職場の部下', short: '部下', share: '70%', avg: 34921, prev: 28925, advice: "新郎新婦の部下として出席した人は、70%が3万円を贈っていました。前回(平成29年度)から「5万円」の割合が14ポイント増え、平均額は34,921円(前回28,925円)に上がっています。" },
  client: { label: '取引先', short: '取引先', share: '80%以上', avg: 28611, prev: 28333, advice: "新郎新婦の取引先として出席した人は、80%以上が3万円を贈っていました。平均額は28,611円です。回答数が少なく(年代別の合計18件)、参考値です。" }
};

const resultCard = document.getElementById('result-card');
const nextTools = document.querySelector('.next-tools');
const resultLabel = document.getElementById('result-label');
const resultLive = document.getElementById('result-live');
const resultAmount = document.getElementById('result-amount');
const resultRange = document.getElementById('result-range');
const resultAdvice = document.getElementById('result-advice');
const resultBreakdown = document.getElementById('result-breakdown');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
const btnShareLine = document.getElementById('btn-share-line');
const chipRel = document.getElementById('chip-rel');
const copyLabel = btnCopyLink.textContent;
let lastAmountText = '';
let lastLabel = '';

// ---- チップ選択(ボタンチップをクリックした瞬間に結果が更新される方式) ----
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

function yenText(n) { return n.toLocaleString('ja-JP'); }

function shareText() {
  return `職場の結婚式のご祝儀の相場(全互協・令和5年度)\n新郎新婦の${lastLabel}として出席した人の最も多い回答額:¥${lastAmountText}\n`;
}

// 共有URLは、共有ボタンを押したときに作る(入力のたびにアドレスバーを書き換えない。履歴変更によるPVの水増しを避けるため)。
function shareUrl() {
  return `${location.origin}${location.pathname}?rel=${encodeURIComponent(getChipValue(chipRel))}`;
}

function calc() {
  const r = RELS[getChipValue(chipRel)];
  if (!r) return;
  resultLabel.textContent = `新郎新婦の${r.short}として出席した人の最も多い回答額`;
  resultAmount.textContent = yenText(MODE_AMOUNT);
  resultRange.textContent = `3万円を選んだ人: ${r.share}／平均額: ${yenText(r.avg)}円(前回 ${yenText(r.prev)}円)`;
  resultAdvice.textContent = r.advice;
  resultBreakdown.textContent = '出典: 全互協「第6回婚礼に関するアンケート調査報告書」(令和5年度実施・有効回答3,137件)の、最も多かった回答額';
  resultLive.textContent = `新郎新婦の${r.short}として出席した人の、最も多い回答額は、${yenText(MODE_AMOUNT)}円です。3万円を選んだ人は${r.share}、平均額は${yenText(r.avg)}円です。`;
  resultCard.classList.add('show');
  if (nextTools) nextTools.classList.add('show');
  lastAmountText = yenText(MODE_AMOUNT);
  lastLabel = r.short;
  shareRow.classList.add('show');
  document.querySelector('.survey-banner')?.classList.add('show');

  if (!productsRequested) {
    productsRequested = true;
    showProducts('ご祝儀袋 結婚', 'ご祝儀袋(レビュー件数順)');
  }
}

chipRel.querySelectorAll('.chip').forEach((btn) => {
  btn.addEventListener('click', () => selectChip(chipRel, btn.dataset.value));
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

let copyTimer = null;
btnCopyLink.addEventListener('click', async () => {
  const url = shareUrl();
  const showCopied = () => {
    btnCopyLink.textContent = 'コピーしました✓';
    resultLive.textContent = '結果のURLをコピーしました。';
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { btnCopyLink.textContent = copyLabel; }, 2000);
  };
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('clipboard-timeout')), 1500));
    await Promise.race([navigator.clipboard.writeText(url), timeout]);
    showCopied();
  } catch (e) {
    if (legacyCopyFallback(url)) showCopied();
    else resultLive.textContent = 'URLをコピーできませんでした。';
  }
});
btnShareX.addEventListener('click', () => {
  const text = shareText();
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl())}`;
  window.open(intentUrl, '_blank', 'noopener');
});
btnShareLine.addEventListener('click', () => {
  const text = shareText();
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl())}&text=${encodeURIComponent(text)}`;
  window.open(lineUrl, '_blank', 'noopener');
});

// URLのクエリから状態を復元する(共有リンク用)。値は検証してから使う。
const initialParams = new URLSearchParams(location.search);
function initFromQuery() {
  const rel = initialParams.get('rel');
  if (!Object.prototype.hasOwnProperty.call(RELS, rel)) return false;
  setChipActive(chipRel, rel);
  calc();
  return true;
}

// 祝儀袋ジャンルの人気ランキング(kekkon-kesseki・goshugi-itokoと同じジャンル)。計算結果とは独立した固定コンテンツ。
showRanking(210194, 'ranking-grid');

if (!initFromQuery()) calc();
