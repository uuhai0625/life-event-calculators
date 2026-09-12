// 楽天関連の設定・共通処理(RAKUTEN_AFFILIATE_ID・affiliateUrl()・RAKUTEN_APP_ID等・
// fetchRakutenProducts())は../rakuten-shared.jsに集約(2026-09-01、9ファイル個別ハードコード
// だったものを1箇所化)。このファイルより先にHTMLで読み込まれる。

// 連打・素早い選択変更で複数のAPIリクエストが同時に飛んだ場合、後から返ってきたはずの古いレスポンスが
// 新しい選択結果を上書きしてしまうレース状態を防ぐためのリクエストID(2026-08-11)。
let productRequestId = 0;

// 価格帯別比較は導入しない(2026-08-15訂正): ご祝儀袋・香典袋は封筒自体の実売価格が¥1,000前後に
// 集中しており、中に包む金額(数万円〜十数万円)とは無関係。価格帯を贈答金額に連動させると、
// 高額な結果(例: 親への香典10万円台)でその価格帯に商品が存在せずカードが消える、または
// 無関係な高額商品(バッグ等)が価格つじつま合わせで表示される不具合が実機検証で判明したため、
// このページのみ元の「人気順4件をそのまま表示」に戻す(他3ページの出産祝い/結婚祝い/プレゼントは
// 実際の贈り物価格が金額に連動するため価格帯比較のままでよい)。
async function showProducts(keyword, labelText) {
  const grid = document.getElementById('product-grid');
  const label = document.getElementById('product-grid-label');
  if (!grid) return;
  const requestId = ++productRequestId;
  grid.innerHTML = '';
  // CLS対策(2026-09-01): 商品カード取得中も枠を表示状態にしてmin-heightで高さを確保し、
  // 結果が届いた瞬間に高さがゼロから一気に広がって下の要素が押し下げられる体感を緩和する。
  grid.classList.add('show');
  if (label) label.style.display = 'none';
  try {
    const items = await fetchRakutenProducts(keyword, 4, null, null);
    if (requestId !== productRequestId) return;
    if (!items.length) { grid.classList.remove('show'); return; }
    // 2列グリッド表示に統一(2026-08-15): 他4ページ(価格帯別showProducts)はproduct-band-gridで
    // 2列コンパクト表示なのに対し、このページだけproduct-grid直下に並べていたため全幅縦積みになっていた
    // (デザインレビューで発覚した不整合)。同じCSSクラスを再利用して2列グリッドに揃える。
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

// ageTier補正倍率(近い関係=scalableな項目にのみ適用)
const AGE_MULTIPLIER = { '20s': 0.9, '30s': 1.0, '40s': 1.6, '50s': 2.0 };

const RELATIONS = {
  wedding: [
    { value: 'friend',   label: '友人・知人',              base: 30000, scalable: false },
    { value: 'colleague', label: '職場の同僚・部下',        base: 30000, scalable: false },
    { value: 'boss',      label: '職場の上司',              base: 30000, scalable: false },
    { value: 'cousin',    label: 'いとこなどの親族',          base: 30000, scalable: false },
    { value: 'uncle_aunt', label: '叔父叔母',                base: 50000, scalable: true },
    { value: 'sibling',   label: '兄弟姉妹',                base: 50000, scalable: true },
    { value: 'grandchild', label: '祖父母(孫の立場から)',    base: 70000, scalable: true },
    { value: 'child',     label: '自分の子ども(親の立場から)', base: 100000, scalable: true },
  ],
  funeral: [
    { value: 'neighbor',  label: 'ご近所',                  base: 3000,  scalable: false },
    { value: 'friend',    label: '友人・知人',                base: 5000,  scalable: false },
    { value: 'colleague', label: '職場の同僚・部下',          base: 5000,  scalable: false },
    { value: 'boss',      label: '職場の上司',                base: 5000,  scalable: false },
    { value: 'relative',  label: 'いとこ・叔父叔母などの親族', base: 10000, scalable: true },
    { value: 'grandparent', label: '祖父母',                 base: 10000, scalable: true },
    { value: 'sibling',   label: '兄弟姉妹',                  base: 30000, scalable: true },
    { value: 'parent',    label: '親',                       base: 50000, scalable: true },
  ],
};

const ADVICE = {
  wedding: {
    present: '結婚式に出席する場合の目安です。会場やご祝儀相場は地域差が大きいため、同世代の親族・友人と事前にすり合わせておくと安心です。',
    absent: '欠席する場合は、出席時の3割程度を目安にお祝い金として贈るか、贈り物やメッセージを添えるのが一般的です。',
  },
  funeral: {
    base: '通夜・葬儀に参列する場合の目安です。',
    meal: '会食(通夜振る舞い・お斎)にも参加されるため、少し多めの金額を上乗せしています。',
  },
};

let currentScene = 'wedding';

const chipRelation = document.getElementById('chip-relation');
const chipAge = document.getElementById('chip-age');
const fieldWeddingAttend = document.getElementById('field-wedding-attend');
const fieldFuneralMeal = document.getElementById('field-funeral-meal');
const resultCard = document.getElementById('result-card');
const resultLabel = document.getElementById('result-label');
const resultAmount = document.getElementById('result-amount');
const resultRange = document.getElementById('result-range');
const resultAdvice = document.getElementById('result-advice');
const resultBreakdown = document.getElementById('result-breakdown');
const affCard = document.getElementById('aff-card');
const affIcon = document.getElementById('aff-icon');
const affTitle = document.getElementById('aff-title');
const mannerWedding = document.getElementById('manner-wedding');
const mannerFuneral = document.getElementById('manner-funeral');
const regionWedding = document.getElementById('region-wedding');
const regionFuneral = document.getElementById('region-funeral');
const rateTableWedding = document.getElementById('rate-table-wedding');
const rateTableFuneral = document.getElementById('rate-table-funeral');
const calcPanel = document.getElementById('calc-panel');
const shareRow = document.getElementById('share-row');
const nextTools = document.querySelector('.next-tools');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
const btnShareLine = document.getElementById('btn-share-line');
const followX = document.getElementById('follow-x');
let lastAmount = 0;

// ---- チップ選択(2026-09-12、took.jp型UX: ドロップダウン+計算ボタンをやめ、
// ボタンチップをクリックした瞬間に結果が更新される方式に変更) ----
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

function populateRelations() {
  // タブ切替(慶事⇔弔事)で選び直した間柄が消えないよう、同じvalueが新しいシーンにもあれば維持する。
  const previousValue = getChipValue(chipRelation);
  chipRelation.innerHTML = '';
  RELATIONS[currentScene].forEach((r) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.dataset.value = r.value;
    btn.textContent = r.label;
    btn.addEventListener('click', () => selectChip(chipRelation, r.value));
    chipRelation.appendChild(btn);
  });
  const hasPrevious = RELATIONS[currentScene].some((r) => r.value === previousValue);
  setChipActive(chipRelation, hasPrevious ? previousValue : RELATIONS[currentScene][0].value);
}

function setScene(scene) {
  currentScene = scene;
  document.querySelectorAll('.scene-tab').forEach((btn) => {
    const isActive = btn.dataset.scene === scene;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
    if (isActive) calcPanel.setAttribute('aria-labelledby', btn.id);
  });
  fieldWeddingAttend.style.display = scene === 'wedding' ? '' : 'none';
  fieldFuneralMeal.style.display = scene === 'funeral' ? '' : 'none';
  document.body.classList.toggle('theme-solemn', scene === 'funeral');
  populateRelations();
  rateTableWedding.classList.toggle('show', scene === 'wedding');
  rateTableFuneral.classList.toggle('show', scene === 'funeral');
  const grid = document.getElementById('product-grid');
  const gridLabel = document.getElementById('product-grid-label');
  if (grid) { grid.innerHTML = ''; grid.classList.remove('show'); }
  if (gridLabel) gridLabel.style.display = 'none';

  // 祝儀袋/香典袋ジャンルの人気ランキング(2026-09-06追加)。計算結果とは独立した固定コンテンツのため
  // シーン切替時に即座に切り替える。
  const rankingLabel = document.getElementById('ranking-grid-label');
  if (rankingLabel) rankingLabel.textContent = scene === 'wedding' ? '🏆 楽天市場「祝儀袋」ジャンルの人気ランキング' : '🏆 楽天市場「香典袋」ジャンルの人気ランキング';
  showRanking(scene === 'wedding' ? 210194 : 567467, 'ranking-grid');

  // took.jp型UX: タブ切替直後にその場で再計算し、結果を即座に更新する(計算ボタン・待機なし)。
  calc();
}

function roundTo(amount, step) {
  return Math.round(amount / step) * step;
}

function calc() {
  const relationValue = getChipValue(chipRelation);
  const ageTier = getChipValue(chipAge);
  const config = RELATIONS[currentScene].find((r) => r.value === relationValue);
  if (!config) return;

  let amount = config.base;
  if (config.scalable) {
    amount = roundTo(config.base * AGE_MULTIPLIER[ageTier], 1000);
  }

  let adviceText = '';

  if (currentScene === 'wedding') {
    const attend = document.querySelector('input[name="attend"]:checked').value;
    if (attend === 'absent') {
      amount = Math.max(10000, roundTo(amount * 0.35, 5000));
      adviceText = ADVICE.wedding.absent;
    } else {
      adviceText = ADVICE.wedding.present;
    }
  } else {
    const meal = document.querySelector('input[name="meal"]:checked').value;
    adviceText = ADVICE.funeral.base;
    if (meal === 'yes') {
      amount += 5000;
      adviceText += ' ' + ADVICE.funeral.meal;
    }
  }

  const rangeLow = Math.max(1000, roundTo(amount * 0.8, 1000));
  const rangeHigh = roundTo(amount * 1.2, 1000);

  resultLabel.textContent = currentScene === 'wedding' ? 'ご祝儀の目安' : '香典の目安';
  resultAmount.textContent = amount.toLocaleString('ja-JP');
  resultRange.textContent = `目安レンジ:¥${rangeLow.toLocaleString('ja-JP')} 〜 ¥${rangeHigh.toLocaleString('ja-JP')}`;
  resultAdvice.textContent = adviceText;
  resultBreakdown.textContent = config.scalable
    ? `内訳の目安: ${config.label}の基準額¥${config.base.toLocaleString('ja-JP')} × 年代係数${AGE_MULTIPLIER[ageTier]}`
    : `内訳の目安: ${config.label}の基準額¥${config.base.toLocaleString('ja-JP')}`;
  resultCard.classList.add('show');
  if (nextTools) nextTools.classList.add('show');
  lastAmount = amount;
  updateShareUrl();
  shareRow.classList.add('show');
  btnShareX.style.display = currentScene === 'wedding' ? '' : 'none';
  btnShareLine.style.display = currentScene === 'wedding' ? '' : 'none';
  if (followX) followX.style.display = currentScene === 'wedding' ? '' : 'none';

  let productKeyword;
  if (currentScene === 'wedding') {
    affIcon.textContent = '🎁';
    affTitle.textContent = 'ご祝儀袋を探す';
    affCard.href = affiliateUrl('ご祝儀袋');
    mannerWedding.classList.add('show');
    mannerFuneral.classList.remove('show');
    regionWedding.classList.add('show');
    regionFuneral.classList.remove('show');
    productKeyword = 'ご祝儀袋';
  } else {
    affIcon.textContent = '🖤';
    affTitle.textContent = '不祝儀袋(香典袋)を探す';
    affCard.href = affiliateUrl('不祝儀袋 香典袋');
    mannerFuneral.classList.add('show');
    mannerWedding.classList.remove('show');
    regionFuneral.classList.add('show');
    regionWedding.classList.remove('show');
    productKeyword = '不祝儀袋';
  }
  affCard.classList.add('show');
  document.querySelector('.survey-banner')?.classList.add('show');
  const productLabel = currentScene === 'wedding' ? '🛒 人気のご祝儀袋' : '不祝儀袋(香典袋)';
  showProducts(productKeyword, productLabel);
}

document.querySelectorAll('.scene-tab').forEach((btn) => {
  btn.addEventListener('click', () => setScene(btn.dataset.scene));
});
document.querySelectorAll('#chip-age .chip').forEach((btn) => {
  btn.addEventListener('click', () => selectChip(chipAge, btn.dataset.value));
});
document.querySelectorAll('input[name="attend"], input[name="meal"]').forEach((input) => {
  input.addEventListener('change', calc);
});

// GA4クリック計測(2026-08-15追加)
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
  gtag('event', 'affiliate_cta_click', {
    link_label: document.querySelector('.aff-title')?.textContent || '',
  });
});
document.querySelector('.survey-banner a')?.addEventListener('click', () => {
  if (typeof gtag !== 'function') return;
  gtag('event', 'survey_click', {});
});

