/*Copyright (C) 2019-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

import { toEnum } from "../common/Utils.js";
import { Tile } from "./Tile.js";
import { Move } from "./Move.js";

/**
 * Object giving the the end state for each player in the game.
 * This is used to send information that will be used in the reporting
 * of the end of a game. An array of EndState objects is overloaded onto
 * the `score` field of a Turn object.
 */
class EndState {

  constructor(info = {}) {

    /**
     * Key of the player who's end state this is.
     * @member {Key}
     */
    this.key = info.key;

    /**
     * The points total for tiles, positive if this is the end state for
     * the winning player and they are gaining from other player's
     * racks, or negative if they are a losing player having unplayed
     * tiles.
     */
    this.tiles = info.tiles || 0;

    if (typeof info.time !== "undefined")
      /**
       * The points penalty for any time violation.
       * @member {number?}
       */
      this.time = info.time;

    if (typeof info.tilesRemaining !== "undefined")
      /**
       * Comma-separated list of symbols on tiles remaining on the
       * player's rack.
       * @member {string?}
       */
      this.tilesRemaining = info.tilesRemaining;
  }

  /**
   * Encode the end state in a URI parameter block.
   * Keys:
   * * t - points total for tiles (may be -ve)
   * * T - time
   * * r - tiles remaining, "," replaced with "_"
   * @return {object} parameter block for embedding in a URL to recreate
   * the end state.
   */
  pack() {
    const packed = {
      t: this.tiles
    };
    if (typeof this.time !== "undefined")
      packed.T = this.time;
    if (typeof this.tilesRemaining !== "undefined")
      packed.r = this.tilesRemaining.replace(/,/g, "_");
    return packed;
  }

  /**
   * Unpack a parameter block.
   * @param {object} packed packed parameter block
   * @return {Turn} this
   */
  unpack(packed) {
    this.tiles = Number(packed.t);
    if (typeof packed.T !== "undefined")
      this.time = Number(packed.T);
    if (typeof packed.r !== "undefined")
      this.tilesRemaining = packed.r.replace(/_/g, ",");
    return this;
  }

