/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha,node */

import { assert } from "chai";
import { setupPlatform, setup$ } from "../TestPlatform.js";

import { BrowserGame } from "../../src/browser/BrowserGame.js";

const Rack = BrowserGame.CLASSES.Rack;
const Tile = BrowserGame.CLASSES.Tile;

/**
 * Unit tests for Rack
 */
describe("browser/BrowserRack", () => {

  before(() => setupPlatform().then(() => setup$()));

  it("$ui empty", () => {
    let $dact = $("<div></div>");
    $("body").append($dact);

    let $table = $("<table></table>");
    $dact.append($table);

    let r = new Rack(BrowserGame.CLASSES, { id: "base", size: 2});
    r.$populate($table);

    let $dexp = $("<div></div>");
    $("body").append($dexp);

    let $exp = $('<table><tbody><tr><td class="square-_ ui-droppable" id="base_0"></td><td class="square-_ ui-droppable" id="base_1"></td></tr></tbody></table>');
    $dexp.append($exp);

    assert($dact[0].isEqualNode($dexp[0]),
           "\nexpected:" + $dexp.html() + "\n" +
           "  actual:" + $dact.html());
    $("body").empty();
  });

  it('$ui empty underlay', () => {
    let $dact = $("<div></div>");
    $("body").append($dact);

    let $table = $("<table></table>");
    $dact.append($table);

    let r = new Rack(BrowserGame.CLASSES, { id: 'base', size: 2, underlay: "£"});
    r.$populate($table);

    let $dexp = $("<div></div>");
    $("body").append($dexp);

    let $exp = $('<table><tbody><tr><td class="square-_ ui-droppable" id="base_0"><div class="underlay">£</div></td><td class="square-_ ui-droppable" id="base_1"></td></tr></tbody></table>');
    $dexp.append($exp);

    assert($dact[0].isEqualNode($dexp[0]),
           "\nexpected:" + $dexp.html() + "\n" +
           "  actual:" + $dact.html());
    $("body").empty();
  });

  it('$ui tiled', () => {
    let $dact = $("<div></div>");
    $("body").append($dact);

    let $table = $("<table></table>");
    $dact.append($table);

    let r = new Rack(BrowserGame.CLASSES, { id: 'base', size: 2});
    r.$populate($table);

    r.addTile(new Tile({letter:'S'}));
    r.addTile(new Tile({letter:'QW', score:10}));

    let $dexp = $("<div></div>");
    $("body").append($dexp);

    let $exp = $('<table><tbody><tr><td class="square-_ ui-droppable" id="base_0"><div class="Tile ui-draggable ui-draggable-handle unlocked-tile"><div class="glyph"><span class="letter letter-scale-1">S</span><span class="score score-scale-1">0</span></div></div></td><td class="square-_ ui-droppable" id="base_1"><div class="Tile ui-draggable ui-draggable-handle unlocked-tile"><div class="glyph"><span class="letter letter-scale-2">QW</span><span class="score score-scale-2">10</span></div></div></td></tr></tbody></table>');
    $dexp.append($exp);

    assert($dact[0].isEqualNode($dexp[0]),
           "\nexpected:" + $dexp.html() + "\n" +
           "  actual:" + $dact.html());
    $("body").empty();
  });
});

