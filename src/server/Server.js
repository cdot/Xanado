/*Copyright (C) 2019-2023 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

/* global assert */
/* global Platform */

import URL from 'url';

import { promises as Fs } from "fs";
import Path from "path";
const __dirname = Path.dirname(URL.fileURLToPath(import.meta.url));
const staticRoot = Path.normalize(Path.join(__dirname, "..", ".."));

import Cors from "cors";
import Express from "express";

import { CBOR } from "../game/CBOR.js";
import { Game } from "../game/Game.js";
import { Edition } from "../game/Edition.js";
import { BackendGame } from "../backend/BackendGame.js";
import { FileDatabase } from "./FileDatabase.js";
import { UserManager } from "./UserManager.js";

const Player = BackendGame.CLASSES.Player;

/**
 * In the event of an error in a chain handling a request,
 * generate an appropriate response for the client and throw
 * an error that is marked as "isHandled". The unhandledRejection
 * below will recognise this.
 * @param {Response} res the response object
 * @param {number} status HTTP status code
 * @param {string} essage error message
 * @param {Error?} error optional existing error
 * @private
 */
function replyAndThrow(res, status, message, error) {
  res.status(status).send(message);
  if (!error)
    error = new Error(message);
  error.isHandled = true;
  throw error;
}

/**
 * Send a 200 reply
 * @param {object} data data to send
 * @private
 */
function reply(res, data) {
  res.status(200).send(data);
  return undefined;
}

/**
 * Web server for crossword game. Errors will result in an
 * appropriate status code:
 * * 404 - usually a file read error
 * * 500 internal server error e.g. an assert
 *
 * Routes supported:
 * * `GET /` - Get the HTML for the game management interface
 * * {@linkcode Server#GET_defaults|`GET /defaults/:type`}
 * * {@linkcode Server#GET_dictionaries|GET /dictionaries}
 * * {@linkcode Server#GET_editions|GET /editions}
 * * {@linkcode Server#GET_edition|GET /edition/:edition}
 * * {@linkcode Server#GET_games|GET /games/:send}
 * * {@linkcode Server#GET_game|GET /game/:gameKey}
 * * {@linkcode Server#GET_history|GET /history}
 * * {@linkcode Server#GET_locales|GET /locales}
 * * {@linkcode Server#GET_css|GET /css}
 * * {@linkcode Server#GET_POST_join|GET /join/:gameKey}
 * * {@linkcode Server#GET_POST_join|POST /join/:gameKey}
 * * {@linkcode Server#POST_addRobot|POST /addRobot/:gameKey}
 * * {@linkcode Server#POST_anotherGame|POST /anotherGame/:gameKey}
 * * {@linkcode Server#POST_createGame|POST /createGame}
 * * {@linkcode Server#POST_deleteGame|POST /deleteGame/:gameKey}
 * * {@linkcode Server#POST_invitePlayers|POST /invitePlayers/:gameKey}
 * * {@linkcode Server#POST_leave|POST /leave/:gameKey}
 * * {@linkcode Server#POST_removeRobot|POST /removeRobot/:gameKey}
 * * {@linkcode Server#POST_sendReminder|POST /sendReminder/:gameKey}
 * * {@linkcode Server#POST_command|POST /command/:command/:gameKey}
 *
 * See also {@link UserManager} for other user management routes.
 */
class Server {

