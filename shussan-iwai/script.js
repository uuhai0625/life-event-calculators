// AFFILIATE_TAG: uuhai0625ブランド用のAmazonアソシエイトID。未取得のため空文字。
// (Desk Animals/TinyWonders側の 'tinywonders-22' はこのプロジェクトでは使わない — 別ブランド管轄のため)
const AFFILIATE_TAG = '';

function affiliateUrl(keyword) {
  const url = new URL('https://www.amazon.co.jp/s');
  url.searchParams.set('k', keyword);
  if (AFFILIATE_TAG) url.searchParams.set('tag', AFFILIATE_TAG);
  return url.toString();
}

const RELATIONS = {
  colleague:    { label: '職場の同僚・部下', base: 3000 },
  friend:       { label: '友人・知人',        base: 5000 },
  relative:     { label: 'いとこ・叔父叔母などの親族', base: 10000 },
  niece_nephew: { label: '甥・姪',            base: 10000 },
  sibling:      { label: '兄弟姉妹',           base: 20000 },
  grandchild:   { label: '自分の孫',           base: 30000 },
};

function roundTo(amount, step) {
  return Math.round(amount / step) * step;
}

const resultCard = document.getElementById('result-card');
const resultAmount = document.getElementById('result-amount');
const resultRange = document.getElementById('result-range');
const resultAdvice = document.getElementById('result-advice');
const affCard = document.getElementById('aff-card');

function calc() {
  const relationValue = document.getElementById('select-relation').value;
  const birthOrder = document.querySelector('input[name="birthorder"]:checked').value;
  const giving = document.querySelector('input[name="giving"]:checked').value;
  const config = RELATIONS[relationValue];

  let amount = config.base;
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

  affCard.href = affiliateUrl('出産祝い ギフト');
  affCard.classList.add('show');

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btn-calc').addEventListener('click', calc);
