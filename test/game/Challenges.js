/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha, node */

import { assert } from "chai";
import { setupPlatform, UNit } from "../TestPlatform.js";
import { MemoryDatabase } from "../MemoryDatabase.js";

import { stringify } from "../../src/common/Utils.js";
import { TestSocket } from "../TestSocket.js";
import sparseEqual from "../sparseEqual.js";
import { CommandsMixin } from "../../src/game/CommandsMixin.js";
import { Game as _Game } from "../../src/game/Game.js";
import { Turn as _Turn } from "../../src/game/Turn.js";
_Game.USE_WORKERS = false;
const Game = CommandsMixin(_Game);
Game.CLASSES.Game = Game;
const Turn = Game.CLASSES.Turn;
const Tile = Game.CLASSES.Tile;
const Player = Game.CLASSES.Player;
const Move = Game.CLASSES.Move;

/**
 * Unit tests for correct handling of challenges at various stages of
 * the game.
 */
describe("game/Challenges", () => {

  before(setupPlatform);

  it("bad challenge by next player - miss turn", () => {
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      _noPlayerShuffle: true,
      //_debug: console.debug,
      challengePenalty: Game.Penalty.MISS
    });
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    const move1 = new Move({
      words: [ { word: "SINK", score: 99 }],
      score: 99
    });
    move1.addPlacement(
      new Tile({letter:"S", isBlank:false, score:1, col: 7, row: 7}));
    move1.addPlacement(
      new Tile({letter:"I", isBlank:false, score:1, col: 8, row: 7}));
    move1.addPlacement(
      new Tile({letter:"N", isBlank:false, score:1, col: 9, row: 7}));
    move1.addPlacement(
      new Tile({letter:"K", isBlank:false, score:1, col: 10, row: 7}));
    const socket = new TestSocket();
    socket.on(Game.Notify.TURN, (turn, event, seqNo) => {
      switch (seqNo) {
      case 1:
        // Human"s move
        assert.equal(turn.type, Turn.Type.PLAYED);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        assert.equal(game.whosTurnKey, human2.key);
        break;
      case 2:
        assert.equal(turn.type, Turn.Type.CHALLENGE_LOST);
        assert.equal(turn.playerKey, human1.key); // who was challenged
        assert.equal(turn.challengerKey, human2.key); // who issued the challenged
        assert.equal(turn.nextToGoKey, human1.key);

        // The challenge failed, and they are forced to pass, but that doesn"t
        // mean they miss the next turn after this one.
        assert(!human2.missNextTurn);

        socket.done();
        break;
      default:
        assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(turn)}`);
      }
    })
    .on(Game.Notify.CONNECTIONS, () => {})
    .on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED EVENT ${seqNo} ${stringify(data)}`);
    });

    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(() => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"S"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"I"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"N"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"K"}));
      game.addPlayer(human2, true);
      game.whosTurnKey = human1.key;
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.play(human1, move1))
    .then(() => game.challenge(human2, human1))
    .then(() => socket.wait())
    .then(() => {
      assert.equal(game.whosTurnKey, human1.key);
    });
  });

  it("bad challenge by next player - points penalty", () => {
    // Implicitly tests pass
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      _noPlayerShuffle: true,
      //_debug: console.debug,
      challengePenalty: Game.Penalty.PER_TURN,
      penaltyPoints: 5
    });
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    const move1 = new Move({
      placements: [
        new Tile({letter:"S", score:1, col: 7, row: 7}),
        new Tile({letter:"I", score:1, col: 8, row: 7}),
        new Tile({letter:"N", score:1, col: 9, row: 7}),
        new Tile({letter:"K", score:1, col: 10, row: 7}),
        new Tile({letter:"E", score:1, col: 7, row: 8}),
        new Tile({letter:"T", isBlank: true, score:0, col:7, row:9})
      ],
      words: [ { word: "SINK", score: 4 }, { word: "SET", score: 2 }],
      score: 99
    });
    const socket = new TestSocket("points penalty");
    socket.on(Game.Notify.TURN, (turn, event, seqNo) => {
      switch (seqNo) {
      case 1: // Human"s move
        assert.equal(turn.type, Turn.Type.PLAYED);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        assert.equal(game.whosTurnKey, human2.key);
        break;

      case 2: // challenge failed
        assert.equal(game.whosTurnKey, human2.key);
        assert.equal(turn.type, Turn.Type.CHALLENGE_LOST);
        assert.equal(turn.score, -5);
        assert.equal(turn.playerKey, human1.key); // who was challenged
        assert.equal(turn.challengerKey, human2.key); // who issued the challenged
        assert.equal(turn.nextToGoKey, human2.key);
        assert(!human2.missNextTurn);
        socket.done();
        break;

      default:
        assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(turn)}`);
      }
    });
    socket.on(Game.Notify.CONNECTIONS, () => {
      //console.log("con",seqNo);
    });
    socket.on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(data)}`);
    });
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"S"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"I"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"N"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"K"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"E"}));
      human1.rack.addTile(game.letterBag.removeTile({isBlank:true}));
      game.addPlayer(human2, true);
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.play(human1, move1))
    .then(() => game.challenge(human2, human1))
    .then(() => socket.wait())
    .then(() => {
      assert.equal(game.whosTurnKey, human2.key);
    });
  });

  it("bad challenge by not-next player - points penalty", () => {
    // Implicitly tests pass
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      _noPlayerShuffle: true,
      //_debug: console.debug,
      challengePenalty: Game.Penalty.PER_WORD,
      penaltyPoints: 100
    });
    const human1 = new Player({name: "Human 1", key: "human1"}, Game.CLASSES);
    const human2 = new Player({name: "Human 2", key: "human2"}, Game.CLASSES);
    const human3 = new Player({name:"Human 3", key:"human3"}, Game.CLASSES);
    const move = new Move({
      placements: [
        new Tile({letter:"S", score:1, col: 7, row: 7}),
        new Tile({letter:"I", score:1, col: 8, row: 7}),
        new Tile({letter:"N", score:1, col: 9, row: 7}),
        new Tile({letter:"K", score:1, col: 10, row: 7}),
        new Tile({letter:"E", score:1, col: 7, row: 8}),
        new Tile({letter:"T", isBlank: true, score:0, col: 7, row: 10})
      ],
      words: [ { word: "SINK", score: 4 }, { word: "SET", score: 2 }],
      score: 12
    });
    const socket = new TestSocket();
    const handle = (turn, event, seqNo) => {
      switch (seqNo) {
      case 1:
        // Human"s move
        assert.equal(turn.type, Turn.Type.PLAYED);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        assert.equal(game.whosTurnKey, human2.key);
        break;
      case 2:
        //console.debug("bad challenge by not-next player", turn);
        assert.equal(turn.type, Turn.Type.CHALLENGE_LOST);
        assert.equal(turn.score, -200);
        assert.equal(turn.challengerKey, human3.key); // who challenged them
        assert.equal(turn.playerKey, human1.key); // who was challenged
        assert(!human3.missNextTurn);
        socket.done();
      }
    };
    socket.on(Game.Notify.TURN, handle);
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(data)}`);
    });
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"S"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"I"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"N"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"K"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"E"}));
      human1.rack.addTile(game.letterBag.removeTile({isBlank:true}));
      game.addPlayer(human2, true);
      game.addPlayer(human3, true);
      game.whosTurnKey = human1.key;
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.play(human1, move))
    .then(() => game.challenge(human3, human1))
    .then(() => {
      assert.equal(game.whosTurnKey, human2.key);
      assert.equal(game.getPlayer().key, human2.key);
    });
  });

  it("bad challenge by not-next player - miss turn", () => {
    // Implicitly tests pass
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      _noPlayerShuffle: true,
      //_debug: console.debug,
      challengePenalty: Game.Penalty.MISS
    });
    const human1 = new Player({name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    const human3 = new Player({name:"test3", key:"three", isRobot: false}, Game.CLASSES);
    const move = new Move({
      placements: [
        new Tile({letter:"S", isBlank:false, score:1, col: 7, row: 7}),
        new Tile({letter:"I", isBlank:false, score:1, col: 8, row: 7}),
        new Tile({letter:"N", isBlank:false, score:1, col: 9, row: 7}),
        new Tile({letter:"K", isBlank:false, score:1, col: 10, row: 7})
      ],
      words: [ { word: "SINK", score: 99 }],
      score: 99
    });
    const socket = new TestSocket();
    const handle = (turn, event, seqNo) => {
      switch (seqNo) {
      case 1:
        // Human"s move
        assert.equal(turn.type, Turn.Type.PLAYED);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        assert.equal(game.whosTurnKey, human2.key);
        break;
      case 2:
        //console.debug("bad challenge by not-next player", turn);
        assert.equal(turn.type, Turn.Type.CHALLENGE_LOST);
        assert.equal(turn.score, 0);
        assert.equal(turn.challengerKey, human3.key); // who challenged them
        assert.equal(turn.playerKey, human1.key); // who was challenged
        assert(human3.missNextTurn);
        socket.done();
      }
    };
    socket.on(Game.Notify.TURN, handle);
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(data)}`);
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
      game.addPlayer(human3, true);
      game.whosTurnKey = human1.key;
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.play(human1, move))
    .then(() => game.challenge(human3, human1))
    .then(() => {
      assert.equal(game.whosTurnKey, human2.key);
      assert.equal(game.getPlayer().key, human2.key);
    });
  });

  it("good challenge by next player", () => {
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      _noPlayerShuffle: true,
      //_debug: console.debug,
      challengePenalty: Game.Penalty.MISS
    });
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    const move = new Move({
      placements: [
        new Tile({letter:"X", isBlank:false, score:1, col: 7, row: 7}),
        new Tile({letter:"Y", isBlank:false, score:1, col: 8, row: 7}),
        new Tile({letter:"Z", isBlank:false, score:1, col: 9, row: 7}),
        new Tile({letter:"J", isBlank:false, score:1, col: 10, row: 7}) ],
      words: [ { word: "XYZZ", score: 99 }],
      score: 99
    });
    const socket = new TestSocket();
    const handle = (turn, event, seqNo) => {
      switch (seqNo) {
      case 1:
        // Human"s move
        assert.equal(turn.type, Turn.Type.PLAYED);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        assert.equal(game.whosTurnKey, human2.key);
        break;
      case 2:
        //console.debug("good challenge by next player", turn);
        assert.equal(turn.type, Turn.Type.CHALLENGE_WON);
        assert.equal(turn.challengerKey, human2.key);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        assert.equal(turn.score, -99);
        socket.done();
      }
    };
    socket.on(Game.Notify.TURN, handle);
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(data)}`);
    });
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(() => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"X"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"Y"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"Z"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"Q"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"J"}));
      game.addPlayer(human2, true);
      game.whosTurnKey = human1.key;
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.play(human1, move))
    .then(() => game.challenge(human2, human1))
    .then(() => socket.wait())
    .then(() => {
      assert(!human1.missNextTurn);
      assert(!human2.missNextTurn);
    });
  });

  it("good challenge by not-next player", () => {
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      _noPlayerShuffle: true,
      //_debug: console.debug,
      challengePenalty: Game.Penalty.PER_WORD,
      penaltyPoints: 6
    });
    const human1 = new Player({name: "Human 1", key: "human1"}, Game.CLASSES);
    const human2 = new Player({name: "Human 2", key: "human2"}, Game.CLASSES);
    const human3 = new Player({name:"Human 3", key:"human3"}, Game.CLASSES);
    const move = new Move({
      placements: [
        new Tile({letter:"S", score:1, col: 7, row: 7}),
        new Tile({letter:"P", score:1, col: 8, row: 7}),
        new Tile({letter:"N", score:1, col: 9, row: 7}),
        new Tile({letter:"K", score:1, col: 10, row: 7}),
        new Tile({letter:"T", score:1, col: 7, row: 8}),
        new Tile({letter:"T", isBlank: true, score:0, col: 7, row: 10})
      ],
      words: [ { word: "SPNK", score: 4 }, { word: "SPT", score: 2 }],
      score: 99
    });
    const socket = new TestSocket();
    const handle = (turn, event, seqNo) => {
      switch (seqNo) {
      case 1:
        // Human"s move
        assert.equal(turn.type, Turn.Type.PLAYED);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        assert.equal(game.whosTurnKey, human2.key);
        break;
      case 2:
        //console.debug("good challenge by not-next player", turn);
        assert.equal(turn.type, Turn.Type.CHALLENGE_WON);
        assert.equal(turn.score, -99);
        assert.equal(turn.challengerKey, human3.key); // who challenged them
        assert.equal(turn.playerKey, human1.key); // who was challenged
        assert(!human1.missNextTurn);
        assert(!human2.missNextTurn);
        assert(!human3.missNextTurn);
        socket.done();
      }
    };
    socket.on(Game.Notify.TURN, handle);
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(data)}`);
    });
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"S"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"P"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"N"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"K"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"T"}));
      human1.rack.addTile(game.letterBag.removeTile({isBlank:true}));
      game.addPlayer(human2, true);
      game.addPlayer(human3, true);
      game.whosTurnKey = human1.key;
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.play(human1, move))
    .then(() => {
      assert.equal(game.whosTurnKey, human2.key);
      assert.equal(game.getPlayer().key, human2.key);
    })
    .then(() => game.challenge(human3, human1))
    .then(() => {
      assert.equal(game.whosTurnKey, human2.key);
      assert.equal(game.getPlayer().key, human2.key);
    });
  });

  /* This is now an assert failure
  it("challenge by same player", () => {
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      _noPlayerShuffle: true,
      //_debug: console.debug,
      challengePenalty: Game.Penalty.MISS
    });
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    const move = new Move({
      placements: [
        new Tile({letter:"X", isBlank:false, score:1, col: 7, row: 7}),
        new Tile({letter:"Y", isBlank:false, score:1, col: 8, row: 7}),
        new Tile({letter:"Z", isBlank:false, score:1, col: 9, row: 7}),
        new Tile({letter:"Q", isBlank:false, score:1, col: 10, row: 7})
      ],
      words: [ { word: "XYZZ", score: 99 }],
      score: 99
    });
    const socket = new TestSocket();
    socket.on(Game.Notify.CONNECTIONS, () => {})
    .on(Game.Notify.TURN, (data, event, seqNo) => {
      assert.equal(seqNo, 1);
      assert.equal(data.type, "play");
    })
    .on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(data)}`);
    });
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(() => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"X"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"Y"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"Z"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"Q"}));
      game.addPlayer(human2, true);
      game.whosTurnKey = human1.key;
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.play(human1, move))
    .then(() => game.challenge(human1, human1))
    .then(() => socket.wait())
    .then(() => assert.fail("Expected an error"))
    .catch(e => {
      assert.equal(e, "Cannot challenge your own play");
    });
  });
  */

  it("good challenge of final play by next player", () => {
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      _noPlayerShuffle: true,
      //_debug: console.debug,
      challengePenalty: Game.Penalty.MISS
    });
    const human1 = new Player({name: "Human 1", key:"sheep", isRobot: false}, Game.CLASSES);
    const human2 = new Player({name: "Human 2", key:"wolf", isRobot: false}, Game.CLASSES);
    const move = new Move({
      placements: [
        new Tile({letter:"X", isBlank:false, score:1, col: 6, row: 7}),
        new Tile({letter:"Y", isBlank:false, score:1, col: 7, row: 7}),
        new Tile({letter:"Z", isBlank:false, score:1, col: 8, row: 7}),
      ],
      words: [ { word: "XYZ", score: 3 }],
      score: 3
    });

    const socket = new TestSocket();
    socket.on(Game.Notify.CONNECTIONS, () => {})
    .on(Game.Notify.TURN, (turn, event, seqNo) => {
      switch(seqNo) {
      case 1:
        assert.equal(turn.type, Turn.Type.PLAYED);
        sparseEqual(turn, move);
        break;
      case 2:
        //console.debug("good challenge of final play", turn);
        assert.equal(turn.type, Turn.Type.CHALLENGE_WON);
        assert.equal(turn.challengerKey, human2.key);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        assert.equal(turn.score, -3);
        socket.done();
      }
    })
    .on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(data)}`);
    });
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"X"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"Y"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"Z"}));
      game.addPlayer(human2, true);
      game.whosTurnKey = human1.key;

      // Empty the bag
      game.letterBag.getRandomTiles(
        game.letterBag.remainingTileCount());
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.play(human1, move))
    // Player 1 has played, so issue a challenge on behalf of player 2
    .then(() => game.challenge(human2, human1))
    .then(() => socket.wait());
  });

  it("good challenge of final play by not-next player", () => {
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      _noPlayerShuffle: true,
      //_debug: console.debug,
      challengePenalty: Game.Penalty.MISS
    });
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    const human3 = new Player({
      name: "Human 3", key: "human3", isRobot: false}, Game.CLASSES);
    const move = new Move({
      placements: [
        new Tile({letter:"P", isBlank:false, score:1, col: 6, row: 7}),
        new Tile({letter:"Q", isBlank:false, score:1, col: 7, row: 7}),
        new Tile({letter:"T", isBlank:false, score:1, col: 8, row: 7}),
      ],
      words: [ { word: "PQT", score: 3 }],
      score: 3
    });
    const socket = new TestSocket();
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on(Game.Notify.TURN, (turn, event, seqNo) => {
      switch (seqNo) {
      case 1:
        assert.equal(turn.words.length, 1);
        assert.deepEqual(turn.words[0], { word: "PQT", score: 3 });
        assert.equal(turn.score, 3);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        break;
      case 2:
        //console.debug("good challenge of final play by not-next", turn);
        assert.equal(turn.type, Turn.Type.CHALLENGE_WON);
        assert.deepEqual(turn.score, -3);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.challengerKey, human3.key);
        assert.equal(turn.nextToGoKey, human2.key);
        socket.done();
        break;
      default:
        assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(turn)}`);
      }
    });
    socket.on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(data)}`);
    });

    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"P"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"Q"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"T"}));

      game.addPlayer(human2);
      human2.rack.addTile(game.letterBag.removeTile({letter:"J"}));

      // Empty the bag
      game.letterBag.getRandomTiles(
        game.letterBag.remainingTileCount());
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.play(human1, move))
    // Player 1 has played and "won",
    // so issue a challenge on behalf of player 3
    .then(() => game.challenge(human3, human1))
    .then(() => socket.wait())
    .then(() => {
      assert.equal(game.whosTurnKey, human2.key);
      assert(!human1.missNextTurn);
      assert(!human2.missNextTurn);
      assert(!human3.missNextTurn);
    });
  });

  // A bad challenge of the final play by the next player is treated
  // as a Turn.Type.GAME_ENDED with appropriate end state.
  it("bad challenge of final play by next player - miss turn", () => {
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      _noPlayerShuffle: true,
      //_debug: console.debug,
      challengePenalty: Game.Penalty.MISS
    });
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    const move = new Move({
      placements: [
        new Tile({letter:"A", isBlank:false, score:1, col: 6, row: 7}),
        new Tile({letter:"R", isBlank:false, score:1, col: 7, row: 7}),
        new Tile({letter:"T", isBlank:false, score:1, col: 8, row: 7}),
      ],
      words: [ { word: "ART", score: 3 }],
      score: 3
    });
    const socket = new TestSocket();
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on(Game.Notify.TURN, (turn, event, seqNo) => {
      switch (seqNo) {
      case 1:
        assert.equal(turn.words.length, 1);
        assert.deepEqual(turn.words[0], { word: "ART", score: 3 });
        assert.equal(turn.score, 3);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        break;
      case 2:
        //console.debug("bad challenge of final play", turn);
        assert.equal(turn.type, Turn.Type.GAME_ENDED);
        assert.equal(turn.endState, Game.State.FAILED_CHALLENGE);
        assert.deepEqual(turn.endStates, [
          { key: "human1", tiles: 4 }, { key: "human2", tiles: -4, tilesRemaining: "Q"}]);
        assert.equal(turn.playerKey, human2.key);
        assert.equal(turn.nextToGoKey, undefined);
        // Game should be over
        socket.done();
      }
    });
    socket.on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(data)}`);
    });

    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"A"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"R"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"T"}));

      game.addPlayer(human2);
      human2.rack.addTile(game.letterBag.removeTile({letter:"Q"}));

      game.whosTurnKey = human1.key;
      // Empty the bag
      game.letterBag.getRandomTiles(
        game.letterBag.remainingTileCount());
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.play(human1, move))
    // Player 1 has played, so issue a challenge on behalf of player 2
    .then(() => game.challenge(human2, human1))
    .then(() => socket.wait());
  });

  // If the bad challenge is from a not-next player,
  // it should generate a turn{type=Turn.Type.CHALLENGE_LOST}.
  it("bad challenge of final play by not-next player - miss turn", () => {
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      _noPlayerShuffle: true,
      //_debug: console.debug,
      challengePenalty: Game.Penalty.MISS
    });
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    const human3 = new Player({
      name: "Human 3", key: "human3", isRobot: false}, Game.CLASSES);
    const move = new Move({
      placements: [
        new Tile({letter:"A", isBlank:false, score:1, col: 6, row: 7}),
        new Tile({letter:"R", isBlank:false, score:1, col: 7, row: 7}),
        new Tile({letter:"T", isBlank:false, score:1, col: 8, row: 7}),
      ],
      words: [ { word: "ART", score: 3 }],
      score: 3
    });
    const socket = new TestSocket();
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on(Game.Notify.TURN, (turn, event, seqNo) => {
      switch (seqNo) {
      case 1:
        assert.equal(turn.words.length, 1);
        assert.deepEqual(turn.words[0], { word: "ART", score: 3 });
        assert.equal(turn.score, 3);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        break;
      case 2:
        //console.debug("bad challenge of final play by not-next", turn);
        assert.equal(turn.type, Turn.Type.CHALLENGE_LOST);
        // a failed challenge by not-next incurs no penalty under
        // default rules.
        assert.equal(turn.score, 0);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.challengerKey, human3.key);
        assert.equal(turn.nextToGoKey, human2.key);
        socket.done();
        break;
      default:
        assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(turn)}`);
      }
    });
    socket.on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(data)}`);
    });

    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"A"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"R"}));
      human1.rack.addTile(game.letterBag.removeTile({letter:"T"}));

      game.addPlayer(human2);
      human2.rack.addTile(game.letterBag.removeTile({letter:"Q"}));

      // Empty the bag
      game.letterBag.getRandomTiles(
        game.letterBag.remainingTileCount());
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.play(human1, move))
    // Player 1 has played, so issue a challenge on behalf of player 3
    .then(() => game.challenge(human3, human1))
    .then(() => socket.wait());
  });

  /**
   * player 1 played not-final play
   * player 2 challenged - good challenge
   * player 2 passed
   * player 1 tried to make a play - blew up with "Cannot find on Rack"
   */
  it("play, challenge, swap", () => {
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      _noPlayerShuffle: true,
      //_debug: console.debug,
      challengePenalty: Game.Penalty.MISS
    });
    const human1 = new Player({
      name: "Human 1", key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: "Human 2", key: "human2", isRobot: false}, Game.CLASSES);
    const move1 = new Move({
      placements: [
        new Tile({letter:"Q", isBlank:false, score:1, col: 7, row: 7}),
        new Tile({letter:"Y", isBlank:false, score:1, col: 8, row: 7}),
        new Tile({letter:"Z", isBlank:false, score:1, col: 9, row: 7}),
        new Tile({letter:"F", isBlank:false, score:1, col: 10, row: 7}) ],
      words: [ { word: "QYZF", score: 1 }],
      score: 1
    });
    const move2 = new Move({
      placements: [
        new Tile({letter:"F", isBlank:false, score:1, col: 7, row: 7}),
        new Tile({letter:"Z", isBlank:false, score:1, col: 8, row: 7}),
        new Tile({letter:"Y", isBlank:false, score:1, col: 9, row: 7}),
        new Tile({letter:"Q", isBlank:false, score:1, col: 10, row: 7}) ],
      words: [ { word: "FZYQ", score: 99 }],
      score: 99
    });
    const socket = new TestSocket();
    const handle = (turn, event, seqNo) => {
      switch (seqNo) {
      case 1:
        assert.equal(turn.type, Turn.Type.PLAYED);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        assert.equal(turn.score, move1.score);
        assert.equal(game.whosTurnKey, human2.key);
        break;
      case 2:
        assert.equal(turn.type, Turn.Type.CHALLENGE_WON);
        assert.equal(turn.challengerKey, human2.key);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        assert.equal(turn.score, -move1.score);
        break;
      case 3:
        assert.equal(turn.type, Turn.Type.PASSED);
        assert.equal(turn.playerKey, human2.key);
        assert.equal(turn.nextToGoKey, human1.key);
        break;
      case 4:
        assert.equal(turn.type, Turn.Type.PLAYED);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        assert.equal(turn.score, move2.score);
        socket.done();
        break;
      default:
        assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(turn)}`);
      }
    };
    socket.on(Game.Notify.TURN, handle);
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on("*", (data, event, seqNo) => {
      assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(data)}`);
    });
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(() => {
      game.addPlayer(human1);
      for (let tile of move1.placements)
        human1.rack.addTile(game.letterBag.removeTile(tile));
      game.addPlayer(human2, true);
      game.whosTurnKey = human1.key;
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => game.play(human1, move1))
    .then(() => game.challenge(human2, human1)) // should succeed
    .then(() => game.pass(human2, Turn.Type.PASSED))
    .then(() => game.play(human1, move2))
    .then(() => socket.wait())
    .then(() => {
      assert(!human1.missNextTurn);
      assert(!human2.missNextTurn);
    });
  });

  it("issue 66", () => {
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      _noPlayerShuffle: true,
      //_debug: console.debug,
      challengePenalty: Game.Penalty.MISS
    });
    const john = new Player({
      name: "John", key: "john", isRobot: false}, Game.CLASSES);
    const paul = new Player({
      name: "Paul", key: "paul", isRobot: false}, Game.CLASSES);

    // John has just played. Their rack isn't empty, but the letter bag
    // is. Paul challenges, a challenge that fails. Game should NOT be over.

    // Move that leaves "D" in John's rack. Bag is emty, so replacements
    // should be empty in the Turn.
    const move = new Move({
      placements: [
        new Tile({letter:"W", score:1, col: 7, row: 7}),
        new Tile({letter:"A", score:1, col: 8, row: 7}),
        new Tile({letter:"R", score:1, col: 9, row: 7}),
      ],
      words: [ { word: "WAR", score: 12 } ],
      score: 12
    });

    const js = new TestSocket("John");
    js.on("*", (data, event, seqNo) => {
      switch (seqNo) {
      case 0:
        assert.equal(event, Game.Notify.CONNECTIONS); break;
      case 1:
        assert.equal(event, Game.Notify.CONNECTIONS); break;
      case 2:
        // John still has a tile ('D') but there should be no replacements
        // as the bag is empty
        assert.equal(event, Game.Notify.TURN);
        assert.equal(data.type, Turn.Type.PLAYED);
        assert.deepEqual(data.replacements, []);
        break;
      case 3:
        assert.equal(event, Game.Notify.TURN);
        // Paul's challenge failed
        assert.equal(data.type, Turn.Type.CHALLENGE_LOST);
        js.done();
        break;
      default:
        assert.fail(`UNEXPECTED John ${seqNo}, ${event}` + data);
      }
    });

    const ps = new TestSocket("Paul");
    ps.on("*", (data, event, seqNo) => {
      switch (seqNo) {
      case 0:
        assert.equal(event, Game.Notify.CONNECTIONS); break;
      case 1:
        assert.equal(event, Game.Notify.TURN);
        assert.equal(data.type, Turn.Type.PLAYED);
        assert.deepEqual(data.replacements, []);
        break;
      case 2:
        assert.equal(event, Game.Notify.TURN);
        // Paul's challenge failed
        assert.equal(data.type, Turn.Type.CHALLENGE_LOST);
        js.done();
        break;
      default:
        assert.fail(`UNEXPECTED John ${seqNo}, ${event}` + data);
      }
    });

    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(john);
      john.rack.addTile(game.letterBag.removeTile({letter:"W"}));
      john.rack.addTile(game.letterBag.removeTile({letter:"A"}));
      john.rack.addTile(game.letterBag.removeTile({letter:"R"}));
      john.rack.addTile(game.letterBag.removeTile({letter:"D"}));

      game.addPlayer(paul);
      paul.rack.addTile(game.letterBag.removeTile({letter:"U"}));
      game.whosTurnKey = john.key;

      // Empty the bag
      game.letterBag.getRandomTiles(
        game.letterBag.remainingTileCount());
    })
    .then(() => game.connect(js, john.key))
    .then(() => game.connect(ps, paul.key))
    .then(() => game.play(john, move))
    .then(() => game.challenge(paul, john))
    .then(() => assert.equal(game.state, Game.State.PLAYING));
  });

  it("issue 120", () => {
    const game = new Game({
      edition:"Test",
      dictionary:"Oxford_5000",
      _noPlayerShuffle: true,
      //_debug: console.debug,
      challengePenalty: Game.Penalty.MISS
    });

    const joe = new Player({
      name: "Joe", key: "joe", isRobot: false}, Game.CLASSES);
    const john = new Player({
      name: "John", key: "john", isRobot: false}, Game.CLASSES);
    const paul = new Player({
      name: "Paul", key: "paul", isRobot: false}, Game.CLASSES);

    // Joe played (but still had tiles left) and Paul challenged and
    // lost. Then John played and went out. At that point, Paul was
    // the next player, but it would not let them accept.
    // The problem is that Paul is the first player after the player
    // that has gone out. The UI only looks at the last player to
    // see if the game is over - it needs to look at ALL the players.

    let connections = 0;
    function waitConnections(resolve) {
      if (connections === 9)
        resolve();
      else
        setTimeout(() => waitConnections(resolve), 100);
    }

    const joes_sock = new TestSocket("Joe");
    let joes_seq = 0;
    joes_sock.on("*", (data, event, seqNo) => {
      if (event == Game.Notify.CONNECTIONS) return;
      switch (joes_seq++) {
      case 0:
        assert.equal(event, Game.Notify.TURN);
        assert.equal(data.type, Turn.Type.PLAYED);
        assert.deepEqual(data.replacements, []);
        break;
      case 1:
        assert.equal(event, Game.Notify.TURN);
        assert.equal(data.type, Turn.Type.CHALLENGE_LOST);
        break;
      case 2:
        assert.equal(event, Game.Notify.TURN);
        assert.equal(data.type, Turn.Type.PLAYED);
        //console.debug("JOE done",data.type);
        joes_sock.done();
        break;
      default:
        assert.fail(`UNEXPECTED John ${seqNo}, ${event}` + data);
      }
    });

    const johns_sock = new TestSocket("John");
    let johns_seq = 0;
    johns_sock.on("*", (data, event, seqNo) => {
      if (event == Game.Notify.CONNECTIONS) return;
      switch (johns_seq++) {
      case 0:
        // There should be no replacements
        // as the bag is empty
        assert.equal(event, Game.Notify.TURN);
        assert.equal(data.type, Turn.Type.PLAYED);
        assert.deepEqual(data.replacements, []);
        break;
      case 1:
        assert.equal(event, Game.Notify.TURN);
        // Paul's challenge failed
        assert.equal(data.type, Turn.Type.CHALLENGE_LOST);
        break;
      case 2:
        assert.equal(event, Game.Notify.TURN);
        assert.equal(data.type, Turn.Type.PLAYED);
        //console.debug("JOHN done",data.type);
        johns_sock.done();
        break;
      default:
        assert.fail(`UNEXPECTED John ${seqNo}, ${event}` + data);
      }
    });

    const pauls_sock = new TestSocket("Paul");
    let pauls_seq = 0;
    pauls_sock.on("*", (data, event, seqNo) => {
      if (event == Game.Notify.CONNECTIONS) return;
      switch (pauls_seq++) {
      case 0:
        assert.equal(event, Game.Notify.TURN);
        assert.equal(data.type, Turn.Type.PLAYED);
        assert.deepEqual(data.replacements, []);
        break;
      case 1:
        assert.equal(event, Game.Notify.TURN);
        // Paul's challenge failed
        assert.equal(data.type, Turn.Type.CHALLENGE_LOST);
        break;
      case 2:
        assert.equal(event, Game.Notify.TURN);
        assert.equal(data.type, Turn.Type.PLAYED);
        //console.debug("PAUL done", data.type);
        pauls_sock.done();
        break;
      default:
        assert.fail(`UNEXPECTED John ${seqNo}, ${event}` + data);
      }
    });

    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(joe);
      joe.rack.addTile(game.letterBag.removeTile({letter:"J"}));
      joe.rack.addTile(game.letterBag.removeTile({letter:"O"}));
      joe.rack.addTile(game.letterBag.removeTile({letter:"Y"}));
      joe.rack.addTile(game.letterBag.removeTile({letter:"S"}));

      game.addPlayer(john);
      john.rack.addTile(game.letterBag.removeTile({letter:"O"}));
      john.rack.addTile(game.letterBag.removeTile({letter:"I"}));
      john.rack.addTile(game.letterBag.removeTile({letter:"N"}));

      game.addPlayer(paul);
      paul.rack.addTile(game.letterBag.removeTile({letter:"P"}));
      paul.rack.addTile(game.letterBag.removeTile({letter:"A"}));
      paul.rack.addTile(game.letterBag.removeTile({letter:"W"}));
      paul.rack.addTile(game.letterBag.removeTile({letter:"L"}));
      game.whosTurnKey = john.key;

      // Empty the bag
      game.letterBag.getRandomTiles(
        game.letterBag.remainingTileCount());
    })
    .then(() => game.connect(joes_sock, joe.key))
    .then(() => game.connect(johns_sock, john.key))
    .then(() => game.connect(pauls_sock, paul.key))

    // Joe plays
    .then(() => game.play(joe, new Move({
      placements: [
        new Tile({letter:"J", score:8, col: 0, row: 5}),
        new Tile({letter:"O", score:1, col: 1, row: 5}),
        new Tile({letter:"Y", score:4, col: 2, row: 5}),
      ],
      words: [ { word: "JOY", score: 10 } ],
      score: 10
    })))
    // Paul challenges John
    .then(() => game.challenge(paul, joe))
    // challenge should fail, leaving Paul in "miss next turn"
    .then(() => assert.equal(game.state, Game.State.PLAYING))
    // John plays and empties their rack
    .then(() => game.play(john, new Move({
      placements: [
        new Tile({letter:"O", isBlank:false, score:1, col: 0, row: 8}),
        new Tile({letter:"I", isBlank:false, score:1, col: 0, row: 9}),
        new Tile({letter:"N", isBlank:false, score:1, col: 0, row: 10})
        ],
        words: [ { word: "JOIN", score: 11 } ],
        score: 11
    })))
    // John has played, Paul is next and should be able to Accept last move
    .then(() => {
      assert.equal(3, joes_seq);
      assert.equal(3, johns_seq);
      assert.equal(3, pauls_seq);
    });
  });
});
