/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/**
 * Events issued by the game code to update the UI - ignored on server side:
 * * SELECT_SQUARE - the square passed has been selected. This will
 *   either delegate to the tile placed on the square, or enable the
 *   typing cursor on an empty square.
 * * CLEAR_SELECT - clear the current selection (deselect selected tile,
 *   and/or disable the typing cursor)
 * * DROP_TILE - a tile has been drag/dropped on the square passed. The
 *   source and destination squares are passed.
 * Events issued by the UI code for it's own purposes:
 * * JOIN_GAME - handled by the UI to redirect the browser to a game
 * @typedef {SELECT_SQUARE|CLEAR_SELECT|DROP_TILE} UIEvents
 */
const UIEvents = {
  CLEAR_SELECT:  "ClearSelect",
  DROP_TILE:     "DropTile",
  SELECT_SQUARE: "SelectSquare",
  JOIN_GAME:     "JoinGame"
};

export { UIEvents }
