/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser */

/* global assert */
/* global Platform */

import { Square } from "../game/Square.js";
import { UIEvents } from "./UIEvents.js";

// Translation strings, only required to keep npm run tx happy
// /*i18n*/"long-D" /*i18n*/"short-D"
// /*i18n*/"long-M" /*i18n*/"short-M"
// /*i18n*/"long-Q" /*i18n*/"short-Q"
// /*i18n*/"long-T" /*i18n*/"short-T"
// /*i18n*/"long-_" /*i18n*/"short-_"
// /*i18n*/"long-d" /*i18n*/"short-d"
// /*i18n*/"long-q" /*i18n*/"short-q"
// /*i18n*/"long-t" /*i18n*/"short-t"

/**
 * Browser-side {@linkcode Square}
 */
class BrowserSquare extends Square {

  /**
   * Get the unique id for this square, for use in DOM id attributes.
   * @return {string}
   */
  get squid() {
    if (this.id)
      // compatibility with old games, which have id but not surface
      return this.id;
    let id = `${this.surface.id}_${this.col}`;
    if (typeof this.row !== "undefined")
      id += `x${this.row}`;
    return id;
  }

  /**
   * Create the jquery representation of the square.
   * @param {jQuery} $td TD to make into a square
   */
  $populate($td) {
    $td
    .addClass(`square-${this.type}`)
    .attr("id", this.squid)
    .on("click",
        () => Platform.trigger(UIEvents.SELECT_SQUARE, [ this ]))
    .droppable({
      hoverClass: "drop-active",
      /* c8 ignore start */
      drop: (event, jui) => {
        // jui.draggable is a $tile, which has had data("Square")
        // set in Tile.$ui
        const $tile = $(jui.draggable);
        const from = $tile.data("Square");
        // Tell the main UI about it
        Platform.trigger(UIEvents.DROP_TILE, [ from, this ]);
      }
      /* c8 ignore stop */
    });

    if (typeof this.underlay !== "undefined") {
      // Simple underlay character i.e. SWAP
      const $underlay = $(document.createElement("div")).addClass("underlay");
      $td.append($underlay);
      $underlay.text(this.underlay);
    } else if (this.type !== "_") {
      $td.addClass("score-multiplier");
      // map long- and short- to language strings describing the
      // multiplier. data-long is for when the display resolution
      // is high, data-short for when it is tight e.g. on mobile
      // devices. The relevant string is selected in CSS.
      const $underlay = $(document.createElement("div")).addClass("underlay");
      $td.append($underlay);
      $underlay
      .attr("data-long", $.i18n(`long-${this.type}`))
      .attr("data-short", $.i18n(`short-${this.type}`));
    }

    if (this.tile)
      this.$placeTile($td);
    else
      // Call to get the droppable attached
      this.$unplaceTile($td);

    return $td;
  }

  /**
   * A tile has been placed on this square and we have to adjust the
   * UI accordingly. The tile is assumed to already be
   * attached to the Square.
   * @param {jQuery?} $td jquery object for the TD of the square. If
   * undefined, the TD will be found from the id.
   */
  $placeTile($td) {
    if (!$td) $td = $(`#${this.squid}`);

    assert(this.tile, "No tile");

    const $tile = this.tile.$ui(this);
    $td.append($tile);
  }

  // @override
  placeTile(tile, lock) {
    if (super.placeTile(tile, lock))
      this.$placeTile();
  }

  /**
   * Remove the currently placed tile's UI from the square's
   * UI. By the time this is called, the tile has already been
   * removed from the model of the square, we just need to detach
   * the UI.
   * @param {jQuery?} $td jquery object for the TD of the square. If
   * undefined, the TD will be found from the ID.
   */
  $unplaceTile($td) {

    assert(!this.tile, "Can't $unplace a placed tile");

    if (!$td) $td = $(`#${this.squid}`);

    // There may be no TD if the tile is being unplaced from
    // another player's rack.
    if ($td.length === 0)
      return;

    // Remove the tile UI from the square (without deleting it)
    $td.find(".Tile").detach();
  }

  /**
   * @override
   */
  unplaceTile() {
    const unplaced = super.unplaceTile();
    if (unplaced)
      this.$unplaceTile();
    return unplaced;
  }

  /**
   * Set the underlay
   * @param {boolean} sel
   */
  setUnderlay(ch) {
    this.underlay = ch;
  }

  /**
   * Change the visual representation of the square (or the tile on it)
   * to reflect the fact that it is selected in the UI
   * @param {boolean} sel
   */
  select(sel) {
    const $tc = $("#typingCursor").hide();
    if (this.tile)
      this.tile.showSelected(sel);
    else if (sel)
      $(`#${this.squid}`).prepend($tc.show());
  }
}

export { BrowserSquare }
