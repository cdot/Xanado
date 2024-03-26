/*Copyright (C) 2019-2023 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

import assert from "assert";
global.assert = assert;

import { promises as Fs } from "fs";
import path from "path";
//import { Platform } from "../common/Platform.js";
import { I18N } from "./I18N.js";
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Implementation of {@linkcode common/Platform} for use in node.js.
 * @implements Platform
 */
class ServerPlatform /* extends Platform */ {

  static i18n = I18N;

  /**
   * @implements Platform
   */
  static trigger(/*e, args*/) {
    //assert.fail(`ServerPlatform.trigger ${e} ${args}`);
  }

  /**
   * @implements Platform
   */
  static parsePath(p) {
    return path.parse(p);
  }

  /**
   * @implements Platform
   */
  static formatPath(p) {
    return path.format(p);
  }

  /**
   * @implements Platform
   */
  static getFilePath(p) {
    return path.normalize(`${__dirname}/../../${p || ""}`);
  }

  /**
   * @implements Platform
   */
  static readTextFile(p) {
    return Fs.readFile(p)
    .then(d => d.toString());
  }

  /**
   * @implements Platform
   */
  static readJSONFile(p) {
    return Fs.readFile(p)
    .then(d => JSON.parse(d.toString()));
  }

  /**
   * @implements Platform
   */
  static readBinaryFile(p) {
    return Fs.readFile(p);
  }
}

export { ServerPlatform }
