/*Copyright (C) 2019-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/* global assert */

import { loadDictionary } from "./loadDictionary.js";
import { Edition } from "./Edition.js";
import { Tile } from "./Tile.js";
import { Move } from "./Move.js";

/** @module */

/**
 * Return a list of the letters that are in both arrays. Does
 * not handle blank!
 * @param {string[]} a array of letters
 * @param {string[]} b array of letters
 * @return {string[]} intersection of a and b
 * @private
 */
function intersection(a, b) {
  return a.filter(l => b.indexOf(l) >= 0);
}

/**
 * Dictionary being used to find words
 * @private
 */
let dictionary;

let noisy = false; // debug

/**
 * Edition being played.
 * @private
 */
let edition;

/**
 * A matrix where each [col][row] square has two lists, one of
 * valid vertical chars and another of valid horizontal chars. The
 * [0] lists give the letters that are valid for forming a
 * vertical cross word, and the [1] lists give the letters valid
 * for creating a horizontal cross word.
 * @private
 */
let crossChecks;

/**
 * Shortcut to the board in the game
 * @private
 */
let board;

/**
 * The listener function. This takes either a play, or a string
 * describing progress. This allows the finder to run in a thread
 * and still report back via the main event loop.
 * @private
 */
let report;

/**
 * Best score found so far when searching for a move.
 * @private
*/
let bestScore = 0;

/**
 * Unlike Appel and Jacobsen, who anchor plays on empty squares,
 * we anchor plays on a square with a tile that has an adjacent
 * (horizontal or vertical) non-empty square. This significantly
 * reduces the number of anchors that have to be evaluated.
 * However it does mean we have to do some #Gymnastics to find
 * cross words at the start and end of existing words.
 * @param {number} col the square to inspect
 * @param {number} row the square to inspect
 * @return {boolean} true if this square is a valid anchor
 * @private
 */
function isAnchor(col, row) {
  return !board.at(col, row).isEmpty()
  && (col > 0 && board.at(col - 1, row).isEmpty()
      || col < board.cols - 1 && board.at(col + 1, row).isEmpty()
      || row > 0 && board.at(col, row - 1).isEmpty()
      || row < board.rows - 1 && board.at(col, row + 1).isEmpty());
}

/**
 * Determine which letters can fit in each square and form a valid
 * horizontal or vertical cross word. This returns a matrix where
 * each [col][row] square has two lists, one of valid vertical
 * chars and another of valid horizontal chars. The [0] lists give
 * the letters that are valid for forming a vertical cross word,
 * and the [1] lists give the letters valid for creating a
 * horizontal cross word. The indices are chosen such that the
 * cells can be indexed using the dcol parameter in the other
 * functions.
 * @param {string[]} available the set of available letters
 * @private
 */
