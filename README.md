# 相場ノート (life-event-calculators)

冠婚葬祭・ライフイベントの金額目安を計算する無料ツールサイトです。

公開URL: https://uuhai0625.github.io/life-event-calculators/

## 概要

- ご祝儀・香典、出産祝い、結婚祝い、プレゼント予算、お中元・お歳暮、餞別・送別ギフト、長寿祝いなど、間柄・年代・場面を選ぶだけで金額の目安を計算できる計算機を9本公開しています。
- 各ページは複数の情報源(冠婚葬祭専門サイト・業界団体等)を比較したうえで金額を較正し、出典と確認日を明記しています。
- 楽天アフィリエイト(検索リンク+楽天商品検索APIによる商品カード表示)で収益化しています。

## 技術構成

- ビルド不要の静的サイト(素の HTML / CSS / JavaScript のみ)。フレームワーク・パッケージマネージャは使用していません。
- GitHub Pages でホスティング(`main` ブランチ直下がそのまま公開されます)。
- GA4(`ga.js`)でアクセス解析、Google Search Console / Bing Webmaster Tools にサイトマップを送信済みです。
- 楽天関連の設定・共通処理(APP_ID・アフィリエイトID・商品検索APIの呼び出し)は `rakuten-shared.js` に集約しています。各ページの `script.js` より先に読み込む前提です。

## ディレクトリ構成

```
app/
├── index.html          # ポータルページ(ツール一覧・運営者情報)
├── style.css            # 全ページ共通スタイル
├── ga.js                 # GA4計測タグ
├── rakuten-shared.js     # 楽天API設定・共通fetch処理
├── robots.txt / sitemap.xml
├── privacy/              # プライバシーポリシー
└── <計算機名>/
    ├── index.html
    └── script.js         # そのページ固有の計算ロジック
```

計算機ごとのディレクトリ(`goshugi-koden` / `shussan-iwai` / `partner-present` / `kekkon-iwai` / `ochugen-oseibo` / `senbetsu` / `chouju-iwai` / `koden-sofubo` / `koden-yujin-oya`)はすべて同じ構成です。

## ローカル動作確認

`_devserver.ps1` を実行するとローカルサーバーが立ち上がります。ただし楽天商品検索APIは許可Webサイトをドメイン単位(`uuhai0625.github.io`)で制限しているため、商品カード表示の確認は本番ドメインで行う必要があります(`localhost` では動作しません)。

## 新しい計算機ページを追加する場合

1. 既存ページ(単一シーン構成なら `shussan-iwai`、複数シーン切替なら `goshugi-koden`)をテンプレートとしてコピーする。
2. `.site-tagline` をそのページの主題に書き換える(H1として使われます)。
3. `sitemap.xml` に新しい URL を `lastmod` 付きで追加する。
4. テーマに合った専用の OGP 画像(1200×630)を用意し、`og:image` 系メタタグを差し替える。
5. 相場データは実在するソース(複数)で裏取りしたうえで `.rate-source`(`data-confirmed="YYYY-MM"` 付き)に出典と確認日を明記する。
6. 商品カードは、贈答品の実売価格が金額と連動するテーマなら価格帯別表示(`shussan-iwai` 型)、金額と連動しない付随品(祝儀袋・香典袋等)なら人気順表示(`goshugi-koden` 型)を選ぶ。

## ライセンス

`LICENSE` を参照してください。
