/*Copyright (C) 2019-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/*
 *  Interactive interface to CheckStrings translations checker
 */

import { CheckStrings } from "../test/CheckStrings.js";

import readline from "readline/promises";
import { promises as Fs } from "fs";

class Check extends CheckStrings {
  // Prompt to change the id of string
  // return -2 to abort the run, -1 to ask again, 0 for no change, 1
  // if the string was changed
  async changeLabel(lang, string, probably) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    console.log(this.strings[lang][string]);
    const q = `Change ID "${string}"${probably ? (' to "'+probably+'"') : ""} in ${lang} [yNq]? `;
    return rl.question(q)
    .then(answer => {
      rl.close();
      switch (answer) {
      case "q": case "Q": // quit
        return -2;
      case undefined: case "": case "n": case "N":
        return 0;
      case 'y': case 'Y':
        if (probably) {
          answer = probably;
          break;
        }
      }
      if (this.strings[lang][answer]) {
        console.error(`${answer} is already used in ${lang}`);
        return -1; // conflict, try again
      }
      console.log(`\tChanging "${string}" to "${answer}" in ${lang}`);
      for (const lang in this.strings) {
        this.strings[lang][answer] = this.strings[lang][string];
        delete this.strings[lang][string];
      }
      const rs = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(["'])${rs}\\1`, "g");
      const filesChanged = {};
      for (const file in this.fileContents) {
        const m = /i18n\/(.*)\.json$/.exec(file);
        if (m) {
          // A i18n/.json file. If the label is changed in qqq, change it everywhere.
          // If it's just changing local to a single lang, only change it there
          if (lang === "qqq" || m[1] === lang) {
            this.fileContents[file] = JSON.stringify(this.strings[m[1]], null, "  ");
            filesChanged[file] = true;
          }
        } else if (lang === "qqq" && re.test(this.fileContents[file])) {
          // Another file, only change the label when qqq is changing
          this.fileContents[file] =
          this.fileContents[file].replace(re, `"${answer}"`);
          filesChanged[file] = true;
        }
      }
      return Promise.all(
        Object.keys(filesChanged)
        .map(file => Fs.writeFile(file, this.fileContents[file])))
      .then(() => 1);
    });
  }
}

const cs = new Check(console);
cs.check();
