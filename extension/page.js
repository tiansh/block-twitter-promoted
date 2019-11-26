; (function () {

  const debugEnabled = localStorage.getItem('__block_twitter_promoted_debug__') === 'enable';

  /*
   * Modify the store object, remove any Promoted contents in it.
   */
  const cleanPromoted = function (state) {
    const catchWrap = function (f) {
      return function (...args) {
        try {
          return f(...args);
        } catch (e) { /* ignore */ }
        return (void 0);
      };
    };
    const getLayoutItem = catchWrap((prefix, subPrefix) => {
      const list = Object.keys(state.urt)
        .filter(name => name.split('-')[0] === prefix)
        .map(name => state.urt[name]);
      if (!subPrefix) return list;
      return list.map(catchWrap(inner => (
        inner.entries.filter(entry => entry.entryId.split('-')[0] === subPrefix)
      ))).reduce((a, b) => a.concat(b || []), []);
    });
    [{
      // Trends
      ruleName: 'Trend',
      getLists: catchWrap(() => (getLayoutItem('explore', 'trends').map(item => item.content.items))),
      isPromoted: catchWrap(item => item.content.promotedMetadata),
    }, {
      // Tweet; Home
      ruleName: 'Tweet Home',
      getLists: catchWrap(() => getLayoutItem('home').map(item => item.entries)),
      isPromoted: catchWrap(item => item.content.promotedMetadata),
    }, {
      // Tweet; User
      ruleName: 'Tweet User',
      getLists: catchWrap(() => getLayoutItem('userTweets').map(item => item.entries)),
      isPromoted: catchWrap(item => item.content.promotedMetadata),
    }, {
      // Who to follow
      ruleName: 'Follow',
      getLists: catchWrap(() => (getLayoutItem('userTweets', 'whoToFollow').map(item => item.content.items))),
      isPromoted: catchWrap(item => item.content.promotedMetadata),
    }, {
      // Who to follow
      ruleName: 'User Suggest',
      getLists: catchWrap(() => [state.recommendations.profile_accounts_sidebar.recommendations]),
      isPromoted: catchWrap(item => state.entities.users.entities[item.user_id].promoted_content),
    }].forEach(({ ruleName, getLists, isPromoted }) => {
      const lists = getLists() || [];
      lists.forEach(list => {
        if (!list || !Array.isArray(list)) return;
        let len = list.length, i, j;
        for (i = j = 0; i < len; i++) {
          if (!isPromoted(list[i])) {
            list[j++] = list[i];
          } else {
            if (debugEnabled) {
              console.log('BlockTwitterPromoted | Promoted blocked by %s: %o', ruleName, list[i]);
            }
          }
        }
        list.length = j;
      });
    });
  };

  /*
   * The Store object is just created. No subscribe may already be injected
   * at this time. We inject our modifier as first subscriber. Since we are
   * injected before any other subscriber, we can modify the store object
   * in-place without getting any troubles.
   */
  const wrapStore = function (Store) {
    if (debugEnabled) {
      console.log('BlockTwitterPromoted | Got Redux store: %o', Store);
    }
    Store.subscribe(() => {
      cleanPromoted(Store.getState());
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
          if (debugEnabled) {
            console.error('BlockTwitterPromoted | Error:\n%o', e);
          }
        }
      }
      return result;
    },
  });

}());
