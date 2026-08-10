// RAKUTEN_AFFILIATE_ID: uuhai0625ブランド用の楽天アフィリエイトID。未取得のため空文字。
// (Desk Animals/TinyWonders側のAmazonアソシエイト'tinywonders-22'はこのプロジェクトでは使わない
// — 複数アカウント規約リスクを避けるため、uuhai0625ブランドは楽天アフィリエイトに一本化する方針、2026-08-10決定)
// IDを取得したら楽天アフィリエイトの公式「リンク作成」ツールで生成したURLを使うよう実装し直すこと。
const RAKUTEN_AFFILIATE_ID = '';

function affiliateUrl(keyword) {
  const searchUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`;
  if (!RAKUTEN_AFFILIATE_ID) return searchUrl;
  const encoded = encodeURIComponent(searchUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encoded}&m=${encoded}`;
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

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc').addEventListener('click', calc);
