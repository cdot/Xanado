/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

import { Game } from "../game/Game.js";
import { Dialog } from "./Dialog.js";

/**
 * Dialog for modifying game options.
 * @extends Dialog
 */
class GameSetupDialog extends Dialog {

  /**
   * @override
   */
  canSubmit() {
    //console.debug("Validate edition",
    //              this.$dlg.find("[name=edition]").val(),
    //              "play dictionary",
    //              this.$dlg.find("[name=dictionary]").val());
    return (this.$dlg.find("[name=edition]").val() !== 'none');
  }

  constructor(options) {
    super("GameSetupDialog", options);
  }

  showTimerFields() {
    const type = this.$dlg.find("[name=timerType]").val();
    switch (type) {
    default:
      this.$dlg.find("[name=timeAllowed]")
      .parent().hide();
      this.$dlg.find("[name=timePenalty]")
      .parent().hide();
      break;
    case Game.Timer.TURN:
      this.$dlg.find("[name=timeAllowed]")
      .parent().show();
      this.$dlg.find("[name=timePenalty]")
      .parent().hide();
      break;
    case Game.Timer.GAME:
      this.$dlg.find("[name=timeAllowed]")
      .parent().show();
      this.$dlg.find("[name=timePenalty]")
      .parent().show();
      break;
    }
  }

  showPenaltyFields() {
    const type = this.$dlg.find("[name=challengePenalty]").val();
    switch (type) {
    default:
      this.$dlg.find("[name=penaltyPoints]")
      .parent().hide();
      break;
    case Game.Penalty.PER_TURN:
    case Game.Penalty.PER_WORD:
      this.$dlg.find("[name=penaltyPoints]")
      .parent().show();
      break;
    }
  }

  showFeedbackFields() {
    const dic = this.$dlg.find("[name=dictionary]").val();
    this.$dlg.find("[name=wordCheck]")
    .parent().toggle(dic !== "none");
  }

  createDialog() {
    // list is an ordered list of type names
    // type is the Game. enumerated type
    // dflt is default pick
    // $el is the <select> jObject
    function orderEnum(list, type, deflt, $el) {
      for (const p of list) {
        const txt = $.i18n(type[p] || "None");
        const sel = (p === deflt) ? ` selected="selected"` : "";
        $el.append(`<option value="${p}"${sel}>${txt}</option>`);
      }
    }

    const $pen = this.$dlg.find("[name=challengePenalty]");
    orderEnum(["MISS", "PER_WORD", "PER_TURN", "NONE"], Game.Penalty, "MISS", $pen);
    $pen.on("selectmenuchange", () => this.showPenaltyFields());
    this.showPenaltyFields();

    const $tim = this.$dlg.find("[name=timerType]");
    orderEnum(["NONE", "TURN", "GAME"], Game.Timer, "NONE", $tim);
    $tim.on("selectmenuchange", () => this.showTimerFields());
    this.showTimerFields();

    const $wc = this.$dlg.find("[name=wordCheck]");
    orderEnum(["NONE", "AFTER", "REJECT"], Game.WordCheck, "NONE", $wc);

    const ui = this.options.ui;
    return Promise.all([
      ui.promiseEditions()
      .then(editions => {
        const $eds = this.$dlg.find("[name=edition]");
        editions.forEach(e => $eds.append(`<option value="${e}">${e}</option>`));
      }),
      ui.promiseDictionaries()
      .then(dictionaries => {
        const $dics = this.$dlg.find("[name=dictionary]");
        dictionaries
        .forEach(d => $dics.append($(`<option value="${d}">${d}</option>`)));
        $dics.on("selectmenuchange", () => this.showFeedbackFields());
        this.showFeedbackFields();
      })
    ])
    .then(() => super.createDialog());
  }

  openDialog() {
    const ui = this.options.ui;
    return super.openDialog()
    .then(() => {
      this.$dlg.find(".dialog-row").show();
      const game = this.options.game;
      const $fields = this.$dlg.find("[name]");

      // Some game options are only tweakable if there are no turns
      // signed in the game. This is controlled by a "noturns" class on
      // the dialog-row
      if (game && game.turns.length > 0)
        this.$dlg.find(".noturns").hide();

      $fields.each((i, el) => {
        const $el = $(el);
        const field = $el.attr("name");
        const val = (game ? game[field] : undefined) || ui.getSetting(field);
        if (el.tagName === "INPUT" && el.type === "checkbox")
          $el.prop("checked", val).checkboxradio("refresh");
        else if (el.tagName === "SELECT") {
          // If the game doesn't have a value for the option then keep
          // the default, which will have been set in createDialog
          if (typeof val !== "undefined")
            $el.val(val).selectmenu("refresh");
        } else if (val)
          $el.val(val);
        return true;
      });
      this.showTimerFields();
      this.showPenaltyFields();
      this.showFeedbackFields();
    });
  }
}

export { GameSetupDialog }
