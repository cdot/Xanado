/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha,node */

import { assert } from "chai";
import { setupPlatform, getTestGame } from "../TestPlatform.js";
import { stringify } from "../../src/common/Utils.js";
import { MemoryDatabase } from "../MemoryDatabase.js";
import { TestSocket } from "../TestSocket.js";
import { CommandsMixin } from "../../src/game/CommandsMixin.js";
import { Undo } from "../../src/game/Undo.js";
import { CBOR } from "../../src/game/CBOR.js";
import { Game as _Game } from "../../src/game/Game.js";
const Game = Undo(CommandsMixin(_Game));
Game.CLASSES.Game = Game;
const Tile = Game.CLASSES.Tile;
const Player = Game.CLASSES.Player;
const Move = Game.CLASSES.Move;
const Turn = Game.CLASSES.Turn;

describe("game/Undo", () => {

  before(setupPlatform);

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
    assert.deepEqual(actual, expected);
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

  it("unswap", () => {
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true,
      allowUndo: true
    });
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    const frontend = new TestSocket("front end");
    frontend.on(Game.Notify.TURN, (turn) => {
      assert.equal(turn.type, Turn.Type.SWAPPED);
      frontend.done();
    })
    .on("*", () => {});

    let A, C, E, preswap;
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      human1.rack.addTile(A = game.letterBag.getRandomTile());
      human1.rack.addTile(game.letterBag.getRandomTile());
      human1.rack.addTile(C = game.letterBag.getRandomTile());
      human1.rack.addTile(game.letterBag.getRandomTile());
      human1.rack.addTile(E = game.letterBag.getRandomTile());
      game.addPlayer(human2, true);
    })
    .then(() => game.connect(frontend, human1.key))
    .then(() => {
      assert(game instanceof Game);
      // TODO: decode the packed game
      preswap = CBOR.decode(CBOR.encode(game, Game.CLASSES), Game.CLASSES);
      assert(preswap instanceof Game);
    })
    .then(() => game.swap(human1, [ A, C, E ]))
    .then(() => frontend.wait())
    .then(() => {
      // TODO: decode the packed game
      const postswap = CBOR.decode(CBOR.encode(game, Game.CLASSES), Game.CLASSES);
      assert.deepEqual(postswap.board, preswap.board);
    })
    .then(() => game.undo(game.popTurn(), true))
    .then(() => {
      // TODO: decode the packed game
      const postundo = CBOR.decode(CBOR.encode(game, Game.CLASSES), Game.CLASSES);
      assert.deepEqual(postundo.board, preswap.board);
      assertGameEqual(postundo, preswap);
    });
  });

  it("unpass", () => {
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);

    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true,
      allowUndo: true
    });
    const socket = new TestSocket("front end");
    socket.on(Game.Notify.TURN, (data, event, seqNo) => {
      assert(data instanceof Turn);
      assert.equal(data.type, Turn.Type.PASSED);
      assert.equal(seqNo, 1);
    })
    .on(Game.Notify.CONNECTIONS, () => {})
    .on(Game.Notify.UNDONE, (data, event, seqNo) => {
      assert.equal(seqNo, 2);
      assert(data instanceof Turn);
      assert.equal(data.type, Turn.Type.PASSED);
      socket.done();
    })
    .on("*", (data, event, seqNo) => {
      socket.done();
      assert.fail(`UNEXPECTED EVENT ${seqNo} ${stringify(data)}`);
    });
    let prepass;
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.getRandomTile());
      human1.rack.addTile(game.letterBag.getRandomTile());
      human1.rack.addTile(game.letterBag.getRandomTile());
      human1.rack.addTile(game.letterBag.getRandomTile());
      human1.rack.addTile(game.letterBag.getRandomTile());
      game.addPlayer(human2, true);
      game.whosTurnKey = human1.key;
    })
    .then(() => game.connect(socket, human1.key))
    // TODO: decode the packed game
    .then(() => prepass = CBOR.decode(CBOR.encode(game, Game.CLASSES), Game.CLASSES))
    .then(() => game.pass(human1, Turn.Type.PASSED))
    .then(() => game.undo(game.popTurn()))
    .then(() => socket.wait())
    .then(() => {
      // TODO: decode the packed game
      const postundo = CBOR.decode(CBOR.encode(game, Game.CLASSES), Game.CLASSES);
      assertGameEqual(postundo, prepass);
    });
  });

  it("unplay", () => {
    let W = new Tile({letter:"W", score:1, col: 7, row: 7});
    let O = new Tile({letter:"O", score:1, col: 8, row: 7});
    let R = new Tile({letter:"R", score:1, col: 9, row: 7});
    let D = new Tile({letter:"D", score:1, col: 10, row: 7});
    const move = new Move({
      placements: [ W, O, R, D ],
      words: [ { word: "WORD", score: 10 }],
      score: 20
    });

    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);

    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true,
      allowUndo: true
    });
    const socket = new TestSocket("unplay");
    socket.on(Game.Notify.TURN, (turn) => {
      assert.equal(turn.type, Turn.Type.PLAYED);
    })
    .on(Game.Notify.UNDONE, (data, event, seqNo) => {
      assert.equal(seqNo, 2);
      assert(data instanceof Turn);
      assert.equal(data.type, Turn.Type.PLAYED);
      socket.done();
    })
    .on(Game.Notify.CONNECTIONS, () => {})
    .on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(data)}`);
    });

    let preplay;
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      //console.log(`"${game.letterBag.letters().sort().join("")}"`);
      human1.rack.addTile(W = game.letterBag.removeTile({letter:"W"}));
      human1.rack.addTile(O = game.letterBag.removeTile({letter:"O"}));
      human1.rack.addTile(R = game.letterBag.removeTile({letter:"R"}));
      human1.rack.addTile(D = game.letterBag.removeTile({letter:"D"}));
      game.addPlayer(human2, true);
      game.whosTurnKey = human1.key;
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => preplay = CBOR.decode(CBOR.encode(game, Game.CLASSES), Game.CLASSES))
    .then(() => game.play(human1, move))
    .then(() => game.undo(game.popTurn()))
    .then(() => socket.wait())
    .then(() => {
      // TODO: decode the packed game
      const postundo = CBOR.decode(CBOR.encode(game, Game.CLASSES), Game.CLASSES);
      assertGameEqual(postundo, preplay);
    });
  });

  it("untakeBack", () => {
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true,
      allowUndo: true
    });
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    let W = new Tile({letter:"W", score:1, col: 7, row: 7});
    let O = new Tile({letter:"O", score:1, col: 8, row: 7});
    let R = new Tile({letter:"R", score:1, col: 9, row: 7});
    let D = new Tile({letter:"D", score:1, col: 10, row: 7});
    const move = new Move({
      placements: [ W, O, R, D ],
      words: [ { word: "WORD", score: 10 }],
      score: 20
    });
    const socket = new TestSocket("untakeback");
    socket.on(Game.Notify.CONNECTIONS, () => {})
    .on(Game.Notify.TURN, (turn, event, seqNo) => {
      switch (seqNo) {
      case 1:
        assert.equal(turn.type, Turn.Type.PLAYED);
        break;
      case 2:
        assert.equal(turn.type, Turn.Type.TOOK_BACK);
        break;
      default:
        assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(turn)}`);
      }
    })
    .on(Game.Notify.UNDONE, (data, event, seqNo) => {
      assert.equal(seqNo, 3);
      assert(data instanceof Turn);
      assert.equal(data.type, Turn.Type.TOOK_BACK);
      socket.done();
    });
    socket.on("*", () => {});
    let preplay, pretakeback, posttakeback;
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(() => {
      game.addPlayer(human1);
      human1.rack.addTile(W = game.letterBag.removeTile({letter:"W"}));
      human1.rack.addTile(O = game.letterBag.removeTile({letter:"O"}));
      human1.rack.addTile(R = game.letterBag.removeTile({letter:"R"}));
      human1.rack.addTile(D = game.letterBag.removeTile({letter:"D"}));
      game.addPlayer(human2, true);
    })
    .then(() => game.connect(socket, human1.key))
    // TODO: decode the packed game
    .then(() => preplay = CBOR.decode(CBOR.encode(game, Game.CLASSES), Game.CLASSES))
    .then(() => game.play(human1, move))
    .then(() => pretakeback = CBOR.decode(CBOR.encode(game, Game.CLASSES), Game.CLASSES))
    .then(() => game.takeBack(human1, Turn.Type.TOOK_BACK))
    .then(() => posttakeback = CBOR.decode(CBOR.encode(game, Game.CLASSES), Game.CLASSES))
    .then(() => assertGameEqual(posttakeback, preplay, true))
    .then(() => game.undo(game.popTurn()))
    .then(() => socket.wait())
    .then(() => {
      const postundo = CBOR.decode(CBOR.encode(game, Game.CLASSES), Game.CLASSES);
      assertGameEqual(postundo, pretakeback);
    });
  });

  // Unplay an entire game (including a challenge)
  it("undo", () => {
    return getTestGame("finished_game", Game)
    .then(game => { game._db = new MemoryDatabase(); return game; })
    .then(game => {
      game.allowUndo = true;
      //game._debug = console.debug;
      while (game.turns.length > 0) {
        game.undo(game.popTurn());
      }
      for (const p of game.players)
        assert.equal(p.score, 0);
    });
  });

  /*
  it("unchallenge", () => {
    // more tests are in Challenges.ut
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true,
      allowUndo: true
    });
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    const socket = new TestSocket();
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on("*", (data, event) => {
    });
    return game.create()
        .then(() => game.onLoad(new MemoryDatabase()))
    .then(() => {
      game.addPlayer(human1);
      game.addPlayer(human2);
      game.whosTurnKey = human1.key;
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.challenge(human1))
    .then(g => assert.strictEqual(g, game))
    .then(() => socket.wait())
    .then(() => assert.fail("Expected an error"))
    .catch(e => {
      assert.equal(e, "No previous move to challenge");
    });
  });
*/

  /*
  it("anotherGame", () => {
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);

    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true,
      allowUndo: true
    });
    const socket = new TestSocket();
    socket.on(Game.Notify.NEXT_GAME, (info, event) => {
      //console.debug("anotherGame", info);
      assert.equal(info.gameKey, game.nextGameKey);
      socket.done();
    });
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on("*", (data, event) => {
    assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(turn)}`);
    });
    return game.create()
        .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      game.addPlayer(human2);
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.anotherGame())
    .then(newGame => {
      // no shuffle, so player should be reset to first
      // player
      assert.equal(newGame.whosTurnKey, human1.key);
      assert.equal(newGame.timerType, game.timerType);
      assert.equal(newGame.timeAllowed, game.timeAllowed);
      assert.equal(newGame.timePenalty, game.timePenalty);
      assert.equal(newGame.edition, game.edition);
      assert.equal(newGame.dictionary, game.dictionary);
      assert.equal(newGame.minutesToPlay, game.minutesToPlay);
      assert.equal(newGame.predictScore, game.predictScore);
      assert.equal(newGame.allowTakeBack, game.allowTakeBack);
      assert.equal(newGame.wordCheck, game.wordCheck);
      assert.equal(newGame.minPlayers, game.minPlayers);
      assert.equal(newGame.maxPlayers, game.maxPlayers);
    })
    .then(() => socket.wait());
  });
  */
});
