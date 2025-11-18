/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/* global Platform, assert */

// Static DB of loaded Editions, indexed by name
const editions = {};

/**
 * A Scrabble-like crossword game edition.
 *
 * Editions define the board layout and letter bag for a specific
 * Scrabble-like crossword game - Scrabble, Words With Friends, Lexulous,
 * or a game you've made yourself.
 *
 * Editions are only loaded once, and are subsequently kept in memory.
 * They are referred to by name in comms between the server and players,
 * and are not sent to the browser.
 */
class Edition {
  /**
   * Name of the edition
   * @member {string}
   */
  name;

  /**
   * The initial bag of letters at
   * the start of a game. Note that the ordering is unimportant
   * but if a dictionary is used, then there has to be a 1:1
   * correspondence between the alphabet used to generate the
   * DAWG and the letters in the bag.
   * @member {BagLetter[]}
   */
  bag;

  /**
   * A quarter-board, where each entry
   * represents a row of the Lower-right quadrant of the
   * board, so 0,0 is the middle. Each character in the strings
   * represents the scoring for that square encoded as follows:
   * d = double letter, D = double word
   * t = triple letter, T = triple word
   *  q = quad letter, Q = quad word
   * _ = normal
   * @member {string[]}
   */
  layout;

  /**
   * The number of tiles on a players rack
   * @member {number}
   */
  rackCount;

  /**
   * Number of tiles swappable in a turn
   * @member {number}
   */
  swapCount;

  /**
   * maximum number of players
   * @member {number}
   */
  maxPlayers;

  /**
   * Map of bonuses, from number of tiles used in play to bonus
   * number of points.
   * @member {object.<number,number>}
   */
  bonuses;

  /**
   * Map from each letter in the bag to the score for that letter
   * (computed)
   * @member {object.<string,number>}
   * @private
   */
  scores;

  /**
   * Number of rows on the board (computed)
   * @member {string[]}
   */
  rows;

  /**
   * Number of columns on the board (computed)
   * @member {string[]}
   */
  cols;

  /**
   * Sorted list of the unique non-blank letters in the bag (computed)
   * @member {string[]}
   */
  alphabet;

  /**
   * @param {object} spec the specification for the edition. This is an
   * object that contains all the non-computed fields of an edition.
   */
  constructor(spec) {
    Object.getOwnPropertyNames(spec).forEach(
      p => this[p] = spec[p]);
    this.bonuses = spec.bonuses;

    this.scores = { }; // map letter->score

    this.rows = 2 * this.layout.length - 1;
    this.cols = this.rows;

    const alph = [];
    for (let tile of this.bag) {
      if (tile.letter) {
        assert(tile.letter.indexOf("_") < 0); // _ not supported!
        alph.push(tile.letter);
      } else {
        tile.letter = " "; // blank
        tile.isBlank = true;
      }
      this.scores[tile.letter] = tile.score || 0;
    }
    this.alphabet = alph.sort();
  }

  /**
   * Promise to load this edition
   * @param {string} name what to call the edition
   * @return {Promise} resolves to the Edition
   */
  static load(name) {
    if (editions[name])
      return Promise.resolve(editions[name]);

    return Platform.getJSON(Platform.absolutePath(`/editions/${name}.json`))
    .then(spec => {
      spec.name = name;
      editions[name] = new Edition(spec);
      //console.debug(`Loaded edition ${name}`);
      return editions[name];
    });
  }

  /**
   * Get the 'type' of a square on the board
   * @param {number} col - 0-based column
   * @param {number} row - 0-based row
   * @return one of d = double letter, D = double word
   * t = triple letter, T = triple word
   * q = quad letter, Q = quad word
   * _ = normal
   */
  squareType(col, row) {
    const coli = Math.abs(col - Math.floor(this.cols / 2));
    const rowi = Math.abs(row - Math.floor(this.rows / 2));
    return this.layout[coli].charAt(rowi);
  }

  /**
   * Get the score of a tile with the given letter
   * @param {string} l letter to look up
   * @return score of the letter, or 0 if not found
   */
  letterScore(l) {
    return this.scores[l] ? this.scores[l] : 0;
  }

  /**
   * Calculate any bonus afforded to plays of this length
   * @param {number} tilesPaced number of tiles placed
   * @return points bonus
   */
  calculateBonus(tilesPlaced) {
    return this.bonuses ? (this.bonuses[tilesPlaced] || 0) : 0;
  }
}

export { Edition }

