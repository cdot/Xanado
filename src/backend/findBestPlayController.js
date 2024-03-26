/*Copyright (C) 2019-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/* global Platform, document */

/* eslint-disable */
// eslint (or more likely the import plugin) complains:
/* eslint-enable */
/* global Worker */

import { BackendGame } from "./BackendGame.js";
import { CBOR } from "../game/CBOR.js";

/** @module */

/**
 * This is the controller side of a best play thread.
 * Interface is the same as for {@linkcode findBestPlay} so they
 * can be switched in and out. However this will time out if the play
 * exceeds a preset time limit.
 */
function findBestPlay(game, letters, listener, dictionary) {

  let initialise, // promise that must resolve to "Worker"
      workerPath,
      isWebWorker = false,
      workerOptions = {}; // path to worker js module

  if (Platform.name === "ServerPlatform") {
    // node.js
    workerPath = "./findBestPlayWorker.js";
    initialise = import( // node.js
      /* webpackMode: "lazy" */
      /* webpackChunkName: "findBestPlayController" */
      "web-worker")
    .then(mod => mod.default);
    workerOptions.type = "module";
  } else {
    // browser
    //console.debug("Using findBestPlayWorkerLoader");
    // To support importmap in the browser, we have to use a shim.
    workerPath = "../browser/findBestPlayWorkerLoader.js";
    initialise = Promise.resolve(Worker);
    isWebWorker = true;
  }

  return initialise.then(Robot => new Promise((resolve, reject) => {
    const mod_url = new URL(workerPath, import.meta.url);
    const worker = new Robot(mod_url, workerOptions);

    let timeLimit = 5000; // 5 seconds default
    if (game.timerType === BackendGame.Timer.TURN)
      // Apply the game time limit
      timeLimit = game.timeAllowed * 60000;

    const timer = setTimeout(() => {
      console.error("findBestPlay timed out");
      worker.terminate();
      resolve();
    }, timeLimit);

    const info = {
      game: game,
      rack: letters,
      dictionary: dictionary
    };

    if (Platform.name === "ServerPlatform")
      // Note: ServerPlatform.js is excluded from webpacking
      // in webpack_config.js
      info.Platform = { data: "../server", name: "ServerPlatform" };
    else
      info.Platform = { data: "../browser", name: "WorkerPlatform" };

    const sendGame = () => worker.postMessage(CBOR.encode(info, BackendGame.CLASSES));

    // Pass worker messages on to listener
    worker.addEventListener("message", e => {
      const data = e.data;

      if (data === "R") {
        // To load findBestPlayWorker in the browser we use a shim which
        // implements onmessage. When the shim has loaded findBestPlayWorker
        // it posts back that it is ready to receive a game.
        //console.debug("Ready received from findBestPlayWorkerLoader");
        sendGame();
        return;
      }

      // Otherwise the message is expected to be a CBOR-encoded object
      const mess = CBOR.decode(data, BackendGame.CLASSES);
      //console.debug("findBestPlayController.onmessage", mess);
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
    worker.addEventListener("messageerror", e => {
      console.error("findBestPlayController: messageerror from worker");
      console.error(e);
    });

    worker.addEventListener("error", (e, f, l) => {
      console.error("findBestPlayController: error from worker");
      console.error(e, f, l);
      if (timer)
        clearTimeout(timer);
      reject();
    });
    /* c8 ignore stop */

    if (isWebWorker)
      // Web workers need the importmap set up before the game is sent
      worker.postMessage(document.querySelector(
        'script[type="importmap"]').textContent);
    else
      sendGame();
  }));
}

export { findBestPlay }
