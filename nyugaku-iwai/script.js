// 楽天関連の設定・共通処理は../rakuten-shared.jsに集約。このファイルより先にHTMLで読み込まれる。
// 入学祝い(2026-10-17新設)。公的な統計は見つかっておらず、孫への平均予算(ocruyo 2025・n=1,956)だけが調査。そのほかは解説記事の目安(ヨムーノ・エネチェンジ・All About・Oggi・HugKum)を当サイトで整理した範囲。出典が実質1本の区分は各セルのnoteに明記。

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
const NOUN = "入学祝い";
const PRODUCT_KEYWORD = "入学祝い ギフト";
const PRODUCT_LABEL = "入学祝いの品(レビュー件数順)";
const REL = {
  "grandchild": {
    "label": "孫(祖父母から)",
    "src": "ocruyoの調査と、ヨムーノ・エネチェンジの解説記事",
    "advice": "孫への入学祝いは、学校が上がるほど高くなる傾向があります。孫や親戚への入学祝いで贈るものは現金が最多で、調査(ocruyo、2025年1月・n=1,956)では小学校で45.6%、中学〜大学で57.1%でした。",
    "amounts": {
      "elem": {
        "low": 10000,
        "high": 30000,
        "text": "10,000〜¥30,000",
        "live": "10,000円から30,000円",
        "note": "調査の孫への平均予算は14,346円。記事は1万〜3万円(ヨムーノ・エネチェンジ)"
      },
      "junior": {
        "low": 10000,
        "high": 30000,
        "text": "10,000〜¥30,000",
        "live": "10,000円から30,000円",
        "note": "調査の孫への平均予算は16,886円。記事は2万〜3万円(ヨムーノ)・1万〜3万円(エネチェンジ)"
      },
      "high": {
        "low": 20000,
        "high": 30000,
        "text": "20,000〜¥30,000",
        "live": "20,000円から30,000円",
        "note": "調査の孫への平均予算は22,094円。記事は3万〜5万円(ヨムーノ)・1万〜3万円(エネチェンジ)で、当サイトの整理です"
      },
      "univ": {
        "low": 30000,
        "high": 50000,
        "text": "30,000〜¥50,000",
        "live": "30,000円から50,000円",
        "note": "調査の孫への平均予算は30,241円。ヨムーノは5万〜10万円、エネチェンジは1万〜3万円と記事で幅が大きく、10万円までとする記事もあります(当サイトの整理)"
      }
    }
  },
  "nephew": {
    "label": "甥・姪(おじ・おばから)",
    "src": "All About・ヨムーノ・Oggi・HugKumの解説記事",
    "advice": "甥・姪への入学祝いは、小学校の5,000円〜1万円から、大学の1万〜3万円へ上がるのが一般的な目安です。HugKum(小学館)の調査(2025年2月・7〜12歳の子の親 n=120)では、親戚からもらった額は5,001〜10,000円が最多で、次いで1万超〜3万円でした(「もらっていない」は48.3%)。",
    "amounts": {
      "elem": {
        "low": 5000,
        "high": 10000,
        "text": "5,000〜¥10,000",
        "live": "5,000円から10,000円",
        "note": "記事は5千〜1万円(All About・Oggi・ヨムーノ)。エネチェンジは3千〜5千円"
      },
      "junior": {
        "low": 10000,
        "high": 10000,
        "text": "10,000",
        "live": "10,000円前後",
        "note": "記事は1万円(All About・ヨムーノ)。エネチェンジは小中学校の親戚を3千〜5千円"
      },
      "high": {
        "low": 10000,
        "high": 20000,
        "text": "10,000〜¥20,000",
        "live": "10,000円から20,000円",
        "note": "All Aboutは1万〜2万円。ヨムーノは親戚の項で1万〜2万円、甥・姪の項では2万〜3万円。エネチェンジは1万〜3万円"
      },
      "univ": {
        "low": 10000,
        "high": 30000,
        "text": "10,000〜¥30,000",
        "live": "10,000円から30,000円",
        "note": "All Aboutは2万〜3万円。ヨムーノは親戚の項で1万〜3万円、甥・姪の項では2万〜3万円。エネチェンジは1万〜3万円"
      }
    }
  },
  "friendchild": {
    "label": "友人・知人の子",
    "src": "HugKum・Oggi・ヨムーノ・All Aboutの解説記事",
    "advice": "友人・知人の子への入学祝いは、学校による違いを示す出典が見つかっていません(OggiとAll Aboutは小学校の入学祝いについての記載です)。HugKumとOggi(いずれも小学館)は3,000〜5,000円、ヨムーノは3,000〜5,000円(親友のような特別な間柄でも1万円まで)、All Aboutは3,000円程度としています。",
    "amounts": {
      "*": {
        "low": 3000,
        "high": 5000,
        "text": "3,000〜¥5,000",
        "live": "3,000円から5,000円",
        "note": "ヨムーノは特別な間柄で1万円まで。学校による違いを示す出典はありません"
      }
    }
  }
};
const SECOND = {"id": "school", "labels": {"elem": "小学校", "junior": "中学校", "high": "高校", "univ": "大学"}}; // 2つ目のチップ(例: 学校)。無ければ null。{ id, labels: {value: label} }

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
