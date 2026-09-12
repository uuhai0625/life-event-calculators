// 固定ヘッダーがスクロール中も常時フルサイズ(モバイル実測149px=画面の18.4%)で
// コンテンツの一部を隠す問題への対応(2026-09-07、5名レビューで発見)。
// 少しスクロールしたら.header-compactを付与し、style.css側でロゴのみの薄いバーに縮小する。
const siteHeader = document.querySelector('.site-header');
if (siteHeader) {
  // 2026-09-12: しきい値が単一値(40px)だと、ヘッダーの高さ変化自体がスクロール位置を
  // わずかに動かし、境界付近で縮小⇄復帰を繰り返して見た目がブレる不具合があった。
  // ON/OFFのしきい値を分離(ヒステリシス)し、境界を跨いでも往復しないようにする。
  const ENTER_THRESHOLD = 80;
  const EXIT_THRESHOLD = 30;
  let isCompact = false;
  const applyCompactState = () => {
    const y = window.scrollY;
    if (!isCompact && y > ENTER_THRESHOLD) {
      isCompact = true;
    } else if (isCompact && y < EXIT_THRESHOLD) {
      isCompact = false;
    }
    siteHeader.classList.toggle('header-compact', isCompact);
  };
  window.addEventListener('scroll', applyCompactState, { passive: true });
  applyCompactState();
}
