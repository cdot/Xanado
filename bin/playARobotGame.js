/* See README.md at the root of this distribution for copyright and
   license information */

/**
 * This is NOT a unit test, it is a stand-alone test for the game engine.
 * It will play a complete game between two robot players. It does not test
 * the server.
 */
import { MemoryDatabase } from "../test/MemoryDatabase.js";
import { Edition } from "../src/game/Edition.js";
import { CBOR } from "../src/game/CBOR.js";
import { Game } from "../src/game/Game.js";

const Tile = Game.CLASSES.Tile;
const Rack = Game.CLASSES.Rack;
const Square = Game.CLASSES.Square;
const Player = Game.CLASSES.Player;
const LetterBag = Game.CLASSES.LetterBag;
const Board = Game.CLASSES.Board;
const Move = Game.CLASSES.Move;

let db = new MemoryDatabase();
let game = new Game({
  //_debug: console.debug,
  edition: "Test",
  dictionary: "CSW2021_English"
});
let gameKey = game.key;
let player = 0;
game.create()
.then(() => game.onLoad(new MemoryDatabase()))
.then(game => {
  let player1 = new Player({
    name: "player one", key: "flay", isRobot: true}, Game.CLASSES);
  game.addPlayer(player1, true);
  let player2 = new Player({name: "player two", key: "swelter",
                            isRobot: true }, Game.CLASSES);
  game.addPlayer(player2, true);
  game.whosTurnKey = player1.key;
  return game.onLoad(db);
})
.then(game => game.save())
.then(async game => {
  let finished = false;
  while (!finished) {
    await db.get(gameKey)
    // TODO: decode the packed game
    .then(d => CBOR.decode(d, Game.CLASSES))
    .then(game => game.onLoad(db))
    .then(game => {
      return game.autoplay()
      .then(turn => {
        if (game.hasEnded()) {
          console.log(game.state);
          finished = true;
        }
        return game.save();
      });
    });
  }
  console.log("Robot game over");
});


