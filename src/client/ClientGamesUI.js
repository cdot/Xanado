/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser */

/**
 * Browser app for client_games.html; populate the list of live games
 */
import { BrowserPlatform } from "../browser/BrowserPlatform.js";
window.Platform = BrowserPlatform;

import { UI } from "../browser/UI.js";
import { Game } from "../game/Game.js";
import { GamesUIMixin } from "../browser/GamesUIMixin.js";
import { ClientUIMixin } from "./ClientUIMixin.js";

/**
 * Management interface for a database of games.
 * @extends UI
 * @mixes client/ClientUIMixin
 * @mixes browser/GamesUIMixin
 */
class ClientGamesUI extends ClientUIMixin(GamesUIMixin(UI)) {

  /**
   * @implements browser/GamesUIMixin#attachUIEventHandlers
   * @override
   */
  attachUIEventHandlers() {

    super.attachUIEventHandlers();

    $("#create-game")
    .on("click", () =>
        import(
          /* webpackMode: "lazy" */
          /* webpackChunkName: "GameSetupDialog" */
          "../browser/GameSetupDialog.js")
        .then(mod => new mod.GameSetupDialog({
          title: $.i18n("btn-create-game"),
          ui: this,
          postAction: "/createGame",
          postResult: () => this.refreshGames(),
          error: e => this.alert(e, $.i18n("failed", $.i18n("btn-create-game")))
        })));

    $("#reminders-button")
    .on("click", () => {
      $.post("/sendReminder/*")
      .then(info => this.alert(info.join(", "), $.i18n("btn-send-reminders")))
      .catch(e => this.alert(e, $.i18n("failed", $.i18n("btn-send-reminders"))));
    });

    $("#chpw_button")
    .on("click", () =>
        import(
          /* webpackMode: "lazy" */
          /* webpackChunkName: "ChangePasswordDialog" */
          "../client/ChangePasswordDialog.js")
        .then(mod => new mod.ChangePasswordDialog({
          postAction: "/change-password",
          postResult: () => this.refresh(),
          error: e => this.alert(e, $.i18n("failed", $.i18n("btn-chpw")))
        })));
  }

  /**
   * Attach handlers to receive notifications from the server
   */
  attachChannelHandlers() {

    this.channel

    .on(Game.Notify.UPDATE, () => {
      //this.debug("b>f update");
      // Can be smarter than this!
      this.refresh();
    });

    // Tell the backend we want to receive monitor messages
    this.notifyBackend(Game.Notify.MONITOR);

    return Promise.resolve();
  }

  /**
   * @override
   */
  promiseSession() {
    return super.promiseSession()
    .then(session => {
      $("#create-game").show();
      $("#chpw_button").toggle(session.provider === "xanado");
      return session;
    })
    .catch(() => {
      $("#create-game").hide();
      return undefined;
    });
  }

  /**
   * @override
   */
  refresh() {
    return Promise.all([
      super.refresh(),
      this.promiseSession()
    ]);
  }

  /**
   * @implements browser/GamesUIMixin#gameOptions
   */
  gameOptions(game) {
    import(
      /* webpackMode: "lazy" */
      /* webpackChunkName: "GameSetupDialog" */
      "../browser/GameSetupDialog.js")
    .then(mod => new mod.GameSetupDialog({
      // use the generic html
      title: $.i18n("btn-game-setup"),
      game: game,
      onSubmit: (dialog, desc) => {
        for (const key of Object.keys(desc))
          game[key] = desc[key];
        $.post("/gameSetup/${game.key}", desc)
        .catch(e => this.alert(e, $.i18n("failed", $.i18n("btn-game-setup"))));
        this.refreshGame(game.key);
      },
      ui: this,
      error: e => this.alert(e, $.i18n("failed", $.i18n("btn-game-setup")))
    }));
  }

  /**
   * @implements browser/GamesUIMixin#joinGame
   */
  joinGame(game) {
    $.post(`/join/${game.key}`)
    .then(url => {
      if (this.getSetting("one_window"))
        location.replace(url);
      else {
        window.open(url, "_blank");
        this.refreshGame(game.key);
      }
    })
    .catch(e => this.alert(e, $.i18n("failed", $.i18n("btn-open-game"))));
  }

  /**
   * @implements browser/GamesUIMixin#addRobot
   * @inheritdoc
   */
  addRobot(game) {
    import(
      /* webpackMode: "lazy" */
      /* webpackChunkName: "AddRobotDialog" */
      "../client/AddRobotDialog.js")
    .then(mod => new mod.AddRobotDialog({
      ui: this,
      postAction: `/addRobot/${game.key}`,
      postResult: () => this.refreshGame(game.key),
      error: e => this.alert(e, $.i18n("failed", $.i18n("btn-add-robot")))
    }));
  }

  /**
   * @implements browser/GamesUIMixin#invitePlayers
   */
  invitePlayers(game) {
    import(
      /* webpackMode: "lazy" */
      /* webpackChunkName: "InvitePlayersDialog" */
      "../client/InvitePlayersDialog.js")
    .then(mod => new mod.InvitePlayersDialog({
      postAction: `/invitePlayers/${game.key}`,
      postResult: names => this.alert(
        $.i18n("sent-invite", names.join(", ")),
        $.i18n("Invitations")
      ),
      error: e => this.alert(e, $.i18n("failed", $.i18n("btn-send-invite")))
    }));
  }

