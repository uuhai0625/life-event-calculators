// ポータルのツール検索(2026-09-06追加)。競合サイト(計算ナビ等、検索上位サイトの調査結果)が
// 検索ボックスを最上部に置いているのを参考に導入。バックエンド不要のクライアントサイド文字列一致のみ。

const searchInput = document.getElementById('tool-search-input');
const searchCount = document.getElementById('tool-search-count');
const cards = Array.from(document.querySelectorAll('.tool-card'));
const sections = Array.from(document.querySelectorAll('main > section'));

function applyFilter() {
  const q = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;
  cards.forEach((card) => {
    const match = !q || card.textContent.toLowerCase().includes(q);
    card.style.display = match ? '' : 'none';
    if (match) visibleCount += 1;
  });
  sections.forEach((sec) => {
    const list = sec.querySelector('.tool-list');
    if (!list) return;
    const hasVisibleCard = Array.from(list.querySelectorAll('.tool-card')).some((c) => c.style.display !== 'none');
    sec.style.display = q && !hasVisibleCard ? 'none' : '';
  });
  if (!q) {
    searchCount.textContent = '';
  } else if (visibleCount === 0) {
    searchCount.textContent = `「${searchInput.value}」に一致するツールが見つかりませんでした。`;
  } else {
    searchCount.textContent = `「${searchInput.value}」に一致するツール: ${visibleCount}件`;
  }
}

searchInput.addEventListener('input', applyFilter);
