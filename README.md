An browser extension that helps you hide promoted content on `twitter.com`.

## Developing

This extension inject a page script which remove promoted content in Redux Store before it been rendered. See `page.js` for more details.

## Debugging

Execute following codes in console of `twitter.com`, and refresh the page to view logs.

```javascript
localStorage.setItem('__block_twitter_promoted_debug__', 'enable')
```

