// GA4計測(2026-08-13導入、プロパティ「相場ノート」)。診断ツール群と同じ空文字ガードパターン。
const GA_MEASUREMENT_ID = 'G-ZC8SM76LPC';
if (GA_MEASUREMENT_ID) {
  const gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(gaScript);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
}
