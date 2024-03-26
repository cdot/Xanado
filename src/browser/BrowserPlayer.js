/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser */

import "jquery";

import { Player } from "../game/Player.js";

// Unicode characters
const BLACK_CIRCLE = "\u25cf";

/**
 * Browser-side {@linkcode Player}
 * @extends Player
 */
class BrowserPlayer extends Player {

  /**
   * Create score table row for the player.
   * @memberof browser/PlayerMixin
   * @instance
   * @param {Player?} uiPlayer the current player in the UI
   * @return {jQuery} jQuery object for the score table
   */
  $TR(uiPlayer) {
    const $tr = $(`<tr id="player${this.key}"></tr>`)
          .addClass("player-row");

    // "current player" marker
    if (this === uiPlayer)
      $tr.addClass("whosTurn");
    $tr.append(`<td class="turn-pointer">&#10148;</td>`);

    // Player type, robot or human
    const $icon = $('<div class="ui-icon"></div>');
    $icon.addClass(this.isRobot ? "icon-robot" : "icon-person");
    $tr.append($(document.createElement("td")).append($icon));

    // Player name
    const who = this === uiPlayer ? $.i18n("You") : this.name;
    const $name = $(`<td class="player-name">${who}</td>`);
    $tr.append($name);

    // Are they due to miss the next turn?
    if (this.missNextTurn)
      $name.addClass("miss-turn");

    // Remaining tile count; updated in GameUIMixin.updateTileCounts
    $tr.append('<td class="remaining-tiles"></td>');

    // Robots are always connected, humans may or may not be
    const $status = $(`<td class='connect-state'>${BLACK_CIRCLE}</td>`);
    $status.addClass(
      this._isConnected || this.isRobot ? "online" : "offline");
    $tr.append($status);

    // Player score; updated in $refreshScore
    $tr.append(`<td class='player-score'>${this.score}</td>`);

    // Player clock, updated in GameUIMixin.handle_TICK
    $tr.append(`<td class='player-clock'></td>`);

    return $tr;
  }

  /**
   * Refresh score table representation of the player.
   * @instance
   * @memberof browser/PlayerMixin
   */
  $refreshScore() {
    $(`#player${this.key} .player-score`).text(this.score);
  }

  /**
   * Set 'online' status of player.
   * @instance
   * @memberof browser/PlayerMixin
   * @param {boolean} tf true/false
   */
  online(tf) {
    const conn = this.isRobot || tf;
    if (!this.isRobot)
      this._isConnected = conn;
    let rem = conn ? "offline" : "online";
    let add = conn ? "online" : "offline";
    $(`#player${this.key} .connect-state`)
    .removeClass(rem)
    .addClass(add);
  }
}

export { BrowserPlayer }
