/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/* global assert */

import { Surface } from "./Surface.js";

/**
 * The square game board.
 */
class Board extends Surface {

  /**
   * Row of middle square on board.
   * @member {number}
   */
  midrow = -1;

  /**
   * Column of middle square on board.
   * @member {number}
   */
  midcol = -1;

  /**
   * @param {object} factory class object mapping class name to a class
   * @param {Edition|Board} spec an Edition defining the board layout,
   * or a Board to copy. The tiles on the old board will NOT be copied.
   */
  constructor(factory, spec) {
    const info = {
      id: "Board",
      rows: spec.rows,
      cols: spec.cols
    };
    if (spec instanceof Board)
      info.type = (col, row) => spec.at(col, row).type;
    else // if (spec instanceof Edition)
      info.type = (col, row) => spec.squareType(col, row);

    super(factory, info);

    this.midrow = Math.floor(this.rows / 2);
    this.midcol = Math.floor(this.cols / 2);
  }

  /**
   * Determine if any any unlocked tiles are placed on the board.
   * @return {boolean} true if there are placed but unlocked tiles
   */
  hasUnlockedTiles() {
    return this.forEachTiledSquare(sq => (!sq.tile.isLocked));
  }

  /**
   * Populate the board from a string output by
   * {@linkcode Board#toString|toString}. This is for use in tests.
   * @param {object} factory object giving Game classes to instantiate
   * @param {Edition} edition the edition defining the board layout.
   * This has to be provided because we don't cache the actual
   * Edition in the Board.
   * @param {string} tiles string representation of the board
   * @private
   */
  parse(factory, edition, tiles) {
    const rows = tiles.split("\n");
    assert(rows.length >= this.rows, "Too many rows");
    for (let row = 0; row < this.rows; row++) {
      const r = rows[row].split("|");
      assert(r.length === this.cols + 2,
             `${r.length} === ${this.cols} + 2`);
      for (let col = 0; col < this.cols; col++) {
        const letter = r[col + 1];
        if (letter != " ") {
          // Treat lower-case letters as cast blanks.
          // May not work in non-latin languages.
          const isBlank = (letter.toUpperCase() != letter);
          const tile = new factory.Tile({
            letter: letter.toUpperCase(),
            isBlank: isBlank,
            score: edition.letterScore(isBlank ? " " : letter)
          });
          this.at(col, row).placeTile(tile, true);
        }
      }
    }
  }

  /**
   * True if one of the neighbours of [col, row] is already occupied by
   * a tile that was placed in a previous move
   * @param {number} col 0-based row
   * @param {number} row 0-based row
   */
  touchingOld(col, row) {
    return (
      (col > 0 && this.at(col - 1, row).tile
       && this.at(col - 1, row).hasLockedTile())
      || (col < this.cols - 1 && this.at(col + 1, row).tile
          && this.at(col + 1, row).hasLockedTile())
      || (row > 0 && this.at(col, row - 1).tile
          && this.at(col, row - 1).hasLockedTile())
      || (row < this.rows - 1 && this.at(col, row + 1).tile
          && this.at(col, row + 1).hasLockedTile()));
  }

  /* c8 ignore start */

  /**
   * Generate a string representation of the board in the format
   * readable by {@linkcode Board#parse|parse}
   * @override
   */
  stringify() {
    let s = "";

    for (let row = 0; row < this.rows; row++) {
      const r = [];
      for (let col = 0; col < this.cols; col++) {
        const square = this.at(col, row);
        const t = square.tile;
        if (t) {
          // Show cast blanks using lower case letters
          // May not work in non-Latin languages.
          if (t.isBlank)
            r.push(t.letter.toLowerCase());
          else
            r.push(t.letter);
        } else {
          if ((square.letterScoreMultiplier || 0) > 1)
            r.push(square.letterScoreMultiplier);
          else if ((square.wordScoreMultiplier || 0) > 1)
            r.push(4 + square.wordScoreMultiplier);
          else
            r.push(" ");
        }
      }
      s += `|${r.join("|")}|\n`;
    }
    return s;
  }

  /* c8 ignore stop */

  /**
   * Given a play at col, row, compute it's score. Used in
   * findBestPlay, and must perform as well as possible. Read
   * the description of {@linkcode Board#analysePlay|analysePlay}
   * to understand the difference between these two related functions.
   * Note: does *not* include any bonuses due to number of tiles played.
   * @param {number} col the col of the LAST letter
   * @param {number} row the row of the LAST letter
   * @param {number} dcol 1 if the word being played across
   * @param {number} drow 1 if the word is being played down
   * @param {Tile[]} tiles a list of tiles that are being placed
   * @param {string[]?} words optional list to be populated with
   * words that have been created by the play
   * @return {number} the score of the play.
   */
  scorePlay(col, row, dcol, drow, tiles, words) {
    //console.debug(`scorePlay(${col},${row},${dcol},${drow},`,
    //            tiles.map(t => t.stringify()).join(";"));
    // Accumulator for the primary word being formed by the tiles
    let wordScore = 0;

    // Accumulator for crossing words scores.
    let crossWordsScore = 0;

    // Multipler for the main word
    let wordMultiplier = 1;

    // One behind first tile offset
    let c = col - dcol * tiles.length;
    let r = row - drow * tiles.length;

    for (let i = 0; i < tiles.length; i++) {
      c += dcol;
      r += drow;
      const tile = tiles[i];
      let letterScore = tile.score;
      const square = this.at(c, r);
      if (square.hasLockedTile()) {
        wordScore += letterScore;
        continue; // pre-existing tile, no bonuses
      }

      // Letter is being placed, so letter multiplier applies to all
      // new words created, including cross words
      letterScore *= (square.letterScoreMultiplier || 1);

      wordScore += letterScore;

      // Multiplier for any new words that cross this letter
      const crossWordMultiplier = (square.wordScoreMultiplier || 1);
      wordMultiplier *= crossWordMultiplier;

      // This is a new tile, need to analyse cross words and
      // apply bonuses
      let crossWord = "";
      let crossWordScore = 0;

      // Look left/up
      for (let cp = c - drow, rp = r - dcol;
           cp >= 0 && rp >= 0 && this.at(cp, rp).tile;
           cp -= drow, rp -= dcol) {
        const tile = this.at(cp, rp).tile;
        crossWord = tile.letter + crossWord;
        crossWordScore += tile.score;
      }

      crossWord += tile.letter;

      // Look right/down
      for (let cp = c + drow, rp = r + dcol;
           cp < this.cols && rp < this.rows
           && this.at(cp, rp).tile;
           cp += drow, rp += dcol) {
        const tile = this.at(cp, rp).tile;
        crossWord += tile.letter;
        crossWordScore += tile.score;
      }

      if (crossWordScore > 0) {
        // This tile (and bonuses) contribute to cross words
        crossWordScore += letterScore;
        crossWordScore *= crossWordMultiplier;
        if (words)
          words.push({
            word: crossWord,
            score: crossWordScore
          });

        crossWordsScore += crossWordScore;
      }
    }

    wordScore *= wordMultiplier;

    if (words)
      words.push({
        word: tiles.map(tile => tile.letter).join(""),
        score: wordScore
      });

    // Add cross word values to the main word value
    wordScore += crossWordsScore;

    return wordScore;
  }
}

export { Board }
