/*Copyright (C) 2019-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* global assert */

/** @module */

/**
 * Generate a unique 16-character key using a-z0-9
 * @param {string[]?} miss optional array of pregenerated keys to miss
 * @return {string} a key not already in miss
 */
function genKey(miss) {
  const chs = "0123456789abcdef".split("");
  if (miss) {
    let key;
    do {
      key = genKey();
    } while (key in miss);
    return key;
  }
  const s = [];
  for (let i = 0; i < 16; i++)
    s.push(chs[Math.floor(Math.random() * 16)]);
  return s.join("");
}

/**
 * Generate readable (though not parseable) representation of object,
 * for use in debugging. Easier to read than JSON.stringify. Used instead
 * of toString() and valueOf() which are inconsistent between platforms.
 */
function stringify(value) {
  // Based on Crockford's polyfill for JSON.stringify.

  switch (typeof value) {
  case "undefined":
    return "?";
  case "string":
    return `"${value}"`;
  case "number":
  case "boolean":
  case "null":
    return String(value);
  }

  // Due to a specification blunder in ECMAScript,
  // typeof null is "object"
  if (!value)
    return "null";

  // Use the stringify function, if the object has one.
  if (typeof value === "object"
      && typeof value.stringify === "function")
    return value.stringify();

  const partial = [];

  // Built-in types
  if (value instanceof Date)
    return value.toISOString();

  // Is the value an array?
  if (Object.prototype.toString.apply(value) === "[object Array]") {
    for (const v of value)
      partial.push(stringify(v));

    return `[${partial.join(",")}]`;
  }

  // Otherwise this is an object
  for (const k in value) {
    if (Object.prototype.hasOwnProperty.call(value, k)) {
      const v = stringify(value[k]);
      if (v)
        partial.push(`${k}:${v}`);
    }
  }
  return `{${partial.join(",")}}`;
}

/**
 * Parse the URL to extract parameters. Arguments following `?` are
 * returned as keys in a map. The portion of the URL before `?` is
 * returned in the argument map using the special key
 * `_URL`. Arguments that have no value are set to boolean
 * `true`. Repeated arguments are not supported (the last value will
 * be the one taken). Values recognised as floating-point numbers are
 * converted to numbers. A `(` immediately following a `=` is interpreted
 * as wrapping a sub-object, thus:
 * ```
 * example?colours=(red=F00,green=0F0,blue=00F)
 * ```
 * will be parsed as:
 * ```
 * { _URL: "example", colours: { red: "F00", green: "0F0", blue: "00F" }}
 * ```
 * `;` and `(` in values must be be escaped by url encoding.
 * @return {Object<string,string>} key-value map
 */