  /**
   * @param {Object} config See CONFIGURATION.md
   */
  constructor(config) {

    /**
     * Cache of configuration
     * @member {object}
     * @private
     */
    this.config = config;

    /* c8 ignore next 2 */
    if (/^(server|all)$/i.test(config.debug))
      this.debug = console.debug;

    // Add a couple of dynamically computed defaults that need to
    // be sent with /defaults/:user
    config.user_defaults.canEmail = (typeof config.mail !== "undefined");
    config.user_defaults.notification = config.user_defaults.notification &&
    (typeof config.https !== "undefined");

    /**
     * Games database
     * @member {Database}
     * @private
     */
    this.db = new FileDatabase({
      dir: config.games, ext: "game", typeMap: BackendGame
    });

    /**
     * Map from game key to Game. Games in this map have been loaded
     * from the DB (loadGameFromDB has been called for them)
     * @member {object.<string,Game>}
     * @private
     */
    this.games = {};

    /**
     * Status-monitoring channels (connections to games pages). Monitors
     * watch a subset of activity in ALL games.
     * @member {Channel[]}
     * @private
     */
    this.monitors = [];

    // The unhandledrejection event is sent to the global scope of
    // a script when a Promise that has no catch is rejected, and
    // we want to detect that case.

    /* c8 ignore start */
    process.on("unhandledRejection", reason => {
      // Our Express handlers have some long promise chains, and we want
      // to be able to abort those chains on an error. To do this we
      // `throw` an `Error` that has `isHandled` set. That error will
      // cause an unhandledRejection, but that's OK, we can just ignore it.
      if (reason && reason.isHandled)
        return;

      console.error("unhandledRejection", reason, reason ? reason.stack : "");
    });
    /* c8 ignore stop */

    /**
     * Express server
     * @member {Express}
     * @private
     */
    this.express = new Express();

    // Headers not added by passport?
    this.express.use(Cors());

    // Parse incoming requests with url-encoded payloads
    this.express.use(Express.urlencoded({ extended: true }));

    // Parse incoming requests with a JSON body
    this.express.use(Express.json());

    // Grab all static files relative to the project root
    // html, images, css etc. The Content-type should be set
    // based on the file mime type (extension) but Express doesn't
    // always get it right.....
    /* c8 ignore next 2 */
    if (this.debug) {
      this.debug("static files from", staticRoot);
      this.debug("\t- html will be served from", this.config.html_dir);
    }

    this.express.use(Express.static(staticRoot));

    // Debug report incoming requests
    this.express.use((req, res, next) => {
      /* c8 ignore next 2 */
      if (this.debug)
        this.debug("f>s", req.method, req.url);
      next();
    });

    /**
     * User manager, handles signins etc.
     * @member {UserManager}
     * @private
     */
    this.userManager = new UserManager(config, this.express);

    // Create a router for game commands
    const cmdRouter = Express.Router();

    cmdRouter.get(
      "/",
      (req, res) => res.sendFile(
        Path.join(staticRoot, this.config.html_dir, "client_games.html"),
        err => {
          if (err)
            console.error(err, "\n*** Did you forget to npm run build? ***");
        }
      ));

    cmdRouter.get(
      "/games/:send",
      (req, res) => this.GET_games(req, res));

    cmdRouter.get(
      "/history",
      (req, res) => this.GET_history(req, res));

    cmdRouter.get(
      "/locales",
      (req, res) => this.GET_locales(req, res));

    cmdRouter.get(
      "/editions",
      (req, res) => this.GET_editions(req, res));

    cmdRouter.get(
      "/edition/:edition",
      (req, res) => this.GET_edition(req, res));

    cmdRouter.get(
      "/dictionaries",
      (req, res) => this.GET_dictionaries(req, res));

    cmdRouter.get(
      "/css",
      (req, res) => this.GET_css(req, res));

    cmdRouter.get(
      "/defaults/:type",
      (req, res) => this.GET_defaults(req, res));

    cmdRouter.get(
      "/game/:gameKey",
      (req, res) => this.GET_game(req, res));

    cmdRouter.get(
      "/join/:gameKey",
      (req, res) => this.GET_POST_join(req, res));

    cmdRouter.post(
      "/createGame",
      (req, res, next) =>
      this.userManager.checkLoggedIn(req, res, next),
      (req, res) => this.POST_createGame(req, res));

    cmdRouter.post(
      "/invitePlayers/:gameKey",
      (req, res, next) =>
      this.userManager.checkLoggedIn(req, res, next),
      (req, res) => this.POST_invitePlayers(req, res));

    cmdRouter.post(
      "/deleteGame/:gameKey",
      (req, res, next) =>
      this.userManager.checkLoggedIn(req, res, next),
      (req, res) => this.POST_deleteGame(req, res));

    cmdRouter.post(
      "/anotherGame/:gameKey",
      (req, res, next) =>
      this.userManager.checkLoggedIn(req, res, next),
      (req, res) => this.POST_anotherGame(req, res));

    cmdRouter.post(
      "/sendReminder/:gameKey",
      (req, res, next) =>
      this.userManager.checkLoggedIn(req, res, next),
      (req, res) => this.POST_sendReminder(req, res));

    cmdRouter.post(
      "/join/:gameKey",
      (req, res, next) =>
      this.userManager.checkLoggedIn(req, res, next),
      (req, res) => this.GET_POST_join(req, res));

    cmdRouter.post(
      "/leave/:gameKey",
      (req, res, next) =>
      this.userManager.checkLoggedIn(req, res, next),
      (req, res) => this.POST_leave(req, res));

    cmdRouter.post(
      "/addRobot/:gameKey",
      (req, res, next) =>
      this.userManager.checkLoggedIn(req, res, next),
      (req, res) => this.POST_addRobot(req, res));

    cmdRouter.post(
      "/removeRobot/:gameKey",
      (req, res, next) =>
      this.userManager.checkLoggedIn(req, res, next),
      (req, res) => this.POST_removeRobot(req, res));

    cmdRouter.post(
      "/command/:command/:gameKey",
      (req, res, next) =>
      this.userManager.checkLoggedIn(req, res, next),
      (req, res) => this.POST_command(req, res));

    this.express.use(cmdRouter);

    // Install default error handler. err.message will appear as
    // responseText in the ajax error function.
    this.express.use((err, req, res, next) => {
      if (res.headersSent)
        return next(err);
      /* c8 ignore next 2 */
      if (this.debug)
        this.debug("<-- 500", err);
      return res.status(500).send(err.message);
    });
  }

