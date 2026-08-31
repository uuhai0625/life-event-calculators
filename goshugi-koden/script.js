// RAKUTEN_AFFILIATE_ID: uuhai0625ブランド用の楽天アフィリエイトID(2026-08-11登録・取得済み)。
// Amazonアソシエイトは複数アカウント保有の規約リスクを避けるためDesk Animals/TinyWonders
// ブランド専用(tinywonders-22)のままとし、uuhai0625ブランドはこちらの楽天アフィリエイトを使う方針
// (2026-08-10決定)。楽天アフィリエイトの公式「リンク作成」ツールで実際に生成したリンクの形式
// (https://hb.afl.rakuten.co.jp/hgc/{ID}/?pc={url}&link_type=text&ut={固定メタデータ}) に合わせている。
const RAKUTEN_AFFILIATE_ID = '567f9cc6.631b3687.567f9cc7.3d3a8a85';

// 楽天市場の検索結果には「売れ筋順」という直接の並び替えはないため、実際の検索画面のソート
// ドロップダウンで確認した「レビュー件数順」(?s=5、購入者が多いほどレビューが集まる=人気の代用指標)
// を使い、人気の高い商品が上位に出るようにしている(2026-08-11)。
function affiliateUrl(keyword) {
  const searchUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/?s=5`;
  if (!RAKUTEN_AFFILIATE_ID) return searchUrl;
  const encoded = encodeURIComponent(searchUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encoded}&link_type=text&ut=eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9`;
}