  /**
   * @implements browser/GamesUIMixin#anotherGame
   */
  anotherGame(game) {
    $.post(`/anotherGame/${game.key}`)
    .then(() => this.refreshGames())
    .catch(e => this.alert(e, $.i18n("failed", $.i18n("btn-another"))));
  }

  /**
   * @implements browser/GamesUIMixin#deleteGame
   */
  deleteGame(game) {
    $.post(`/deleteGame/${game.key}`)
    .then(() => this.refreshGames())
    .catch(e => this.alert(e, $.i18n("failed", $.i18n("btn-delete"))));
  }

  /**
   * @implements browser/GamesUIMixin#observe
   */
  observe(game) {
    const obs = $.i18n("btn-observe");
    const ui = this;
    $("#observeDialog")
    .dialog({
      create: function () {
        $(this).find("button[type=submit]")
        .on("click", () => $(this).dialog("close"));
      },
      title: obs,
      closeText: obs,
      modal: true,
      close: function() {
        const name = encodeURIComponent(
          $(this).find("#observerName").val());
        console.debug("Observe game", game.key, "as", name);
        $.get(`/join/${game.key}?observer=${encodeURI(name)}`)
        .then(url => {
          if (ui.getSetting("one_window"))
            location.replace(url);
          else {
            window.open(url, "_blank");
            ui.refreshGame(game.key);
          }
        })
        .catch(e => ui.alert(e, $.i18n("failed", $.i18n("btn-observe"))));
      }
    });
  }

  /**
   * @implements browser/GamesUIMixin#$player
   */
  $player(game, player, isActive) {

    const $tr = super.$player(game, player, isActive);

    if (!this.session)
      return $tr;

    const $box = $tr.find(".button-box");

    if (player.key === this.session.key) {
      // Currently signed in player
      $box.append(
        $(document.createElement("button"))
        .addClass("risky")
        .attr("name", `leave${game.key}`)
        .button({ label: $.i18n("btn-leave-game") })
        .tooltip({
          content: $.i18n("tt-leave")
        })
        .on("click", () => {
          console.debug(`Leave game ${game.key}`);
          $.post(`/leave/${game.key}`)
          .then(() => this.refreshGame(game.key))
          .catch(e => this.alert(e, $.i18n("failed", $.i18n("btn-leave-game"))));
        }));

      return $tr;
    }
    else if (player.isRobot) {
      $box.append(
        $(document.createElement("button"))
        .attr("name", "removeRobot")
        .button({ label: $.i18n("btn-remove-robot") })
        .tooltip({
          content: $.i18n("tt-remove-robot")
        })
        .on("click", () => {
          console.debug(`Remove robot from ${game.key}`);
          $.post(`/removeRobot/${game.key}`)
          .then(() => this.refreshGame(game.key))
          .catch(e => this.alert(e, $.i18n("failed", $.i18n("btn-remove-robot"))));
        }));
    }

    // Don't remind the signed in player
    if (this.getSetting("canEmail")
        && !player.isRobot
        && game.whosTurnKey === player.key) {
      $box.append(
        $(document.createElement("button"))
        .attr("name", "email")
        .button({ label: $.i18n("btn-send-reminder") })
        .tooltip({
          content: $.i18n("tt-send-reminder")
        })
        .on("click", () => {
          console.debug("Send reminder");
          $.post(`/sendReminder/${game.key}`)
          .then(names =>
                $("#alertDialog")
                .dialog({
                  title: $.i18n("hey-reminded-title", player.name),
                  modal: true
                })
                .html($.i18n("hey-reminded-body", names.join(", "))))
          .catch(e => this.alert(e, $.i18n("failed", $.i18n("btn-send-reminder"))));
        }));
    }

    return $tr;
  }

  /**
   * @implements browser/GamesUIMixin#showGames
   * @override
   */
  showGames(simples) {
    super.showGames(simples);

    $("#reminders-button").hide();

    if (this.session && this.getSetting("canEmail") && simples.length > 0) {
      const games = simples.map(simple =>
                                Game.fromSendable(simple, Game.CLASSES));
      if (games.reduce((em, game) => {
        // game is Game.simple, not a Game object
        // Can't remind a game that hasn't started or has ended.
        if (game.hasEnded()
            || game.state === Game.State.WAITING
            || !game.whosTurnKey)
          return em;
        return em || game.getPlayerWithKey(game.whosTurnKey).email;
      }, false))
        $("#reminders-button").show();
    }
  }

  /**
   * @implements browser/GamesUIMixin#getHistory
   */
  getHistory() {
    return $.get("/history");
  }

  /**
   * @implements browser/GamesUIMixin#getGame
   */
  getGame(key) {
    return $.get(`/games/${key}`)
    .then(g => g ? g[0] : undefined);
  }

  /**
   * @implements browser/GamesUIMixin#getGames
   */
  getGames(what) {
    return $.get(`/games/${what}`);
  }

  create() {
    return super.create()
    .then(() => this.promiseSession())
    .then(() => this.refreshGames());
  }
}

export { ClientGamesUI }
