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
// エンドポイントは旧app.rakuten.co.jp/services/api/版(2026-08-17に完全廃止予定)ではなく、
// 新openapi.rakuten.co.jp/ichibams/api/版(20220601)を使用。新版はaccessKeyも必須パラメータ。
const RAKUTEN_APP_ID = 'f9f8dd97-c7a4-4ae1-a2c1-38b4572a702e';
const RAKUTEN_ACCESS_KEY = 'pk_gJd3Q0JkttKeBF4DcfYjD8zYljezjxNxEFiUssXZhFs';
const RAKUTEN_API_AFFILIATE_ID = '567fd2ff.507b4e2c.567fd300.5261c56d';

// 連打・素早い選択変更で複数のAPIリクエストが同時に飛んだ場合、後から返ってきたはずの古いレスポンスが
// 新しい選択結果を上書きしてしまうレース状態を防ぐためのリクエストID(2026-08-11)。
let productRequestId = 0;

async function showProducts(keyword, labelText) {
  const grid = document.getElementById('product-grid');
  const label = document.getElementById('product-grid-label');
  if (!grid) return;
  const requestId = ++productRequestId;
  grid.innerHTML = '';
  grid.classList.remove('show');
  if (label) label.style.display = 'none';
  const url = new URL('https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601');
  url.searchParams.set('applicationId', RAKUTEN_APP_ID);
  url.searchParams.set('accessKey', RAKUTEN_ACCESS_KEY);
  url.searchParams.set('affiliateId', RAKUTEN_API_AFFILIATE_ID);
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('sort', '-reviewCount');
  url.searchParams.set('hits', '4');
  url.searchParams.set('format', 'json');
  try {
    const res = await fetch(url.toString());
    if (requestId !== productRequestId) return; // このリクエストより後の選択操作が発生済み、結果を破棄
    if (!res.ok) return;
    const data = await res.json();
    if (requestId !== productRequestId) return;
    const items = (data.Items || []).map((entry) => entry.Item || entry);
    if (!items.length) return;
    grid.innerHTML = items.map((item) => {
      const imgRaw = item.mediumImageUrls && item.mediumImageUrls[0];
      const img = typeof imgRaw === 'string' ? imgRaw : (imgRaw && imgRaw.imageUrl) || '';
      const price = Number(item.itemPrice).toLocaleString('ja-JP');
      const name = String(item.itemName || '').replace(/</g, '&lt;');
      return `
        <a class="product-card" href="${item.itemUrl}" target="_blank" rel="noopener sponsored">
          <img src="${img}" alt="" loading="lazy">
          <p class="product-name">${name}</p>
          <p class="product-price">¥${price}</p>
        </a>`;
    }).join('');
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
const rateTableWedding = document.getElementById('rate-table-wedding');
const rateTableFuneral = document.getElementById('rate-table-funeral');
const calcPanel = document.getElementById('calc-panel');

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
  affCard.classList.remove('show');
  mannerWedding.classList.remove('show');
  mannerFuneral.classList.remove('show');
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

  let productKeyword;
  if (currentScene === 'wedding') {
    affIcon.textContent = '🎁';
    affTitle.textContent = 'ご祝儀袋を探す';
    affCard.href = affiliateUrl('ご祝儀袋');
    mannerWedding.classList.add('show');
    mannerFuneral.classList.remove('show');
    productKeyword = 'ご祝儀袋';
  } else {
    affIcon.textContent = '🖤';
    affTitle.textContent = '不祝儀袋(香典袋)を探す';
    affCard.href = affiliateUrl('不祝儀袋 香典袋');
    mannerFuneral.classList.add('show');
    mannerWedding.classList.remove('show');
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

setScene('wedding');
