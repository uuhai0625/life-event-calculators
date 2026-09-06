// 楽天関連の設定・共通処理(全9計算機ページ共通、2026-09-01に9ファイル個別ハードコードから集約)。
// 運営持続可能性レビュー(2026-08-31)の指摘: APP_ID/ACCESS_KEY/AFFILIATE_ID/バージョン番号が
// 9ファイルに個別ハードコードされており、次回の楽天API仕様変更時に9箇所を直す必要があった。
// このファイルを各ページのHTMLでscript.jsより先に読み込むことで、変更箇所を1箇所に集約する。

// RAKUTEN_AFFILIATE_ID: uuhai0625ブランド用の楽天アフィリエイトID(2026-08-11登録・取得済み)。
// 楽天アフィリエイトの公式「リンク作成」ツールで実際に生成したリンクの形式に合わせている。
const RAKUTEN_AFFILIATE_ID = '567f9cc6.631b3687.567f9cc7.3d3a8a85';

// 楽天APIのmediumImageUrlsはデフォルトで`_ex=128x128`という小さいサムネイルを返すため、
// カード幅(300px超)に引き伸ばすと粗く見える不具合が発覚(2026-09-06)。楽天のサムネイルサーバーは
// URL末尾の`_ex`パラメータで任意サイズへのリサイズ配信に対応しているため、600x600に差し替えて
// レティナ表示でも粗くならないようにする(実機で128/300/600/800いずれも正常配信されることを確認済み)。
function rakutenImage(item) {
  const imgRaw = item.mediumImageUrls && item.mediumImageUrls[0];
  const raw = typeof imgRaw === 'string' ? imgRaw : (imgRaw && imgRaw.imageUrl) || '';
  if (!raw) return '';
  return /_ex=\d+x\d+/.test(raw) ? raw.replace(/_ex=\d+x\d+/, '_ex=600x600') : raw + (raw.includes('?') ? '&' : '?') + '_ex=600x600';
}

// 楽天市場の検索結果には「売れ筋順」という直接の並び替えはないため、実際の検索画面のソート
// ドロップダウンで確認した「レビュー件数順」(?s=5、購入者が多いほどレビューが集まる=人気の代用指標)
// を使い、人気の高い商品が上位に出るようにしている(2026-08-11)。
function affiliateUrl(keyword) {
  const searchUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/?s=5`;
  if (!RAKUTEN_AFFILIATE_ID) return searchUrl;
  const encoded = encodeURIComponent(searchUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encoded}&link_type=text&ut=eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9`;
}

// 楽天ウェブサービス(商品検索API)側の認証情報。アフィリエイトIDはAPI用に別途割り当てられたもので、
// リンク作成ツールのID(RAKUTEN_AFFILIATE_ID)とは異なる値になる(楽天の仕様、2026-08-11確認済み)。
const RAKUTEN_APP_ID = 'f9f8dd97-c7a4-4ae1-a2c1-38b4572a702e';
const RAKUTEN_ACCESS_KEY = 'pk_gJd3Q0JkttKeBF4DcfYjD8zYljezjxNxEFiUssXZhFs';
const RAKUTEN_API_AFFILIATE_ID = '567fd2ff.507b4e2c.567fd300.5261c56d';

// バージョン番号は予告なく変わりうる(2026-08-17に実際に発生、詳細はmemory参照)。商品カードが
// 0件になる不具合が再発したら、まず https://webservice.rakuten.co.jp/explorer/api で
// 楽天商品検索APIを選択した際に自動生成されるURLのバージョン番号を確認し、ここだけ直せばよい。
const RAKUTEN_API_VERSION = '20260701';

// キーワード単位のインメモリキャッシュ(2026-08-31 CWVレビュー指摘対応)。同一ページ内で
// 続柄・金額選択を変えて元の組み合わせに戻した際に、無駄な再フェッチを避ける。
// ページ遷移・再読み込みでは消える(意図的): 表示のたびに実際の人気順を反映する設計は維持する。
const rakutenProductCache = new Map();

// 出典の鮮度チェック(運営持続可能性レビュー対応、2026-09-02)。各ページの.rate-sourceに
// data-confirmed="YYYY-MM"を付与しておき、確認から一定期間(365日)経過したら注意書きを自動表示する。
// 相場データを都度手で洗い替えなくても、古くなった箇所だけ気づけるようにする狙い。
function markStaleSources() {
  const THRESHOLD_DAYS = 365;
  const now = new Date();
  document.querySelectorAll('.rate-source[data-confirmed]').forEach((el) => {
    const confirmed = new Date(`${el.dataset.confirmed}-01`);
    if (isNaN(confirmed)) return;
    const days = (now - confirmed) / (1000 * 60 * 60 * 24);
    if (days >= THRESHOLD_DAYS && !el.querySelector('.rate-source-stale')) {
      const warn = document.createElement('span');
      warn.className = 'rate-source-stale';
      warn.textContent = ' ※確認から1年以上経過しています。最新の金額は各リンク先でご確認ください。';
      el.appendChild(warn);
    }
  });
}
document.addEventListener('DOMContentLoaded', markStaleSources);

