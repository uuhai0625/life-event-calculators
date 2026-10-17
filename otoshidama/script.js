// 楽天関連の設定・共通処理は../rakuten-shared.jsに集約。このファイルより先にHTMLで読み込まれる。

let productRequestId = 0;
let productsRequested = false;

// ポチ袋は実売価格が金額に連動しないため、kekkon-kessekiと同型の人気順4件表示(キーワードは固定)。
// 取得は1回だけ(失敗・0件でも打鍵のたびに再取得しない。aff-card(検索リンク)がフォールバックになる)。
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

// 学齢ごとの標準額: インテージ「2026年お年玉調査」(2025年11月、全国15〜79歳5,000人)の「渡す相手の学齢別 1人あたりの金額」で
// 最も多かった金額帯に収まるキリのよい額(帯の上限)。未就学1〜1,000円/小学低学年 2,001〜3,000円/小学高学年・中学生 4,001〜5,000円/高校生・大学等 9,001〜1万円。
// 「控えめ」「多め」は、金額の段階(LADDER)を1つ下げた額・上げた額(当サイトの整理。続柄の傾向は解説記事による)。
// 上限は1万円(出典に書かれた祖父母の額は中高生で1万円まで)。
const LADDER = [1000, 2000, 3000, 5000, 10000];
const GRADES = {
  pre: { label: '未就学児', std: 1000 },
  e13: { label: '小学1〜3年', std: 3000 },
  e46: { label: '小学4〜6年', std: 5000 },
  jh: { label: '中学生', std: 5000 },
  hs: { label: '高校生', std: 10000 },
  uni: { label: '大学・専門・短大生', std: 10000 }
};
const GRADE_KEYS = ['pre', 'e13', 'e46', 'jh', 'hs', 'uni'];
const LEVELS = {
  std:  { label: '標準', shift: 0, advice: '調査で最も多かった金額帯に収まるキリのよい額(帯の上限)を、人数分合計した金額です。甥姪は、この標準が目安です。' },
  low:  { label: '控えめ', shift: -1, advice: 'いとこの子どもには、控えめな金額にするとされます(ヨムーノ編集部)。1段階下の金額は当サイトの整理で、記事に書かれた金額そのものではありません。' },
  high: { label: '多め', shift: 1, advice: '祖父母から孫へは、ほかの続柄より多めにする傾向があるとされます(ヨムーノ編集部、トレンド事務局)。記事に書かれた金額は中高生で1万円までで、1段階上の金額は当サイトの整理です。事前に親と相談しておくと安心です。' },
};
const MAX_COUNT = 20;

function amountFor(key, shift) {
  const i = LADDER.indexOf(GRADES[key].std);
  return LADDER[Math.min(LADDER.length - 1, Math.max(0, i + shift))];
}

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
const chipLevel = document.getElementById('chip-level');
const countError = document.getElementById('count-error');
const inputs = Object.fromEntries(GRADE_KEYS.map((k) => [k, document.getElementById('count-' + k)]));
const copyLabel = btnCopyLink.textContent;
let lastAmountText = '';
let lastBreakdown = '';

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

// 入力値を0〜20の整数に直す。空欄は0。文字が混ざった壊れた入力(badInput)・小数・負数・範囲外は不正。
function readCount(key) {
  const el = inputs[key];
  if (el.validity && el.validity.badInput) return { n: 0, ok: false };
  const raw = el.value.trim();
  if (raw === '') return { n: 0, ok: true };
  if (!/^\d+$/.test(raw)) return { n: 0, ok: false };
  const n = Number(raw);
  return { n, ok: n <= MAX_COUNT };
}

function yenText(n) { return n.toLocaleString('ja-JP'); }

function shareText() {
  return `お年玉の総額の目安を計算しました。\n${lastBreakdown}\n総額の目安:¥${lastAmountText}\n`;
}

// 共有URLは、共有ボタンを押したときに作る(入力のたびにアドレスバーを書き換えない。履歴変更によるPVの水増しを避けるため)。
function shareUrl() {
  const params = new URLSearchParams();
  params.set('level', getChipValue(chipLevel));
  let any = false;
  GRADE_KEYS.forEach((k) => { const r = readCount(k); if (r.ok && r.n > 0) { params.set(k, String(r.n)); any = true; } });
  if (!any) params.set('e13', '0'); // 全員0人でも、復元時に初期値へ戻らないようにする
  return `${location.origin}${location.pathname}?${params.toString()}`;
}

