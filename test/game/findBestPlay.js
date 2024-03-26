/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha */
/* global describe, before, it */

import { assert } from "chai";
import { setupPlatform, UNit} from "../TestPlatform.js";
import { Game } from "../../src/game/Game.js";
import { findBestPlay } from "../../src/game/findBestPlay.js";
const Player = Game.CLASSES.Player;
const Tile = Game.CLASSES.Tile;
const Rack = Game.CLASSES.Rack;
const Move = Game.CLASSES.Move;

import { CBOR } from "../../src/game/CBOR.js";

describe("game/findBestPlay", () => {

  before(setupPlatform);

  it("blanks", () => {
    let bestMoves = [];
    return new Game({
      edition:"English_WWF",
      dictionary:"Oxford_5000"
    }).create()
    .then(game => {
      game.addPlayer(new Player({
        name:"test", key:"creep", isRobot:true}, Game.CLASSES), true);
      return game.loadBoard(
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| |S|E|N|S|O|R|Y| | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n");
    })
    .then(game => findBestPlay(
      game, [
        new Tile({letter:"E", isBlank:false, score:1}),
        new Tile({letter:"I", isBlank:false, score:1}),
        new Tile({letter:"I", isBlank:false, score:1}),
        new Tile({letter:"Y", isBlank:false, score:1}),
        new Tile({letter:"A", isBlank:false, score:1}),
        new Tile({letter:"H", isBlank:false, score:1}),
        new Tile({letter:" ", isBlank:true, score:0}),
        new Tile({letter:" ", isBlank:true, score:0})
      ],
      move => bestMoves.push(move),
      game.dictionary))
    .then(() => {
      assert.equal(bestMoves[5].words.length, 1);
      assert.equal(bestMoves[5].words[0].word, "HAIRIEST");
      assert.equal(bestMoves[5].score, 42);
      assert.equal(bestMoves.length, 6);
    });
  });

  it("crag/acts", () => {
    let bestMoves = [];
    let rack = new Rack(Game.CLASSES, { id: "base", size: 3 });
    rack.addTile(new Tile({letter:"A", isBlank:false, score:1}));
    rack.addTile(new Tile({letter:"C", isBlank:false, score:3}));
    rack.addTile(new Tile({letter:"R", isBlank:false, score:1}));
    return new Game({
      edition:"English_WWF",
      dictionary:"British_English"
    })
    .create()
    .then(game => {
      game.addPlayer(new Player({
        name:"test", key:"toast", isRobot:true}, Game.CLASSES), true);
      return game.loadBoard(
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | |G| | | | | | | | | | |\n" +
        "| | | |C|R|A| | | | | | | | | |\n" +
        "| | | |T|O| | | | | | | | | | |\n" +
        "| | | |S|T|E|P| | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n");
    })
    .then(game => findBestPlay(
      game, rack.tiles(),
      move => bestMoves.push(move),
      game.dictionary))

    .then(() => {
      assert.equal(bestMoves.length, 2);
      const last = bestMoves.pop();
      assert.equal(last.words.length, 2);
      assert.equal(last.words[0].word, "ACTS");
      assert.equal(last.words[0].score, 7);
      assert.equal(last.words[1].word, "CRAG");
      assert.equal(last.words[1].score, 8);
      assert.equal(last.score, 15);
      assert.equal(last.placements.length, 3);
      assert(last.placements[0] instanceof Tile);
      assert.equal(last.placements[0].letter, "C");
      assert.equal(last.placements[0].score, 3);
      assert.equal(last.placements[0].col, 1);
      assert.equal(last.placements[0].row, 6);
      assert.equal(last.placements[1].letter, "R");
      assert.equal(last.placements[1].score, 1);
      assert.equal(last.placements[1].col, 2);
      assert.equal(last.placements[1].row, 6);
      assert.equal(last.placements[2].letter, "A");
      assert.equal(last.placements[2].score, 1);
      assert.equal(last.placements[2].col, 3);
      assert.equal(last.placements[2].row, 6);
    });
  });

  it("noe", () => {
    let bestMoves = [];
    let rack = new Rack(Game.CLASSES, { id: "best", size: 7 });
    rack.addTile(new Tile({letter:"L", isBlank:false, score:1}));
    rack.addTile(new Tile({letter:"I", isBlank:false, score:1}));
    rack.addTile(new Tile({letter:"G", isBlank:false, score:2}));
    rack.addTile(new Tile({letter:"E", isBlank:false, score:1}));
    rack.addTile(new Tile({letter:"B", isBlank:false, score:3}));
    rack.addTile(new Tile({letter:"A", isBlank:false, score:1}));
    rack.addTile(new Tile({letter:"A", isBlank:false, score:1}));
    return new Game({
      edition:"English_Scrabble",
      dictionary:"British_English"
    }).create()
    .then(game => {
      game.addPlayer(new Player(
        {name:"test", key:"slime", isRobot:true}, Game.CLASSES), true);
      return game.loadBoard(
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | |P| | | | | | | | | |\n" +
        "| | | | |T|A|X|I| | | | | | | |\n" +
        "| | | | |O|N| | | | | | | | | |\n" +
        "| | | | |W| | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n");
    })

    .then(game => findBestPlay(
      game, rack.tiles(),
      move => {
        //console.log(move);
        assert(move instanceof Move);
        bestMoves.push(move);
      },
      game.dictionary))

    .then(() => {
      assert.equal(bestMoves.length, 4);
      const bm = bestMoves.pop();
      assert.equal(bm.words.length, 3);
      assert.equal(bm.words[0].word, "PA");
      assert.equal(bm.words[0].score, 5);
      assert.equal(bm.words[1].word, "ONE");
      assert.equal(bm.words[1].score, 4);
      assert.equal(bm.words[2].word, "AXE");
      assert.equal(bm.words[2].score, 12);
      assert.equal(bm.score, 21);
    });
  });

  it("town", () => {
    let bestMoves = [];
    const rack = new Rack(Game.CLASSES, { id: "best", size: 7 });
    rack.addTile(new Tile({letter:"U", isBlank:false, score:1}));
    rack.addTile(new Tile({letter:"T", isBlank:false, score:1}));
    rack.addTile(new Tile({letter:"R", isBlank:false, score:1}));
    rack.addTile(new Tile({letter:"N", isBlank:false, score:1}));
    rack.addTile(new Tile({letter:"M", isBlank:false, score:3}));
    rack.addTile(new Tile({letter:"K", isBlank:false, score:5}));
    rack.addTile(new Tile({letter:"I", isBlank:false, score:1}));
    return new Game({
      edition:"English_Scrabble",
      dictionary:"Oxford_5000"
    }).create()
    .then(game => {
      game.addPlayer(new Player(
        {name:"test", key:"crisp", isRobot:true}, Game.CLASSES), true);
      return game.loadBoard(
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | |B|E|L|O|W| | | | | |\n" +
        "| | | | | | | |A| | | | | | | |\n" +
        "| | | | |A|T|A|X|I|C| | | | | |\n" +
        "| | | | | |O| | | | | | | | | |\n" +
        "| | | | | |W|H|I|P|S| | | | | |\n" +
        "| | | | | | | |T| |O| | | | | |\n" +
        "| | | | | | | |A| |U| | | | | |\n" +
        "| | | | | | | |L| |N| | | | | |\n" +
        "| | | | | | | |I| |D| | | | | |\n" +
        "| | | | | | | |C| | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n");
    })
    .then(game => findBestPlay(
      game, rack.tiles(),
      move => {
        //console.log(move);
        assert(move instanceof Move);
        bestMoves.push(move);
      },
      game.dictionary))
    .then(() => {
      const last = bestMoves[bestMoves.length - 1];
      assert.equal(last.words.length, 3);
      assert.equal(last.words[0].word, "TOWN");
      assert.equal(last.words[0].score, 7);
    });
  });

  it("obliques", () => {
    let bestMoves = [];
    return new Game({
      edition:"English_WWF",
      dictionary:"British_English"
    }).create()
    .then(game => {
      game.addPlayer(new Player(
        {name:"test", key:"turntable", isRobot:true},
        Game.CLASSES), true);
      return game.loadBoard(
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | |G| | | | | | | | | |\n" +
        "| | | | | |Y| | | | | | | | | |\n" +
        "| | | | | |B| | | | | | | | | |\n" +
        "| | | | |I|B|E|X| | | | | | | |\n" +
        "| | | |F| |E|M|I|T| | | | | | |\n" +
        "| |H|O|A|R|D|S| |O|V|A|L| | | |\n" +
        "| | | |W| | | |T| | | | | | | |\n" +
        "|G|L|E|N| | | |O| | | | | | | |\n" +
        "| | |W|E| | | |A| | | | | | | |\n" +
        "| | |E|R|R|A|N|D| | | | | | | |\n" +
        "| | | | | | | |Y| | | | | | | |\n");
    })
    .then(game => findBestPlay(
      game, [
        new Tile({letter:"O", isBlank:false, score:1}),
        new Tile({letter:"I", isBlank:false, score:1}),
        new Tile({letter:"Q", isBlank:false, score:10}),
        new Tile({letter:"U", isBlank:false, score:2}),
        new Tile({letter:"E", isBlank:false, score:1}),
        new Tile({letter:"S", isBlank:false, score:1}),
        new Tile({letter:" ", isBlank:true, score:0})
      ],
      move => {
        //console.log(move);
        assert(move instanceof Move);
        bestMoves.push(move);
      },
      game.dictionary))
    .then(() => {
      const bm = bestMoves.pop();
      assert.equal(bm.words[0].word, "OBLIQUES");
      assert.equal(bm.words[0].score, 228);
    });
  });

  it("quit/qi up/down", () => {
    let bestMoves = [];
    return new Game({
      edition:"English_Scrabble",
      dictionary:"British_English"//, _debug: console.debug
    }).create()
    .then(game => {
      game.addPlayer(new Player(
        {name:"test", key:"turntable", isRobot:true},
        Game.CLASSES), true);
      return game.loadBoard(
        "| | |X|Y|Y|Y|X|X|X|X|X|X|X|X|X|\n" +
        "| |U|I|T| |Y|X|X|X|X|X|X|X|X|X|\n" +
        "| | |X|Y|Y|Y|X|X|X|X|X|X|X|X|X|\n" +
        "| |X|X|X|Y|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n");
    })
    .then(game => findBestPlay(
      game, [
        new Tile({letter:"Q", isBlank:false, score:1}),
        new Tile({letter:"I", isBlank:false, score:1})
      ],
      move => {
        //console.log(move);
        assert(move instanceof Move);
        bestMoves.push(move);
      },
      game.dictionary))
    .then(() => {
      let bm = bestMoves.pop();
      assert.equal(bm.words[0].word, "QUIT");
      assert.equal(bm.words[0].score, 4);
      assert.equal(bm.words[1].word, "QI");
      assert.equal(bm.words[1].score, 2);
      assert.equal(bm.words.length, 2);
      assert.equal(bm.score, 6);
    });
  });

  it("quit/qi across", () => {
    let bestMoves = [];
    return new Game({
      edition:"English_Scrabble",
      dictionary:"British_English"//, _debug: console.debug
    }).create()
    .then(game => {
      game.addPlayer(new Player(
        {name:"test", key:"turntable", isRobot:true},
        Game.CLASSES), true);
      return game.loadBoard(
        "| | | |Y|Y|Y|X|X|X|X|X|X|X|X|X|\n" +
        "|U| |X|X|X|Y|X|X|X|X|X|X|X|X|X|\n" +
        "|I|X|X|Y|Y|Y|X|X|X|X|X|X|X|X|X|\n" +
        "|T|X|X|X|Y|X|X|X|X|X|X|X|X|X|X|\n" +
        "| |X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n");
    })
    .then(game => findBestPlay(
      game, [
        new Tile({letter:"Q", isBlank:false, score:1}),
        new Tile({letter:"I", isBlank:false, score:1})
      ],
      move => {
        //console.log(move);
        assert(move instanceof Move);
        bestMoves.push(move);
      },
      game.dictionary))
    .then(() => {
      const bm = bestMoves.pop();
      assert.equal(bm.words[0].word, "QUIT");
      assert.equal(bm.words[0].score, 12);
      assert.equal(bm.words[1].word, "QI");
      assert.equal(bm.words[1].score, 6);
      assert.equal(bm.words.length, 2);
      assert.equal(bm.score, 18);
      //console.log(bm);
    });
  });

  it("pee/eg up/down", () => {
    let bestMoves = [];
    return new Game({
      edition:"English_Scrabble",
      dictionary:"British_English"//, _debug: console.debug
    }).create()
    .then(game => {
      game.addPlayer(new Player(
        {name:"test", key:"turntable", isRobot:true},
        Game.CLASSES), true);
      return game.loadBoard(
        "|P|E| | |Y|Y|X|X|X|X|X|X|X|X|X|\n" +
        "| | | | |X|Y|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X| |Y|Y|Y|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|Y|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n");
    })
    .then(game => findBestPlay(
      game, [
        new Tile({letter:"E", isBlank:false, score:1}),
        new Tile({letter:"G", isBlank:false, score:1})
      ],
      move => {
        //console.log(move);
        assert(move instanceof Move);
        bestMoves.push(move);
      },
      game.dictionary))
    .then(() => {
      const bm = bestMoves.pop();
      assert.equal(bm.words[0].word, "PEE");
      assert.equal(bm.words[1].word, "EG");
      assert.equal(bm.words[0].score, 5);
      assert.equal(bm.words[1].score, 2);
      assert.equal(bm.words.length, 2);
      assert.equal(bm.score, 7);
      //console.log(bm);
    });
  });

  it("pee/eg across", () => {
    let bestMoves = [];
    return new Game({
      edition:"English_Scrabble",
      dictionary:"British_English"//, _debug: console.debug
    }).create()
    .then(game => {
      game.addPlayer(new Player(
        {name:"test", key:"turntable", isRobot:true},
        Game.CLASSES), true);
      return game.loadBoard(
        "|P|X|X|Y|Y|Y|X|X|X|X|X|X|X|X|X|\n" +
        "|E| |X|X|X|Y|X|X|X|X|X|X|X|X|X|\n" +
        "| | | |Y|Y|Y|X|X|X|X|X|X|X|X|X|\n" +
        "| | |X|X|Y|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n");
    })
    .then(game => findBestPlay(
      game, [
        new Tile({letter:"E", isBlank:false, score:1}),
        new Tile({letter:"G", isBlank:false, score:1})
      ],
      move => {
        //console.log(move);
        assert(move instanceof Move);
        bestMoves.push(move);
      },
      game.dictionary))
    .then(() => {
      const bm = bestMoves.pop();
      assert.equal(bm.words[0].word, "PEE");
      assert.equal(bm.words[1].word, "EG");
      assert.equal(bm.words[0].score, 5);
      assert.equal(bm.words[1].score, 2);
      assert.equal(bm.words.length, 2);
      assert.equal(bm.score, 7);
      //console.log(bm);
    });
  });

  it("ask/swig wigs/ask", () => {
    let bestMoves = [];
    return new Game({
      edition:"English_Scrabble",
      dictionary:"British_English"//, _debug: console.debug
    }).create()
    .then(game => {
      game.addPlayer(new Player(
        {name:"test", key:"turntable", isRobot:true},
        Game.CLASSES), true);
      return game.loadBoard(
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X| |X|X|X| |X|X|X|X|X|\n" +
        "|X|X|X|X| | | |X| | | |X|X|X|X|\n" +
        "|X|X|X|X| | |W|I|G| | |X|X|X|X|\n" +
        "|X|X|X|X| | | |X| | | |X|X|X|X|\n" +
        "|X|X|X|X|X| |X|X|X| |X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n" +
        "|X|X|X|X|X|X|X|X|X|X|X|X|X|X|X|\n");
    })
    .then(game => findBestPlay(
      game, [
        new Tile({letter:"A", isBlank:false, score:1}),
        new Tile({letter:"S", isBlank:false, score:1}),
        new Tile({letter:"K", isBlank:false, score:1})
      ],
      move => {
        //console.log(move);
        assert(move instanceof Move);
        bestMoves.push(move);
      },
      game.dictionary))
    .then(() => {
      // Only SWIG/ASK will be found, because WIGS/ASK scores
      // the same.
      let bm = bestMoves.pop();
      assert.equal(bm.words[0].word, "SWIG");
      assert.equal(bm.words[0].score, 8);
      assert.equal(bm.words[1].word, "ASK");
      assert.equal(bm.words[1].score, 3);
      assert.equal(bm.words.length, 2);
      assert.equal(bm.score, 11);
      bm = bestMoves.pop();
    });
  });

  it("jigsawion", () => {
    // I can't reproduce it, but the standalone game definitely tried to play "JIGSAWION", though
    // it might have been a UI problem.
    let bestMoves = [];
    return Game.unpack({
      P0: {
        R: "IAWIONY-",
        k: "Computer",
        n: "Computer",
        r: true,
        s: 119
      },
      P1: {
        R: "GUISIPD-",
        k: "You",
        n: "You",
        s: 124
      },
      T0: {
        P0: "7-5!W",
        P1: "7-6!E",
        P2: "7-7!B",
        m: 1710839719615,
        n: "You",
        p: "Computer",
        r: "IAI",
        s: 16,
        t: 0
      },
      T1: {
        P0: "8-7!E",
        P1: "9-7!R",
        P2: "10-7!A",
        P3: "11-7!T",
        P4: "12-7!I",
        P5: "13-7!O",
        P6: "14-7!N",
        m: 1710841174038,
        n: "Computer",
        p: "You",
        r: "AOIUIEE",
        s: 83,
        t: 0
      },
      T2: {
        P0: "8-5!A",
        P1: "9-5!V",
        P2: "10-5!E",
        m: 1710841174250,
        n: "You",
        p: "Computer",
        r: "GRI",
        s: 18,
        t: 0
      },
      T3: {
        P0: "9-4!O",
        P1: "9-6!E",
        m: 1710841220625,
        n: "Computer",
        p: "You",
        r: "FM",
        s: 7,
        t: 0
      },
      T4: {
        m: 1710841220888,
        P0: "9-3!C",
        P1: "10-3!R",
        P2: "11-3!I",
        P3: "12-3!B",
        n: "You",
        p: "Computer",
        r: "JYAO",
        s: 26,
        t: 0
      },
      T5: {
        P0: "12-1!F",
        P1: "12-2!A",
        m: 1710841322309,
        n: "Computer",
        p: "You",
        r: " U",
        s: 16,
        t: 0
      },
      T6: {
        P0: "12-6!J",
        P1: "12-8!G",
        m: 1710841322575,
        n: "You",
        p: "Computer",
        r: "WN",
        s: 21,
        t: 0
      },
      T7: {
        m: 1710841453538,
        n: "Computer",
        p: "You",
        r: "GSPD",
        s: 18,
        t: 0,
        P0: "10-9!M",
        P1: "11-9!U",
        P2: "b12-9!S",
        P3: "13-9!E"
      },
      a: 1710841453886,
      b: "(110)WEB(12)A-E(10)COVER(10)R-E-A-M(8)I---T-U(6)FAB--JIGs(12)O-E(12)N(7)",
      c: 1,
      d: "British_English",
      e: "English_Scrabble",
      i: true,
      k: "8549caf1c9275a9a",
      m: 1710839719502,
      s: 1,
      t: 0,
      u: true,
      v: 0,
      w: "Computer"
    })
    .then(game => {
      //game._debug = console.debug;
      return findBestPlay(
        game, [
          new Tile({letter:"I", score:1}),
          new Tile({letter:"A", score:1}),
          new Tile({letter:"W", score:4}),
          new Tile({letter:"I", score:1}),
          new Tile({letter:"O", score:1}),
          new Tile({letter:"N", score:1}),
          new Tile({letter:"Y", score:4})
        ],
        move => {
          //console.log(move);
          assert(move instanceof Move);
          bestMoves.push(move);
        },
        game.dictionary)
      .then(() => {
        let bm = bestMoves.pop();
        assert.equal(bm.words[0].word, "JIGSAWN");
        assert.equal(bm.words[0].score, 34);
        assert.equal(bm.words.length, 1);
        assert.equal(bm.score, 34);
        bm = bestMoves.pop();
      });
    });
  });
});