function parseURLArguments(url) {
  let args = "", match;
  if ((match = /^(.*?)\?(.*)?$/.exec(url))) {
    url = match[1];
    args = match[2] || "";
  }

  // Replace nested blocks with placeholders
  const placeholders = [];
  let changed = true;
  while (changed) {
    //console.log("Scan", args);
    changed = false;
    args = args.replace(/([^;&(=]+)=\(([^()]*)\)/g, (match, k, v) => {
      placeholders.push(v);
      changed = true;
      const res = `${k}=?${placeholders.length - 1}?`;
      //console.debug(`Hoisted ${v} => ${res}`);
      return res;
    });
  }

  function parseArgs(args) {
    const obj = {};
    args = args.replace(/([;&]|^)([^;&(=]+)=\?(\d+)\?/g, (match, i, k, v) => {
      //console.debug("Expand", v);
      v = placeholders[v];
      //console.debug(`Object ${match}, ${k} = ${v}`);
      obj[decodeURIComponent(k)] = parseArgs(v, {});
      return "";
    })
    .replace(/([;&]|^)([^;&=]*)=([^;&]*)/g, (match, i, k, v) => {
      //console.debug(`Value ${match}, ${k} = ${v}`);
      const key = decodeURIComponent(k);
      if (v.length === 0)
        obj[key] = "";
      else {
        const nvalue = Number(v);
        if (isNaN(nvalue))
          obj[key] = decodeURIComponent(v);
        else
          obj[key] = nvalue;
      }
      return "";
    })
    .replace(/[^;&=]+/g, match => {
      //console.debug(`Boolean ${match}`);
      obj[decodeURIComponent(match)] = true;
      return "";
    });

    if (/[^;&]/.test(args))
      throw new Error(`Unparseable ${args}`);

    return obj;
  }

  const obj = parseArgs(args);
  obj._URL = url;
  return obj;
}

/**
 * Encode an object in a URL that can be parsed by
 * (#parseURLArguments).
 * The special key `_URL`, if it is present, is put in front of the
 * "?".  Arguments are added to the URL in alphabetical order. Note
 * that only keys that have the value types `boolean`, `number`,
 * `string` and `object` are included. All other keys in the object
 * are ignored. Keys that have a boolean value are only included if
 * that value is `true`. Sub-objects are supported using the bracket
 * syntax described in (#parseURLArguments)
 * @param {object} params broken down URL in the form created by
 * parseURLArguments
 * @return {string} a URL string
 */
function makeURL(params) {

  // Enhanced encodeURIComponent to encode ();&=?
  function enc(s) {
    return encodeURIComponent(s)
    .replace(/[();&?]/g, m => `%${m.charCodeAt(0).toString(16)}`);
  }

  function makeArgs(obj) {
    const args = [];
    for (const k of Object.keys(obj).sort()) {
      if (k === "_URL")
        continue;
      if (!k || k[0] === "_")
        throw new Error(`${k}: makeURL does not support keys starting with _`);
      let v = obj[k];
      switch (typeof v) {
      case "boolean":
        if (v)
          args.push(enc(k));
        break;
      case "object":
        if (v !== null)
          args.push(`${enc(k)}=(${makeArgs(v)})`);
        break;
      case "number":
        if (!isNaN(v))
          args.push(`${enc(k)}=${v}`);
        break;
      case "string":
        args.push(`${enc(k)}=${enc(v)}`);
      }
    }
    return args.join(";");
  }
  return `${params._URL || ""}?${makeArgs(params)}`;
}

/**
 * Format a time interval in seconds for display in a string e.g
 * `formatTimeInterval(601)` -> `"10:01"`
 * Maximum ordinal is days.
 * @param {number} t time period in seconds
 */
function formatTimeInterval(t) {
  const neg = (t < 0) ? "-" : "";
  t = Math.abs(t);
  const s = `0${t % 60}`.slice(-2);
  t = Math.floor(t / 60);
  const m = `0${t % 60}`.slice(-2);
  t = Math.floor(t / 60);
  if (t === 0) return `${neg}${m}:${s}`;
  const h = `0${t % 24}`.slice(-2);
  t = Math.floor(t / 24);
  if (t === 0) return `${neg}${h}:${m}:${s}`;
  return `${neg}${t}:${h}:${m}:${s}`;
}

/**
 * Compatibility: Map from a string value to an integer. Enumerations
 * used to use strings, now they use integers, and we have to map based
 * on the type encountered in data.
 */
function toEnum(n, compat) {
  // assume undefined=>0, which should be the case for all enums
  if (typeof n === "undefined") return 0;
  if (typeof n === "number") return n;
  let nn = Number(n);
  if (Number.isNaN(nn)) {
    // Map to enum through string->enum mapping
    nn = compat[n];
    if (nn < 0) debugger;
    assert(nn >= 0, n);
    return nn;
  }
  return nn;
}

/**
 * Convert an Uint8Array containing arbitrary byte data into a Base64
 * encoded string, suitable for use in a Data-URI
 * @param {Uint8Array} a8 the Uint8Array to convert
 * @return {string} Base64 bytes (using MIME encoding)
 * @private
 */
function Uint8ArrayToBase64(a8) {
  let nMod3 = 2;
  let sB64Enc = "";
  const nLen = a8.length;

  // Convert a base 64 number to the charcode of the character used to
  // represent it
  function uint6ToB64(nUInt6) {
    return nUInt6 < 26 ?
    nUInt6 + 65 :
    nUInt6 < 52 ?
    nUInt6 + 71 :
    nUInt6 < 62 ?
    nUInt6 - 4 :
    nUInt6 === 62 ?
    43 :
    nUInt6 === 63 ?
    47 :
    65;
  }

  // For each byte in the buffer
  for (let nUInt24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
    nMod3 = nIdx % 3;
    nUInt24 |= a8[nIdx] << (16 >>> nMod3 & 24);
    if (nMod3 === 2 || nLen - nIdx === 1) {
      sB64Enc += String.fromCharCode(
        uint6ToB64(nUInt24 >>> 18 & 63),
        uint6ToB64(nUInt24 >>> 12 & 63),
        uint6ToB64(nUInt24 >>> 6 & 63),
        uint6ToB64(nUInt24 & 63));
      nUInt24 = 0;
    }
  }

  return sB64Enc.substr(0, sB64Enc.length - 2 + nMod3) +
  (nMod3 === 2 ? "" : nMod3 === 1 ? "=" : "==");
}

/**
 * Convert a MIME-Base64 string into an array of arbitrary
 * 8-bit data
 * @param {string} sB64Enc the String to convert
 * @return {Uint8Array}
 * @private
 */
function Base64ToUint8Array(sB64) {
  const sB64Enc = sB64.replace(/[^A-Za-z0-9+/]/g, ""); // == and =
  const nInLen = sB64Enc.length;
  const nOutLen = nInLen * 3 + 1 >> 2;
  const ta8 = new Uint8Array(nOutLen);
  // Convert Base64 char (as char code) to the number represented
  function b64ToUInt6(nChr) {
    return nChr > 64 && nChr < 91 ?
    nChr - 65 :
    nChr > 96 && nChr < 123 ?
    nChr - 71 :
    nChr > 47 && nChr < 58 ?
    nChr + 4 :
    nChr === 43 ?
    62 :
    nChr === 47 ?
    63 :
    0;
  }

  for (let nMod3, nMod4, nUInt24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
    nMod4 = nInIdx & 3;
    nUInt24 |= b64ToUInt6(sB64Enc.charCodeAt(nInIdx)) <<
    6 * (3 - nMod4);
    if (nMod4 === 3 || nInLen - nInIdx === 1) {
      for (nMod3 = 0; nMod3 < 3 &&
           nOutIdx < nOutLen; nMod3++, nOutIdx++) {
        ta8[nOutIdx] = nUInt24 >>> (16 >>> nMod3 & 24) & 255;
      }
      nUInt24 = 0;
    }
  }
  return ta8;
}

export {
  genKey, stringify,
  parseURLArguments, makeURL,
  formatTimeInterval,
  toEnum,
  Uint8ArrayToBase64, Base64ToUint8Array
}
