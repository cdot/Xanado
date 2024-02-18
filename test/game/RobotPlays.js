/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha */

import { assert } from "chai";
/* global Platform */ import { setupPlatform } from "../TestPlatform.js";

import { MemoryDatabase } from "../../test/MemoryDatabase.js";
import { stringify } from "../../src/common/Utils.js";
import { TestSocket } from '../TestSocket.js';
import { Game as _Game } from "../../src/game/Game.js";
import { Turn as _Turn } from "../../src/game/Turn.js";
import { Commands } from "../../src/game/Commands.js";
_Game.USE_WORKERS = false;
const Game = Commands(_Game);
const Player = Game.CLASSES.Player;
const Tile = Game.CLASSES.Tile;
const Turn = Game.CLASSES.Turn;
const Move = Game.CLASSES.Move;

/**
 * Unit tests for robot.
 */
describe("game/RobotPlays", () => {

  before(setupPlatform);

  it("robot to play when ready", () => {
    const game = new Game({
      edition: "Test",
      dictionary: "Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true
    });

    const robot = new Player({name:"Machine", key:"robot",
                              isRobot: true, canChallenge: true},
                             Game.CLASSES);
    const human = new Player({name:"Man", key:"human", isRobot: false},
                             Game.CLASSES);

    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(robot);
      robot.rack.addTile(game.letterBag.removeTile({letter:"M"}));
      robot.rack.addTile(game.letterBag.removeTile({letter:"A"}));
      robot.rack.addTile(game.letterBag.removeTile({letter:"N"}));
      game.addPlayer(human, true);
      // Force the conditions that will pertain if a game is loaded
      // and a robot is expected to play next. This is a different
      // case to the preconditions being met and kicking off the
      // robot.
      game.state = Game.State.PLAYING;
      game.whosTurnKey = robot.key;
    })
    .then(() => game.playIfReady());
  });

  it("robot cannot play first", () => {
    const game = new Game({
      edition: "Test",
      dictionary: "Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true
    });

    const robot = new Player(
      {name:"Machine", key:"robot",
       isRobot: true, canChallenge: true}, Game.CLASSES);
    const human = new Player(
      {name:"Man", key:"human", isRobot: false}, Game.CLASSES);
    const socket = new TestSocket();
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on(Game.Notify.TURN, (turn, event, seqNo) => {
      switch (seqNo) {
      case 1:
        assert.equal(turn.type, Turn.Type.PASSED);
        assert.equal(turn.playerKey, robot.key);
        assert.equal(turn.nextToGoKey, human.key);
        socket.done();
        break;
      default:
        assert.fail(`too many turns ${seqNo}`);
      }
    });
    socket.on("*", (turn, event) => {
      console.error("UNEXPECTED EVENT", event);
      assert.fail(event);
    });

    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(robot);
      robot.rack.addTile(game.letterBag.removeTile({letter:"X"}));
      robot.rack.addTile(game.letterBag.removeTile({letter:"Y"}));
      robot.rack.addTile(game.letterBag.removeTile({letter:"Z"}));
      game.addPlayer(human, true);
    })
    // Connecting the human ought to autoplay the robot, who is marked
    // as the first player
    .then(() => game.connect(socket, human.key))
    .then(() => socket.wait());
  });

  it("robot can play first", () => {
    const game = new Game({
      //_debug: console.debug,
      _noPlayerShuffle: true,
      edition:"English_Scrabble",
      dictionary:"Oxford_5000"
    });
    const robot = new Player({
      name: "Robot 1", key:"robot", isRobot: true}, Game.CLASSES);
    const human = new Player({
      name: "Human 2", key:"human", isRobot: false}, Game.CLASSES);

    const socket = new TestSocket();
    socket.on(Game.Notify.TURN, (data, event, seqNo) => {
      assert.equal(seqNo, 1);
      assert.equal(event, Game.Notify.TURN);
      assert(data.type, Turn.Type.PLAYED);
      assert.deepEqual(data.words, [ { word: "AGO", score: 6 } ]);
      assert.equal(data.placements.length, 3);
      assert.equal(data.placements[0].letter, "A");
      let ver = (data.placements[0].col === 5);
      assert.equal(data.placements[0].col, ver ? 5 : 7);
      assert.equal(data.placements[0].row, ver ? 7 : 5);
      assert(data.placements[0].isBlank);
      assert.equal(data.placements[0].score, 0);

      assert.equal(data.placements[1].letter, "G");
      assert(!data.placements[1].isBlank);
      assert.equal(data.placements[1].score, 2);
      assert.equal(data.placements[1].col, ver ? 6 : 7);
      assert.equal(data.placements[1].row, ver ? 7 : 6);

      assert.equal(data.placements[2].letter, "O");
      assert(!data.placements[2].isBlank);
      assert.equal(data.placements[2].score, 1);
      assert.equal(data.replacements.length, 3);
      assert.equal(data.placements[2].col, ver ? 7 : 7);
      assert.equal(data.placements[2].row, ver ? 7 : 7);

      assert.equal(data.score, 6);
      assert.equal(data.playerKey, robot.key);
      assert.equal(data.nextToGoKey, human.key);
      socket.done();
    })
    .on(Game.Notify.CONNECTIONS, () => {})
    .on("*", (data, event) => {
      console.error("UNEXPECTED EVENT", event);
      assert.fail(event);
    });
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(robot);
      robot.rack.addTile(game.letterBag.removeTile({letter:"G"}));
      robot.rack.addTile(game.letterBag.removeTile({letter:"O"}));
      robot.rack.addTile(game.letterBag.removeTile({isBlank:true}));
      game.addPlayer(human, true);
    })
    .then(() => game.connect(socket, human.key))
    .then(() => socket.wait())
    .then(() => assert.equal(game.whosTurnKey, human.key));
  });

  it("robot play second", () => {
    const game = new Game({
      edition:"English_Scrabble",
      dictionary:"Oxford_5000",
      //_debug: console.debug,
      _noPlayerShuffle: true
    });
    let human = new Player({
      name: "Human 1", key:"human", isRobot: false}, Game.CLASSES);
    let robot = new Player({
      name: "Robot 2", key:"robot", isRobot: true}, Game.CLASSES);
    const W = new Tile({letter:"W", isBlank:false,
                        score:1, col: 7, row: 7});
    const O = new Tile({letter:"O", isBlank:false,
                        score:1, col: 8, row: 7});
    const R = new Tile({letter:"R", isBlank:false,
                        score:1, col: 9, row: 7});
    const D = new Tile({letter:"D", isBlank:false,
                        score:1, col: 10, row: 7});
    const move = new Move({
      placements: [ W, O, R, D ],
      words: [ { word: "WORD", score: 99 }],
      score: 99
    });

    const socket = new TestSocket();
    const handle = (data, event, seqNo) => {
      assert.equal(event, Game.Notify.TURN);
      assert.equal(data.type, Turn.Type.PLAYED);
      assert.equal(data.words.length, 1);
      switch (seqNo) {
      case 1:
        assert.equal(data.placements.length, 4);
        assert.equal(data.placements[0].letter, "W");
        assert.equal(data.placements[1].letter, "O");
        assert.equal(data.placements[2].letter, "R");
        assert.equal(data.placements[3].letter, "D");
        assert.equal(data.replacements.length, 4);
        assert.equal(data.score, 99);
        assert.equal(data.playerKey, human.key);
        assert.equal(data.nextToGoKey, robot.key);
        break;
      case 2:
        assert.equal(data.placements.length, 1);
        assert.equal(data.placements[0].letter, "T");
        assert.equal(data.replacements.length, 1);
        assert.equal(data.score, 3);
        assert.equal(data.playerKey, robot.key);
        assert.equal(data.nextToGoKey, human.key);
        socket.done();
        break;
      default:
        assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(data)}`);
      }
    };
    socket.on(Game.Notify.TURN, handle);
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on("*", (data, event) => {
      console.error("UNEXPECTED EVENT", event);
      assert.fail(event);
    });
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human);
      human.rack.addTile(game.letterBag.removeTile({letter:"W"}));
      human.rack.addTile(game.letterBag.removeTile({letter:"O"}));
      human.rack.addTile(game.letterBag.removeTile({letter:"R"}));
      human.rack.addTile(game.letterBag.removeTile({letter:"D"}));
      game.addPlayer(robot);
      robot.rack.addTile(game.letterBag.removeTile({letter:"T"}));
      game.whosTurnKey = human.key;
    })
    .then(() => game.connect(socket, human.key))
    .then(() => game.play(human, move))
    .then(() => socket.wait())
    .then(() => {
      // We ought to have autoplayed robot
      assert.equal(game.whosTurnKey, human.key);
    });
  });

  it("robot confirm game over", () => {
    const game =  new Game({
      //_debug: console.debug,
      edition:"Test",
      dictionary:"Oxford_5000",
      _noPlayerShuffle: true
    });
    const human = new Player({
      name: "Human 1", key: "human", isRobot: false}, Game.CLASSES);
    const robot = new Player({
      name: "Robot 2", key: "robot", isRobot: true}, Game.CLASSES);
    const move = new Move({
      placements: [
        new Tile({letter:"W", isBlank:false, score:1, col: 7, row: 7}),
        new Tile({letter:"O", isBlank:false, score:1, col: 8, row: 7}),
        new Tile({letter:"R", isBlank:false, score:1, col: 9, row: 7}),
        new Tile({letter:"D", isBlank:false, score:1, col: 10, row: 7})
      ],
      words: [ { word: "WORD", score: 99 }],
      score: 99
    });
    const socket = new TestSocket();
    let exp;
    const handle = (turn, event, seqNo) => {
      switch (seqNo) {
      case 1:
        assert.equal(turn.type, Turn.Type.PLAYED);
        break;
      case 2:
        assert.equal(event, Game.Notify.TURN);
        assert.equal(turn.type, Turn.Type.GAME_ENDED);
        assert.equal(turn.endState, Game.State.GAME_OVER);
        exp = [
          { key: human.key, tiles: 4 },
          { key: robot.key, tiles: -4, tilesRemaining: "Q" }
        ];
        assert.deepEqual(turn.endStates, exp);
        assert.equal(turn.playerKey, robot.key);
        assert(!turn.nextToGoKey);
        assert.equal(human.score, 103);
        assert.equal(robot.score, -4);
        socket.done();
        break;
      default:
        assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(turn)}`);
      }
    };
    socket.on(Game.Notify.TURN, handle);
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on("*", (data, event) => {
      console.error("UNEXPECTED EVENT", event);
      assert.fail(event);
    });
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      // Empty racks and bag => game over
      game.addPlayer(human);
      human.rack.addTile(game.letterBag.removeTile({letter:"W"}));
      human.rack.addTile(game.letterBag.removeTile({letter:"O"}));
      human.rack.addTile(game.letterBag.removeTile({letter:"R"}));
      human.rack.addTile(game.letterBag.removeTile({letter:"D"}));
      game.addPlayer(robot);
      robot.rack.addTile(game.letterBag.removeTile({letter:"Q"}));
      game.letterBag.getRandomTiles(
        game.letterBag.remainingTileCount());
      game.whosTurnKey = human.key;
    })
    .then(() => game.connect(socket, human.key))
    .then(() => game.play(human, move))
    // the startTurn after the play should have triggered the
    // robot to confirmGameOver
    .then(() => socket.wait());
  });

  it("robot challenge and make last play", () => {
    const game = new Game({
      //_debug: console.debug,
      edition: "Test",
      dictionary: "Oxford_5000",
      _noPlayerShuffle: true
    });

    const human = new Player(
      {name:"Man", key:"human", isRobot: false}, Game.CLASSES);
    const robot = new Player(
      {name:"Machine", key:"robot",
       isRobot: true, canChallenge: true}, Game.CLASSES);

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
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on(Game.Notify.TURN, (turn, event, seqNo) => {
      switch (seqNo) {
      case 1:
        assert.equal(turn.type, Turn.Type.PLAYED);
        break;
      case 2:
        assert.equal(turn.type, Turn.Type.CHALLENGE_WON);
        assert.equal(turn.score, -3);
        assert.equal(turn.playerKey, human.key);
        assert.equal(turn.challengerKey, robot.key);
        break;
      case 3:
        assert.equal(turn.type, Turn.Type.PLAYED);
        // sum of tiles 3, first play X2 + bonus 10
        assert.equal(turn.score, 16);
        assert.equal(turn.playerKey, robot.key);
        assert.equal(turn.nextToGoKey, human.key);
        socket.done();
        break;
      default:
        assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(turn)}`);
      }
    });
    socket.on("*", (turn, event) => {
      console.error("UNEXPECTED EVENT", event);
      assert.fail(event);
    });

    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human);
      human.rack.addTile(game.letterBag.removeTile({letter:"X"}));
      human.rack.addTile(game.letterBag.removeTile({letter:"Y"}));
      human.rack.addTile(game.letterBag.removeTile({letter:"Z"}));

      game.addPlayer(robot);
      robot.rack.addTile(game.letterBag.removeTile({letter:"O"}));
      robot.rack.addTile(game.letterBag.removeTile({letter:"N"}));
      robot.rack.addTile(game.letterBag.removeTile({letter:"E"}));

      game.whosTurnKey = human.key;

      // Empty the bag, so the human's play would be
      // the last, and the robot's play is the last
      game.letterBag.getRandomTiles(
        game.letterBag.remainingTileCount());
    })
    .then(() => game.connect(socket, human.key))
    .then(() => game.play(human, move))
    // Human has played. The autoplay should issue a challenge,
    // which is a turn and needs to be reflected in the UI. At the
    // same time, the robot needs to compute the next play so we
    // end up notifying two moves.
    .then(() => socket.wait());
  });
});