function calc() {
  const level = LEVELS[getChipValue(chipLevel)];
  if (!level) return;
  let valid = true;
  const counts = {};
  const badLabels = [];
  GRADE_KEYS.forEach((k) => {
    const r = readCount(k);
    counts[k] = r.n;
    inputs[k].setAttribute('aria-invalid', r.ok ? 'false' : 'true');
    if (!r.ok) { valid = false; badLabels.push(GRADES[k].label); }
  });
  countError.textContent = valid ? '人数は0〜20の整数で入力してください。' : `${badLabels.join('・')}の人数は、0〜20の整数で入力してください。`;
  countError.classList.toggle('show', !valid);
  if (!valid) { resultCard.classList.remove('show'); return; }

  const people = GRADE_KEYS.reduce((s, k) => s + counts[k], 0);
  const totalAt = (shift) => GRADE_KEYS.reduce((s, k) => s + counts[k] * amountFor(k, shift), 0);
  const total = totalAt(level.shift);
  const low = totalAt(-1);
  const high = totalAt(1);

  resultCard.classList.add('show');
  if (nextTools) nextTools.classList.add('show');
  document.querySelector('.survey-banner')?.classList.add('show');

  if (people === 0) {
    resultLabel.textContent = 'お年玉の総額の目安';
    resultAmount.textContent = '--';
    resultRange.textContent = '';
    resultAdvice.textContent = '渡す相手の人数を、学年ごとに1人以上入力してください。';
    resultBreakdown.textContent = '';
    resultLive.textContent = '渡す相手の人数を入力してください。';
    shareRow.classList.remove('show');
    return;
  }

  const parts = GRADE_KEYS.filter((k) => counts[k] > 0)
    .map((k) => `${GRADES[k].label} ${yenText(amountFor(k, level.shift))}円×${counts[k]}人`);
  lastBreakdown = parts.join('、');
  lastAmountText = yenText(total);

  resultLabel.textContent = `お年玉の総額の目安(${people}人・${level.label})`;
  resultAmount.textContent = yenText(total);
  resultRange.textContent = `目安レンジ(段階表による幅):控えめ ¥${yenText(low)} 〜 多め ¥${yenText(high)}`;
  resultAdvice.textContent = level.advice;
  resultBreakdown.textContent = `内訳: ${lastBreakdown}(標準は、インテージ「2026年お年玉調査」で最も多かった金額帯に収まる額)`;
  resultLive.textContent = `${people}人分のお年玉の総額の目安は、${level.label}で${yenText(total)}円です。`;
  shareRow.classList.add('show');

  if (!productsRequested) {
    productsRequested = true;
    showProducts('ポチ袋 お年玉袋', 'ポチ袋・お年玉袋(レビュー件数順)');
  }
}

chipLevel.querySelectorAll('.chip').forEach((btn) => {
  btn.addEventListener('click', () => selectChip(chipLevel, btn.dataset.value));
});
GRADE_KEYS.forEach((k) => {
  inputs[k].addEventListener('input', calc);
  // 「0」の上に打つと「03」にならないよう、フォーカス時に全選択する。ホイール操作で値が変わる事故も避ける。
  inputs[k].addEventListener('focus', () => inputs[k].select());
  inputs[k].addEventListener('wheel', () => { if (document.activeElement === inputs[k]) inputs[k].blur(); }, { passive: true });
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
  gtag('event', 'affiliate_cta_click', { link_label: 'ポチ袋・お年玉袋を探す' });
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
  const lv = initialParams.get('level');
  const hasCounts = GRADE_KEYS.some((k) => initialParams.has(k));
  if (!Object.prototype.hasOwnProperty.call(LEVELS, lv) && !hasCounts) return false;
  if (Object.prototype.hasOwnProperty.call(LEVELS, lv)) setChipActive(chipLevel, lv);
  if (hasCounts) {
    GRADE_KEYS.forEach((k) => {
      const v = initialParams.get(k);
      inputs[k].value = v !== null && /^\d{1,2}$/.test(v) && Number(v) <= MAX_COUNT ? String(Number(v)) : '0';
    });
  }
  calc();
  return true;
}

if (!initFromQuery()) calc();
