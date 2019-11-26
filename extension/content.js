; (function () {

  const script = document.createElement('script');
  script.src = browser.runtime.getURL('page.js');
  script.addEventListener('load', () => { script.remove(); });
  document.documentElement.appendChild(script);

}());
