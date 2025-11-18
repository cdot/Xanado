/*Copyright (C) 2023 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser,node */

/**
 * Support for Xanado unit tests (which use Mocha).
 */

/* global Platform */
/* global jQuery */
/* global $ */
/* global DOM */

import chai from "chai";
import { CBOR } from "../src/game/CBOR.js";

const assert = chai.assert;

// Non-persistent database in memory (not even LocalStorage)
import { MemoryDatabase } from "./MemoryDatabase.js";

// Placeholder to disable tests while debugging.
function UNit() {};

// Cache of fs.promises, for node.js only
let Fs;

/**
 * Function to set up Platform (and localStorage if needed).
 * Call in before()
 * @return {Promise}
 */
function setupPlatform(){
  if (typeof global === "undefined") {
    // BROWSER
    return import("../src/browser/BrowserPlatform.js")
    .then(mod => {
      window.Platform = mod.BrowserPlatform;
      return window.Platform;
    });
  };

  // NODE.JS
  return Promise.all([
    Promise.all([
      import("fs"),
      import("tmp-promise"),
      import("node-localstorage")
    ])
    .then(mods => {
      Fs = mods[0].promises;
      const tmp = mods[1].default;
      const LocalStorage = mods[2].LocalStorage;
      return tmp.dir()
      .then(d => {
        const ls = new LocalStorage(d.path);
        global.localStorage = ls;
      });
    }),
    import("../src/server/ServerPlatform.js")
    .then(mod => global.Platform = mod.ServerPlatform)
  ]);
}

/**
 * Set up jQuery and jQuery-UI
 * * global.DOM
 * * global.window
 * * global.document
 * * global.navigator
 * * global.jQuery
 * * global.$
 * call in before(). jQuery will be re-used between combined tests
 * (e.g.  npm run test or mocha *.js).
 * @param {string?} url the url we are pretending to have been loaded from.
 * Not supported in the browser.
 * @param {string?} html path to an html file to load. Not supported
 * in the browser.
 * @return {Promise}
 */
function setup$(url, html) {
  if (typeof global === "undefined") {
    // Browser
    return import("jquery")
    .then(() => import("jquery-ui"));
  }

  // Node.js. Map URL to a file://
  if (typeof url !== "string")
    url = `${import.meta.url}/../html/test.html`;

  if (global.$) {
    // jQuery is already defined, can't reset the DOM because
    // import() won't re-run side-effecting dependencies such as
    // jquery so have to re-use the existing document. WARNING:
    // subtle bugs may lie ahead! :-(
    //console.debug("$RECONFIGURE", url);
    DOM.reconfigure({ url: url });
    if (html) {
      $("head").html("");
      return Fs.readFile(html)
      .then(buf => {
        // Only the body, ignore the head
        const html = buf.toString().replace(/.*<body[^>]*>(.*)<\/body>.*/, "$1");
        //console.debug("$HTML", html.length);
        $("body").html(html);
      });
    } else {
      $("head").html("");
      $("body").html("");
      return Promise.resolve();
    }
  }

  return Promise.all([
    import("jsdom"),
    import("jquery")
  ])
  .then(mods => {
    const jsdom = mods[0];
    const jquery = mods[1].default;

    // Monitor resource loading - debug - lets us track
    // CSS etc loading
    class CustomResourceLoader extends jsdom.ResourceLoader {
      fetch(url, options) {
        url = url.replace("/test/", "/");
        //console.debug("FETCHING", url);
        return super.fetch(url, options)
        .then(buff => {
          //console.debug("LOADED", url);
          return buff;
        });
      }
    }
    const opts = {
      resources: new CustomResourceLoader(), // debug
      url: url
    };
    const JSDOM = jsdom.JSDOM;
    //console.log(url);
    const prom = html
          ? JSDOM.fromFile(html, opts)
          : Promise.resolve(new JSDOM(`<!doctype html><html></html>"`, opts));
    return prom.then(dom => {
      global.DOM = dom;
      global.window = DOM.window;
      global.document = DOM.window.document;
      global.$ = global.jQuery = jquery(window);
      assert($.ajax);
      assert.equal(jQuery.ajax, $.ajax);
    });
  })

  .then(() => import("jquery-ui/dist/jquery-ui.js"));
}

/**
 * Load a pre-existing test game fixture. The fixture is patched to route
 * saves to a memory database.
 * @param {string} name test game name (from test/data/*.game)
 * @param { object} Class the load class, `Game` or a subclass thereof
 */
function getTestGame(name, Class) {
  assert(typeof global !== "undefined", "node.js only");

  return Promise.all([
    import("path"),
    import("url"),
    import("../src/server/FileDatabase.js")
  ])
  .then(mods => {
    const Path = mods[0];
    const fileURLToPath = mods[1].fileURLToPath;
    const __dirname = Path.dirname(fileURLToPath(import.meta.url));
    const FileDatabase = mods[2].FileDatabase;
    const db = new FileDatabase({
      dir: `${__dirname}/data`, ext: "game"
    });
    return db.get(name)
    // TODO: decode the packed game
    .then(data => CBOR.decode(data, Class.CLASSES))
    .then(game => game.onLoad(new MemoryDatabase()));
  });
}

