/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha, node */

import { assert } from "chai";
import { setupPlatform, setup$, setupI18n, StubServer } from "../TestPlatform.js";
import { BackendGame} from "../../src/backend/BackendGame.js";

/* global Platform */

describe("standalone/StandaloneUIMixin", () => {

  class Stub {
  }

  let Test, keep = {}, StandaloneUIMixin;
  
  before(
    () => setupPlatform()
    .then(() => setup$(
      `${import.meta.url}/../../html/standalone_games.html?arg=1`))
    .then(() => setupI18n())
    .then(() => import("../../src/standalone/StandaloneUIMixin.js"))
    .then(mod => {
      StandaloneUIMixin = mod.StandaloneUIMixin;
      Test = class extends StandaloneUIMixin(Stub) {
      };
      keep.open = window.open;
      window.open = () => {};
      keep.location = global.location;
      global.location = {
        href: "here",
        hash: "",
        replace: hr => location.href = hr
      };
    }));

  after(() => {
    window.open = keep.open;
    global.location = keep.location;
  });

  beforeEach(() => {
    $("head").empty();
    $("body").empty();
  });

  it("session", () => {
    const ui = new Test();

    ui.session = "session";
    return ui.promiseSession()
    .then(sess => assert.equal(sess, "session"));
  });

  it("get/set setting", () => {
    const ui = new Test();
    return ui.promiseDefaults("game")
    .then(settings => {
      assert.deepEqual(settings, BackendGame.DEFAULTS);

      localStorage.setItem(`XANADOdorf`, "frod");
      assert.equal(ui.getSetting("dorf"), "frod");
      ui.setSetting("dorf", "flob");
      assert.equal(ui.getSetting("dorf"), "flob");
    });
  });

  it("get...", () => {
    const ui = new Test();
    return Promise.all([
      ui.promiseLayouts(),
      Platform.readJSONFile(Platform.getFilePath(`css/index.json`))])
    .then(data => assert.deepEqual(data[0], data[1]))

    .then(() => Promise.all([
      ui.promiseLocales(),
      Platform.readJSONFile(Platform.getFilePath(`i18n/index.json`))
    ]))
    .then(data => assert.deepEqual(data[0], data[1]))

    .then(() => Promise.all([
      ui.promiseEditions(),
      Platform.readJSONFile(Platform.getFilePath(`editions/index.json`))
    ]))
    .then(data => assert.deepEqual(data[0], data[1]))

    .then(() => Promise.all([
      ui.promiseDictionaries(),
      Platform.readJSONFile(Platform.getFilePath(`dictionaries/index.json`))
    ]))
    .then(data => assert.deepEqual(data[0], data[1]))

    .then(() => ui.promiseEdition("English_Scrabble"))
    .then(ed => assert.equal(ed.name, "English_Scrabble"));
  });

  it("create", () => {
    const ui = new Test();
    ui.session = {};
    ui.create();
  });

  it("create game", () => {
    const ui = new Test();
    return ui.createGame({ edition: "Test" })
    .then(game => {
      assert.equal(game.players[0].name, "Computer");
      assert.equal(game.players[1].name, "You");
      assert.equal(game.state, BackendGame.State.PLAYING);
      const nurl = ui.redirectToGame(game.key).toString();
      assert(/\/standalone_game\./.test(nurl));
    });
  });
});
