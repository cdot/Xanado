/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

import { stringify } from "../common/Utils.js";
import { Surface } from "./Surface.js";

/**
 * A Rack is a set of tiles that a player can play from. It's
 * a 1D array of Square; a 1-column {@linkcode Surface}
 */
class Rack extends Surface {

  // Note that we do NOT use the field syntax for the fields that
  // are serialised. If we do that, then the constructor blows the
  // field away when loading using CBOR.

  /**
   * @param {object.<string,class>} factory object mapping class name to a class
   * @param {Rack|object} spec specification of the rack, or a rack to copy
   * @param {string|Rack} spec.id unique id for this rack, or a rack to copy.
   * The squares and the tiles they carry will be copied as well.
   * @param {number} spec.size rack size
   * @param {string?} spec.underlay text string with one character for
   * each cell in UI of the rack. This is the SWAP string that
   * underlies the swap rack.
   */
  constructor(factory, spec) {

    // The id will be used as the base for generating the id's
    // for the Squares in the underlying Surface. Note that
    // the UI will have Rack objects for the player rack and
    // the swap rack, but will also have racks that have no UI
    // for the other players. The ID for these racks must be
    // player specific.
    if (spec instanceof Rack) {
      // Copy constructor
      // Only used in game simulation. Underlay not supported.
      super(factory, {
        id: spec.id,
        cols: spec.cols,
        rows: 1,
        type: () => "_"
      });
      spec.forEachTiledSquare(square => {
        this.addTile(new factory.Tile(square.tile));
        return false;
      });
    } else {
      super(factory, {
        id: spec.id,
        cols: spec.size,
        rows: 1,
        type: () => "_"
      });
    }

    /**
     * Whether this rack is wild or not. When a rack is wild, the tiles
     * taken from in the rack can be used as any other tile. This is
     * used client-side, for players other than the current player.
     */
    if (spec.isWild)
      this.isWild = true;

    if (typeof spec.underlay !== "undefined") {
      let idx = 0;
      this.forEachSquare(square => {
        square.setUnderlay(spec.underlay.charAt(idx++));
        return idx === spec.underlay.length;
      });
    }
  }

  /**
   * Add a Tile to the rack
   * @param {Tile} tile the Tile to add, must != null
   * @return {Square?} the square where the tile was placed
   * (undefined if it couldn't be placed)
   */
  addTile(tile) {
    let rackSquare;
    tile.reset(this.isWild);
    this.forEachEmptySquare(square => {
      rackSquare = square;
      square.placeTile(tile);
      return true;
    });
    return rackSquare;
  }

  /**
   * Put tiles back on the rack.
   * @param {Tile[]} tiles list of tiles
   * @return {Square[]} squares the tiles were placed on
   */
  addTiles(tiles) {
    return tiles.map(tile => this.addTile(tile));
  }

  /**
   * Get an unsorted list of the letters currently on the rack.
   * Blanks are represented by a space.
   * @return {string[]}
   */
  letters() {
    return this.tiles().map(tile => tile.letter);
  }

  /**
   * Find the Square that contains a Tile that can represent
   * the given letter.
   * If a letter tile can't be found, a blank will be used if there
   * is one.
   * @param {string} letter the letter to find
   * @return {Square} carrying a matching tile, or undefined
   */
  findSquare(letter) {
    let square;
    this.forEachTiledSquare(sq => {
      if (this.isWild)
        square = sq;
      else if (!square && sq.tile.isBlank || sq.tile.letter === letter)
        square = sq;
    });

    return square;
  }

  /**
   * Find and remove a tile from the rack.
   * @param {Tile?} remove if defined, the tile removed must match
   * this tile. If undefined, any tile can be removed.
   * @return {Tile} the removed tile
   */
  removeTile(remove) {
    const letter = remove.letter;
    const square = this.findSquare(letter);
    if (!square)
      throw Error(`Cannot find '${letter}' on ${this.stringify()}`);
    const tile = square.tile;
    square.unplaceTile();
    if (this.isWild)
      tile.copy(remove);
    else if (tile.isBlank)
      tile.letter = letter;
    return tile;
  }

  /**
   * Take tiles out of the rack
   * @param {Tile[]} tiles list of tiles
   * @param {Rack} rack rack
   * @return {Tile[]} list of tiles removed
   */
  removeTiles(tiles) {
    const racked = [];
    for (const tile of tiles) {
      const removed = this.removeTile(tile);
      if (!removed)
        throw Error(`${stringify(tile)} missing from rack`);
      racked.push(removed);
    }
    return racked;
  }

  /**
   * Shuffle tile positions within the rack
   * @return {Rack} this
   */
  shuffle() {
    const tiles = [];
    let i;
    for (i = 0; i < this.cols; i++) {
      const square = this.at(i);
      if (square.tile)
        tiles.push(square.unplaceTile());
    }
    for (i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = tiles[i];
      tiles[i] = tiles[j];
      tiles[j] = temp;
    }
    this.addTiles(tiles);

    return this;
  }

  /**
   * Get a list of letters on the rack that are not blanks
   * @return {string[]}
   */
  lettersLeft() {
    return this.tiles().filter(tile => !tile.isBlank)
    .map(tile => tile.letter);
  }

  /* c8 ignore start */

  /**
   * Debug
   */
  stringify() {
    return `[${this.tiles().map(t => stringify(t)).join(",")}]`;
  }
  /* c8 ignore stop */

  /**
   * @override
   */
  unpack(data, edition) {
    super.unpack(data, edition);
    // super.unpack locks tiles, so we have to reset to unlock them and
    // clear blanks
    this.forEachTiledSquare(s => {
      delete s.tile.isLocked;
      if (s.tile.isBlank)
        s.letter = " ";
      return false;
    });
    return this;
  }
}

export { Rack }