// 楽天ランキングAPI(2026-09-06追加、コンテンツ拡充レビュー#4)。商品検索APIとは別の、楽天公式の
// ジャンル別売れ筋ランキングを表示する。アンケート回答等のデータ蓄積を待たずに導入できる施策。
// ジャンルIDは楽天市場のカテゴリ絞り込みURL(例: search.rakuten.co.jp/search/mall/{keyword}/{genreId}/)
// から実機確認して取得(2026-09-06時点、祝儀袋=210194、香典袋=567467)。
const RAKUTEN_RANKING_VERSION = '20220601';

async function fetchRakutenRanking(genreId, hits) {
  const cacheKey = `ranking|${genreId}`;
  if (rakutenProductCache.has(cacheKey)) return rakutenProductCache.get(cacheKey);
  const url = new URL(`https://openapi.rakuten.co.jp/ichibaranking/api/IchibaItem/Ranking/${RAKUTEN_RANKING_VERSION}`);
  url.searchParams.set('applicationId', RAKUTEN_APP_ID);
  url.searchParams.set('accessKey', RAKUTEN_ACCESS_KEY);
  url.searchParams.set('affiliateId', RAKUTEN_API_AFFILIATE_ID);
  url.searchParams.set('genreId', String(genreId));
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatVersion', '2');
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    // formatVersion=2はitems(小文字)直下に商品情報が並ぶが、念のため商品検索APIと同じItems/Item
    // 構造が返ってきた場合にも対応できるようにしておく。
    const raw = data.items || data.Items || [];
    const items = raw.map((entry) => entry.Item || entry).slice(0, hits || 4);
    rakutenProductCache.set(cacheKey, items);
    return items;
  } catch (e) {
    return [];
  }
}

function rankingCardHtml(item, rank) {
  const img = rakutenImage(item);
  const price = Number(item.itemPrice).toLocaleString('ja-JP');
  const name = String(item.itemName || '').replace(/</g, '&lt;');
  return `
    <a class="product-card" href="${String(item.itemUrl || '').replace(/"/g, '&quot;')}" target="_blank" rel="noopener sponsored" data-ga-name="${name.replace(/"/g, '&quot;').slice(0, 60)}" data-ga-price="${Number(item.itemPrice) || 0}">
      <div class="product-image-wrap">
        <img src="${img.replace(/"/g, '&quot;')}" alt="${name.replace(/"/g, '&quot;')}" loading="lazy"><span class="product-pr">PR</span>
        <div class="product-badges"><span class="product-badge product-badge--rank">${rank}位</span></div>
      </div>
      <p class="product-name">${name}</p>
      <p class="product-price">¥${price}</p>
    </a>`;
}

async function showRanking(genreId, containerId) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  try {
    const items = await fetchRakutenRanking(genreId, 4);
    if (!items.length) { grid.classList.remove('show'); return; }
    grid.innerHTML = '<div class="product-band-grid">' + items.map((item, i) => rankingCardHtml(item, i + 1)).join('') + '</div>';
    grid.classList.add('show');
  } catch (e) {
    grid.classList.remove('show');
  }
}

// ランキングカードのクリック計測(全ページ共通、containerIdをranking-gridに統一しているため
// ページごとの個別リスナー登録は不要)。
document.addEventListener('click', (e) => {
  const card = e.target.closest('#ranking-grid .product-card');
  if (!card || typeof gtag !== 'function') return;
  gtag('event', 'ranking_click', {
    item_name: card.dataset.gaName || '',
    price: Number(card.dataset.gaPrice) || 0,
  });
});

async function fetchRakutenProducts(keyword, hits, minPrice, maxPrice) {
  const cacheKey = `${keyword}|${hits}|${minPrice ?? ''}|${maxPrice ?? ''}`;
  if (rakutenProductCache.has(cacheKey)) return rakutenProductCache.get(cacheKey);
  const url = new URL(`https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/${RAKUTEN_API_VERSION}`);
  url.searchParams.set('applicationId', RAKUTEN_APP_ID);
  url.searchParams.set('accessKey', RAKUTEN_ACCESS_KEY);
  url.searchParams.set('affiliateId', RAKUTEN_API_AFFILIATE_ID);
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('sort', '-reviewCount');
  url.searchParams.set('hits', String(hits));
  if (minPrice != null) url.searchParams.set('minPrice', String(Math.max(1, Math.round(minPrice))));
  if (maxPrice != null) url.searchParams.set('maxPrice', String(Math.round(maxPrice)));
  url.searchParams.set('format', 'json');
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    const items = (data.Items || []).map((entry) => entry.Item || entry);
    rakutenProductCache.set(cacheKey, items);
    return items;
  } catch (e) {
    return [];
  }
}
