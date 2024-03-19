/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha,node */

import { assert } from "chai";
import { setupPlatform, UNit } from "../TestPlatform.js";
import { MemoryDatabase } from "../MemoryDatabase.js";
import { TestSocket } from "../TestSocket.js";
import sparseEqual from "../sparseEqual.js";

import { stringify } from "../../src/common/Utils.js";
import { CommandsMixin } from "../../src/game/CommandsMixin.js";
import { Game as _Game } from "../../src/game/Game.js";
import { Turn as _Turn } from "../../src/game/Turn.js";
// disable worker threads
_Game.USE_WORKERS = false;

const Game = CommandsMixin(_Game);
Game.CLASSES.Game = Game;
const Turn = Game.CLASSES.Turn;
const Tile = Game.CLASSES.Tile;
const Move = Game.CLASSES.Move;
const Player = Game.CLASSES.Player;

/**
 * Unit tests for Game commands that are issued during gameplay.
 */

describe("game/Commands", () => {

  before(setupPlatform);

  it("swap", () => {
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true
    });
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    const socket1 = new TestSocket();
    socket1
    .on(Game.Notify.TURN, (turn, event, seqNo) => {
      switch (seqNo) {
      case 2:
        assert.equal(turn.type, Turn.Type.SWAPPED);
        assert(!turn.words);
        assert.deepEqual(turn.placements.map(t=>t.letter).sort(),
                         ["A","C","E"]);// tiles that were replaced
        assert.deepEqual(turn.replacements.map(t=>t.letter).sort(),
                         ["P","Q","R"]);
        assert.equal(turn.score, 0);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        socket1.done();
        break;
      default:
        assert.fail(`UNEXPECTED TURN ${seqNo} ${stringify(turn)}`);
      }
    })
    .on(Game.Notify.CONNECTIONS, () => {})
    .on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED EVENT ${seqNo} ${stringify(data)}`);
    });

    const socket2 = new TestSocket();
    socket2.on(Game.Notify.TURN, (turn) => {
      // human2 should see a redacted version of the SWAPPED turn
      assert.equal(turn.type, Turn.Type.SWAPPED);
      assert(!turn.words);
      assert.deepEqual(turn.placements.map(t=>t.letter).sort(),
                       ["A","C","E"]);// tiles that were replaced
      assert.deepEqual(turn.replacements.map(t=>t.letter).sort(),
                       ["#","#","#"]);
      assert.equal(turn.score, 0);
      assert.equal(turn.playerKey, human1.key);
      assert.equal(turn.nextToGoKey, human2.key);
      socket2.done();
    })
    .on(Game.Notify.CONNECTIONS, () => {})
    .on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED EVENT ${seqNo} ${stringify(data)}`);
    });

    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"A"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"B"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"C"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"D"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"E"}));
      game.addPlayer(human2, true);

      // Leave 3 tiles in the bag - enough to swap
      game.letterBag.getRandomTiles(
        game.letterBag.remainingTileCount());
      game.letterBag.returnTile(
        new Tile({letter:"P", score:1}));
      game.letterBag.returnTile(
        new Tile({letter:"Q", score:1}));
      game.letterBag.returnTile(
        new Tile({letter:"R", score:1}));
    })
    .then(() => game.connect(socket1, human1.key))
    .then(() => game.connect(socket2, human2.key))
    .then(() => assert.equal(game.state, Game.State.PLAYING))
    .then(() => game.swap(
      human1, [
        new Tile({letter:"A", score:1}),
        new Tile({letter:"C", score:1}),
        new Tile({letter:"E", score:1})
      ]))
    .then(g => {
      assert.strictEqual(g, game);
      assert.deepEqual(
        human1.rack.letters().sort(),
        ["B", "D", "P", "Q", "R"]);
    })
    // No need to wait for socket2
    .then(() => socket1.wait());
  });

  it("anotherGame", () => {
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);

    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true
    });
    const socket = new TestSocket();
    socket.on(Game.Notify.NEXT_GAME, (data) => {
      //console.debug("anotherGame", info);
      assert.equal(data.gameKey, game.nextGameKey);
      socket.done();
    });
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED EVENT ${seqNo} ${stringify(data)}`);
    });
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1, true);
      game.addPlayer(human2, true);
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => assert.equal(game.state, Game.State.PLAYING))
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

  it("pass", () => {
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);

    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true
    });
    const socket = new TestSocket();
    const handle = (turn, event, seqNo) => {
      switch (seqNo) {
      case 1:
        assert.equal(turn.type, Turn.Type.PASSED);
        assert(!turn.words);
        assert(!turn.placements);
        assert(!turn.replacements);
        assert.equal(turn.score, 0);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        // Player1 rack should be unchanged
        socket.done();
        break;
      default:
        console.error("UNEXPECTED TURN", event, turn);
        assert.fail(`UNEXPECTED TURN ${seqNo} ${stringify(turn)}`);
      }
    };
    socket.on(Game.Notify.TURN, handle);
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED EVENT ${seqNo} ${stringify(data)}`);
    });
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"S"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"I"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"N"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"K"}));
      game.addPlayer(human2, true);
      game.whosTurnKey = human1.key;
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.pass(human1, Turn.Type.PASSED))
    .then(g => assert.strictEqual(g, game))
    .then(() => socket.wait());
  });

  it("play", () => {
    const W = new Tile({letter:"W", score:1, col: 7, row: 7});
    const O = new Tile({letter:"O", score:1, col: 8, row: 7});
    const R = new Tile({letter:"R", score:1, col: 9, row: 7});
    const D = new Tile({letter:"D", score:1, col: 10, row: 7});
    const move = new Move({
      placements: [ W, O, R, D ],
      words: [ { word: "WORD", score: 10 }],
      score: 20
    });
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    const aTile = new Tile({letter:"A", score:1 });

    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true
    });
    const socket1 = new TestSocket("play 1");
    socket1.on(Game.Notify.TURN, (turn, event, seqNo) => {
      switch (seqNo) {
      case 5:
        assert.equal(turn.type, Turn.Type.PLAYED);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        assert.equal(turn.score, move.score);
        assert.deepEqual(turn.words, move.words);
        assert.deepEqual(turn.placements, move.placements);
        sparseEqual(turn.replacements, [ aTile ]);
        socket1.done();
        break;
      default:
        socket1.done();
        assert.fail(`UNEXPECTED TURN ${seqNo} ${stringify(turn)}`);
      }
    });
    socket1.on(Game.Notify.MESSAGE, (m, event, seqNo) => {
      switch (seqNo) {
      case 1:
        assert.equal(m.sender, 'Advisor');
        assert.equal(m.text, 'txt-enabled');
        break;
      case 2:
        assert.equal(m.sender, 'Advisor');
        assert.equal(m.text, "txt-advised");
        assert.equal(m.args[0], human1.name);
        break;
      case 4:
        assert.equal(m.sender, 'Advisor');
        assert.equal(m.text, "txt-possible-score");
        break;
      default:
        socket1.done();
        assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(m)}`);
      }
    });
    socket1.on(Game.Notify.CONNECTIONS, () => {
      //console.log(`conn ${seqNo}`);
    });
    socket1.on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED EVENT ${seqNo} ${stringify(data)}`);
    });

    const socket2 = new TestSocket("play 2");
    socket2.on(Game.Notify.TURN, (info, event, seqNo) => {
      switch(seqNo) {
      case 1:
        assert.equal(info.type, Turn.Type.PLAYED);
        assert.equal(info.playerKey, human1.key);
        assert.equal(info.nextToGoKey, human2.key);
        assert.equal(info.score, move.score);
        assert.deepEqual(info.words, move.words);
        assert.deepEqual(info.placements, move.placements);
        sparseEqual(info.replacements, [ new Tile({letter:"#", score:1 }) ]);
        break;
      case 3:
        // TODO: check info;
        socket2.done();
        break;
      default:
        socket1.done();
        assert.fail(`UNEXPECTED TURN ${seqNo} ${stringify(info)}`);
      }
    });
    socket2.on(Game.Notify.MESSAGE, (m, e, seqNo) => {
      switch (seqNo) {
      case 0:
        assert.equal(m.sender, 'Advisor');
        assert.equal(m.text, "txt-advised");
        assert.equal(m.args[0], human1.name);
        break;
      case 2:
        assert.equal(m.sender, 'Advisor');
        assert.equal(m.text, "txt-was-advised");
        assert.equal(m.args[0], human1.name);
        break;
      default:
        socket2.done();
        assert.fail(`UNEXPECTED MESSAGE ${seqNo} ${stringify(m)}`);
      }
    });
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"W"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"O"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"R"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"D"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"S"}));
      game.addPlayer(human2, true);

      // Empty the letter bag, put an "A" in, not enough to
      // refill the rack
      game.letterBag.getRandomTiles(
        game.letterBag.remainingTileCount());
      game.letterBag.returnTile(aTile);
      game.whosTurnKey = human1.key;
      game.wordCheck = Game.WordCheck.AFTER;
    })
    .then(() => game.connect(socket1, human1.key))
    .then(() => game.connect(socket2, human2.key))
    .then(() => game.toggleAdvice(human1))
    .then(() => assert.equal(game.state, Game.State.PLAYING))
    .then(() => game.play(human1, move))
    .then(g => assert.strictEqual(g, game))
    .then(() => assert.equal(game.state, Game.State.PLAYING))
    .then(() => Promise.all([socket1.wait(), socket2.wait()]))
    .then(() => {
      assert.equal(game.whosTurnKey, human2.key);
    });
  });

  it("wordCheckAfter bad word", () => {
    const X = new Tile({letter:"X", score:1, col: 7, row: 7});
    const Y = new Tile({letter:"Y", score:1, col: 8, row: 7});
    const Z = new Tile({letter:"Z", score:1, col: 9, row: 7});

    const move = new Move({
      placements: [ X, Y, Z ],
      words: [ { word: "XYZ", score: 10 }],
      score: 20
    });
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    const aTile = new Tile({letter:"A", score:1 });

    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true
    });
    const socket1 = new TestSocket("player 1");
    socket1.on(Game.Notify.TURN, (turn, event, seqNo) => {
      switch (seqNo) {
      case 2:
      case 3:
        assert.equal(turn.type, Turn.Type.PLAYED);
        if (seqNo === 3)
          socket1.done();
        break;
      default:
        socket1.done();
        assert.fail(`UNEXPECTED TURN ${seqNo} ${stringify(turn)}`);
      }
    })
    .on(Game.Notify.MESSAGE, (m, event, seqNo) => {
      switch (seqNo) {
      case 2:
      case 3:
        assert.equal(m.sender, 'Advisor');
        assert.equal(m.text, "txt-word-not-found");
        assert.equal(m.args[0], "XYZ");
        if (seqNo === 3)
          socket1.done();
        break;
      default:
        socket1.done();
        assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(m)}`);
      }
    })
    .on(Game.Notify.CONNECTIONS, () => {
      //console.log(`conn ${seqNo}`);
    })
    .on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED EVENT ${seqNo} ${stringify(data)}`);
    });

    const socket2 = new TestSocket("player 2");
    socket2.on(Game.Notify.TURN, (turn, event, seqNo) => {
      switch(seqNo) {
      case 1:
        assert.equal(turn.type, Turn.Type.PLAYED);
        socket2.done();
        break;
      default:
        socket2.done();
        assert.fail(`UNEXPECTED TURN ${seqNo} ${stringify(turn)}`);
      }
    });
    socket2.on(Game.Notify.MESSAGE, (m, e, seqNo) => {
      switch (seqNo) {
      default:
        socket2.done();
        assert.fail(`UNEXPECTED MESSAGE ${seqNo} ${stringify(m)}`);
      }
    });

    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"X"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"Y"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"Z"}));
      game.addPlayer(human2, true);

      game.letterBag.getRandomTiles(
        game.letterBag.remainingTileCount());
      game.letterBag.returnTile(aTile);
      game.whosTurnKey = human1.key;
      game.wordCheck = Game.WordCheck.AFTER;
    })
    .then(() => game.connect(socket1, human1.key))
    .then(() => game.connect(socket2, human2.key))
    .then(() => assert.equal(game.state, Game.State.PLAYING))
    .then(() => game.play(human1, move))
    .then(g => assert.strictEqual(g, game))
    .then(() => assert.equal(game.state, Game.State.PLAYING))
    .then(() => Promise.all([socket1.wait(), socket2.wait()]))
    .then(() => {
      assert.equal(game.whosTurnKey, human2.key);
    });
  });

  it("play to empty rack", () => {
    const W = new Tile({letter:"W", score:1, col: 7, row: 7});
    const O = new Tile({letter:"O", score:1, col: 8, row: 7});
    const R = new Tile({letter:"R", score:1, col: 9, row: 7});
    const D = new Tile({letter:"D", score:1, col: 10, row: 7});
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
      _noPlayerShuffle: true
    });
    const socket = new TestSocket();
    socket.on(Game.Notify.TURN, (turn) => {
      //console.debug(turn, event);
      assert.equal(turn.type, Turn.Type.PLAYED);
      assert.equal(turn.playerKey, human1.key);
      assert.equal(turn.nextToGoKey, human2.key);
      assert.equal(turn.score, move.score);
      assert.deepEqual(turn.words, move.words);
      assert.deepEqual(turn.placements, move.placements);
      assert.equal(turn.replacements.length, 0);
      socket.done();
    });
    socket.on("*", () => {});
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"W"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"O"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"R"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"D"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"S"}));
      game.addPlayer(human2, true);

      // Empty the letter bag
      game.letterBag.getRandomTiles(
        game.letterBag.remainingTileCount());
      game.whosTurnKey = human1.key;
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.play(human1, move))
    .then(() => socket.wait());
  });

  it("confirmGameOver", () => {
    const game =  new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true
    });
    let remains = 0;
    const human1 = new Player({
      name:"Human1", key:"human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name:"Human2", key:"human2", isRobot: false}, Game.CLASSES);
    const socket = new TestSocket();
    socket.on(Game.Notify.TURN, (turn, event) => {
      assert.equal(event, Game.Notify.TURN);
      assert.equal(turn.type, Turn.Type.GAME_ENDED);
      assert.deepEqual(
        turn.endStates,
        [
          { key: "human1", tiles: -remains, tilesRemaining: "X,Y,Z" },
          { key: "human2", tiles: remains }
        ]);
      assert.equal(turn.playerKey, human1.key);
      assert(!turn.nextToGoKey);
      socket.done();
    });
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED EVENT ${seqNo} ${stringify(data)}`);
    });
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1, false);
      let l = game.letterBag.removeTile({letter:"X"});
      remains += l.score;
      human1.rack.addTile(l);
      l = game.letterBag.removeTile({letter:"Y"});
      remains += l.score;
      human1.rack.addTile(l);
      l = game.letterBag.removeTile({letter:"Z"});
      remains += l.score;
      human1.rack.addTile(l);
      game.addPlayer(human2, false);
      // human2's rack is empty
      // Empty the bag
      game.letterBag.getRandomTiles(
        game.letterBag.remainingTileCount());
      game.whosTurnKey = human1.key;
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.confirmGameOver(human1, Game.State.GAME_OVER));
  });

  it("takeBack", () => {
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true
    });
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    const move = new Move({
      placements: [
        new Tile({letter:"X", score:1, col: 7, row: 7}),
        new Tile({letter:"Y", score:1, col: 8, row: 7}),
        new Tile({letter:"Z", score:1, col: 10, row: 7})
      ],
      words: [ { word: "XYZ", score: 3 }],
      score: 3
    });
    const socket = new TestSocket();
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on(Game.Notify.TURN, (turn, event, seqNo) => {
      switch (seqNo) {
      case 1:
        assert.equal(turn.type, Turn.Type.PLAYED);
        sparseEqual(turn, move);
        break;
      case 2:
        assert.equal(turn.type, Turn.Type.TOOK_BACK);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human1.key);
        assert.equal(turn.score, -3);
        socket.done();
        break;
      default:
        socket.done();
        assert.fail(`UNEXPECTED TURN ${seqNo} ${stringify(turn)}`);
      }
    });
    socket.on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED EVENT ${seqNo} ${stringify(data)}`);
    });
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(() => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"X"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"Y"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"Z"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"P"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"Q"}));
      game.addPlayer(human2, true);

      // Empty the bag, then put some recognisable tiles in it
      // Empty the letter bag, put an "A" in, not enough to
      // refill the rack
      game.letterBag.getRandomTiles(
        game.letterBag.remainingTileCount());
      game.letterBag.returnTile(
        new Tile({letter:"A", score:1}));
      game.letterBag.returnTile(
        new Tile({letter:"B", score:1}));
      game.letterBag.returnTile(
        new Tile({letter:"C", score:1}));
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.play(human1, move))
    .then(() => {
      assert.deepEqual(human1.rack.letters().sort(),
                       [ "A", "B", "C", "P", "Q" ]);
      assert(game.letterBag.isEmpty());
    })
    // Player 0 takes their move back, tils should return to the bag
    .then(() => game.takeBack(human1, Turn.Type.TOOK_BACK))
    .then(g => {
      assert.strictEqual(g, game);
      assert.deepEqual(game.letterBag.letters().sort(),
                       [ "A", "B", "C" ]);
      // human1"s rack should be XYZPQ
      assert.deepEqual(human1.rack.letters().sort(),
                       [ "P", "Q", "X", "Y", "Z" ]);
    })
    .then(() => {
      assert.equal(game.whosTurnKey, human1.key);
    });
  });

  it("pause", () => {
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true
    });
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    const socket = new TestSocket();
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on("*", (data, event, seqNo) => {
      switch (seqNo) {
      case 1:
        assert.equal(event, Game.Notify.PAUSE);
        assert.equal(data.gameKey, game.key);
        assert.equal(data.playerName, human1.name);
        break;
      case 2:
        assert.equal(event, Game.Notify.UNPAUSE);
        assert.equal(data.gameKey, game.key);
        assert.equal(data.playerName, human2.name);
        socket.done();
        break;
      default:
        assert.fail(`UNEXPECTED EVENT ${seqNo} ${stringify(data)}`);
      }
    });
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(() => {
      game.addPlayer(human1, true);
      game.addPlayer(human2, true);
      game.whosTurnKey = human1.key;
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.pause(human1))
    .then(g => assert.strictEqual(g, game))
    .then(() => game.pause(human2))
    .then(g => assert.equal(g.pausedBy, human1.name))
    .then(() => game.unpause(human2))
    .then(g => assert.strictEqual(g, game))
    .then(() => assert(!game.pausedBy));
  });
});

