/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha */

import { assert } from "chai";
import { setupPlatform } from "../TestPlatform.js";
import { MemoryDatabase } from "../MemoryDatabase.js";
import { TestSocket } from '../TestSocket.js';

import { stringify } from "../../src/common/Utils.js";
import { Game as _Game } from "../../src/game/Game.js";
import { Turn as _Turn } from "../../src/game/Turn.js";
import { Commands } from "../../src/game/Commands.js";
const Game = Commands(_Game);
const Player = Game.CLASSES.Player;
const Turn = Game.CLASSES.Turn;

/**
 * Unit tests for behavious specific to timed games
 */
describe("game/TimedGame", function() {

  this.timeout(10000);

  before(setupPlatform);

  it('timeout and end game', () => {
    const human1 = new Player({
      name: 'Human 1', key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: 'Human 2', key: "human2", isRobot: false}, Game.CLASSES);

    const game = new Game({
      edition:"Test",
      dictionary:'Oxford_5000',
      //_debug: console.debug,
      _noPlayerShuffle: true,
      timerType: Game.Timer.TURN,
      timeAllowed: 1 / 60
    });
    const socket = new TestSocket();
    // Expected turns
    const handle = (turn, event, seqNo) => {
      switch (seqNo) {
      case 2:
        assert.equal(turn.score, 0);
        assert.equal(turn.type, Turn.Type.TIMED_OUT);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        break;
      case 4:
        assert.equal(turn.score, 0);
        assert.equal(turn.type, Turn.Type.TIMED_OUT);
        assert.equal(turn.playerKey, human2.key);
        assert.equal(turn.nextToGoKey, human1.key);
        break;
      case 6:
        assert.equal(turn.score, 0);
        assert.equal(turn.type, Turn.Type.TIMED_OUT);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        break;
      case 8:
        assert.equal(turn.score, 0);
        assert.equal(turn.type, Turn.Type.TIMED_OUT);
        assert.equal(turn.playerKey, human2.key);
        assert.equal(turn.nextToGoKey, human1.key);
        break;
      case 9:
        assert.equal(turn.type, Turn.Type.GAME_ENDED);
        assert.equal(turn.endState, Game.State.TWO_PASSES);
        assert.deepEqual(turn.endStates, [
          { key: "human1", tiles: -1, tilesRemaining: "A" },
          { key: "human2", tiles: -1, tilesRemaining: "A" }
        ]);
        assert(!turn.nextToGoKey);
        socket.done();
        break;
      default:
        assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(turn)}`);
      }
    };
    socket.on(Game.Notify.TURN, handle);
    socket.on(Game.Notify.CONNECTIONS, () => {});
    socket.on(Game.Notify.TICK, () => {});
    socket.on('*', (data, event, seqNo) => {
      assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(data)}`);
    });

    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"A"}));
      game.addPlayer(human2);
      human2.rack.addTile(game.letterBag.removeTile({letter:"A"}));
      // we have enough players to kick the game off. We don't need
      // to connect player 2, as the connect() of player1 should
      // kick off play. The players will each timeout twice and
      // the game will finish.
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => socket.wait());
  });

  it('pass and overtime', () => {
    const human1 = new Player({
      name: 'Human 1', key: "human1", isRobot: false}, Game.CLASSES);
    const human2 = new Player({
      name: 'Human 2', key: "human2", isRobot: false}, Game.CLASSES);

    const game = new Game({
      edition:"Test",
      dictionary:'Oxford_5000',
      //_debug: console.debug,
      _noPlayerShuffle: true,
      timerType: Game.Timer.GAME,
      timeAllowed: 1 / 60,
      timePenalty: 60
    });

    const socket = new TestSocket();
    // Expected turns
    const handle = (turn, event, seqNo) => {
      switch (seqNo) {
      case 2:
        assert.equal(turn.score, 0);
        assert.equal(turn.type, Turn.Type.PASSED);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        break;
      case 3:
        assert.equal(turn.score, 0);
        assert.equal(turn.type, Turn.Type.PASSED);
        assert.equal(turn.playerKey, human2.key);
        assert.equal(turn.nextToGoKey, human1.key);
        break;
      case 5:
        assert.equal(turn.score, 0);
        assert.equal(turn.type, Turn.Type.PASSED);
        assert.equal(turn.playerKey, human1.key);
        assert.equal(turn.nextToGoKey, human2.key);
        break;
      case 6:
        assert.equal(turn.score, 0);
        assert.equal(turn.type, Turn.Type.PASSED);
        assert.equal(turn.playerKey, human2.key);
        assert.equal(turn.nextToGoKey, human1.key);
        break;
      case 7:
        assert.equal(turn.type, Turn.Type.GAME_ENDED);
        assert.equal(turn.endState, Game.State.TWO_PASSES);
        assert.equal(turn.endStates[0].key, human1.key);
        assert.equal(turn.endStates[0].tiles, -1);
        assert.equal(turn.endStates[1].key, human2.key);
        assert.equal(turn.endStates[1].tiles, -1);
        // Human 1 should be over-time by one clock tick, which
        // is 1/60th of a minute.
        assert.equal(turn.endStates[0].time, -1);
        // human2 has no time penalty
        assert(!turn.endStates[1].time);
        assert(!turn.nextToGoKey);
        socket.done();
        break;
      default:
        assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(turn)}`);
      }
    };
    socket.on(Game.Notify.TURN, handle);

    socket.on(Game.Notify.CONNECTIONS, () => {});

    let onTick;
    function awaitTick() {
      return new Promise(resolve => {
        onTick = resolve;
      });
    }
    socket.on(Game.Notify.TICK, () => {
      if (onTick)
        onTick();
    });
    socket.on('*', (data, event, seqNo) => {
      assert.fail(`UNEXPECTED ${event} ${seqNo} ${stringify(data)}`);
    });

    // Players don't time out in a chess clock game, so we have to
    // explicitly pass twice
    return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
    .then(game => {
      game.addPlayer(human1);
      human1.rack.addTile(game.letterBag.removeTile({letter:"A"}));
      game.addPlayer(human2);
      human2.rack.addTile(game.letterBag.removeTile({letter:"A"}));
    })
    .then(() => game.connect(socket, human1.key))
    .then(() => awaitTick())
    .then(() => game.pass(human1, Turn.Type.PASSED))
    // human 2 plays as soon as possible
    .then(() => game.pass(human2, Turn.Type.PASSED))
    .then(() => awaitTick())
    .then(() => game.pass(human1, Turn.Type.PASSED))
    .then(() => game.pass(human2, Turn.Type.PASSED))
    .then(() => socket.wait());
  });
});

