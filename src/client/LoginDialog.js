/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser */

import { Dialog } from "../browser/Dialog.js";
import { PasswordMixin } from "./PasswordMixin.js";

/**
 * @extends Dialog
 * @mixes PasswordMixin
 */
class LoginDialog extends PasswordMixin(Dialog) {

  constructor(options) {
    options.onSubmit = () => {
      this.options.postAction = this.getAction();
    };
    super("LoginDialog", $.extend({
      title: $.i18n("btn-signin")
    }, options));
  }

  enableSubmit() {
    if (this.getAction() === "register") {
      const user = this.$dlg.find("#register_username").val();
      return (user
              && user !== $.i18n("Advisor")
              && user !== $.i18n("Robot"));
    }
    return true;
  }

  getAction() {
    const active = this.$dlg.find("#tabs").tabs("option", "active");
    return {
      0: "/signin",
      1: "/register",
      2: "/reset-password"
    }[active];
  }

  createDialog() {
    return super.createDialog()
    .then(() => {
      const $tabs = this.$dlg.find("#tabs");
      $tabs.tabs();

      const $las = this.$dlg.find(".signed-in-as");
      if ($las.length > 0) {
        $.get("/session")
        .then(user => $las.text(
          $.i18n("signed-in-as", user.name)));
      }

      this.$dlg.find(".forgotten-password")
      .on("click", () => $tabs.tabs("option", "active", 2));

      return $.get("/oauth2-providers")
      .then(list => {
        if (!list || list.length === 0)
          return;
        const $table = $(document.createElement("table"))
              .attr("width", "100%");
        for (let provider of list) {
          const $td = $(document.createElement("td"))
                .addClass("provider-logo")
                .attr("title", $.i18n("text-signusing", provider.name));
          const $logo = $(`<img src="${provider.logo}" />`);
          // Note: this MUST be done using from an href and
          // not an AJAX request, or CORS will foul up.
          const $a = $(document.createElement("a"));
          $a.attr("href",
                  `/oauth2/signin/${provider.name}?origin=${encodeURI(window.location)}`);
          $a.append($logo);
          $td.append($a);
          $td.tooltip();
          $table.append($td);
        }
        $("#signin-tab")
        .prepend($(`<div class="sign-in-using">${$.i18n("text-signin")}</div>`)
                 .append($table)
                 .append(`<br /><div class="sign-in-using">${$.i18n("text-or-xanado")}</div>`));
      });
    });
  }
}

export { LoginDialog }
