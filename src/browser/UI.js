/*Copyright (C) 2019-2023 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser */

/* global assert */

import "jquery";
import "jquery-ui";

import "./i18n.js";
import "./icon_button.js";

import { stringify } from "../common/Utils.js";

/* global Platform */

/**
 * Base class of functionality shared between all browser UIs.
 */
class UI {

  /**
   * Debug function. Same signature as console.debug.
   * @member {function}
   */
  /* c8 ignore next */
  debug = () => {};

  /**
   * Communications channel which the backend will be sending and
   * receiving notifications on. In a client-server configuration,
   * this will be a WebSocket. For standalone, it will be a
   * {@linkcode Dispatcher}.
   * @member {Channel}
   */
  channel = undefined;

  /**
   * Report an error.
   * @param {string|Error|array|jqXHR} args This will either be a
   * simple i18n string ID, or an array containing an i18n ID and a
   * series of arguments, or a jqXHR.
   * @param {string?} title title for the error dialog
   * @return {jQuery} the dialog
   */
  alert(args, title = "", log) {
    // Alert used for user feedback if something goes wrong, debugger
    // is to make it easier to get a stack trace
    debugger;

    // The log parameter is used for unit tests
    log = (log || console.error);

    // Handle a jqXHR
    if (typeof args === "object") {
      if (args.responseJSON)
        args = args.responseJSON;
      else if (args.responseText)
        args = args.responseText;
      else if (args.statusText)
        args = args.statusText;
    }

    let message;
    if (typeof(args) === "string") { // simple string
      message = $.i18n(args);
      log("ALERT", title, message);
    } else if (args instanceof Error) { // Error object
      message = args.message;
      log("ALERT", title, message, args.stack);
    } else if (args instanceof Array) { // First element i18n code
      message = $.i18n.apply($.i18n, args);
      log("ALERT", title, message);
    } else { // something else
      message = stringify(args);
      log("ALERT", title, message);
    }

    return $("#alertDialog")
    .dialog({
      modal: true,
      title: title || $.i18n("hey-problem")
    })
    .html(`<p class="alert">${message}</p>`);
  }

  /**
   * Cache of Audio objects, indexed by name of clip.
   * Empty until a clip is played.
   * @member {Object<string,Audio>}
   * @private
   */
  soundClips = {};

  /**
   * Send notifications to the backend.
   * In a client-server configuration, this will send a notification
   * over a WebSocket. In a standalone configuration, it will
   * invoke a Dispatcher.
   */
  notifyBackend(notification, data) {
    this.channel.emit(notification, data);
  }

  // Server can't play audio, so coverage irrelevant
  /* c8 ignore start */

  /**
   * Play an audio clip, identified by id. Clips must be
   * pre-loaded in the HTML. Note that most (all?) browsers require
   * some sort of user interaction before they will play audio
   * embedded in the page. Playing is asynchronous.
   * @instance
   * @memberof client/UIMixin
   * @param {string} id name of the clip to play (no extension). Clip
   * must exist as an mp3 file in the /audio directory.
   */
  playAudio(id) {

    if (typeof Audio === "undefined")
      return;

    let audio = this.soundClips[id];

    if (!audio) {
      audio = new Audio(`../audio/${id}.mp3`);
      this.soundClips[id] = audio;
    }

    if (audio.playing)
      audio.pause();

    audio.play()
    .catch(() => {
      // play() can throw if the audio isn't loaded yet. Catching
      // canplaythrough might help (though it's really a bit of
      // overkill, as none of Xanado's audio is "important")
      $(audio).on(
        "canplaythrough",
        () => {
          $(audio).off("canplaythrough");
          audio.play()
          .catch(() => {
            // Probably no interaction yet
          });
        });
    });
  }

  /**
   * Copies the specified text to the clipboard, using fallback methods
   * for older browsers.
   * @param {String} text The text to copy.
   * @return {Promise} a promise that resolves when the text is copied,
   * or rejects if the copy fails.
   */
  copyToClipboard(text) {
    // Modern versions of Chromium browsers, Firefox, etc. in
    // a secure (https) context
    function navi() {
      if (navigator.clipboard)
        return navigator.clipboard.writeText(text)
      .then(r => "Clipboard");
      return Promise.reject("navigator.clipboard not available");
    }

    // Venerable IE
    function ie() {
      if (window.clipboardData)
        return new Promise((resolve, reject) => {
          if (window.clipboardData.setData("Text", text))
            resolve("clipboardData");
          else
            reject("window.clipboardData.setData failed");
        });
      return Promise.reject("window.clipboardData not available");
    }

    function execCmd() {
      return new Promise((resolve, reject) => {
        // execCommand, which is deprecated but is still available
        // in most browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.top = "-999999px";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        let e = undefined;
        try {
          if (!document.execCommand("copy"))
            e = "execCommand failed";
        } catch (error) {
          e = error;
        }
        document.body.removeChild(textArea);
        if (e)
          reject(e);
        else
          resolve("execCommand");
      });
    }
    return navi()
    .catch(e => ie())
    .catch(e => execCmd());
  }

