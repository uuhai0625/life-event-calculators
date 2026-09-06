// 固定ヘッダーがスクロール中も常時フルサイズ(モバイル実測149px=画面の18.4%)で
// コンテンツの一部を隠す問題への対応(2026-09-07、5名レビューで発見)。
// 少しスクロールしたら.header-compactを付与し、style.css側でロゴのみの薄いバーに縮小する。
const siteHeader = document.querySelector('.site-header');
if (siteHeader) {
  const SCROLL_THRESHOLD = 40;
  const applyCompactState = () => {
    siteHeader.classList.toggle('header-compact', window.scrollY > SCROLL_THRESHOLD);
  };
  window.addEventListener('scroll', applyCompactState, { passive: true });
  applyCompactState();
}
