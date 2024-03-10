/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser */

// The documented method for importing socket.io in ESM is:
// import { io } from "../../node_modules/socket.io/client-dist/socket.io.esm.min.js";
// This works fine in the unpacked version, but fails when webpacked. The
// only way I could get it to work was to import from
// ../node_modules/socket.io/client-dist/socket.io.js
// and detect whether "io" has been defined.
//
// If someone else can do better, please do!
/* global io */
import * as SI from "socket.io";
if (typeof io === "undefined")
  window.io = SI.io;

import "jquery";
import "jquery-ui";

import { Game } from "../game/Game.js";
import { Commands } from "../game/Commands.js";
import { Turn } from "../game/Turn.js";
import { Tile } from "../game/Tile.js";
import { UI } from "../browser/UI.js";
import { UIEvents } from "../browser/UIEvents.js";

/**
 * Mixin with common code shared between client game and games interfaces
 * (client/ClientGamesUI.js and client/ClientGameUI.js) but NOT used by
 * standalone.
 * @mixin client/ClientUIMixin
 */
const ClientUIMixin = superclass => class extends superclass {

  /**
   * Session object describing signed-in user
   * @instance
   * @memberof client/ClientUIMixin
   * @member {object}
   */
  session = undefined;

  /**
   * Cache of defaults objects (.user and .game)
   */
  defaults = {};

  /**
   * @implements browser/GameUIMixin
   * @memberof client/ClientUIMixin
   * @instance
   */
  promiseDefaults(type) {
    if (this.defaults[type])
      return this.defaults[type];
    return $.get(`/defaults/${type}`)
    .then(d => this.defaults[type] = d);
  }

  /**
   * @implements browser/GameUIMixin
   * @memberof client/ClientUIMixin
   * @instance
   */
  promiseLocales() {
    return $.get("/locales");
  }

  /**
   * @implements UI
   * @instance
   * @memberof CientUIMixin
   * @override
   */
  promiseLayouts() {
    return $.get("/css");
  }

  /**
   * Make an automatic play.
   * @instance
   * @memberof CientUIMixin
   */
  automaticPlay() {
    console.debug("Automaton playing");

    const prob = Math.random();

    // Try to swap, one turn in 10
    if (prob < 0.1) {
      const tiles = [];
      this.player.rack.forEachTiledSquare(
        square => tiles.push(square.tile));
      if (tiles.length === this.game.rackSize) {
        const nTiles = Math.floor(Math.random() * this.game.rackSize);
        if (nTiles > 0) {
          while (tiles.length > nTiles)
            tiles.shift();
          this.sendCommand(Commands.SWAP, tiles.map(t => new Tile(t)));
          return;
        }
      }
    }

    // Try to challenge, if not swapped, 1 turn in 10
    if (prob < 0.1 && this.game.turns.length > 0) {
      // Can we challenge the last turn?
      let challengeable = this.game.turns[this.game.turns.length - 1];
      if (challengeable.type === Turn.Type.PLAYED) {
        this.sendCommand(Commands.CHALLENGE, {
          challengedKey: challengeable.playerKey
        });
        return;
        // otherwise drop through
      }
    }

    // If not swapped and not challenged, try to pass 1 turn in 10
    if (prob < 0.1) {
      this.sendCommand(Commands.PASS);
      return;
    }

    // The rest of the time ask the server to autoplay our move
    this.notifyBackend(Game.Notify.MESSAGE, {
      sender: this.player.name,
      text: "autoplay"
    });
  }

  /**
   * Process arguments to the URL. For example, a game passed by key.
   * Subclasses may override.
   * @instance
   * @memberof client/ClientUIMixin
   * @return {Promise} a promise that resolves when arguments are processed.
   */
  processArguments() {
    return Promise.resolve();
  }

  /**
   * Set up the UI.
   * @instance
   * @memberof client/ClientUIMixin
   */
  create() {
    this.debug("Creating ClientUIMixin");
    // Set up translations and connect to channels
    return Promise.all([
      this.promiseDefaults("user"),
      this.promiseDefaults("game")
    ])
    .then(() => {
      this.args = UI.parseURLArguments(document.URL);
      if (this.args.debug) {
        console.debug("Enable debug");
        this.debug = console.debug;
      }
    })
    .then(() => this.promiseSession())
    .catch(e => {
      console.error(e);
      this.observer = (this.args && this.args.observer ? this.args.observer : "Anonymous");
    })
    .then(() => this.initTheme())
    .then(() => this.initLocale())
    .then(() => this.processArguments(this.args))
    // Unit tests predefine this.channel so that io can be bypassed
    .then(() => this.channel = (this.channel || io().connect()))
    .then(() => this.attachChannelHandlers())
    .then(() => this.attachUIEventHandlers())
    .then(() => {

      $("#signin-button")
      .on("click", () =>
          import(
            /* webpackMode: "lazy" */
            /* webpackChunkName: "LoginDialog" */
            "../client/LoginDialog.js")
          .then(mod => new mod.LoginDialog({
            // postAction is set in code
            postResult: () => window.location.reload(),
            error: e => this.alert(e, $.i18n("failed", $.i18n("btn-signin")))
          })));

      $("#signout-button")
      .on("click", () => {
        $.post("/signout")
        .then(() => {
          if (this.debug) this.debug("Logged out");
        })
        .catch(e => this.alert(e, $.i18n("failed", $.i18n("btn-signout"))))
        .then(() => {
          this.session = undefined;
          this.refresh();
        });
      });

      $(".loading").hide();
      $(".waiting").removeClass("waiting").show();

      // `autoplay` is a debug device. If it appears in the URL args
      // then once the first play has been made by the human, remaining
      // plays will be automated. See `automaticPlay` for details.
      if (this.args.autoplay)
        $(document).on("MY_TURN", () => this.automaticPlay());
    });
  }

  attachUIEventHandlers() {
    super.attachUIEventHandlers();

    // Custom UI event for joining a game
    $(document).on(UIEvents.JOIN_GAME, (event, key) => {
      $.post(`/join/${key}`)
      .then(url => {
        if (this.getSetting("one_window"))
          location.replace(url);
        else
          window.open(url, "_blank");
      })
      .catch(e => this.alert(e, $.i18n("failed", $.i18n("btn-open-game"))));
    });
  }

  /**
   * @override
   * @instance
   * @memberof client/ClientUIMixin
   */
  attachChannelHandlers() {

    let $reconnectDialog = null;

    // socket.io events 'new_namespace', 'disconnecting',
    // 'initial_headers', 'headers', 'connection_error' are not handled

    this.channel

    .on("connect", () => {
      // Note: "connect" is synonymous with "connection"
      // Socket has connected to the server
      console.debug("b>f connect");
      if ($reconnectDialog) {
        $reconnectDialog.dialog("close");
        $reconnectDialog = null;
      }
      this.readyToListen();
    })

    .on("disconnect", () => {
      // Socket has disconnected for some reason
      // (server died, maybe?) Back off and try to reconnect.
      console.debug(`--> disconnect`);
      const mess = $.i18n("txt-server-disconn");
      $reconnectDialog = this.alert(mess, $.i18n("err-server-disconn"));
      setTimeout(() => {
        // Try and rejoin after a 3s timeout
        this.readyToListen()
        .catch(e => {
          console.debug(e);
          if (!$reconnectDialog)
            this.alert(e, $.i18n("err-reconnect"));
        });
      }, 3000);
    });

    super.attachChannelHandlers();
  }

  /**
   * @implements UI
   * @instance
   * @memberof client/ClientUIMixin
   * @override
   */
  promiseEditions() {
    return $.get(`/editions`);
  }

  /**
   * @implements browser/GameUIMixin
   * @instance
   * @memberof client/ClientUIMixin
   * @override
   */
  promiseEdition(ed) {
    return $.get(`/edition/${ed}`);
  }

  /**
   * @implements UI
   * @instance
   * @memberof client/ClientUIMixin
   * @override
   */
  promiseDictionaries() {
    return $.get(`/dictionaries`);
  }

  /**
   * Identify the signed-in user.
   * @instance
   * @implements browser/UI
   * @memberof client/ClientUIMixin
   * @override
   * @return {Promise} a promise that resolves to the (redacted)
   * session object if someone is signed in, or undefined otherwise.
   * @throws Error if there is no active session
   */
  promiseSession() {
    $(".signed-in,.not-signed-in").hide();
    return $.get("/session")
    .then(session => {// getting here with a 401 :-(
      if (this.debug)
        this.debug(`Signed in as '${session.name}'`);
      $(".not-signed-in").hide();
      $(".signed-in")
      .show()
      .find("#id")
      .text(session.name);
      this.session = session;
      return session;
    })
    .catch(() => {
      $(".signed-in").hide();
      $(".not-signed-in").show();
      if (typeof this.observer === "string")
        $(".observer").show().text($.i18n(
          "observer", this.observer));
      throw new Error($.i18n("txt-nosign"));
    });
  }

  /**
   * @implements browser/GameUIMixin#action_anotherGame
   */
  action_anotherGame() {
    $.post(`/anotherGame/${this.game.key}`)
    .then(nextGameKey => {
      this.game.nextGameKey = nextGameKey;
      this.setAction("action_nextGame", /*i18n*/"btn-next");
      this.enableTurnButton(true);
    })
    .catch(console.error);
  }

  /**
   * @implements browser/GameUIMixin#action_nextGame
   */
  action_nextGame() {
    $(document).trigger(UIEvents.JOIN_GAME, [ this.game.nextGameKey ]);
  }

  /**
   * @implements browser/GameUIMixin
   * If a user is signed in, the value will be taken from their
   * session (and will default if it is not defined).
   * @instance
   * @memberof client/ClientUIMixin
   * @param {string} key setting to retrieve
   * @return {string|number|boolean} setting value
   */
  getSetting(key) {
    if (this.session && this.session.settings
            && typeof this.session.settings[key] !== "undefined")
      return this.session.settings[key];
    else {
      return (this.defaults.user[key] || this.defaults.game[key]);
    }
  }

  /**
   * Send a setting to the server
   * @implements browser/GameUIMixin
   * @memberof client/ClientUIMixin
   * @instance
   * @override
   */
  setSetting(key, value) {
    const vals = {};
    vals[key] = value;
    return this.setSettings(vals);
  }

  /**
   * Send a set of settings to the server
   * @memberof client/ClientUIMixin
   * @instance
   * @implements browser/UI
   * @override
   */
  setSettings(vals) {
    return $.ajax({
      url: "/session-settings",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(vals)
    });
  }
};

export { ClientUIMixin }
