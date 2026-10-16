// 楽天関連の設定・共通処理は../rakuten-shared.jsに集約(2026-09-01)。このファイルより先にHTMLで読み込まれる。

let productRequestId = 0;

// 香典袋は実売価格が金額に連動しないため、koden-shokubaと同型の人気順4件表示(キーワードは「不祝儀袋 御仏前」)。
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

// 法事・法要の香典(2026-10-16新設)。公的な統計は見つからず、解説記事の目安を使った「慣習的な目安」。
//   四十九日・一周忌 / 三回忌以降 × 親族 / 親族以外 × 会食(出る/出ない)の8通り: All About「法事とは?」(2021年8月更新)の表1本。
//   初盆(新盆): Financial Field「新盆の香典は…」の間柄別の目安(兄弟姉妹1万〜3万、孫・叔父・叔母5千〜1万、友人・知人3千〜1万)。
//     「親族」はこの2区分の下限〜上限をまとめた幅(両親・子など、より近い間柄は出典に記載なし)。
//     会食に出る場合の「1人あたり3,000〜5,000円の上乗せ」(同記事)は、金額には足さず、注記として示す(外挿を見出しの金額にしないため)。
//   別の記事の目安(Financial Fieldの一周忌、ALSOKの三回忌)は「続柄別の目安」として併記する。
const KIND_LABEL = { first: '四十九日・一周忌', third: '三回忌以降', bon: '初盆(新盆)' };
const REL_LABEL = { kin: '親族', other: '親族以外(友人・知人など)' };
const DINE_LABEL = { dine: '会食に出る', skip: '会食に出ない' };
const AMOUNTS = {
  first: { kin: { dine: [20000, 50000], skip: [10000, 30000] }, other: { dine: [10000, 30000], skip: [5000, 10000] } },
  third: { kin: { dine: [10000, 30000], skip: [5000, 20000] }, other: { dine: [10000, 20000], skip: [5000, 10000] } },
  bon: { kin: { base: [5000, 30000] }, other: { base: [3000, 10000] } },
};
// 続柄別の目安(結果の下に併記。いずれも出典記事の記載どおり)
const CROSS_CHECK = {
  first: {
    title: 'Financial Fieldの一周忌の目安(会食に出ない場合の基準。会食がある場合は5,000円〜1万円多め)',
    kin: ['両親・兄弟姉妹: 1万〜5万円', '祖父母・近い親戚: 5,000円〜3万円', '遠い親戚: 3,000円〜1万円'],
    other: ['友人: 3,000円〜1万円'],
  },
  third: {
    title: 'ALSOKの三回忌の目安(会食がある場合は、食事代として5,000円〜2万円の上乗せが目安)',
    kin: ['父母・子・兄弟姉妹・祖父母・孫: 1万〜5万円', 'おじ・おば・甥・姪・いとこなど(三親等・四親等以上): 5,000円〜3万円'],
    other: ['知人・友人・仕事関係(親族ではない方): 3,000円〜1万円'],
  },
  bon: {
    title: 'Financial Fieldの新盆の目安(会食に出る場合は、1人あたり3,000円〜5,000円を上乗せ)',
    kin: ['兄弟姉妹: 1万〜3万円', '孫・叔父・叔母: 5,000円〜1万円', '(両親・子など、より近い間柄は記載なし)'],
    other: ['友人・知人: 3,000円〜1万円', '親交が深い場合: 5,000円〜1万円、軽い付き合い: 3,000円'],
  },
};
const ADVICE = {
  first: '四十九日と一周忌は、他の法事より多めに包むのが一般的とされています。近い間柄ほど幅の上側が目安です。',
  third: 'All Aboutでは、三回忌以降は四十九日・一周忌より少なめとされています。ただしALSOKの三回忌の目安は1万〜5万円で、記事によって幅があります。',
  bon: '初盆(新盆)は、故人との関係の近さによって幅があります。会食に出る場合は、1人あたり3,000円〜5,000円を上乗せして考えるとされています。',
};
const SOURCE_NOTE = {
  first: 'All Aboutの法事の目安',
  third: 'All Aboutの法事の目安',
  bon: 'Financial Fieldの新盆の目安',
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
const chipKind = document.getElementById('chip-kind');
const chipRel = document.getElementById('chip-rel');
const chipDine = document.getElementById('chip-dine');
let lastText = '';
let lastAmountText = '';
let productsRequested = false;

// ---- チップ選択(ボタンチップをクリックした瞬間に結果が更新される方式。goshugi-kodenと同じパターン) ----
function getChipValue(container) {
  return container.querySelector('.chip.active')?.dataset.value;
}
function setChipActive(container, value) {
  [...container.children].forEach((btn) => btn.classList.toggle('active', btn.dataset.value === value));
}

function shareText() {
  return `${lastText}の香典の相場を計算しました。\n目安:${lastAmountText}\n`;
}

function calc() {
  const kind = getChipValue(chipKind);
  const rel = getChipValue(chipRel);
  const dine = getChipValue(chipDine);
  if (!AMOUNTS[kind] || !AMOUNTS[kind][rel] || !DINE_LABEL[dine]) return;

  let range;
  let rangeNote;
  if (kind === 'bon') {
    range = AMOUNTS.bon[rel].base;
    rangeNote = rel === 'kin'
      ? `根拠: ${SOURCE_NOTE[kind]}(兄弟姉妹・孫・叔父叔母の目安をまとめた幅。両親・子など、より近い間柄は出典に記載がありません)`
      : `根拠: ${SOURCE_NOTE[kind]}(間柄別の目安)`;
  } else {
    range = AMOUNTS[kind][rel][dine];
    rangeNote = `根拠: ${SOURCE_NOTE[kind]}(${KIND_LABEL[kind]}・${rel === 'kin' ? '親族' : '親族以外'}・${DINE_LABEL[dine]})`;
  }
  const yen = (n) => `¥${n.toLocaleString('ja-JP')}`;
  const text = `${range[0].toLocaleString('ja-JP')}〜${yen(range[1])}`;
  const cross = CROSS_CHECK[kind];

  resultLabel.textContent = `${KIND_LABEL[kind]}の香典の目安`;
  resultAmount.textContent = text;
  resultRange.textContent = rangeNote;
  resultAdvice.textContent = `${ADVICE[kind]} 夫婦で参列する場合は、2人分とする解説と、倍額または一定額の上乗せとする解説があります。`;
  resultBreakdown.innerHTML = `<strong>続柄別の目安</strong> — ${cross.title}<br>${cross[rel].join('<br>')}`;
  resultLive.textContent = `${KIND_LABEL[kind]}、${REL_LABEL[rel]}、${DINE_LABEL[dine]}場合の香典の目安は${range[0].toLocaleString('ja-JP')}円から${range[1].toLocaleString('ja-JP')}円です。`;
  resultCard.classList.add('show');
  if (nextTools) nextTools.classList.add('show');
  lastText = `${KIND_LABEL[kind]}・${rel === 'kin' ? '親族' : '親族以外'}・${DINE_LABEL[dine]}`;
  lastAmountText = `${yen(range[0])}〜${yen(range[1])}`;
  updateShareUrl();
  shareRow.classList.add('show');
  document.querySelector('.survey-banner')?.classList.add('show');

  if (!productsRequested) {
    productsRequested = true;
    { const l = affCard.querySelector('a'); if (l) l.href = affiliateUrl('不祝儀袋 御仏前'); }
    // 取得に失敗した場合(楽天APIの一時的な制限など)は、次のチップ操作で再試行する
    showProducts('不祝儀袋 御仏前', '不祝儀袋(香典袋)').then(() => {
      if (!document.querySelector('#product-grid .product-card')) productsRequested = false;
    });
  }
}

[chipKind, chipRel, chipDine].forEach((group) => {
  group.querySelectorAll('.chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      setChipActive(group, btn.dataset.value);
      calc();
    });
  });
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
  params.set('kind', getChipValue(chipKind));
  params.set('rel', getChipValue(chipRel));
  params.set('dine', getChipValue(chipDine));
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
  const text = shareText();
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`;
  window.open(intentUrl, '_blank', 'noopener');
});
btnShareLine.addEventListener('click', () => {
  const text = shareText();
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(location.href)}&text=${encodeURIComponent(text)}`;
  window.open(lineUrl, '_blank', 'noopener');
});
const initialParams = new URLSearchParams(location.search);
function initFromQuery() {
  const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const kind = initialParams.get('kind');
  const rel = initialParams.get('rel');
  const dine = initialParams.get('dine');
  let applied = false;
  if (has(KIND_LABEL, kind)) { setChipActive(chipKind, kind); applied = true; }
  if (has(REL_LABEL, rel)) { setChipActive(chipRel, rel); applied = true; }
  if (has(DINE_LABEL, dine)) { setChipActive(chipDine, dine); applied = true; }
  if (applied) calc();
  return applied;
}

// 香典袋ジャンルの人気ランキング(2026-09-06追加)。計算結果とは独立した固定コンテンツのため、
// 計算ボタンの押下を待たずページ読み込み時に表示する。
showRanking(567467, 'ranking-grid');

if (!initFromQuery()) calc();