  /**
   * Load the game from the DB, if not already in server memory
   * @param {string} key game key
   * @return {Promise} Promise that resolves to a {@linkcode Game}
   * @throws Error on a load failure
   * @private
   */
  loadGameFromDB(key) {
    /* c8 ignore next 2 */
    if (typeof key === "undefined")
      return Promise.reject("Game key is undefined");
    if (this.games[key])
      return Promise.resolve(this.games[key]);

    return this.db.get(key)
    .then(d => CBOR.decode(d, BackendGame.CLASSES))
    .then(game => game.onLoad(this.db))
    .then(game => game.checkAge(this.config.maxAge))
    .then(game => {
      this.games[key] = game;
      /* c8 ignore next 2 */
      if (/^(game|all)$/i.test(this.config.debug))
        game._debug = console.debug;

      return game.playIfReady();
    });
  }

  /**
   * Handle a `connect` coming over a socket.
   * Player or monitor connecting.
   * @param {socket.io} socket the socket
   * @private
   */
  socket_connect() {
    /* c8 ignore next 2 */
    if (this.debug)
      this.debug("f>s connect");
    this.updateMonitors();
  }

  /**
   * Handle a `disconnect` coming over a socket. Player or monitor
   * disconnecting. Don't need to refresh players using this
   * socket, because each Game has a 'disconnect' listener on each
   * of the sockets being used by players of that game.
   * @param {socket.io} socket the socket
   * @private
   */
  socket_disconnect(socket) {
    /* c8 ignore next 2 */
    if (this.debug)
      this.debug("f>s disconnect");

    // Remove any monitor using this socket
    const i = this.monitors.indexOf(socket);
    if (i >= 0) {
      // Game monitor has disconnected
      /* c8 ignore next 2 */
      if (this.debug)
        this.debug("\tmonitor disconnected");
      this.monitors.slice(i, 1);
    } else
      /* c8 ignore next 2 */
      if (this.debug)
        this.debug("\tanonymous disconnect");
    this.updateMonitors();
  }

  /**
   * Handle game monitor (games interface) ann9ouncing on
   * a socket.
   * @param {socket.io} socket the socket
   * @private
   */
  socket_monitor(socket) {
    /* c8 ignore next 2 */
    if (this.debug)
      this.debug("f>s monitor");
    this.monitors.push(socket);
  }

  /**
   * Handle a player (or observer) joining (or re-joining).
   * When the game interface is opened in a browser, the
   * interface initiates a channel connection. The channel then
   * sends `connect` to the UI. `JOIN` is then sent by the UI,
   * which connects the UI to the game. The UI may subsequently
   * die; which is OK, the server just keeps telling them what
   * is going on until it sees a `disconnect`.
   * @param {socket.io} socket the socket
   * @param {object} params Game.Notify.JOIN message parameters
   * @param {Key} params.gameKey game to join key
   * @param {Key} params.playerKey joining player key
   * @private
   */
  socket_join(socket, params) {
    /* c8 ignore next 2 */
    if (this.debug)
      this.debug(
      "f>s join", params.playerKey, "joining", params.gameKey);
    this.loadGameFromDB(params.gameKey)
    .then(game => {
      return game.connect(socket, params.playerKey)
      .then(() => {
        // Tell everyone in the game
        game.sendCONNECTIONS();
        // Tell games pages
        this.updateMonitors();
      });
    })
    /* c8 ignore start */
    .catch(e => {
      console.error("socket join error:", e);
    });
    /* c8 ignore stop */
  }

