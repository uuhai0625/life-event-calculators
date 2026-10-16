// 楽天関連の設定・共通処理は../rakuten-shared.jsに集約。このファイルより先にHTMLで読み込まれる。
// 成人祝い(2026-10-17新設)。公的な統計は見つかっておらず、金額は解説記事の目安(よみものTHE GIFT・Financial Field・子供のお祝い.comほか)を当サイトで整理した範囲。実測は日本郵便ネットショップ(ギフト総合研究所)の20代400名調査だけで、間柄別の回答数は非公開。兄・姉から弟・妹は出典間で食い違う。

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
const NOUN = "成人祝い";
const PRODUCT_KEYWORD = "成人祝い ギフト";
const PRODUCT_LABEL = "成人祝いの品(レビュー件数順)";
const REL = {
  "parent": {
    "label": "親から子",
    "src": "解説記事と、日本郵便ネットショップ(ギフト総合研究所)の調査",
    "advice": "親から子への成人祝いは、1万〜5万円が多くの解説記事の目安です。成人祝いをもらった20代400名への調査(ギフト総合研究所、日本郵便ネットショップ掲載)では、父母からの額は「〜1万円」が32.2%で最多、「〜3万円」が27.1%、「〜5万円」が14.0%でした(詳細は原文をご確認ください)。振袖などの費用を出し、お祝いの代わりにする家庭も多いとされています。",
    "amounts": {
      "*": {
        "low": 10000,
        "high": 50000,
        "text": "10,000〜¥50,000",
        "live": "10,000円から50,000円",
        "note": "もらった側の調査では「〜1万円」が最多(32.2%)で、目安のレンジの下側に寄っています"
      }
    }
  },
  "grandparent": {
    "label": "祖父母から孫",
    "src": "解説記事と、日本郵便ネットショップ(ギフト総合研究所)の調査",
    "advice": "祖父母から孫への成人祝いは、1万〜10万円と幅広い目安です。同じ調査では、祖父母からの額は「〜3万円」が24.6%で最多ですが、「〜5万円」17.9%、「〜10万円」19.0%、「10万円超」14.5%と分散しています。",
    "amounts": {
      "*": {
        "low": 10000,
        "high": 100000,
        "bandLow": 10000,
        "bandHigh": 50000,
        "text": "10,000〜¥100,000",
        "live": "10,000円から100,000円",
        "note": "記事は1万〜10万円と幅広く、家庭差が大きい区分です。もらった側の調査では「〜3万円」が最多(24.6%)ですが、5万円超も合計で約3割あります"
      }
    }
  },
  "uncle": {
    "label": "おじ・おばから甥・姪",
    "src": "解説記事と、日本郵便ネットショップ(ギフト総合研究所)の調査",
    "advice": "おじ・おばから甥・姪への成人祝いは、1万〜3万円が多くの解説記事の目安です。調査では、近しい親せきからの額は「〜1万円」が37.9%で最多、「〜3万円」が25.3%でした。",
    "amounts": {
      "*": {
        "low": 10000,
        "high": 30000,
        "text": "10,000〜¥30,000",
        "live": "10,000円から30,000円",
        "note": "もらった側の調査では「〜1万円」が最多(37.9%)。近しい親せきとしての回答です"
      }
    }
  },
  "sibling": {
    "label": "兄・姉から弟・妹",
    "src": "子供のお祝い.com(確認できた出典は1本のみ)",
    "advice": "兄・姉から弟・妹への成人祝いは、確認できた出典が子供のお祝い.comの1万〜5万円(同サイトは書籍の内容を紹介する記事)だけで、ほかの記事は見つかっていません。きょうだいで金額をそろえる、または親と相談するのが確実です。",
    "amounts": {
      "*": {
        "low": 10000,
        "high": 50000,
        "text": "10,000〜¥50,000",
        "live": "10,000円から50,000円",
        "note": "確認できた出典は子供のお祝い.comの1万〜5万円のみです。ほかの記事は見つかっていません"
      }
    }
  },
  "friendchild": {
    "label": "友人・知人の子",
    "src": "解説記事(同じ数字を示す記事が多い)",
    "advice": "友人・知人の子への成人祝いは、5,000円〜1万円が目安で、同じ数字を示す解説記事が多くあります。日本郵便ネットショップの調査の「友人・先輩後輩」からの額は、割合の刻みから回答が約18名と推定され、「友人の子」への額でもないため参考にしません。",
    "amounts": {
      "*": {
        "low": 5000,
        "high": 10000,
        "text": "5,000〜¥10,000",
        "live": "5,000円から10,000円",
        "note": "同じ数字を示す記事が多く、独立した裏付けではありません"
      }
    }
  }
};
const SECOND = null; // 2つ目のチップ(例: 学校)。無ければ null。{ id, labels: {value: label} }

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
  return `${lastLabel}の相場を計算しました。\n目安:¥${lastAmountText}\n`;
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
  resultBreakdown.textContent = `出典: ${cell.src || rel.src}(公的な統計ではありません)`;
  resultCard.classList.add('show');
  if (nextTools) nextTools.classList.add('show');
  lastAmountText = cell.text;
  lastLabel = label + 'への' + NOUN;
  updateShareUrl();
  shareRow.classList.add('show');
  document.querySelector('.survey-banner')?.classList.add('show');

  affCard.href = affiliateUrl(PRODUCT_KEYWORD);
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

function paramsFromState() {
  const params = new URLSearchParams();
  params.set('rel', getChipValue(chipRel));
  if (chipSecond) params.set(SECOND.id, getChipValue(chipSecond));
  return params;
}

function updateShareUrl() {
  history.replaceState(null, '', `${location.pathname}?${paramsFromState().toString()}${location.hash}`);
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
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText())}&url=${encodeURIComponent(location.href)}`;
  window.open(intentUrl, '_blank', 'noopener');
});
btnShareLine.addEventListener('click', () => {
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(location.href)}&text=${encodeURIComponent(shareText())}`;
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
