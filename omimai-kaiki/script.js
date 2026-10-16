// 楽天関連の設定・共通処理は../rakuten-shared.jsに集約(2026-09-01)。このファイルより先にHTMLで読み込まれる。
// 快気祝い(お返し)の品探しと日付は../return-gift.js(data-kind="recovery")が担当する。

let productRequestId = 0;
let productsRequested = false;

// 封筒(のし袋)は実売価格が金額に連動しないため、koden-shokubaと同型の人気順4件表示(キーワードは固定)。
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

// お見舞い(2026-10-17新設)。公的な統計は見つかっておらず、解説記事の慣習的な目安。
//   Moocota「お見舞金の相場」(2024年12月掲載、監修の記載なし): 両親・義父母10,000〜30,000(10,000か30,000)、兄弟姉妹5,000〜10,000(相場10,000)、
//     親戚5,000〜10,000(学生3,000)、子・孫5,000〜10,000(相場10,000)、友人3,000〜5,000、上司は見舞品3,000〜10,000相当(現金は失礼になる傾向)、
//     同僚・部下3,000〜5,000(現在は見舞品が主流)、取引先 担当者3,000〜10,000(相場10,000)・役職付き10,000〜30,000・社長10,000〜50,000。
//   All About「お見舞いの金額・マナー」(2023年11月更新): 全体3,000〜10,000、友人5,000、親戚5,000〜10,000、会社関連は有志で1人3,000。目上への現金は避け商品券・ギフトカード。
// 区分が細かいのはMoocotaの1記事。単独出典の区分は advice に「Moocotaのみ」と明記し、早見表にも同じ注記を入れる。
const RELATIONS = {
  parent: {
    label: '両親・義父母', form: 'cash', text: '10,000〜¥30,000', typical: '10,000円または30,000円', src: 'Moocotaの解説記事',
    live: '10,000円から30,000円',
    advice: '両親・義父母へのお見舞い金は、10,000円か30,000円のどちらかにするのが一般的とされています(Moocota)。2万円のような半端な額より、区切りのよい額が選ばれます。両親・義父母、兄弟姉妹、親戚、子・孫には、現金が一般的とされています。',
  },
  sibling: {
    label: '兄弟姉妹', form: 'cash', text: '5,000〜¥10,000', typical: '10,000円', src: 'Moocotaの解説記事のみ',
    live: '5,000円から10,000円',
    advice: '兄弟姉妹へは5,000〜10,000円で、10,000円が相場とされています(Moocotaの解説記事のみ。All Aboutは兄弟姉妹の区分を立てておらず、親戚を5,000〜10,000円としています)。',
  },
  relative: {
    label: '親戚', form: 'cash', text: '5,000〜¥10,000', typical: '', src: 'MoocotaとAll Aboutの解説記事',
    live: '5,000円から10,000円',
    advice: '親戚へは5,000〜10,000円が目安です(MoocotaとAll Aboutの両方)。Moocotaでは、学生は3,000円とされています。',
  },
  child: {
    label: '子・孫', form: 'cash', text: '5,000〜¥10,000', typical: '10,000円', src: 'Moocotaの解説記事のみ',
    live: '5,000円から10,000円',
    advice: '子・孫へは5,000〜10,000円で、10,000円が相場とされています(Moocotaの解説記事のみ)。',
  },
  friend: {
    label: '友人・知人', form: 'either', text: '3,000〜¥5,000', typical: '', src: 'MoocotaとAll Aboutの解説記事',
    live: '3,000円から5,000円',
    advice: '友人・知人へは3,000〜5,000円が目安です(Moocotaは3,000〜5,000円、All Aboutは5,000円)。Moocotaでは、現金より見舞品(3,000〜5,000円相当)がよいとされ、現金は保険がきかない病気などの場合に限るのが望ましいとされています。',
  },
  boss: {
    label: '職場の上司', form: 'goods', text: '3,000〜¥10,000', typical: '', src: 'MoocotaとAll Aboutの解説記事',
    live: '3,000円から10,000円相当',
    advice: '上司など目上の方への現金は避けるのが一般的です。見舞品なら3,000〜10,000円相当が目安です(Moocota)。現金にする場合は商品券やギフトカードにし、「お好みの品がわからなかったので」などの一言を添えます(All About。2009年更新の別の記事では、親しい間柄なら現金も問題ないとされています)。',
  },
  colleague: {
    label: '職場の同僚・部下', form: 'goods', text: '3,000〜¥5,000', typical: '', src: 'MoocotaとAll Aboutの解説記事',
    live: '3,000円から5,000円相当',
    advice: '同僚・部下へは、現金より見舞品が主流で、3,000〜5,000円程度が目安とされています(Moocota)。現金を禁じる会社もあるため、会社の総務や先輩に確認すると安心です。有志でまとめる場合は、1人3,000円程度とされています(All About)。',
  },
  client: {
    label: '取引先の担当者', form: 'cash', text: '3,000〜¥10,000', typical: '10,000円', src: 'Moocotaの解説記事のみ',
    live: '3,000円から10,000円',
    advice: '取引先の担当者へは、相場は10,000円で、社内規定の範囲は3,000〜10,000円とされています(Moocotaの解説記事のみ)。取引先を「通常」と「重要」に分けて上限・下限を決める会社が多く、重要でない取引先は3,000円とされます。役職付き・社長は30,000円が相場です。会社間のことなので、個人で渡す場合は上司に相談するとよいとされています。',
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
let lastAmountText = '';
let lastLabel = '';
let lastForm = 'cash';

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
  return `${lastLabel}へのお見舞い${lastForm === 'goods' ? '(見舞品の相当額)' : ''}の相場を計算しました。\n目安:¥${lastAmountText}\n`;
}

function calc() {
  const rel = RELATIONS[getChipValue(chipRel)];
  if (!rel) return;
  const goods = rel.form === 'goods';
  const either = rel.form === 'either';

  resultLabel.textContent = `${rel.label}へのお見舞い${goods ? '(見舞品の相当額)' : either ? '(見舞品または現金)' : ''}の目安`;
  resultAmount.textContent = rel.text;
  resultRange.textContent = `出典: ${rel.src}。` + (rel.typical ? `記事での相場表記: ${rel.typical}` : '');
  resultAdvice.textContent = rel.advice;
  resultLive.textContent = `${rel.label}へのお見舞い${goods ? '(見舞品)' : ''}の目安は、${rel.live}です。`;
  resultBreakdown.textContent = '公的な統計ではなく、解説記事に書かれた慣習的な目安です。';
  resultCard.classList.add('show');
  if (nextTools) nextTools.classList.add('show');
  lastAmountText = rel.text;
  lastLabel = rel.label;
  lastForm = rel.form;
  updateShareUrl();
  shareRow.classList.add('show');
  document.querySelector('.survey-banner')?.classList.add('show');

  affCard.href = affiliateUrl('御見舞 封筒');
  if (!productsRequested) {
    productsRequested = true;
    showProducts('御見舞 封筒', 'お見舞い用の封筒(のし袋)');
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
  gtag('event', 'affiliate_cta_click', { link_label: 'お見舞い用の封筒(のし袋)を探す' });
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
  const rel = initialParams.get('rel');
  if (!Object.prototype.hasOwnProperty.call(RELATIONS, rel)) return false;
  setChipActive(chipRel, rel);
  calc();
  return true;
}

if (!initFromQuery()) calc();
