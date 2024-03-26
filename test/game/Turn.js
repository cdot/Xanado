import { assert } from "chai";
import { setupPlatform } from "../TestPlatform.js";
import { Edition } from "../../src/game/Edition.js";
import { EndState } from "../../src/game/Turn.js";
import { Game } from "../../src/game/Game.js";
const Turn = Game.CLASSES.Turn;
/* global describe, before, it */

describe("game/Turn", () => {
  
  before(setupPlatform);

  it("pack / unpack challenge loss", () => {
    const t = new Turn({
      score: -5,
      type: Turn.Type.CHALLENGE_LOST,
      playerKey: "player",
      nextToGoKey: "next",
      challengerKey: "challenger",
      timestamp: 1234567890
    });

    const expected = { s: -5, c: 'challenger', m: 1234567890, n: 'next', p: 'player', t: 3 };

    const packed = t.pack();
    assert.deepEqual(packed, expected);

    // Edition not needed because we don't rebuild any tiles
    const nt = new Turn().unpack(expected);
    assert.deepEqual(nt, t);
  });

  it("pack / unpack place/replace", () => {
    return Edition.load("English_Scrabble")
    .then(edition => {
      const t = new Turn({
        score: 0,
        type: Turn.Type.SWAPPED,
        playerKey: "robot",
        nextToGoKey: "human",
        placements: [
          { letter: "S", score: edition.letterScore("S"), row: 1, col: 2 },
          { letter: "H", score: edition.letterScore(" "), row: 1, col: 3, isBlank: true, isLocked: true },
          { letter: "I", score: edition.letterScore(" "), row: 1, col: 4, isBlank: true },
          { letter: "T", score: edition.letterScore("T"), row: 1, col: 5, isLocked: true }
        ],
        replacements: [
          { letter: "A", score: edition.letterScore("A") },
          { letter: "Q", score: edition.letterScore("Q") }
        ],
        timestamp: 1234567890
      });

      const expected = {
        P0: '2-1!S',
        P1: 'B3-1!H',
        P2: 'b4-1!I',
        P3: 'l5-1!T',
        s: 0,
        m: 1234567890,
        n: 'human',
        p: 'robot',
        r0: '!A',
        r1: '!Q',
        t: 1
      };
      const packed = t.pack();
      //console.log(packed);
      assert.deepEqual(packed, expected);
      
      const nt = new Turn().unpack(expected, edition);
      //console.log(nt);
      assert.deepEqual(nt, t);
    });
  });
  
  it("pack / unpack GAME OVER", () => {
    const t = new Turn({
      score: 0,
      type: Turn.Type.GAME_ENDED,
      playerKey: "robot",
      endState: Game.State.TWO_PASSES,
      endStates: [
        new EndState({
          tiles: -1,
          time: 2,
          tilesRemaining: "X,Y"
        }),
        new EndState({
          tiles: 3,
          time: 4,
          tilesRemaining: "Z"
        })
      ],
      timestamp: 1234567890
    });

    const packed = t.pack();
    const expected = {
      s: 0,
      e: 4,
      e0: { t: -1, T: 2, r: 'X_Y' },
      e1: { t: 3, T: 4, r: 'Z' },
      m: 1234567890,
      p: 'robot',
      t: 2
    };
    assert.deepEqual(packed, expected);

    // Edition not needed because we don't rebuild any tiles
    const nt = new Turn().unpack(expected);
    assert.deepEqual(nt, t);
  });
});
