/*Copyright (C) 2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env worker */

self.assert = (cond, mess) => {
  if (!cond) {
    console.error("Assertion failure: " + mess);
    throw Error(mess);
  }
};

self.assert.fail = mess => self.assert(false, mess);

/**
 * Web Worker implementation of {@linkcode Platform}.
 * @implements Platform
 */
class WorkerPlatform /*extends Platform*/ {

  /**
   * @implements Platform
   */
  static trigger(e, args) {
    // Pass events straight to the document
    assert(false);
    //return $(document).trigger(e, args);
  }

  static i18n() {
    assert(false);
  }

  /**
   * @implements Platform
   */
  static getFilePath(p) {
    // Workers run with the current sire set to src/browser, so need to
    // back up twice to get to the root
    return `../../${p}`;
  }

  /**
   * @implements Platform
   */
  static readTextFile(path) {
    return fetch(path)
    .then(response => response.text());
  }

  /**
   * @implements Platform
   */
  static readJSONFile(path) {
    return fetch(path)
    .then(response => response.text())
    .then(json => JSON.parse(json));
  }

  /**
   * @implements Platform
   */
  static readBinaryFile(path) {
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
