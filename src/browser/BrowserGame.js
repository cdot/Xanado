/*Copyright (C) 2021-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser */

/* global assert */

import { Undo } from "../game/Undo.js";
import { CommandsMixin } from "../game/CommandsMixin.js";
import { Game } from "../game/Game.js";
import { Turn } from "../game/Turn.js";
import { BrowserSquare } from "./BrowserSquare.js";
import { BrowserTile } from "./BrowserTile.js";
import { BrowserBoard } from "./BrowserBoard.js";
import { BrowserPlayer } from "./BrowserPlayer.js";
import { BrowserRack } from "./BrowserRack.js";

/**
 * Browser-side mixin for {@linkcode Game}
 * @extends Game
 * @mixes game/Commands
 * @mixes game/Undo
 */
class BrowserGame extends Undo(CommandsMixin(Game)) {

  /**
   * Override factory classes from Game
   */
  static CLASSES = {
    Square: BrowserSquare,
    Tile: BrowserTile,
    Board: BrowserBoard,
    Game: BrowserGame,
    Player: BrowserPlayer,
    Rack: BrowserRack,

    LetterBag: Game.CLASSES.LetterBag,
    Move: Game.CLASSES.Move,
    Turn: Game.CLASSES.Turn
  }

  /**
   * Construct a test string giving a friendly description of a list
   * of "things" e.g. `andList(["A","B","C"])` will return `A, B and C`
   * @param {string[]} list list of things
   * @return {string} list of things as a string
   */
  static andList(list) {
    if (list.length == 0)
      return "";

    if (list.length == 1)
      return list[0];

    return $.i18n("txt-players-tail",
                  list.slice(0, list.length - 1).join(", "),
                  list[list.length - 1]);
  }

  /**
   * Format game information shown in the game table and the head
   * of the game dialog.
   * @param {boolean?} inTable true if this is being prepared for the
   * table, false for the dialog.
   * @param {string} format format to use for the headline. The following
   * escapes can be used:
   * * %c - the creation date e.g. "Thu Jan 01 1970"
   * * %e - the edition being players e.g. "English_Scrabble"
   * * %k - the key of the game
   * * %l - date the game was last played (or was created if not played yet)
   * * %p - list of players in the game e.g "Player 1 and Player 2"
   * * %s - final game state e.g. "Player 2 won"
   * @return {string} html string
   */
  formatGameInfo(format) {
    const repl = (m, p1) => {
      switch (p1) {
      case "c":
        return new Date(this.creationTimestamp).toDateString();
      case "e":
        return this.edition;
      case "k":
        return this.key;
      case "l":
        {
          const t = this.lastTurn();
          const d = new Date(t ? t.timestamp : this.creationTimestamp);
          return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
        }
      case "p":
        return BrowserGame.andList(this.getPlayers().map(p => p.name));
      case "s":
        if (this.hasEnded()) {
          const winners = this.getWinners();
          const who = BrowserGame.andList(winners.map(p => p.name));
          return $.i18n("h-won", who.length === 0 ? "?" : who);
        } else if (this.state === Game.State.WAITING)
          return $.i18n("txt-state-waiting");
        else
          return $.i18n("txt-state-playing");
      default:
        assert.fail(`Bad ${p1}`);
      }
      return p1;
    };
    return format.replace(/%([ceklps])/g, repl);
  }

  /**
   * Create the UI for the player table
   * @param {Player} thisPlayer the player for whom the DOM is
   * being generated
   * @return {jQuery} jQuery object representing the player table
   */
  $playerTable(thisPlayer) {
    const $tab = $(document.createElement("table")).addClass("player-table");
    this.players.forEach(
      p => $tab.append(p.$TR(thisPlayer)));
    return $tab;
  }