// 楽天商品検索API(2026-08-11導入): 計算結果に応じたおすすめ商品をカードで複数表示する。
// アプリID・アクセスキー・APIリクエスト用アフィリエイトIDは楽天ウェブサービスのアプリ登録画面で発行されたもの。
// リンク作成ツールで手動生成した RAKUTEN_AFFILIATE_ID とは異なる値だが、楽天の仕様上「APIやサービスに
// 応じて別のアフィリエイトIDが割り当てられる」設計であり、成果は同じ楽天会員IDに正しく集約される
// (楽天ウェブサービスFAQで確認済み)。
// エンドポイントは旧app.rakuten.co.jp/services/api/版ではなく、新openapi.rakuten.co.jp/ichibams/api/版を使用。
// 新版はaccessKeyも必須パラメータ。**バージョン番号は固定せず要注意**: 2026-08-17、旧`20220601`が
// 「API Configuration not found」エラーで応答不能になっているのを発見(APIテストフォームで動作確認したところ
// 現行バージョンは`20260701`。理由は不明だが楽天側でバージョンが定期的に切り替わるため、次に商品カードが
// 出なくなったら真っ先に https://webservice.rakuten.co.jp/explorer/api で現行バージョンを確認すること)。
const RAKUTEN_APP_ID = 'f9f8dd97-c7a4-4ae1-a2c1-38b4572a702e';
const RAKUTEN_ACCESS_KEY = 'pk_gJd3Q0JkttKeBF4DcfYjD8zYljezjxNxEFiUssXZhFs';
const RAKUTEN_API_AFFILIATE_ID = '567fd2ff.507b4e2c.567fd300.5261c56d';

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
  grid.classList.remove('show');
  if (label) label.style.display = 'none';
  const url = new URL('https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701');
  url.searchParams.set('applicationId', RAKUTEN_APP_ID);
  url.searchParams.set('accessKey', RAKUTEN_ACCESS_KEY);
  url.searchParams.set('affiliateId', RAKUTEN_API_AFFILIATE_ID);
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('sort', '-reviewCount');
  url.searchParams.set('hits', '4');
  url.searchParams.set('format', 'json');
  try {
    const res = await fetch(url.toString());
    if (requestId !== productRequestId) return;
    if (!res.ok) return;
    const data = await res.json();
    if (requestId !== productRequestId) return;
    const items = (data.Items || []).map((entry) => entry.Item || entry);
    if (!items.length) return;
    // 2列グリッド表示に統一(2026-08-15): 他4ページ(価格帯別showProducts)はproduct-band-gridで
    // 2列コンパクト表示なのに対し、このページだけproduct-grid直下に並べていたため全幅縦積みになっていた
    // (デザインレビューで発覚した不整合)。同じCSSクラスを再利用して2列グリッドに揃える。
    grid.innerHTML = '<div class="product-band-grid">' + items.map((item, index) => {
      const imgRaw = item.mediumImageUrls && item.mediumImageUrls[0];
      const img = typeof imgRaw === 'string' ? imgRaw : (imgRaw && imgRaw.imageUrl) || '';
      const price = Number(item.itemPrice).toLocaleString('ja-JP');
      const name = String(item.itemName || '').replace(/</g, '&lt;');
      // レビュー件数・評価の表示(2026-08-15、ユーザー目線レビューで追加): APIはsort=-reviewCountで
      // 人気順取得しているのに根拠(件数・評価)を見せていなかったため、購買後押しの機会損失だった。
      // レビュー0件の商品は星評価がないため表示しない。
      const reviewCount = Number(item.reviewCount) || 0;
      const reviewAverage = Number(item.reviewAverage) || 0;
      const reviewHtml = reviewCount > 0
        ? `<p class="product-review">★${reviewAverage.toFixed(1)}<span class="product-review-count">(${reviewCount.toLocaleString('ja-JP')}件)</span></p>`
        : '';
      // データ根拠バッジ(2026-08-15追加): 個々の商品に「なぜこれが選ばれているか」の一言もないという
      // ユーザー目線レビュー指摘を受け、楽天APIの実データ(順位・レビュー件数・送料フラグ)のみから
      // 客観的に判定できる範囲でバッジ化。憶測は含めない。
      const badges = [];
      if (index === 0) badges.push({ text: 'レビュー数1位', cls: 'product-badge--rank', title: '表示された商品の中でレビュー件数が最も多い商品です(市場全体の1位という意味ではありません)' });
      else if (reviewCount >= 3000) badges.push({ text: 'レビュー多数', cls: 'product-badge--rank' });
      if (Number(item.postageFlag) === 0) badges.push({ text: '送料無料', cls: 'product-badge--shipping' });
      const badgeHtml = badges.length
        ? `<div class="product-badges">${badges.map((b) => `<span class="product-badge ${b.cls}" title="${b.title || ''}">${b.text}</span>`).join('')}</div>`
        : '';
      return `
        <a class="product-card" href="${item.itemUrl}" target="_blank" rel="noopener sponsored" data-ga-name="${name.replace(/"/g, '&quot;').slice(0, 60)}" data-ga-price="${Number(item.itemPrice) || 0}">
          <div class="product-image-wrap">
            <img src="${img}" alt="${name.replace(/"/g, '&quot;')}" loading="lazy"><span class="product-pr">PR</span>
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
    // API呼び出しに失敗しても既存の検索リンクCTA(aff-card)がフォールバックとして機能するため、
    // ここでは静かに諦める(エラー表示はしない)。
  }
}

// ageTier補正倍率(近い関係=scalableな項目にのみ適用)
// 2026-08-11、実際のマナーサイト複数(小さなお葬式/イオンのお葬式等)の年代別相場と突き合わせて再較正。
// 例: 親への香典は「20代3〜10万円/40代以上10万円程度」が目安とされており、旧倍率(0.8/1.0/1.3/1.5)では
// 40代以上が6.5万円止まりで実勢より低く出ていた。
const AGE_MULTIPLIER = { '20s': 0.9, '30s': 1.0, '40s': 1.6, '50s': 2.0 };

const RELATIONS = {
  wedding: [
    { value: 'friend',   label: '友人・知人',              base: 30000, scalable: false },
    { value: 'colleague', label: '職場の同僚・部下',        base: 30000, scalable: false },
    { value: 'boss',      label: '職場の上司',              base: 30000, scalable: false },
    { value: 'relative',  label: 'いとこ・叔父叔母などの親族', base: 30000, scalable: true },
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

const relationSelect = document.getElementById('select-relation');
const ageSelect = document.getElementById('select-age');
const fieldWeddingAttend = document.getElementById('field-wedding-attend');
const fieldFuneralMeal = document.getElementById('field-funeral-meal');
const resultCard = document.getElementById('result-card');
const resultLabel = document.getElementById('result-label');
const resultAmount = document.getElementById('result-amount');
const resultRange = document.getElementById('result-range');
const resultAdvice = document.getElementById('result-advice');
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
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
const followX = document.getElementById('follow-x');
let lastAmount = 0;

function populateRelations() {
  relationSelect.innerHTML = '';
  RELATIONS[currentScene].forEach((r) => {
    const opt = document.createElement('option');
    opt.value = r.value;
    opt.textContent = r.label;
    relationSelect.appendChild(opt);
  });
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
  populateRelations();
  resultCard.classList.remove('show');
  shareRow.classList.remove('show');
  if (followX) followX.style.display = scene === 'wedding' ? '' : 'none';
  affCard.classList.remove('show');
  mannerWedding.classList.remove('show');
  mannerFuneral.classList.remove('show');
  regionWedding.classList.remove('show');
  regionFuneral.classList.remove('show');
  rateTableWedding.classList.toggle('show', scene === 'wedding');
  rateTableFuneral.classList.toggle('show', scene === 'funeral');
  const grid = document.getElementById('product-grid');
  const gridLabel = document.getElementById('product-grid-label');
  if (grid) { grid.innerHTML = ''; grid.classList.remove('show'); }
  if (gridLabel) gridLabel.style.display = 'none';
}

function roundTo(amount, step) {
  return Math.round(amount / step) * step;
}

function calc() {
  const relationValue = relationSelect.value;
  const ageTier = ageSelect.value;
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

  // レンジ算出は他ページ(出産祝い/プレゼント予算)と同じ「金額の±20%」方式に統一(2026-08-11)。
  // 旧「固定±5,000円」だと、3,000円台の少額(香典の近所枠等)ではレンジが実質2.7倍まで広がってしまい、
  // 高額帯(10万円超)ではレンジがほぼ意味をなさないほど狭くなる不整合があった。
  const rangeLow = Math.max(1000, roundTo(amount * 0.8, 1000));
  const rangeHigh = roundTo(amount * 1.2, 1000);

  resultLabel.textContent = currentScene === 'wedding' ? 'ご祝儀の目安' : '香典の目安';
  resultAmount.textContent = amount.toLocaleString('ja-JP');
  resultRange.textContent = `目安レンジ:¥${rangeLow.toLocaleString('ja-JP')} 〜 ¥${rangeHigh.toLocaleString('ja-JP')}`;
  resultAdvice.textContent = adviceText;
  resultCard.classList.add('show');
  lastAmount = amount;
  updateShareUrl();
  // グリーフケアレビュー(2026-08-31)対応: 香典シーンではXシェアボタン・運営フォロー誘導文のような
  // 慶事向けの軽いトーンの導線を表示しない(遺族当事者・急かされない設計の複数レビュアーが指摘)。
  // URLコピーボタンは家族間で結果を共有する実用的な用途があるため香典シーンでも残す。
  shareRow.classList.add('show');
  btnShareX.style.display = currentScene === 'wedding' ? '' : 'none';
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
  const productLabel = currentScene === 'wedding' ? '🛒 人気のご祝儀袋' : '🛒 人気の不祝儀袋(香典袋)';
  showProducts(productKeyword, productLabel);

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.querySelectorAll('.scene-tab').forEach((btn) => {
  btn.addEventListener('click', () => setScene(btn.dataset.scene));
});
document.getElementById('btn-calc').addEventListener('click', calc);

// GA4クリック計測(2026-08-15追加): 商品カード・検索CTAのクリックを計測し、
// 導線が実際にクリックされているかを今後データで検証できるようにする(ユーザー目線レビューで判明した盲点)。
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

// 結果の共有機能(2026-08-14): 現在の入力状態をURLクエリに保持し、結果ページを直接共有できるようにする。
// 「サイトを紹介する」より「計算結果を共有する」方が拡散されやすいというPerplexity調査(集客装置化第2弾)を踏まえた実装。
function paramsFromState() {
  const params = new URLSearchParams();
  params.set('scene', currentScene);
  params.set('relation', relationSelect.value);
  params.set('age', ageSelect.value);
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
  const relationLabel = (RELATIONS[currentScene].find((r) => r.value === relationSelect.value) || {}).label || '';
  const sceneLabel = currentScene === 'wedding' ? 'ご祝儀' : '香典';
  return `${relationLabel}への${sceneLabel}の相場を計算しました。\n目安:¥${amount.toLocaleString('ja-JP')}\n`;
}

// クリップボードAPIが権限待ちなどで応答しない環境があるため、1.5秒でタイムアウトし
// 古いexecCommand('copy')にフォールバックする(2026-08-15、デバッグで発見した堅牢化)。
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
    // それでも失敗した場合は静かに諦める(URLはアドレスバーから手動コピー可能なため)
  }
});
btnShareX.addEventListener('click', () => {
  const text = shareText(lastAmount);
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`;
  window.open(intentUrl, '_blank', 'noopener');
});

// 共有URLからの復元: 条件が有効な場合のみ自動計算する(不正・不完全なクエリは通常表示にフォールバック)
function initFromQuery() {
  const params = new URLSearchParams(location.search);
  const scene = params.get('scene');
  if (scene !== 'wedding' && scene !== 'funeral') return;
  setScene(scene);
  const relation = params.get('relation');
  if (relation && RELATIONS[scene].some((r) => r.value === relation)) relationSelect.value = relation;
  const age = params.get('age');
  if (age && AGE_MULTIPLIER[age]) ageSelect.value = age;
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
