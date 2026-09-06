// 楽天関連の設定・共通処理(fetchRakutenRanking/showRanking含む)は../rakuten-shared.jsに集約。
// このページは計算機ではなく解説記事のため、金額に応じたshowProducts()検索ではなく
// 祝儀袋・香典袋2ジャンルの人気ランキング(showRanking)をそのまま表示する。
showRanking(210194, 'ranking-grid-gosyugi');
showRanking(567467, 'ranking-grid-koden');