  /* c8 ignore stop */

  /**
   * Initialise CSS style cache
   * @return {Promise} a promise that resolves when the theme has changed.
   * Note this doesn't mean the CSS has actually changed - that is done
   * asynchronously, as link tags don't support onload reliably on all
   * browsers.
   */
  initTheme() {
    // Initialise jquery theme
    const jqTheme = this.getSetting("jqTheme");
    if (jqTheme)
      // Replace the link for the jQuery theme
      $("#jQueryTheme").each(function() {
        this.href = this.href.replace(/\/themes\/[^/.]+/, `/themes/${jqTheme}`);
      });

    const css = this.getSetting("layout");
    if (css)
      // Replace the link for the CSS
      $("#xanadoCSS").each(function() {
        if (this.href)
          this.href = this.href.replace(/\/css\/[^/.]+/, `/css/${css}`);
      });

    return Promise.resolve();
  }

  /* c8 ignore start */

  /**
   * Apply a function to all instances of the given selector in all CSS
   * style sheets.
   * @param {string} selector selector for the rule to search for
   * @param { function} editor function to apply to each matching rule
   * @private
   */
  eachCSSRule(selector, editor) {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSStyleRule && rule.selectorText == selector) {
            editor(rule);
          }
        }
      } catch(e) {
        // Not allowed to access cross-origin stylesheets
        //console.error("Not allowed", sheet.href);
      }
    }
    return undefined;
  }

  /**
   * Modify a CSS rule. This is used for scaling elements such as tiles
   * when the display is resized. Note that the edit is applied to
   * all exactly matching selectors in all stylesheets, so a theme can
   * override a style and it will still work.
   * @param {string} selector selector of rule to modify
   * @param {Object.<string,number>} changes map of css attribute
   * name to new pixel value.
   * @private
   */
  editCSSRule(selector, changes) {
    this.eachCSSRule(
      selector,
      rule => {
        const before = rule.style.cssText;
        let after = before;
        $.each(changes, (prop, val) => {
          const re = new RegExp(`(^|[{; ])${prop}:[^;]*`);
          after = after.replace(re, `$1${prop}:${val}px`);
        });
        rule.style.cssText = after;
      });
  }

  /* c8 ignore stop */

  /**
   * Promise to initialise the locale.
   * @return {Promise}
   */
  initLocale() {
    return this.promiseLocales()
    .then(locales => {
      const ulang = this.getSetting("language") || "en";
      this.debug("User language", ulang);
      return $.i18n.init(ulang, Platform.getFilePath("i18n"), this.debug)
      .then(() => locales);
    })
    .then(locales => {
      this.debug("Locales available", locales.join(", "));
      // Expand/translate strings in the HTML
      return new Promise(resolve => {
        $(document).ready(() => {
          this.debug("Translating HTML to", $.i18n.locale());
          $("[data-i18n]").i18n();
          resolve(locales);
        });
      });
    })
    .then(() => {
      $("[data-i18n-tooltip]")
      .tooltip({
        items: "[data-i18n-tooltip]",
        content: function() {
          return $.i18n($(this).data("i18n-tooltip"));
        },
        /* c8 ignore start */
        open: function(event, ui) {
          // Handle special case of a button that opens a dialog.
          // When the dialog closes, a focusin event is sent back
          // to the tooltip, that we want to ignore.
          if (event.originalEvent && event.originalEvent.type === "focusin")
            ui.tooltip.hide();
        }
        /* c8 ignore stop */
      });
    });
  }

  /**
   * Set a groups of user setting
   * @param {object<string,object>} settings set of settings
   * @return {Promise} resolves when all settings are complete
   */
  setSettings(settings) {
    return Promise.all([
      Object.keys(settings).map(k => this.setSetting(k, settings[k]))
    ]);
  }

  /* c8 ignore start */

  /**
   * Get a structure describing the current defaults.
   * Must be implemented by a sub-mixin or final class. It's defined as
   * part of the UI because standalone/client have different sources
   * for game defaults.
   * @param {string} type defaults type, either "user" or "game"
   * @return {Promise} promise that resolves to the settings
   */
  promiseDefaults(type) {
    assert.fail(`GameUIMixin.promiseDefaults(${type})`);
  }

  /**
   * Get a session setting. If the current session doesn't define the
   * setting (or there is no current session), then gets the default.
   * @param {string} key setting to get
   */
  getSetting(key) {
    assert.fail(`UI.getSetting ${key}`);
  }

  /**
   * Set a session setting. If there is no current session, then set
   * one up if possible, otherwise ignore the instruction.
   * @param {string} key setting to set
   * @param {string} value value to set
   * @return {Promise} resolves when setting is complete
   */
  setSetting(key, value) {
    assert.fail(`UI.setSetting ${key}=${value}`);
  }

  /**
   * Identify the signed-in user. Override in subclasses.
   * @return {Promise} a promise that resolves to an simple
   * session object if someone is signed in, or throws otherwise.
   * The object is expected to define `key`, the signed-in player, and
   * may set `provider`.
   * @throws Error if there is no session active
   */
  promiseSession() {
    assert.fail("UI.promiseSession");
  }

  /**
   * Get the available locales.
   * @return {Promise} promise resolves to list of available locale names
   */
  promiseLocales() {
    assert.fail("UI.promiseLocales");
  }

  /**
   * Gets a list of the available css.
   * @return {Promise} promise that resolves to
   * a list of css name strings.
   */
  promiseLayouts() {
    assert.fail("UI.promiseLayouts");
  }

  /**
   * Get a list of available dictionaries
   * @memberof GameUIMixin
   * @instance
   * @return {Promise} resolving to a list of available dictionary
   * name strings.
   */
  promiseDictionaries() {
    assert.fail("UI.promiseDictionaries");
  }

  /**
   * Get a list of available editions.
   * Must be implemented by a sub-mixin or final class.
   * @memberof GameUIMixin
   * @instance
   * @return {Promise} resolving to a list of available edition
   * name strings.
   */
  promiseEditions() {
    assert.fail("UI.promiseEditions");
  }

  /* c8 ignore stop */

  /**
   * Attach handlers to document objects. Override in sub-mixin or final
   * class, calling super in the overriding method.
   */
  attachUIEventHandlers() {
    $("#personalise-button")
    .icon_button({ icon: "personalise-icon" })
    .on("click", () => {
      import(
        /* webpackMode: "lazy" */
        /* webpackChunkName: "UserSettingsDialog" */
        "../browser/UserSettingsDialog.js")
      .then(mod => new mod.UserSettingsDialog({
        ui: this,
        onSubmit: (dlg, vals) => {
          this.setSettings(vals)
          .then(() => window.location.reload());
        },
        error: console.error
      }));
    });
  }

  /**
   * Parse the URL to extract parameters. Arguments are returned
   * as keys in a map. Argument names are not decoded, but values
   * are. The portion of the URL before `?` is returned in the
   * argument map using the key `_URL`. Arguments in the URL that
   * have no value are set to boolean `true`. Repeated arguments are
   * not supported (the last value will be the one taken).
   * @return {Object<string,string>} key-value map
   */
  static parseURLArguments(url) {
    const bits = url.split("?");
    const urlArgs = { _URL: bits.shift() };
    const sargs = bits.join("?").split(/[;&]/);
    for (const sarg of sargs) {
      const kv = sarg.split("=");
      const key = kv.shift();
      urlArgs[decodeURIComponent(key)] =
      (kv.length === 0) ? true : decodeURIComponent(kv.join("="));
    }
    return urlArgs;
  }

  /**
   * Reassemble a URL that has been parsed into parts by parseURLArguments.
   * Argument are output sorted alphabetically.
   * @param {object} args broken down URL in the form created by
   * parseURLArguments
   * @return {string} a URL string
   */
  static makeURL(parts) {
    const args = Object.keys(parts)
          .filter(f => f && !/^_/.test(f))
          .sort()
          .map(k => (parts[k] && typeof parts[k] === "boolean") ?
               k : `${k}=${encodeURIComponent(parts[k])}`);
    return `${parts._URL}?${args.join(";")}`;
  }

  /**
   * Format a time interval in seconds for display in a string e.g
   * `formatTimeInterval(601)` -> `"10:01"`
   * Maximum ordinal is days.
   * @param {number} t time period in seconds
   */
  static formatTimeInterval(t) {
    const neg = (t < 0) ? "-" : "";
    t = Math.abs(t);
    const s = `0${t % 60}`.slice(-2);
    t = Math.floor(t / 60);
    const m = `0${t % 60}`.slice(-2);
    t = Math.floor(t / 60);
    if (t === 0) return `${neg}${m}:${s}`;
    const h = `0${t % 24}`.slice(-2);
    t = Math.floor(t / 24);
    if (t === 0) return `${neg}${h}:${m}:${s}`;
    return `${neg}${t}:${h}:${m}:${s}`;
  }
}

export { UI }
