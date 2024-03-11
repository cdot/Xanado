/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/**
 * Dialog for game display. Demand loads the HTML.
 */
import { Dialog } from "./Dialog.js";
import { GamesUIMixin } from "./GamesUIMixin.js";
import { UIEvents } from "./UIEvents.js";

/**
 * Dialog for opening / editing a game
 * @extends Dialog
 */
class GameDialog extends Dialog {

  constructor(options) {
    super("GameDialog", $.extend({
      title: $.i18n("title-game-dlg", options.game.key)
    }, options));
  }

  createDialog() {
    return super.createDialog()
    .then(() => {
      this.$dlg.find("button[name=options]")
      .on(
        "click", () => {
          const dlg = this.$dlg.data("this");
          dlg.options.ui.gameOptions(dlg.options.game);
        });

      this.$dlg.find("button[name=observe]")
      .hide()
      .on("click", () => {
        this.$dlg.dialog("close");
        const dlg = this.$dlg.data("this");
        dlg.options.ui.observe(dlg.options.game);
      });

      this.$dlg.find("button[name=join]")
      .hide()
      .on("click", () => {
        this.$dlg.dialog("close");
        const dlg = this.$dlg.data("this");
        $(document).trigger(UIEvents.JOIN_GAME, [ dlg.options.game.key ]);
      });

      this.$dlg.find("button[name=robot]")
      .hide()
      .on("click", () => {
        const dlg = this.$dlg.data("this");
        dlg.options.ui.addRobot(dlg.options.game);
      });

      this.$dlg.find("button[name=invite]")
      .hide()
      .on("click", () => {
        const dlg = this.$dlg.data("this");
        dlg.options.ui.invitePlayers(dlg.options.game);
      });

      this.$dlg.find("button[name=another]")
      .hide()
      .on("click", () => {
        const dlg = this.$dlg.data("this");
        dlg.options.ui.anotherGame(dlg.options.game);
      });

      this.$dlg.find("button[name=delete]")
      .hide()
      .on("click", () => {
        this.$dlg.dialog("close");
        const dlg = this.$dlg.data("this");
        dlg.options.ui.deleteGame(dlg.options.game);
      });
    });
  }

  /**
   * Update dynamic fields.
   * @param {Game} game will replace the game
   * the dialog was constructed with. Used when refreshing the dialog.
   */
  populate(game) {
    if (game)
      this.options.game = game;
    else
      game = this.options.game;
    this.$dlg.attr("name", game.key);

    const $options = this.$dlg.find("button[name=options]");
    $options.toggle(this.options.ui.session && game.turns.length === 0);

    this.$dlg.find("div[name=headline]")
    .empty()
    .append($.i18n("txt-edition", game.edition))
    .append(game.dictionary
            ? ("<br>" + $.i18n("txt-dictionary", game.dictionary))
            : "");

    const $table = this.$dlg.find(".player-table")
          .empty()
          .attr("name", game.key);
    const isActive = !game.hasEnded();

    game.getPlayers().forEach(
      player => $table.append(this.options.ui.$player(game, player, isActive)));

    if (isActive)
      // .find because it's not in the document yet
      $table.find(`#player${game.whosTurnKey}`).addClass("whosTurn");

    const $join = this.$dlg.find("button[name=join]").hide();
    const $robot = this.$dlg.find("button[name=robot]").hide();
    const $invite = this.$dlg.find("button[name=invite]").hide();
    const $another = this.$dlg.find("button[name=another]").hide();
    const $observe = this.$dlg.find("button[name=observe]").hide();
    const $delete = this.$dlg.find("button[name=delete]").hide();
    if (this.options.ui.session) {
      $delete.show();
      if (isActive) {
        if (!game.getPlayerWithKey(this.options.ui.session.key)
            && ((game.maxPlayers || 0) === 0
                || game.getPlayers().length < game.maxPlayers))
          $join.show().button("option", { label: $.i18n("btn-join") });
        if (this.options.ui.getSetting("canEmail"))
          $invite.show();
        if (!game.getPlayers().find(p => p.isRobot))
          $robot.show();
      } else {
        // Game is over, offer to observe
        $observe.show();
        if (!game.nextGameKey)
          $another.show();
      }
    } else
      // Nobody signed in, offer to observe
      $observe.show();
  }

  openDialog() {
    this.populate();
    return super.openDialog();
  }
}

export { GameDialog }
