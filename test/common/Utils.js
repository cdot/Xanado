/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env mocha */

import { assert } from "chai";
import { genKey, stringify, parseURLArguments, makeURL, formatTimeInterval } from "../../src/common/Utils.js";

describe("common/Utils", () => {

  it("genKey", () => {
    const miss = [ genKey() ];
    for (let i = 1; i < 1000; i++)
      miss.push(genKey(miss));
    assert.equal(miss.length, 1000);
  });

  it("stringify", () => {
    class Thing {
      stringify() { return "XYZZY"; }
    }

    let thing = new Thing();

    assert.equal(stringify(thing), "XYZZY");
    assert.equal(stringify("XYZZY"), '"XYZZY"');
    assert.equal(stringify(69), '69');
    assert.equal(stringify(true), 'true');
    assert.equal(stringify(null), 'null');
    assert.equal(stringify(), '?');
    const d = new Date(100000);
    assert.equal(stringify(d), d.toISOString());
  });

  it("parseURLArguments - no arguments", () => {
    const p = parseURLArguments("http://a:9/c");
    assert.deepEqual(p, { _URL: "http://a:9/c" });
    const p2 = parseURLArguments("http://a:9/c?");
    assert.deepEqual(p, { _URL: "http://a:9/c" });
  });

  it("parseURLArguments - numbers", () => {
    const p = parseURLArguments("http://a:9/c?a=1&b=2;c=-1.5;d=1f");
    assert.deepEqual(p, { _URL: "http://a:9/c", a: 1, b: 2, c: -1.5, d: "1f" });
  });

  it("parseURLArguments - booleans and strings", () => {
    const p = parseURLArguments("https://q?x&a=&b=c=3;c=?");
    assert.deepEqual(p, { _URL: "https://q", x: true, a: "", b: "c=3", c: "?" });
  });

  it("parseURLArguments - no URL and decoded keys and strings", () => {
    const p = parseURLArguments("?a=a%20b&b%20c");
    assert.deepEqual(p, { _URL: "", a: "a b", "b c": true });
  });

  it("makeURL - strings", () => {
    const a = { _URL: "x", a: "b", b: true, c: "a b" };
    assert.equal(makeURL(a), "x?a=b;b;c=a%20b");
  });

  it("makeURL - encoding", () => {
    const a = { ";?=&": "?=&;" };
    assert.equal(makeURL(a), "?%3B%3F%3D%26=%3F%3D%26%3B");
  });

  it("makeURL - numbers", () => {
    const a = { a: 1, b: -1.5, c: 0.255e3 };
    assert.equal(makeURL(a), "?a=1;b=-1.5;c=255");
  });

  it("makeURL - round trip", () => {
    const args2 = { _URL: "mail:", a: "b", b: true, c: "a b" };
    assert.deepEqual(parseURLArguments(makeURL(args2)), args2);
  });

  it("makeURL - ignore NaN, undefined, object. function", () => {
    const args2 = {
      _URL: "urf",
      a: undefined,
      b: NaN,
      c: null,
      d: console.debug,
      e: BigInt(9007199254740991)
    };
    assert.equal(makeURL(args2), "urf?");
  });

  it("formatTimeInterval", () => {
    assert.equal(formatTimeInterval(0), "00:00");
    assert.equal(formatTimeInterval(1 * 60 + 1), "01:01");
    assert.equal(formatTimeInterval(10 * 60 + 1), "10:01");
    assert.equal(formatTimeInterval(60 * 60 + 1), "01:00:01");
    assert.equal(formatTimeInterval(24 * 60 * 60 + 1), "1:00:00:01");
    assert.equal(formatTimeInterval(2 * 24 * 60 * 60 + 1), "2:00:00:01");
    assert.equal(formatTimeInterval(365 * 24 * 60 * 60 + 1), "365:00:00:01");
    assert.equal(formatTimeInterval(-(60 * 60 + 1)), "-01:00:01");
  });

});
