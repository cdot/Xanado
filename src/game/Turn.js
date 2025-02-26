/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

import { Tile } from "./Tile.js";
import { Move } from "./Move.js";
import { Game } from "./Game.js";

/**
 * Despite the name, a Turn is used not just as a historical record
 * of a player's turn (such as a play or a swap) but also for other
 * results from commands sent to the server, such as challenges.
 * @extends Move
 */
class Turn extends Move {

  /**
   * Different types of {@linkcode Turn}
   * * PLAYED - some tiles were placed on the board
   * * SWAPPED - player swapped for fresh tiles from the bag
   * * GAME_ENDED - game is over
   * * CHALLENGE_LOST - player challenged, and lost
   * * CHALLENGE_WON - player challenged, and won
   * * TOOK_BACK - player took back their play
   * * PASSED - player passed
   * * TIMED_OUT - player was timed out (if timer type is `TURN`)
   * @typedef {PLAYED|SWAPPED|GAME_ENDED|CHALLENGE_LOST|CHALLENGE_WON|TOOK_BACK|PASSED|TIMED_OUT} Turn.Type
   */
  static Type = {
    PLAYED:         "play",
    SWAPPED:        "swap",
    GAME_ENDED:     "game-over",
    CHALLENGE_LOST: "challenge-lost",
    CHALLENGE_WON:  "challenge-won",
    TOOK_BACK:      "took-back",
    PASSED:         "passed",
    TIMED_OUT:      "timed-out"
  };

  static TypeNames = [
    Turn.Type.PLAYED,
    Turn.Type.SWAPPED,
    Turn.Type.GAME_ENDED,
    Turn.Type.CHALLENGE_LOST,
    Turn.Type.CHALLENGE_WON,
    Turn.Type.TOOK_BACK,
    Turn.Type.PASSED,
    Turn.Type.TIMED_OUT
  ];

  /**
   * The 'type' of the turn.
   * @member {Turns}
   */
  type;

  /**
   * Key of the player who has been affected by the turn. Normally
   * this is the player who made the Move that resulted in the Turn,
   * but in the case of a challenge it is the player who was
   * challenged.
   * @member {Key}
   */
  playerKey;

  /**
   * Key of the next player who's turn it is
   * @member {Key}
   */
  nextToGoKey;

  /**
   * Time the turn was finished, assigned by the server.
   * @member {number}
   */
  timestamp;

  /**
   * @param {Game} game the game this is a turn in.
   * @param {object?} params parameters. Any field with the same name
   * as a member (or a member of {@linkcode Move}) will initialise
   * that member.
   */
  constructor(params = {}) {
    super(params);

    this.type = params.type;
    this.playerKey = params.playerKey;
    this.nextToGoKey = params.nextToGoKey;
    this.timestamp = params.timestamp || Date.now();

    if (params.replacements)
      /**
       * List of tiles drawn from the bag to replace the tiles played
       * in this turn. These tiles will not have positions.
       * @member {Tile[]?}
       */
      this.replacements = params.replacements.map(
        tilespec => new Tile(tilespec));

    if (params.challengerKey)
      /**
       * For `Turn.Type.CHALLENGE_WON` and `Turn.Type.CHALLENGE_LOST`,
       * the key of the player who challenged. playerkey in this case
       * will be the player who's play was challenged (always the
       * previous player)
       * @member {Key?}
       */
      this.challengerKey = params.challengerKey;

    if (params.endState)
      /**
       * String describing the reason the game ended. Only used when
       * type==Turn.Type.GAME_ENDED
       * @member {State?}
       */
      this.endState = params.endState;

    if (params.passes && params.passes > 0)
      /**
       * Number of passes the player had before this play. Required
       * for undo.
       * @member {number?}
       */
      this.passes = params.passes;
  }

  /**
   * Create simple flat structure describing a subset of the turn
   * state. This is used for sending minimal turn information to
   * the user interface using JSON.
   */
  jsonable() {
    return {
      // Fields that are not used by the `games` interface are not
      // sent
      type: this.type,
      timestamp: this.timestamp
    };
  }

  /**
   * Encode the turn in a URI parameter block
   * @return {string} parameter string for embedding in a URL to recreate
   * the turn.
   */
  pack() {
    const params = {};
    if (this.challengerKey) params.c = this.challengerKey;
    if (this.endState) params.e = this.endState;
    params.m = this.timestamp;
    params.n = this.nextToGoKey;
    params.p = this.playerKey;
    if (this.replacements)
      params.r = this.replacements.map(t => t.letter).join("");
    if (this.score)
      params.s = this.score;
    params.t = Turn.TypeNames.indexOf(this.type);
    if (this.passes && this.passes > 0) params.x = this.passes;
    return params;
  }

  /**
   * Repopulate the turn from a parameter block.
   * @param {Object} params parameter block
   * @param {number} index index of this player in the parameter block
   * @param {Edition} edition edition, used to get letter scores for
   * tiles.
   */
  unpack(params, index, edition) {
    if (params[`T${index}c`])
      this.challengerKey = params[`T${index}c`];
    if (params[`T${index}e`])
      this.endState = params[`T${index}e`];
    this.timestamp = Number(params[`T${index}m`]);
    if (params[`T${index}n`])
      this.nextToGoKey = params[`T${index}n`];
    this.playerKey = params[`T${index}p`];
    if (params[`T${index}r`]) {
      const ls = params[`T${index}r`].split("");
      this.replacements = ls.map(l => new Tile({
        letter: l,
        score: edition.letterScore(l)
      }));
    }
    if (params[`T${index}s`])
      this.score = Number(params[`T${index}s`]);
    this.type = Turn.TypeNames[params[`T${index}t`]];
    if (params[`T${index}x`])
      this.passes = params[`T${index}x`];
  }

  /**
   * Construct a player object from a structure generated by
   * jsonable()
   * @param {object} simple object generated by jsonable()
   * @param {object} factory Game class to be used as factory
   */
  static fromJsonable(simple, factory) {
    return new factory.Turn(simple);
  }

  /* c8 ignore start */

  /**
   * String representation for debugging
   */
  stringify() {
    let s = `Turn ${this.type} ${this.playerKey}`;
    if (this.challengerKey)
      s += ` by ${this.challengerKey}`;
    if (this.nextToGoKey && this.nextToGoKey !== this.playerKey)
      s += ` ->${this.nextToGoKey}`;

    if (typeof this.score === "object")
      s += ` (${this.score.tiles||0},${this.score.time||0})`;
    else if (typeof this.score === "number")
      s += ` (${this.score})`;

    if (this.placements)
      s += " place" + this.placements.map(t => t.stringify(true));

    if (this.words)
      s += ' "' + this.words.map(w => w.word) + '"';

    if (this.replacements)
      s += " replace" + this.replacements.map(t => t.stringify(true));

    if (this.penalty === "Miss next turn"/*Game.Penalty.MISS*/)
      s += ` MISS`;

    if (this.endState)
      s += ` ${this.endState}`;

    return s;
  }

  /* c8 ignore stop */
}

export { Turn }
