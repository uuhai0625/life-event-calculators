// 楽天関連の設定・共通処理(全9計算機ページ共通、2026-09-01に9ファイル個別ハードコードから集約)。
// 運営持続可能性レビュー(2026-08-31)の指摘: APP_ID/ACCESS_KEY/AFFILIATE_ID/バージョン番号が
// 9ファイルに個別ハードコードされており、次回の楽天API仕様変更時に9箇所を直す必要があった。
// このファイルを各ページのHTMLでscript.jsより先に読み込むことで、変更箇所を1箇所に集約する。

// RAKUTEN_AFFILIATE_ID: uuhai0625ブランド用の楽天アフィリエイトID(2026-08-11登録・取得済み)。
// 楽天アフィリエイトの公式「リンク作成」ツールで実際に生成したリンクの形式に合わせている。
const RAKUTEN_AFFILIATE_ID = '567f9cc6.631b3687.567f9cc7.3d3a8a85';

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
