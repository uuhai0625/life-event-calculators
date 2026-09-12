// 個別ページ用の全ツール横断検索(2026-09-12、競合調査でkeisan-navi.jp等が個別ページにも
// 検索ボックスを常設しているのを参考に追加)。ポータルのportal-search.js(カード絞り込み)とは違い、
// 個別ページには絞り込み対象のカード一覧が無いため、入力に応じたドロップダウン候補表示の方式にする。
const SITE_PAGES = [
  { title: 'ご祝儀・香典の相場計算機', path: 'goshugi-koden/' },
  { title: '出産祝いの相場計算機', path: 'shussan-iwai/' },
  { title: '彼氏・彼女・夫婦へのプレゼント予算計算機', path: 'partner-present/' },
  { title: '結婚祝いの相場計算機', path: 'kekkon-iwai/' },
  { title: 'お中元・お歳暮の相場計算機', path: 'ochugen-oseibo/' },
  { title: '餞別・送別ギフトの相場計算機', path: 'senbetsu/' },
  { title: '長寿祝いの年計算機', path: 'chouju-iwai/' },
  { title: '祖父母への香典の相場計算機', path: 'koden-sofubo/' },
  { title: '友人の親への香典の相場計算機', path: 'koden-yujin-oya/' },
  { title: 'いとこの結婚式のご祝儀相場計算機', path: 'goshugi-itoko/' },
  { title: 'おじ・おばへの香典の相場計算機', path: 'koden-ojioba/' },
  { title: '叔父・叔母の結婚式のご祝儀相場計算機', path: 'goshugi-ojioba/' },
  { title: '冠婚葬祭の金額早見表まとめ', path: 'souba-ichiran/' },
  { title: '相場データの情報源まとめ', path: 'shutten-ichiran/' },
  { title: '冠婚葬祭のことば辞典', path: 'yougo-shu/' },
  { title: 'ご祝儀袋・香典袋の選び方ガイド', path: 'fukuro-erabikata/' },
];

(function initSiteSearch() {
  const input = document.getElementById('site-search-input');
  const results = document.getElementById('site-search-results');
  if (!input || !results) return;

  const currentPath = location.pathname.replace(/\/$/, '').split('/').pop();

  function render(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      results.classList.remove('show');
      results.innerHTML = '';
      return;
    }
    const matches = SITE_PAGES
      .filter((p) => p.path.replace(/\/$/, '') !== currentPath)
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, 6);
    if (!matches.length) {
      results.innerHTML = '<p class="site-search-empty">一致する計算機が見つかりませんでした。</p>';
    } else {
      results.innerHTML = matches
        .map((p) => `<a href="../${p.path}">${p.title}</a>`)
        .join('');
    }
    results.classList.add('show');
  }

  input.addEventListener('input', () => render(input.value));
  input.addEventListener('focus', () => { if (input.value) render(input.value); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.site-search')) results.classList.remove('show');
  });
})();
