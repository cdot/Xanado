/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

import { Dialog } from "../browser/Dialog.js";
import { PasswordMixin } from "./PasswordMixin.js";

class ChangePasswordDialog extends PasswordMixin(Dialog) {

  constructor(options) {
    super("ChangePasswordDialog", $.extend({
      title: $.i18n("btn-chpw")
    }, options));
  }

  createDialog() {
    return super.createDialog()
    .then(() => {
      const $las = this.$dlg.find(".signed-in-as");
      if ($las.length > 0) {
        $.get("/session") // asynchronous is OK
        .then(user => $las.text(
          $.i18n("signed-in-as", user.name)));
      }
    });
  }
}

export { ChangePasswordDialog }
