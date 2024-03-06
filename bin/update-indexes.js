/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information. Author Crawford Currie http://c-dot.co.uk*/

import path from "path";
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { promises as Fs } from "fs";

/**
 * Update index.json files in the css, i18n, editions and dictionaries
 * directories. These files are required on simple http servers that
 * don't support server-side scripting (i.e. when the Xanado code is running
 * "standalone"
 */

/**
 * Index a single directory.
 * @param {string} dir path to directory
 * @param {function} filt filter function to select files in the directory
 * for inclusion in the index
 * @param {RegExp?} rip optional regular expression that rips off any
 * unwanted part of the filename (e.g. extension)
 * @return {Promise} promise that resolves to undefined
 * @private
 */
function index(dir, filt, rip) {
  //console.debug("Index", dir, filt, rip);
  return Fs.readdir(dir)
  .then(files => files.filter(f => filt(path.resolve(dir, f))))
  .then(list => rip ? list.map(f => f.replace(rip, "")) : list)
  .then(list => {
    console.debug(`Writing ${dir}/index.json`);
    return Fs.writeFile(`${dir}/index.json`, JSON.stringify(list));
  });
}

/**
 * Update index.json files in the css, i18n, editions and dictionaries
 * directories. These files are required on simple http servers that
 * don't support server-side scripting (i.e. when the Xanado code is running
 * "standalone"
 * @param {string} root path to root directory for project
 * @return {Promise} promise that resolves to undefined
 */
function updateIndexes(root) {
  console.debug("Building index.json files for directories");
  console.debug("These files are used by the standalone version");
  return Promise.all([
    index(path.resolve(root, "css"),
          f => /(^|\W)[^_]\w*\.css$/i.test(f),
         /\.css$/),
    index(path.resolve(root, "i18n"),
          f => !/(^|\W)(index|qqq)\.json$/.test(f)
          && /\.json$/.test(f),
          /\.json?$/),
    index(path.resolve(root, "editions"),
          f => !/(^|\W)(index|Test|Tiny)\.json$/.test(f)
          && /\.json$/.test(f),
          /\.json$/),
    index(path.resolve(root, "dictionaries"),
          f => /\.dict$/.test(f),
          /\.dict$/)
  ]);
};

updateIndexes(path.normalize(path.join(__dirname, "..")));

