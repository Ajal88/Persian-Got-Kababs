/* Tiny persistence layer: IndexedDB (falls back to memory if the browser blocks it). */
(function (root) {
  'use strict';
  const DB = 'kabab-showdown', STORE = 'kv';
  let dbp = null;
  const mem = {};

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (e) { reject(e); }
    }).catch(() => null);
    return dbp;
  }

  function tx(mode, fn) {
    return open().then((db) => new Promise((resolve) => {
      if (!db) return resolve(fn(null));
      const t = db.transaction(STORE, mode);
      const r = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(r && r.result !== undefined ? r.result : undefined);
      t.onerror = () => resolve(undefined);
    }));
  }

  const Store = {
    get(key) { return tx('readonly', (s) => (s ? s.get(key) : { result: mem[key] })); },
    set(key, val) { return tx('readwrite', (s) => { if (s) s.put(val, key); else mem[key] = val; }); },
    del(key) { return tx('readwrite', (s) => { if (s) s.delete(key); else delete mem[key]; }); },
    clear() { return tx('readwrite', (s) => { if (s) s.clear(); else Object.keys(mem).forEach((k) => delete mem[k]); }); },

    /** Read an image file, shrink it, return a JPEG/PNG data URL. */
    image(file, max = 1400) {
      return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onerror = reject;
        fr.onload = () => {
          const img = new Image();
          img.onerror = reject;
          img.onload = () => {
            const k = Math.min(1, max / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            const png = /png|svg|webp|gif/i.test(file.type);
            resolve(c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.88));
          };
          img.src = fr.result;
        };
        fr.readAsDataURL(file);
      });
    },
  };
  root.KAStore = Store;
})(window);
