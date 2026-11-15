(function () {
  var bootstrapScript = document.currentScript;
  if (bootstrapScript && !document.querySelector('link[rel~="icon"]')) {
    var favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/svg+xml';
    favicon.href = new URL('../../img/brand-mark.svg', bootstrapScript.src).href;
    document.head.appendChild(favicon);
  }
  try {
    var theme = localStorage.getItem('pitch-point:template-theme') || 'system';
    var dark = theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch (_) { }
  var themeMeta = document.querySelector('meta[name="theme-color"]') || document.createElement('meta');
  themeMeta.name = 'theme-color';
  themeMeta.content = document.documentElement.dataset.theme === 'light' ? '#f1f7f2' : '#101914';
  if (!themeMeta.parentNode) document.head.appendChild(themeMeta);
  document.documentElement.classList.add('page-initializing');
  window.setTimeout(function () { document.documentElement.classList.remove('page-initializing'); }, 8000);
})();
