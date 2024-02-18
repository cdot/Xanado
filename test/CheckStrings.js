/*Copyright (C) 2019-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/**
 * Check that strings occur in code and translations files
 */

import { promises as Fs } from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// Maximum length for a string identifier
const MAX_ID_LENGTH = 15;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const basePath = path.normalize(path.join(__dirname, ".."));

class CheckStrings {

  // report: object supporting error, warn, log linke console
  constructor(report) {
    this.report = report;
    // map string to file where it was found. Seed with @metadata which is
    // always in .json files
    this.found = { "@metadata": "all .json" };
    // map file path to contents
    this.fileContents = {};
    // strings for different languages, indexed on language code
    this.strings = {};
  }

  async changeLabel(lang, string, probably) {
    return 0;
  }

  // Add string to found list
  addString(string, file) {
    if (!this.found[string])
      this.found[string] = {};
    this.found[string][file] = true;
  }
  
  // Recursively load all files with given extension into fileContents
  // return a promise that resolves to a flat list of files loaded
  load(file, ext, exclude) {
    file = path.normalize(file);
    if (ext.test(file) && (!exclude || !exclude.test(file))) {
      return Fs.readFile(file)
      .then(buff => this.fileContents[file] = buff.toString())
      .then(() => [ file ]);
    }
    return Fs.readdir(file)
    .then(files => Promise.all(
      files.map(
        f => this.load(path.join(file, f), ext, exclude)))
          .then(files => files.flat()))
    .catch(e => []);
  }
  
  // Scan file for occurrences of re in the given files
  // and add them to this.found list
  scan(files, re) {
    let m;
    for (const file of files) {
      while ((m = re.exec(this.fileContents[file])))
        this.addString(m[2], file);
    }
    return files;
  }
  
  // check the paramers of string 'id' match in qqqString and the langString
  checkParameters(id, qqqString, langString, mess) {
    if (/^_.*_$/.test(qqqString))
      return;
    let m, rea = /(\$\d+)/g;
    while ((m = rea.exec(qqqString))) {
      let p = m[1];
      const reb = new RegExp(`\\${p}([^\\d]|\$)`);
      if (!reb.test(langString))
        mess.push(`\t"${id}": ${p} not found in "${langString}"`);
    }
    while ((m = rea.exec(langString))) {
      let p = m[1];
      const reb = new RegExp(`\\${p}([^\\d]|\$)`);
      if (!reb.test(qqqString))
        mess.push(`\t"${id}": ${p} unexpected in "${langString}"`);
    }
  }
  
  async checkIDs() {
    for (const string in this.strings.qqq) {
      if (string.length > MAX_ID_LENGTH
          && !/^Types\./.test(this.strings.qqq[string])) {
        this.report.error(`"${string}" is too long for a label`);
        let go = -1;
        while (go === -1) {
          await this.changeLabel("qqq", string)
          .then(g => go = g);
        }
        if (go === -2)
          break;
      }
    }
  }
  
  check() {
    return Promise.all([
      // load with scan to extract strings
      this.load(path.join(basePath, "html"), /\.html$/)
      .then(files => this.scan(
        files, /data-i18n(?:|-placeholder|-tooltip)=(["'])(.*?)\1/g)),
      this.load(path.join(basePath, "src"), /\.js$/)
      .then(files => this.scan(files, /\.i18n\s*\(\s*(["'])(.*?)\1/g))
      .then(files => this.scan(files, /\/\*i18n\*\/\s*(["'])(.*?)\1/g)),
      // just to get fileContents
      this.load(path.join(basePath, "test"), /\.ut$/),
      this.load(path.join(basePath, "i18n"), /\.json$/, /^index\.json$/),
      Fs.readdir(`${__dirname}/../i18n`)
      .then(lingos => Promise.all(
        lingos.filter(f => /\.json$/.test(f) && !/^index\.json$/.test(f))
        .map(lingo => Fs.readFile(path.join(basePath, "i18n", lingo))
             .then(json => {
               const lang = lingo.replace(/\.json$/, "");
               this.strings[lang] = JSON.parse(json);
             })
             .catch(e => {
               this.report.error(`Parse error reading ${lingo}`);
               throw e;
             }))))
    ])
    .then(async () => {   
      let qqqError = false;
      
      // Check strings are in qqq and add to en if necessary
      for (const string of Object.keys(this.found).sort()) {
        if (!this.strings.qqq[string]) {
          this.report.error(`"${string}" not found in qqq`);
          this.strings.qqq[string] = string;
          qqqError = true;
        }
      }
      
      // Check strings in qqq.json occur at least once in html/js
      for (const string of Object.keys(this.strings.qqq)
                 .filter(s => !this.found[s])) {
        this.report.error(
          `"${string}" was this.found in qqq, but is not used in code`);
        delete this.strings.qqq[string];
        qqqError = true;
      }
      
      if (qqqError)
        throw Error("qqq.json must be correct");
      
      for (const lang of Object.keys(this.strings).filter(l => l !== "qqq")) {
        let mess = [];
        
        // Check that all keys in qqq are also in other language
        for (const string of Object.keys(this.strings.qqq)) {
          if (!this.strings[lang][string])
            mess.push(`\t"${string}" : qqq "${this.strings.qqq[string]}" en "${this.strings.en[string]}"`);
        }
        if (mess.length > 0)
          this.report.error(`${lang} is missing translations for:\n${mess.join("\n")}`);
        
        // check that the same parameters are present in translated strings
        let messes = 0;
        for (const string of Object.keys(this.strings[lang])) {
          if (this.strings.qqq[string] && this.strings[lang][string]) {
            mess = [];
            this.checkParameters(string, this.strings.qqq[string], this.strings[lang][string], mess);
            if (mess.length > 0) {
              messes++;
              if (messes == 1)
                this.report.warn(`${lang} has parameter inconsistencies:\n${mess.join("\n")}`);
            }
          }
        }
        
        for (const string of Object.keys(this.strings[lang])) {
          if (!this.strings.qqq[string]) {
            this.report.error(`${lang}: id "${string}" was not found in qqq`);
            for (const enlabel in this.strings.en) {
              if (this.strings.en[enlabel] == string) {
                this.report.log(`${string} is the English translation for id ${enlabel}`);
                await this.changeLabel(lang, string, enlabel);
              }
            }
          }
        }
        
        if (lang !== "en") {
          mess = [];
          for (const id of Object.keys(this.strings[lang])) {
            if (!this.strings.en[id])
              console.debug("WANK",id, lang);
            if (this.strings[lang][id] == this.strings.en[id] && this.strings.en[id].length > 1)
              mess.push(`\t${id} : "${this.strings.en[id]}"`);
          }
          if (mess.length > 0)
            this.report.warn(
              `${lang} has strings that are the same as in English\n${mess.join("\n")}`);
        }
      }
    })
    .then(() => this.checkIDs());
  }
}

export { CheckStrings }