function computeCrossChecks(available) {
  const xChecks = [];

  for (let col = 0; col < board.cols; col++) {
    const thisCol = [];
    xChecks.push(thisCol);

    for (let row = 0; row < board.rows; row++) {
      const thisCell = [[], []];
      thisCol[row] = thisCell;

      if (board.at(col, row).tile) {
        // The cell isn't empty, only this letter is valid.
        thisCell[0].push(board.at(col, row).tile.letter);
        thisCell[1].push(board.at(col, row).tile.letter);
        continue;
      }

      // Find the words above and below
      let wordAbove = "";
      let r = row - 1;
      while (r >= 0 && board.at(col, r).tile) {
        wordAbove = board.at(col, r).tile.letter + wordAbove;
        r--;
      }

      let wordBelow = "";
      r = row + 1;
      while (r < board.rows && board.at(col, r).tile) {
        wordBelow += board.at(col, r).tile.letter;
        r++;
      }

      // Find the words left and right
      let wordLeft = "";
      let c = col - 1;
      while (c >= 0 && board.at(c, row).tile) {
        wordLeft = board.at(c, row).tile.letter + wordLeft;
        c--;
      }

      let wordRight = "";
      c = col + 1;
      while (c != board.cols && board.at(c, row).tile) {
        wordRight += board.at(c, row).tile.letter;
        c++;
      }

      // Find which (if any) letters form a valid cross word
      for (let letter of available) {
        const h = wordLeft + letter + wordRight;

        // Is h a complete valid word, or just the letter
        // on its tod?
        const hIsWord = h.length === 1 || dictionary.hasWord(h);
        // Is h a valid complete word, or a legal sub-sequence?
        const hIsSeq = hIsWord || col > 0 && dictionary.hasSequence(h);

        const v = wordAbove + letter + wordBelow;
        const vIsWord = v.length === 1 || dictionary.hasWord(v);
        const vIsSeq = vIsWord || row > 0 && dictionary.hasSequence(v);

        if (hIsWord && vIsSeq)
          // A down word is playable with this letter, and
          // there's a valid down sequence involving the
          // letter
          thisCell[0].push(letter);

        if (vIsWord && hIsSeq)
          // An across word is playable with this letter, and
          // there's a valid across sequence involving the
          // letter
          thisCell[1].push(letter);
      }
    }
  }

  crossChecks = xChecks;
}

/**
 * Given a position that can have a letter, recursively compute possible
 * word plays by extending down/across the board. For each word,
 * compute its point value, and update the best score
 * accordingly.
 *
 * @param {number} col index of the current position on the board. This
 * is the posiiton of the last character of the word constructed so far.
 * @param {number} row index of the current position on the board. This
 * is the posiiton of the last character of the word constructed so far.
 * @param {number} dcol 1 if the extension direction is across
 * @param {number} drow 1 if the extension direction is down
 * @param {Tile[]} rackTiles tiles remaining from the user's letter rack.
 * @param {number} tilesPlayed number of tiles from the rack already played
 * @param {LetterNode} dNode the current LetterNode
 * @param {Tile[]} wordSoFar the known letters terminating at the dNode.
 * @private
 */
function forward(col, row,
                 dcol, drow,
                 rackTiles, tilesPlayed,
                 dNode,
                 wordSoFar) {

  // Square we're hopefully extending into
  const ecol = col + dcol;
  const erow = row + drow;

  //if (noisy)console.debug(`forward ${dcol==0?"down":"across"} '${wordSoFar.map(t=>t.letter).join("")}'+[${dNode.isEndOfWord?"_":""}${dNode.postLetters.join('')}] at ${col},${row}`);

  // Tail recurse; report words as soon as we find them
  // Are we sitting at the end of a scoring word?
  if (dNode.isEndOfWord
      && wordSoFar.length >= 2
      && tilesPlayed > 0
      && (ecol == board.cols || erow == board.rows
          || !board.at(ecol, erow).tile)) {

    const words = [];
    const score = board.scorePlay(col, row, dcol, drow, wordSoFar, words)
          + edition.calculateBonus(tilesPlayed);
    const placements = wordSoFar.filter(t => !board.at(t.col, t.row).tile);

    if (score > bestScore) {
      bestScore = score;
      //if (noisy) console.debug(drow > 0 ? "vertical" : "horizontal");
      report(new Move({
        placements: placements,
        words: words,
        score: score
      }));
    }

    // #Gymnastics
    // If we have just extended a word by a single tile
    // to generate a single new word, we treat that
    // as a pseudo-anchor and search at right angles.
    if (placements.length === 1) {
      const pseudoAnchorTile = placements[0];
      const roots = dictionary.getSequenceRoots(pseudoAnchorTile.letter);
      //console.debug(`CROSS ${dcol==0?"across":"up/down"} AT ${pseudoAnchorTile.col},${pseudoAnchorTile.row} with "${pseudoAnchorTile.letter}" and ${roots.length} roots`);
      noisy = true;
      for (let anchorNode of roots) {
        //noisy = makeNoisy && anchorNode.preLetters.join('') === "A";
        back(
          pseudoAnchorTile.col, pseudoAnchorTile.row,
          (dcol === 0 ? 1 : 0), (drow === 0 ? 1 : 0), // right angles,
          rackTiles, 0,
          anchorNode, anchorNode,
          [ pseudoAnchorTile ]);
      }
      noisy = false;
    }
  }

  let available; // list of letters that can be extended with
  let playedTile = 0;

  if (ecol < board.cols && erow < board.rows) {
    // Do we have an empty cell we can extend into?
    if (board.at(ecol, erow).isEmpty()) {
      const haveBlank = rackTiles.find(l => l.isBlank);
      const xc = crossChecks[ecol][erow][dcol];

      available = intersection(
        dNode.postLetters,
        haveBlank ? xc : intersection(
          rackTiles.map(t => t.letter), xc));
      playedTile = 1;

    } else
      // Have pre-placed tile
      available = [ board.at(ecol, erow).tile.letter ];
  }
  else // off the board
    available = [];

  for (let letter of available) {
    let shrunkRack = rackTiles;
    if (playedTile > 0) {
      // Letter played from the rack
      const rackTile = shrunkRack.find(l => l.letter === letter)
            || shrunkRack.find(l => l.isBlank);
      wordSoFar.push(
        new Tile({letter:letter, isBlank:rackTile.isBlank,
                  score:rackTile.score,
                  // Note placement is not used in score computation
                  col: ecol, row: erow}));
      shrunkRack = shrunkRack.filter(t => t !== rackTile);
    } else
      wordSoFar.push(board.at(ecol, erow).tile);

    for (let post of dNode.postNodes) {
      if (post.letter === letter) {
        forward(ecol, erow,
                dcol, drow,
                shrunkRack, tilesPlayed + playedTile,
                post,
                wordSoFar);
      }
    }

    wordSoFar.pop();
  }
}

