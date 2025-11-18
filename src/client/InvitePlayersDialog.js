/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser */

import { Dialog } from "../browser/Dialog.js";

/**
 * Dialog for inviting players to a game.
 * @extends Dialog
 */
class InvitePlayersDialog extends Dialog {

  constructor(options) {
    super("InvitePlayersDialog", $.extend({
      title: $.i18n("btn-send-invite")
    }, options));

    // Known users, got afresh from /users each time the
    // dialog is opened
    this.users = [];
  }

  createDialog() {
    return super.createDialog()
    .then(() => {
      const $email = this.$dlg.find("#playerEmail");
      $email
      .on('change', () => this.pick($email.val()));

      const $select = this.$dlg.find("#knownUserSelect");
      $select
      .on("selectmenuchange", () => this.pick($select.val()));
    });
  }

  openDialog() {
    return super.openDialog()
    .then(() => $.get("/users"))
    .then(users => {
      this.users = users;
      const $select = this.$dlg.find("#knownUserSelect");
      $select.empty();
      users.forEach(uo => $select.append(
        `<option value="${uo.key}">${uo.name}</option>`));
      $select
      .selectmenu("refresh");
      const $gk = this.$dlg.find("[name=gameKey]");
      $gk.val(this.options.gameKey);
      this.$dlg.find("#invitedPlayers").empty();
      this.invitees = [];
      this.$dlg.find("#removeText").hide();
    });
  }

  pick(name) {
    if (!name)
      return;
    let known = this.users.find(uo => (
      uo.name === name
      || uo.email === name
      || uo.key === name));
    if (!known) {
      known = { email: name };
      this.users.push(known);
    }

    const $list = this.$dlg.find("#invitedPlayers");
    let invited = false;
    $(".invitee").each(() => {
      if ($(this).data("uo") === known)
        invited = true;
    });
    if (invited)
      return;

    const $removeText = this.$dlg.find("#removeText");
    const $in = $(document.createElement("span"))
          .addClass("invitee")
          .text((known.name || known.email))
          .data("uo", known)
          .on('click', function() {
            $(this).remove();
            if ($list.children().length === 0)
              $removeText.hide();
          });
    $list.append($in);

    $removeText.show();
  }

  submit() {
    const ps = [];
    const $invitees = this.$dlg.find(".invitee");
    if ($invitees.length === 0) {
      this.$dlg.dialog("close");
      return;
    }
    $invitees.each(function() {
      ps.push($(this).data("uo"));
    });
    super.submit({ player: ps });
  }
}

export { InvitePlayersDialog }
