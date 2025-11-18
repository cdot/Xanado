/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha */

import { assert } from "chai";
import { setupPlatform } from "../TestPlatform.js";

import { Game } from "../../src/game/Game.js";
import { Edition } from "../../src/game/Edition.js";
const Rack = Game.CLASSES.Rack;
const Tile = Game.CLASSES.Tile;

/**
 * Unit tests for Rack
 */
describe("game/Rack", () => {

  before(setupPlatform);

  it("basics", () => {
    let r = new Rack(Game.CLASSES, {id: "base", size: 10});
    assert(r.isEmpty());

    // Add an "A" to the rack. Should go to position 0
    const aTile = new Tile({letter: "A"});
    assert.equal(r.addTile(aTile).col, 0);
    assert(!r.isEmpty());

    // Add a "B" at position 1
    assert.strictEqual(r.addTile(new Tile({letter: "B"})), r.at(1));
    assert.deepEqual(r.letters().sort(), ["A", "B"]);

    // Remove the first tile that looks like "A"
    const t = new Tile({letter: "A"});
    assert.strictEqual(r.removeTile(t), aTile);
    assert.deepEqual(r.letters().sort(), ["B"]);
    assert(!r.at(0).tile);
    assert.equal(r.at(1).tile.col, 1);

    // Place a blank in position 0
    const blank = new Tile({letter:"9",isBlank: true});
    assert.equal(r.addTile(blank).col, 0);
    // Make sure tile was reset
    assert.equal(r.at(0).tile.letter, " ");
    assert.equal(r.addTile(new Tile({letter: "C"})).col, 2);
    assert.equal(r.addTile(new Tile({letter: "D"})).col, 3);
    assert.deepEqual(r.letters().sort(), [" ", "B", "C", "D"]);
    // Make sure a letter tile is found before the blank
    assert.equal(r.findSquare("D").col, 3);
    const before = r.letters();
    assert.deepEqual(before, [" ", "B", "C", "D"]);
    r.shuffle();
    // Find the blank
    assert(r.findSquare("X").tile.isBlank);
    assert.deepEqual(r.letters().sort(), [" ", "B", "C", "D"]);
    assert.deepEqual(r.lettersLeft().sort(), ["B", "C", "D"]);
  });

  it("wild", () => {
    let r = new Rack(Game.CLASSES, { id: "base", size: 10 });
    r.isWild = true;

    // Add an "A" to the rack. Should go to position 0
    const aTile = new Tile({letter: "A"});
    assert.equal(r.addTile(aTile).col, 0);
    assert(!r.isEmpty());

    // Add a "B" at position 1
    assert.strictEqual(r.addTile(new Tile({letter: "B"})), r.at(1));
    assert.deepEqual(r.letters().sort(), ["#", "#"]);

    // Remove the first tile that matches
    const t = new Tile({letter: "Q", row: 99, col: -99, score: 10});
    const b = r.removeTile(t);
    assert.deepEqual(b, t);
    assert.equal(r.lettersLeft().length, 1);

    // Remove the first tile that matches
    const t2 = new Tile({letter: "F", isBlank: true, score: 8});
    const b2 = r.removeTile(t2);
    assert.deepEqual(b2, t2);
    assert.equal(r.lettersLeft().length, 0);
  });

  it("pack", () => {
    return Edition.load("Test")
    .then(edition => {
      let r = new Rack(Game.CLASSES, { id: "base", size: 8 });
      const t = new Tile({letter: " ", isBlank: true});
      r.addTile(t);
      r.addTile(new Tile({letter: "B"}));
      r.addTile(new Tile({letter: "C"}));
      r.addTile(new Tile({letter: "D"}));

      const uri = r.pack();
      assert.equal(uri, "!BCD----");

      r = new Rack(Game.CLASSES, { id: "base", size: 8 });
      r.unpack(uri, edition);
      
      assert.equal(r.at(0).tile.letter, " ");
      assert.equal(r.at(0).tile.isBlank, true);
      assert.equal(r.at(1).tile.letter, "B");
      assert.equal(r.at(2).tile.letter, "C");
      assert.equal(r.at(3).tile.letter, "D");
    });
  });
});

