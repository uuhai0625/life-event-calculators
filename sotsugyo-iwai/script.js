// 楽天関連の設定・共通処理は../rakuten-shared.jsに集約。このファイルより先にHTMLで読み込まれる。
// 卒業祝い(2026-10-20新設)。公的な統計は見つかっておらず、解説記事の目安(Financial Field・良品ランキング・アソビュー!)を当サイトで整理した範囲。孫の学校別の範囲は、学校別の出典がなく当サイトの整理(各セルのnoteに明記)。

let productRequestId = 0;

function cardHtml(item, index) {
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
}

// 価格帯別の表示(結果のレンジに連動)。商品が0件の帯は省き、全帯が空なら人気順の4件にする。
async function showProducts(keyword, labelText, rangeLow, rangeHigh) {
  const grid = document.getElementById('product-grid');
  const label = document.getElementById('product-grid-label');
  if (!grid) return;
  const requestId = ++productRequestId;
  grid.innerHTML = '';
  grid.classList.add('show');
  if (label) label.style.display = 'none';
  if (rangeHigh <= rangeLow) rangeHigh = Math.round(rangeLow * 1.3); // 目安が1つの金額のとき(例: 10,000円)は少し幅を持たせる

  const bands = [
    { title: '目安より低めの価格帯', reason: '目安より抑えめの金額帯の商品です', minPrice: Math.max(500, Math.round(rangeLow * 0.5)), maxPrice: rangeLow },
    { title: '目安の価格帯', reason: 'ちょうど目安の金額帯の商品です', minPrice: rangeLow, maxPrice: rangeHigh },
    { title: '目安より高めの価格帯', reason: '目安より少し高い金額帯の商品です', minPrice: rangeHigh, maxPrice: Math.round(rangeHigh * 1.6) },
  ];
  const results = await Promise.all(bands.map((b) => fetchRakutenProducts(keyword, 2, b.minPrice, b.maxPrice)));
  if (requestId !== productRequestId) return;

  let bandBlocks = bands.map((band, i) => ({ band, items: results[i] })).filter((b) => b.items.length);
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

// ---- データ(金額・出典は cfg 由来。根拠は各ページの早見表・出典欄に書いてある) ----
const NOUN = "卒業祝い";
const PRODUCT_KEYWORD = "卒業祝い ギフト";
const PRODUCT_LABEL = "卒業祝いの品(レビュー件数順)";
const REL = {
  "grandchild": {
    "label": "孫(祖父母から)",
    "src": "Financial Fieldの記事と、一般向けの解説記事(良品ランキング・アソビュー!)",
    "basis": "根拠: Financial Fieldの孫向け記事(卒業・入学祝い1〜5万円、3万円の評価)と一般向けの記事を踏まえた当サイトの整理です。孫の学校別の金額を示した記事はありません(公的な統計ではありません)",
    "advice": "孫への卒業祝いを学校別に示した記事は見つかっていません。Financial Fieldは、孫への卒業・入学祝いを1〜5万円と幅広く示し、3万円は小・中学生ではやや高め、高校・大学では適正か少し低めとしています。このページの学校別の範囲は、この記事と一般向けの記事を踏まえた当サイトの整理です。",
    "amounts": {
      "elem": {
        "low": 5000,
        "high": 20000,
        "text": "5,000〜¥20,000",
        "live": "5,000円から20,000円",
        "note": "Financial Fieldは、小・中学生の孫に大きな現金は管理に困ることがあるとして、現金1〜2万円に文房具や商品券を添える方法を紹介しています。一般向けの記事は、良品ランキングが3千〜5千円、アソビュー!が1万円以内です。その両方を含む幅にしています(当サイトの整理)"
      },
      "junior": {
        "low": 5000,
        "high": 20000,
        "text": "5,000〜¥20,000",
        "live": "5,000円から20,000円",
        "note": "Financial Fieldは、小・中学生の孫に3万円はやや高めとし、現金1〜2万円に文房具や商品券を添える方法を紹介しています。一般向けの記事は、良品ランキングが3千〜1万円、アソビュー!が1万円以内です。その両方を含む幅にしています(当サイトの整理)"
      },
      "high": {
        "low": 20000,
        "high": 30000,
        "text": "20,000〜¥30,000",
        "live": "20,000円から30,000円",
        "note": "Financial Fieldは、3万円を高校・大学の卒業祝いでは適正か少し低めとしています。一般向けの記事は、良品ランキングが1万〜3万円、アソビュー!が1万〜2万円です(当サイトの整理)"
      },
      "univ": {
        "low": 20000,
        "high": 30000,
        "text": "20,000〜¥30,000",
        "live": "20,000円から30,000円",
        "note": "Financial Fieldは、3万円を高校・大学の卒業祝いでは適正か少し低めとし、孫への卒業・入学祝い全体を1〜5万円としています。一般向けの記事は、良品ランキングが1万〜3万円、アソビュー!が1万〜2万円です(当サイトの整理)"
      }
    }
  },
  "nephew": {
    "label": "甥・姪(おじ・おばから)",
    "src": "Financial Fieldの記事と、一般向けの解説記事(良品ランキング・アソビュー!)",
    "advice": "甥・姪への卒業祝いは、Financial Fieldが小学校3,000円〜1万円・中学校5,000円〜1万円・高校5,000円〜1万5,000円・大学(専門学校)1万円〜3万円としています。他の親戚と大きく差をつけると相手が気を使うことがあるため、親戚間のバランスも考えるとよいとされています。",
    "amounts": {
      "elem": {
        "low": 3000,
        "high": 10000,
        "text": "3,000〜¥10,000",
        "live": "3,000円から10,000円",
        "note": "Financial Fieldは3千〜1万円。一般向けの記事は、良品ランキングが小学生3千〜5千円、アソビュー!が1万円以内です"
      },
      "junior": {
        "low": 5000,
        "high": 10000,
        "text": "5,000〜¥10,000",
        "live": "5,000円から10,000円",
        "note": "Financial Fieldは5千〜1万円。一般向けの記事は、良品ランキングが3千〜1万円、アソビュー!が1万円以内です"
      },
      "high": {
        "low": 5000,
        "high": 15000,
        "text": "5,000〜¥15,000",
        "live": "5,000円から15,000円",
        "note": "Financial Fieldは5千〜1万5千円。一般向けの記事は、良品ランキングが1万〜3万円、アソビュー!が1万〜2万円と、高めです"
      },
      "univ": {
        "low": 10000,
        "high": 30000,
        "text": "10,000〜¥30,000",
        "live": "10,000円から30,000円",
        "note": "Financial Fieldは1万〜3万円(特に親しい場合は2万〜3万円)。一般向けの記事は、良品ランキングが1万〜3万円、アソビュー!が1万〜2万円です"
      }
    }
  }
};
const SECOND = {"id": "school", "labels": {"elem": "小学校", "junior": "中学校", "high": "高校", "univ": "大学"}}; // 2つ目のチップ(学校)

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
const chipSecond = SECOND ? document.getElementById('chip-' + SECOND.id) : null;
let lastAmountText = '';
let lastLabel = '';

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
  return `${lastLabel}の相場を計算しました。\n目安:¥${lastAmountText}(解説記事の目安を当サイトが整理した金額です)\n`;
}

