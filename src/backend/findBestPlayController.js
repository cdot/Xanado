/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/* global Platform */

/* eslint-disable */
// eslint (or more likely the import plugin) complains:
// "No default export found in imported module "web-worker""
// but it works fine.
import Worker from "web-worker";
/* eslint-enable */

import { BackendGame } from "./BackendGame.js";
import { CBOR } from "../game/CBOR.js";

/** @module */

/**
 * This is the controller side of a best play thread.
 * Interface is the same as for {@linkcode findBestPlay} so they
 * can be switched in and out.
 */
function findBestPlay(
  game, letters, listener, dictionary) {

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./findBestPlayWorker.js", import.meta.url),
      { type: "module" });

    // Apply the game time limit
    let timer;
    if (game.timerType === BackendGame.Timer.TURN) {
      timer = setTimeout(() => {
        console.error("findBestPlay timed out");
        worker.terminate();
      }, game.timeAllowed * 60000);
    }

    // Pass worker messages on to listener
    worker.addEventListener("message", data => {
      // TODO: decode the packed game
      const mess = CBOR.decode(data.data, BackendGame.CLASSES);
      switch (mess.type) {
      case "play":
        listener(mess.data);
        break;
      case "exit":
        if (timer)
          clearTimeout(timer);
        resolve();
        break;
      }
    });

    /* c8 ignore start */
    worker.addEventListener("error", e => {
      console.error("Worker:", e.message, e.filename, e.lineno);
      if (timer)
        clearTimeout(timer);
      reject();
    });
    /* c8 ignore stop */

    worker.postMessage(CBOR.encode({
      Platform: Platform.name,
      game: game,
      rack: letters,
      dictionary: dictionary
    }, BackendGame.CLASSES));
  });
}

export { findBestPlay }

