/* SimSpin : les données de la roue sont isolées avant le démarrage du jeu.
   Le code original de SimSpin reste inchangé. */
(() => {
  'use strict';
  const owner = window.frameElement?.getAttribute('data-sg-uid') || '';
  const nativeGet = Storage.prototype.getItem;
  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;
  const nativeClear = Storage.prototype.clear;
  const nativeKey = Storage.prototype.key;
  const scope = key => owner ? 'spingames.account.' + owner + '.' + key : 'spingames.guest.' + key;
  const isGameKey = key => typeof key === 'string' && key.startsWith('simspin.');
  const target = () => owner ? localStorage : sessionStorage;
  Storage.prototype.getItem = function(key) {
    return this === localStorage && isGameKey(String(key))
      ? nativeGet.call(target(), scope(String(key))) : nativeGet.call(this, key);
  };
  Storage.prototype.setItem = function(key, value) {
    return this === localStorage && isGameKey(String(key))
      ? nativeSet.call(target(), scope(String(key)), value) : nativeSet.call(this, key, value);
  };
  Storage.prototype.removeItem = function(key) {
    return this === localStorage && isGameKey(String(key))
      ? nativeRemove.call(target(), scope(String(key))) : nativeRemove.call(this, key);
  };
  // Les éventuelles opérations de parcours continuent sur la zone native.
})();