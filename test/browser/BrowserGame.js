/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha,node */

import { assert } from "chai";
import { setupPlatform, setup$, setupI18n } from "../TestPlatform.js";

import { BrowserGame } from "../../src/browser/BrowserGame.js";
import { BrowserPlayer } from "../../src/browser/BrowserPlayer.js";
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

      human1.score = 99;
      robot1.score = 98;
      
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

      robot1.score = human1.score;
      assert.equal(
        game.formatGameInfo("%s"), "Human 1 and Robot 1 won");
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

  it("describeTurn real game ends in a draw", () => {
    const packed = {
      P0: {
        R: "----U---",
        k: "Computer",
        n: "Computer",
        r: true,
        s: 345
      },
      P1: {
        R: "(8)",
        k: "You",
        n: "You",
        s: 345
      },
      T0: {
        P0: "7-3!M",
        P1: "7-4!A",
        P2: "7-5!U",
        P3: "7-6!V",
        P4: "b7-7!E",
        m: 1711707836073,
        n: "You",
        p: "Computer",
        r0: "0!C",
        r1: "2!N",
        r2: "3!I",
        r3: "4!J",
        r4: "5!R",
        s: 24,
        t: 0,
        w0: "24_MAUVE"
      },
      T1: {
        P0: "4-4!O",
        P1: "5-4!W",
        P2: "6-4!N",
        P3: "8-4!B",
        P4: "9-4!L",
        P5: "10-4!E",
        m: 1711714620899,
        n: "Computer",
        p: "You",
        r0: "0!O",
        r1: "1!S",
        r2: "2!O",
        r3: "3!F",
        r4: "b4! ",
        r5: "5!L",
        s: 48,
        t: 0,
        w0: "48_OWNABLE"
      },
      T2: {
        P0: "8-2!J",
        P1: "8-3!I",
        m: 1711714621286,
        n: "You",
        p: "Computer",
        r0: "3!E",
        r1: "4!B",
        s: 24,
        t: 0,
        w0: "4_MI",
        w1: "20_JIB"
      },
      T3: {
        P0: "3-8!F",
        P1: "4-8!O",
        P2: "5-8!O",
        P3: "6-8!L",
        P4: "7-8!S",
        m: 1711714848854,
        n: "Computer",
        p: "You",
        r0: "0!E",
        r1: "1!T",
        r2: "2!R",
        r3: "3!E",
        r4: "5!E",
        s: 19,
        t: 0,
        w0: "9_FOOLS",
        w1: "10_MAUVES"
      },
      T4: {
        P0: "4-7!B",
        P1: "4-9!L",
        P2: "4-10!T",
        P3: "4-11!E",
        P4: "4-12!R",
        m: 1711714849304,
        n: "You",
        p: "Computer",
        r0: "1!K",
        r1: "3!D",
        r2: "4!A",
        r3: "5!I",
        r4: "6!U",
        s: 16,
        t: 0,
        w0: "16_BOLTER"
      },
      T5: {
        P0: "b9-2!I",
        P1: "10-2!T",
        P2: "11-2!T",
        P3: "12-2!E",
        P4: "13-2!R",
        m: 1711714953288,
        n: "Computer",
        p: "You",
        r0: "1!O",
        r1: "2!O",
        r2: "4!I",
        r3: "5!A",
        r4: "6!A",
        s: 24,
        t: 0,
        w0: "24_JITTER"
      },
      T6: {
        P0: "13-1!C",
        P1: "13-3!A",
        P2: "13-4!N",
        P3: "13-5!K",
        m: 1711714953907,
        n: "You",
        p: "Computer",
        r0: "0!N",
        r1: "1!E",
        r2: "2!E",
        r3: "4!G",
        s: 42,
        t: 0,
        w0: "42_CRANK"
      },
      T7: {
        P0: "2-12!A",
        P1: "3-12!E",
        P2: "5-12!I",
        P3: "6-12!E",
        m: 1711714975689,
        n: "Computer",
        p: "You",
        r0: "0!I",
        r1: "3!T",
        r2: "4!N",
        r3: "6!O",
        s: 12,
        t: 0,
        w0: "12_AERIE"
      },
      T8: {
        P0: "0-13!D",
        P1: "1-13!I",
        P2: "2-13!N",
        P3: "3-13!G",
        m: 1711714976416,
        n: "You",
        p: "Computer",
        r0: "0!T",
        r1: "3!C",
        r2: "4!W",
        r3: "5!R",
        s: 17,
        t: 0,
        w0: "2_AN",
        w1: "3_EG",
        w2: "12_DING"
      },
      T9: {
        P0: "14-5!O",
        P1: "14-6!N",
        P2: "14-7!T",
        P3: "14-8!O",
        m: 1711715019867,
        n: "Computer",
        p: "You",
        r0: "2!A",
        r1: "3!E",
        r2: "4!A",
        r3: "6!I",
        s: 18,
        t: 0,
        w0: "6_KO",
        w1: "12_ONTO"
      },
      T10: {
        P0: "0-11!C",
        P1: "0-12!E",
        P2: "0-14!E",
        m: 1711715020564,
        n: "You",
        p: "Computer",
        r0: "1!X",
        r1: "2!N",
        r2: "3!E",
        s: 30,
        t: 0,
        w0: "30_CEDE"
      },
      T11: {
        P0: "5-3!A",
        P1: "5-5!E",
        m: 1711715040249,
        n: "Computer",
        p: "You",
        r0: "3!P",
        r1: "5!A",
        s: 8,
        t: 0,
        w0: "8_AWE"
      },
      T12: {
        P0: "5-13!E",
        P1: "6-13!X",
        m: 1711715041015,
        n: "You",
        p: "Computer",
        r0: "1!R",
        r1: "3!P",
        s: 24,
        t: 0,
        w0: "4_IE",
        w1: "9_EX",
        w2: "11_EX"
      },
      T13: {
        P0: "11-0!P",
        P1: "11-1!I",
        P2: "11-3!A",
        m: 1711715078466,
        n: "Computer",
        p: "You",
        r0: "3!D",
        r1: "5!Y",
        r2: "6!H",
        s: 18,
        t: 0,
        w0: "18_PITA"
      },
      T14: {
        P0: "3-11!P",
        P1: "5-11!T",
        m: 1711715079145,
        n: "You",
        p: "Computer",
        r0: "0!M",
        r1: "3!H",
        s: 25,
        t: 0,
        w0: "12_PEG",
        w1: "3_TIE",
        w2: "10_PET"
      },
      T15: {
        P0: "9-3!D",
        P1: "9-5!Y",
        m: 1711715165120,
        n: "Computer",
        p: "You",
        r0: "3!G",
        r1: "5!I",
        s: 21,
        t: 0,
        w0: "6_MID",
        w1: "15_IDLY"
      },
      T16: {
        P0: "4-2!W",
        P1: "4-3!H",
        P2: "4-5!M",
        m: 1711715165741,
        n: "You",
        p: "Computer",
        r0: "0!I",
        r1: "3!Y",
        r2: "4!I",
        s: 21,
        t: 0,
        w0: "5_HA",
        w1: "4_ME",
        w2: "12_WHOM"
      },
      T17: {
        P0: "2-2!H",
        P1: "3-2!A",
        m: 1711715178438,
        n: "Computer",
        p: "You",
        r0: "4!D",
        r1: "6!E",
        s: 18,
        t: 0,
        w0: "18_HAW"
      },
      T18: {
        P0: "14-2!Y",
        m: 1711715179136,
        n: "You",
        p: "Computer",
        r0: "3!V",
        s: 16,
        t: 0,
        w0: "16_JITTERY"
      },
      T19: {
        P0: "0-1!G",
        P1: "1-1!O",
        P2: "2-1!A",
        P3: "3-1!D",
        m: 1711715305943,
        n: "Computer",
        p: "You",
        r0: "1!S",
        r1: "2!F",
        r2: "3!D",
        r3: "4!S",
        s: 20,
        t: 0,
        w0: "12_GOAD",
        w1: "5_AH",
        w2: "3_DA"
      },
      T20: {
        P0: "2-7!N",
        P1: "3-7!I",
        m: 1711715306613,
        n: "You",
        p: "Computer",
        r0: "2!R",
        r1: "4!I",
        s: 12,
        t: 0,
        w0: "6_IF",
        w1: "6_NIB"
      },
      T21: {
        P0: "0-0!E",
        P1: "1-0!D",
        m: 1711715321327,
        n: "Computer",
        p: "You",
        r0: "3!T",
        r1: "6!N",
        s: 21,
        t: 0,
        w0: "9_ED",
        w1: "9_EG",
        w2: "3_DO"
      },
      T22: {
        P0: "2-5!R",
        P1: "3-5!I",
        m: 1711715322004,
        n: "You",
        p: "Computer",
        r0: "4!A",
        r1: "5!E",
        s: 6,
        t: 0,
        w0: "6_RIME"
      },
      T23: {
        P0: "6-11!S",
        m: 1711715369386,
        n: "Computer",
        p: "You",
        r0: "4!R",
        s: 16,
        t: 0,
        w0: "6_PETS",
        w1: "10_SEX"
      },
      T24: {
        P0: "9-0!A",
        P1: "9-1!V",
        m: 1711715370132,
        n: "You",
        p: "Computer",
        r0: "3!S",
        r1: "4!U",
        s: 20,
        t: 0,
        w0: "20_AVIDLY"
      },
      T25: {
        P0: "1-14!F",
        P1: "2-14!T",
        P2: "3-14!S",
        m: 1711715434157,
        n: "Computer",
        p: "You",
        r0: "1!Z",
        r1: "2!O",
        r2: "3!U",
        s: 24,
        t: 0,
        w0: "8_EFTS",
        w1: "5_IF",
        w2: "3_ANT",
        w3: "8_PEGS"
      },
      T26: {
        P0: "5-2!S",
        P1: "5-6!R",
        m: 1711715435117,
        n: "You",
        p: "Computer",
        r0: "2!G",
        r1: "3!Q",
        s: 18,
        t: 0,
        w0: "10_HAWS",
        w1: "8_SAWER"
      },
      T27: {
        P0: "7-0!Z",
        P1: "8-0!O",
        m: 1711715485064,
        n: "Computer",
        p: "You",
        r0: "1!A",
        r1: "2!L",
        s: 36,
        t: 0,
        w0: "36_ZOA"
      },
      T28: {
        P0: "11-7!Q",
        P1: "12-7!U",
        P2: "13-7!I",
        m: 1711715485827,
        n: "You",
        p: "Computer",
        r0: "0!O",
        r1: "3!E",
        s: 23,
        t: 0,
        w0: "23_QUIT"
      },
      T29: {
        P0: "11-8!U",
        P1: "11-9!A",
        P2: "11-10!I",
        P3: "11-11!L",
        m: 1711715545759,
        n: "Computer",
        p: "You",
        s: 28,
        t: 0,
        w0: "28_QUAIL"
      },
      T30: {
        P0: "1-3!E",
        P1: "1-4!R",
        P2: "1-5!G",
        P3: "1-6!O",
        m: 1711715546548,
        n: "You",
        p: "Computer",
        s: 21,
        t: 0,
        w0: "12_GRIME",
        w1: "9_ERGO"
      },
      T31: {
        P0: "12-8!R",
        P1: "12-9!N",
        m: 1711715597695,
        n: "Computer",
        p: "You",
        s: 9,
        t: 0,
        w0: "3_UR",
        w1: "2_AN",
        w2: "4_URN"
      },
      T32: {
        P0: "6-6!E",
        m: 1711715598288,
        n: "You",
        p: "Computer",
        s: 7,
        t: 0,
        w0: "7_REV"
      },
      T33: {
        P0: "12-0!I",
        m: 1711715620463,
        n: "Computer",
        p: "You",
        s: 4,
        t: 0,
        w0: "4_PI"
      },
      T34: {
        e: 3,
        e0: {
          r: "U",
          t: -1
        },
        e1: {
          t: 1
        },
        m: 1711715620487,
        p: "Computer",
        t: 2
      },
      a: 1711715620487,
      b: "EG(9)CEDEDO-ERGO(6)IF-AH--R-N----ANT-DA--I-IF--PEGS--WHOM-BOLTER----SAWER-O--TIE(5)N-E-L--SEX-Z--MAUVeS(6)O-JIB(10)AViDLY(11)T-E(10)PITA---QUAIL---I-E----URN(6)CRANK-I(9)Y--ONTO(6)",
      c: 1,
      d: "British_English",
      e: "English_Scrabble",
      i: true,
      k: "0f3cddcd3e682b32",
      m: 1711707835801,
      s: 3,
      t: 0,
      u: true,
      v: 0,
      w: "Computer"
    };
    return BrowserGame.unpack(packed)
    .then(game => {
      const $div = game.describeTurn(game.turns[34], game.players[1], true).html();
      assert.equal($div, `<div class="game-state">Game over</div><div class="game-winner">Computer and You have won</div><div class="game-end-adjustments"><div class="rack-adjust">Computer lost 1 point for a rack containing 'U'</div><div class="rack-adjust">You gained 1 point from the racks of other players</div></div>`);
    });
  });
});

