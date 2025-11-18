/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser */

/* global Platform */

import { Tile } from "../game/Tile.js";
import { UIEvents } from "./UIEvents.js";

/**
 * Browser-side {@linkcode Tile}
 * @extends Tile
 */
class BrowserTile extends Tile {

  /**
   * jQuery element for the tile
   * @private
   */
  _$tile = undefined;

  /**
   * Create or refresh the jQuery representation of the tile.
   * @instance
   * @memberof browser/TileMixin
   * @param {Square?} square where this tile is placed. If the
   * tile is currently unplaced, this can be undefined.
   */
  $ui(square) {
    if (this._$tile) {
      this._$tile.find(".letter").text(this.letter);
      this._$tile.find(".score").text(this.score);
    } else {
      const $glyph = $(document.createElement("div"))
            .addClass("glyph")
            .append(`<span class="letter">${this.letter}</span>`)
            .append(`<span class="score">${this.score}</span>`);
      this._$tile = $(document.createElement("div"))
      .addClass("Tile")
      .append($glyph);
    }

    // Vary the fonts to accommodate longer strings
    let len = this.letter.length;
    this._$tile.find(".letter").addClass(`letter-scale-${len}`);
    len = String(this.score).length;
    this._$tile.find(".score").addClass(`score-scale-${len}`);

    // Associate the square passed with the tile UI. This is only
    // used when dragging the tile away from the square, so we know
    // where it was previously placed. Note that this creates a
    // circular dependency, which has to be broken when generting
    // JSON.
    this._$tile.data("Square", square);

    // Attach the tile to the DOM so it is available for clicks
    this._$tile.data("Tile", this);

    if (this.isLocked) {
      /* c8 ignore next 2 */
      if (this._$tile.hasClass("ui-draggable"))
        this._$tile.draggable("destroy");
      this._$tile
      .removeClass("unlocked-tile")
      .addClass("locked-tile");
    }
    else {
      // tile isn't locked, make sure it's draggable. It might be
      // a new UI, or it may have lost its draggability when it was
      // locked onto the board, and is being unlocked by an undo.
      if (!this._$tile.hasClass("ui-draggable")) {
        this._$tile
        .draggable({
          revert: "invalid",
          opacity: 1,
          helper: "clone",
          appendTo: 'body',
          /* c8 ignore start */
          start: (event, jui) => {
            Platform.trigger(UIEvents.CLEAR_SELECT);
            // Highlight drag source
            this._$tile.css({ opacity: 0.5 });
            $(jui.helper)
            .addClass("being-dragged");
          },
          drag: (event, jui) => $(jui.helper).addClass("being-dragged"),
          stop: () => this._$tile.css({ opacity: 1 })
          /* c8 ignore stop */
        });
      }
      this._$tile
      .removeClass("locked-tile")
      .addClass("unlocked-tile");
    }

    return this._$tile;
  }

  /**
   * Change the visual representation of the tile to show it as
   * (un)selected
   * @instance
   * @memberof browser/TileMixin
   * @param {boolean} sel whether to select or deselect
   */
  showSelected(sel) {
    if (sel) {
      this._$tile.addClass("selected");
    } else
      this._$tile.removeClass("selected");
  }
}

export { BrowserTile }
