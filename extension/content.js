; (function () {

  const optionsPromise = browser.storage.sync.get('btpOptions');
  const script = document.createElement('script');
  script.src = browser.runtime.getURL('page.js');
  script.async = false;
  script.addEventListener('load', async function () {
    script.remove();
    const options = (await optionsPromise).btpOptions || {};
    window.wrappedJSObject.__btpUserOptions__(JSON.stringify(options));
  });
  document.documentElement.appendChild(script);

}());
