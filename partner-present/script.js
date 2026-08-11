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

const RELATIONS = {
  girlfriend: { label: '彼女', keyword: '彼女 プレゼント', base: 15000 },
  boyfriend:  { label: '彼氏', keyword: '彼氏 プレゼント', base: 10000 },
  wife:       { label: '妻',   keyword: '妻 プレゼント',   base: 15000 },
  husband:    { label: '夫',   keyword: '夫 プレゼント',   base: 10000 },
};

const EVENTS = {
  birthday:    { label: '誕生日',        multiplier: 1.0,
    advice: '相手の好きなものをさりげなくリサーチしておくと失敗が少ないです。' },
  christmas:   { label: 'クリスマス',     multiplier: 1.0,
    advice: '年間で最も予算が上がりやすいイベントです。食事代は予算に含めず別枠で考えると安心です。' },
  valentine:   { label: 'バレンタインデー', multiplier: 0.4,
    advice: '本命チョコ+ちょっとした小物を組み合わせるのが近年の定番です。' },
  whiteday:    { label: 'ホワイトデー',    multiplier: 0.4,
    advice: '「もらった額の3倍返し」は都市伝説に近く、実際は同額〜1.5倍程度のお返しが主流です。' },
  anniversary: { label: '交際・結婚記念日', multiplier: 0.8,
    advice: '交際5年・結婚10年など節目の年は相場が上がる傾向があります。ペアアイテムやジュエリーも人気です。' },
};

const YEARS_MULTIPLIER = { under1: 1.15, '1to3': 1.0, over3: 0.9 };

function roundTo(amount, step) {
  return Math.round(amount / step) * step;
}

const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultRange = document.getElementById('result-range');
const resultAdvice = document.getElementById('result-advice');
const affCard = document.getElementById('aff-card');
const affTitle = document.getElementById('aff-title');

function calc() {
  const relation = RELATIONS[document.getElementById('select-relation').value];
  const event = EVENTS[document.getElementById('select-event').value];
  const yearsMultiplier = YEARS_MULTIPLIER[document.getElementById('select-years').value];

  const amount = roundTo(relation.base * event.multiplier * yearsMultiplier, 1000);
  const rangeLow = Math.max(1000, roundTo(amount * 0.8, 1000));
  const rangeHigh = roundTo(amount * 1.2, 1000);

  resultAmount.textContent = amount.toLocaleString('ja-JP');
  resultRange.textContent = `目安レンジ:¥${rangeLow.toLocaleString('ja-JP')} 〜 ¥${rangeHigh.toLocaleString('ja-JP')}`;
  resultAdvice.textContent = event.advice;
  resultCard.classList.add('show');

  affTitle.textContent = `${relation.label}への${event.label}プレゼントを探す`;
  affCard.href = affiliateUrl(`${relation.keyword} ${event.label}`);
  affCard.classList.add('show');
  showProducts(relation.keyword, `🛒 人気の${relation.label}へのプレゼント`);

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc').addEventListener('click', calc);
