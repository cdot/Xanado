/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha,node */

import { assert } from "chai";
import { setupPlatform } from "../TestPlatform.js";

import { BackendGame } from "../../src/backend/BackendGame.js";
import { findBestPlay } from "../../src/backend/findBestPlayController.js";
const Player = BackendGame.CLASSES.Player;
const Tile = BackendGame.CLASSES.Tile;
const Rack = BackendGame.CLASSES.Rack;
const Move = BackendGame.CLASSES.Move;

describe("backend/findBestPlay", () => {

  before(setupPlatform);

  it("worker", () => {
    let bestMoves = [];
    let rack = new Rack(BackendGame.CLASSES, { id: "base", size: 3 });
    rack.addTile(new Tile({letter:"A", isBlank:false, score:1}));
    rack.addTile(new Tile({letter:"C", isBlank:false, score:3}));
    rack.addTile(new Tile({letter:"R", isBlank:false, score:1}));
    return new BackendGame({
      edition:"English_WWF",
      dictionary:"CSW2021_English"
    })
    .create()
    .then(game => {
      game.addPlayer(new Player({
        name:"test", key:"toast", isRobot:true}, BackendGame.CLASSES), true);
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
        assert(move instanceof Move);
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
});

