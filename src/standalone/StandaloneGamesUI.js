/*Copyright (C) 2019-2023 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser */

/**
 * Browser app for client_games.html; populate the list of live games
 */
import { BrowserPlatform } from "../browser/BrowserPlatform.js";
window.Platform = BrowserPlatform;

import "jquery";
import "jquery-ui";

import { CBOR } from "../game/CBOR.js";
import { Game } from "../game/Game.js";
import { UI } from "../browser/UI.js";
import { GamesUIMixin } from "../browser/GamesUIMixin.js";
import { StandaloneUIMixin } from "./StandaloneUIMixin.js";
import { UIEvents } from "../browser/UIEvents.js";

/**
 * Management interface for a database of games stored in localStorage.
 * @extends UI
 * @mixes browser/GamesUIMixin
 * @mixes standalone/StandaloneUIMixin
 */
class StandaloneGamesUI extends StandaloneUIMixin(GamesUIMixin(UI)) {

  /**
   * @implements standalone/StandaloneUIMixin#attachUIEventHandlers
   * @override
   */
  attachUIEventHandlers() {

    super.attachUIEventHandlers();

    $("#create-game")
    .on("click", () =>
        import(
          /* webpackMode: "lazy" */
          /* webpackChunkName: "GameSetupDialog" */
          "../browser/GameSetupDialog.js")
        .then(mod => new mod.GameSetupDialog({
          html: "standalone_GameSetupDialog",
          title: $.i18n("btn-create-game"),
          ui: this,
          onSubmit(dialog, vals) {
            this.ui.createGame(vals)
            .then(game => game.save())
            .then(game => {
              const $dlg = $("#enjoyDialog");
              $dlg.data("this", this)
              .find("button[name=join]")
              .on("click", () => {
                $dlg.dialog("close");
                const dlg = $dlg.data("this");
                $(document).trigger(UIEvents.JOIN_GAME, [ game.key ]);
              });
              $dlg.dialog({
                title: $.i18n("txt-created", game.key),
                modal: true
              });
            })
            .then(() => this.ui.refreshGames());
          },
          error: e => this.alert(e, "Create game failed")
        })));
  }

  /**
   * @implements browser/GamesUIMixin#gameOptions
   * @override
   */
  gameOptions(game) {
    import(
      /* webpackMode: "lazy" */
      /* webpackChunkName: "GameSetupDialog" */
      "../browser/GameSetupDialog.js")
    .then(mod => new mod.GameSetupDialog({
      html: "standalone_GameSetupDialog",
      title: $.i18n("btn-game-setup"),
      game: game,
      onSubmit: (dialog, desc) => {
        for (const key of Object.keys(desc))
          game[key] = desc[key];
        game.save();
        this.refreshGame(game.key, true);
      },
      ui: this,
      error: e => this.alert(e, $.i18n("failed", $.i18n("btn-game-setup")))
    }));
  }

  /**
   * @implements browser/GamesUIMixin#deleteGame
   */
  deleteGame(game) {
    return this.db.rm(game.key)
    .then(() => this.refreshGames());
  }

  /**
   * @implements browser/GamesUIMixin#getGames
   */
  getGames(send) {
    // Make list of keys we are interested in
    return ((send === "all" || send === "active")
            ? this.db.keys()
            : Promise.resolve([send]))
    // Load those games
    .then(keys => Promise.all(
      keys.map(key => this.db.get(key)
               .then(d => CBOR.decode(d, Game.CLASSES))
               .catch(e => {
                 console.error(`${key} loading failed: ${e.message}`);
                 return undefined;
               }))))
    .then(games => games.filter(
      g => g && !(send === "active" && g.hasEnded())))
    .then(games => Promise.all(games.map(game => game.onLoad(this.db))))
    .then(games => Promise.all(
      games
      .map(game => game.sendable(this.userManager))))
    // Sort the resulting list by last activity, so the most
    // recently active game bubbles to the top
    .catch(e => this.alert(e))
    .then(gs => gs.sort((a, b) => a.lastActivity < b.lastActivity ? 1
                        : a.lastActivity > b.lastActivity ? -1 : 0));
  }

  /**
   * @implements browser/GamesUIMixin#getGame
   */
  getGame(key) {
    return this.db.get(key)
    .then(d => CBOR.decode(d, Game.CLASSES))
    .then(game => game.onLoad(this.db));
  }

  /**
   * @implements UI
   * @instance
   * @implements browser/GameUIMixin
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  getHistory() {
    /*
     * * key: player key
     * * name: player name
     * * score: total cumulative score
     * * wins: number of wins
     * * games: number of games played
     */
    return this.db.keys()
    .then(keys => Promise.all(
      keys.map(key => this.db.get(key)
               .then(d => CBOR.decode(d, Game.CLASSES))
               .catch(() => undefined))))
    .then(games => games.filter(g => g && g.hasEnded()))
    .then(games => Promise.all(games.map(game => game.onLoad(this.db))))
    .then(games => {
      const results = {};
      games
      .filter(game => game.hasEnded())
      .map(game => {
        const winScore = game.winningScore();
        game.getPlayers().forEach(
          player => {
            let result = results[player.key];
            if (!result) {
              results[player.key] =
              result = {
                key: player.key,
                name: player.name,
                score: 0,
                wins: 0,
                games: 0
              };
            }
            result.games++;
            if (player.score === winScore) {
              result.wins++;
              result.score += player.score;
            }
          });
      });
      const list = [];
      for (let name in results)
        list.push(results[name]);
      return list.sort((a, b) => a.score < b.score ? 1
                       : (a.score > b.score ? -1 : 0));
    });
  }

  /**
   * Create the UI and start interacting
   */
  create() {
    super.create();

    return this.initTheme()
    .then(() => this.initLocale())
    .then(() => this.attachUIEventHandlers())
    .then(() => {
      this.refreshGames();
      this.readyToListen();
      $(".loading").hide();
      $(".waiting").removeClass("waiting");
    });
  }
}

export { StandaloneGamesUI }
