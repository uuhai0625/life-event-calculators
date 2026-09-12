// ヘッダーの計算機一覧メニュー(2026-09-13追加)。ヘッダーからどのページでも他の計算機へ
// 直接ジャンプできるようにする。個別ページの検索(site-search.js)とは役割が補完的:
// 検索=探したいツールが決まっている時、このメニュー=一覧から選びたい時。
const HEADER_MENU_SECTIONS = [
  {
    label: 'メイン計算機',
    items: [
      { title: 'ご祝儀・香典の相場計算機', path: 'goshugi-koden/' },
      { title: '出産祝いの相場計算機', path: 'shussan-iwai/' },
      { title: '彼氏・彼女・夫婦へのプレゼント予算計算機', path: 'partner-present/' },
      { title: '結婚祝いの相場計算機', path: 'kekkon-iwai/' },
      { title: 'お中元・お歳暮の相場計算機', path: 'ochugen-oseibo/' },
      { title: '餞別・送別ギフトの相場計算機', path: 'senbetsu/' },
      { title: '長寿祝いの年計算機', path: 'chouju-iwai/' },
    ],
  },
  {
    label: '間柄をもっと詳しく',
    items: [
      { title: '祖父母への香典の相場計算機', path: 'koden-sofubo/' },
      { title: '友人の親への香典の相場計算機', path: 'koden-yujin-oya/' },
      { title: 'いとこの結婚式のご祝儀相場計算機', path: 'goshugi-itoko/' },
      { title: 'おじ・おばへの香典の相場計算機', path: 'koden-ojioba/' },
      { title: '叔父・叔母の結婚式のご祝儀相場計算機', path: 'goshugi-ojioba/' },
    ],
  },
  {
    label: '参考コンテンツ',
    items: [
      { title: '冠婚葬祭の金額早見表まとめ', path: 'souba-ichiran/' },
      { title: '相場データの情報源まとめ', path: 'shutten-ichiran/' },
      { title: '冠婚葬祭のことば辞典', path: 'yougo-shu/' },
      { title: 'ご祝儀袋・香典袋の選び方ガイド', path: 'fukuro-erabikata/' },
    ],
  },
];

(function initHeaderMenu() {
  const btn = document.getElementById('header-menu-btn');
  const panel = document.getElementById('header-menu-panel');
  if (!btn || !panel) return;

  const currentPath = location.pathname.replace(/\/$/, '').split('/').pop();
  const isPortal = document.body.classList.contains('page-portal');
  const prefix = isPortal ? '' : '../';

  const sectionsHtml = HEADER_MENU_SECTIONS.map((section) => {
    const links = section.items
      .filter((item) => item.path.replace(/\/$/, '') !== currentPath)
      .map((item) => `<a href="${prefix}${item.path}">${item.title}</a>`)
      .join('');
    return `<p class="header-menu-section-label">${section.label}</p>${links}`;
  }).join('');
  panel.innerHTML = `<a class="header-menu-portal-link" href="${prefix}">相場ノート トップ</a>${sectionsHtml}`;

  function closeMenu() {
    panel.classList.remove('show');
    btn.setAttribute('aria-expanded', 'false');
  }
  function openMenu() {
    panel.classList.add('show');
    btn.setAttribute('aria-expanded', 'true');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (panel.classList.contains('show')) closeMenu();
    else openMenu();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header-menu-panel') && e.target !== btn) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
})();
