Block promoted contents including tweets, trends, and, follows, hide more annoying contents, switch to Latest Tweets for home page on Twitter.

## Developing

This extension inject a page script which remove promoted content in Redux Store before it been rendered. See `page.js` for more details.

### What features may be implemented

This extension is based on inject into Redux Store.
Basing on current implementation, the extension may only hides something / change pages' options.
It is not possible to create new interface (new buttons for example) easily on top of current implementation.

### Enable Debugging

You may enable debugging in options page.
After debugging enabled, you can see console logs on related web pages when extension is running.

### Adding Features

If you want to add some more features, you should:

1. Edit `_locals/en/messages.json`, add its options description
2. Edit `options/options.js`, add a new option op options page
3. Edit `page.js`, your codes should be similar to current features

### Implementation of Features

This extension's implementation is focused on Redux Store.
You may find the Store object in console.
When debugging is enabled, a global variable `Store` is set by extension.
So you can get the `Store` object easily.
Access `Store.getState()` to get current `state`.

* Most layout items may be found in `state.urt`.
* Tweets, trends, and other entities may be found in `state.entities`.

### Contributing

Code contribution are welcomed.
Please use same coding style in as current exist codes.
You may verify this by using `eslint`.

Pull requests are welcomed. But please prefer to file an issue first to make sure the feature is needed.

### Translations

Translating is also welcomed. If you want make this extension speak your language, you can add a localize file in `_locals/TWO_LETTER_LANGUAGE_NAME/messages.json` and translate current English version to it. If you don't know how to work with `git`. You may also download the `_locals/en/messages.json` file from GitHub, translate it, and paste the content to file an issue here.

## About

This is an independent project developed by [@tiansh111] and has no relationship to Twitter or Twitter Inc.

This extension is released under the MPL-2.0 License. You are welcomed to make a fork as long as you followed the license requirements.

[@tiansh111]: https://twitter.com/tiansh111

