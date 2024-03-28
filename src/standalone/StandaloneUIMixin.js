/*Copyright (C) 2022-2023 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser */

/* global assert */
/* global Platform */

import "jquery";
import "jquery-ui";

import { parseURLArguments, makeURL } from "../common/Utils.js";
import { Game } from "../game/Game.js";
const Player = Game.CLASSES.Player;
import { Edition } from "../game/Edition.js";
import { BackendGame } from "../backend/BackendGame.js";
import { BrowserDatabase } from "../browser/BrowserDatabase.js";
import { UIEvents } from "../browser/UIEvents.js";

/**
 * For promiseDefaults.
 * @member {object}
 */
const DEFAULT_USER_SETTINGS = {
  // User settings
  one_window: true,
	notification: false, // requires https
	layout: "default",
  language: "en",
  jqTheme: "pepper-grinder",
	warnings: true,
	cheers: true,
	tile_click: true,
  turn_alert: true,
  // No need to obfusticate
  syncRacks: true
};

/**
 * Mixin with common code shared between client game and games interfaces
 * (client/ClientGamesUI.js and client/ClientGameUI.js) but NOT used by
 * standalone.
 * @mixin standalone/StandaloneUIMixin
 */
const StandaloneUIMixin = superclass => class extends superclass {

  /**
   * Format of entries in the games table.
   * See {@linkcode browser/BrowserGame#headline}
   * @override
   */
  static GAME_TABLE_ROW = '<tr class="game" id="%k">'
  + '<td class="h-key">%k</td>'
  + '<td class="h-edition">%e</td>'
  + '<td class="h-last-play">%l</td>'
  + '<td class="h-state">%s</td>'
  + '</tr>';

  /**
   * Key for the robot player
   */
  static ROBOT_KEY = "Computer";

  /**
   * Key for the human player
   */
  static HUMAN_KEY = "You";

  /**
   * The database that will be used for saving and reading games
   * @member {BrowserDatabase}
   */
  db = new BrowserDatabase();

  /**
   * There can be only one (player)
   */
  session = { key: null };

  /**
   * Arguments passed in the URL and parsed out using
   * {@linkcode Utils#parseURLArguments}
   * @member {object}
   */
  args = undefined;

  /**
   * @implements UI#promiseSession
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  promiseSession() {
    if (this.session)
      return Promise.resolve(this.session);
    return Promise.reject();
  }

  /**
   * @implements UI#promiseDefaults
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  promiseDefaults(type) {
    switch (type) {
    case "game": return Promise.resolve(Game.DEFAULTS);
    case "user": return Promise.resolve(DEFAULT_USER_SETTINGS);
    default: assert.fail(type);
    }
    return undefined;
  }

  /**
   * @implements UI#getSetting
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  getSetting(key) {
    const session = localStorage.getItem(`XANADO${key}`);
    if (session === null) {
      // null means key does not exist
      // see https://developer.mozilla.org/en-US/docs/Web/API/Storage/getItem
      if (typeof Game.DEFAULTS[key] === "undefined") {
        if (key === "language")
          return $.i18n.locale() || DEFAULT_USER_SETTINGS.language;
        return DEFAULT_USER_SETTINGS[key];
      } else
        return Game.DEFAULTS[key];
    } else
      return session;
  }

  /**
   * @implements UI#setSetting
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  setSetting(key, value) {
    if (typeof value !== "undefined")
      localStorage.setItem(`XANADO${key}`, value);
    else
      localStorage.removeItem(`XANADO${key}`);
  }

  /**
   * @implements UI#promiseLayouts
   * @memberof standalone/StandaloneUIMixin
   * @instance
   * @override
   */
  promiseLayouts() {
    return Platform.getJSON(Platform.absolutePath("css/index.json"));
  }

  /**
   * @implements UI#promiseLocales
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  promiseLocales() {
    return Platform.getJSON(Platform.absolutePath("i18n/index.json"));
  }

  /**
   * @implements UI#promiseEditions
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  promiseEditions() {
    return Platform.getJSON(Platform.absolutePath("editions/index.json"));
  }

  /**
   * @implements UI#promiseDictionaries
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  promiseDictionaries() {
    return Platform.getJSON(Platform.absolutePath("dictionaries/index.json"));
  }

  /**
   * @implements browser/GameUIMixin#promiseEdition
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  promiseEdition(ed) {
    return Edition.load(ed);
  }

  /**
   * Create a new game using the options passed.
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @param {object} vals game setup options
   * @return {Promise} resolves to the created game
   */
  createGame(setup) {
    if (!setup.dictionary || /^none$/i.test(setup.dictionary))
      // Robot MUST have a dictionary
      setup.dictionary = Game.DEFAULTS.dictionary;
    return Edition.load(setup.edition)
    .then(() => new BackendGame(setup).create())
    .then(game => game.onLoad(this.db))
    .then(game => {
      const robot = new Player({
        name: $.i18n("Robot"),
        key: this.constructor.ROBOT_KEY,
        isRobot: true,
        canChallenge: true
      }, BackendGame.CLASSES);

      const human = new Player({
        name: $.i18n("You"),
        key: this.constructor.HUMAN_KEY,
        isRobot: false
      }, BackendGame.CLASSES);

      game.addPlayer(robot, true);
      game.addPlayer(human, true);

      if (Math.random() > 0.5)
        game.whosTurnKey = this.constructor.HUMAN_KEY;
      else
        game.whosTurnKey = this.constructor.ROBOT_KEY;

      game.state = Game.State.PLAYING;

      return game;
    });
  }

  /**
   * Change the URL to a new URL calculated to open the game with the
   * given key (which must have been saved)
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @param {Key} key the key for the game to switch to
   * @return {string} the new url
   */
  redirectToGame(key) {
    const parts = parseURLArguments(window.location.toString());
    parts._URL = parts._URL.replace(/standalone_games./, "standalone_game.");
    parts.game = key;
    const nurl = makeURL(parts);
    if (this.getSetting("one_window"))
      location.replace(nurl);
    else
      window.open(nurl, "_blank");
    return nurl;
  }

  /**
   * Start the process of constructing the UI. Subclasses should
   * continue this process in their own create() methods.
   * @instance
   * @memberof standalone/StandaloneUIMixin
   */
  create() {
    this.args = parseURLArguments(document.URL);
    if (this.args.debug)
      this.debug = console.debug;

    this.session.key = this.constructor.HUMAN_KEY;
  }

  /**
   * @implements browser/GamesUIMixin#attachUIEventHandlers
   * @override
   */
  attachUIEventHandlers() {
    super.attachUIEventHandlers();

    // Custom UI event for joining a game
    $(document)
    .on(UIEvents.JOIN_GAME, (event, key) => {
      this.redirectToGame(key);
    });
  }
};

export { StandaloneUIMixin }
