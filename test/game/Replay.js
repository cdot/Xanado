/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha,node */
/* global describe, it, before */

import { assert } from "chai";

/* global Platform */ import { setupPlatform, getTestGame } from "../TestPlatform.js";

import { MemoryDatabase } from "../MemoryDatabase.js";
import { CommandsMixin } from "../../src/game/CommandsMixin.js";
import { Replay } from "../../src/game/Replay.js";
import { Undo } from "../../src/game/Undo.js";
import { Game as _Game } from "../../src/game/Game.js";
const Game = Undo(Replay(CommandsMixin(_Game)));
Game.CLASSES.Game = Game;
const Tile = Game.CLASSES.Tile;
const Turn = Game.CLASSES.Turn;

/**
 * Unit tests for replaying a game.
 */

describe("game/Replay", () => {

  function assertGameEqual(actual, expected, noTurns) {
    const elb = expected.letterBag;
    expected.letterBag = undefined;

    const alb = actual.letterBag;
    actual.letterBag = undefined;

    assert.deepEqual(alb.tiles.sort(Tile.cmp),
                     elb.tiles.sort(Tile.cmp));

    const racks = [];
    for (let i = 0; i < actual.players.length; i++) {
      let pa = actual.players[i];
      let pe = expected.getPlayerWithKey(pa.key);
      assert.deepEqual(pa.rack.letters().sort(),
                       pe.rack.letters().sort());
      //console.log("Actual",pa.key,pa.score);
      //console.log("Expect",pe.key,pe.score);
      assert.equal(pa.score, pe.score);
      racks.push({key: pa.key, pa: pa.rack, pe: pe.rack});
      pa.rack = undefined;
      pe.rack = undefined;
    }

    let eturns, aturns;
    if (noTurns) {
      eturns = expected.turns;
      aturns = actual.turns;
      expected.turns = undefined;
      actual.turns = undefined;
    }

    //assert.deepEqual(actual, expected);

    if (noTurns) {
      expected.turns = eturns;
      actual.turns = aturns;
    }

    expected.letterBag = elb;
    actual.letterBag = alb;

    for (let r of racks) {
      actual.getPlayerWithKey(r.key).rack = r.pa;
      expected.getPlayerWithKey(r.key).rack = r.pe;
    }
  }

  // Make sure the contents of the bag, all player racks,
  // and the board, are the same as the initial bag
  function checkBag(game, preBag) {
    const letters = [
      game.players.map(pl => pl.rack.letters()).flat(),
      game.board.tiles().map(bt => bt.isBlank ? " " : bt.letter),
      game.letterBag.letters()
    ];
    assert.equal(letters.flat().sort().join(""), preBag);
  }

  function promiseEditionBag(game) {
    return game.promiseEdition()
    .then(edo => {
      const preBag = [];
      for (const l of edo.bag) {
        for (let i = 0; i < l.count; i++)
          preBag.push(l.letter);
      }
      return preBag.sort().join("");
    });
  }

  /* Turns:
[
  {
    type: "swap", playerKey: "2v5oyt5qpi",
    placements: [{ "Z", 4 }],
    replacements: [{ "A", 1 }]
  },
  {
    type: "play", playerKey: "49dabe7iua",
    score: 25,
    words: [{ "DARN", 10 }],
    placements: [
      { "D", 2, @2,5 },
      { "A", 1, @3,5 },
      { "R", 1, @4,5 },
      { "N", 1, @5,5 }
    ],
    replacements: [
      { "X", 2, @1 },
      { "S", 1, @2 },
      { "N", 1, @3 },
      { "P", 3, @4 }
    ]
  },
  {
    type: "challenge-lost", playerKey: "49dabe7iua",
    score: -5,
    challengerKey: "2v5oyt5qpi"
  },
  {
    type: "play",
    playerKey: "2v5oyt5qpi",
    score: 21,
    words: [{ "NASTY", 6 }],
    placements: [
      { "A", 1, @5,6 },
      { "S", 1, @5,7 },
      { "T", 1, @5,8 },
      { "Y", 2, @5,9 }
    ],
    replacements: [
      { "O", 1, @1 },
      { "T", 1, @2 },
      { "D", 2, @3 },
      { "E", 1, @4 }
    ],
    passes: 1
  },
  {
    type: "took-back",
    playerKey: "2v5oyt5qpi",
    score: -21,
    placements: [
      { "A", 1, @5,6 },
      { "S", 1, @5,7 },
      { "T", 1, @5,8 },
      { "Y", 2, @5,9 }
    ],
    replacements: [
      { "O", 1, @1 },
      { "T", 1, @2 },
      { "D", 2, @3 },
      { "E", 1, @4 }
    ]
  },
  {
    type: "play",
    playerKey: "2v5oyt5qpi",
    score: 29,
    words: [{ "TRASSY", 9 }],
    placements: [
      { "T", 1, @4,4 },
      { "A", 1, @4,6 },
      { "S", 1, @4,7 },
      { "S", 1, @4,8 },
      { "Y", 2, @4,9 }
    ],
    replacements: [
      { "E", 1, @0 },
      { "M", 3, @1 },
      { "J", 4, @2 },
      { "N", 1, @3 },
      { "F", 3, @4 }
    ]
  },
  {
    type: "challenge-won",
    playerKey: "2v5oyt5qpi",
    score: -29,
    placements: [
      { "T", 1, @4,4 },
      { "A", 1, @4,6 },
      { "S", 1, @4,7 },
      { "S", 1, @4,8 },
      { "Y", 2, @4,9 }
    ],
    replacements: [
      { "E", 1, @0 },
      { "M", 3, @1 },
      { "J", 4, @2 },
      { "N", 1, @3 },
      { "F", 3, @4 }
    ],
    challengerKey: "49dabe7iua"
  },
  { type: "passed", playerKey: "49dabe7iua" },
  { type: "passed", playerKey: "2v5oyt5qpi" },
  { type: "passed", playerKey: "49dabe7iua" },
  { type: "passed", playerKey: "2v5oyt5qpi" },
  {
    type: "game-over",
    playerKey: "2v5oyt5qpi",
    score: [
    { key: "2v5oyt5qpi", tiles: -6 },
    { key: "49dabe7iua", tiles: -8 }
    ],
    endState: Game.State.TWO_PASSES
  }
]
*/
  before(setupPlatform);

  it("replay", () => {
    let preGame, game, preBag;

    return getTestGame("good_game", Game)
    .then(g => {
      preGame = g;
      return promiseEditionBag(preGame);
    })
    .then(pb => {
      preBag = pb;
      game = new Game(preGame);
      game.key = "simulated_game";
      //game._debug = console.debug;
      game.replay(preGame);
      return game.onLoad(new MemoryDatabase());
    })

    .then(() => {
      let promise = Promise.resolve();
      for (let i = 0; i < game.game.turns.length; i++)
        promise = promise.then(() => {
          checkBag(game, preBag);
          return game.step()
          .then(() => checkBag(game, preBag));
        });
      return promise
      .then(() => assertGameEqual(game, preGame));
    });
  });

  it("issue 50", () => {
    let preGame, game, preBag = [];

    return getTestGame("kolano", Game)
    .then(g => {
      preGame = g;
      return promiseEditionBag(preGame);
    })
    .then(pb => {
      preBag = pb;
      game = new Game(preGame);
      game.key = "simulated_game";
      game.replay(preGame);
      //game._debug = console.debug;
    })
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(() => {
      let promise = Promise.resolve();
      // Play up to challenge-lost
      for (let i = 0; i < 4; i++)
        promise = promise.then(() => {
          checkBag(game, preBag);
          return game.step()
          .then(() => checkBag(game, preBag));
        });
      return promise
      .then(() => assert.fail("Unexpected"))
      .catch(e => {
        game.stopTheClock();
        assert.equal(e.message, `Cannot challenge a ${Turn.Type.CHALLENGE_WON}`);
      });
    });
  });

  it("issue 49", () => {
    let preGame, game, preBag;

    return getTestGame("8-letter-rack", Game)
    .then(g => {
      preGame = g;
      return promiseEditionBag(preGame);
    })
    .then(pb => {
      preBag = pb;
      game = new Game(preGame);
      game.key = "simulated_game";
      //game._debug = console.debug;
      game.replay(preGame);
    })
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(async () => {
      for (let i = 0; i < preGame.turns.length; i++) {
        checkBag(game, preBag);
        await game.step();
        checkBag(game, preBag);
      }
      game.stopTheClock();
      //console.log(game.board.stringify());
    });
  });
});

