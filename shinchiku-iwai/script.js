// 楽天関連の設定・共通処理は../rakuten-shared.jsに集約。このファイルより先にHTMLで読み込まれる。
// 新築祝い(2026-10-17新設)。公的な統計・業界団体の調査は見つかっておらず、金額は百貨店(高島屋・三越伊勢丹)・楽天おくりものナビ・CREXほかの解説記事の目安を当サイトで整理した範囲。受け取った側の実績はGIFTFUL(n=200・時期不明・関係別nは非公開)だけで、親から子への最多額(1万円)は目安(5万〜10万円)と大きく離れる。取引先は出典が見つからず入れていない。

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
const NOUN = "新築祝い";
const PRODUCT_KEYWORD = "新築祝い ギフト";
const PRODUCT_LABEL = "新築祝いの品(レビュー件数順)";
const REL = {
  "parent": {
    "label": "親へ(子から)",
    "src": "三越伊勢丹・楽天おくりものナビ・CREXほかの解説記事",
    "advice": "親への新築祝いは、楽天おくりものナビが5万〜10万円、三越伊勢丹が親子・兄弟姉妹をまとめて3万〜10万円、CREXが3万〜10万円以上としています。現金を渡す方法のほか、品物やカタログギフトを選ぶ場合もあります。",
    "amounts": {
      "*": {
        "low": 30000,
        "high": 100000,
        "bandLow": 30000,
        "bandHigh": 100000,
        "text": "30,000〜¥100,000",
        "live": "30,000円から100,000円",
        "note": "5万〜10万円とする記事が多い(楽天おくりものナビ)。受け取った側の調査は「親から子へ」だけです"
      }
    }
  },
  "child": {
    "label": "子へ(親から)",
    "src": "高島屋ストーリー・三越伊勢丹・CREXほかの解説記事と、GIFTFULの調査",
    "advice": "子への新築祝いは、高島屋ストーリーが5万〜10万円、三越伊勢丹が親子をまとめて3万〜10万円としています。ただし、新築祝いをもらったことがある200名への調査(GIFTFUL)では、親から子への額は平均22,020円・最多10,000円で、目安と大きく離れています。",
    "amounts": {
      "*": {
        "low": 30000,
        "high": 100000,
        "bandLow": 30000,
        "bandHigh": 100000,
        "text": "30,000〜¥100,000",
        "live": "30,000円から100,000円",
        "note": "もらった側の調査(n=200)では、平均22,020円・最多10,000円で、目安より低めです。家庭の事情で幅が大きい区分です"
      }
    }
  },
  "sibling": {
    "label": "兄弟姉妹",
    "src": "楽天おくりものナビ・CREX・iekatsuほかの解説記事と、GIFTFULの調査",
    "advice": "兄弟姉妹への新築祝いは、記事によって幅が大きくなっています。楽天おくりものナビは1万〜3万円、CREXは1万〜5万円、iekatsuは3万〜5万円(20〜30代前半は1万〜2万円でもよいとする)、高島屋ストーリーは5,000円〜3万円、三越伊勢丹は親子とまとめて3万〜10万円としています。",
    "amounts": {
      "*": {
        "low": 10000,
        "high": 30000,
        "text": "10,000〜¥30,000",
        "live": "10,000円から30,000円",
        "note": "1万〜3万円は楽天おくりものナビの値で、記事により幅が大きい。もらった側の調査(兄弟・姉妹・親戚まとめ)は平均17,519円・最多10,000円"
      }
    }
  },
  "relative": {
    "label": "親戚",
    "src": "三越伊勢丹・楽天おくりものナビ・CREX・iekatsuほかの解説記事",
    "advice": "親戚への新築祝いは、1万〜3万円とする記事が一致しています(三越伊勢丹・楽天おくりものナビ・CREXほか)。親しさや、普段の付き合いの深さで調整します。",
    "amounts": {
      "*": {
        "low": 10000,
        "high": 30000,
        "text": "10,000〜¥30,000",
        "live": "10,000円から30,000円",
        "note": "もらった側の調査(兄弟・姉妹・親戚まとめ)は平均17,519円・最多10,000円"
      }
    }
  },
  "friend": {
    "label": "友人",
    "src": "高島屋・三越伊勢丹・楽天おくりものナビ・CREXほかの解説記事と、GIFTFULの調査",
    "advice": "友人への新築祝いは、5,000円〜1万円が目安です(楽天おくりものナビ・CREX)。三越伊勢丹は3,000円〜1万円(ママ友は2,000〜3,000円でも可)、高島屋ストーリーは数千円〜1万円としています。",
    "amounts": {
      "*": {
        "low": 5000,
        "high": 10000,
        "text": "5,000〜¥10,000",
        "live": "5,000円から10,000円",
        "note": "もらった側の調査(n=200)では、友人からは平均13,647円・最多10,000円"
      }
    }
  },
  "colleague": {
    "label": "職場の同僚・上司",
    "src": "三越伊勢丹・楽天おくりものナビ・CREX・iekatsuほかの解説記事と、GIFTFULの調査",
    "advice": "職場の人への新築祝いは、同僚で5,000円〜1万円が目安です(三越伊勢丹・楽天おくりものナビ・iekatsuは上司も5,000円〜1万円)。CREXは上司や取引先などの目上を1万〜3万円としています。連名で贈る場合は、1人あたり1,000〜3,000円程度とする記事があります(CREX・iekatsu・GIFTFUL)。目上の方への現金・商品券は失礼にあたるとする記事もあります(CREX)。",
    "amounts": {
      "*": {
        "low": 5000,
        "high": 10000,
        "text": "5,000〜¥10,000",
        "live": "5,000円から10,000円",
        "note": "上司は1万〜3万円とする記事も(CREXのみ)。もらった側の調査(同僚・上司・部下)は平均9,487円・最多5,000円"
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