  /**
   * Given a list of Player.simple, update the players list
   * to reflect the members and ordering of that list.
   * @param {object[]} observers list of observers (simple objects)
   */
  updatePlayerList(observers) {
    for (let player of this.players)
      player.online(false);
    const newOrder = [];
    for (let watcher of observers) {
      let player = this.getPlayerWithKey(watcher.key);
      if (!player) {
        // New player in game
        player = BrowserPlayer.fromSendable(watcher, BrowserGame.CLASSES);
        this.addPlayer(player, true);
        player._debug = this._debug;
      }
      player.online(watcher._isConnected || watcher.isRobot);
      newOrder.push(player);
      if (watcher.isNextToGo)
        this.whosTurnKey = player.key;
    }
    this.players = newOrder;
  }

  /**
   * Format a score summary.
   * @param {Move} move the move to summarise
   * @param {boolean} hideScore true to elide the score
   * @return {jQuery} the span containing the score
   */
  $formatScore(move, hideScore) {
    // Could be static
    let sum = 0;
    const $span = $('<span class="turn-score"></span>');
    if (!move.words)
      return $span;
    for (let word of move.words) {
      $span
      .append($('<span class="word"></span>')
              .append(word.word));
      if (!hideScore) {
        $span
        .append($(`<span class="word-score"></span>`)
                .append(`(${word.score})`));
      }
      sum += word.score;
    }
    // .score will always be a number after a move
    if (!hideScore && move.words.length > 1 || move.score > sum) {
      $span
      .append($(`<span class="turn-total"></span>`)
              .append($.i18n("txt-play-score", move.score)));
    }
    return $span;
  }

  /**
   * Generate a description of the given turn
   * @param {Turn} turn the turn to describe
   * @param {Player} uiPlayer the player who's UI the description is
   * being generated for
   * @param {boolean} isLastTurn set true if this is the most
   * recent turn
   * @return {jQuery} a jquery div
   */
  describeTurn(turn, uiPlayer, isLastTurn) {
    if (turn.type === Turn.Type.GAME_ENDED)
      return this.describeGameOver(turn, uiPlayer);

    const $description = $(document.createElement("div"))
          .addClass("turn-description");

    // Who's turn was it?
    const $player = $(document.createElement("div")).addClass("turn-player");
    let player = this.getPlayerWithKey(turn.playerKey);
    assert(player, "No player");
    const wasMe = (player === uiPlayer);
    const challenger = (typeof turn.challengerKey === "string")
          ? this.getPlayerWithKey(turn.challengerKey) : undefined;

    let what, who;
    if (turn.type === Turn.Type.CHALLENGE_LOST) {
      what = $.i18n("log-challenge");
      if (challenger === uiPlayer)
        who = $.i18n("Your");
      else
        who = $.i18n("log-player-s", challenger.name);
    } else {
      what = $.i18n("log-turn");
      if (wasMe)
        who = $.i18n("Your");
      else
        who = $.i18n("log-player-s", player.name);
    }
    $player.append(`<span class="player-name">${who}</span> ${what}`);

    $description.append($player);

    // What did they do?
    const $action = $(document.createElement("div")).addClass("turn-detail");
    $description.append($action);

    let playerPossessive;
    let playerIndicative;
    if (wasMe) {
      playerPossessive = $.i18n("your");
      playerIndicative = $.i18n("You");
    } else {
      playerPossessive = $.i18n("log-player-s", player.name);
      playerIndicative = player.name;
    }

    let challengerPossessive;
    let challengerIndicative;
    if (challenger === uiPlayer) {
      challengerPossessive = $.i18n("Your");
      challengerIndicative = $.i18n("You");
    } else if (challenger) {
      challengerPossessive = $.i18n("log-player-s", challenger.name);
      challengerIndicative = challenger.name;
    }

    switch (turn.type) {

    case Turn.Type.PLAYED:
      $action.append(this.$formatScore(turn, false));
      // Check if the play emptied the rack of the playing player
      if (isLastTurn
          && (!turn.replacements || turn.replacements.length === 0)
          && player.rack.isEmpty()
          && !this.hasEnded()) {

        const $narrative = $(document.createElement("div"))
              .addClass("turn-narrative");
        if (wasMe)
          $narrative.append($.i18n(
            "log-no-tiles"));
        else
          $narrative.append($.i18n(
            "log-no-more",
            playerIndicative));
        $description.append($narrative);
      }
      break;

    case Turn.Type.SWAPPED:
      $action.append($.i18n(
        "log-swapped",
        turn.replacements.length));
      break;

    case Turn.Type.TIMED_OUT:
      $action.append($.i18n("log-timed-out"));
      break;

    case Turn.Type.PASSED:
      $action.append($.i18n("log-passed"));
      break;

    case Turn.Type.TOOK_BACK:
      $action.append($.i18n("log-took-back"));
      break;

    case Turn.Type.CHALLENGE_WON:
      $action.append($.i18n(
        "log-challwon",
        challengerIndicative, playerPossessive)
                     + " "
                     + $.i18n(
                       "log-challloss",
                       playerIndicative, turn.score));
      break;

    case Turn.Type.CHALLENGE_LOST:
      $action.append($.i18n(
        "log-chall-fail",
        challengerPossessive, playerPossessive));
      switch (this.challengePenalty) {
      case Game.Penalty.PER_WORD:
      case Game.Penalty.PER_TURN:
        $action.append(" " + $.i18n(
          "log-challloss",
          challengerIndicative, -turn.score));
        break;
      case Game.Penalty.MISS:
        $action.append(
          " " + $.i18n("log-miss-turn", challengerIndicative));
        break;
      }
      break;

      /* c8 ignore start */
    default:
      assert.fail(`Unknown move type ${turn.type}`);
      /* c8 ignore stop */
    }

    return $description;
  }

