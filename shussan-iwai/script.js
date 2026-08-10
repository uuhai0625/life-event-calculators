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

  affCard.href = affiliateUrl('出産祝い ギフト');
  affCard.classList.add('show');

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

const relationSelect = document.getElementById('select-relation');
const fieldSiblingOrder = document.getElementById('field-sibling-order');
relationSelect.addEventListener('change', () => {
  fieldSiblingOrder.style.display = relationSelect.value === 'sibling' ? '' : 'none';
});

document.getElementById('btn-calc').addEventListener('click', calc);
