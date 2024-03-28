/*Copyright (C) 2019-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/* global Platform, document, URL */

/* eslint-disable */
// eslint (or more likely the import plugin) complains:
/* eslint-enable */
/* global Worker, assert */

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

  let initialise; // promise that must resolve to "Worker" if node.js
  let importmap;

  if (typeof document !== "undefined")
    importmap = document.querySelector('script[type="importmap"]');

  if (Platform.name === "ServerPlatform") {
    // node.js
    initialise = import(
      /* webpackMode: "lazy" */
      /* webpackChunkName: "web-worker" */
      "web-worker")
    .then(mod => mod.default);
    
  } else {
    // browser, NodeWorker not required
    initialise = Promise.resolve(undefined);
  }

  return initialise.then(NodeWorker => new Promise((resolve, reject) => {
    let worker, usingShim = false;

    if (typeof NodeWorker !== "undefined") {
      //console.debug("NODE.JS, NO SHIM");
      // This is node.js, we can invoke the worker directly
      worker = new NodeWorker(
        new URL("./findBestPlayWorker.js", import.meta.url),
        { type: "module" });
    }
    else {
      // This is a browser
      if (importmap) {
        //console.debug("BROWSER, USING SHIM");
        // This is an un-webpacked browser, we have to indirect via
        // findBestPlayWorkerShim, which will shim the importmap
        worker = new Worker(new URL(
          "../browser/findBestPlayWorkerShim.js", import.meta.url));
        usingShim = true;
      } else {
        //console.debug("WEBPACKED BROWSER, NO SHIM");
        // This is a webpacked browser, we can invoke the worker directly
        worker = new Worker(new URL(
          /* webpackMode: "lazy" */
          /* webpackChunkName: "findBestPlayWorker" */
          "./findBestPlayWorker.js", import.meta.url));
      }
    }

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
      info.Platform = "ServerPlatform";
    else
      info.Platform = "WorkerPlatform";

    function sendGame() {
      worker.postMessage(CBOR.encode(info, BackendGame.CLASSES));
    }

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

    if (usingShim)
      // The shim requires the importmap to be sent before it loads
      // findBestPlayWorker. It will then respond with "R" which will
      // be handler in the messageHandler
      worker.postMessage(importmap.textContent);
    else
      sendGame();
  }));
}

export { findBestPlay }