/**
 * Given a position that may be part of a word, and the letters of the
 * word it may be part of, try to extend back up/left before extending
 * forward down/right.
 *
 * @param {number} col index of the current position on the board. This
 * is the posiiton of the last character of the word constructed so far.
 * @param {number} row index of the current position on the board. This
 * is the posiiton of the last character of the word constructed so far.
 * @param {number} dcol 1 if the extension direction is across
 * @param {number} drow 1 if the extension direction is down
 * @param {Tile[]} rackTiles tiles remaining from the user's letter rack.
 * @param {number} tilesPlayed number of tiles from the rack already played
 * @param {LetterNode} anchorNode the DictNode where we started backing up
 * @param {LetterNode} dNode the current LetterNode
 * @param {Tile[]} wordSoFar the known letters terminating at the dNode.
 * @private
 */
function back(col, row,
              dcol, drow,
              rackTiles, tilesPlayed,
              anchorNode, dNode,
              wordSoFar) {

  // Square we're hopefully extending into
  const ecol = col - dcol;
  const erow = row - drow;

  let available; // the set of possible candidate letters
  let playedTile = 0;

  //if (noisy) console.debug(`back ${dcol==0?"up":"down"} [${dNode.preLetters.join('')}]+'${wordSoFar.map(t=>t.letter).join("")}' at ${col},${row}`);

  // Do we have an adjacent empty cell we can back up into?
  if (ecol >= 0 && erow >= 0) {
    if (board.at(ecol, erow).isEmpty()) {
      // Find common letters between the rack, cross checks, and
      // dNode pre.
      const haveBlank = rackTiles.find(l => l.isBlank);
      const xc = crossChecks[ecol][erow][dcol];

      available =
      intersection(
        dNode.preLetters,
        haveBlank ? xc : intersection(
          rackTiles.map(l => l.letter),  xc));
      playedTile = 1;
    } else
      // Non-empty square, might be able to walk back through it
      available = [ board.at(ecol, erow).tile.letter ];
  }
  else
    // Off the board, nothing available for backing up
    available = [];

  // Head recurse; longer words are more likely to
  // be high scoring, so want to find them first
  for (let letter of available) {
    let shrunkRack = rackTiles;
    if (playedTile > 0) {
      // Letter came from the rack
      const tile = shrunkRack.find(l => l.letter === letter)
            || shrunkRack.find(l => l.isBlank);
      wordSoFar.unshift(
        new Tile({
          letter: letter, isBlank: tile.isBlank,
          score: tile.score,
          // Note placement is not used in score computation
          col: ecol, row: erow
        }));
      shrunkRack = shrunkRack.filter(t => t !== tile);
    } else
      // Letter already on the board
      wordSoFar.unshift(board.at(ecol, erow).tile);

    for (let pre of dNode.preNodes) {
      if (pre.letter === letter) {
        back(ecol, erow,
                  dcol, drow,
                  shrunkRack, tilesPlayed + playedTile,
                  anchorNode, pre,
                  wordSoFar);
      }
    }

    wordSoFar.shift();
  }

  // If this is the start of a word in the dictionary, and
  // we're at the edge of the board or the prior cell is
  // empty, then we have a valid word start.
  if (dNode.preNodes.length == 0
      && (erow < 0 || ecol < 0 || board.at(ecol, erow).isEmpty())) {
    //if (noisy) console.debug(`back: ${dcol==0?"down":"across"} word starts at ${col},${row}`);
    // try extending down beyond the anchor, with the letters
    // that we have determined comprise a valid rooted sequence.
    forward(col + dcol * (wordSoFar.length - 1),
            row + drow * (wordSoFar.length - 1),
            dcol, drow,
            rackTiles, tilesPlayed,
            anchorNode,
            wordSoFar);
  }
}

