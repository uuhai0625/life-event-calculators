// 楽天関連の設定・共通処理は../rakuten-shared.jsに集約(2026-09-01)。このファイルより先にHTMLで読み込まれる。
// 「送る時期の目安」(挙式日→日付)は../return-gift.js(data-kind="absent")が担当する。

let productRequestId = 0;
let productsRequested = false;

// ご祝儀袋は実売価格が金額に連動しないため、goshugi-itokoと同型の人気順4件表示(キーワードは固定)。
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
    if (!items.length) { grid.classList.remove('show'); productsRequested = false; return; }
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
    // API失敗時はaff-card(検索リンクCTA)がフォールバックとして機能するため静かに諦める。次のチップ操作で再試行する。
    grid.classList.remove('show');
    productsRequested = false;
  }
}

// 結婚式を欠席するときのご祝儀(2026-10-17新設)。公的な統計は見つかっておらず、解説記事の慣習的な目安。
// 出席なら3万円を包む間柄(友人・知人・職場の人。全互協の最多回答額は友人・同僚・上司・部下とも30,000円)が前提。
// 親族の欠席時の目安を示す出典は見つかっていないため、チップにしない(ページ内で親族への確認を案内)。
//   early  招待状が届く前(口頭で打診): All About 5,000〜10,000(同額の品物・商品券も可)/ Financial Field(226102) プレゼントでも可 /
//          Financial Field(211396) 招待状が届く前または届いた時点で10,000〜15,000
//   reply  招待状の返信で欠席: Financial Field(226102) 料理代を差し引いた1万円程度 / りそな 事前に伝えて1万円(3万−食事代2万)/
//          三菱UFJ 欠席が決まっていた場合は料理・引き出物を引いた1万円前後 / みんなのウェディング 返信はがきで欠席なら1万円くらい
//   change 出席と返信したあと2週間前まで: みんなのウェディング 出席時の半額 / Financial Field(226102) ご祝儀額または料理・飲み物代2〜3万 /
//          Financial Field(211396) 出席時と同額(3万)
//   last   2週間前以降〜当日: りそな 出席時と同額3万 / 三菱UFJ 予定の金額をそのまま / みんなのウェディング 全額 / Financial Field(327771) 全額
const TIMINGS = {
  early: {
    label: '招待状が届く前に欠席を伝える場合', text: '5,000〜¥10,000', live: '5,000円から10,000円', src: 'All About(友人・知人の場合)の解説記事1本が中心',
    note: 'All About1本の幅です。Financial Fieldは1万〜1万5,000円としています',
    advice: '友人・知人から口頭で打診された段階で欠席する場合は、5,000〜10,000円が妥当とされ、現金が不安なら同額の品物や商品券でもよいとされています(All About)。ご祝儀ではなくプレゼントでもよいとする記事(Financial Field)や、招待状が届く前または届いた時点なら1万〜1万5,000円とする記事(Financial Field)もあります。',
  },
  reply: {
    label: '招待状の返信で欠席する場合', text: '10,000', live: '10,000円前後', src: 'Financial Field・りそなグループ・三菱UFJ銀行・みんなのウェディングの4本の解説記事(いずれも「3万円から料理代を引く」考え方)',
    note: '1万〜1万5,000円とする記事もあります',
    advice: '出席時の3万円から料理代などを引いた1万円前後が目安とされています。りそなグループは食事代を2万円として3万円から引き、三菱UFJ銀行・Financial Field・みんなのウェディングも1万円前後としています。ご祝儀の代わりにプレゼントを贈る方法もあります(Financial Field)。',
  },
  change: {
    label: '出席と返信したあと、式の2週間前までに欠席へ変更する場合', text: '15,000〜¥30,000', live: '15,000円から30,000円', src: 'みんなのウェディング・Financial Fieldの解説記事',
    note: '下限の半額はみんなのウェディング1本のみ。Financial Fieldは同額(3万円)寄りです',
    advice: 'みんなのウェディングは、式の2週間前までなら出席時の半額(3万円なら1万5,000円)としています。Financial Fieldは、出席と返信していたのに欠席になった場合は出席時と同額(3万円)とする記事と、ご祝儀額または料理・飲み物代(2万〜3万円ほど)とする記事があります。',
  },
  last: {
    label: '式の2週間前を過ぎてからの欠席・当日欠席', text: '30,000', live: '30,000円(出席時と同額)', src: 'りそなグループ・三菱UFJ銀行・みんなのウェディング・Financial Fieldの解説記事',
    note: '出席時と同額(出席なら3万円を包む間柄の場合)',
    advice: '出席時と同額を贈る記事が多くあります。直前はキャンセル料がかかり、新郎新婦の負担が変わらないためとされています(Financial Field)。みんなのウェディングは、2週間以降〜当日は全額としています。直前の欠席は新郎新婦の負担が大きくなるため、やむを得ない事情がある場合でも、早めに連絡すると安心です。',
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
const chipTiming = document.getElementById('chip-timing');
let lastAmountText = '';
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

function shareText() {
  return `結婚式を欠席するときのご祝儀の相場を計算しました。\n${lastLabel}\n目安:¥${lastAmountText}\n`;
}

function calc() {
  const t = TIMINGS[getChipValue(chipTiming)];
  if (!t) return;

  resultLabel.textContent = `${t.label}のご祝儀の目安`;
  resultAmount.textContent = t.text;
  resultRange.textContent = t.note;
  resultAdvice.textContent = t.advice;
  resultLive.textContent = `${t.label}のご祝儀の目安は、${t.live}です。`;
  resultBreakdown.textContent = `出典: ${t.src}(公的な統計ではありません)`;
  resultCard.classList.add('show');
  if (nextTools) nextTools.classList.add('show');
  lastAmountText = t.text;
  lastLabel = t.label;
  updateShareUrl();
  shareRow.classList.add('show');
  document.querySelector('.survey-banner')?.classList.add('show');

  affCard.href = affiliateUrl('ご祝儀袋');
  if (!productsRequested) {
    productsRequested = true;
    showProducts('ご祝儀袋', 'ご祝儀袋(レビュー件数順)');
  }
}

chipTiming.querySelectorAll('.chip').forEach((btn) => {
  btn.addEventListener('click', () => selectChip(chipTiming, btn.dataset.value));
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

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('timing', getChipValue(chipTiming));
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
    resultLive.textContent = '結果のURLをコピーしました。';
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
  const timing = initialParams.get('timing');
  if (!Object.prototype.hasOwnProperty.call(TIMINGS, timing)) return false;
  setChipActive(chipTiming, timing);
  calc();
  return true;
}

// 祝儀袋ジャンルの人気ランキング(goshugi-itokoと同じジャンル)。計算結果とは独立した固定コンテンツ。
showRanking(210194, 'ranking-grid');

if (!initFromQuery()) calc();
