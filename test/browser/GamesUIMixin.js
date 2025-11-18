/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha, node */

import { assert } from "chai";
import { setupPlatform, setup$ } from "../TestPlatform.js";
import { Game } from "../../src/game/Game.js";
import { Turn } from "../../src/game/Turn.js";
import { GamesUIMixin } from "../../src/browser/GamesUIMixin.js";

describe("browser/GamesUIMixin", () => {
  let Test, ui, gamesList = [], gamesHistory = [];

  before(
    () => setupPlatform()
    .then(() => setup$())
    // UI imports jquery.i18n which requires jquery, so have
    // to delay the import
    .then(() => import("../../src/browser/UI.js"))
    .then(mod => {
      Test = class extends GamesUIMixin(mod.UI) {
        getSetting(t) {
          switch (t) {
          case "language": return "en";
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
      };
    }));

  beforeEach(() => {
    $("head").empty();
    $("body").empty();
    return (ui = new Test()).initLocale();
  });

  it("attaches event handlers", () => {
    // An empty getGames will cause gamesList to be display:none if
    // the event handler fires.
    gamesList = [];
    $("body").append(`<input type="checkbox" id="showAllGames" />`);
    $("body").append(`<div id="gamesList"></div>`);
    ui.attachUIEventHandlers();
    return new Promise(resolve => {
      setTimeout(function working() {
        if ($("#gamesList").css("display") === "none")
          resolve();
        else
          setTimeout(working, 200);
      }, 200);
      
      assert.equal($("#gamesList").css("display"), "block");
      $("#showAllGames").trigger("change");
    });
  });

  it ("readyToListen", () => {
    gamesList = [
      {
        key: "game1",
        edition: "1st",
        players: [
          { key: "player1", name: "one", score: -999 }
        ],
        turns: [
          { state: Turn.Type.GAME_ENDED }
        ]
      },
      {
        key: "game2",
        edition: "2nd",
        players: [
          { key: "player1", name: "two", score: 1000000 }
        ],
        turns: [
        ]
      }
    ];
    gamesHistory = [
      { name: "one", score: 1, games: 2, wins: 3 },
      { name: "two", score: 4, games: 5, wins: 6 }
    ];
    $("body").append(`<table id="gamesList"><tbody></tbody></table>`);
    $("body").append(`<div id="gamesCumulative"><div id="playerList"></div></div>`);

    return ui.readyToListen()
    .then(() => {
      const p1 = $.i18n("txt-leader", 1, "one", 1, 2, 3);
      const p2 = $.i18n("txt-leader", 2, "two", 4, 5, 6);
      let html = $("body").html();
      assert(html.indexOf(p1) > 0);
      assert(html.indexOf(p2) > 0);

      html = html.replace(/<div id="gamesCumulative".*\/div>/, "");
      assert(html.indexOf("game1") > 0);
      assert(html.indexOf("game2") > 0);
      // Detailed construction of table rows tested in BrowserGame

      // Clicking on a TR should invoke GameDialog, which
      // will invoke $player.
      // No testing here, see GameDialog.js for that.
      $("#game1").trigger("click");
      // The trigger should have openDialog, which should have assigned "this"
      // but we have to wait...
      return new Promise(resolve => {
        setTimeout(function working() {
          if ($(`#GameDialog[name=game1]`).data("this"))
            resolve();
          else
            setTimeout(working, 200);
        }, 200);
      })
      .then(() => {
        ui.refreshGame("game1");
      });
    });
  });
});
