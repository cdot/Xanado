/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/**
 * Dialog for robot creation. Demand loads the HTML.
 */
import { Dialog } from "../browser/Dialog.js";

class AddRobotDialog extends Dialog {

  constructor(options) {
    super("AddRobotDialog", $.extend({
      title: $.i18n("btn-add-robot")
    }, options));
  }

  createDialog() {
    return super.createDialog()
    .then(() => {
      const ui = this.options.ui;
      return Promise.all([
        ui.promiseDictionaries()
        .then(dictionaries => {
          const $dic = this.$dlg.find('[name=dictionary]');
          dictionaries
          .forEach(d => $dic.append(`<option>${d}</option>`));
          if (ui.getSetting('dictionary'))
            $dic.val(ui.getSetting('dictionary'));
          this.enableSubmit();
        })
      ]);
    });
  }
}

export { AddRobotDialog }
