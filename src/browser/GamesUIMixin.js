/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser */

/* global assert */

import { Game } from "../game/Game.js";
import { BrowserGame } from "./BrowserGame.js";
const Player = BrowserGame.CLASSES.Player;

/**
 * Functionality shared between the client/server and standalone
 * versions of the Games UI
 * @mixin browser/GamesUIMixin
 */
const GamesUIMixin = superclass => class extends superclass {

  /**
   * Format of rows in the games table.
   */
  static GAME_TABLE_ROW = '<tr class="game" id="%k">'
  + '<td class="h-key">%k</td>'
  + '<td class="h-edition">%e</td>'
  + '<td class="h-players">%p</td>'
  + '<td class="h-last-play">%l</td>'
  + '<td class="h-state">%s</td>'
  + '</tr>';

  /* c8 ignore start */

  /**
   * Used by GameDialog
   * @instance
   * @memberof browser/GamesUIMixin
   */
  gameOptions(game) {
    assert.fail(`GamesUIMixin.gameOptions ${game}`);
  }

  /**
   * Used by GameDialog
   * @instance
   * @memberof browser/GamesUIMixin
   */
  joinGame(game) {
    assert.fail(`GamesUIMixin.joinGame ${game}`);
  }

  /**
   * Used by GameDialog
   * @instance
   * @memberof browser/GamesUIMixin
   */
  addRobot(game) {
    assert.fail(`GamesUIMixin.addRobot ${game}`);
  }

  /**
   * Used by GameDialog
   * @instance
   * @memberof browser/GamesUIMixin
   */
  invitePlayers(game) {
    assert.fail(`GamesUIMixin.invitePlayers ${game}`);
  }

  /**
   * Used by GameDialog
   * @instance
   * @memberof browser/GamesUIMixin
   */
  anotherGame(game) {
    assert.fail(`GamesUIMixin.anotherGame ${game}`);
  }

  /**
   * Used by GameDialog
   * @instance
   * @memberof browser/GamesUIMixin
   */
  deleteGame(game) {
    assert.fail(`GamesUIMixin.deleteGame ${game}`);
  }

  /**
   * Used by GameDialog
   * @instance
   * @memberof browser/GamesUIMixin
   */
  observe(game) {
    assert.fail(`GamesUIMixin.observe ${game}`);
  }

  /**
   * Get a list of past player successes and failures.
   * @instance
   * @memberof browser/GamesUIMixin
   * @param {string} what 'all' or 'active' (default)
   * @return {Promise} resolves to a list of objects, one per
   * unique player, each with keys as follows:
   * * key: player key
   * * name: player name
   * * score: total cumulative score
   * * wins: number of wins
   * * games: number of games played
   */
  getHistory(what) {
    assert.fail(`GamesUIMixin.getHistory ${what}`);
  }

  /**
   * Get a list of games
   * @instance
   * @memberof browser/GamesUIMixin
   * @param {string} what `all` or `active`
   * @return {Promise} resolves to a list of Game.simple
   */
  getGames(what) {
    assert.fail(`GamesUIMixin.getGames ${what}`);
  }

  /**
   * Get the given game
   * @instance
   * @memberof browser/GamesUIMixin
   * @return {Promise} promise that resolves to a Game or Game.simple
   */
  getGame(key) {
    assert.fail(`GamesUIMixin.getGame ${key}`);
  }

  /* c8 ignore stop */

  /**
   * Attach event handlers to objects in the UI
   * @instance
   * @memberof browser/GamesUIMixin
   */
  attachUIEventHandlers() {
    super.attachUIEventHandlers();

    $("#showAllGames")
    .on("change", () => this.refreshGames());
  }

  /**
   * @override
   * @instance
   * @memberof browser/GamesUIMixin
   */
  readyToListen() {
    return this.refresh();
  }

  /**
   * Construct a table row that shows the state of the given player
   * @instance
   * @memberof browser/GamesUIMixin
   * @param {Game|object} game a Game or Game.simple
   * @param {Player} player the player
   * @param {boolean} isActive true if the game isn't over
   */
  $player(game, player, isActive) {
    assert(player instanceof Player, "Not a player");
    const $tr = player.$tableRow();

    if (isActive) {
      const info = [];
      if (player.dictionary && player.dictionary !== game.dictionary) {
        const dic = $.i18n("using-dic", player.dictionary);
        info.push(dic);
      }
      if (game.timerType && player.clock) {
        const left = $.i18n("left-to-play", player.clock);
        info.push(left);
      }
      if (info.length > 0)
        $tr.append(`<td class="smaller">${info.join("<br />")}</td>`);

    } else {
      const winningScore = game.getPlayers().reduce(
        (max, p) =>
        Math.max(max, p.score), 0);

      if (player.score === winningScore) {
        $tr.append('<td class="ui-icon icon-winner"></td>');
      }

      return $tr;
    }

    const $box = $(document.createElement("td"));
    $box.addClass("button-box");
    $tr.append($box);

    if (this.session && player.key === this.session.key) {
      // Currently signed in player
      $box.append(
        $(document.createElement("button"))
        .attr("name", `join${game.key}`)
        .button({ label: $.i18n("Open game") })
        .tooltip({
          content: $.i18n("tt-open")
        })
        .on("click", () => {
          console.debug(`Open game ${game.key}/${this.session.key}`);
          this.joinGame(game);
        }));
    }
    return $tr;
  }

  /**
   * Construct a table row that shows the state of the given game
   * @instance
   * @memberof browser/GamesUIMixin
   * @param {Game|object} game a Game or Game.simple
   * @private
   */
  $gameTableRow(game) {
    assert(game instanceof Game, "Not a game");
    return $(game.tableRow(this.constructor.GAME_TABLE_ROW))
    .on("click", () => {
      import(
        /* webpackMode: "lazy" */
        /* webpackChunkName: "GameDialog" */
        "../browser/GameDialog.js")
      .then(mod => new mod.GameDialog({
        game: game,
        ui: this
      }))
      .catch(e => console.error(e));
    });
  }

  /**
   * Refresh the display of a single game. The game must already
   * be present in the DOM games list.
   * @instance
   * @memberof browser/GamesUIMixin
   * @param {Game|object} game a Game or Game.simple
   * @private
   */
  showGame(game) {
    // Update the games list and dialog headlines as appropriate
    $(`#${game.key}`).replaceWith(
      game.tableRow(this.constructor.GAME_TABLE_ROW));
    // Update the open game dialog if appropriate
    const dlg = $(`#GameDialog[name=${game.key}]`).data("this");
    if (dlg)
      dlg.populate(game);
  }

  /**
   * Refresh the display of all games
   * @instance
   * @memberof browser/GamesUIMixin
   * @param {object[]} games array of Game.simple
   */
  showGames(simples) {
    if (simples.length === 0) {
      $("#gamesList").hide();
      return;
    }

    // Note: assumes table#gamesList has a tbody
    let $gt = $("#gamesList > tbody");
    $gt.empty();

    const games = simples.map(
      simple => BrowserGame.fromSendable(simple, BrowserGame.CLASSES))
          .sort((a, b) => a.creationTimestamp < b.creationTimestamp ? -1 :
                a.creationTimestamp > b.creationTimestamp ? 1 : 0);

    games.forEach(game => {
      const $row = this.$gameTableRow(game);
      $gt.append($row);
    });

    $("#gamesList").show();
  }

  /**
   * Request an update for all games in a games table
   * @instance
   * @memberof browser/GamesUIMixin
   * @param {boolean?} noPlayers true to omit players from the
   * table headline
   */
  refreshGames() {
    const what = $("#showAllGames").is(":checked") ? "all" : "active";
    return this.getGames(what)
    .then(games => this.showGames(games))
    .catch(e => console.error(e));
  }

  /**
   * Refresh a single game (which must already exist in the
   * DOM games table)
   * @instance
   * @memberof browser/GamesUIMixin
   * @param {string} key Game key
   */
  refreshGame(key) {
    return this.getGame(key)
    .then(g => {
      return (g instanceof BrowserGame)
      ? g
      : BrowserGame.fromSendable(g, BrowserGame.CLASSES);
    })
    .then(game => this.showGame(game))
    .catch(e => this.alert(e));
  }

  /**
   * Refresh the UI state to reflect signin state. Refreshes the
   * history and the games list.
   * @instance
   * @memberof browser/GamesUIMixin
   * @return {Promise} promise that resolves when all AJAX calls
   * have completed
   */
  refresh() {
    return Promise.all([
      this.getHistory()
      .then(data => {
        if (data.length === 0) {
          $("#gamesCumulative").hide();
          return;
        }
        let n = 1;
        $("#gamesCumulative").show();
        const $gt = $("#playerList");
        $gt.empty();
        data.forEach(player => {
          const s = $.i18n("txt-leader", n++, player.name, player.score,
            player.games, player.wins);
          $gt.append(`<div class="player-cumulative">${s}</div>`);
        });
      })
      .catch(e => console.error(e)),
      this.refreshGames()
    ]);
  }
};

export { GamesUIMixin }
