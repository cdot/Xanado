/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha, node */

import { assert } from "chai";
import { setupPlatform, setup$, setupI18n } from "../TestPlatform.js";
import { BrowserDatabase } from "../../src/browser/BrowserDatabase.js";
import { BrowserGame } from "../../src/browser/BrowserGame.js";
import { BrowserPlayer } from "../../src/browser/BrowserPlayer.js";
import { GameDialog } from "../../src/browser/GameDialog.js";

describe("browser/GameDialog", () => {

  before(
    () => setupPlatform()
    .then(() => setup$())
    .then(() => setupI18n()));

  beforeEach(() => {
    $("head").html("");
    $("body").html("");
  });

  it ("dialog", () => {
    const db = new BrowserDatabase();
    const game = new BrowserGame({ edition: "Test" });
		const robot1 = new BrowserPlayer(
			{name:"Robot 1", key:"robot1", isRobot: true, score: 1},
      BrowserGame.CLASSES);
		const human1 = new BrowserPlayer(
			{name:"Human 1", key:"human1", isRobot: false, score: 2},
      BrowserGame.CLASSES);

    const ui = {
      session: { key : "session key" },
      getSetting: s => {
        switch (s) {
        case "canEmail": return false;
        }
        assert.fail(s);
        return false;
      }
    };
    const meths = {
      observe: "observe",
      robot: "addRobot",
      invite: "invitePlayers",
      another: "anotherGame",
      delete: "deleteGame",
      options: "gameOptions"
    };

    let dlg;
    const called = [];
    for (const name in meths) {
      ui[meths[name]] = g => {
        called[name] = true;
        assert.equal(g, game);
        if (Object.keys(meths).filter(k => !called[k]).length === 0) {
          dlg.$dlg.dialog("close");
        }
      };
    }

    return game.onLoad(db)
    .then(() => game.create())
    .then(() => new Promise(resolve => {
      dlg = new GameDialog({
        game: game,
        ui: ui,
        //debug: console.debug,
        onReady: dlg => {
          $("button[name=options]").trigger("click");
          $("button[name=observe]").trigger("click");
          $("button[name=robot]").trigger("click");
          $("button[name=invite]").trigger("click");
          $("button[name=another]").trigger("click");
          $("button[name=delete]").trigger("click");
          $("button[name=join]").trigger("click");
        },
        close: resolve
      });
    }))
    .then(() => {
      dlg.$dlg.removeData("DIALOG_CREATED");
      dlg.$dlg.dialog("destroy");
    });
  });
});
