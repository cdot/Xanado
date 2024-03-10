/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

import { Tile } from "./Tile.js";
import { Move } from "./Move.js";
import { Game } from "./Game.js";

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
   * Encode the state in a URI parameter block
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
      packed.r = this.tilesRemaining;
    return packed;
  }

  /**
   * Unpack a parameter block.
   * @param {Object} params parameter block
   * @param {string} ti relative base to lookup parameters in the params block
   */
  unpack(params, ti) {
    this.tiles = Number(params[`${ti}t`]);
    if (typeof params[`${ti}T`] !== "undefined")
      this.time = Number(params[`${ti}T`]);
    if (typeof params[`${ti}r`] !== "undefined")
      this.tilesRemaining = params[`${ti}r`];
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
       * End state information for each player, indexed on player key.
       * @member {Object.<string,EndState>[]}
       */
      this.endStates = params.endStates;

    else if (typeof params.score === "object") {
      // Compatibility, end states used to be overloaded into score
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

    if (typeof params.score === "number")
      /**
       * The score from the turn.
       * @member {number?}
       */
      this.score = params.score;
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
   * @return {object} parameter block unpackable using `unpack`
   */
  pack() {
    const params = {};
    if (this.challengerKey) params.c = this.challengerKey;
    if (this.endState >= 0) {
      params.e = this.endState;
      let esi = 0;
      for (const pk in this.endStates) {
        let endState = this.endStates[pk];
        if (!(endState instanceof EndState))
          this.endStates[pk] = endState = new EndState(endState);
        params[`e${esi}k`] = endState.key; // map key to index
        const p = endState.pack();
        for (const k in p)
          params[`e${esi}${k}`] = p[k];
        esi++;
      }
    }
    params.m = this.timestamp;
    if (typeof this.nextToGoKey !== "undefined")
      params.n = this.nextToGoKey;
    params.p = this.playerKey;
    if (this.replacements)
      params.r = this.replacements.map(t => t.letter).join("");
    if (typeof this.score === "number")
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
    const ti = `T${index}`;

    if (typeof params[`${ti}c`] !== "undefined")
      this.challengerKey = params[`${ti}c`];
    if (typeof params[`${ti}e`] !== "undefined") {
      this.endState = Number(params[`${ti}e`]);
      // endState object for each player
      this.endStates = [];
      let esi = 0;
      while (params[`${ti}e${esi}k`]) {
        const es = new EndState({ key: params[`${ti}e${esi}k`] });
        es.unpack(params, `${ti}e${esi}`);
        this.endStates.push(es);
        esi++;
      };
    }
    this.timestamp = Number(params[`${ti}m`]);
    if (typeof params[`${ti}n`] !== "undefined")
      this.nextToGoKey = params[`${ti}n`];
    this.playerKey = params[`${ti}p`];
    if (typeof params[`${ti}r`] !== "undefined") {
      const ls = params[`${ti}r`].split("");
      this.replacements = ls.map(l => new Tile({
        letter: l,
        score: edition.letterScore(l)
      }));
    }
    if (typeof params[`${ti}s`] !== "undefined")
      // Numeric score
      this.score = Number(params[`${ti}s`]);
    this.type = Turn.TypeNames[params[`${ti}t`]];
    if (typeof params[`${ti}x`] !== "undefined")
      this.passes = params[`${ti}x`];
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
