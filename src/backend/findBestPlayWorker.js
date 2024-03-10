/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/* global postMessage */
/* global addEventListener */
/* global close */
/* global window */
/* global global */

import { BackendGame } from "./BackendGame.js";
import { CBOR } from "../game/CBOR.js";
import { findBestPlay } from "../game/findBestPlay.js";

/**
 * Worker thread for findBestPlay. This allows the best play to be
 * found asynchronously, without blocking the main thread, so we can
 * time it out if necessary. Simply calls {@linkcode module:game/findBestPlay}
 * @module
 */

function send(type, data) {
  postMessage(
    CBOR.encode({ type: type, data: data }, BackendGame.CLASSES));
}

addEventListener("message", event => {
  // TODO: decode the packed game
  const info = CBOR.decode(event.data, BackendGame.CLASSES);
  /* Note: ServerPlatform.js is excluded from webpacking in webpack_config.js */
  const plaf = info.Platform == "ServerPlatform"
        ? import("../server/ServerPlatform.js")
        .then(mod => global.Platform = mod.ServerPlatform)
        : import("../browser/BrowserPlatform.js")
        .then(mod => window.Platform = mod.BrowserPlatform);
  plaf
  .then(() => {
    findBestPlay(
      info.game, info.rack,
      bestPlay => send("play", bestPlay),
      info.dictionary)
    .then(() => {
      send("exit");
      close();
    });
  });
});