/**
 * A fake server. This monkey-patches $.ajax. It takes a list of URLs that
 * are expected to be requested, each with a promise that must be fulfilled
 * with the result of the request. Once all requests have been made, the
 * test should `wait` for the server. If any expected request is not
 * received, that is teated as an error. Requests may be made multiple
 * times in a single test, there is no check for repeats.
 */
class StubServer {

  /**
   * @param {object.<string,Promise} expects map from URL string to
   * a promise that must be fulfilled with the result of the query.
   * @param {function} debug debug function
   */
  constructor(expects, debug) {
    if (!expects) expects = {};
    // Convert simple promises to { promise: count: }
    for (const q in expects) {
      if (expects[q] instanceof Promise) {
        expects[q] = {
          promise: expects[q],
          count: 1
        };
      }
    }
    this.$ajax = $.ajax;
    this.jQueryAjax = jQuery.ajax;
    this.expected = expects || {};
    this.received = {};
    this.debug = debug || (() => {});

    assert($.ajax);
    assert.equal(jQuery.ajax, $.ajax);
    $.ajax = (args) => {
      if (/^file:/.test(args.url)) {
        args.url = args.url.replace("file://", "");
      } else if (this.expected[args.url]) {
        if (this.expected[args.url].count-- <= 0) {
          console.error("Server didn't expect request: ", args);
          assert.fail(`Unexpected ${args.url}, count is ${this.expected[args.url].count + 1}`);
        }
        this.debug("Server received", args.url);
        if (this.expected[args.url].count === 0)
          this.debug("\tall requests received");
        else
          this.debug("\t", this.expected[args.url].count, "requests remain");
        this.received[args.url] = true;
        return this.expected[args.url].promise;
      }

      // jquery ui tabs has a bug, this is the workaround
      if (args.url === "")
        return undefined;

      //console.debug("Fallback", args.url);
      assert(args.url && args.url.length > 0, args.url);
      return $.when(
        Fs.readFile(args.url)
        .then(d => d.toString()));
    };
    assert($.ajax);
    assert.equal(jQuery.ajax, $.ajax);
  }

  /**
   * Add an extra "expect"
   * @param {string} url url to expect
   * @param {Promise} promise fulfilled with result of request
   */
  expect(url, promise) {
    this.expected[url] = promise;
  }

  /**
   * Wait for all expects to be fulfilled. The test might time out
   * before all promises complete, but that's OK.
   */
  wait() {
    const self = this;
    return new Promise(resolve => {
      setTimeout(function wait() {
        let unsaw = false;
        for (const f in self.expected) {
          if (!self.received[f]) {
            unsaw = true;
            self.debug(`Server is awaiting "${f}"`);
          }
        }
        if (unsaw) {
          setTimeout(wait, 100);
        } else {
          self.debug("Server has seen all expected requests");
          $.ajax = self.$ajax;
          assert($.ajax);
          assert.equal(jQuery.ajax, $.ajax);
          resolve();
        }
      }, 50);
    });
  }
}

/**
 * Set up $.i18n, for testing modules that use $.i18n without themselves
 * importing it explicitly. Requires jquery (see setup$()).
 * @param {string} lang test language (defaults to "en")
 * @param {boolean} debug to enable debug in jQuery.i18n
 */
function setupI18n(lang, debug) {
    
  if (!lang) lang = "en";
  return import("../src/browser/i18n.js")
  .then(mods => {
    assert($.i18n);
    return $.i18n.init(lang, "../../i18n", debug ? console.debug : undefined);
  })
  .catch(e => {
    console.error(e);
    assert.fail(e);
  });
};

/**
 * Wait for the given dialog id to appear in the DOM and be opened.
 * @param {string} id id of the dialog e.g. "LoginDialog"
 * @param {boolean?} debug debug messages
 * @return {Promise} a promise that will resolve when the dialog
 * has been seen and destroyed.
 */
function expectDialog(id, invoker, options) {
  //assert.equal($(`#${id}`).length, 0);
  if (!options) options = { autoclose: true };
  function wfd(resolve) {
    if ($(`#${id}`).length > 0 && $(`#${id}`).data("DIALOG_OPEN")) {
      if (options.debug) options.debug("expectDialog SAW", id);
      if (options.autoclose) {
        if (options.debug) options.debug("expectDialog CLOSING", id);
        $(`#${id}`).dialog("close")
        .removeData("DIALOG_CREATED", true)
        .dialog("destroy");
      }
      resolve();
    } else
      setTimeout(() => wfd(resolve), 250);     
  }
  if (options.debug) options.debug("WAITING FOR", id);
  assert(!$(`#${id}`).data("DIALOG_OPEN"));
  invoker();
  return new Promise(resolve => wfd(resolve));
}


export {
  setupPlatform, setup$, setupI18n,
  expectDialog,
  StubServer, getTestGame, UNit
}
