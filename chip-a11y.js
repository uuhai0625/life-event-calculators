// チップ(.chip)の選択状態を支援技術に伝える(2026-10-03追加)。
// 各計算機のscript.jsは選択状態を.activeクラスの付け替えだけで表現しており、スクリーンリーダーには
// 「どれが選ばれているか」が伝わらなかった。12本のscript.jsを個別に直す代わりに、クラス変化と
// 動的に追加されるチップ(goshugi-kodenの間柄チップ等)をここで一括して監視し、aria-pressedへ同期する。
(function syncChipPressedState() {
  function sync(btn) {
    btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
  }
  function syncWithin(root) {
    root.querySelectorAll('.chip').forEach(sync);
  }

  syncWithin(document);

  new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === 'attributes') {
        if (record.target.classList.contains('chip')) sync(record.target);
        return;
      }
      record.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.classList.contains('chip')) sync(node);
        else syncWithin(node);
      });
    });
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
})();