  /**
   * Append a formatted 'end of game' message to the log
   * @param {Turn} turn a Turn.Type.GAME_ENDED Turn
   * @param {Player} uiPlayer the player who's UI the description is
   * being generated for
   * @return {jQuery} a jquery div
   */
  describeGameOver(turn, uiPlayer) {
    const winningScore = this.winningScore();
    const winners = [];

    const $description = $(document.createElement("div"))
          .addClass("turn-description");

    const $state = $(document.createElement("div")).addClass("game-state");

    switch(turn.endState) {
    case Game.State.TWO_PASSES:
      $state.text($.i18n("log-two-passes")); break;
    case Game.State.TIMED_OUT:
      $state.text($.i18n("log-timed-out")); break;
    case Game.State.FAILED_CHALLENGE:
      $state.text($.i18n("log-challfail")); break;
    case Game.State.GAME_OVER:
    default:
      $state.text($.i18n("log-game-over")); break;
    }

    $description.append($state);

    const $narrative = $(document.createElement("div"))
          .addClass("game-end-adjustments");
    this.getPlayers().forEach((player, index) => {
      const wasMe = player === uiPlayer;
      const name = wasMe ? $.i18n("You") : player.name;

      // Adjustments made to scores due to remaining letters on racks and
      // time penalties. See EndState in Turn.js
      const endState = turn.endStates[index];

      if (player.score === winningScore)
        winners.push(name);

      let rackAdjust;
      if (endState.tiles > 0) {
        rackAdjust = $.i18n(
          "log-fromracks", name, endState.tiles);
      } else if (endState.tiles < 0) {
        // Lost sum of unplayed letters
        rackAdjust = $.i18n(
          "log-rackloss", name, -endState.tiles, endState.tilesRemaining);
      }

      if (rackAdjust)
        $narrative.append(
          $(document.createElement("div"))
          .addClass("rack-adjust").text(rackAdjust));

      const timePenalty = endState.time;
      if (typeof timePenalty === "number" && timePenalty !== 0) {
        const $timeAdjust = $(document.createElement("div"))
              .addClass("time-adjust");
        $timeAdjust.text($.i18n(
          "log-lost-to-clock", name, -timePenalty));
        $narrative.append($timeAdjust);
      }

      player.$refreshScore();
    });

    const $whoWon = $(document.createElement("div")).addClass("game-winner");
    let who;
    let nWinners = 0;
    if (this.isWinner(uiPlayer) && winners.length === 1)
      who = $.i18n("You");
    else {
      who = BrowserGame.andList(winners);
      nWinners = winners.length;
    }
    $whoWon.append($.i18n("log-winner", who, nWinners));

    $description.append($whoWon);
    $description.append($narrative);

    return $description;
  }
}

export { BrowserGame }
