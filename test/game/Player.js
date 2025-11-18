/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha */

import { assert } from "chai";
import { setupPlatform } from "../TestPlatform.js";
import { Edition } from "../../src/game/Edition.js";
import { Game } from "../../src/game/Game.js";
const Player = Game.CLASSES.Player;
const Tile = Game.CLASSES.Tile;
/* global describe, it, before */

describe("game/Player", () => {

  before(setupPlatform);

  it("construct", () => {
    const p = {
      name: "name",
      key: "key",
      isRobot: true,
      canChallenge: true,
      dictionary: "NoDic"
    };
    let player = new Player(p, Game.CLASSES);

    // Check fields defaulted from spec
    assert.equal(player.name, p.name);
    assert.equal(player.key, p.key);
    assert.equal(player.isRobot, p.isRobot);
    assert.equal(player.dictionary, p.dictionary);

    // Check fields that must be zeroed
    p.score = 999;
    p.passes = 999;
    p.clock = 999;
    p.missNextTurn = true;

    player = new Player(p, Game.CLASSES);
    assert.equal(player.score, 0);
    assert.equal(player.passes, 0);
    assert.equal(player.clock, 0);
    assert.isFalse(player.missNextTurn);
  });

  it("valueOf, toString, and sendable", () => {
    const p = {
      name: "Player 1",
      key: "playerkey",
      isRobot: false,
      canChallenge: false,
      missNextTurn: false,
      //_debug: console.debug,
      dictionary: "NoDic"
    };
    const player = new Player(p, Game.CLASSES);
    player.isRobot = true;
    player.score = 20;

    return player.sendable()
    .then(d => {
      assert.deepEqual(d, {
        name: 'Player 1',
        isRobot: true,
        dictionary: 'NoDic',
        key: 'playerkey',
        score: 20
      });
      const pp = Player.fromSendable(d, Game.CLASSES);
      pp._debug = player._debug;
      delete player.rack;
      delete pp.rack;
      assert(!pp.canChallenge);
      assert(!pp.missNextTurn);
      assert(pp.isRobot);
      assert.deepEqual(pp, player);
    });
  });

  it("pack / unpack", () => {
    return Edition.load("English_Scrabble")
    .then(edition => {
      const player = new Player({
        name:"Human", key:"player", isRobot: false}, Game.CLASSES);
      player.rack.addTile(new Tile({letter:"D",
                                    score: edition.letterScore("D")}));
      player.rack.addTile(new Tile({letter:"E",
                                    score: edition.letterScore("E")}));
      player.rack.addTile(new Tile({letter:"F",
                                    score: edition.letterScore("F")}));
      player.score = 99;

      const p = player.pack();
      const expected = { k: 'player', n: 'Human', R: 'DEF(5)', s: 99 };

      assert.deepEqual(p, expected);

      const up = new Player({key: "player"}, Game.CLASSES)
            .unpack(expected, edition);
      assert.deepEqual(up, player);
    });
  });
});
