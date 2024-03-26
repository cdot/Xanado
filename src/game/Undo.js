/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/* global assert */
import { stringify } from "../common/Utils.js";
import { Game } from "./Game.js";
import { Turn } from "./Turn.js";
const Tile = Game.CLASSES.Tile;

  /**
   * Methods that provide undo/redo functionality for
   * {@linkcode Game}. Requires {@linkcode game/Commands} to be mixed in.
   * @mixin game/Undo
   */
const Undo = superclass => class extends superclass {

  /**
   * Undo a swap. Resets the game state as if it had never happened.
   * @instance
   * @memberof game/Undo
   * @param {Turn} turn the Turn to unplay
   */
  unswap(turn) {
    this.state = Game.State.PLAYING;
    const player = this.getPlayerWithKey(turn.playerKey);
    this.rackToBag(turn.replacements, player);
    this.bagToRack(turn.placements, player);
    player.passes--;
    this.whosTurnKey = player.key;
  }

  /**
   * Undo a play. Resets the game state as if it had never happened.
   * @instance
   * @memberof game/Undo
   * @param {Turn} turn the Turn to unplay
   */
  unplay(turn) {
    this.state = Game.State.PLAYING;
    const player = this.getPlayerWithKey(turn.playerKey);
    if (turn.replacements)
      this.rackToBag(turn.replacements, player);
    if (turn.placements)
      this.boardToRack(turn.placements, player);
    player.score -= turn.score;
    player.passes = turn.prepasses || 0;
    this.whosTurnKey = player.key;
  }

  /**
   * Undo a game over confirmation.
   * Resets the game state as if it had never happened.
   * @instance
   * @memberof game/Undo
   * @param {Turn} turn the Turn to unplay
   */
  unconfirmGameOver(turn) {
    // Compatibility with old code
    if (!turn.endStates && typeof turn.score === "object")
      turn.endStates = turn.score;
    // Re-adjust scores from the player end states
    for (let pi = 0; pi < turn.endStates.length; pi++) {
      const endState = turn.endStates[pi];
      const player = this.players[pi];
      player.score -= (endState.time || 0) + (endState.tiles || 0);
    }
    this.state = Game.State.PLAYING;
    // TODO: Notify
    // TODO: reset the clock
  }

  /**
   * Undo a TOOK_BACK or CHALLENGE_WON.
   * Resets the game state as if it had never happened.
   * @instance
   * @memberof game/Undo
   * @param {Turn} turn the Turn to unplay
   */
  untakeBack(turn) {
    this.state = Game.State.PLAYING;
    const player = this.getPlayerWithKey(turn.playerKey);
    if (turn.placements)
      this.rackToBoard(turn.placements, player);
    if (turn.replacements)
      this.bagToRack(turn.replacements, player);
    player.score -= turn.score;
    this.whosTurnKey = this.nextPlayer(player).key;
    /* c8 ignore next 2 */
    if (this._debug)
      this._debug("\tplayer now", this.whosTurnKey, turn);
  }

  /**
   * Undo a pass. Resets the game stat as if it had never happened.
   * @instance
   * @memberof game/Undo
   * @param {Turn} turn the Turn to unplay
   */
  unpass(turn) {
    this.state = Game.State.PLAYING;
    const player = this.getPlayerWithKey(turn.playerKey);
    player.passes--;
    this.whosTurnKey = player.key;
    // TODO: Notify
  }

  /**
   * Unplay a LOST challenge (won challenges are handled in untakeBack).
   * Resets the game state as if it had never happened.
   * @instance
   * @memberof game/Undo
   * @param {Turn} turn the Turn to unplay
   */
  unchallenge(turn) {
    const player = this.getPlayerWithKey(turn.challengerKey);
    /* c8 ignore next 2 */
    if (this._debug)
      this._debug("\t", stringify(player), "regained", turn.score);
    player.score -= turn.score;
    // TODO: Notify
  }

  /**
   * Undo the most recent turn. Resets the play state as if the turn
   * had never happened. Sends a Game.Notify.UNDONE to all listeners,
   * passing the Turn that was unplayed.
   * @instance
   * @memberof game/Undo
   * @param {Turn} turn the turn to undo
   * @param {boolean?} quiet if true, don't perform any saves
   * or notifications.
   * the board and rack. If false, saves the game.
   * @return {Promise} promise resolving to undefined
   */
  undo(turn, quiet) {
    assert(this.allowUndo, "Cannot Undo");
    /* c8 ignore next 2 */
    if (this._debug)
      this._debug("un-", turn.type);
    switch (turn.type) {
    case Turn.Type.SWAPPED:
      this.unswap(turn, quiet);
      break;
    case Turn.Type.PASSED:
    case Turn.Type.TIMED_OUT:
      this.unpass(turn, quiet);
      break;
    case Turn.Type.PLAYED:
      this.unplay(turn, quiet);
      break;
    case Turn.Type.TOOK_BACK:
    case Turn.Type.CHALLENGE_WON:
      this.untakeBack(turn, quiet);
      break;
    case Turn.Type.GAME_ENDED:
      this.unconfirmGameOver(turn, quiet);
      break;
    case Turn.Type.CHALLENGE_LOST:
      this.unchallenge(turn, quiet);
      break;
    default:
      assert.fail(`Unknown turn type '${turn.type}'`);
    }

    if (quiet)
      return Promise.resolve();

    return this.save()
    .then(() => this.notifyAll(Game.Notify.UNDONE, turn));
  }

  /**
   * Replay the given turn back into the game
   * @instance
   * @memberof game/Undo
   * param {Turn} trun turn to redo
   * @return {Promise} promise resolving to undefined
   */
  redo(turn) {
    const player = this.getPlayerWithKey(turn.playerKey);
    /* c8 ignore next 2 */
    if (this._debug)
      this._debug("REDO", turn.type, turn);
    switch (turn.type) {
    case Turn.Type.SWAPPED:
      // Remove and return the expected tiles to the the unshaken bag
      // to ensure replay order. We have to do this so the next play on the
      // undo stack is also redoable.
      this.letterBag.predictable = true;
      this.letterBag.removeTiles(turn.replacements);
      this.letterBag.returnTiles(turn.replacements.map(t => new Tile(t)));
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("\t-- swap");
      return this.swap(player, turn.placements)
      .then(() => delete this.letterBag.predictable);
    case Turn.Type.PLAYED:
      this.letterBag.predictable = true;
      // Remove and return
      this.letterBag.removeTiles(turn.replacements);
      this.letterBag.returnTiles(turn.replacements.map(t => new Tile(t)));
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("\t-- play");
      return this.play(player, turn)
      .then(() => delete this.letterBag.predictable);
    case Turn.Type.PASSED:
    case Turn.Type.TIMED_OUT:
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("\t-- pass");
      return this.pass(player, turn.type);
    case Turn.Type.TOOK_BACK:
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("\t-- takeBack");
      return this.takeBack(player, turn.type);
    case Turn.Type.CHALLENGE_WON:
    case Turn.Type.CHALLENGE_LOST:
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("\t-- challenge");
      return this.challenge(
        this.getPlayerWithKey(turn.challengerKey), player);
    case Turn.Type.GAME_ENDED:
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("\t-- confirmGameOver");
      return this.confirmGameOver(player, turn.endState);
    }
    /* c8 ignore next */
    throw Error("Unrecognised turn type");
  }
};

export { Undo }
