/*Copyright (C) 2022-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/**
 * This is the browser implementation of common/Database.
 */
//import { Database } from "../common/Database.js";

import { Uint8ArrayToBase64, Base64ToUint8Array } from "../common/Utils.js";

/* global localStorage */

/**
 * Simple implemention of {@linkcode Database} for use
 * in the browser, using localStorage.
 * @implements Database
 */
class BrowserDatabase /* extends Database */ {

  keys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      let m;
      if ((m = /^xanado_(.*)$/.exec(key)))
        keys.push(m[1]);
    }
    return Promise.resolve(keys);
  }

  set(key, data) {
    localStorage.setItem(
      `xanado_${key}`,
      Uint8ArrayToBase64(data));
    return Promise.resolve();
  }

  get(key) {
    const data = localStorage.getItem(`xanado_${key}`);
    if (data === null)
      return Promise.reject(`"${key}" was not found`);
    try {
      return Promise.resolve(Base64ToUint8Array(data));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  rm(key) {
    localStorage.removeItem(`xanado_${key}`);
    return Promise.resolve();
  }
}

export { BrowserDatabase, Uint8ArrayToBase64, Base64ToUint8Array }