function calc() {
  const relValue = getChipValue(chipRel);
  const rel = REL[relValue];
  if (!rel) return;
  const secondValue = chipSecond ? getChipValue(chipSecond) : '*';
  const exact = rel.amounts[secondValue];
  const cell = exact || rel.amounts['*'];
  if (!cell) return;
  // この相手は2つ目のチップ(学校など)で金額が変わらない場合、2つ目のチップを無効にし、ラベルにも出さない
  const secondLabel = SECOND && exact ? SECOND.labels[secondValue] : '';
  if (chipSecond) {
    const fixedAmount = !exact;
    chipSecond.querySelectorAll('.chip').forEach((b) => { b.disabled = fixedAmount; b.style.opacity = fixedAmount ? '0.45' : ''; });
  }
  const label = rel.label + (secondLabel ? '・' + secondLabel : '');

  resultLabel.textContent = `${label}への${NOUN}の目安`;
  resultAmount.textContent = cell.text;
  resultRange.textContent = cell.note || '';
  resultAdvice.textContent = rel.advice + (cell.advice ? ' ' + cell.advice : '');
  resultLive.textContent = `${label}への${NOUN}の目安は、${cell.live}です。`;
  resultBreakdown.textContent = rel.basis ? rel.basis : `出典: ${cell.src || rel.src}(公的な統計ではありません)`;
  resultCard.classList.add('show');
  if (nextTools) nextTools.classList.add('show');
  lastAmountText = cell.text;
  lastLabel = label + 'への' + NOUN;
  shareRow.classList.add('show');
  document.querySelector('.survey-banner')?.classList.add('show');

  showProducts(PRODUCT_KEYWORD, PRODUCT_LABEL, cell.bandLow || cell.low, cell.bandHigh || cell.high);
}

chipRel.querySelectorAll('.chip').forEach((btn) => {
  btn.addEventListener('click', () => selectChip(chipRel, btn.dataset.value));
});
if (chipSecond) {
  chipSecond.querySelectorAll('.chip').forEach((btn) => {
    btn.addEventListener('click', () => selectChip(chipSecond, btn.dataset.value));
  });
}

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
  gtag('event', 'affiliate_cta_click', { link_label: document.querySelector('.aff-title')?.textContent || '' });
});
document.querySelector('.survey-banner a')?.addEventListener('click', () => {
  if (typeof gtag !== 'function') return;
  gtag('event', 'survey_click', {});
});

// 共有URLは、共有ボタンを押したときに作る(入力のたびにアドレスバーを書き換えない。履歴変更によるPVの水増しを避けるため)。
function shareUrl() {
  const params = new URLSearchParams();
  params.set('rel', getChipValue(chipRel));
  if (chipSecond) params.set(SECOND.id, getChipValue(chipSecond));
  return `${location.origin}${location.pathname}?${params.toString()}`;
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

const COPY_LABEL = btnCopyLink.textContent;
btnCopyLink.addEventListener('click', async () => {
  const url = shareUrl();
  const showCopied = () => {
    btnCopyLink.textContent = 'コピーしました✓';
    resultLive.textContent = '結果のURLをコピーしました。';
    setTimeout(() => { btnCopyLink.textContent = COPY_LABEL; }, 2000);
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
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText())}&url=${encodeURIComponent(shareUrl())}`;
  window.open(intentUrl, '_blank', 'noopener');
});
btnShareLine.addEventListener('click', () => {
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl())}&text=${encodeURIComponent(shareText())}`;
  window.open(lineUrl, '_blank', 'noopener');
});

const initialParams = new URLSearchParams(location.search);
function initFromQuery() {
  const rel = initialParams.get('rel');
  if (!Object.prototype.hasOwnProperty.call(REL, rel)) return false;
  setChipActive(chipRel, rel);
  if (chipSecond) {
    const second = initialParams.get(SECOND.id);
    if (Object.prototype.hasOwnProperty.call(SECOND.labels, second)) setChipActive(chipSecond, second);
  }
  calc();
  return true;
}

if (!initFromQuery()) calc();
