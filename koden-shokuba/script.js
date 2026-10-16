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
      const img = rakutenImage(item);
      const price = Number(item.itemPrice).toLocaleString('ja-JP');
      const name = String(item.itemName || '').replace(/</g, '&lt;');
      const reviewCount = Number(item.reviewCount) || 0;
      const reviewAverage = Number(item.reviewAverage) || 0;
      const reviewHtml = reviewCount > 0
        ? `<p class="product-review">★${reviewAverage.toFixed(1)}<span class="product-review-count">(${reviewCount.toLocaleString('ja-JP')}件)</span></p>`
        : '';
      const badges = [];
      if (index === 0) badges.push({ text: '表示中でレビュー最多', cls: 'product-badge--rank', title: '表示された商品の中でレビュー件数が最も多い商品です(品質や市場全体の順位を示すものではありません)' });
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

// 職場の人・取引先への香典(2026-10-16新設)。
// 軸は全互協「第6回香典に関するアンケート調査報告書」(令和3年度・有効回答5,177件)の「最も多い回答額」。
//   勤務先社員の家族(n=244): 全年代で5,000円。職場関係(上司141・同僚168・部下61・所属団体50を含む区分): 全年代で5,000円。
//   取引先の関係(n=82): 全体で10,000円(10〜20代のみ5,000円だが回答数が少ない)。最多回答額は年代で(ほぼ)変わらないため、
//   年代は入力にしない。年代別の平均額は早見表に参考値として載せる。
// 目安レンジは解説記事(ハウスケアラボ「同僚や上司の親は3,000〜5,000円」「同僚3,000円・上司5,000円以上」「取引先(関係が薄い場合)3,000円」、
// サライ「職場の同僚 3千〜1万円」)と全互協の最多回答額を踏まえた編集部設定の参考幅。上司と同僚の親を分けた統計はない。
const RELATIONS = {
  family: {
    label: '上司・同僚・部下の家族',
    amount: 5000,
    zenLabel: '勤務先社員の家族',
    range: [3000, 5000],
    avgNote: '平均額は年代別に3,467〜6,022円',
    advice: '全互協の調査では、最も多い回答額は年代を問わず5,000円でした。上司と同僚の親を分けた統計はなく、解説記事では3,000〜5,000円とするものがあります。部署でまとめる慣習がある場合は、それに合わせます。',
  },
  self: {
    label: '上司・同僚・部下本人',
    amount: 5000,
    zenLabel: '職場関係',
    range: [3000, 10000],
    avgNote: '平均額は年代別に4,261〜7,289円',
    advice: '全互協の調査(区分「職場関係」)では、最も多い回答額は年代を問わず5,000円でした。解説記事では同僚3,000円・上司5,000円以上とするものがあり、上司の場合は同僚より多めが目安です。',
  },
  client: {
    label: '取引先の関係',
    amount: 10000,
    zenLabel: '取引先の関係',
    range: [3000, 10000],
    avgNote: '平均額7,915円',
    advice: '全互協の調査では、全体の最も多い回答額は10,000円でした(回答82件と少なく、年代別では10〜20代のみ5,000円でした)。関係が薄い場合は3,000円とする解説記事もあります。会社名義か個人名義かは社内の規程や前例によるため、上司や総務担当者に確認してください。',
  },
};

const resultCard = document.getElementById('result-card');
const nextTools = document.querySelector('.next-tools');
const resultLabel = document.getElementById('result-label');
const resultLive = document.getElementById('result-live');
const resultAmount = document.getElementById('result-amount');
const resultRange = document.getElementById('result-range');
const resultAdvice = document.getElementById('result-advice');
const resultBreakdown = document.getElementById('result-breakdown');
const affCard = document.getElementById('aff-card');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
const btnShareLine = document.getElementById('btn-share-line');
const chipRel = document.getElementById('chip-rel');
let lastAmount = 0;
let lastLabel = '';

// ---- チップ選択(ボタンチップをクリックした瞬間に結果が更新される方式。goshugi-kodenと同じパターン) ----
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

function shareText(amount) {
  return `${lastLabel}への香典の相場を計算しました。\n目安:¥${amount.toLocaleString('ja-JP')}\n`;
}

function calc() {
  const rel = RELATIONS[getChipValue(chipRel)];
  if (!rel) return;
  const [low, high] = rel.range;
  const amount = rel.amount;

  resultLabel.textContent = `${rel.label}への香典の目安`;
  resultAmount.textContent = amount.toLocaleString('ja-JP');
  resultRange.textContent = `目安レンジ(編集部の参考幅):¥${low.toLocaleString('ja-JP')} 〜 ¥${high.toLocaleString('ja-JP')}`;
  resultAdvice.textContent = rel.advice;
  resultLive.textContent = `${rel.label}への香典の目安は${amount.toLocaleString('ja-JP')}円、目安レンジは${low.toLocaleString('ja-JP')}円から${high.toLocaleString('ja-JP')}円です。`;
  resultBreakdown.textContent = `内訳の目安: 全互協の区分「${rel.zenLabel}」の最も多い回答額¥${amount.toLocaleString('ja-JP')}(${rel.avgNote})`;
  resultCard.classList.add('show');
  if (nextTools) nextTools.classList.add('show');
  lastAmount = amount;
  lastLabel = rel.label;
  updateShareUrl();
  shareRow.classList.add('show');
  document.querySelector('.survey-banner')?.classList.add('show');

  { const l = affCard.querySelector('a'); if (l) l.href = affiliateUrl('不祝儀袋 香典袋'); }
  showProducts('不祝儀袋', '不祝儀袋(香典袋)');
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
  gtag('event', 'affiliate_cta_click', { link_label: '不祝儀袋(香典袋)を探す' });
});
document.querySelector('.survey-banner a')?.addEventListener('click', () => {
  if (typeof gtag !== 'function') return;
  gtag('event', 'survey_click', {});
});

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('rel', getChipValue(chipRel));
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  history.replaceState(null, '', `${location.pathname}?${params.toString()}${location.hash}`);
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
const initialParams = new URLSearchParams(location.search);
function initFromQuery() {
  const rel = initialParams.get('rel');
  if (!Object.prototype.hasOwnProperty.call(RELATIONS, rel)) return false;
  setChipActive(chipRel, rel);
  calc();
  return true;
}

// 香典袋ジャンルの人気ランキング(2026-09-06追加)。計算結果とは独立した固定コンテンツのため、
// 計算ボタンの押下を待たずページ読み込み時に表示する。
showRanking(567467, 'ranking-grid');

if (!initFromQuery()) calc();
