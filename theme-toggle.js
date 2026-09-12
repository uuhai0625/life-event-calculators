// 手動ダークモード切替(2026-09-12、競合調査でtook.jp等が手動トグルを持っているのを参考に追加)。
// 既定はOS設定追従のまま、ユーザーが明示的に選んだ場合のみlocalStorageに記憶して次回以降も反映する。
(function initThemeToggle() {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;

  function current() {
    return document.documentElement.dataset.theme || null;
  }
  function apply(theme) {
    if (theme) {
      document.documentElement.dataset.theme = theme;
    } else {
      delete document.documentElement.dataset.theme;
    }
    btn.textContent = theme === 'dark' ? '☀️' : theme === 'light' ? '🌙' : '🌓';
    btn.setAttribute('aria-label', theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え');
  }

  btn.addEventListener('click', () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const nowDark = current() === 'dark' || (current() === null && prefersDark);
    const next = nowDark ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  apply(current());
})();
