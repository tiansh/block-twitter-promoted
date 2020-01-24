; (async function () {

  /** @type {HTMLDivElement} */
  const configPanel = document.getElementById('config_panel');
  /** @type {HTMLTemplateElement} */
  const configTemplate = document.getElementById('config_template');

  const features = [{
    id: 'hidePromoted',
    template: 'optionHidePromoted',
    initial: true,
    version: 1,
  }, {
    id: 'hideTimelineSuggestionTweet',
    template: 'optionHideTimelineSuggestionTweet',
    initial: false,
    version: 3,
  }, {
    id: 'hideTimelineModule',
    template: 'optionHideTimelineModule',
    initial: false,
    version: 3,
  }, {
    id: 'hideTimelineInjections',
    template: 'optionHideTimelineInjections',
    initial: false,
    version: 5,
  }, {
    id: 'hideTrendCard',
    template: 'optionHideTrendCard',
    initial: false,
    version: 3,
  }, {
    id: 'useLatestTimeline',
    template: 'optionUseLatestTimeline',
    initial: false,
    version: 3,
  }, {
    id: 'enableDebug',
    template: 'optionEnableDebug',
    initial: false,
    version: 4,
  }];

  const options = await (async function () {
    const raw = (await browser.storage.sync.get('btpOptions')).btpOptions;
    if (typeof raw !== 'object' || !raw) return {};
    const normalized = Object.assign({}, ...features.map(({ id }) => raw[id] == null ? {} : { [id]: Boolean(raw[id]) }));
    if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
      browser.storage.sync.set({ btpOptions: normalized });
    }
    return normalized;
  }());

  features.forEach(option => {
    const { id, template, initial } = option;
    const enabled = Boolean(options[id] == null ? initial : options[id]);
    const dom = configTemplate.content.cloneNode(true);
    const checkbox = dom.querySelector('.config-check input');
    checkbox.checked = enabled;
    checkbox.id = id;
    const label = dom.querySelector('.config-title label');
    label.htmlFor = id;
    label.textContent = browser.i18n.getMessage(template);
    configPanel.appendChild(dom);
    checkbox.addEventListener('change', function () {
      options[id] = checkbox.checked;
      browser.storage.sync.set({ btpOptions: options });
    });
  });

  document.title = browser.i18n.getMessage('optionTitle');

}());
