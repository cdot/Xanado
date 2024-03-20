/*Copyright (C) 2019-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

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
 * converted to numbers.
 * @return {Object<string,string>} key-value map
 */
function parseURLArguments(url) {
  let args = "", match;
  const urlArgs = { _URL: url };
  if ((match = /^(.*?)\?(.*)?$/.exec(url))) {
    urlArgs._URL = match[1];
    args = match[2] || "";
  }
  const arglist = args.split(/[;&]/);
  for (const assignment of arglist) {
    if (assignment === "") continue;
    match = /^(.*?)=(.*)$/.exec(assignment);
    if (match) {
      const key = decodeURIComponent(match[1]);
      const svalue = match[2];
      if (svalue.length === 0)
        urlArgs[key] = "";
      else {
        const nvalue = Number(svalue);
        if (isNaN(nvalue))
          urlArgs[key] = decodeURIComponent(svalue);
        else
          urlArgs[key] = nvalue;
      }
    } else
      urlArgs[decodeURIComponent(assignment)] = true;
  }
  return urlArgs;
}

/**
 * Reassemble a URL that has been parsed into parts by
 * parseURLArguments. Key names and values are url-encoded.  The
 * special key `_URL`, if it is present, is put in front of the
 * "?". Arguments are added to the URL in alphabetical order. Note
 * that only keys that have the value types `booolean`, `number` and
 * `string` are included. All other key-value pairs are ignored. Keys
 * that have a boolean value are only included if that value is
 * `true`.
 * @param {object} args broken down URL in the form created by
 * parseURLArguments
 * @return {string} a URL string
 */
function makeURL(parts) {
  const args = Object.keys(parts)
        .filter(f => f && !/^_/.test(f))
        .sort()
        .map(k => {
          switch (typeof parts[k]) {
          case "boolean":
            if (parts[k])
              return encodeURIComponent(k);
            // fall-through deliberate
          default:
            return undefined;
          case "number":
            if (isNaN(parts[k]))
              return undefined;
            // fall-through deliberate
          case "string":
            return `${encodeURIComponent(k)}=${encodeURIComponent(parts[k])}`
            // node.js encodeURIComponent does not follow the standard!
            .replace(/;/g, "%3B");
          }
        });
  const s = args.filter(f => f).join(";");
  return `${parts._URL || ""}?${s}`;
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

export { genKey, stringify, parseURLArguments, makeURL, formatTimeInterval }
