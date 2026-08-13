// RAKUTEN_AFFILIATE_ID: uuhai0625ブランド用の楽天アフィリエイトID(2026-08-11登録・取得済み)。
// (Desk Animals/TinyWonders側のAmazonアソシエイト'tinywonders-22'はこのプロジェクトでは使わない
// — 複数アカウント規約リスクを避けるため、uuhai0625ブランドは楽天アフィリエイトに一本化する方針、2026-08-10決定)
// 楽天アフィリエイトの公式「リンク作成」ツールで実際に生成したリンクの形式に合わせている。
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

// 2026-08-11、実データ(楽天カード「みんなのマネ活」等)と突き合わせて再較正。
// 「親戚(姪・甥・いとこ)10,000〜30,000円」「親から子(≒自分の孫)30,000〜100,000円」の
// 実勢に対し、旧数値(親族10,000/孫30,000固定)は下限寄りすぎたため引き上げ。
// 兄弟姉妹は「年上→年下」「年下→年上」で相場が倍近く異なるため、baseは使わずcalc()内で分岐する。
const RELATIONS = {
  colleague:    { label: '職場の同僚・部下', base: 4000 },
  friend:       { label: '友人・知人',        base: 5000 },
  relative:     { label: 'いとこ・叔父叔母などの親族', base: 15000 },
  niece_nephew: { label: '甥・姪',            base: 15000 },
  sibling:      { label: '兄弟姉妹',           base: null },
  grandchild:   { label: '自分の孫',           base: 50000 },
};

const SIBLING_BASE = { older: 25000, younger: 15000 };

function roundTo(amount, step) {
  return Math.round(amount / step) * step;
}

const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultRange = document.getElementById('result-range');
const resultAdvice = document.getElementById('result-advice');
const affCard = document.getElementById('aff-card');
const shareRow = document.getElementById('share-row');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShareX = document.getElementById('btn-share-x');
let lastAmount = 0;

function calc() {
  const relationValue = document.getElementById('select-relation').value;
  const birthOrder = document.querySelector('input[name="birthorder"]:checked').value;
  const giving = document.querySelector('input[name="giving"]:checked').value;
  const config = RELATIONS[relationValue];

  let amount;
  if (relationValue === 'sibling') {
    const siblingOrder = document.querySelector('input[name="siblingorder"]:checked').value;
    amount = SIBLING_BASE[siblingOrder];
  } else {
    amount = config.base;
  }
  if (birthOrder === 'second') {
    amount = roundTo(amount * 0.85, 1000);
  }

  const rangeLow = Math.max(1000, roundTo(amount * 0.8, 1000));
  const rangeHigh = roundTo(amount * 1.2, 1000);

  let advice = birthOrder === 'second'
    ? '第2子以降は第1子の8割程度が目安とされますが、上のお子さんへのちょっとしたプチギフトを添えると喜ばれます。'
    : '第1子への出産祝いの目安です。';
  if (giving === 'group') {
    advice += ' 職場などで連名にする場合は、表書きに全員の名前を書き、一人あたりの負担額を事前にすり合わせておきましょう(合計額は目安の2〜3倍程度になることが多いです)。';
  }

  resultAmount.textContent = amount.toLocaleString('ja-JP');
  resultRange.textContent = `目安レンジ:¥${rangeLow.toLocaleString('ja-JP')} 〜 ¥${rangeHigh.toLocaleString('ja-JP')}`;
  resultAdvice.textContent = advice;
  resultCard.classList.add('show');
  lastAmount = amount;
  updateShareUrl();
  shareRow.classList.add('show');

  affCard.href = affiliateUrl('出産祝い ギフト');
  affCard.classList.add('show');
  showProducts('出産祝い ギフト', '🛒 人気の出産祝いギフト');

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

const relationSelect = document.getElementById('select-relation');
const fieldSiblingOrder = document.getElementById('field-sibling-order');
relationSelect.addEventListener('change', () => {
  fieldSiblingOrder.style.display = relationSelect.value === 'sibling' ? '' : 'none';
});

document.getElementById('btn-calc').addEventListener('click', calc);

// 結果の共有機能(2026-08-14): 詳細はgoshugi-koden/script.jsのコメント参照
function paramsFromState() {
  const params = new URLSearchParams();
  const relationValue = relationSelect.value;
  params.set('relation', relationValue);
  if (relationValue === 'sibling') {
    params.set('siblingorder', document.querySelector('input[name="siblingorder"]:checked').value);
  }
  params.set('birthorder', document.querySelector('input[name="birthorder"]:checked').value);
  params.set('giving', document.querySelector('input[name="giving"]:checked').value);
  return params;
}

function updateShareUrl() {
  const params = paramsFromState();
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function shareText(amount) {
  const label = RELATIONS[relationSelect.value].label;
  return `${label}への出産祝いの相場を計算しました。\n目安:¥${amount.toLocaleString('ja-JP')}\n`;
}

btnCopyLink.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    const original = btnCopyLink.textContent;
    btnCopyLink.textContent = 'コピーしました✓';
    setTimeout(() => { btnCopyLink.textContent = original; }, 2000);
  } catch (e) {
    // clipboard APIが使えない環境では静かに諦める
  }
});
btnShareX.addEventListener('click', () => {
  const text = shareText(lastAmount);
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`;
  window.open(intentUrl, '_blank', 'noopener');
});

function initFromQuery() {
  const params = new URLSearchParams(location.search);
  const relation = params.get('relation');
  if (!relation || !RELATIONS[relation]) return;
  relationSelect.value = relation;
  fieldSiblingOrder.style.display = relation === 'sibling' ? '' : 'none';
  if (relation === 'sibling') {
    const so = params.get('siblingorder');
    if (so === 'older' || so === 'younger') {
      document.querySelector(`input[name="siblingorder"][value="${so}"]`).checked = true;
    }
  }
  const birthorder = params.get('birthorder');
  if (birthorder === 'first' || birthorder === 'second') {
    document.querySelector(`input[name="birthorder"][value="${birthorder}"]`).checked = true;
  }
  const giving = params.get('giving');
  if (giving === 'solo' || giving === 'group') {
    document.querySelector(`input[name="giving"][value="${giving}"]`).checked = true;
  }
  calc();
}

initFromQuery();
