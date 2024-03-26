/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

import { Dictionary } from "@cdot/dictionary";
const cache = {};
/* global Platform */

/** @module */

/**
 * Load dictionaries and optional .white in a platform indepedent way
 */

/**
 * Promise to load a dictionary. A dictionary can consist of a
 * `.dict` (DAWG) file, a `.white` (whitelist, text) file, or
 * both.
 * @param {string} name name of the dictionary to load. This can
 * be a be a full path to a .dict file, or it can be a simple
 * dictionary name, in which case the dictionary will be loaded from
 * `Platform.getFilePath("dictionaries")`.
 * @return {Promise} Promise that resolves to a new {@linkcode Dictionary}
 * or undefined if a dictionary of that name could not be loaded.
 */
function loadDictionary(name) {
  let path = Platform.parsePath(name);
  //console.log(name,"=>",path);
  if (path.root === "" && path.dir === "" && path.ext === "") {
    // Simple name, load from the dictionaries path. /ignore is a
    // placeholder
    path = Platform.parsePath(Platform.getFilePath("dictionaries/ignore"));
    path.name = name;
    path.ext = ".dict";
  } else if (path.ext === "") {
    // root and/or dir, but no ext
    path.ext = ".dict";
  } else
    name = path.name;
  // Get rid of path.base so Platform.formatPath uses name and ext
  delete path.base;

  if (cache[name])
    return Promise.resolve(cache[name]);

  let dict;
  const fp = Platform.formatPath(path);
  return Platform.readBinaryFile(fp)
  .then(buffer => {
    dict = new Dictionary(name);
    dict.loadDAWG(buffer.buffer);
  })
  .catch(e => {
    // Mostly harmless, .dict load failed, relying on .white
    console.debug("Failed to read", fp, e);
  })
  .then(() => {
    path.ext = ".white";
    const wp = Platform.formatPath(path);
    return Platform.readTextFile(wp)
    .then(text => {
      if (!dict)
        dict = new Dictionary(name);
      const words = text
            .toString()
            .toUpperCase()
            .split(/\r?\n/)
            .map(w => w.replace(/\s.*$/, ""))
            .filter(line => line.length > 0)
            .sort();
      words.forEach(w => dict._addWord(w));
      //console.debug("Added", added, "whitelisted words");
    })
    .catch(e => {
      // Mostly harmless, whitelist load failed, relying on .dict
      console.debug("Failed to read", wp, e);
    });
  })
  .then(() => {
    if (dict) {
      // one of .dict or .white (or both) loaded
      // Add bidirectional traversal links
      dict.addLinks();
      cache[name] = dict;
      //console.debug(`Loaded dictionary ${name}`);
    }
    return dict;
  });
}

export { loadDictionary }
