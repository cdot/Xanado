/*Copyright (C) 2019-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env worker */
/* global window */

import { BackendGame } from "./BackendGame.js";
import { CBOR } from "../game/CBOR.js";
import { findBestPlay } from "../game/findBestPlay.js";

/**
 * Worker thread for findBestPlay for node.js. This allows the best
 * play to be found asynchronously, without blocking the main thread,
 * so we can time it out if necessary.
 *
 * The worker can be used in two ways; first, in node.js or in the
 * browser foreground, it can be loaded directly using Worker (which
 * is provided by web-worker in node.js). In a web worker, it can be
 * loaded via browser/findBestPlayWorkerLoader.js, which provides
 * the shims needed to support importmap, which isn't natively
 * supported in web workers.
 * @module
 */

function send(type, data) {
  postMessage(
    CBOR.encode({ type: type, data: data }, BackendGame.CLASSES));
}

addEventListener("message", event => {
  const info = CBOR.decode(event.data, BackendGame.CLASSES);

  //console.debug("findBestPlayWorker received game");
  import(`${info.Platform.data}/${info.Platform.name}.js`)
  .then(mod => {
    if (typeof window !== "undefined")
      window.Platform = mod[info.Platform.name];
    else
      self.Platform = mod[info.Platform.name]; // WorkerGlobalScope

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

