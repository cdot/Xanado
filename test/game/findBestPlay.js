/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha */

import { assert } from "chai";
import { setupPlatform, UNit} from "../TestPlatform.js";

import { Game } from "../../src/game/Game.js";
import { findBestPlay } from "../../src/game/findBestPlay.js";
const Player = Game.CLASSES.Player;
const Tile = Game.CLASSES.Tile;
const Rack = Game.CLASSES.Rack;
const Move = Game.CLASSES.Move;

describe("game/findBestPlay", () => {

  before(setupPlatform);

  UNit("blanks", () => {
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
      move => {
        //console.log(move);
        if (move instanceof Move)
          bestMoves.push(move);
      },
      game.dictionary))
    .then(() => {
      assert.equal(bestMoves[5].words[0].word, "HAIRIEST");
      assert.equal(bestMoves[5].words.length, 1);
      assert.equal(bestMoves[5].score, 42);
      assert.equal(bestMoves.length, 6);
    });
  });

  UNit("acts", () => {
    let bestMoves = [];
    let rack = new Rack(Game.CLASSES, { id: "base", size: 3 });
    rack.addTile(new Tile({letter:"A", isBlank:false, score:1}));
    rack.addTile(new Tile({letter:"C", isBlank:false, score:3}));
    rack.addTile(new Tile({letter:"R", isBlank:false, score:1}));
    return new Game({
      edition:"English_WWF",
      dictionary:"SOWPODS_English"
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
      move => {
        //console.log(move);
        if (move instanceof Move)
          bestMoves.push(move);
      },
      game.dictionary))

    .then(() => {
      assert.equal(bestMoves.length, 3);
      const last = bestMoves[2];
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

  UNit("noe", () => {
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
      dictionary:"SOWPODS_English"
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
        if (move instanceof Move)
          bestMoves.push(move);
      },
      game.dictionary))

    .then(() => {
      assert.equal(bestMoves.length, 2);

      assert.equal(bestMoves[0].words.length, 1);
      assert.equal(bestMoves[0].words[0].word, "ATAXIA");
      assert.equal(bestMoves[0].words[0].score, 14);

      assert.equal(bestMoves[1].words.length, 1);
      assert.equal(bestMoves[1].words[0].word, "TOWABLE");
      assert.equal(bestMoves[1].words[0].score, 24);
    });
  });

  UNit("town", () => {
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
        if (move instanceof Move)
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

  UNit("obliques", () => {
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
        if (move instanceof Move)
          bestMoves.push(move);
      },
      game.dictionary))
    .then(() => {
      const bm = bestMoves.pop();
      assert.equal(bm.words[0].word, "OBLIQUES");
      assert.equal(bm.words[0].score, 228);
    });
  });

  it("girths/use", () => {
    let bestMoves = [];
    return new Game({
      edition:"English_Scrabble",
      dictionary:"British_English",
      _debug: console.debug
    }).create()
    .then(game => {
      game.addPlayer(new Player(
        {name:"test", key:"turntable", isRobot:true},
        Game.CLASSES), true);
      return game.loadBoard(
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | |P| | | |\n" +
        "| | | | | | | | | | | |A| | | |\n" +
        "| | | | | | | | | | | |T| | | |\n" +
        "| | | | | | | | | |A|C|E| | | |\n" +
        "| | | | | | | | | |J| | | | | |\n" +
        "| | | | | | | | |D|A| | | | | |\n" +
        "| | | | | | | |G|I|R|T|H| | | |\n" +
        "| | | | | | | | |V| |E| | | | |\n" +
        "| |L| | | |R| | |A| |N| | |K| |\n" +
        "| |O| | |W|A|G|E|S| |C| | |O| |\n" +
        "| |A| |M|E|N| |X| | |H|A|B|I|T|\n" +
        "| |F|R|O|N|D| |P|I| | | |U| |R|\n" +
        "| |E| |W| |Y| |O|F| | | |R| |I|\n" +
        "| |D| |N| | | |S| |L|A|Z|Y| |M|\n");
    })
    .then(game => findBestPlay(
      game, [
        new Tile({letter:"I", isBlank:false, score:1}),
        new Tile({letter:"U", isBlank:false, score:1}),
        new Tile({letter:"E", isBlank:false, score:1}),
        new Tile({letter:"U", isBlank:false, score:1}),
        new Tile({letter:"S", isBlank:false, score:1}),
        new Tile({letter:"I", isBlank:false, score:1}),
        new Tile({letter:"E", isBlank:false, score:1})
      ],
      move => {
        console.log(move);
        if (move instanceof Move)
          bestMoves.push(move);
      },
      game.dictionary))
    .then(() => {
      console.log(bestMoves[bestMoves.length-1]);
    });
  });
});

