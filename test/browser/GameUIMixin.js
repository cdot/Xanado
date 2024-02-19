/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha, node */

import { assert } from "chai";
import { setupPlatform, setup$, getTestGame } from "../TestPlatform.js";
import { TestSocket } from "../TestSocket.js";
import { BrowserGame } from "../../src/browser/BrowserGame.js";
import { Edition } from "../../src/game/Edition.js";

describe("browser/GameUIMixin", () => {
  let Test, ui, gamesList = [], gamesHistory = [];

  before(
    () => setupPlatform()
    .then(() => setup$())
    // UI imports jquery.i18n which requires jquery, so have
    // to delay the import
    .then(() => Promise.all([
      import("../../src/browser/UI.js"),
      import("../../src/browser/GameUIMixin.js"),
    ]))
    .then(mods => {
      const UI = mods[0].UI;
      const GameUIMixin = mods[1].GameUIMixin;
      Test = class extends GameUIMixin(UI) {
        getSetting(t) {
          switch (t) {
          case "language": return "en";
          case "tile_click": return false;
          }
          assert.fail(t); return false;
        }
        getGames() {
          return Promise.resolve(gamesList);
        }
        getHistory(){
          return Promise.resolve(gamesHistory);
        }
        promiseLocales() {
          return Promise.resolve([ "en" ]);
        }
        getGame(key) {
          const p = gamesList.filter(g => g.key === key)[0];
          return Promise.resolve(p);
        }
        promiseEdition(ed) {
          return Edition.load(ed);
        }
      };
    }));

  beforeEach(() => {
    $("head").empty();
    $("body").html(`
<div id="blankDialog" class="dialog">
 <span data-i18n="txt-blank-dlg"></span>
 <table class="letterTable"></table>
</div>

<div id="distributionDialog" class="dialog">
 <div class="distribution"></div>
</div>

<button id="distribution-button">

<div id="logBlock">
 <div class="messages">
 </div>
</div>`);
    return (ui = new Test()).initLocale()
    .then(() => getTestGame("unfinished_game", BrowserGame))
    .then(game => {
      ui.channel = new TestSocket("socks");
      ui.player = game.players[0];
      return ui.createUI(game);
    });
  });

  it("place on board", () => {
    ui.attachUIEventHandlers();
    ui.attachChannelHandlers();
    ui.readyToListen();
    ui.selectSquare(ui.game.at(0, 0));
    ui.onKeyDown({
      target: $("body")[0],
      key: ui.player.rack.at(0).tile.letter,
      originalEvent: {
      }
    });
  });

  it("place on swap", () => {
    ui.attachUIEventHandlers();
    ui.attachChannelHandlers();
    ui.readyToListen();
    ui.onKeyDown({
      target: $("body")[0],
      key: ui.player.rack.at(0).tile.letter,
      originalEvent: {
        altKey: true
      }
    });
  });

  it("distribution", () => {
    $("#distribution-button").trigger("click");
  });

  it("letters", () => {
    return new Promise(resolve => {
      ui.promptForLetter()
      .then(l => {
        assert.equal(l, "A");
        resolve();
      });
      $("td").first().trigger("click");
    });
  });

  it("place", () => {
    ui.boardLocked = false;
    ui.moveTile(
      ui.game.players[0].rack.at(0),
      ui.game.board.at(0, 0));
  });

  it("handles connections", () => {
    ui.attachChannelHandlers();
    ui.channel.emit(BrowserGame.Notify.CONNECTIONS, []);
  });

  it("handles messages", () => {
    ui.attachChannelHandlers();
    ui.channel.emit(BrowserGame.Notify.MESSAGE, { text: "MESS", args: "Y" });
    ui.channel.emit(BrowserGame.Notify.MESSAGE, { text: "MESS", args: ["Y", "PUP"]});
    ui.channel.emit(BrowserGame.Notify.MESSAGE, {
      text: "_hint_", args: ["ARGH", 5, 5], sender: "Advisor" });
  });

  // Coverage is poor at the moment. Needs work.
});
