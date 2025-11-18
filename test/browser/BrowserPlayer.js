/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha,node */

import { assert } from "chai";
import { setupPlatform, setup$, setupI18n } from "../TestPlatform.js";

import { BrowserGame } from "../../src/browser/BrowserGame.js";
const Player = BrowserGame.CLASSES.Player;

describe("browser/BrowserPlayer", () => {

  before(
    () => setupPlatform()
    .then(() => setup$())
    .then(() => setupI18n()));

  it("$html-robot", () => {
    const p = {
      name: "Player 1",
      key: "playerkey",
      isRobot: true,
      canChallenge: true,
      missNextTurn: true,
      //_debug: console.debug,
      dictionary: "NoDic"
    };
    const player = new Player(p, BrowserGame.CLASSES);

    const $tr = $(document.createElement("tr")).addClass("player-row");
    $tr[0].id = `player${p.key}`;
    $tr.append("<td class='turn-pointer'>&#10148;</td>");
    $tr.append("<td><div class='ui-icon icon-robot'></div></td>");
    $tr.append(`<td class="player-name">${p.name}</td>`);
    $tr.append("<td class='remaining-tiles'></td>");
    $tr.append(`<td class="connect-state online">●</td>`);
    $tr.append("<td class='player-score'>0</td>");
    $tr.append("<td class='player-clock'></td>");

    player.online(false);

    const $act = player.$TR();
    assert($act[0].isEqualNode($tr[0]),
           `expected: ${$tr.html()}\n actual: ${$act.html()}`);
    player.score = 666;
    $("body").append("<div id='playerplayerkey'><div class='player-score'>fail</div></div>");
    player.$refreshScore();
    assert.equal($("#playerplayerkey .player-score").text(), player.score);
  });

  it("$html-human", () => {
    const p = {
      name: "Player 1",
      key: "playerkey",
      isRobot: false,
      canChallenge: false,
      missNextTurn: false,
      //_debug: console.debug,
      dictionary: "NoDic"
    };
    const player = new Player(p, BrowserGame.CLASSES);
    player.score = 20;
    player.online(false);

    const $div = $(document.createElement("table"));
    const $tr = $(document.createElement("tr")).addClass("player-row whosTurn");
    $tr[0].id = `player${p.key}`;

    $tr.append("<td class='turn-pointer'>&#10148;</td>");
    $tr.append("<td><div class='ui-icon icon-person'></div></td>");
    $tr.append(`<td class="player-name">You</td>`);
    $tr.append("<td class='remaining-tiles'></td>");
    $tr.append(`<td class='connect-state offline'>●</td>`);
    $tr.append("<td class='player-score'>20</td>");
    $tr.append("<td class='player-clock'></td>");

    // passing player will make it this player's turn
    const $act = player.$TR(player);

    $div.append($tr);
    $div.append($act);
    assert.equal($tr.html(), $act.html());
    assert($act[0].isEqualNode($tr[0]), $div.html());

  });
});
