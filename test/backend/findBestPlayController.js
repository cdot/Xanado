/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha */
/* global describe, it, before */

import { assert } from "chai";
import { setupPlatform, UNit} from "../TestPlatform.js";

import { Game } from "../../src/game/Game.js";
import { findBestPlay } from "../../src/backend/findBestPlayController.js";
const Player = Game.CLASSES.Player;
const Tile = Game.CLASSES.Tile;
const Rack = Game.CLASSES.Rack;
const Move = Game.CLASSES.Move;

import { CBOR } from "../../src/game/CBOR.js";

describe("game/findBestPlay", () => {
  before(setupPlatform);

  it("monster", function() {
    return Game.unpack({
      a: 1711107496900,
      b: 'FEW----D--LINER-MA----U-Z-A---BUN-PLAtFORm---E--QI--Y-NUB---R-JUG----EG----R--O-C---R(5)I--T-OH(8)E--EAVES(7)DAYS-EX(9)T--ON(10)O--C(11)N-STAID(7)HIM-A--O(7)IN--L--V(7)EG(5)E(7)',
      c: 1,
      d: 'British_English',
      e: 'English_Scrabble',
      i: true,
      k: '102c170081bf810a',
      m: 1711106722655,
      P0: { k: 'Computer', n: 'Computer', r: true, R: 'OTETIOS-', s: 269 },
      P1: { k: 'You', n: 'You', R: 'LIARAKD-', s: 323 },
      T0: {
        w0: '18_EAVES',
        P0: '7-3!E',
        P1: '7-4!A',
        P2: '7-5!V',
        P3: '7-6!E',
        P4: '7-7!S',
        s: 18,
        m: 1711106722760,
        n: 'You',
        p: 'Computer',
        r0: '1!N',
        r1: '2!O',
        r2: '4!T',
        r3: '5!A',
        r4: '6!Q',
        t: 0
      },
      T1: {
        w0: '18_COVEN',
        P0: '5-5!C',
        P1: '6-5!O',
        P2: '8-5!E',
        P3: '9-5!N',
        s: 18,
        m: 1711106756392,
        n: 'Computer',
        p: 'You',
        r0: '0!J',
        r1: '3!E',
        r2: '5!G',
        r3: '6!B',
        t: 0
      },
      T2: {
        w0: '28_QUOTE',
        P0: '3-3!Q',
        P1: '4-3!U',
        P2: '5-3!O',
        P3: '6-3!T',
        s: 28,
        m: 1711106756582,
        n: 'You',
        p: 'Computer',
        r0: '2!D',
        r1: '3!N',
        r2: '4!S',
        r3: '6!Y',
        t: 0
      },
      T3: {
        w0: '22_JUG',
        P0: '4-2!J',
        P1: '4-4!G',
        s: 22,
        m: 1711106775094,
        n: 'Computer',
        p: 'You',
        r0: '0!I',
        r1: '5!R',
        t: 0
      },
      T4: {
        w0: '15_QUOTES',
        w1: '12_DAYS',
        P0: '8-0!D',
        P1: '8-1!A',
        P2: '8-2!Y',
        P3: '8-3!S',
        s: 27,
        m: 1711106775475,
        n: 'You',
        p: 'Computer',
        r0: '2!P',
        r1: '4!L',
        r2: '5!I',
        r3: '6!I',
        t: 0
      },
      T5: {
        w0: '33_BERRIED',
        P0: '2-0!B',
        P1: '3-0!E',
        P2: '4-0!R',
        P3: '5-0!R',
        P4: '6-0!I',
        P5: '7-0!E',
        s: 33,
        m: 1711106802230,
        n: 'Computer',
        p: 'You',
        r0: '1!E',
        r1: '2!A',
        r2: '3!E',
        r3: '4!U',
        r4: '5!N',
        r5: '6!E',
        t: 0
      },
      T6: {
        w0: '11_QI',
        w1: '6_PIG',
        P0: '2-4!P',
        P1: '3-4!I',
        s: 17,
        m: 1711106802512,
        n: 'You',
        p: 'Computer',
        r0: '2!G',
        r1: '6!T',
        t: 0
      },
      T7: {
        w0: '10_BUN',
        P0: '2-1!U',
        P1: '2-2!N',
        s: 10,
        m: 1711106859532,
        n: 'Computer',
        p: 'You',
        r0: '4!A',
        r1: '5!O',
        t: 0
      },
      T8: {
        w0: '20_ATONING',
        P0: '9-1!T',
        P1: '10-1!O',
        P2: '11-1!N',
        P3: '12-1!I',
        P4: '13-1!N',
        P5: '14-1!G',
        s: 20,
        m: 1711106859902,
        n: 'You',
        p: 'Computer',
        r0: '0!D',
        r1: '1!O',
        r2: '2!C',
        r3: '3!T',
        r4: '5!A',
        r5: '6!A',
        t: 0
      },
      T9: {
        w0: '6_IE',
        w1: '2_IN',
        w2: '9_EG',
        P0: '13-0!I',
        P1: '14-0!E',
        s: 17,
        m: 1711107038815,
        n: 'Computer',
        p: 'You',
        r0: '0!F',
        r1: '6!M',
        t: 0
      },
      T10: {
        w0: '2_ON',
        w1: '14_OCTAL',
        P0: '9-4!O',
        P1: '10-4!C',
        P2: '11-4!T',
        P3: '12-4!A',
        P4: '13-4!L',
        s: 16,
        m: 1711107039206,
        n: 'You',
        p: 'Computer',
        r0: '0!U',
        r1: '1!X',
        r2: '2!I',
        r3: '3!N',
        r4: '5!Z',
        t: 0
      },
      T11: {
        w0: '8_MU',
        w1: '2_AN',
        w2: '8_MA',
        P0: '1-1!M',
        P1: '1-2!A',
        s: 18,
        m: 1711107058662,
        n: 'Computer',
        p: 'You',
        r0: '5!W',
        r1: '6!V',
        t: 0
      },
      T12: {
        w0: '17_EX',
        w1: '17_EX',
        P0: '8-6!X',
        s: 34,
        m: 1711107059200,
        n: 'You',
        p: 'Computer',
        r0: '1!S',
        t: 0
      },
      T13: {
        w0: '5_EMU',
        w1: '6_WAN',
        w2: '27_FEW',
        P0: '0-0!F',
        P1: '0-1!E',
        P2: '0-2!W',
        s: 38,
        m: 1711107071467,
        n: 'Computer',
        p: 'You',
        r0: '0!O',
        r1: '3!L',
        r2: '5!F',
        t: 0
      },
      T14: {
        w0: '16_STAID',
        P0: '11-3!S',
        P1: '11-5!A',
        P2: '11-6!I',
        P3: '11-7!D',
        s: 16,
        m: 1711107072133,
        n: 'You',
        p: 'Computer',
        r0: '1!R',
        r1: '2!E',
        r2: '4!H',
        r3: '6!G',
        t: 0
      },
      T15: {
        w0: '24_DOVE',
        P0: '12-7!O',
        P1: '13-7!V',
        P2: '14-7!E',
        s: 24,
        m: 1711107086066,
        n: 'Computer',
        p: 'You',
        r0: 'b1! ',
        r1: 'b4! ',
        r2: '6!R',
        t: 0
      },
      T16: {
        w0: '17_HEX',
        w1: '9_OH',
        P0: '6-6!H',
        s: 26,
        m: 1711107086660,
        n: 'You',
        p: 'Computer',
        r0: '4!O',
        t: 0
      },
      T17: {
        w0: '16_PLATFORM',
        P0: '2-5!L',
        P1: '2-6!A',
        P2: 'b2-7!T',
        P3: '2-8!F',
        P4: '2-9!O',
        P5: '2-10!R',
        P6: 'b2-11!M',
        s: 66,
        m: 1711107120071,
        n: 'Computer',
        p: 'You',
        r0: '0!I',
        r1: '1!Y',
        r2: '2!R',
        r3: '3!B',
        r4: '4!A',
        r5: '5!U',
        r6: '6!D',
        t: 0
      },
      T18: {
        w0: '36_ZONER',
        P0: '1-9!Z',
        P1: '3-9!N',
        P2: '4-9!E',
        P3: '5-9!R',
        s: 36,
        m: 1711107120786,
        n: 'You',
        p: 'Computer',
        r0: '1!T',
        r1: '2!N',
        r2: '3!O',
        r3: '5!R',
        t: 0
      },
      T19: {
        w0: '33_DUTY',
        P0: '0-7!D',
        P1: '1-7!U',
        P2: '3-7!Y',
        s: 33,
        m: 1711107340137,
        n: 'Computer',
        p: 'You',
        r0: '4!A',
        r1: '5!H',
        r2: '6!A',
        t: 0
      },
      T20: {
        w0: '2_NU',
        w1: '6_EG',
        w2: '8_RUG',
        P0: '3-10!U',
        P1: '4-10!G',
        s: 16,
        m: 1711107340840,
        n: 'You',
        p: 'Computer',
        r0: '3!L',
        r1: '4!E',
        t: 0
      },
      T21: {
        w0: '12_IAMB',
        w1: '10_NUB',
        P0: '0-11!I',
        P1: '1-11!A',
        P2: '3-11!B',
        s: 22,
        m: 1711107471457,
        n: 'Computer',
        p: 'You',
        r0: '0!L',
        r1: '1!I',
        r2: '6!M',
        t: 0
      },
      T22: {
        w0: '15_LINER',
        P0: '0-10!L',
        P1: '0-12!N',
        P2: '0-13!E',
        P3: '0-14!R',
        s: 15,
        m: 1711107472274,
        n: 'You',
        p: 'Computer',
        r0: '2!E',
        r1: '3!T',
        r2: '4!I',
        r3: '6!S',
        t: 0
      },
      T23: {
        w0: '6_HIE',
        w1: '16_HIM',
        P0: '12-0!H',
        P1: '12-2!M',
        s: 22,
        m: 1711107496900,
        n: 'Computer',
        p: 'You',
        r0: '5!K',
        r1: '6!D',
        t: 0
      },
      s: 1,
      t: 0,
      u: true,
      v: 0,
      w: 'Computer'
    }).then(game => {
      let bestMoves = [];
      game._debug = console.debug;
      game.timerType = Game.Timer.TURN;
      game.timeAllowed = 2/60; // 2 seconds = 2/60 of a minute
      this.timeout(3000); // mocha timeout
      return findBestPlay(
        game, game.players[0].rack.tiles(),
        move => {
          //console.log(move);
          assert(move instanceof Move);
          bestMoves.push(move);
        },
        game.dictionary)
      .then(() => {
        let bm = bestMoves.pop();
        assert.equal(bm.words[0].word, "PLATFORMS");
      })
      .catch(e => console.error(e));
    });
  });
});