/**
 * Special case of the opening move. Find anagrams of the player's
 * rack, and find the highest scoring position for each possible word.
 * @param {Tile[]} rackTiles tiles on the rack
 * @private
 */
function bestOpeningPlay(rackTiles) {
  const ruck = rackTiles.map(l => l.letter ? l.letter : " ").join("");
  const choices = dictionary.findAnagrams(ruck);
  //console.debug("Choices", choices);
  // Random whether it is played across or down
  const drow = Math.round(Math.random());
  const dcol = (drow + 1) % 2;
  const vertical = dcol === 0;
  bestScore = 0;

  for (const choice in choices) {
    // Keep track of the rack and played letters
    const placements = [];
    let shrunkRack = rackTiles;
    for (const c of choice.split("")) {
      const rackTile = shrunkRack.find(t => t.letter === c)
            || shrunkRack.find(t => t.isBlank);
      /* c8 ignore next */
      assert(rackTile,
             "Can't do this with the available tiles");
      placements.push(new Tile({
        letter: c, isBlank: rackTile.isBlank,
        score:rackTile.score
        // Placement is fixed later
      }));
      shrunkRack = shrunkRack.filter(t => t !== rackTile);
    }

    // Slide the word over the middle to find the optimum
    // position
    const mid = vertical ? board.midcol : board.midrow;
    for (let end = mid;
         end < mid + choice.length;
         end++) {

      const col = vertical ? mid : end;
      const row = vertical ? end : mid;
      const score =
            board.scorePlay(col, row, dcol, drow, placements)
            + edition.calculateBonus(placements.length);

      if (score > bestScore) {
        //console.debug("Accepted",choice,"at",end,"for",score);
        bestScore = score;
        // Fix the placement
        for (let i = 0; i < placements.length; i++) {
          const pos = end - placements.length + i + 1;
          placements[i].col = dcol == 0 ? board.midcol : pos * dcol;
          placements[i].row = drow == 0 ? board.midrow : pos * drow;
        }
        //console.debug(drow > 0 ? "vertical" : "horizontal")
        report(new Move({
          placements: placements,
          words: [{ word: choice, score: score }],
          score: score
        }));
      } else {
        //console.debug("Rejected",choice,"at",end,"for",score);
      }
    }
  }
}