  /**
   * Handle a `MESSAGE` notification coming from a player.
   * @param {socket.io} socket the socket
   * @param {string} message the message. This is a text string,
   * which is normally passed on to other players. There are
   * some special commands: `hint` will asynchrnously generate
   * a hint for the current player, while `advise` will toggle
   * post-play analysis. `allow` is used to add a word to the
   * dictionary whitelist.
   * @private
   */
  socket_message(socket, message) {

    if (!socket.game)
      return;

    // Chat message
    /* c8 ignore next 2 */
    if (this.debug)
      this.debug("f>s message", message);
    const mess = message.text.split(/\s+/);
    const verb = mess[0];

    switch (verb) {

    case "autoplay":
      // Tell *everyone else* that they asked for a hint
      socket.game.notifyOthers(socket.player, BackendGame.Notify.MESSAGE, {
        sender: /*i18n*/"Advisor",
        text: /*i18n*/"played-for",
        classes: "warning",
        args: [ socket.player.name ]
      });
      socket.game.autoplay();
      break;

    case "hint":
      socket.game.hint(socket.player);
      break;

    case "advise":
      socket.game.toggleAdvice(socket.player);
      break;

    case "allow":
      socket.game.allow(socket.player, mess[1]);
      break;

    default:
      socket.game.notifyAll(BackendGame.Notify.MESSAGE, message);
    }
  }

  /**
   * Attach the handlers for incoming socket messages from the UI.
   * @param {socket.io} socket the socket to listen to
   * @private
   */
  attachSocketHandlers(socket) {
    socket
    .on("connect", () => this.socket_connect(socket))
    .on("disconnect", () => this.socket_disconnect(socket))
    .on(BackendGame.Notify.MONITOR, () => this.socket_monitor(socket))
    .on(BackendGame.Notify.JOIN, params => this.socket_join(socket, params))
    .on(BackendGame.Notify.MESSAGE, message => this.socket_message(socket, message));
  }

  /**
   * Notify monitors that something about the game has
   * changed requiring an update..
   * @private
   */
  updateMonitors() {
    /* c8 ignore next 2 */
    if (this.debug)
      this.debug("b>f update *");
    this.monitors.forEach(socket => socket.emit(BackendGame.Notify.UPDATE));
  }

  /**
   * @param {object} to a lookup suitable for use with UserManager.getUser
   * @param {Request} req the request object
   * @param {Response} res the response object
   * @param {string} gameKey game to which this applies
   * @param {string} subject subject
   * @param {string} text email text
   * @param {string} html email html
   * @return {Promise} Promise that resolves to the user that was mailed,
   * either their game name or their email if there is no game name.
   * @private
   */
  sendMail(to, req, res, gameKey, subject, text, html) {
    assert(this.config.mail && this.config.mail.transport,
           "Mail is not configured");
    return this.userManager.getUser(
      { key: req.session.passport.user.key })
    .then(sender => `${sender.name}<${sender.email}>`)
    /* c8 ignore start */
    .catch(
      // should never happen so long as only signed-in
      // users can send mail
      () => this.config.mail.sender)
    /* c8 ignore stop */
    .then(sender =>
          new Promise(
            resolve => this.userManager.getUser(to, true)
            .catch(() => {
              // Not a known user, rely on email in the
              // getUser query
              resolve({
                name: to.email, email: to.email
              });
            })
            .then(uo => resolve(uo)))
          .then(uo => {
            if (!uo.email) // no email
              return Platform.i18n("txt-has-no-email",
                                   uo.name || uo.key);
            /* c8 ignore next 2 */
            if (this.debug)
              this.debug(subject, `${uo.name}<${uo.email}> from `, sender);
            return this.config.mail.transport.sendMail({
              from: sender,
              to: uo.email,
              subject: subject,
              text: text,
              html: html
            })
            .then(() => uo.name || uo.email);
          }));
  }

