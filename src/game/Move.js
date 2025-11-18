/*Copyright (C) 2019-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

import { Tile } from "./Tile.js";

/**
 * A collection of tile placements, and the delta score
 * achieved for the move. We also record the words created by the
 * move. It is used to send a human player's play to the server,
 * which then sends a matching {@linkcode Turn} to every player.
 */
class Move {

  /**
   * @param {(Move|object)?} params Move to copy, or params, or undefined
   * Any member can be initialised by a corresponding field in
   * params.
   */
  constructor(params = { score: 0 }) {

    if (params.words)
      /**
       * List of words created by the play:
       * ```
       * { word: string, score: number }
       * @member {object[]?}
       */
      this.words = params.words;

    // Compatibility: pre-3.2.0 score could be an object, which is
    // handled in Turn
    if (typeof params.score === "number")
      /**
       * Change in score as a result of this move.
       * @member {number}
       */
      this.score = params.score;

    if (params.placements)
      /**
       * List of tiles placed in this move. Tiles are required
       * to carry col, row positions where they were placed.  In
       * a Turn, for type=`move` it indicates the move. For
       * `Turn.Type.TOOK_BACK` and `Turn.Type.CHALLENGE_WON` it is
       * the move just taken back/challenged.
       * @member {Tile[]?}
       */
      this.placements = params.placements.map(
        // Note that we instantiate game/Tile, without taking account
        // of the context of the call; Move is used for storage and
        // comms between front and back ends, and the tiles therein
        // don't need browser-customised functionality.
        tilespec => new Tile(tilespec));
  }

  /**
   * Add a Tile placement to the move
   * @param {Tile} tile the Tile to add
   */
  addPlacement(tile) {
    if (this.placements)
      this.placements.push(tile);
    else
      this.placements = [tile];
  }

  /**
   * String representation for debugging
   */
  stringify() {
    const pl = this.placements ?
          this.placements.map(t => t.stringify(true))
          : "<no placements>";
    const w = this.words ?
          this.words.map(w => `${w.word}(${w.score})`)
          : "<no words>";
    return `Move ${pl} words ${w} for ${this.score}`;
  }

  /**
   * Pack parameters into a minimal size block.
   * Keys:
   * * `wN` - words, each packed into score_word
   * * `PN` - placements
   * * `s` - score
   * @return {object} parameter block unpackable using `unpack`
   */
  pack() {
    const packed = {};
    if (this.words) {
      for (let wi = 0; wi < this.words.length; wi++)
        packed[`w${wi}`] = `${this.words[wi].score}_${this.words[wi].word}`;
    }
    if (this.placements) {
      for (let pi = 0; pi < this.placements.length; pi++)
        packed[`P${pi}`] = this.placements[pi].pack();
    }
    if (typeof this.score === "number")
      packed.s = this.score;
    return packed;
  }

  /**
   * Repopulate the move from a URI parameter block.
   * @param {Object} packed parameter block
   * @param {Edition} edition edition, used to get letter scores for
   * tiles.
   * @return {Move} this
   */
  unpack(packed, edition) {
    for (let wn = 0; packed[`w${wn}`]; wn++) {
      if (!this.words) this.words = [];
      const match = /^(\d+)_(.*)$/.exec(packed[`w${wn}`]);
      this.words.push({ score: Number(match[1]), word: match[2] });
    }
    for (let pn = 0; packed[`P${pn}`]; pn++) {
      if (!this.placements) this.placements = [];
      this.placements.push(new Tile().unpack(packed[`P${pn}`], edition));
    }
    if (typeof packed.s !== "undefined")
      this.score = Number(packed.s);
    return this;
  }
}

export { Move }
