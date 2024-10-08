/*Copyright (C) 2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser */

/**
 * Browser app for solver.html
 */
import { BrowserPlatform } from "../browser/BrowserPlatform.js";
window.Platform = BrowserPlatform;

import "jquery";
import "jquery-ui";

import { Dictionary, Explorer } from "@cdot/dictionary";

import { UI } from "../browser/UI.js";
import { loadDictionary } from "../game/loadDictionary.js";

/**
 * Management interface for word solver web app
 */
class Solver extends UI {

  search(action) {
    const $results = $("#results");
    $results.empty();
    loadDictionary($("#dictionary").val())
    .then(dict => Explorer[action].call(
      null,
      dict, [ $("#letters").val() ], word => {
        $results.append(`${word} `);
      }));
  }

  /**
   * Create the UI and start interacting
   */
  create() {
    return Platform.readFile(Platform.getFilePath("dictionaries/index.json"))
    .then(dictionaries => {
      const $dics = $("#dictionary");
      dictionaries
      .forEach(d => $dics.append($(`<option value="${d}">${d}</option>`)));

      $("#anagrams").on("click", () => this.search("anagrams"));
      $("#hangmen").on("click", () => this.search("hangmen"));

      $("select").selectmenu();
      $("button").button();
    });
  }
}

export { Solver }