  /**
   * String representation for debugging
   * @return { string} string representation of end state
   */
  stringify() {
    const s = [ `t${this.tiles}` ];
    if (this.time)
      s.push(`T${this.time}`);
    if (this.tilesRemaining)
      s.push(`"${this.tilesRemaining}"`);
    return s.join(",");
  }
}

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
    PLAYED:         0,
    SWAPPED:        1,
    GAME_ENDED:     2,
    CHALLENGE_LOST: 3,
    CHALLENGE_WON:  4,
    TOOK_BACK:      5,
    PASSED:         6,
    TIMED_OUT:      7
  };

  /**
   * Map from Turn.Type enum values to translation keys
   */
  static TypeNames = [
    /*i18n*/"go-played",
    /*i18n*/"go-swapped",
    /*i18n*/"go-ended",
    /*i18n*/"go-lost",
    /*i18n*/"go-won",
    /*i18n*/"go-back",
    /*i18n*/"go-pass",
    /*i18n*/"go-timeout"
  ];

  // Compatibility; map old strings to new enum
  static TypeCompat = {
    "play": Turn.Type.PLAYED,
    "swap": Turn.Type.SWAPPED,
    "game-over": Turn.Type.GAME_ENDED,
    "challenge-lost": Turn.Type.CHALLENGE_LOST,
    "challenge-won": Turn.Type.CHALLENGE_WON,
    "took-back": Turn.Type.TOOK_BACK,
    "passed": Turn.Type.PASSED,
    "timed-out": Turn.Type.TIMED_OUT
  };

  /**
   * @param {Game} game the game this is a turn in.
   * @param {object?} params parameters. Any field with the same name
   * as a member (or a member of {@linkcode Move}) will initialise
   * that member.
   */
  constructor(params = {}) {
    // placements, score, words handled by Move
    super(params);

    /**
     * The 'type' of the turn.
     * @member {Turn.Type}
     */
    this.type = toEnum(params.type, Turn.TypeCompat);

    /**
     * Key of the player who has been affected by the turn. Normally
     * this is the player who made the Move that resulted in the Turn,
     * but in the case of a challenge it is the player who was
     * challenged.
     * @member {Key}
     */
    this.playerKey = params.playerKey;

    /**
     * Key of the next player who's turn it is
     * @member {Key}
     */
    this.nextToGoKey = params.nextToGoKey;

    /**
     * Time the turn was finished.
     * @member {number}
     */
    this.timestamp = params.timestamp || Date.now();

    if (params.replacements)
      /**
       * List of tiles drawn from the bag to replace the tiles played
       * in this turn. These tiles will not have positions.
       * @member {Tile[]?}
       */
      this.replacements = params.replacements.map(
        // See comment about use of game.Tile in Move constructor#placements.
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

    if (params.endState) {
      /**
       * String describing the reason the game ended. Only used when
       * type==Turn.Type.GAME_ENDED
       * @member {State?}
       */
      this.endState = params.endState;
    }

    if (typeof params.endStates === "object")
      /**
       * End state information for each player, in player order.
       * @member {Object.<string,EndState>[]?}
       */
      this.endStates = params.endStates;

    // Compatibility, end states used to be overloaded into score
    // (not since 3.2.0)
    else if (typeof params.score === "object") {
      this.endStates = [];
      for (const es of params.score)
        this.endStates.push(new EndState(es));
      delete params.score;
    }   

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
  sendable() {
    return {
      // Fields that are not used by the `games` interface are not
      // sent
      type: this.type,
      timestamp: this.timestamp
    };
  }

  /**
   * Pack parameters into a minimal size block.
   * Keys:
   * * Inherits `wN`, `PN`, `s` from Move.
   * * `c` - challengerKey
   * * `eN` - end states
   * * `m` - timestamp
   * * `n` - nextToGo
   * * `p` - playerKey
   * * `rN` - replacements
   * * `t` - type
   * * `x` - passes
   * @return {object} parameter block unpackable using `unpack`
   */
  pack() {
    const packed = super.pack();
    if (this.challengerKey) packed.c = this.challengerKey;
    if (this.endState >= 0) {
      packed.e = this.endState;
      for (let esi = 0; esi < this.endStates.length; esi++) {
        let endState = this.endStates[esi];
        // Convert objects to EndStates painlessly
        if (!(endState instanceof EndState))
          this.endStates[esi] = endState = new EndState(endState);
        packed[`e${esi}`] = endState.pack();
      }
    }
    packed.m = this.timestamp;
    if (typeof this.nextToGoKey !== "undefined")
      packed.n = this.nextToGoKey;
    packed.p = this.playerKey;
    if (this.replacements) {
      for (let pi = 0; pi < this.replacements.length; pi++)
        packed[`r${pi}`] = this.replacements[pi].pack();
    }
    packed.t = this.type;
    if (this.passes && this.passes > 0) packed.x = this.passes;
    return packed;
  }

  /**
   * Repopulate the turn from a URI parameter block.
   * @param {Object} packed parameter block
   * @param {Edition} edition edition, used to get letter scores for
   * tiles.
   * @return {Turn} this
   */
  unpack(packed, edition) {
    super.unpack(packed, edition);

    if (typeof packed.c !== "undefined")
      this.challengerKey = packed.c;
    if (typeof packed.e !== "undefined") {
      this.endState = Number(packed.e);
      // endState object for each player
      this.endStates = [];
      for (let esi = 0; packed[`e${esi}`]; esi++)
        this.endStates.push(new EndState().unpack(packed[`e${esi}`]));
    }
    this.timestamp = Number(packed.m);
    if (typeof packed.n !== "undefined")
      this.nextToGoKey = packed.n;
    this.playerKey = packed.p;
    for (let ri = 0; packed[`r${ri}`]; ri++) {
      if (!this.replacements) this.replacements = [];
      this.replacements.push(new Tile().unpack(packed[`r${ri}`], edition));
    }
    this.type = Number(packed.t);
    if (typeof packed.x !== "undefined")
      this.passes = packed.x;

    return this;
  }

  /**
   * Construct a player object from a structure generated by
   * sendable()
   * @param {object} simple object generated by sendable()
   * @param {object} factory Game class to be used as factory
   */
  static fromSendable(simple, factory) {
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

    s += ` (${this.score})`;

    if (this.placements)
      s += " place" + this.placements.map(t => t.stringify(true));

    if (this.words)
      s += ' "' + this.words.map(w => w.word) + '"';

    if (this.replacements)
      s += " replace" + this.replacements.map(t => t.stringify(true));

    if (this.penalty === "Miss next turn"/*Game.Penalty.MISS*/)
      s += ` MISS`;

    if (this.endState) {
      s += ` ${this.endState}`;
      for (const pk in this.endStates)
        s += ` ${pk}:${this.endStates[pk].stringify()})`;
    }

    return s;
  }

  /* c8 ignore stop */
}

export { Turn, EndState }
