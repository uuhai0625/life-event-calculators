// お気に入り機能(2026-09-12、競合調査でtook.jp/keisan-navi.jpが右上にお気に入りボタンを
// 持っているのを参考に追加)。サーバー不要、localStorageのみで完結する。
// 保存形式: localStorage['favorites'] = JSON配列 [{ title, path }, ...] (pathはポータルからの相対パス、例: "goshugi-koden/")

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem('favorites') || '[]');
  } catch (e) {
    return [];
  }
}
function saveFavorites(list) {
  try { localStorage.setItem('favorites', JSON.stringify(list)); } catch (e) {}
}

(function initFavoriteButton() {
  const btn = document.getElementById('favorite-btn');
  if (!btn) return;
  const path = btn.dataset.path;
  const title = btn.dataset.title;

  function render() {
    const isFav = getFavorites().some((f) => f.path === path);
    btn.textContent = isFav ? '★' : '☆';
    btn.classList.toggle('is-active', isFav);
    btn.setAttribute('aria-label', isFav ? 'お気に入りから外す' : 'お気に入りに追加');
  }

  btn.addEventListener('click', () => {
    const list = getFavorites();
    const idx = list.findIndex((f) => f.path === path);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push({ title, path });
    }
    saveFavorites(list);
    render();
  });

  render();
})();

(function initFavoritesList() {
  const container = document.getElementById('favorites-list');
  const section = document.getElementById('favorites-section');
  if (!container || !section) return;
  const list = getFavorites();
  if (!list.length) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';
  container.innerHTML = list
    .map((f) => `<a class="tool-card" href="${f.path}"><h3>${f.title}</h3></a>`)
    .join('');
})();
