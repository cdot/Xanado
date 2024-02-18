/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env mocha, node */
import { assert } from "chai";
import { CheckStrings } from "../CheckStrings.js";

describe("translations", () => {
  it("translates", () => {
    let flawless = true;
    const cs = new CheckStrings({
      error: mess => {
        console.error("ERROR", mess);
        flawless = false;
      },
      warn: mess => console.warn("Warning: ", mess),
      log: console.log
    });
    return cs.check()
    .then(() => {
      assert(flawless, `**** TRY npm run tx TO FIX ****`);
    });
  });
});
