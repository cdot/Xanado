/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/**
 * A tile in a LetterBag, on a Board, or on a Rack, or during best move
 * computation.
 */
class Tile {

  // Note that we do NOT use the field syntax for the fields that
  // are serialised. If we do that, then the constructor blows the
  // field away when loading using CBOR.

  /**
   * @param {Tile|object} spec optional Tile to copy or spec of tile
   */
  constructor(spec = {}) {

    /**
     * Character(s) represented by this tile.
     * Caution; during gameplay, `letter` for a blank will be set
     * to a letter chosen by the player. When the tile is returned
     * to the rack, the letter will be reset to " " as isBlank is true.
     * However the letter will stick to the Tile when it is sent to
     * the server as part of a move. Henceforward that Tile will
     * be locked to the chosen letter on the server side.
     * @member {string}
     */
    this.letter = spec.letter;

    /**
     * Value of this tile. This is easily retrievable using
     * {@link Edition#letterScore} but we duplicate it here
     * so it's available in contexts where the Edition hasn't
     * beed loaded.
     * @member {number}
     */
    this.score = spec.score || 0;

    if (typeof spec.col !== "undefined")
      /**
       * Column where the tile is placed
       * @member {number?}
       */
      this.col = spec.col;

    if (typeof spec.row !== "undefined")
      /**
       * Row where the tile is placed
       * @member {number?}
       */
      this.row = spec.row;

    if (spec.isBlank)
      /**
       * True if this tile is a blank (irrespective of letter)
       * @member {boolean?}
       */
      this.isBlank = true;

    if (spec.isLocked)
      /**
       * True if the tile is locked to a surface and cannot be moved.
       * @member {boolean?}
       */
      this.isLocked = true;
  }

  /**
   * Fix a tile to look like the given tile.
   * @param {Tile} tile the tile to copy
   * @return {Tile} this
   */
  copy(tile) {
    this.reset();
    if (tile.isBlank)
      this.isBlank = true;
    else
      delete this.isBlank;
    this.letter = tile.letter;
    this.score = tile.score;
    if (typeof tile.col !== "undefined")
      this.col = tile.col;
    if (typeof tile.row !== "undefined")
      this.row = tile.row;
    return this;
  }

  /**
   * Remove letter cast and positional information from the tile e.g. before
   * returning it to the bag or rack.
   * @param {boolean?} wild true if this tile needs to be masked. Wild tiles
   * are used on the client side to mask the contents of the letter bag and
   * other players racks.
   * @return {Tile} this
   */
  reset(wild) {
    delete this.isLocked;
    delete this.row;
    delete this.col;
    if (wild) {
      this.letter = '#';
      this.score = 0;
    }
    else if (this.isBlank)
      this.letter = " ";

    return this;
  }

  /**
   * Encode the tile in a URI parameter block
   * @return {string} parameter block for embedding in a URL to recreate
   * the tile.
   */
  pack() {
    let params = "";
    if (this.isBlank) {
      if (this.isLocked)
        params += "B";
      else
        params = "b";
    } else if (this.isLocked)
      params = "l";

    if (typeof this.col !== "undefined") {
      params += this.col;
      if (typeof this.row !== "undefined")
        params += `-${this.row}`;
    }
    return params + `!${this.letter}`;
  }

  /**
   * Unpack a tile encoded in a URI parameter block.
   * @param {string} packed packed tile
   * @param {Edition} edition edition, used to get letter scores for
   * tiles.
   * @return {Tile} this
   */
  unpack(packed, edition) {
    switch (packed[0]) {
    case "B":
      this.isBlank = true;
      // fall-through deliberate
    case "l":
      this.isLocked = true;
      break;
    case "b":
      this.isBlank = true;
    }
    const match = /^[Bbl]?(?:(\d+)(?:-(\d+))?)?!(.*)$/.exec(packed);
    if (typeof match[1] !== "undefined") {
      this.col = parseInt(match[1]);
      if (typeof match[2] !== "undefined")
        this.row = parseInt(match[2]);
    }
    this.letter = match[3];
    this.score = edition.letterScore(this.isBlank ? " " : this.letter);
    return this;
  }

  /* c8 ignore start */

  /**
   * String representation for debugging
   */
  stringify() {
    const letter = this.isBlank ? this.letter.toLowerCase() : this.letter;
    const brackets = this.isLocked ? "<>" : "[]";
    const pos = (typeof this.col === "number" ? `@${this.col}` : "")
          + (typeof this.row === "number" ? `,${this.row}` : "");
    return `${brackets.charAt(0)}${letter}${pos}${brackets.charAt(1)}`;
  }
  /* c8 ignore stop */
}

/**
 * Compare tiles by letter, for sorting. The letter assigned
 * to a blank is ignored.
 * @param {Tile} a first tile
 * @param {Tile} b second tile
 * @return {number} value suitable for use in Array.sort()
 */
Tile.cmp = (a, b) => {
  if (a.isBlank && b.isBlank) return 0;
  if (a.isBlank) return -1;
  if (b.isBlank) return 1;
  if (a.letter < b.letter) return -1;
  if (a.letter > b.letter) return 1;
  return 0;
};

export { Tile };
