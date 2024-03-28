/*Copyright (C) 2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env worker */
/* global assert */

self.assert = (cond, mess) => {
  if (!cond) {
    console.error("Assertion failure: " + mess);
    throw Error(mess);
  }
};

assert.fail = mess => self.assert(false, mess);

// A webpacked worker has import.meta.url as a file:// URL, which is handy because
// packed workers have the URL root at "..", while unpacked (debug) workers have
// it at "../.."
const ROOT_REL = (/^file:/.test(import.meta.url)) ? ".." : "../..";

/**
 * Web Worker implementation of {@linkcode Platform}.
 * @implements Platform
 */
class WorkerPlatform /*extends Platform*/ {

  /**
   * @implements Platform
   */
  static absolutePath(p) {
    return `${ROOT_REL}/${p}`.replace(/\/\/+/g, "/");
  }

  /**
   * @implements Platform
   */
  static getText(path) {
    return fetch(path)
    .then(response => response.text());
  }

  /**
   * @implements Platform
   */
  static getJSON(path) {
    return fetch(path)
    .then(response => response.text())
    .then(json => JSON.parse(json));
  }

  /**
   * @implements Platform
   */
  static getBinary(path) {
    return fetch(path)
    .then(response => response.arrayBuffer())
    .then(ab => new Uint8Array(ab));
  }

  /**
   * @implements Platform
   */
  static parsePath(p) {
    const bits = /^(.*\/)?([^/]*)(\.\w+)?$/.exec(p);
    return {
      root: "",
      dir: (bits[1] || "").replace(/\/$/, ""),
      name: bits[2] || "",
      ext: bits[3] || ""
    };
  }

  /**
   * @implements Platform
   */
  static formatPath(p) {
    const bits = [];
    if (p.dir && p.dir.length > 0)
      bits.push(p.dir);
    else if (p.root && p.root.length > 0)
      bits.push(p.root);
    if (p.base && p.base.length > 0)
      bits.push(p.base);
    else {
      if (p.name && p.name.length > 0)
        bits.push(p.name + p.ext);
    }
    return bits.join("/");
  }
}

/* c8 ignore stop */

export { WorkerPlatform }
