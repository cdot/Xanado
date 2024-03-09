/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha,node */

import { assert } from "chai";
import { TestSocket } from '../TestSocket.js';
import { MemoryDatabase } from "../MemoryDatabase.js";
import sparseEqual from "../sparseEqual.js";
import { setupPlatform, getTestGame, UNit } from "../TestPlatform.js";

import { CBOR } from "../../src/game/CBOR.js";
import { Game } from "../../src/game/Game.js";
Game.USE_WORKERS = true;

import { BackendGame } from "../../src/backend/BackendGame.js";
import { FileDatabase } from "../../src/server/FileDatabase.js";
import { Turn as _Turn } from "../../src/game/Turn.js";
const Player = BackendGame.CLASSES.Player;
const Move = BackendGame.CLASSES.Move;
const Turn = BackendGame.CLASSES.Turn;
const Tile = BackendGame.CLASSES.Tile;

/**
 * Basic unit tests for BackendGame class. More tests for Game methods are
 * in Challenges, HumanCommands, RobotPlays and TimedGame.
 */
describe("backend/BackendGame", () => {

  before(setupPlatform);

	it("last move in game", () => {
		const game = new BackendGame({
			//_debug: console.debug,
			edition:"Test",
			dictionary:"Oxford_5000",
			_noPlayerShuffle: true
		});
		const human1 = new Player({
			name:"Human 1", key:"human1", isRobot: false}, BackendGame.CLASSES);
		const human2 = new Player({
			name:"Human 2", key:"human2", isRobot: false}, BackendGame.CLASSES);
		const move = new Move({
			placements: [
				new Tile({letter:"X", isBlank:false, score:1, col: 6, row: 7}),
				new Tile({letter:"W", isBlank:false, score:1, col: 7, row: 7}),
				new Tile({letter:"O", isBlank:false, score:1, col: 8, row: 7}),
				new Tile({letter:"R", isBlank:false, score:1, col: 9, row: 7}),
				new Tile({letter:"D", isBlank:false, score:1, col: 10, row: 7})
			],
			words: [ { word: "XWORD", score: 99 }],
			score: 99
		});
		const socket = new TestSocket();
		socket.on(
      BackendGame.Notify.TURN,
		  (data) => {
			  sparseEqual(data, {
					  type: Turn.Type.PLAYED,
					  playerKey: human1.key,
					  nextToGoKey: human2.key,
					  score: move.score,
					  words: move.words,
					  placements: move.placements
				  });
				socket.done();
		  });
		socket.on(BackendGame.Notify.CONNECTIONS, () => {});
		socket.on("*", (data, event) => {
			console.error("UNEXPECTED EVENT", event);
			assert.fail(event);
		});

		return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
		.then(() => {
			game.addPlayer(human1);
			human1.rack.addTile(game.letterBag.removeTile({letter:"W"}));
			human1.rack.addTile(game.letterBag.removeTile({letter:"O"}));
			human1.rack.addTile(game.letterBag.removeTile({letter:"R"}));
			human1.rack.addTile(game.letterBag.removeTile({letter:"D"}));
			human1.rack.addTile(game.letterBag.removeTile({letter:"X"}));
			game.addPlayer(human2, true);
			// Empty the bag
			game.letterBag.getRandomTiles(
				game.letterBag.remainingTileCount());
			game.whosTurnKey = human1.key;
			game._noPlayerShuffle = true;
		})
		.then(() => game.connect(socket, human1.key))
		.then(() => assert.equal(game.state, BackendGame.State.PLAYING))
		.then(() => game.play(human1, move))
		.then(() => socket.wait())
		.then(() => {
			// Make sure play is finished
			assert(human1.rack.isEmpty());
			assert(!human2.rack.isEmpty());
		});
	});

	// Clear missed turn flag set after challenge failed
	it("clear missed turn", () => {
		const game = new BackendGame({
			//_debug: console.debug,
			edition:"Test",
			dictionary:"Oxford_5000",
			_noPlayerShuffle: true
		});
		const human1 = new Player({
			name: "Human 1", key: "human1", isRobot: false}, BackendGame.CLASSES);
		const human2 = new Player({
			name: "Human 2", key: "human2", isRobot: false}, BackendGame.CLASSES);
		const human3 = new Player({
			name:"Human 3", key:"human3", isRobot: false}, BackendGame.CLASSES);
		const socket = new TestSocket();
		socket.on(BackendGame.Notify.CONNECTIONS, () => {});
		socket.on("*", (data, event) => {
			if (event === BackendGame.Notify.TURN) {
				assert.equal(data.type, Turn.Type.PASSED);
				socket.done();
				return;
			}
			console.error("UNEXPECTED EVENT", event);
			assert.fail(event);
		});
		return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
		.then(game => {
			game.addPlayer(human1, true);
			game.addPlayer(human2, true);
			game.addPlayer(human3, true);
			human2.missNextTurn = true;
		})
		.then(() => game.connect(socket, human1.key))
		.then(() => {
			assert.equal(game.whosTurnKey, human1.key);
			assert(human2.missNextTurn);
		})
		.then(() => game.pass(human1, Turn.Type.PASSED))
		.then(() => {
			assert.equal(game.whosTurnKey, human3.key);
			assert(!human3.missNextTurn);
		});
	});

	it("verify human play", () => {
		const game = new BackendGame({
			//_debug: console.debug,
			edition:"Test",
			dictionary:"Oxford_5000",
			_noPlayerShuffle: true,
			wordCheck: BackendGame.WordCheck.REJECT
		});
		const human1 = new Player({
			name:"Human 1", key:"human1", isRobot: false}, BackendGame.CLASSES);
		const human2 = new Player({
			name:"Human 2", key:"human2", isRobot: false}, BackendGame.CLASSES);
		const move = new Move({
			placements: [
				new Tile({letter:"X", isBlank:false, score:1, col: 6, row: 7}),
				new Tile({letter:"Y", isBlank:false, score:1, col: 7, row: 7}),
				new Tile({letter:"Z", isBlank:false, score:1, col: 8, row: 7})
			],
			words: [ { word: "XYZ", score: 99 }],
			score: 99
		});
		const socket1 = new TestSocket();
		socket1.on(BackendGame.Notify.REJECT, (data) => {
      delete data._timestamp;
			assert.deepEqual(data, {
				playerKey: human1.key,
				words: [ "XYZ" ]
      });
			socket1.done();
		});
		socket1.on(BackendGame.Notify.CONNECTIONS, () => {});
		socket1.on("*", (data, event) => {
			console.error("Socket 1 UNEXPECTED EVENT", event);
			assert.fail(event);
		});

		const socket2 = new TestSocket();
		socket2.on(BackendGame.Notify.CONNECTIONS, () => {});
		socket2.on("*", (data, event) => {
			console.error("Socket 2 UNEXPECTED EVENT", event);
			assert.fail(event);
		});

		return game.create()
    .then(() => game.onLoad(new MemoryDatabase()))
		.then(game => {
			game.addPlayer(human1);
			human1.rack.addTile(game.letterBag.removeTile({letter:"X"}));
			human1.rack.addTile(game.letterBag.removeTile({letter:"Y"}));
			human1.rack.addTile(game.letterBag.removeTile({letter:"Z"}));

			game.addPlayer(human2, true);
		})
		.then(() => game.connect(socket1, human1.key))
		.then(() => game.connect(socket2, human2.key))
		.then(() => game.play(human1, move))
		.then(() => socket1.wait());
	});

	it("load from database", () => {
		return getTestGame("unfinished_game", BackendGame)
		.then(game => {
      game.onLoad(new MemoryDatabase());
      //game._debug = console.debug;
			const human = game.getPlayerWithKey("human");
			return game.pass(human, Turn.Type.PASSED);
		});
	});

	it("anotherGame", () => {
		let game, newgame, reload;
		const db = new MemoryDatabase();
    // Load from the test dir, but save to memory
		return getTestGame("unfinished_game", BackendGame)
		.then(g => game = g)
		.then(() => game.onLoad(db))
    .then(() => {
      game._noPlayerShuffle = true;
      //game._debug = console.debug;
      assert.equal(game.state, BackendGame.State.PLAYING);
      assert.equal(game.whosTurnKey, "human");
      // add a new robot player to stop state reverting to WAITING
      game.addPlayer(new Player({
        name:"Anne Droid", key:"android"}, BackendGame.CLASSES), true);
      // Remove robot as last player so they
      // don't get auto-played when human and android time out
      const robot = game.getPlayerWithKey("robot");
      game.removePlayer(robot);

      assert.equal(game.state, BackendGame.State.PLAYING);
      assert.equal(game.whosTurnKey, "human");

      // Make it a timed game
      game.timerType = BackendGame.Timer.GAME;
      game.timeAllowed = 1500 / 60;
    })
		.then(() => game.anotherGame())
		.then(g => newgame = g)
    .then(() => {
      assert.equal(game.state, BackendGame.State.PLAYING);
      assert.equal(game.whosTurnKey, "human");
			assert.notEqual(game.key, newgame.key);
      assert.equal(game.nextGameKey, newgame.key);

      assert.equal(newgame.timerType, game.timerType);
      assert.equal(newgame.challengePenalty, game.challengePenalty);
      assert.equal(newgame.timePenalty, 5);
      assert.equal(newgame.timeAllowed, 1500 / 60);
      assert.equal(newgame.state, BackendGame.State.PLAYING);
      assert.equal(newgame.whosTurnKey, "human");
      assert.equal(newgame.turns.length, 0);
      assert(newgame.stopTheClock());
      // Creating another anotherGame should fail
			return game.anotherGame()
			.catch(e => {
				assert.equal(e, "Next game already exists");
        return undefined;
			});
		})

    // newgame should have been saved. Reload.
    .then(() => db.get(game.nextGameKey))
    .then(d => CBOR.decode(d, BackendGame.CLASSES))
    .then(g => reload = g)
		.then(() => reload.onLoad(db))
    .then(() => {
      //game._debug("Reloaded", reload.key);
      assert.equal(game.nextGameKey, reload.key);
      assert(reload.players.length === game.players.length);
      assert(!reload.nextGameKey);
      assert.equal(reload.whosTurnKey, "human");
      assert.equal(reload.state, BackendGame.State.PLAYING);

      // Suppress misleading asserts, so the anotherGame looks
      // like the original game (though racks will obviously be
      // different)
      game.creationTimestamp = reload.creationTimestamp;
      game.key = reload.key;
      game.state = reload.state;
      game.turns = [];
      game.players.forEach(p => p.clock = 1500);
      reload._debug = game._debug;
      delete(game.nextGameKey);

      return Promise.all([reload.sendable(), game.sendable()])
      .then(s => assert.deepEqual(s[0], s[1]));
    })
    .then(() => reload.playIfReady()) // should start the clock
    .then(() => assert(reload.stopTheClock()))
    .then(() => Promise.all([reload.sendable(), game.sendable()]))
    .then(s => assert.deepEqual(s[0], s[1]));
	});

	it("hint", () => {
		let game;
		const socket1 = new TestSocket("one");
		const socket2 = new TestSocket("two");
		socket1.on(BackendGame.Notify.MESSAGE, mess => {
      if (mess.text === "txt-hinted")
        return;
      assert.equal(mess.args[0], "LO,TRAIL", mess);
      assert.equal(mess.args[1], 4, mess); // col
      assert.equal(mess.args[2], 1, mess); // row
      assert.equal(mess.args[3], 14, mess); // points
      socket1.done();
		})
    .on("*", () => {});
		socket2.on(BackendGame.Notify.MESSAGE, mess => {
      if (mess.text === "txt-hinted")
        return;
      assert.equal(mess.text, "log-no-play");
      socket2.done();
		})
    .on("*", () => {});
		return getTestGame("unfinished_game", BackendGame)
		.then(g => game = g)
		.then(() => game.connect(socket1, game.getPlayer().key))
		.then(() => game.hint(game.getPlayer()))
    .then(() => socket1.wait())
		.then(() => {
      // Empty the rack and wait for the hint
			const p = game.nextPlayer();
			p.rack.empty();
      // Hack the test socket so it will accept another CONNECTIONS
      socket1.finished = false;
			return game.connect(socket2, p.key);
    })
    .then(() => game.hint(game.nextPlayer()))
    .then(() => socket2.wait());
	});

	it("advise", () => {
		let game;
		return getTestGame("unfinished_game", BackendGame)
		.then(g => game = g)
		.then(() => game.anotherGame("human"))
		.then(() => game.toggleAdvice(game.getPlayer()))
		.then(() => game.advise(game.getPlayer(), 1));
	});

	it("last play", () => {
		let game;
    const players = [];
    for (let i = 0; i < 8; i++)
      players.push(new Player( {key: i}, BackendGame.CLASSES));
		return getTestGame("unfinished_game", BackendGame)
		.then(g => game = g)
    .then(() => {
      game.turns = [];
      //game._debug = console.debug;
      game.finishTurn(players[0], { type: Turn.Type.PLAYED });
      game.finishTurn(players[1], { type: Turn.Type.PLAYED });
      game.finishTurn(players[2], { type: Turn.Type.TOOK_BACK });
      assert.equal(game.lastTurn().playerKey, 2);
      game.finishTurn(players[3], { type: Turn.Type.PLAYED });
      game.finishTurn(players[4], { type: Turn.Type.CHALLENGE_WON });
      assert.equal(game.lastTurn().playerKey, 4);
      game.finishTurn(players[5], { type: Turn.Type.PLAYED });
      game.finishTurn(players[6], { type: Turn.Type.CHALLENGE_LOST });
      assert.equal(game.lastTurn().playerKey, 6);
      game.finishTurn(players[7], { type: Turn.Type.GAME_ENDED });
      game.state = BackendGame.State.GAME_OVER;
      assert.equal(game.lastTurn().playerKey, 7);

      game.playIfReady();

      let counter = 0;
      game.forEachTurn((turn, isLast) => {
        assert.equal(turn.playerKey, counter++);
        assert.equal(isLast, counter === 8);
      });
      assert.equal(counter, 8);
    });
  });
});

