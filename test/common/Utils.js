/*Copyright (C) 2019-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env mocha */

import { assert } from "chai";
import { genKey, stringify, parseURLArguments, makeURL, formatTimeInterval } from "../../src/common/Utils.js";
import { UNit } from "../TestPlatform.js";
/* global describe, it, BigInt */

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

  it("parseURLArguments - sub-object", () => {
    const p = parseURLArguments("?a=(b=(c;d=%28%26%29);e);f=(g)");
    assert.deepEqual(p, {
      _URL: "",
      a: {
        e: true,
        b: {
          c: true,
          d: "(&)"
        }
      },
      f: {
        g: true
      }
    });
  });

  it("parseURLArguments - missing ;", () => {
    const p = parseURLArguments("?a=(b=(c;d=)%28%26%29)");
    assert.deepEqual(p, { _URL: "", a: { "(&)": true, b: { c: true, d: ""  }}});
  });

  it("parseURLArguments - empty", () => {
    let p = parseURLArguments("?");
    assert.deepEqual(p, { _URL: "" });
    p = parseURLArguments("");
    assert.deepEqual(p, { _URL: "" });
  });

  it("parseURLArguments - game", () => {
    const p = parseURLArguments("http://example?P0=(R=--I--E--;k=Computer;n=Computer;r;s=314);P1=(R=%288%29;k=You;n=You;s=305);T0=(P0=6-7!T;P1=7-7!O;P2=8-7!W;P3=9-7!A;P4=10-7!R;P5=11-7!D;m=1710875489962;n=You;p=Computer;r=DNADGO;s=24;t=0);T1=(P0=5-8!F;P1=6-8!A;P2=7-8!R;P3=8-8!E;P4=9-8!D;m=1711021347640;n=Computer;p=You;r=SOQOA;s=25;t=0);T10=(P0=14-7!M;P1=14-8!E;P2=14-9!G;m=1711021888140;n=You;p=Computer;r=IIV;s=26;t=0);T11=(P0=10-4!A;P1=12-4!U;P2=13-4!A;m=1711021921582;n=Computer;p=You;r=ILI;s=26;t=0);T12=(P0=13-1!T;P1=13-2!I;P2=13-3!T;P3=13-5!N;m=1711021922112;n=You;p=Computer;r=OLIY;s=14;t=0);T13=(P0=12-0!L;P1=12-1!I;P2=12-2!P;m=1711021979909;n=Computer;p=You;r=HAU;s=20;t=0);T14=(P0=1-13!V;P1=2-13!I;P2=3-13!O;P3=4-13!L;P4=5-13!I;P5=6-13!N;m=1711021980497;n=You;p=Computer;r=TEOOX%20;s=24;t=0);T15=(P0=14-11!H;P1=14-12!I;m=1711022273281;n=Computer;p=You;r=LI;s=18;t=0);T16=(P0=b3-10!D;P1=3-11!E;P2=3-12!T;P3=3-14!X;m=1711022274599;n=You;p=Computer;r=RZKR;s=38;t=0);T17=(P0=1-10!J;P1=2-10!A;P2=4-10!E;m=1711022369657;n=Computer;p=You;r=IFW;s=20;t=0);T18=(P0=2-8!Z;P1=2-9!O;m=1711022370247;n=You;p=Computer;r=HE;s=22;t=0);T19=(P0=7-0!W;P1=8-0!I;P2=9-0!L;P3=10-0!F;P4=11-0!U;m=1711022405665;n=Computer;p=You;r=GUVSR;s=39;t=0);T2=(P0=7-6!N;P1=8-6!A;P2=9-6!P;m=1711021348084;n=You;p=Computer;r=CST;s=22;t=0);T20=(P0=13-14!O;P1=14-14!K;m=1711022406380;n=You;p=Computer;r=GL;s=22;t=0);T21=(P0=6-4!V;P1=6-5!I;P2=6-6!S;m=1711022615894;n=Computer;p=You;r=ENA;s=16;t=0);T22=(P0=4-1!G;P1=5-1!Y;P2=6-1!R;P3=7-1!E;m=1711022616633;n=You;p=Computer;r=IAEE;s=21;t=0);T23=(P0=0-0!R;P1=1-0!A;P2=2-0!N;P3=3-0!G;P4=4-0!E;m=1711022676774;n=Computer;p=You;r=;s=27;t=0);T24=(P0=3-4!H;P1=4-4!A;P2=5-4!L;P3=7-4!E;P4=8-4!R;m=1711022677619;n=You;p=Computer;r=;s=24;t=0);T25=(P0=2-3!N;P1=3-3!U;m=1711022692997;n=Computer;p=You;r=;s=14;t=0);T26=(e=3;e0=(r=I%2CE;t=-2);e1=(t=2);m=1711022693052;p=Computer;s=0;t=2);T3=(P0=11-3!S;P1=11-4!Q;P2=11-5!U;P3=11-6!I;m=1711021399237;n=Computer;p=You;r=ECTS;s=30;t=0);T4=(P0=12-7!S;P1=12-8!O;P2=12-9!D;m=1711021399602;n=You;p=Computer;r=EME;s=16;t=0);T5=(P0=9-10!C;P1=10-10!O;P2=11-10!A;P3=12-10!S;P4=13-10!T;m=1711021443916;n=Computer;p=You;r=BPEYE;s=19;t=0);T6=(P0=11-11!C;P1=11-12!T;P2=11-13!E;P3=11-14!D;m=1711021444283;n=You;p=Computer;r=RN%20B;s=20;t=0);T7=(P0=6-14!O;P1=7-14!B;P2=8-14!E;P3=9-14!Y;P4=10-14!E;m=1711021550898;n=Computer;p=You;r=JNAOA;s=36;t=0);T8=(P0=9-13!B;P1=10-13!R;P2=b12-13!A;P3=13-13!M;m=1711021552081;n=You;p=Computer;r=TTMN;s=43;t=0);T9=(P0=13-8!N;P1=13-9!O;P2=13-11!E;m=1711021887590;n=Computer;p=You;r=NEU;s=13;t=0);a=1711022693052;b=R%2814%29A%289%29J--V-N--N----ZOA--I-G--UH%285%29dETOXEG--A%285%29E--L--Y--L---F----I--R--VISTA----NOWE--E-NOR%285%29BI---R-AWE%285%29EL%285%29PAD-C--BYF---A--R--O--REU--SQUID--ACTEDLIP-U--SODS--a--TITAN--NOTE-MO%287%29MEG-HI-K;c=1;d=British_English;e=English_Scrabble;i;k=dc96bb3fc5ce9db1;m=1710875489934;s=3;t=0;u;v=0;w=Computer");
    //console.log(p);
    assert.equal(p._URL, "http://example");
    assert.equal(p.w, "Computer");
    assert.deepEqual(p.P0, {
      R: "--I--E--",
      k: "Computer",
      n: "Computer",
      r: true,
      s: 314
    });
    assert.deepEqual(p.T0, {
      P0: "6-7!T",
      P1: "7-7!O",
      P2: "8-7!W",
      P3: "9-7!A",
      P4: "10-7!R",
      P5: "11-7!D",
      m: 1710875489962,
      n: "You",
      p: "Computer",
      r: "DNADGO",
      s: 24,
      t: 0
    });
    assert.deepEqual(p.T26, {
      e:3,
      e0: {
        r: "I,E",
        t: -2
      },
      e1: {
        t:2
      },
      m: 1711022693052,
      p: "Computer",
      s: 0,
      t: 2
    });
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
    const a = { _URL: "mail:", a: "b", b: true, c: "a b" };
    const e = makeURL(a);
    assert.deepEqual(parseURLArguments(e), a);
  });

  it("makeURL - encode ();&?", () => {
    const a = { _URL: "();&", "();&?": { v: "();&?" } };
    assert.equal(makeURL(a), "();&?%28%29%3B%26%3F=(v=%28%29%3B%26%3F)");
  });

  it("makeURL - ignore NaN, undefined, null, function", () => {
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

  it("makeURL - sub-object", () => {
    const args2 = {
      _URL: "urf",
      a: {
        b: {
          c: "(&)"
        }
      }
    };
    assert.equal(makeURL(args2), "urf?a=(b=(c=%28%26%29))");
  });

  it("makeURL - game", () => {
    const a = {
  _URL: 'http://example',
  P0: { R: 'DNADGPO-', k: 'Computer', n: 'Computer', s: 24, r: true },
  P1: { R: 'FDIRUEA-', k: 'You', n: 'You', s: 0 },
  T0: {
    P0: '6-7!T',
    P1: '7-7!O',
    P2: '8-7!W',
    P3: '9-7!A',
    P4: '10-7!R',
    P5: '11-7!D',
    m: 1710875489962,
    n: 'You',
    p: 'Computer',
    r: 'DNADGO',
    s: 24,
    t: 0
  },
  a: 1710875489962,
  b: '(97)T(14)O(14)W(14)A(14)R(14)D(52)',
  c: 1,
  d: 'British_English',
  e: 'English_Scrabble',
  k: 'dc96bb3fc5ce9db1',
  m: 1710875489934,
  s: 1,
  t: 0,
  v: 0,
  w: 'You',
  i: true,
  u: true
    };
    const s = makeURL(a);
    //console.log(s);
    assert.equal(s.indexOf("(97)"), -1);
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
