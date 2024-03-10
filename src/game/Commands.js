/*Copyright (C) 2021-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/**
 * Commands that can be sent from the UI to the Backend.
 * @typedef {CHALLENGE|CONFIRM_GAME_OVER|PASS|PAUSE|PLAY|REDO|SWAP|TAKE_BACK|UNDO|UNPAUSE} Commands
 */
const Commands = {
  CHALLENGE:         0,
  CONFIRM_GAME_OVER: 1,
  PASS:              2,
  PAUSE:             3,
  PLAY:              4,
  REDO:              5,
  SWAP:              6,
  TAKE_BACK:         7,
  UNDO:              8,
  UNPAUSE:           9
};

export { Commands }

