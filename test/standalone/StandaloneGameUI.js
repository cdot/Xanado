/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha, node */

/* global Platform */

import { assert } from "chai";
import { setupPlatform, setup$, setupI18n } from "../TestPlatform.js";
import { BrowserGame } from "../../src/browser/BrowserGame.js";
import { BrowserDatabase } from "../../src/browser/BrowserDatabase.js";

describe("standalone/StandaloneGameUI", () => {

  it("works", () => setupPlatform()
     .then(() => setup$(
       `${import.meta.url}/../../html/standalone_game.html`,
       Platform.absolutePath("/html/standalone_game.html")))
    .then(() => setupI18n())
     // UI imports jquery.i18n which requires jquery, so have
     // to delay the import
     .then(() => import(
       "../../src/standalone/StandaloneGameUI.js"))
     .then(mod => mod.StandaloneGameUI)
     .then(StandaloneGameUI => {
       const ui = new StandaloneGameUI();
       return ui.createGame(BrowserGame.DEFAULTS)
       .then(game => {
         DOM.reconfigure({
           url: `${import.meta.url}/../../html/standalone_game.html?game=${game.key}`
         });
         return game.save();
       })
       .then(() => ui.create());
       // TODO: a lot more testing!
     }));
});
