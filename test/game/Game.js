/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha,node */
"use strict";

import { assert } from "chai";
import { setupPlatform } from "../TestPlatform.js";
import { CBOR } from "../../src/game/CBOR.js";
import { Game } from "../../src/game/Game.js";
import { EndState } from "../../src/game/Turn.js";
const Square = Game.CLASSES.Square;
const Turn = Game.CLASSES.Turn;
const Tile = Game.CLASSES.Tile;
const Player = Game.CLASSES.Player;

/**
 * Unit tests for Game base class. See ServerGame.ut and BrowserGame.ut
 * for more.
 */
describe("game/Game", () => {

  before(setupPlatform);

  it("construct, sendable, fromSimple", () => {
    const p = {
      edition:"English_Scrabble",
      dictionary:"Oxford_5000",
      timerType: Game.Timer.GAME,
      timeAllowed: 60,
      timePenalty: 100,
      predictScore: true,
      allowTakeBack: true,
      wordCheck: Game.WordCheck.AFTER,
      minPlayers: 5,
      //_debug: console.debug,
      maxPlayers: 10
    };
    let game;
    return new Game(p)
    .create()
    .then(g => game = g)
    .then(() => {
      assert.equal(game.edition, p.edition);
      assert.equal(game.dictionary, p.dictionary);
      assert.equal(game.timerType, Game.Timer.GAME);
      assert.equal(game.timePenalty, 100);
      assert.equal(game.timeAllowed, 60);
      assert(game.predictScore);
      assert(game.allowTakeBack);
      assert(game.wordCheck);
      assert.equal(game.minPlayers, 5);
      assert.equal(game.maxPlayers, 10);
      assert.equal(game.state, Game.State.WAITING);
      return game.sendable();
    })
    .then(s => {
      assert.equal(s.key, game.key);
      assert.equal(s.creationTimestamp, game.creationTimestamp);
      assert.equal(s.edition, game.edition);
      assert.equal(s.dictionary, game.dictionary);
      assert.equal(s.predictScore, game.predictScore);
      assert.equal(s.wordCheck, game.wordCheck);
      assert.equal(s.allowTakeBack, game.allowTakeBack);
      assert.equal(s.state, game.state);
      assert.equal(s.whosTurnKey, game.whosTurnKey);
      assert.equal(s.timerType, game.timerType);
      assert.equal(s.timeAllowed, game.timeAllowed);
      assert.equal(s.timePenalty, game.timePenalty);
      assert.equal(s.pausedBy, game.pausedBy);
      assert.equal(s.minPlayers, game.minPlayers);
      assert.equal(s.maxPlayers, game.maxPlayers);
      assert.equal(s.challengePenalty, game.challengePenalty);
      assert.equal(s.penaltyPoints, game.penaltyPoints);
      assert.equal(s.nextGameKey, game.nextGameKey);
      assert.equal(s.lastActivity, game.lastActivity());
      assert.equal(s.players.length, 0);
      game = Game.fromSendable(s, Game.CLASSES);
      assert.equal(s.key, game.key);
      assert.equal(s.creationTimestamp, game.creationTimestamp);
      assert.equal(s.edition, game.edition);
      assert.equal(s.dictionary, game.dictionary);
      assert.equal(s.predictScore, game.predictScore);
      assert.equal(s.wordCheck, game.wordCheck);
      assert.equal(s.allowTakeBack, game.allowTakeBack);
      assert.equal(s.state, game.state);
      assert.equal(s.whosTurnKey, game.whosTurnKey);
      assert.equal(s.timerType, game.timerType);
      assert.equal(s.timeAllowed, game.timeAllowed);
      assert.equal(s.timePenalty, game.timePenalty);
      assert.equal(s.pausedBy, game.pausedBy);
      assert.equal(s.minPlayers, game.minPlayers);
      assert.equal(s.maxPlayers, game.maxPlayers);
      assert.equal(s.challengePenalty, game.challengePenalty);
      assert.equal(s.penaltyPoints, game.penaltyPoints);
      assert.equal(s.nextGameKey, game.nextGameKey);
      assert.equal(s.lastActivity, game.lastActivity());
      assert.equal(s.players.length, 0);
      assert.equal(s.turns.length, 0);
    });
  });

  it("basics", () => {
    const p = {
      //_debug: console.debug,
      edition:"English_Scrabble",
      dictionary:"Oxford_5000",
      timerType: Game.Timer.TURN,
      timeAllowed: 999,
      predictScore: false,
      allowTakeBack: false,
      wordCheck: Game.WordCheck.AFTER,
      minPlayers: 30,
      maxPlayers: 1
    };

    const game = new Game(p);
    const robot1 = new Player({
      name:"Robot 1", key:"robot1", isRobot: true}, Game.CLASSES);
    assert.equal(Game.CLASSES, robot1._factory);
    const human2 = new Player({
      name:"human2", key:"human2", isRobot: false}, Game.CLASSES);
    const human3 = new Player({
      name:"human3", key:"human3", isRobot: false}, Game.CLASSES);

    const human4 = new Player({
      name:"human4", key:"human4", isRobot: false}, Game.CLASSES);

    const um = { // UserManager fixture
      getUser: k => Promise.resolve({ email: k.key + "@players.com" })
    };

    return game.create()
    .then(() => {
      assert.equal(game.edition, p.edition);
      assert.equal(game.dictionary, p.dictionary);
      assert.equal(game.timeAllowed, 999);
      assert(!game.predictScore);
      assert(!game.allowTakeBack);
      assert.equal(game.wordCheck, Game.WordCheck.AFTER);
      assert.equal(game.minPlayers, 30);
      assert.equal(typeof game.maxPlayers, "undefined");
      assert(!game.hasRobot());
      game.addPlayer(robot1, true);
      game.addPlayer(human2, true);
      game.addPlayer(human3, false);
      game.addPlayer(human4, true);
      assert(game.hasRobot());
      assert.equal(game.getPlayers().length, 4);
      assert.equal(game.getPlayerWithKey(human2.key), human2);
      assert.equal(game.getPlayerWithNoTiles(), human3);
      human3.fillRack(game.letterBag, 1);
      assert(!game.getPlayerWithNoTiles());
      human3.rack.empty();
      game.whosTurnKey = human2.key;

      robot1.score = 1;
      human2.score = 2;
      human3.score = 3;
      human4.score = 4;

      human4._isConnected = true;
      human4.isNextToGo = true;

      let player = game.getPlayer();
      assert.equal(player, human2);
      player = game.getPlayerWithKey(human2.key);
      assert.equal(player.key, human2.key);
      assert.equal(game.nextPlayer(), human3);
      assert.equal(game.previousPlayer(), robot1);
      assert.equal(game.previousPlayer(robot1), human4);
      assert.equal(game.previousPlayer(human2), robot1);
      assert.equal(game.nextPlayer().key, human3.key);
      assert.equal(game.nextPlayer(robot1), human2);
      assert.equal(game.nextPlayer(human2.key), human3);
      assert.equal(game.winningScore(), 4);
      assert.equal(game.state, Game.State.WAITING);
      assert.equal(game.calculateBonus(1), 0);
      assert.equal(game.calculateBonus(2), 0);
      assert.equal(game.calculateBonus(3), 0);
      assert.equal(game.calculateBonus(4), 0);
      assert.equal(game.calculateBonus(5), 0);
      assert.equal(game.calculateBonus(6), 0);
      assert.equal(game.calculateBonus(7), 50);
      assert(!game.isWinner(robot1));
      assert(!game.isWinner(human2));
      assert(!game.isWinner(human3));
      assert(game.isWinner(human4));

      human3.score = human4.score;
      assert(!game.isWinner(robot1));
      assert(!game.isWinner(human2));
      assert(game.isWinner(human3));
      assert(game.isWinner(human4));
      const whiners = game.getWinners();
      assert.equal(whiners.length, 2);
      assert.equal(whiners.find(p => p == human3), human3);
      assert.equal(whiners.find(p => p == human4), human4);

      return game.sendable(um);
    })
    .then(s => {
      assert.equal(s.key, game.key);
      assert.equal(s.creationTimestamp, game.creationTimestamp);
      assert.equal(s.edition, game.edition);
      assert.equal(s.dictionary, game.dictionary);
      assert.equal(s.predictScore || false, game.predictScore || false);
      assert.equal(s.wordCheck, game.wordCheck);
      assert.equal(s.allowTakeBack || false, game.allowTakeBack || false);
      assert.equal(s.state, game.state);
      assert.equal(s.whosTurnKey, game.whosTurnKey);
      assert.equal(s.timerType, game.timerType);
      assert.equal(s.timeAllowed, game.timeAllowed);
      assert.equal(s.timePenalty, game.timePenalty);
      assert.equal(s.pausedBy, game.pausedBy);
      assert.equal(s.minPlayers, game.minPlayers);
      assert.equal(s.maxPlayers, game.maxPlayers);
      assert.equal(s.challengePenalty, game.challengePenalty);
      assert.equal(s.penaltyPoints, game.penaltyPoints);
      assert.equal(s.nextGameKey, game.nextGameKey);
      assert.equal(s.lastActivity, game.lastActivity());
      assert.equal(s.players.length, 4);
      return Promise.all([
        robot1.sendable(game, um),
        human2.sendable(game, um),
        human3.sendable(game, um)
      ])
      .then(ps => {
        assert.deepEqual(s.players[0], ps[0]);
        assert.deepEqual(s.players[1], ps[1]);
        assert.deepEqual(s.players[2], ps[2]);
        game.removePlayer(robot1);
        game.removePlayer(human4);
        assert.equal(game.getPlayers().length, 2);
        assert(!game.getPlayerWithKey(robot1.key));
        assert.equal(game.getPlayerWithKey(human2.key), human2);
        assert.equal(game.getPlayerWithKey(human3.key), human3);
      });
    });
  });

  it("turns", () => {
    const p = {
      //_debug: console.debug,
      edition:"English_Scrabble",
      dictionary:"Oxford_5000",
      timerType: Game.Timer.TURN,
      timeAllowed: 999,
      predictScore: false,
      allowTakeBack: false,
      wordCheck: Game.WordCheck.AFTER,
      minPlayers: 30,
      maxPlayers: 1
    };

    const game = new Game(p);
    return game.create().then(() => {
      game.turns = [
        new Turn({
          score: 0,
          type: Turn.Type.SWAPPED,
          playerKey: "2v5oyt5qpi",
          nextToGoKey: "49dabe7iua",
          timestamp: game.creationTimestamp
        }),
        new Turn({
          score: -5,
          type: Turn.Type.CHALLENGE_LOST,
          playerKey: "49dabe7iua",
          nextToGoKey: "2v5oyt5qpi",
          challengerKey: "2v5oyt5qpi",
          timestamp: game.creationTimestamp + 1
        })
      ];

      assert.equal(game.lastTurn(), game.turns[1]);
      let i = 0;
      game.forEachTurn(t => {
        assert.equal(t, game.turns[i++]);
      });
      assert.equal(i, 2);

      assert(game.at(0, 0) instanceof Square);

      return game.sendable();
    })
    .then(s => {
      assert.equal(s.turns.length, 2);
    });
  });

  it("CBOR", () => {
    const p = {
      edition:"English_Scrabble",
      dictionary:"Oxford_5000",
      timerType: Game.Timer.GAME,
      timeAllowed: 60,
      timePenalty: 100,
      predictScore: true,
      allowTakeBack: true,
      wordCheck: Game.WordCheck.AFTER,
      minPlayers: 5,
      //_debug: console.debug,
      maxPlayers: 10
    };
    return new Game(p)
    .create()
    .then(game => {
      CBOR.encode(game, Game.CLASSES);
    });
  });

  it("pack", () => {
    const p = {
      edition:"English_Scrabble",
      dictionary:"Oxford_5000",
      timerType: Game.Timer.GAME,
      timeAllowed: 60,
      timePenalty: 100,
      predictScore: true,
      allowTakeBack: true,
      wordCheck: Game.WordCheck.AFTER,
      challengePenalty: Game.Penalty.PER_WORD,
      state: Game.State.WAITING,
      minPlayers: 5,
      maxPlayers: 10,
      allowUndo: true
    };

    const robot1 = new Player({
      name:"Robot", key:"robot1", isRobot: true}, Game.CLASSES);
    assert.equal(Game.CLASSES, robot1._factory);
    const human2 = new Player({
      name:"Human", key:"human2", isRobot: false}, Game.CLASSES);

    return new Game(p)
    .create()
    .then(g => {
      g.addPlayer(robot1);
      robot1.rack.addTile(g.letterBag.removeTile({letter:"A"}));
      robot1.rack.addTile(g.letterBag.removeTile({letter:"B"}));
      robot1.rack.addTile(g.letterBag.removeTile({letter:"C"}));
      g.addPlayer(human2, false);
      human2.rack.addTile(g.letterBag.removeTile({letter:"D"}));
      human2.rack.addTile(g.letterBag.removeTile({letter:"E"}));
      human2.rack.addTile(g.letterBag.removeTile({letter:"F"}));
      human2.score = 99;
      g.turns = [
        new Turn({
          score: -5,
          type: Turn.Type.CHALLENGE_LOST,
          playerKey: human2.key,
          nextToGoKey: robot1.key,
          challengerKey: robot1.key,
          timestamp: g.creationTimestamp
        }),
        new Turn({
          score: 0,
          type: Turn.Type.SWAPPED,
          playerKey: robot1.key,
          nextToGoKey: human2.key,
          placements: [
            { letter: "S", score: 0, row: 1, col: 2 },
            { letter: "H", score: 4, row: 1, col: 3, isBlank: true, isLocked: true },
            { letter: "I", score: 4, row: 1, col: 4, isBlank: true },
            { letter: "T", score: 4, row: 1, col: 5, isLocked: true }
          ],
          replacements: [
            { letter: "A", score: 1 },
            { letter: "Q", score: 10 }
          ],
          timestamp: g.creationTimestamp + 1
        }),
        new Turn({
          score: 0,
          type: Turn.Type.GAME_ENDED,
          playerKey: robot1.key,
          endState: Game.State.TWO_PASSES,
          endStates: [
            new EndState({
              key: robot1.key,
              tiles: 1,
              time: 2,
              tilesRemaining: "X,Y"
            }),
            new EndState({
              key: human2.key,
              tiles: 3,
              time: 4,
              tilesRemaining: "Z"
            })
          ],
          timestamp: g.creationTimestamp + 1
        })
      ];
      const p = g.pack();
      //console.debug(p);

      assert.equal(p.b, '(225)'); // blank board
      assert.equal(p.c, 3);
      assert.equal(p.d, "Oxford_5000");
      assert.equal(p.e, "English_Scrabble");
      assert(p.g);
      assert(p.i);
      assert.equal(p.k.length, 16);
      assert(p.m);
      assert.equal(p.o, 5);
      assert.equal(p.s, 0);
      assert.equal(p.t, 2);
      assert.equal(p.v, 1);
      assert.equal(p.x, 60);
      assert.equal(p.y, 100);

      assert(p.P0);
      assert(p.P1);
      assert(!p.P2);
      assert(p.T0);
      assert(p.T1);
      assert(p.T2);
      assert(!p.T3);
    });
  });

  it("unpack", () => {
    const params = {
      a: 1708256848751,
      b: '(225)',
      c: 3,
      o: 5,
      d: 'Oxford_5000',
      e: 'English_Scrabble',
      g: true,
      i: true,
      k: '2d091ced0251b1f3',
      m: 1708256848750,
      P0: {
        k: 'robot1',
        n: 'Robot',
        r: true,
        R: 'DOYOEAB-',
        s: 0},
      P1: {
        k: 'human2',
        n: 'Human',
        R: 'RSEEMSR-',
        s: 0},
      T0: {
        c: 'robot1',
        m: 1708256848750,
        n: 'robot1',
        p: 'human2',
        s: -5,
        t: 3 },
      T1: {
        m: 1708256848751,
        n: 'human2',
        p: 'robot1',
        r: 'AQ',
        P0: '2-1!S',
        P1: 'B3-1!H',
        P2: 'b4-1!I',
        P3: 'l5-1!T',
        s: 0,
        t: 1 },
      T2: {
        e: 4,
        e0: {
          k: 'robot1',
          t: 1,
          T: 2,
          r: 'XY'
        },
        e1: {
          k: 'human2',
          t: 3,
          T: 4,
          r: 'Z'
        },
        m: 1708256848751,
        p: 'robot1',
        s: 0,
        t: 2 },
      s: 0,
      t: 2,
      u: true,
      v: 1,
      x: 60,
      y: 100
    };

    return Game.unpack(params)
    .then(game => {
      //console.log(game);
      assert.equal(game.challengePenalty, Game.Penalty.PER_WORD);
      assert.equal(game.dictionary, "Oxford_5000");
      assert.equal(game.edition, "English_Scrabble");
      assert(game.allowTakeBack);
      assert(game.predictScore);
      assert(game.key, "2d091ced0251b1f3");
      assert.equal(game.creationTimestamp, 1708256848750);
      assert.equal(game.penaltyPoints, 5);
      assert.equal(game.state, Game.State.WAITING);
      assert.equal(game.timerType, Game.Timer.GAME);
      assert.equal(game.wordCheck, Game.WordCheck.AFTER);
      assert.equal(game.timeAllowed, 60);
      assert.equal(game.timePenalty, 100);

      // Test has 59 tiles initially
      assert.equal(game.letterBag.tiles.length, 86);

      const p0 = game.players[0];
      assert.equal(p0.key, 'robot1');
      assert.equal(p0.name, 'Robot');
      assert.equal(p0.score, 0);
      assert(p0.isRobot);

      const p1 = game.players[1];
      assert.equal(p1.key, 'human2');
      assert.equal(p1.name, 'Human');
      assert.equal(p1.score, 0);
      assert(!p1.isRobot);

      assert.equal(game.turns.length, 3);
    });
  });
});
