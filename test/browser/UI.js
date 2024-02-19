/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha, node */

import { assert } from "chai";
import { setupPlatform, setup$, UNit } from "../TestPlatform.js";

describe("browser/UI", () => {

  let UI;

  before(
    () => setupPlatform()
    .then(() => setup$())
    // UI imports jquery.i18n which requires jquery, so have
    // to delay the import
    .then(() => import("../../src/browser/UI.js"))
    .then(mod => {
      UI = class UI extends mod.UI {
        settings = {};
        setSetting(t, v) { this.settings[t] = v; }
        getSetting(t) {
          return this.settings[t];
        }
        promiseLayouts() { return Promise.resolve([ "A", "B" ]); }
        promiseLocales() { return Promise.resolve([ "en", "fr" ]); }
      };
    }));

  beforeEach(() => {
    $("head").empty();
    $("body").empty();
  });

  it("parseURLArguments", () => {
    const a = UI.parseURLArguments("http://a.b/c?a=1&b=2;c=3");
    assert.deepEqual(a, { _URL: "http://a.b/c", a: "1", b: "2", c : "3" });

    const b = UI.parseURLArguments("https://q:9?x&a=&b=c=3;c=?");
    assert.deepEqual(b, { _URL: "https://q:9", x: true, a: "", b: "c=3", c: "?" });

    const c = UI.parseURLArguments("ftp://q?a=a%20b&b");
    assert.deepEqual(c, { _URL: "ftp://q", a: "a b", b: true });
  });

  it("makeURL", () => {
    const args = { _URL: "x", a: "b", b: true, c: "a b" };
    assert.deepEqual(UI.parseURLArguments(UI.makeURL(args)), args);
  });

  it("formatTimeInterval", () => {
    assert.equal(UI.formatTimeInterval(0), "00:00");
    assert.equal(UI.formatTimeInterval(1 * 60 + 1), "01:01");
    assert.equal(UI.formatTimeInterval(10 * 60 + 1), "10:01");
    assert.equal(UI.formatTimeInterval(60 * 60 + 1), "01:00:01");
    assert.equal(UI.formatTimeInterval(24 * 60 * 60 + 1), "1:00:00:01");
    assert.equal(UI.formatTimeInterval(2 * 24 * 60 * 60 + 1), "2:00:00:01");
    assert.equal(UI.formatTimeInterval(365 * 24 * 60 * 60 + 1), "365:00:00:01");
    assert.equal(UI.formatTimeInterval(-(60 * 60 + 1)), "-01:00:01");
  });

  it("themes", () => {
    $("head")
    .append(`<link id="xanadoCSS" href="../css/default.css" rel="stylesheet" type="text/css">`)
    .append(`<link id="jQueryTheme" href="../node_modules/jquery-ui/dist/themes/pepper-grinder/jquery-ui.min.css" rel="stylesheet" type="text/css">`);
    class NUI extends UI {
      getSetting(t) {
        switch (t) {
        case "jqTheme": return "le-frog";
        case "layout": return "exander77";
        default: assert.fail(t); return false;
        }
      }
      promiseLayouts() { return Promise.resolve([]); }
    }
    (new NUI()).initTheme();
    let url = $("#xanadoCSS").attr("href");
    assert(/\/css\/exander77\.css$/.test(url));
    url = $("#jQueryTheme").attr("href");
    assert(/\/themes\/le-frog\//.test(url));
  });

  /** JSDOM doesn't support stylesheets, so this is academic
  it("editCSSRule", () => {
    console.log($("html").html());

    const url = `${import.meta.url}/../../../css/default.css`;
    const link = document.createElement("link");
    link.id ="xanadoCSS";
    link.href = url;
    link.rel = "stylesheet";
    link.type = "text/css";
    $("head").append(link)
    .append("<style>.Blah{height:1,width:2}</style>");

    console.log($("html").html());

    const ui = new UI();
    return new Promise(resolve => {
       
        ui.editCSSRule(".Surface td", { height: 666, width: -666 });
        resolve();
      }, 500);
    });
  });
  */

  it("initLocale(fr)", () => {
    $("body").append(`<div id="test" data-i18n="lbl-pickplayer" data-i18n-tooltip="lbl-place-snd"></div>`);
    class NUI extends UI {
      getSetting(t) {
        switch (t) {
        case "language": return "fr";
        }
        assert.fail(t); return false;
      }
    }
    const ui = new NUI();
    return ui.initLocale()
    .then(() => {
      assert.equal($.i18n("not a valid string"), "not a valid string");
      assert.equal($.i18n("h-won", "Nobody"), "Nobody gagne");
      assert.equal($("#test").text(), $.i18n("lbl-pickplayer"));
    });
  });

  it("initLocale(en)", () => {
    $("body").append(`<div id="test" data-i18n="lbl-pickplayer" data-i18n-tooltip="lbl-place-snd"></div>`);
    class NUI extends UI {
      getSetting(t) {
        switch (t) {
        case "language": return "en";
        }
        assert.fail(t); return false;
      }
      promiseLocales() { return Promise.resolve([ "en", "fr" ]); }
      promiseLayouts() { return Promise.resolve([]); }
    }
    const ui = new NUI();
    return ui.initLocale()
    .then(() => {
      assert.equal($.i18n("not a valid string"), "not a valid string");
      assert.equal($.i18n("h-won", "Nobody"), "Nobody won");
      assert.equal($("#test").text(), $.i18n("lbl-pickplayer"));

      const it = $("#test");
      it.tooltip("open");
      assert.equal((it.tooltip("option", "content")).call(it[0]),
                   $.i18n("lbl-place-snd"));
    });
  });

  it("setSettings", () => {
    const ui = new UI();
    ui.setSettings({ a: "1", b: 2 });
    assert.equal(ui.getSetting("a"), 1);
    assert.equal(ui.getSetting("b"), 2);
  });

  it("personalise", () => {
    $("body").append(`<div id="personaliseButton" class="dialog"></div>`);
    const ui = new UI();

    // Force an import of UserSettingsDialog
    ui.attachUIEventHandlers();
    $("#personaliseButton").trigger("click");
  });

  it("alerts", () => {
    $("body").append(`<div id="alertDialog" class="dialog"></div>`);
    const ui = new UI();

    let caught;
    function catcher(...args) {
      caught = args.join(" ");
    };

    let dlg = ui.alert("simple string", "Alert", catcher);
    let $dlg = $("#alertDialog").parent();
    assert.equal($dlg.find(".ui-dialog-title").text(), "Alert");
    assert.equal($dlg.find(".alert").text(), "simple string");
    assert.equal(caught, "ALERT Alert simple string");

    dlg = ui.alert(new Error("Oops!"), "Apocalypse", catcher);
    $dlg = $("#alertDialog").parent();
    assert.equal($dlg.find(".ui-dialog-title").text(), "Apocalypse");
    assert.equal($dlg.find(".alert").text(), "Oops!");
    assert(/^ALERT Apocalypse Oops!/.test(caught), caught);
    assert(/browser\/UI.js:/.test(caught));

    dlg = ui.alert([ "h-won", "The winner"], "Podium", catcher);
    $dlg = $("#alertDialog").parent();
    assert.equal($dlg.find(".ui-dialog-title").text(), "Podium");
    assert.equal($dlg.find(".alert").text(), "The winner won");
    assert.equal(caught, "ALERT Podium The winner won");

    dlg = ui.alert({ won: "The winner" }, "Medal", catcher);
    $dlg = $("#alertDialog").parent();
    assert.equal($dlg.find(".ui-dialog-title").text(), "Medal");
    assert.equal($dlg.find(".alert").text(), `{won:"The winner"}`);
    assert.equal(caught, `ALERT Medal {won:"The winner"}`);
  });

  it("plays audio", () => {
  });
});
