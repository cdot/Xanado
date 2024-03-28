/*Copyright (C) 2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser */
/* global Platform */

/**
 * Browser app for solver.html
 */
import { BrowserPlatform } from "../browser/BrowserPlatform.js";
window.Platform = BrowserPlatform;

import "jquery";
import "jquery-ui";

import { Explorer } from "@cdot/dictionary";

import { UI } from "../browser/UI.js";
import { StandaloneUIMixin } from "./StandaloneUIMixin.js";
import { loadDictionary } from "../game/loadDictionary.js";

/**
 * Management interface for word solver web app
 */
class Solver extends StandaloneUIMixin(UI) {
  // pull in StandaloneUIMixin to get promiseLocales and getSetting

  search(action) {
    const $results = $("#results");
    $results.empty();
    loadDictionary($("#dictionary").val())
    .then(dict => {
      if (typeof Explorer[action] === "function") {
        Explorer[action].call(
          null,
          dict, [ $("#letters").val() ], word => {
            $results.append(`${word} `);
          });
      } else if (action === "subwords") {
        const w = $("#letters").val().replace(/\./g, " ");
        const anag = Object.keys(dict.findAnagrams(w));
        anag.forEach(word => {
          $results.append(`${word} `);
        });
      }
    });
  }

  /**
   * Create the UI and start interacting
   */
  create() {
    super.create();
    this.initLocale()
    .then(() => Platform.getJSON(Platform.absolutePath("dictionaries/index.json")))
    .then(dictionaries => {
      const $dics = $("#dictionary");
      dictionaries
      .forEach(d => $dics.append($(`<option value="${d}">${d}</option>`)));

      $("#anagrams").on("click", () => this.search("anagrams"));
      $("#hangmen").on("click", () => this.search("hangmen"));
      $("#subwords").on("click", () => this.search("subwords"));

      $("select").selectmenu();
      $("button").button();
    });
  }
}

export { Solver }
