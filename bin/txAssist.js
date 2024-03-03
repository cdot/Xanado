const HELP = `Translation assistant

Usage: node ${process.argv[1]} <action>

<language code> is an ISO language code e.g. "es" for Spanish.

<action> can be:

csv <language code>
      read i18n/<language code>.json and output CSV containing strings
      for the language with their qqq and english translations, to
      assist translators.  Example: node ${process.argv[1]} csv de
      to output CSV for German.

text
      output a simple english phrase list sorted by key for feeding to
      an online translation service such as google translate.  The
      translated list will be written to i18n/<language code>.txt -
      don't worry about translations of the keys, it's the order
      that's important.

keys <language code>
      read i18n/<language code>.txt which must contain *translated*
      versions of each string sorted in the order of qqq and output
      it again with the matching keys from qqq.

json <language code>
      read i18n/<language code>.txt which must contain *translated*
      versions of each string sorted in the order of qqq and output
      the strings in json.

rename <old key> <new key>
      rename the key <old key> to <new key> across all json files.
      Does not touch .txt files, and does not change source code
      or HTML

To use the assistant you need a \`i18n/qqq.json\` file describing all
of the strings, and an \`i18n/en.json\` that gives English for the
strings.

Use the "csv" action to generate a spreadsheet for sharing with human
translators.

Use the "text" action to generate a text document containing each of
the keys and the english strings, each separated by a colon. Paste
this document into Google translate (other translation services are
available) and paste the result back into <language code>.txt.

Then use the "json" action to generate the json for <language code>.json

Note that translation services often mangle $N placeholders in text strings.
The script tries to fix this, but may fail if any of your strings has a
singleton \`$\` in it.
`;

import readline from "readline/promises";
import { promises as Fs } from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { format as csv } from "@fast-csv/format";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const i18n_path = path.normalize(path.join(__dirname, "..", "i18n"));

const action = process.argv[2];
const lingo = process.argv[3];

const langs = {};

// Prompt to change the id of string
// return -2 to abort the run, -1 to ask again, 0 for no change, 1
// if the string was changed.
// TODO: will only work when all fileContents are loaded, look at
// CheckStrings.js
function changeLabel(lang, string, probably) {
  console.log(this.strings[lang][string]);
  const q = `Change ID "${string}"${probably ? (' to "'+probably+'"') : ""} in ${lang} [yNq]? `;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

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
          const newContents = JSON.stringify(this.strings[m[1]], null, "  ");
          if (newContents) {
            this.fileContents[file] = newContents;
            filesChanged[file] = true;
          }
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

Fs.readdir(i18n_path)
.then(d => Promise.all(d.filter(f => f != "index.json" && /\.json$/.test(f))
                       .map(f => Fs.readFile(path.join(i18n_path, f))
                            .then(b => (b.length > 0 ? JSON.parse(b.toString()) : {}))
                            .then(lang => langs[f.replace(/\.json$/, "")] = lang))))
.then(() => {
  const qqqks = Object.keys(langs.qqq).sort();
  const isoNow = new Date().toISOString();

  switch (action) {

  case "rename":
    const from = lingo;
    const to = process.argv[4];
    let writes = [];
    for (const lang in langs) {
      if (!langs[lang][from])
        throw new Error(`Cannot find old key ${from} in ${lang}`);
      if (langs[lang][to])
        throw new Error(`${to} is already in ${lang}`);
      langs[lang][to] = langs[lang][from];
      delete langs[lang][from];
      langs[lang]["@metadata"]["last-updated"] = isoNow;
      writes.push(Fs.writeFile(path.join(i18n_path, `${lang}.json`),
                               JSON.stringify(langs[lang], null, 2)));
    }
    return Promise.all(writes);
    break;

  case "text":
    const news = [];
    for (const k of qqqks)
      if (k != "@metadata") news.push(`${k}: ${langs.en[k]}`);
    console.log(news.join(".\n"));
    break;

  case "keys":
    return Fs.readFile(path.join(i18n_path, `${lingo}.txt`))
    .then(b => {
      const tx = b.toString().split(/[\r\n]+/);
      let ti = 0, qi = 0;
      while (true) {
        while (ti < tx.length && tx[ti].indexOf(":") < 0) ti++;
        if (ti === tx.length) break;
        if (qqqks[qi] === "@metadata") qi++;
        const ks = tx[ti].split(/: /);
        ks.shift();
        const qk = qqqks[qi++];
        const tk = ks.length === 0 ? " " : ks.join(": ");
        console.log(`${qk}: ${tk.replace(/(\d+) \$/g, "$$$1")
        .replace(/\$ (\d+)/g, "$$$1")}`);
        ti++;
      }
    });

  case "json":
    return Fs.readFile(path.join(i18n_path, `${lingo}.txt`))
    .then(b => {
      const tx = b.toString().split(/\.*[\r\n]+/);
      const newlang = {
        "@metadata": {
          authors: [ "txAssist.js" ],
          "last-updated": isoNow,
          locale: lingo
        }
      };
      let ti = 0, qi = 0;
      while (true) {
        while (ti < tx.length && tx[ti].indexOf(":") < 0) ti++;
        if (ti === tx.length) break;
        if (qqqks[qi] === "@metadata") qi++;
        const ks = tx[ti].split(/: /);
        ks.shift();
        const qk = qqqks[qi++];
        const tk = ks.length === 0 ? " " : ks.join(": ");
        //if (tk !== qk)
        //  console.warn(`Key translation "${tk}" != "${qk}"`);
        newlang[qk] = tk.replace(/(\d+) \$/g, "$$$1")
        .replace(/\$ (\d+)/g, "$$$1");
        ti++;
      }
      console.log(JSON.stringify(newlang, null, 2));
    });

  case "csv":
    const stream = csv();
    stream.pipe(process.stdout);
    for (const k of qqqks) {
      if (k == "@metadata") continue;
      stream.write([
        k,
        langs.qqq[k],
        langs.en[k],
        langs[lingo][k]
      ]);
    }
    break;

  default:
    throw new Error(`Unrecognised action ${action}\n\n${HELP}`);
  }
});


