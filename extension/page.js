; (function () {

  let enableDebug = false;
  let userOptions = null;

  /*
   * Exception is harmless, some time
   * Lets ignore it
   */
  const ignoreException = ({ log = null, fallback = (void 0) } = {}) => f => function (...args) {
    try {
      return f.apply(this, args);
    } catch (e) {
      if (log && enableDebug) {
        console.error(log, e);
      }
    }
    return fallback && fallback.apply(this, args);
  };
  const mute = ignoreException();

  /*
   * We use callback instead of Promise just because we cannot do that async
   */
  class CallbackCollection {
    constructor(wrap) {
      this.callbacks = [];
      this.wrap = wrap || (x => x);
    }
    addCallback(callback) {
      this.callbacks.push(this.wrap(callback));
    }
  }

  // Callback before / after reducer of store
  const beforeStoreReducer = new CallbackCollection(ignoreException({ fallback: x => x }));
  const afterStoreReducer = new CallbackCollection(mute);
  // Callback when options is ready
  const userOptionsReady = new CallbackCollection(mute);

  userOptionsReady.addCallback(function (option) {
    userOptions = option;
  });

  /*
   * Read user option
   */
  const getOption = function (key, defaultValue) {
    const option = userOptions[key];
    if (option == null) return defaultValue;
    return option;
  };

  /*
   * Wrap the store object so we can run some codes before / after reducer
   */
  const wrapStore = function (Store) {
    if (enableDebug) {
      console.log('BlockTwitterPromoted | Got Redux store: %o', Store);
      window.Store = Store;
    }
    Store.dispatch = (function (/** @type {Function} */dispatch) {
      return function (action) {
        const modifiedAction = beforeStoreReducer.callbacks.reduce((action, callback) => {
          if (action) return callback(action, Store.getState());
          return null;
        }, action);
        if (modifiedAction) {
          return dispatch.call(this, modifiedAction);
        } else return (void 0);
      };
    }(Store.dispatch));
    /*
     * The Store object is just created. No subscribe may already be injected
     * at this time. We inject our modifier as first subscriber. Since we are
     * injected before any other subscriber, we can modify the store object
     * in-place without getting any troubles.
     */
    Store.subscribe(() => {
      afterStoreReducer.callbacks.forEach(callback => callback(Store.getState()));
    });
  };

  /*
   * Redux Store assign `Symbol('observable')` just after Store object been
   * constructed in compiled script. We add setter on
   * `Object.prototype[Symbol('observable')]`, so we can get the Store.
   */
  const observableSymbol = function (observable) {
    Object.defineProperty(Object.prototype, observable, {
      configurable: true,
      enumerable: false,
      set: function (value) {
        delete Object.prototype[observable];
        this[observable] = value;
        wrapStore(this);
      },
    });
  };

  /*
   * Wrap Symbol so we can get Symbol('observable') which is used by Redux Store
   */
  window.Symbol = new Proxy(window.Symbol, {
    apply: function (target, that, args) {
      const [description] = args;
      const result = target.apply(that, args);
      if (description === 'observable') {
        try {
          observableSymbol(result);
          window.Symbol = target;
        } catch (e) {
          if (enableDebug) {
            console.error('BlockTwitterPromoted | Error:\n%o', e);
          }
        }
      }
      return result;
    },
  });

  /*
   * Block page loading until we got user options
   */
  let pendingChunks = [];
  Object.defineProperty(window, 'webpackJsonp', {
    configurable: true,
    enumerable: false,
    get() { return (void 0); },
    set(value) {
      delete window.webpackJsonp;
      window.webpackJsonp = value;
      // in Webpack 3, webpackJsonp is Function
      // in Webpack 4, webpackJsonp is an Array, while its push is the Function
      // Login page uses Webpack 3, and we simply ignore it
      if (!Array.isArray(value)) return;
      Object.defineProperty(value, 'push', {
        configurable: true,
        enumerable: false,
        get() {
          return Object.getPrototypeOf(this).push;
        },
        set(webpackJsonpPush) {
          delete value.push;
          value.push = function push(config) {
            if (userOptions == null) {
              return pendingChunks.push(config);
            } else {
              return webpackJsonpPush.call(this, config);
            }
          };
        },
      });
    },
  });
  userOptionsReady.addCallback(function (option) {
    pendingChunks.splice(0).forEach(function (chunk) {
      window.webpackJsonp.push(chunk);
    });
    pendingChunks = null;
  });

  /*
   * Util
   */
  const arrayFilterInline = function (array, filter) {
    let len = array.length, i, j;
    for (i = j = 0; i < len; i++) {
      if (filter(array[i])) {
        array[j++] = array[i];
      }
    }
    array.length = j;
    return array;
  };

  /*
   * Features
   */

  /*
   * Common store navigation
   */
  const getLayoutItemFromState = state => (prefix, subPrefix) => {
    const list = Object.keys(state.urt)
      .filter(name => name.split('-')[0] === prefix)
      .map(name => state.urt[name]);
    if (!subPrefix) return list;
    return list.map(mute(inner => (
      inner.entries.filter(entry => entry.entryId.split('-')[0] === subPrefix)
    ))).reduce((a, b) => a.concat(b || []), []);
  };

  /*
   * Remove any Promoted contents
   */
  userOptionsReady.addCallback(function () {
    if (!getOption('hidePromoted', true)) return;
    afterStoreReducer.addCallback(function (state) {
      const getLayoutItem = ignoreException({ fallback: () => [] })(getLayoutItemFromState(state));
      [{
        // Trends
        ruleName: 'Trend',
        getLists: mute(() => (getLayoutItem('explore', 'trends').map(item => item.content.items))),
        isPromoted: mute(item => item.content.promotedMetadata),
      }, {
        // What's happening
        ruleName: 'What\'s happening',
        getLists: mute(() => (getLayoutItem('explore', 'Guide').map(item => item.content.items))),
        isPromoted: mute(item => item.content.promotedMetadata),
      }, {
        // Tweet; Home
        ruleName: 'Tweet Home',
        getLists: mute(() => getLayoutItem('home').map(item => item.entries)),
        isPromoted: mute(item => item.content.promotedMetadata),
      }, {
        // Tweet; User
        ruleName: 'Tweet User',
        getLists: mute(() => getLayoutItem('userTweets').map(item => item.entries)),
        isPromoted: mute(item => item.content.promotedMetadata),
      }, {
        // Who to follow
        ruleName: 'Follow',
        getLists: mute(() => (getLayoutItem('userTweets', 'whoToFollow').map(item => item.content.items))),
        isPromoted: mute(item => item.content.promotedMetadata),
      }, {
        // Who to follow / You might like
        ruleName: 'User Suggest',
        getLists: mute(() => Object.keys(state.recommendations)
          .filter(key => key.startsWith('profile_accounts_sidebar')).map(key => state.recommendations[key].recommendations)),
        isPromoted: mute(item => state.entities.users.entities[item.user_id].promoted_content),
      }, {
        // Explore
        ruleName: 'Explore',
        getLists: mute(() => getLayoutItem('explore').map(item => item.entries)),
        isPromoted: mute(item => item.content.promotedMetadata),
      }].forEach(({ ruleName, getLists, isPromoted }) => {
        const lists = getLists() || [];
        lists.forEach(list => {
          if (!list || !Array.isArray(list)) return;
          arrayFilterInline(list, item => {
            if (isPromoted(item)) {
              if (enableDebug) {
                console.log('BlockTwitterPromoted | Promoted blocked by %s: %o', ruleName, item);
              }
              return false;
            }
            return true;
          });
        });
      });
    });
  });

  /*
   * Annoying tweet like contents in timeline
   * e.g. tweets someone liked
   */
  userOptionsReady.addCallback(function () {
    if (!getOption('hideTimelineSuggestionTweet', false)) return;
    afterStoreReducer.addCallback(function (state) {
      const homeList = getLayoutItemFromState(state)('home');
      homeList.forEach(home => {
        arrayFilterInline(home.entries, mute(item => {
          const injectionType = item.itemMetadata.clientEventInfo.details.timelinesDetails.injectionType;
          const isAllowed = ['RankedTimelineTweet', 'RankedConversation', 'OrganicConversation', 'RankedOrganicTweet'].includes(injectionType);
          if (!isAllowed && enableDebug) {
            console.log('BlockTwitterPromoted | Special tweet blocked by injection type %s: %o', injectionType, item);
          }
          return isAllowed;
        }));
      });
    });
  });

  /*
   * Who to follow on timeline
   */
  userOptionsReady.addCallback(function () {
    if (!getOption('hideTimelineModule', false)) return;
    afterStoreReducer.addCallback(function (state) {
      const getLayoutItem = getLayoutItemFromState(state);
      const userTweetsList = getLayoutItem('userTweets');
      const home = getLayoutItem('home');
      [].concat(userTweetsList, home).forEach(tweetList => {
        arrayFilterInline(tweetList.entries, mute(item => {
          if (item.type !== 'timelineModule') return true;
          if (item.content.displayType === 'VerticalConversation') return true;
          if (enableDebug) {
            console.log('BlockTwitterPromoted | Timeline module removed: %o', item);
          }
          return false;
        }));
      });
    });
  });

  /**
   * Injections in timeline
   */
  userOptionsReady.addCallback(function () {
    if (!getOption('hideTimelineInjections', false)) return;
    afterStoreReducer.addCallback(function (state) {
      const getLayoutItem = getLayoutItemFromState(state);
      const userTweetsList = getLayoutItem('userTweets');
      const home = getLayoutItem('home');
      [].concat(userTweetsList, home).forEach(tweetList => {
        arrayFilterInline(tweetList.injections, mute(item => {
          console.log('BlockTwitterPromoted | Timeline injection removed: %o', item);
          return false;
        }));
      });
    });
  });

  /*
   * Hide trends cards
   */
  userOptionsReady.addCallback(function () {
    if (!getOption('hideTrendCard', false)) return;
    afterStoreReducer.addCallback(function (state) {
      const getLayoutItem = getLayoutItemFromState(state);
      const trendLists = getLayoutItem('explore', 'trends');
      trendLists.forEach(list => {
        list.content.items.forEach(item => {
          if (item.content.associatedCardUrls && item.content.associatedCardUrls.length) {
            if (enableDebug) console.log('BlockTwitterPromoted | Remove trend card %o: %o', item.content.associatedCardUrls, item);
            item.content.associatedCardUrls = [];
          }
        });
      });
    });
  });

  /*
   * Show latest tweets; not home (top tweets)
   */
  userOptionsReady.addCallback(function () {
    if (!getOption('useLatestTimeline', false)) return;
    beforeStoreReducer.addCallback(function (action, state) {
      if (action.type !== 'rweb/homeTimeline/CONFIGURATION_LOADED') return action;
      if (typeof action.payload.useLatest !== 'boolean') return action;
      Object.assign(action.payload, {
        useLatest: true,
        lastActiveOnLatestTimestamp: window.__META_DATA__.serverDate,
        inactivityThresholdMs: null,
        autoSwitchTimestamp: null,
        lastFrustrationEventTimestamp: null,
      });
      if (enableDebug) {
        console.log('BlockTwitterPromoted | Switched to Latest Timeline');
      }
      return action;
    });
  });

  beforeStoreReducer.addCallback(function (action, state) {
    if (enableDebug) {
      console.log('Dispatch: %o', action);
    }
    return action;
  });

  /*
   * Options
   */
  window.__btpUserOptions__ = function (data) {
    const options = JSON.parse(data);
    enableDebug = options.enableDebug || false;
    if (enableDebug) {
      console.log('BlockTwitterPromoted | user options loaded: %o', options);
    }
    delete window.__btpUserOptions__;
    userOptionsReady.callbacks.splice(0).forEach(callback => callback(options));
  };

}());