/**
 * Find the best play for the given rack. The results are reported
 * using the listener.
 *
 * The algorithm works by finding all squares that have a tile in them
 * and an adjacent empty square blank that can be extended into to
 * form a word. These starting squares are termed "anchors".
 *
 * @param {Tile[]} rack rack of tiles to pick from
 * @private
 */
function find(rack) {
  // sort and reverse the rack to make sure high value letters come
  // first and blanks come last. It's not going to make it
  // any faster, but it will abort with a better result if
  // it's going to time out.
  const rackTiles = rack.sort((a, b) => {
    return a.letter < b.letter ? -1  : a.score > b.score ? 1 : 0;
  }).reverse();

  report(`Finding best play with dictionary ${dictionary.name} in edition ${edition.name}`);

  //assert(dictionary instanceof Dictionary, "Setup failure");
  assert(edition instanceof Edition, "Setup failure");

  report(`Rack ${rackTiles.map(t => t.stringify()).join(",")} on\n${board.stringify()}`);
  bestScore = 0;

  // What letters can be used to form a valid cross
  // word? The whole alphabet if the rack contains a
  // blank, the rack otherwise.
  const available = rackTiles.find(l => l.isBlank)
        ? edition.alphabet
        : (rackTiles.filter(t => !t.isBlank)
           .map(t => t.letter));

  // Has at least one anchor been explored? If there are
  // no anchors, we will need to compute an opening play
  let anchored = false;

  // Scan each anchor. An anchor is any square that has a tile
  // and has an adjacent blank that can be extended into to form a word
  for (let col = 0; col < board.cols; col++) {
    for (let row = 0; row < board.rows; row++) {
      if (isAnchor(col, row)) {
        if (!anchored) {
          // This is the first anchor found.
          // Determine which letters can fit in each square and form a valid
          // horizontal or vertical cross word.
          computeCrossChecks(available);
          anchored = true;
        }
        const anchorTile = board.at(col, row).tile;
        const roots = dictionary.getSequenceRoots(anchorTile.letter);
        for (let anchorNode of roots) {
          // Try and back up then forward through
          // the dictionary to find longer sequences

          // across
          back(
            col, row,
            1, 0,
            rackTiles, 0,
            anchorNode, anchorNode,
            [ anchorTile ]);

          // down
          back(
            col, row,
            0, 1,
            rackTiles, 0,
            anchorNode, anchorNode,
            [ anchorTile ]);
        }
      }
    }
  }

  if (!anchored)
    // No anchors, so this is an opening play.
    bestOpeningPlay(rackTiles);
}

/**
 * Given a user's letter rack, compute the best possible move.
 *
 * Inspired by the work of
 * [Elijah Sawyers](https://raw.githubusercontent.com/elijahsawyers/WordsWithFriendsHelper)
 * (which is in turn based on the
 * [work of Andrew W. Appel and Guy J. Jacobson](https://www.cs.cmu.edu/afs/cs/academic/class/15451-s06/www/lectures/scrabble.pdf)).
 * The player is stupid, simply selecting the highest scoring play it can
 * in the time allowed for its move. However this is more than enough to
 * beat most human players.
 *
 * @param {BackendGame} game the Game
 * @param {Tile[]} rack rack in the form of a simple list of Tile
 * @param {function} listener Function that is called with a Move each time
 * a new best play is found, or a string containing a progress or error
 * message.
 * @param {string?} dictionary name of (or path to) dictionary to use,
 * defaults to game dictionary
 * @return {Promise} Promise that resolves when all best moves have been
 * identified
 */
function findBestPlay(game, rack, listener, dict) {
  report = listener;
  board = game.board;
  return Promise.all([
    loadDictionary(dict)
    .then(dic => dictionary = dic),

    Edition.load(game.edition)
    .then(ed => edition = ed)
  ])
  .then(() => find(rack));
}

export { findBestPlay }
