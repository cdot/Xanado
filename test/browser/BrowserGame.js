/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha,node */

import { assert } from "chai";
import { setupPlatform, setup$, setupI18n } from "../TestPlatform.js";

import { BrowserGame } from "../../src/browser/BrowserGame.js";
import { Turn as _Turn } from "../../src/game/Turn.js";
const Player = BrowserGame.CLASSES.Player;
const Tile = BrowserGame.CLASSES.Tile;
const Turn = BrowserGame.CLASSES.Turn;

/**
 * Unit tests for Game browser mixin
 */
describe("browser/BrowserGame", () => {

  before(
    () => setupPlatform()
    .then(() => setup$())
    .then(() => setupI18n()));

  it("andList", () => {
    assert.equal(BrowserGame.andList([]), "");
    assert.equal(BrowserGame.andList(["A"]), "A");
    assert.equal(BrowserGame.andList(["A", "B"]), "A and B");
    assert.equal(BrowserGame.andList(["A", "B", "C"]), "A, B and C");
  });

  it("format game info", () => {
		const p = {
			//_debug: console.debug,
			edition:"English_Scrabble",
			dictionary:"Oxford_5000",
			timeAllowed: 999 / 60,
			predictScore: false,
			allowTakeBack: false,
			_noPlayerShuffle: true
		};

		const robot1 = new Player(
			{name:"Robot 1", key:"robot1", isRobot: true}, BrowserGame.CLASSES);
		const human1 = new Player(
			{name:"Human 1", key:"human1", isRobot: false}, BrowserGame.CLASSES);

		const game = new BrowserGame(p);
    return game.create()
		.then(() => {
			game.addPlayer(human1, true);
			game.addPlayer(robot1, true);
			game.whosTurnKey = human1.key;
      const ts = new Date("2000-04-01T01:02:03.04Z");
      game.turns.push(new Turn({
        type: Turn.Type.PLAYED,
        timestamp: ts.getTime()
      }));
      game.creationTimestamp = 0;

      game.state = BrowserGame.State.PLAYING;
      assert.equal(game.formatGameInfo("%e"), `English_Scrabble`);
      assert.equal(
        game.formatGameInfo("%p"), "Human 1 and Robot 1");
      assert.equal(
        game.formatGameInfo("%c"), "Thu Jan 01 1970");
      assert.equal(
        game.formatGameInfo("%l"),
        `${ts.toLocaleDateString()} ${ts.toLocaleTimeString()}`);
      assert.equal(
        game.formatGameInfo("%s"), $.i18n("txt-state-playing"));
      game.state = BrowserGame.State.GAME_OVER;
      assert.equal(
        game.formatGameInfo("%s"), "Human 1 won");
      assert.equal(
        game.formatGameInfo("%k"), game.key);
    });
  });

	it("player table", () => {
		const p = {
			//_debug: console.debug,
			edition:"English_Scrabble",
			dictionary:"Oxford_5000",
			timeAllowed: 999 / 60,
			predictScore: false,
			allowTakeBack: false,
			_noPlayerShuffle: true
		};

		const robot1 = new Player(
			{name:"Robot 1", key:"robot1", isRobot: true}, BrowserGame.CLASSES);
		const human1 = new Player(
			{name:"Human 1", key:"human1", isRobot: false}, BrowserGame.CLASSES);
		const human2 = new Player(
			{name:"Human 2", key:"human2", isRobot: false}, BrowserGame.CLASSES);

		const game = new BrowserGame(p);

    return game.create()
		.then(() => {
			game.addPlayer(human1, true);
			game.addPlayer(robot1, true);
			game.whosTurnKey = human1.key;

			let $tab = $(document.createElement("table")).addClass("player-table");
			let $tr;
			$tr = human1.$TR(human1, false);
			assert($tr.hasClass("whosTurn"));
			$tab.append($tr);
			$tr = robot1.$TR(human1, false);
			$tab.append($tr);
			assert(!$tr.hasClass("whosTurn"));

			let $act = game.$playerTable(game.getPlayer());

			//console.debug(`expect: ${$tab.html()}`);
			//console.debug(`actual: ${$act.html()}`);
			assert($act[0].isEqualNode($tab[0]),
				   `expected: ${$tab.html()}\n actual: ${$act.html()}`);

			game.whosTurnKey = human2.key;
			human1.missNextTurn = true;
			$tr = human2.$TR(human1, false);
			$tab.append($tr);
			assert(!$tr.hasClass("whosTurn"));
			$tab = $(document.createElement("table")).addClass("player-table");
			$tr = human1.$TR(human2, true);
			$tab.append($tr);
			assert(!$tr.hasClass("whosTurn"));
			$tr = robot1.$TR(human2, false);
			$tab.append($tr);
			assert(!$tr.hasClass("whosTurn"));

			$act = game.$playerTable(game.getPlayer());
			assert($act.find("#playerhuman1 td.player-name")
				   .hasClass("miss-turn"));
			//console.debug(`expect: ${$tab.html()}`);
			//console.debug(`actual: ${$act.html()}`);
			assert($act[0].isEqualNode($tab[0]),
				   `expected: ${$tab.html()}\n actual: ${$act.html()}`);

      // Implicitly add player to the game
      human2.isNextToGo = true;
      game.updatePlayerList(game.players.concat([ human2 ]));

			//console.log(game.players);
			$tr = human2.$TR(human2, false);
			assert($tr.hasClass("whosTurn"));
			$tab.append($tr);
    });
	});

  function make_p() {
	  const params = {
		  //_debug: console.debug,
		  edition:"English_Scrabble",
		  dictionary:"Oxford_5000",
		  timeAllowed: 999 / 60,
		  predictScore: false,
		  allowTakeBack: false,
		  _noPlayerShuffle: true,
      challengePenalty: BrowserGame.Penalty.PER_WORD
	  };

    const p = {
	    THEM: new Player(
		    {name:"PlayerThem", key:"THEM", isRobot: true}, BrowserGame.CLASSES),
	    YOU: new Player(
		    {name:"PlayerYou", key:"YOU", isRobot: false}, BrowserGame.CLASSES),
      W: new Tile({letter:"W", score:1, col: 7, row: 7}),
      O: new Tile({letter:"O", score:1, col: 8, row: 7}),
      R: new Tile({letter:"R", score:1, col: 9, row: 7}),
      D: new Tile({letter:"D", score:1, col: 10, row: 7}),
		  game: new BrowserGame(params)
    };
    return p.game.create()
    .then(() => {
			p.game.addPlayer(p.YOU, false);
			p.game.addPlayer(p.THEM, false);
			p.game.whosTurnKey = p.YOU.key;
      return p;
    });
  }

	it("describeTurn tiles played and have replacements", () => {
    return make_p()
		.then(p => {
      // Tiles played and have replacements
      let turn = new Turn({
        type: Turn.Type.PLAYED,
        playerKey: p.THEM.key,
        placements: [ p.W, p.O, p.R, p.D ],
        replacements: [ p.W, p.O, p.R, p.D ],
        words: [ { word: "WORD", score: 10 }],
        score: 20
      });
      let $exp =
          $('<div class="turn-description">')
          .append(
            $('<div class="turn-player"></div>')
            .append('<span class="player-name">PlayerThem\'s</span> turn'))
          .append(
            $('<div class="turn-detail"></div>')
            .append('<span class="turn-score"><span class="word">WORD</span><span class="word-score">(10)</span><span class="turn-total">total 20</span></span>'));
      let sexp = $(document.createElement("div")).append($exp).html();
      let $act = p.game.describeTurn(turn, p.YOU, true);
      let sact = $(document.createElement("div")).append($act).html();
      assert.equal(sact, sexp);
			//assert($act[0].isEqualNode($exp[0]),"\n" +
      //       "actual: " + sact + "\n" +
      //       "expect: " + sexp + "\n");
    });
  });

	it("describeTurn you played and have replacements", () => {
    return make_p()
		.then(p => {
      // Tiles played and have replacements
      const turn = new Turn({
        type: Turn.Type.PLAYED,
        playerKey: p.YOU.key,
        placements: [ p.W, p.O, p.R, p.D ],
        replacements: [ p.W, p.O, p.R, p.D ],
        words: [ { word: "WORD", score: 10 }],
        score: 20
      });
      const $exp = $(document.createElement("div"))
            .append(
              $('<div class="turn-description">')
              .append(
                $('<div class="turn-player"></div>')
                .append('<span class="player-name">Your</span> turn'))
              .append(
                $('<div class="turn-detail"></div>')
                .append('<span class="turn-score"><span class="word">WORD</span><span class="word-score">(10)</span><span class="turn-total">total 20</span></span>')));
      const $act = $(document.createElement("div")).append(
        p.game.describeTurn(turn, p.YOU, true));
			assert($act[0].isEqualNode($exp[0]),"\n" +
             "actual: " + $act.html() + "\n" +
             "expect: " + $exp.html() + "\n");
    });
  });

	it("describeTurn you played but no replacements", () => {
    return make_p()
		.then(p => {
      // Tiles played and have replacements
      const turn = new Turn({
        type: Turn.Type.PLAYED,
        playerKey: p.YOU.key,
        placements: [ p.W, p.O, p.R, p.D ],
        replacements: [],
        words: [ { word: "WORD", score: 10 }],
        score: 20
      });
      const $exp = $('<div><div class="turn-description"><div class="turn-player"><span class="player-name">Your</span> turn</div><div class="turn-detail"><span class="turn-score"><span class="word">WORD</span><span class="word-score">(10)</span><span class="turn-total">total 20</span></span></div><div class="turn-narrative">You have no more tiles, game will be over if your play isn\'t challenged</div></div></div>');
      const $act = $(document.createElement("div")).append(
        p.game.describeTurn(turn, p.YOU, true));
			assert($act[0].isEqualNode($exp[0]),"\n" +
             "actual: " + $act.html() + "\n" +
             "expect: " + $exp.html() + "\n");
    });
  });

	it("describeTurn other played but no replacements", () => {
    return make_p()
		.then(p => {
      // Tiles played but no replacements
      const turn = new Turn({
        type: Turn.Type.PLAYED,
        playerKey: p.THEM.key,
        placements: [ p.W, p.O, p.R, p.D ],
        replacements: [],
        words: [ { word: "WORD", score: 10 }],
        score: 20
      });
      const plan = `${p.THEM.name}'s`;
      const $player = $('<div class="turn-player"></div>')
            .append(`<span class="player-name">${plan}</span> turn`);
      const $word = $('<span class="word"></span>')
            .append("WORD");
      const $wordScore = $('<span class="word-score"></span>')
            .append("(10)");
      const $turnScore = $('<span class="turn-score"></span>')
            .append($word)
            .append($wordScore)
            .append("<span class='turn-total'>total 20</span>");
      const $detail =
            $('<div class="turn-detail"></div>')
            .append($turnScore);
      const nart = `${p.THEM.name} has no more tiles, game will be over unless you challenge`;
      const $narrative = $(`<div class="turn-narrative">${nart}</div>`);
      const $exp = $(document.createElement("div"))
            .append($('<div class="turn-description"></div>')
                    .append($player)
                    .append($detail)
                    .append($narrative));
      const $act = $(document.createElement("div")).append(
        p.game.describeTurn(turn, p.YOU, true));
      //console.log("", sact, "\n", sexp);
			assert($player[0].isEqualNode($act.find(".turn-player")[0]));
			assert($narrative[0].isEqualNode($act.find(".turn-narrative")[0]));
			assert($word[0].isEqualNode($act.find(".word")[0]));
			assert($wordScore[0].isEqualNode($act.find(".word-score")[0]));
      assert($turnScore[0].isEqualNode($act.find(".turn-score")[0]));
			assert($detail[0].isEqualNode($act.find(".turn-detail")[0]));

			assert($exp[0].isEqualNode($act[0]),"\n" +
             "actual: " + $act.html() + "\n" +
             "expect: " + $exp.html() + "\n");
    });
  });

	it("describeTurn you lost a challenge", () => {
    return make_p()
		.then(p => {
      const turn = new Turn({
        type: Turn.Type.CHALLENGE_LOST,
        playerKey: p.THEM.key,
        challengerKey: p.YOU.key,
        placements: [ p.W, p.O, p.R, p.D ],
        words: [ { word: "WORD", score: 10 }],
        score: -20
      });
      const $tp = $('<div class="turn-player"><span class="player-name">Your</span> challenge</div>');
      const tt = "Your challenge of PlayerThem's play failed. You lost 20 points";
      const $td = $('<div class="turn-detail"></div>').append(tt);
      const $desc = $('<div class="turn-description"></div>')
            .append($tp)
            .append($td);

      const $exp = $(document.createElement("div")).append($desc);
      const $act = $(document.createElement("div")).append(
        p.game.describeTurn(turn, p.YOU, true));

      assert($tp[0].isEqualNode($act.find(".turn-player")[0]));
      assert.equal($td.html(), $act.find(".turn-detail").html());

      /* Node.isEqualNode fails, can't see why. Muddy boots. */
      $td.text("BLAH"), $act.find(".turn-detail").text("BLAH");

			assert($act[0].isEqualNode($exp[0]),"\n" +
             "actual: " + $act.html() + "\n" +
             "expect: " + $exp.html() + "\n");
    });
  });

	it("describeTurn other lost a challenge", () => {
    return make_p()
		.then(p => {
      const turn = new Turn({
        type: Turn.Type.CHALLENGE_LOST,
        playerKey: p.YOU.key,
        challengerKey: p.THEM.key,
        placements: [ p.W, p.O, p.R, p.D ],
        words: [ { word: "WORD", score: 10 }],
        score: -20
      });
      const $exp =
      $('<div class="turn-description"><div class="turn-player"><span class="player-name">PlayerThem\'s</span> challenge</div><div class="turn-detail">PlayerThem\'s challenge of your play failed. PlayerThem lost 20 points</div></div>');
      const sexp = $(document.createElement("div")).append($exp).html();
      const $act = p.game.describeTurn(turn, p.YOU, true);
      const sact = $(document.createElement("div")).append($act).html();
      assert.equal(sact, sexp);
			//assert($act[0].isEqualNode($exp[0]),"\n" +
      //       "actual: " + sact + "\n" +
      //       "expect: " + sexp + "\n");
    });
  });

	it("describeTurn you won a challenge", () => {
    return make_p()
		.then(p => {
      const turn = new Turn({
        type: Turn.Type.CHALLENGE_WON,
        playerKey: p.THEM.key,
        challengerKey: p.YOU.key,
        placements: [ p.W, p.O, p.R, p.D ],
        words: [ { word: "WORD", score: 10 }],
        score: 20
      });
      const $exp =
      $('<div class="turn-description"><div class="turn-player"><span class="player-name">PlayerThem\'s</span> turn</div><div class="turn-detail">You successfully challenged PlayerThem\'s play. PlayerThem lost 20 points</div>');
      const sexp = $(document.createElement("div")).append($exp).html();
      const $act = p.game.describeTurn(turn, p.YOU, true);
      const sact = $(document.createElement("div")).append($act).html();
      assert.equal(sact, sexp);
			//assert($act[0].isEqualNode($exp[0]),"\n" +
      //       "actual: " + sact + "\n" +
      //       "expect: " + sexp + "\n");
    });
  });

	it("describeTurn you swapped", () => {
    return make_p()
		.then(p => {
      const turn = new Turn({
        type: Turn.Type.SWAPPED,
        playerKey: p.YOU.key,
        placements: [ p.W, p.O, p.R, p.D ],
        replacements: [ p.W, p.O, p.R, p.D ],
        words: [ { word: "WORD", score: 10 }],
        score: 20
      });
      const $exp =
      $('<div class="turn-description"><div class="turn-player"><span class="player-name">PlayerYou\'s</span> turn</div><div class="turn-detail">Swapped 4 tiles</div>');
      const sexp = $(document.createElement("div")).append($exp).html();
      const $act = p.game.describeTurn(turn, p.THEM, true);
      const sact = $(document.createElement("div")).append($act).html();
      assert.equal(sact, sexp);
			//assert($act[0].isEqualNode($exp[0]),"\n" +
      //       "actual: " + sact + "\n" +
      //       "expect: " + sexp + "\n");
    });
  });

	it("describeTurn end game you won", () => {
    return make_p()
		.then(p => {
      p.YOU.score = 99;
      // rack on the client side (should be ignored)
      p.THEM.rack.addTile(new Tile({letter: "A", score: 1}));
      const endScore = [
        // You gained 10 points
        { key: p.YOU.key, tiles: 10 },
        // They lost 10 points
        { key: p.THEM.key, tiles: -10, tilesRemaining: "Q", time: 0}
      ];
      const turn = new Turn({
        type: Turn.Type.GAME_ENDED,
        playerKey: p.YOU.key,
        score: endScore
      });
      const $exp = $(`<div>
<div class="turn-description">
 <div class="game-state">Game over</div>
 <div class="game-winner">You have won</div>
 <div class="game-end-adjustments">
  <div class="rack-adjust">You gained 10 points from the racks of other players</div>
  <div class="rack-adjust">PlayerThem lost 10 points for a rack containing 'Q'</div>
 </div>
</div></div>`.replace(/>\s*</g, "><"));
      const $act = $("<div></div>").append(
        p.game.describeTurn(turn, p.YOU, false));
			assert($act[0].isEqualNode($exp[0]),"\n" +
             "actual: " + $act.html() + "\n\n" +
             "expect: " + $exp.html() + "\n");
    });
  });

	it("describeTurn end game you lost", () => {
    return make_p()
		.then(p => {
      p.YOU.score = -99;
      p.THEM.score = 99;
      // rack on the client side
      p.YOU.rack.addTile(new Tile({letter: "A", score: 1}));
      const endScore = [
        { key: p.YOU.key, tiles: -10, tilesRemaining: "Z", time: -1},
        { key: p.THEM.key, tiles: 10, time: 0}
      ];
      const turn = new Turn({
        type: Turn.Type.GAME_ENDED,
        playerKey: p.YOU.key,
        score: endScore
      });
      const $exp = $(`<div>

<div class="turn-description">
 <div class="game-state">Game over</div>
 <div class="game-winner">PlayerThem has won</div>
 <div class="game-end-adjustments">
  <div class="rack-adjust">You lost 10 points for a rack containing 'Z'</div>
  <div class="time-adjust">You lost 1 point to the clock</div>
  <div class="rack-adjust">PlayerThem gained 10 points from the racks of other players</div>
 </div>
</div>

</div>`.replace(/>\s*</g, "><"));
      const $act = $("<div></div>").append(p.game.describeTurn(turn, p.YOU, false));
			assert($act[0].isEqualNode($exp[0]),"\n" +
             "actual: " + $act.html() + "\n\n" +
             "expect: " + $exp.html() + "\n");
    });
  });

	it("describeTurn end game you drew", () => {
    // e.g. both players passed twice, result was a draw
    return make_p()
		.then(p => {
      p.THEM.score = 100;
      p.YOU.score = 100;
      p.YOU.rack.addTile(new Tile({letter: "R", score: 1}));
      p.YOU.rack.addTile(new Tile({letter: "S", score: 1}));
      p.YOU.rack.addTile(new Tile({letter: "T", score: 1}));
      p.THEM.rack.addTile(new Tile({letter: "A", score: 1}));
      const endScore = [
        { key: p.YOU.key, tiles: -3, tilesRemaining: "A,E,I", time: 0},
        { key: p.THEM.key, tiles: -7, tilesRemaining: "Q", time: -10}
      ];
      const turn = new Turn({
        type: Turn.Type.GAME_ENDED,
        playerKey: p.YOU.key,
        score: endScore
      });
      const $exp = $(`<div>

<div class="turn-description">
 <div class="game-state">Game over</div>
 <div class="game-winner">You and PlayerThem have won</div>
 <div class="game-end-adjustments">
  <div class="rack-adjust">You lost 3 points for a rack containing 'A,E,I'</div>
  <div class="rack-adjust">PlayerThem lost 7 points for a rack containing 'Q'</div>
  <div class="time-adjust">PlayerThem lost 10 points to the clock</div>
 </div>
</div>

</div>`.replace(/>\s*</g, "><"));
      const $act = $("<div></div>").append(
        p.game.describeTurn(turn, p.YOU, false));
			assert($act[0].isEqualNode($exp[0]),"\n" +
             "actual: " + $act.html() + "\n\n" +
             "expect: " + $exp.html() + "\n");
    });
  });
});

