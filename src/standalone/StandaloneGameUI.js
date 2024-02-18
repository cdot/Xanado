/*Copyright (C) 2022-2023 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser */

/* global assert */

import { BrowserPlatform } from "../browser/BrowserPlatform.js";
window.Platform = BrowserPlatform;

import { Channel } from "../common/Channel.js";
import { Game } from "../game/Game.js";
import { BackendGame } from "../backend/BackendGame.js";
import { BrowserGame } from "../browser/BrowserGame.js";
import { UI } from "../browser/UI.js";
import "../browser/icon_button.js";
import { GameUIMixin } from "../browser/GameUIMixin.js";
import { StandaloneUIMixin } from "./StandaloneUIMixin.js";
import { CBOR } from "../game/CBOR.js";

/**
 * Game that runs solely in the browser (no server).
 * To keep the codebase consistent with the client-server model, we
 * have two copies of the game; one is the "client side" (the front end)
 * version, while the other is the "server" version (the back end).
 * @extends UI
 * @mixes browser/GameUIMixin
 * @mixes standalone/StandaloneUIMixin
 */
class StandaloneGameUI extends StandaloneUIMixin(GameUIMixin(UI)) {

  constructor() {
    super();

    /**
     * Game on the "server" side
     */
    this.backendGame = undefined;

    /**
     * Game on the "client" side
     */
    this.frontendGame = undefined;
  }

  /**
   * @implements browser/GameUIMixin#sendCommand
   */
  sendCommand(command, args) {
    const bePlayer = this.backendGame.getPlayerWithKey(
      this.player.key);
    this.backendGame.dispatchCommand(command, bePlayer, args);
  }

  /**
   * @implements browser/GameUIMixin#action_anotherGame
   */
  action_anotherGame() {
    this.backendGame.anotherGame()
    .then(nextGame => {
      this.backendGame.nextGameKey =
      this.frontendGame.nextGameKey = nextGame.key;
      this.setAction("action_nextGame", /*i18n*/"btn-next");
      this.enableTurnButton(true);
    })
    .catch(assert.fail);
  }

  /**
   * @implements browser/GameUIMixin#action_nextGame
   */
  action_nextGame() {
    this.redirectToGame(this.backendGame.nextGameKey);
  }

  /**
   * Create and run the game.
   * @return {Promise} a Promise that resolves when the game is created
   */
  create() {

    super.create();

    const player_key = this.session.key;

    const fe = new Channel();
    const be = new Channel();
    // Cross-couple the channels
    fe.receiver = be;
    be.receiver = fe;

    be.on(
      Game.Notify.MESSAGE,
      message => {
        // Chat message
        const mess = message.text.split(/\s+/);
        const verb = mess[0];

        switch (verb) {
        case "autoplay":
          be.game.autoplay();
          break;
        case "hint":
          be.game.hint(be.player);
          break;
        case "advise":
          be.game.toggleAdvice(be.player);
          break;
        case "allow":
          be.game.allow(be.player, mess[1]);
          break;
        default:
          be.game.notifyAll(Game.Notify.MESSAGE, message);
        }
      });

    this.channel = fe;

    return this.promiseDefaults("user")
    .then(() => this.initTheme())
    .then(() => this.initLocale())
    .then(() => {
      this.debug = this.args.debug ? console.debug : () => {};

      // Load the server game from localStorage, or create a new
      // game from defaults if there isn't one there.
      if (this.args.game) {
        this.debug(`Loading game ${this.args.game} from local storage`);
        return this.db.get(this.args.game)
        .then(d => CBOR.decode(d, BackendGame.CLASSES))
        .then(game => {
          this.backendGame = game;
          this.backendGame._debug = this.debug;
          return game.onLoad(this.db);
        });

      } else if (this.args.b && this.args.d && this.args.e) {
        this.debug("Loading game from URI");
        return BackendGame.unpack(this.args)
        .then(game => {
          this.backendGame = game;
          this.backendGame._debug = this.debug;
          return game.onLoad(this.db);
        });

      } else {
        this.debug("Constructing new game");
        const setup = $.extend({}, this.defaults);
        setup.debug = this.args.debug ? console.debug : undefined;
        return this.createGame(setup)
        .then(game => this.backendGame = game);
      }
    })
    .then(() => {
      this.attachChannelHandlers();

      // Make a browser copy of the game
      this.frontendGame =
      CBOR.decode(
        CBOR.encode(this.backendGame, Game.CLASSES),
        BrowserGame.CLASSES);

      // Fix the player
      this.player
      = this.frontendGame.player
      = this.frontendGame.getPlayerWithKey(player_key);
    })
    .then(() => this.createUI(this.frontendGame))
    .then(() => {
      $("#setup-button")
      .icon_button({ icon: "setup-icon" })
      .on("click", () => {
        import(
          /* webpackChunkName: "GameSetupDialog" */
          /* webpackMode: "lazy" */
          "../browser/GameSetupDialog.js")
        .then(mod => new mod.GameSetupDialog({
          html: "standalone_GameSetupDialog",
          title: $.i18n("Game setup"),
          ui: this,
          game: this.backendGame,
          onSubmit: (dlg, vals) => {
            for (const key of Object.keys(vals))
              this.backendGame[key] = vals[key];
            this.backendGame.save();
            this.redirectToGame(this.backendGame.key);
          },
          error: e => this.alert(e, $.i18n("failed", $.i18n("Game setup")))
        }));
      });
      $("#library-button")
      .icon_button()
      .on("click", () => {
        const parts = UI.parseURLArguments(window.location.href);
        parts._URL = parts._URL.replace(
          /standalone_game\./, "standalone_games.");
        window.location = UI.makeURL(parts);
      });
      $("#share-button")
      .icon_button()
      .on("click", async () => {
        const parts = UI.parseURLArguments(window.location.href);
        delete parts.game;
        const pg = this.backendGame.pack();
        for (const k in pg)
          parts[k] = pg[k];
        const url = UI.makeURL(parts);
        await this.copyToClipboard(url)
        .then(() => this.alert(url, $.i18n("txt-clipped")))
        .catch(e => {
          $("#alertDialog")
          .dialog({
            modal: true,
            title: $.i18n("txt-link")
          })
          .html(`<a href="${url}">${url}</a>`);
        });
      });
    })    
    .then(() => this.attachUIEventHandlers())
    // Tell the backend what channel to use to send and receive
    // notifications
    .then(() => this.backendGame.connect(be, player_key))
    .catch(e => this.alert(e))
    .then(() => {
      $(".loading").hide();
      $(".waiting").removeClass("waiting");
    });
  }
}

export { StandaloneGameUI }
