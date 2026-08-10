// RAKUTEN_AFFILIATE_ID: uuhai0625ブランド用の楽天アフィリエイトID。
// 未取得のため現時点では空文字(空の間は通常の楽天市場検索リンクとして機能する)。
// Amazonアソシエイトは複数アカウント保有の規約リスクを避けるためDesk Animals/TinyWonders
// ブランド専用(tinywonders-22)のままとし、uuhai0625ブランドはこちらの楽天アフィリエイトを使う方針
// (2026-08-10決定)。IDを取得したら、この定数に直接ID文字列を入れるのではなく、
// 楽天アフィリエイトの公式「リンク作成」ツールで実際に検索リンクを生成し、
// 生成されたURL(トラッキング用のscid等が付与されている可能性がある)をそのまま
// affiliateUrl()の戻り値として使うよう実装し直すこと(手打ちのURL組み立ては計測漏れリスクがあるため)。
const RAKUTEN_AFFILIATE_ID = '';

function affiliateUrl(keyword) {
  const searchUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`;
  if (!RAKUTEN_AFFILIATE_ID) return searchUrl;
  const encoded = encodeURIComponent(searchUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encoded}&m=${encoded}`;
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
    btn.classList.toggle('active', btn.dataset.scene === scene);
  });
  fieldWeddingAttend.style.display = scene === 'wedding' ? '' : 'none';
  fieldFuneralMeal.style.display = scene === 'funeral' ? '' : 'none';
  populateRelations();
  resultCard.classList.remove('show');
  affCard.classList.remove('show');
  mannerWedding.classList.remove('show');
  mannerFuneral.classList.remove('show');
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

  const rangeLow = Math.max(3000, amount - 5000);
  const rangeHigh = amount + 5000;

  resultLabel.textContent = currentScene === 'wedding' ? 'ご祝儀の目安' : '香典の目安';
  resultAmount.textContent = amount.toLocaleString('ja-JP');
  resultRange.textContent = `目安レンジ:¥${rangeLow.toLocaleString('ja-JP')} 〜 ¥${rangeHigh.toLocaleString('ja-JP')}`;
  resultAdvice.textContent = adviceText;
  resultCard.classList.add('show');

  if (currentScene === 'wedding') {
    affIcon.textContent = '🎁';
    affTitle.textContent = 'ご祝儀袋を探す';
    affCard.href = affiliateUrl('ご祝儀袋');
    mannerWedding.classList.add('show');
    mannerFuneral.classList.remove('show');
  } else {
    affIcon.textContent = '🖤';
    affTitle.textContent = '不祝儀袋(香典袋)を探す';
    affCard.href = affiliateUrl('不祝儀袋 香典袋');
    mannerFuneral.classList.add('show');
    mannerWedding.classList.remove('show');
  }
  affCard.classList.add('show');

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.querySelectorAll('.scene-tab').forEach((btn) => {
  btn.addEventListener('click', () => setScene(btn.dataset.scene));
});
document.getElementById('btn-calc').addEventListener('click', calc);

setScene('wedding');
