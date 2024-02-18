/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha, node */

/* global Platform */
/* global server */

import { promises as Fs } from "fs";

import { assert } from "chai";
import { setupPlatform, setup$, setupI18n,
         expectDialog,
         getTestGame, StubServer, UNit } from "../TestPlatform.js";
import { TestSocket } from "../TestSocket.js";
import { Game } from "../../src/game/Game.js";

describe("client/ClientGamesUI", () => {

  let ClientGamesUI;

  const GAME_DEFAULTS = {
    edition: "Test",
    dictionary: "Oxford_5000"
  };

  const USER_DEFAULTS = {
    layout: "default",
    jqTheme: "invader"
  };

  const session = {
    name: "Descartes",
    key: "human",
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
  
  let expected, received;

  let keep = {};

  before(
    () => setupPlatform()
    .then(() => setup$(
      `${import.meta.url}/../../html/client_games.html`,
      Platform.getFilePath("/html/client_games.html")))
    .then(() => setupI18n())
    // UI imports jquery.i18n which requires jquery, so have
    // to delay the import
    .then(() => import("../../src/client/ClientGamesUI.js"))
    .then(mod => ClientGamesUI = mod.ClientGamesUI)
    .then(() => {
      keep.open = window.open;
      window.open = () => {};
      keep.location = global.location;
      global.location = { href: "here", hash: "" };
    }));

  after(() => {
    window.open = keep.open;
    global.location = keep.location;
  });

  it("handlers", () => {
    const server = new StubServer({
      "/defaults/user": Promise.resolve(USER_DEFAULTS),
      "/defaults/game": Promise.resolve(GAME_DEFAULTS),
      "/session":  {
        promise: Promise.resolve(session),
        count: 3
      },
      "/sendReminder/*": Promise.resolve([ "anon", "anon@anon.gov.us" ]),
      "/signout": Promise.resolve(),
      "/locales": {
        promise: Platform.readFile(Platform.getFilePath("/i18n/index.json")),
        count: 2
      },
      "/games/active": {
        promise: Promise.resolve([]),
        count: 2
      },
      "/history": Promise.resolve([]),
      "/css": Platform.readFile(Platform.getFilePath("/css/index.json")),
      "/oauth2-providers": Promise.resolve([{name: "A"}, {name:"B"}]),
      "/editions": 
      Platform.readFile(Platform.getFilePath("/editions/index.json")),
      "/dictionaries":
      Platform.readFile(Platform.getFilePath("/dictionaries/index.json"))
    });

    const ui = new ClientGamesUI();
    ui.channel = new TestSocket("client");

    return ui.create()
    .then(() => expectDialog(
      "LoginDialog",
      () => {
        assert($("#signin-button").length === 1);
        $("#signin-button").trigger("click");
      }, {
        //debug: console.debug
      }))
    .then(() => {
      //console.debug("Logged in");
      $("#signout-button").trigger("click");
    })
    .then(() => expectDialog(
      "UserSettingsDialog",
      () => $("#personaliseButton").trigger("click")))
    .then(() => {
      return expectDialog(
        "GameSetupDialog",
        () => $("#create-game").trigger("click"));
    })
    .then(() => {
      $("#reminders-button").trigger("click");
      $("#chpw-button").trigger("click");
    })
    .then(() => server.wait());
  });

  it("gameOptions", () => {
    const server = new StubServer({
      "/session":  {
        promise: Promise.resolve(session),
        count: 2
      },
      "/defaults/user": Promise.resolve(USER_DEFAULTS),
      "/defaults/game": Promise.resolve(GAME_DEFAULTS),
      "/games/active": Promise.resolve([]),
      "/dictionaries":
      Platform.readFile(Platform.getFilePath("/dictionaries/index.json")),
      "/editions": 
      Platform.readFile(Platform.getFilePath("/editions/index.json")),
      "/locales": Platform.readFile(Platform.getFilePath("/i18n/index.json"))
    });
    const ui = new ClientGamesUI();
    ui.channel = new TestSocket("client");
    ui.session = session;
    return ui.create()
    .then(() => getTestGame("unfinished_game", Game))
    .then(game => ui.gameOptions(game))
    .then(() => server.wait());
  });

  it("joinGame", () => {
    const server = new StubServer({
      "/session":  {
        promise: Promise.resolve(session),
        count: 2
      },
      "/defaults/user": Promise.resolve(USER_DEFAULTS),
      "/defaults/game": Promise.resolve(GAME_DEFAULTS),
      "/games/active": Promise.resolve([]),
      "/games/unfinished_game": getTestGame("unfinished_game", Game)
      .then(game => Promise.resolve([game])),
      "/join/unfinished_game": Promise.resolve({}),
      "/locales": Platform.readFile(Platform.getFilePath("/i18n/index.json"))
    });
    const ui = new ClientGamesUI();
    ui.channel = new TestSocket("client");
    ui.session = session;
    return ui.create()
    .then(() => getTestGame("unfinished_game", Game))
    .then(game => ui.joinGame(game))
    .then(() => server.wait());
  });

  it("addRobot", () => {
    const server = new StubServer({
      "/session":  {
        promise: Promise.resolve(session),
        count: 2
      },
      "/defaults/user": Promise.resolve(USER_DEFAULTS),
      "/defaults/game": Promise.resolve(GAME_DEFAULTS),
      "/games/active": Promise.resolve([]),
      "/locales": Platform.readFile(Platform.getFilePath("/i18n/index.json")),
      "/dictionaries":
      Platform.readFile(Platform.getFilePath("/dictionaries/index.json"))
    });
    const ui = new ClientGamesUI();
    ui.channel = new TestSocket("client");
    ui.session = session;
    return ui.create()
    .then(() => getTestGame("unfinished_game", Game))
    .then(game => ui.addRobot(game))
    .then(() => server.wait());
  });

  it("invitePlayers", () => {
    const server = new StubServer({
      "/session":  {
        promise: Promise.resolve(session),
        count: 2
      },
      "/defaults/user": Promise.resolve(USER_DEFAULTS),
      "/defaults/game": Promise.resolve(GAME_DEFAULTS),
      "/games/active": Promise.resolve([]),
      "/users": Promise.resolve(["id", "iot"]),
      "/locales": Platform.readFile(Platform.getFilePath("/i18n/index.json"))
    });
    const ui = new ClientGamesUI();
    ui.channel = new TestSocket("client");
    ui.session = session;
    return ui.create()
    .then(() => getTestGame("unfinished_game", Game))
    .then(game => ui.invitePlayers(game))
    .then(() => server.wait());
  });

  it("anotherGame", () => {
    const server = new StubServer({
      "/session":  {
        promise: Promise.resolve(session),
        count: 2
      },
      "/defaults/user": Promise.resolve(USER_DEFAULTS),
      "/defaults/game": Promise.resolve(GAME_DEFAULTS),
      "/games/active": {
        promise: Promise.resolve([]),
        count: 2
      },
      "/anotherGame/unfinished_game": Promise.resolve(),
      "/locales": Platform.readFile(Platform.getFilePath("/i18n/index.json"))
    });
    const ui = new ClientGamesUI();
    ui.channel = new TestSocket("client");
    ui.session = session;
    return ui.create()
    .then(() => getTestGame("unfinished_game", Game))
    .then(game => ui.anotherGame(game))
    .then(() => server.wait());
  });

  it("deleteGame", () => {
    const server = new StubServer({
      "/session":  {
        promise: Promise.resolve(session),
        count: 2
      },
      "/defaults/user": Promise.resolve(USER_DEFAULTS),
      "/defaults/game": Promise.resolve(GAME_DEFAULTS),
      "/games/active": {
        promise: Promise.resolve([]),
        count: 2
      },
      "/deleteGame/unfinished_game": Promise.resolve(),
      "/locales": Platform.readFile(Platform.getFilePath("/i18n/index.json"))
    });
    const ui = new ClientGamesUI();
    ui.channel = new TestSocket("client");
    ui.session = session;
    return ui.create()
    .then(() => getTestGame("unfinished_game", Game))
    .then(game => ui.deleteGame(game))
    .then(() => server.wait());
  });

  it("observe", () => {
    const server = new StubServer({
      "/session":  {
        promise: Promise.resolve(session),
        count: 2
      },
      "/defaults/user": Promise.resolve(USER_DEFAULTS),
      "/defaults/game": Promise.resolve(GAME_DEFAULTS),
      "/games/active": Promise.resolve([]),
      "/locales": Platform.readFile(Platform.getFilePath("/i18n/index.json"))
    });
    const ui = new ClientGamesUI();
    ui.channel = new TestSocket("client");
    ui.session = session;
    return ui.create()
    .then(() => getTestGame("unfinished_game", Game))
    .then(game => ui.observe(game))
    .then(() => server.wait());
  });

  it("readyToListen", () => {
    const server = new StubServer({
      "/session":  {
        promise: Promise.resolve(session),
        count: 3
      },
      "/defaults/user": Promise.resolve(USER_DEFAULTS),
      "/defaults/game": Promise.resolve(GAME_DEFAULTS),
      "/locales": Platform.readFile(Platform.getFilePath("/i18n/index.json")),
      "/history": Promise.resolve([]),

      "/games/active": {
        promise: Promise.all([
          getTestGame("unfinished_game", Game),
          getTestGame("good_game", Game)
        ])
        .then(games => Promise.all(games.map(game => game.sendable()))),
        count: 2
      }
    });

    $("body").append(`<table id="gamesList"><tbody></tbody></table>`);
    $("body").append(`<div id="gamesCumulative"><div id="playerList"></div></div>`);

    const ui = new ClientGamesUI();
    ui.channel = new TestSocket("client");
    ui.session = session;
    return ui.create()
    .then(() => ui.readyToListen())
    .then(() => {
      // Clicking on a gameTableRow should invoke GameDialog, which
      // will invoke $player.
      assert.equal($("#unfinished_game").length, 1);
      $("#unfinished_game").trigger("click");
      // The trigger should have openDialog, which should have assigned "this"
      // but we have to wait...
      return new Promise(resolve => {
        setTimeout(function working() {
          if ($(`#GameDialog[name=unfinished_game]`).data("this"))
            resolve();
          else
            setTimeout(working, 100);
        }, 10);
      });
    });
    // TODO: more testing!
  });
});
