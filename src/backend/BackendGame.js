/*Copyright (C) 2021-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

import { Game } from "../game/Game.js";
import { Undo } from "../game/Undo.js";
import { Replay } from "../game/Replay.js";
import { CommandsMixin } from "../game/CommandsMixin.js";

/**
 * Back end implementation of {@linkcode Game}.
 * Combines all the game components into a playable game.
 * @mixes game/Undo
 * @mixes game/Replay
 * @mixes game/CommandsMixin
 * @extends Game
 */
class BackendGame extends Undo(Replay(CommandsMixin(Game))) {

  /**
   * Override factory classes from Game
   */
  static CLASSES = {
    Game: BackendGame,

    Board: Game.CLASSES.Board,
    Square: Game.CLASSES.Square,
    Tile: Game.CLASSES.Tile,
    Player: Game.CLASSES.Player,
    Rack: Game.CLASSES.Rack,
    LetterBag: Game.CLASSES.LetterBag,
    Move: Game.CLASSES.Move,
    Turn: Game.CLASSES.Turn
  };

  /**
   * Check if the game has timed out due to inactivity.
   * Stops game timers and sets the state of the game if it has.
   * @param {integer} limit the maximum time since the game was last
   * interacted with (played) in milliseconds. If the limit is <= 0
   * then games never time out.
   * @return {Promise} resolves to the game when timeout has
   * been checked
   */
  checkAge(limit) {
    if (limit > 0 && Date.now() - this.lastActivity() > limit) {

      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("Game", this.key, "timed out");

      this.state = Game.State.TIMED_OUT;
      return this.save();
    }
    return Promise.resolve(this);
  }
}

export { BackendGame }