  /**
   * Get a simplified version of games or a single game (no board,
   * bag etc) for the "games" page. You can request "active" games
   * (those still in play), "all" games (for finished games too),
   * or a single game key. c.f. /game/:gameKey, which is used to
   * get a full Game.
   * @param {Request} req the request object
   * @param {string} req.params.send a single game key to
   * get a single game, `active` to get active games, or `all`
   * to get all games, including finished games.
   * @param {Response} res the response object. The response body is
   * a list of objects generated by
   * {@linkcode Game#sendable|Game.sendable()}
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  GET_games(req, res) {
    const send = req.params.send;

    // Make list of keys we are interested in
    return ((send === "all" || send === "active")
            ? this.db.keys()
            : Promise.resolve([send]))

    // Load those games
    .then(keys => Promise.all(
      keys.map(
        key => this.loadGameFromDB(key)
        .catch(e => {
          console.error("Failed to load", key, e);
          return undefined;
        }))))

    // Filter the list and generate simple data
    .then(games => games.filter(game => game
                                && !(send === "active" && game.hasEnded())))

    .then(games => Promise.all(
      games.map(game => game.sendable(this.userManager))))
    
    // Sort the resulting list by last activity, so the most
    // recently active game bubbles to the top
    .then(games => games.sort((a, b) => a.lastActivity < b.lastActivity ? 1
                              : a.lastActivity > b.lastActivity ? -1 : 0))
          
    // Finally send the result
    .then(games => reply(res, games));
  }

  /**
   * Sends a summary of cumulative player scores to date, for all
   * unique players.
   * @param {Request} req the request object
   * @param {Response} res the response object. The response body
   * is a list of objects, each with keys as follows:
   * * key: player key
   * * name: player name
   * * score: total cumulative score
   * * wins: number of wins
   * * games: number of games played
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  GET_history(req, res) {
    return this.db.keys()
    .then(keys => keys.map(key => this.loadGameFromDB(key)
                           .catch(() => undefined)))
    .then(promises => Promise.all(promises))
    .then(games => games.filter(game => game && game.hasEnded()))
    .then(games => {
      const results = {};
      games
      .map(game => {
        const winScore = game.winningScore();
        game.getPlayers().forEach(
          player => {
            let result = results[player.key];
            if (!result) {
              results[player.key] =
              result = {
                key: player.key,
                name: player.name,
                score: 0,
                wins: 0,
                games: 0
              };
            }
            result.games++;
            if (player.score === winScore)
              result.wins++;
            result.score += player.score;
          });
      });
      const list = [];
      for (let name in results)
        list.push(results[name]);
      return list;
    })
    .then(list => list.sort((a, b) => a.score < b.score ? 1
                            : (a.score > b.score ? -1 : 0)))
    .then(list => reply(res, list));
  }

  /**
   * Sends a list of available translation locales, as read from the
   * `/i18n` directory.
   * @param {Request} req the request object
   * @param {Response} res the response object. The response body
   * will be a list of locale name strings.
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  GET_locales(req, res) {
    return Fs.readdir(Path.join(staticRoot, "i18n"))
    .then(list => reply(
      res, list.filter(f => f !== "index.json" && /^.*\.json$/.test(f))
      .map(fn => fn.replace(/\.json$/, ""))));
  }

  /**
   * Sends a list of available editions.
   * @param {Request} req the request object
   * @param {Response} res the response object. The response body
   * will be a list of edition name strings.
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  GET_editions(req, res) {
    return Fs.readdir(Path.join(staticRoot, "editions"))
    .then(list => reply(
      res, list.filter(f => f !== "index.json" && /^.*\.json$/.test(f))
      .map(fn => fn.replace(/\.json$/, ""))));
  }

  /**
   * Get the named edition.
   * @param {Request} req the request object
   * @param {string} req.params.edition name of edition to send
   * @param {Response} res the response object. The response body
   * will be the JSON for the edition.
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  GET_edition(req, res) {
    return Edition.load(req.params.edition)
    .then(edition => reply(res, edition));
  }

  /**
   * Get a list of the available dictionaries.
   * @param {Request} req the request object
   * @param {Response} res the response object. The response body
   * will be a list of available dictionary name strings.
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  GET_dictionaries(req, res) {
    return Fs.readdir(Path.join(staticRoot, "dictionaries"))
    .then(list => reply(res,
                        list.filter(f => /\.dict$/.test(f))
                        .map(fn => fn.replace(/\.dict$/, ""))));
  }

  /**
   * Sends a list of the available css.
   * @param {Request} req the request object
   * @param {Response} res the response object. The response will be
   * a list of css files.
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  GET_css(req, res) {
    return Fs.readdir(Path.join(staticRoot, "css"))
    .then(list => reply(res,
                        list.filter(f => /\.css$/.test(f))
                        .map(f => f.replace(/\.css$/, ""))));
  }

  /**
   * Create a new game.
   * @param {Request} req the request object. The body will contain
   * the parameters to pass to the {@linkcode Game} constructor.
   * @param {Response} res the response object
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent. The response is the game key of
   * the new game.
   */
  POST_createGame(req, res) {
    return Edition.load(req.body.edition)
    .then(() => new BackendGame(req.body).create())
    .then(game => game.onLoad(this.db))
    .then(game => {
      /* c8 ignore next 2 */
      if (/^(game|all)$/i.test(this.config.debug))
        game._debug = console.debug;
      /* c8 ignore next 2 */
      if (this.debug)
        this.debug("Created game", game.stringify());
      return game.save();
    })
    .then(game => reply(res, game.key))
    .then(() => this.updateMonitors());
  }

