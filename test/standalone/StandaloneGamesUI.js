/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha, node */

import { assert } from "chai";
import { setupPlatform, setup$, setupI18n } from "../TestPlatform.js";
import { Game } from "../../src/game/Game.js";
import { Player } from "../../src/game/Player.js";
import { UIEvents } from "../../src/browser/UIEvents.js";

describe("standalone/StandaloneGamesUI", () => {

  let StandaloneGamesUI, keep = {};
  let joinSeen;

  before(
    () => setupPlatform()
    .then(() => setup$(
      `${import.meta.url}/../../html/standalone_games.html`,
      Platform.absolutePath("/html/standalone_games.html")))
    .then(() => setupI18n())
    // UI imports jquery.i18n which requires jquery, so have
    // to delay the import
    .then(() => import("../../src/standalone/StandaloneGamesUI.js"))
    .then(mod => StandaloneGamesUI = mod.StandaloneGamesUI)
    .then(() => {
      keep.open = window.open;
      window.open = () => {};
      keep.location = global.location;
      global.location = {
        href: "here",
        hash: "",
        replace: hr => location.href = hr
      };
      $(document).on(UIEvents.JOIN_GAME, (event, key) => {
        assert(!joinSeen);
        joinSeen = key;
      });
    }));
  
  after(() => {
    window.open = keep.open;
    global.location = keep.location;
  });
  
  it("works", () => {
    const ui = new StandaloneGamesUI();

    ui.create();
    ui.attachUIEventHandlers();

    const game = new Game({ edition: "Test" });
		const robot1 = new Player(
			{name:"Robot 1", key:"robot1", isRobot: true, score: 1}, Game.CLASSES);
		const human1 = new Player(
			{name:"Human 1", key:"human1", isRobot: false, score: 2}, Game.CLASSES);

    return game.onLoad(ui.db)
    .then(() => game.create())
    .then(() => {
			game.addPlayer(human1, true);
			game.addPlayer(robot1, true);
			game.whosTurnKey = human1.key;
      game.state = Game.State.GAME_OVER;
    })
    .then(() => game.state = Game.State.GAME_OVER)
    .then(() => game.save())
    .then(() => {

      $("#create-game").trigger("click");

      ui.gameOptions(); // launches a Dialog

      ui.getGames("all")
      .then(games => {
        assert.equal(games.length, 1);
        assert.equal(games[0].key, game.key);
      });
      $(document).trigger(UIEvents.JOIN_GAME, [ game.key ]);
    })
    .then(() => ui.getGame(game.key))
    .then(g2 => assert.equal(g2.key, game.key))
    .then(() => ui.getHistory())
    .then(hist => {
      assert.equal(joinSeen, game.key);
      assert.equal(hist.length, 2);
      assert.equal(hist[0].key, "human1");
      assert.equal(hist[0].wins, 1);
      assert.equal(hist[0].games, 1);
    })
    .then(() => ui.deleteGame(game));
    // TODO: a lot more testing!
  });
});
