/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha, node */

import { assert } from "chai";
import { setupPlatform, setup$, setupI18n, getTestGame, StubServer, UNit } from "../TestPlatform.js";
import { TestSocket } from "../TestSocket.js";
import { Game } from "../../src/game/Game.js";
import { UIEvents } from "../../src/browser/UIEvents.js";

/* global Platform */

describe("client/ClientUIMixin", () => {

  const session = {
    name: "Descartes",
    settings: {
      "language": "en",
      "layout": "default",
      "jqTheme": "vader",
      "turn_alert": false,
      "cheers": false,
      "tile_click": false,
      "warnings": false,
      "one_window": false,
      "notification": false
    }
  };

  let TestUI, keep = {};

  before(
    () => setupPlatform()
    .then(() => setup$(
      // Could equally be client_game
      `${import.meta.url}/../../html/client_games.html?arg=1`,
      Platform.getFilePath("/html/client_games.html")))
    .then(() => setupI18n())
    .then(() => Promise.all([
      import("../../src/browser/UI.js"),
      import("../../src/browser/GameUIMixin.js"),
      import("../../src/client/ClientUIMixin.js")
    ]))
    .then(mods => {
      const UI = mods[0].UI;
      const GameUIMixin = mods[1].GameUIMixin;
      const ClientUIMixin = mods[2].ClientUIMixin;
      TestUI = class extends ClientUIMixin(GameUIMixin(UI)) {
        constructor() {
          super();
          this.session = session;
          this.channel = new TestSocket("socket");
          this.attachChannelHandlers();
          this.attachUIEventHandlers();
        }
      };
      keep.open = window.open;
      window.open = () => {};
      keep.location = global.location;
      global.location = {
        href: "?game=finished_game",
        hash: "",
        replace: hr => location.href = hr
      };
    }));

  after(() => {
    window.open = keep.open;
    global.location = keep.location;
  });

  beforeEach(() => {
    for (const key of Object.values(UIEvents)) {
      $(document).off(key);
    }
  });

  it("gets", () => {
    const GAME_DEFAULTS = {
      edition: "Test",
      dictionary: "Oxford_5000"
    };
    const USER_DEFAULTS = {
      notification: false,
      layout: "none",
      jqTheme: "grass"
    };
    const server = new StubServer({
      "/session": Promise.resolve(undefined),

      "/css": Platform.readFile(Platform.getFilePath("/css/index.json")),

      "/editions":
      Platform.readFile(Platform.getFilePath("/editions/index.json")),

      "/dictionaries":
      Platform.readFile(Platform.getFilePath("/dictionaries/index.json")),

      "/locales": {
        promise: Platform.readFile(Platform.getFilePath("/i18n/index.json")),
        count: 2
      },

      "/edition/English_Scrabble":
      Platform.readFile(Platform.getFilePath("/editions/English_Scrabble.json")),

      "/defaults/game": Promise.resolve(GAME_DEFAULTS),

      "/defaults/user": Promise.resolve(USER_DEFAULTS)
    });
    const ui = new TestUI();

    assert.equal(ui.getSetting("jqTheme"), session.settings.jqTheme);

    return Promise.all([
      ui.promiseSession()
      .then(e => assert.fail(`Flawed ${e}`))
      .catch(e => {
        assert.equal(e.message, $.i18n("txt-nosign"));
        return undefined;
      }),

      ui.promiseDefaults("game")
      .then(s => assert.deepEqual(s, GAME_DEFAULTS)),

      ui.promiseDefaults("user")
      .then(s => assert.deepEqual(s, USER_DEFAULTS)),

      ui.promiseLayouts()
      .then(e => assert(Array.isArray(e))),

      ui.promiseLocales()
      .then(e => assert(Array.isArray(e))),

      ui.promiseEditions()
      .then(e => assert(Array.isArray(e))),

      ui.promiseDictionaries()
      .then(e => assert(Array.isArray(e))),
      
      ui.promiseEdition("English_Scrabble")
      .then(e => assert.equal(e.swapCount, 7))
    ])
    .then(() => server.wait());
  });

  it("anotherGame", () => {
    const server = new StubServer({
      "/anotherGame/finished_game": Promise.resolve("another_game")
    });
    const ui = new TestUI();

    return getTestGame("finished_game", Game)
    .then(game => {
      ui.game = game;
      ui.action_anotherGame();
      return server.wait();
    });
  });

  it("nextGame", () => {
    const server = new StubServer({
      "/join/another_game": Promise.resolve("next_game")
    }
    , console.debug
    );
    const ui = new TestUI();

    return getTestGame("finished_game", Game)
    .then(game => {
      game.nextGameKey = "another_game";
      ui.setSetting("one_window", true);
      ui.game = game;
      ui.action_nextGame();
    })
    .then(() => server.wait());
  });
});
         