  /**
   * Invite players by email. Parameters are passed in the request body.
   * This wil ldo nothing if the server is not configured to send
   * email.
   * @param {Request} req the request object
   * @param {string} req.params.gameKey the game key
   * @param {Response} res the response object
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  POST_invitePlayers(req, res) {
    assert(this.config.mail && this.config.mail.transport,
           "Mail is not configured");
    assert(req.body.player, "Nobody to notify");
    const gameKey = req.params.gameKey;
    const gameURL =
          `${req.protocol}://${req.get("Host")}/html/client_games.html?untwist=${gameKey}`;
    let textBody = (req.body.message || "") + "\n" + Platform.i18n(
      "txt-join-game", gameURL);
    // Handle XSS risk posed by HTML in the textarea
    let htmlBody = (req.body.message.replace(/</g, "&lt;") || "")
        + "<br>" + Platform.i18n(
          "eml-html-link", gameURL);
    let subject = Platform.i18n("eml-invited");
    return Promise.all(req.body.player.map(
      to => this.sendMail(
        to, req, res, req.body.gameKey,
        subject, textBody, htmlBody)))
    .then(list => reply(res, list.filter(uo => uo)));
  }

  /**
   * Email reminders to next human player in (each) game
   * @param {Request} req the request object
   * @param {string} req.params.gameKey the game key
   * @param {Response} res the response object. The response body
   * will be a list of the player names (or email, if they have no
   * player name) of players who have been notified.
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  POST_sendReminder(req, res) {
    const gameKey = req.params.gameKey;
    /* c8 ignore next 2 */
    if (this.debug)
      this.debug("Sending turn reminders to", gameKey);
    const gameURL =
          `${req.protocol}://${req.get("Host")}/game/${gameKey}`;

    const prom = (gameKey === "*")
          ? this.db.keys() : Promise.resolve([gameKey]);