// 結果の共有機能(2026-08-14): 現在の入力状態をURLクエリに保持し、結果ページを直接共有できるようにする。
function paramsFromState() {
  const params = new URLSearchParams();
  params.set('scene', currentScene);
  params.set('relation', getChipValue(chipRelation));
  params.set('age', getChipValue(chipAge));
  if (currentScene === 'wedding') {
    params.set('attend', document.querySelector('input[name="attend"]:checked').value);
  } else {
    params.set('meal', document.querySelector('input[name="meal"]:checked').value);
  }
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function shareText(amount) {
  const relationLabel = (RELATIONS[currentScene].find((r) => r.value === getChipValue(chipRelation)) || {}).label || '';
  const sceneLabel = currentScene === 'wedding' ? 'ご祝儀' : '香典';
  return `${relationLabel}への${sceneLabel}の相場を計算しました。\n目安:¥${amount.toLocaleString('ja-JP')}\n`;
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

// 共有URLからの復元: 条件が有効な場合のみ反映する(不正・不完全なクエリは通常表示にフォールバック)。
// 2026-09-12、took.jp型UXでsetScene()自体がcalc()→updateShareUrl()を呼ぶようになったため、
// 初回のsetScene('wedding')実行時点でURLクエリがデフォルト値に上書きされてしまうバグが発覚。
// ページ読み込み直後の「本来のクエリ」を先に退避しておき、そちらを読む。
const initialParams = new URLSearchParams(location.search);
function initFromQuery() {
  const params = initialParams;
  const scene = params.get('scene');
  if (scene !== 'wedding' && scene !== 'funeral') return;
  setScene(scene);
  const relation = params.get('relation');
  if (relation && RELATIONS[scene].some((r) => r.value === relation)) setChipActive(chipRelation, relation);
  const age = params.get('age');
  if (age && AGE_MULTIPLIER[age]) setChipActive(chipAge, age);
  if (scene === 'wedding') {
    const attend = params.get('attend');
    if (attend === 'present' || attend === 'absent') {
      document.querySelector(`input[name="attend"][value="${attend}"]`).checked = true;
    }
  } else {
    const meal = params.get('meal');
    if (meal === 'yes' || meal === 'no') {
      document.querySelector(`input[name="meal"][value="${meal}"]`).checked = true;
    }
  }
  calc();
}

setScene('wedding');
initFromQuery();
