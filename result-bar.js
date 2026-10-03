// スマホ・タブレット幅(1カラム表示)で、入力欄を操作している間も現在の目安額を画面下に見せる固定バー(2026-10-03追加)。
// 1カラムでは結果カードが入力欄の下(スマホで画面の1〜1.5画面分下)にあり、チップを押しても結果が見えなかった。
// 結果カードが画面の下側に外れている間だけ表示し、結果が見える位置・結果より下を読んでいる間は隠す。
// 金額は#result-amount、ラベルは#result-card内の.result-labelの表示を監視して追従する(各script.jsは変更不要)。
(function initResultBar() {
  const card = document.getElementById('result-card');
  const amount = document.getElementById('result-amount');
  if (!card || !amount) return;
  const label = card.querySelector('.result-label');

  const bar = document.createElement('button');
  bar.type = 'button';
  bar.className = 'result-bar';
  bar.innerHTML =
    '<span class="result-bar-text"><span class="result-bar-label"></span>' +
    '<span class="result-bar-amount"></span></span>' +
    '<span class="result-bar-go">結果を見る ↓</span>';
  document.body.appendChild(bar);
  const barLabel = bar.querySelector('.result-bar-label');
  const barAmount = bar.querySelector('.result-bar-amount');

  let cardBelowViewport = false;

  function render() {
    const value = amount.textContent.trim();
    const hasValue = value !== '' && value !== '--';
    barLabel.textContent = label ? label.textContent.trim() : '目安';
    barAmount.textContent = hasValue ? `¥${value}` : '';
    bar.classList.toggle('is-visible', hasValue && cardBelowViewport);
  }

  new MutationObserver(render).observe(amount, { childList: true, characterData: true, subtree: true });
  if (label) new MutationObserver(render).observe(label, { childList: true, characterData: true, subtree: true });

  // 結果カードが「画面より下」にある時だけtrue(非表示=高さ0、または画面上端より上=結果を通り過ぎた場合はfalse)
  new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    cardBelowViewport = !entry.isIntersecting && entry.boundingClientRect.height > 0 && entry.boundingClientRect.top > 0;
    render();
  }).observe(card);

  bar.addEventListener('click', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    if (typeof gtag === 'function') gtag('event', 'result_bar_click', { page_path: location.pathname });
  });

  render();
})();