    return prom
    .then(keys => Promise.all(keys.map(
      key => (this.games[key]
              ? Promise.resolve(this.games[key])
              : this.db.get(key)
              .then(d => CBOR.decode(d, BackendGame.CLASSES)))
      .then(game => {
        game.checkAge(this.config.maxAge);
        if (game.hasEnded())
          return undefined;

        const player = game.getPlayer();
        if (!player)
          return undefined;
        /* c8 ignore next 2 */
        if (this.debug)
          this.debug("Sending reminder mail to", `${player.name}/${player.key}`);

        const subject = Platform.i18n("eml-remind");
        const textBody = Platform.i18n("eml-text-link", gameURL);
        const htmlBody = Platform.i18n("eml-html-link", gameURL);
        return this.sendMail(
          player, req, res, game.key,
          subject, textBody, htmlBody);
      }))))
    .then(reminders => reminders.filter(e => typeof e !== "undefined"))
    .then(names => reply(res, names));
  }

  /**
   * Player wants to join a game. Requested by the games interface,
   * and by the "Next game" button in the game UI. It ensures the
   * game is loaded and adds the player indicated by the session
   * indicated in the request (if necessary).
   * @param {Request} req the request object
   * @param {string} req.params.gameKey the game key
   * @param {Response} res the response object. The response body
   * will be the URL of the game.
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  GET_POST_join(req, res) {
    const gameKey = req.params.gameKey;
    let prom, pram;
    return this.loadGameFromDB(gameKey)
    .catch(e => replyAndThrow(res, 400, `Game ${gameKey} load failed`, e))
    .then(game => {
      if (req.user) { // signed-in user
        const playerKey = req.user.key;
        let player = game.getPlayerWithKey(playerKey);
        if (player) {
          // Known player is connecting
          /* c8 ignore next 2 */
          if (this.debug)
            this.debug("Player", playerKey, "opening", gameKey);
          prom = game.playIfReady();
        } else {
          // New player is joining
          /* c8 ignore next 2 */
          if (this.debug)
            this.debug("Player", playerKey, "joining", gameKey);
          player = new Player(
            { name: req.user.name, key: playerKey }, BackendGame.CLASSES);
          game.addPlayer(player, true);
          prom = game.save()
          .then(game => game.playIfReady());
        }
        pram = `player=${playerKey}`;
      } else if (req.query && typeof req.query.observer !== "undefined") {
        // Observer is joining
        pram = `observer=${encodeURI(req.query.observer)}`;
        prom = Promise.resolve();
      } else {
        replyAndThrow(res, 400, "Not signed in and no observer");
      }

      // Work out the URL for the game interface
      const url = URL.format({
        protocol: req.protocol,
        host: req.get('Host'),
        pathname: req.originalUrl
        .replace(/\/.*?$/, `/${this.config.html_dir}/client_game.html`),
        search: `?game=${game.key}&${pram}`
      });

      return prom
      .then(() => reply(res, url));
      // Don't need to send connections, that will be done
      // in the connect event handler
    });
  }

  /**
   * Add a robot to the game.  It's an error to add a robot to a
   * game that already has a robot.
   * @param {Request} req the request object
   * @param {string} req.params.gameKey the game key
   * @param {string} req.body.dictionary optional dictionary name to
   * use for generating robot plays. May be `non` for no dictionary.
   * @param {Response} res the response object. The response body will
   * be the robot player key.
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  POST_addRobot(req, res) {
    const gameKey = req.params.gameKey;
    const dic = req.body.dictionary;
    return this.loadGameFromDB(gameKey)
    .catch(e => replyAndThrow(res, 400, `Game ${gameKey} load failed`, e))
    .then(game => {
      if (game.hasRobot())
        replyAndThrow(res, 400, `Game ${gameKey} already has a robot`);

      /* c8 ignore next 2 */
      if (this.debug)
        this.debug("Robot joining", gameKey, "with", dic);
      // Robot always has the same player key
      const robot = new Player({
        name: "Robot",
        key: UserManager.ROBOT_KEY,
        isRobot: true,
        canChallenge: req.body.canChallenge,
        delayBeforePlay: parseInt(req.body.delayBeforePlay || "0")
      }, BackendGame.CLASSES);
      /* c8 ignore start */
      if (dic && dic !== "none")
        robot.dictionary = dic;
      /* c8 ignore stop */
      game.addPlayer(robot, true);
      return game.save()
      // Game may now be ready to start
      .then(() => game.playIfReady())
      .then(() => {
        this.updateMonitors();
        game.sendCONNECTIONS();
      })
      .then(() => reply(res, robot.key));
    });
  }

  /**
   * Remove the robot from a game. Will throw an error if the game doesn't
   * have a robot.
   * @param {Request} req the request object
   * @param {string} req.params.gameKey the game key
   * @param {Response} res the response object. The response body will
   * be the removed robot player key.
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  POST_removeRobot(req, res) {
    const gameKey = req.params.gameKey;
    return this.loadGameFromDB(gameKey)
    .catch(e => replyAndThrow(res, 400, `Game ${gameKey} load failed`, e))
    .then(game => {
      const robot = game.hasRobot();
      if (!robot)
        replyAndThrow(res, 400, `Game ${gameKey} doesn't have a robot`);
      /* c8 ignore next 2 */
      if (this.debug)
        this.debug("Robot leaving", gameKey);
      game.removePlayer(robot);
      return game.save()
      // Game may now be ready to start
      .then(game => game.playIfReady())
      .then(() => {
        game.sendCONNECTIONS();
        this.updateMonitors();
      })
      .then(() => reply(res, robot.key));
    });
  }

  /**
   * Handle /leave/:gameKey player leaving a game.
   * @param {Request} req the request object
   * @param {string} req.params.gameKey the game key
   * @param {Response} res the response object
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  POST_leave(req, res) {
    const gameKey = req.params.gameKey;
    const playerKey = req.user.key;
    return this.loadGameFromDB(gameKey)
    .catch(e => replyAndThrow(res, 400, `Game ${gameKey} load failed`, e))
    .then(game => {
      const player = game.getPlayerWithKey(playerKey);
      if (!player)
        replyAndThrow(res, 400, `Player ${playerKey} is not in game ${gameKey}`);
      /* c8 ignore next 2 */
      if (this.debug)
        this.debug("Player", playerKey, "leaving", gameKey);
      // Note that if the player leaving dips the number
      // of players below minPlayers for the game, the
      // game state is reset to WAITING
      game.removePlayer(player);
      return game.save()
      .then(() => reply(res, `${playerKey} removed`))
      .then(() => this.updateMonitors());
    });
  }

  /**
   * Send the `defaults` section of the server configuration.
   * @param {Request} req the request object
   * @param {string} req.params.type the defaults type, `user` or `game`.
   * @param {Response} res the response object. The body will be
   * the defaults object from the server configuration file.
   */
  GET_defaults(req, res) {
    const type = req.params.type;
    reply(res, this.config[`${type}_defaults`]);
  }

  /**
   * This is designed for use when opening the `game` interface.
   * The game is encoded as {@linkcode CBOR} before sending to fully
   * encode the entire {@linkcode Game} object, including the
   * {@linkcode Player}s, {@linkcode Turn} history, and the {@linkcode Board}
   * so they can be recreated client-side. Subsequent commands and
   * notifications maintain the client-side game object incrementally
   * to keep them in synch with the server Game object.
   * @param {Request} req the request object
   * @param {string} req.params.gameKey the game key
   * @param {Response} res the response object
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  GET_game(req, res) {
    const gameKey = req.params.gameKey;
    return this.db.get(gameKey)
    .then(d => CBOR.decode(d, Game.CLASSES))
    .catch(e => replyAndThrow(res, 400, `Game ${gameKey} load failed`, e))
    .then(game => {
      res.status(200);
      res.write(CBOR.encode(game, BackendGame.CLASSES), "binary");
      res.end(null, "binary");
    });
  }

  /**
   * Delete a game.
   * @param {Request} req the request object
   * @param {string} req.params.gameKey the game key
   * @param {Response} res the response object. The response body
   * will be the deleted game key.
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  POST_deleteGame(req, res) {
    const gameKey = req.params.gameKey;
    return this.loadGameFromDB(gameKey)
    .catch(e => replyAndThrow(res, 400, `Game ${gameKey} load failed`, e))
    .then(game => {
      /* c8 ignore next 2 */
      if (this.debug)
        this.debug("Delete game", gameKey);
      game.stopTheClock(); // in case it's running
      return this.db.rm(gameKey)
      .then(() => reply(res, gameKey))
      .then(() => this.updateMonitors());
    });
  }

  /**
   * Create another game with the same players.
   * Note this is NOT auth-protected, it is invoked
   * from the game interface to create a follow-on game
   * @param {Request} req the request object
   * @param {string} req.params.gameKey the game key
   * @param {Response} res the response object. The response body
   * will be the follow-on game key.
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  POST_anotherGame(req, res) {
    const gameKey = req.params.gameKey;
    return this.loadGameFromDB(gameKey)
    .catch(e => replyAndThrow(res, 400, `Game ${gameKey} load failed`, e))
    .then(game => game.anotherGame())
    .then(newGame => reply(res, newGame.key));
  }

  /**
   * Handle /command/:command/:gameKey. Command results are broadcast
   * in Turn objects.
   * @param {Request} req the request object
   * @param {string} req.params.command the command, one of
   * Game.Command
   * @param {string} req.params.gameKey the game key
   * @param {Response} res the response object
   * @return {Promise} promise that resolves to undefined
   * when the response has been sent.
   */
  POST_command(req, res) {
    const command = req.params.command;
    const gameKey = req.params.gameKey;
    const playerKey = req.user.key;
    //if (this.debug)
    //  this.debug("Handling", command, gameKey, playerKey);
    return this.loadGameFromDB(gameKey)
    .catch(e => replyAndThrow(res, 400, `Game ${gameKey} load failed`, e))
    .then(game => {
      if (game.hasEnded() && command !== BackendGame.Command.UNDO)
        replyAndThrow(res, 400, `Game ${gameKey} has ended`);
      const player = game.getPlayerWithKey(playerKey);
      if (!player)
        replyAndThrow(res,
                      400, `Player ${playerKey} is not in game ${gameKey}`);

      // The command name and arguments
      const args = req.body;

      // Add a timestamp, unless the sender provided one
      if (typeof req.body.timestamp === "undefined")
        req.body.timestamp = Date.now();
      return game.dispatchCommand(command, player, args);
    })
    .then(() => {
      // Notify games pages
      this.updateMonitors();
      reply(res, `/command/${command}/${gameKey}/${playerKey} handled`);
    });
  }
}

export { Server }
