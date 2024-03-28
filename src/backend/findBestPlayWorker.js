/*Copyright (C) 2019-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env worker */
/* global window */
/* global postMessage, addEventListener, close */

import { Game } from "../game/Game.js";
import { CBOR } from "../game/CBOR.js";
import { findBestPlay } from "../game/findBestPlay.js";

let inWorker = false;
if (typeof window === "undefined") {
  inWorker = true;
  // hack! map WorkerGlobalScope to window, see https://github.com/webpack/webpack/issues/6642
  self.window = self;
}

/**
 * Worker thread for findBestPlay for node.js. This allows the best
 * play to be found asynchronously, without blocking the main thread,
 * so we can time it out if necessary.
 * @module
 */

function send(type, data) {
  postMessage(
    CBOR.encode({ type: type, data: data }, Game.CLASSES));
}

addEventListener("message", event => {
  const info = CBOR.decode(event.data, Game.CLASSES);

  //console.debug("findBestPlayWorker received game");

  let getPlatform;
  if (info.Platform === "ServerPlatform")
    // Note: ServerPlatform is declared as external in webpack_config.js, so it
    // will be excluded from the dependencies - which is fine, because it is
    // never used in the browser.
    getPlatform = import("../server/ServerPlatform.js");
  else
    getPlatform = import("../browser/WorkerPlatform.js");

  getPlatform
  .then(mod => {
    self.Platform = mod[info.Platform];

    // If the worker is running in debug mode, then URLs are relative to src. If
    // it's running webpacked, they are relative to dist.
    //console.debug("findBestPlayWorker findBestPlay", info);
    findBestPlay(
      info.game, info.rack,
      play => send("play", play),
      info.dictionary)
    .then(() => {
      send("exit");
      close();
    });
  });
});

