/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha, node */

import { assert } from "chai";
import { setupPlatform, setup$, setupI18n,
         expectDialog, StubServer } from "../TestPlatform.js";
import { Dialog } from "../../src/browser/Dialog.js";

describe("browser/Dialog", () => {
  let Test, gamesList = [], gamesHistory = [];

  before(
    () => setupPlatform()
    .then(() => setup$())
    .then(() => setupI18n()));

  beforeEach(() => {
    $("head").empty();
    $("body").html(`<div class="dialog" id="test_dialog">
<div id="i18n" data-i18n="lbl-turn-snd"></div>
<input name="1" data-i18n-placeholder="lbl-pause" value="1">
<label for="two" data-i18n="lbl-not-enable"></label>
<input id="two" name="2" type="checkbox" />
<button data-i18n-tooltip="tt-warn-snd">
<select name="3" data-i18n-tooltip="txt-feedback">
<option>only</option>
<select>
<button id="submit" class="submit"></button>
</div>`);
  });

  it("onSubmit", () => {
    let dlg;
    return new Promise(resolve => {
      dlg = new Dialog("test_dialog", {
        title: "Test dialog",
        onSubmit: (dlg, vals) => {
          assert(dlg.$dlg.data("DIALOG_CREATED"));
          assert(dlg.$dlg.data("DIALOG_OPEN"));
          assert.deepEqual(vals, { '1': '1', '2': false, '3': 'only' });
          resolve();
        },
        onReady: dlg => {
          assert(dlg.$dlg.data("DIALOG_OPEN"));
          $(".submit", dlg.$dlg).trigger("click");
        },
        error: e => assert.fail(e)
      });
    })
    .then(() => {
      assert(!dlg.$dlg.data("DIALOG_OPEN"));
      dlg.$dlg.removeData("DIALOG_CREATED");
      dlg.$dlg.dialog("destroy");
    });
  });

  it ("postSubmit", () => {
    const server = new StubServer({
      "/url": Promise.resolve([{data:'{"1":"1","2":false,"3":"only"}'}])
    });
    return new Promise(resolve => {
      const dlg = new Dialog("test_dialog", {
        title: "Test dialog",
        postAction: "/url",
        postResult: blah => {
          assert.deepEqual(
            JSON.parse(blah[0].data),
            { '1': '1', '2': false, '3': 'only' });
          resolve();
        },
        onReady: dlg => {
          $("#submit").trigger("click");
        },
        error: e => assert.fail(e)
      });
    })
    .then(() => server.wait());
  });
});
