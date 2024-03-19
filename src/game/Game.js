/*Copyright (C) 2019-2023
 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/* global assert */
/* global Platform */

import { genKey, stringify } from "../common/Utils.js";
import { CBOR } from "./CBOR.js";
import { loadDictionary } from "./loadDictionary.js";
import { Board } from "./Board.js";
import { Edition } from "./Edition.js";
import { LetterBag } from "./LetterBag.js";
import { Move } from "./Move.js";
import { Player } from "./Player.js";
import { Rack } from "./Rack.js";
import { Square } from "./Square.js";
import { Tile } from "./Tile.js";
import { Turn } from "./Turn.js";

/**
 * Class of Game objects. Contains most of the game logic.
 */
class Game {

  /**
   * Factory classes
   * @private
   */
  static CLASSES = {
    Square: Square,
    Tile: Tile,
    Board: Board,
    Game: Game,
    LetterBag: LetterBag,
    Move: Move,
    Player: Player,
    Rack: Rack,
    Turn: Turn
  };

  /**
   * Game states.
   * * `WAITING` - until enough players join the game
   * * `PLAYING` - until the game is over, then one of:
   * * `GAME_OVER` - game was played to end, or
   * * `TWO_PASSES` - all players passed twice, or
   * * `FAILED_CHALLENGE` - a challenge on the final play failed, or
   * * `TIMED_OUT` - game is too old, will be pruned
   * @typedef {WAITING|PLAYING|GAME_OVER|TWO_PASSES|FAILED_CHALLENGE|TIMED_OUT} Game.State
   */
  static State = {
    WAITING:          0,
    PLAYING:          1,
    FAILED_CHALLENGE: 2,
    GAME_OVER:        3,
    TWO_PASSES:       4,
    TIMED_OUT:        5
  };

  ///**
  // * Translation keys for states
  // */
  //static StateI18N = [
  //  "Waiting for players",
  //  "Playing",
  //  "Challenge failed",
  //  "Game over",
  //  "All players passed twice",
  //  "Timed out"
  //];

  // Compatibility; map old strings to new enum
  static StateCompat = {
    "Waiting for players": Game.State.WAITING,
    "Playing": Game.State.PLAYING,
    "Challenge failed": Game.State.FAILED_CHALLENGE,
    "Game over": Game.State.GAME_OVER,
    "All players passed twice": Game.State.TWO_PASSES,
    "Timed out": Game.State.TIMED_OUT
  };

  /**
   * Indicate if we are to use worker threads for move computation or not
   * (default true)
   */
  static USE_WORKERS = true;

  /**
   * Notifications sent between back and front end.
   * * `CONNECTIONS`: list of the currently connected observers
   * * `MESSAGE`: someone has sent a message
   * * `NEXT_GAME`: a follow-on game is available
   * * `PAUSE`: someone paused the game
   * * `REJECT`: a move has been rejected (not found in dictionary)
   * * `TICK`: the game timer has ticked
   * * `TURN`: someone has made a move in the game
   * * `UNDONE`: the last play was undone
   * * `UNPAUSE`: someone has unpaused the game
   * Notifications only sent to games pages by the server
   * * `UPDATE`: a change has been made that requires a monitor update
   * Notifications sent by a game page
   * * `JOIN`: request to join (or observe) the game
   * Notifications sent by games pages (monitors)
   * * `MONITOR`: monitor wants to connect to the server
   * @typedef {UNPAUSE|PAUSE|JOIN|REJECT|MESSAGE|NEXT_GAME|TICK|TURN|CONNECTIONS|UPDATE|MONITOR} Game.Notify
   */
  static Notify = {
    ANOTHER_GAME: "another game",
    CONNECTIONS:  "connections",
    JOIN:         "join game",
    MESSAGE:      "message",
    NEXT_GAME:    "next game",
    PAUSE:        "pause game",
    REJECT:       "reject play",
    TICK:         "tick timer",
    TURN:         "play turn",
    UNDONE:       "undone",
    UNPAUSE:      "unpause",

    /* Notifications sent to monitors (games pages) */
    UPDATE:       "update",
    MONITOR:      "monitor"
  };

  /**
   * Types of game timer
   * * `NONE` - game is untimed
   * * `TURN` - each turn is time-limited
   * * `GAME` - game is time limited, and a points penalty is applied
   * for overtime
   * @typedef {NONE|TURN|GAME} Game.Timer
   */
  static Timer = {
    NONE: 0,
    TURN: 1,
    GAME: 2
  };

  // Timer enum translation keys
  static TimerI18N = [
    /*i18n*/"e-none",
    /*i18n*/"e-tturn",
    /*i18n*/"e-tgame"
  ];

  // Compatibility; map old strings to new enum
  static TimerCompat = {
    "None": Game.Timer.NONE,
    "Turn timer": Game.Timer.TURN,
    "Game timer": Game.Timer.GAME
  };

  /**
   * Different types of penalty for a failed challenge.
   * * `NONE` - no penalty
   * * `MISS` - challenging player misses next turn
   * * `PER_TURN` - challenger loses a fixed number of points
   * * `PER_WORD` - challenger loses points for each wrongly challenged word
   * @typedef {NONE|MISS|PER_TURN|PER_WORD} Game.Penalty
   */
  static Penalty = {
    NONE:     0,
    MISS:     1,
    PER_TURN: 2,
    PER_WORD: 3
  };

  /**
   * Penalty enum translation keys
   */
  static PenaltyI18N = [
    /*i18n*/"e-none",  // NONE
    /*i18n*/"e-pmiss", // MISS
    /*i18n*/"e-plose", // PER_TURN
    /*i18n*/"e-pppw"   // PER_WORD
  ];

  // Compatibility; map old strings to new enum
  static PenaltyCompat = {
    "None": Game.Penalty.NONE,
    "Miss next turn": Game.Penalty.MISS,
    "Lose points": Game.Penalty.PER_TURN,
    "Lose points per word": Game.Penalty.PER_WORD
  };

  /**
   * Ways to check played words.
   * * NONE - don't check played words
   * * AFTER - report to player (only) if played words were in dictionary
   * * REJECT - refuse to accept words not in the dictionary. A bad play
   *   in this case does not result in a penalty, it just won't accept
   *   the play.
   * @typedef {NONE|AFTER|REJECT} Game.WordCheck
   */
  static WordCheck = {
    NONE:   0,
    AFTER:  1,
    REJECT: 2
  };

  /**
   * WordCheck enum translation keys
   */
  static WordCheckI18N = [
    /*i18n*/"e-none", // NONE
    /*i18n*/"e-caft", // AFTER
    /*i18n*/"e-crej", // REJECT
  ];

  // Compatibility; map old strings to new enum
  static WordCheckCompat = {
    "None": Game.WordCheck.NONE,
    "Don't check words": Game.WordCheck.NONE,
    "Check words after play": Game.WordCheck.AFTER,
    "Reject unknown words": Game.WordCheck.REJECT
  };

  /**
   * Defaults. CAREFUL! Not all of these defaults are automatically
   * applied in the constructor; if a field isn't set in the object
   * passed to the constructor, the default may not be automatically
   * applied (except for edition, which is always required). So if you
   * want to change any of the defaults, you need to make sure the
   * constructor code will pick the new value up.
   */
  static DEFAULTS = {
	  edition:         "English_Scrabble",
	  dictionary:      "CSW2021_English",

    timerType:        Game.Timer.NONE,
		timeAllowed:      25, // minutes per game
		timePenalty:      0,

    challengePenalty: Game.Penalty.MISS,
		penaltyPoints:    5,

    wordCheck:        Game.WordCheck.NONE,
    predictScore:     true,
    minPlayers:       2,
    maxPlayers:       0,
    allowUndo:        false,
    allowTakeBack:    true
  };

  /**
   * Channels connecting to front ends
   * @member {Channel[]}
   * @private
   */
  _channels = [];

  // WARNING! Do NOT use the ESM field syntax for the fields that are
  // serialised. If we do that, then the constructor blows the field
  // away when loading using CBOR. :-(

  /**
   * @param {object} params Parameter object. This can be another Game
   * to copy game parameters, or a generic object with fields the same
   * names as Game.DEFAULTS fields. Note that only fields in
   * `Game.DEFAULTS` are used, other fields are ignored.
   *
   * Note that if a field in `Game.DEFAULTS` is not defined in
   * `params`, then the value from `Game.DEFAULTS` will *not* be
   * applied (except for `edition`). A field missing from `params` is
   * treated as `undefined`, and `undefined` means `undefined`, and
   * *not* "apply the default".
   */
  constructor(params) {

    /**
     * Debug function.
     * @member {function}
     * @private
     */
    this._debug = params._debug;

    /**
     * Key that uniquely identifies this game.
     * @member {Key}
     */
    this.key = params.key || genKey();

    /**
     * An i18n message identifier indicating the game state.
     * @member {State}
     */
    this.state = Game.State.WAITING;

    /**
     * Epoch ms when this game was created.
     * @member {number}
     */
    this.creationTimestamp = params.creationTimestamp || Date.now();

    /**
     * List of players in the game.
     * Lateinit as the result of a load.
     * @member {Player[]}
     * @private
     */
    this.players = [];

    /**
     * Complete list of the turn history of this game.
     * @member {Turn[]}
     * @private
     */
    this.turns = [];

    /**
     * The game board.
     * @member {Board}
     */
    this.board = undefined;

    /**
     * Size of rack. Always the same as Edition.rackCount,
     * because we don't hold a pointer to the Edition. Note this
     * is saved with the game.
     * Copied from the {@linkcode Edition} in {@linkcode Game#create|create}.
     * @member {number}
     */
    this.rackSize = undefined;

    /**
     * Size of swap rack.
     * Lateinit in {@linkcode Game#create|create} or as the result of a
     * load.
     * @member {number}
     */
    this.swapSize = undefined;

    /**
     * Map of number of tiles played, to bonus for the play.
     * Lateinit in {@linkcode Game#create|create} or as the result of a
     * load.
     * @member {object<number,number>}
     * @private
     */
    this.bonuses = undefined;

    /**
     * Bag of remaining letters, initialised from the edition.
     * Lateinit in {@linkcode Game#create|create} or as the result of a
     * load.
     * @member {LetterBag}
     */
    this.letterBag = undefined;

    /**
     * Key of next player to play in this game.
     * @member {string?}
     */
    this.whosTurnKey = undefined;

    /**
     * Undo engine for this game. Lazy init when required.
     * @member {Undo?}
     * @private
     */
    this._undoer = undefined;

    /**
     * Name of the edition (see {@linkcode Edition}).
     * Edition objects are stored in the Edition class and
     * demand-loaded as required. This allows us to
     * throw Game objects around without worrying too much about
     * the data volume.
     * @member {string}
     */
    this.edition = params.edition || Game.DEFAULTS.edition;

    /*
     * When you name a field in a class declaration without an
     * initial value, it gets initialised to undefined. This means the
     * object gets cluttered with undefined fields that are not used
     * in the configuration. So we test whether these optional fields
     * are required or not.
     */

    if (params.dictionary)
      /**
       * Name of the dictionary used for checking words and
       * generating robot plays. A game doesn't need to have a
       * dictionary if words are not checked and there is no robot
       * player.
       * This is just the name of the dictionary. Dictionary objects
       * are stored in the {@linkcode Dictionary} class and
       * demand-loaded as and when required. This allows us to
       * throw Game objects around without worrying too much about
       * the data volume.
       * @member {string?}
       */
      this.dictionary = params.dictionary;

    if (params.timerType) {
      /**
       * Type of timer for this game.
       * @member {Timer?}
       */
      this.timerType = params.timerType;
    } else
      this.timerType = Game.DEFAULTS.timerType;

    if (this.timerType !== Game.Timer.NONE) {
      if (typeof params.timeAllowed !== "undefined") {
        /**
         * Time limit for this game, in minutes. If `timerType` is
         * `Timer.GAME` defaults to 25 minutes, and 1 minute for
         * `Timer.TURN`.
         * @member {number?}
         */
        this.timeAllowed = params.timeAllowed || 0;
      }
      else if (this.timerType === Game.Timer.GAME)
        this.timeAllowed = Game.DEFAULTS.timeAllowed;
      else
        this.timeAllowed = 1;

      if (this.timerType === Game.Timer.GAME) {
        /**
         * Time penalty for this game, points lost per minute over
         * timeAllowed. Only used if `timerType` is `GAME`.
         * @member {number?}
         */
        this.timePenalty = params.timePenalty || Game.DEFAULTS.timePenalty;
      }
    }

    /**
     * The type of penalty to apply for a failed challenge.
     * @member {Penalty}
     */
    if (params.challengePenalty)
      this.challengePenalty = params.challengePenalty;
    else
      this.challengePenalty = Game.DEFAULTS.challengePenalty;

    if (this.challengePenalty === Game.Penalty.PER_TURN
        || this.challengePenalty === Game.Penalty.PER_WORD) {
      /**
       * The score penalty to apply for a failed challenge. Only used
       * if `challengePenalty` is `Game.Penalty.PER_TURN` or `Game.Penalty.PER_WORD`.
       * @member {number?}
       */
      this.penaltyPoints = params.penaltyPoints || Game.DEFAULTS.penaltyPoints;
    }

    if (params.wordCheck) {
      /**
       * Whether or not to check plays against the dictionary.
       * @member {WordCheck?}
       */
      this.wordCheck = params.wordCheck;
    } else
      this.wordCheck = Game.DEFAULTS.wordCheck;

    if (params.minPlayers > 2) {
      /**
       * Least number of players must have joined before this game
       * can start. Must be at least 2.
       * @member {number?}
       */
      this.minPlayers = params.minPlayers;
    }

    if (params.maxPlayers >= 2) {
      /**
       * Most number of players who can join this game. < 2
       * means no limit.
       * @member {number?}
       */
      this.maxPlayers = params.maxPlayers;
    }

    if (typeof this.maxPlayers !== "undefined"
        && this.maxPlayers < (this.minPlayers || 2))
      delete this.maxPlayers; // infinity

    if (params.predictScore) {
      /**
       * Whether or not to show the predicted score from tiles
       * placed during the game. This should be false in tournament
       * play, true otherwise.
       * @member {?boolean}
       */
      this.predictScore = true;
    }

    if (params.allowTakeBack) {
      /**
       * Whether or not to allow players to take back their most recent
       * move without penalty, so long as the next player hasn't
       * challenged or played.
       * @member {boolean?}
       */
      this.allowTakeBack = true;
    }

    if (params.allowUndo) {
      /**
       * Whether or not to allow players to undo previous
       * moves without penalty. Implies syncRacks.
       * @member {boolean?}
       */
      this.allowUndo = true;
    }

    if (params.syncRacks) {
      /**
       * Disables obfustication of move data, so any player
       * could potentially reverse-engineer
       * the entire board and all racks if this is enabled.
       * @member {boolean?}
       */
      this.syncRacks = true;
    }

    if (params._noPlayerShuffle) {
      /**
       * Internal, for debug only.
       * @member {boolean?}
       * @private
       */
      this._noPlayerShuffle = true;
    }

    if (params.nextGameKey) {
      /**
       * When a game is ended, nextGameKey is the key for the
       * continuation game.
       * @member {string?}
       */
      this.nextGameKey = params.nextGameKey;
    }

    if (params.pausedBy) {
      /**
       * Name (NOT key) of the player who paused the game (if it's paused).
       * @member {string?}
       */
      this.pausedBy = params.pausedBy;
    }
  }

  /**
   * Creation steps that can't be done in the constructor because
   * they require promises.
   * Load the edition and create the board and letter bag.
   * Not done in the constructor because we need to return
   * a Promise. Must be followed by onLoad to connect a
   * DB and complete initialisation of private fields.
   * @return {Promise} that resolves to this
   */
  create() {
    return this.promiseEdition()
    .then(edo => {
      const factory = this.constructor.CLASSES;
      this.board = new factory.Board(factory, edo);
      this.letterBag = new LetterBag(edo);
      this.bonuses = edo.bonuses;
      this.rackSize = edo.rackCount;
      this.swapSize = edo.swapCount;
      return this;
    });
  }

  /**
   * Get the edition for this game, lazy-loading as necessary
   * @return {Promise} resolving to an {@linkcode Edition}
   */
  promiseEdition() {
    return Edition.load(this.edition);
  }

  /**
   * Add a player to the game.
   * @param {Player} player
   * @param {boolean} fillRack true to fill the player's rack
   * from the game's letter bag. Default false.
   * @return {Game} this
   */
  addPlayer(player, fillRack = false) {
    assert(this.letterBag, "Cannot addPlayer() before create()");
    assert(
      !this.maxPlayers || this.players.length < this.maxPlayers,
      "Cannot addPlayer() to a full game");
    player._debug = this._debug;
    this.players.push(player);
    if (this.timerType !== Game.Timer.NONE)
      player.clock = this.timeAllowed * 60;
    if (fillRack)
      player.fillRack(this.letterBag, this.rackSize);
    /* c8 ignore next 2 */
    if (this._debug)
      this._debug(this.key, "added player", player.stringify());
    return this;
  }

  /**
   * Remove a player from the game, taking their tiles back into
   * the bag
   * @param {Player} player
   */
  removePlayer(player) {
    player.returnTiles(this.letterBag);
    const index = this.players.findIndex(p => p.key === player.key);
    assert(index >= 0,
           `No such player ${player.key} in ${this.key}`);
    this.players.splice(index, 1);
    /* c8 ignore next 2 */
    if (this._debug)
      this._debug(player.key, "left", this.key);
    if (this.players.length < (this.minPlayers || 2)
        && this.state !== Game.State.GAME_OVER)
      this.state = Game.State.WAITING;
  }

  /**
   * Get the player with key
   * @param {string} player key
   * @return {Player} player, or undefined if not found
   */
  getPlayerWithKey(key) {
    return this.players.find(p => p.key === key);
  }

  /**
   * Get the current player.
   * @return {Player} player, or undefined if not found
   */
  getPlayer() {
    return this.getPlayerWithKey(this.whosTurnKey);
  }

  /**
   * Get a list of all players in the game
   * @return {Player[]} list of players
   */
  getPlayers() {
    return this.players;
  }

  /**
   * Get the last player before the given player, identified by key
   * @param {string|Player} player the current player if undefined, or
   * the player to get the previous player of
   * @return {Player} previous player
   */
  previousPlayer(player) {
    if (typeof player === "undefined")
      player = this.getPlayer();
    else if (typeof player === "string")
      player = this.getPlayerWithKey(player);
    const index = this.players.findIndex(p => p.key === player.key);
    assert(index >= 0, `${player.key} not found in ${this.key}`);
    return this.players[
      (index + this.players.length - 1) % this.players.length];
  }

  /**
   * Get the next player to play. A player might be skipped if they
   * are marked as missing a turn.
   * @param {string|Player} player the current player if undefined,
   * or the key of a player, or the player
   * of the player to get the next player to
   * @return {Player} the next player
   */
  nextPlayer(player) {
    if (typeof player === "undefined")
      player = this.getPlayer();
    else if (typeof player === "string")
      player = this.getPlayerWithKey(player);
    let index = this.players.findIndex(p => p.key === player.key);
    assert(index >= 0, `${player.key} not found in ${this.key}`);
    for (let i = 0; i < this.players.length; i++) {
      let nextPlayer = this.players[(index + 1) % this.players.length];
      if (nextPlayer.missNextTurn) {
        nextPlayer.missNextTurn = false;
        index++;
      } else
        return nextPlayer;
    }
    /* c8 ignore next */
    return assert.fail(
      `Unable to determine next player after ${player.key}`);
  }

  /**
   * Calculate any bonus afforded to plays of this length
   * @param {number} tilesPaced number of tiles placed
   * @return points bonus
   */
  calculateBonus(tilesPlaced) {
    // Duplicates Edition.calculateBonus, so it can be used even if
    // the Edition is not loaded (e.g. on the client side)
    return this.bonuses ? (this.bonuses[tilesPlaced] || 0) : 0;
  }

  /**
   * Get the current winning score
   * @return {number} points
   */
  winningScore() {
    return this.players.reduce(
      (max, player) => Math.max(max, player.score), 0);
  }

  /**
   * Get the current winning player
   * @return {Player} player in the lead
   */
  getWinner() {
    return this.players.reduce(
      (best, player) => (player.score > best.score ? player : best),
      this.players[0]);
  }

  /**
   * If there is a player with no tiles, return them.
   * @return {Player} the player with no tiles, or undefined
   */
  getPlayerWithNoTiles() {
    return this.players.find(
      player => (player.rack.tiles().length === 0));
  }

  /**
   * Return true if the game state indicates the game has ended
   */
  hasEnded() {
    switch (this.state) {
    case Game.State.WAITING:
    case Game.State.FAILED_CHALLENGE:
    case Game.State.PLAYING:
      return false;
    case undefined:
    case Game.State.GAME_OVER:
    case Game.State.TWO_PASSES:
    case Game.State.TIMED_OUT:
      return true;
    default:
      assert.fail(`Bad game state ${this.state}`);
      return true;
    }
  }

  /**
   * Determine when the last activity on the game happened. This
   * is either the last time a turn was processed, or the creation time.
   * @return {number} a time in epoch ms
   */
  lastActivity() {
    const last = this.lastTurn();
    if (last)
      return last.timestamp;

    return this.creationTimestamp;
  }

  /**
   * Get the last turn made in this game.
   * @return {Turn} the last turn recorded for the game, or undefined
   * if no turns have been made yet.
   */
  lastTurn() {
    if (this.turns.length === 0)
      return undefined;

    return this.turns[this.turns.length - 1];
  }

  /**
   * Add a turn to the game
   * @param {Turn} the turn to add
   */
  pushTurn(turn) {
    return this.turns.push(turn);
  }

  /**
   * Remove and return the last turn in the game
   * @return {Turn} the turn popped
   */
  popTurn() {
    assert(this.turns.length > 0, "No turns");
    return this.turns.pop();
  }

  /**
   * Iterate over turns calling cb on each, flagging when the
   * last (most recent) turn is reached.
   * @param {function} cb (turn, isLastTurn)
   */
  forEachTurn(cb) {
    this.turns.forEach(
      (turn, i) => cb(turn, i === this.turns.length - 1));
  }

  /* c8 ignore start */

  /**
   * Get the board square at [col][row]
   * @return {Square} at col,row
   */
  at(col, row) {
    // Only used client-side
    return this.board.at(col, row);
  }

  /**
   * Debug
   */
  stringify() {
    const options = [ `edition:${this.edition}` ];
    if (this.dictionary)
      options.push(`dictionary:${this.dictionary}`);
    if (this.timerType !== Game.Timer.NONE) {
      options.push(`${this.timerType}:${this.timeAllowed}`);
      if (this.timerType === Game.Timer.GAME)
        options.push(`timePenalty:${this.timePenalty}`);
    }
    if (this.challengePenalty !== Game.Penalty.NONE) {
      options.push(this.challengePenalty);
      if (this.challengePenalty === Game.Penalty.PER_TURN
          || this.challengePenalty === Game.Penalty.PER_WORD)
        options.push(`lose:${this.penaltyPoints}`);
    }
    if (this.whosTurnKey)
      options.push(`next:${this.whosTurnKey}`);

    if (this.wordCheck) options.push(this.wordCheck);
    if (this.challengePenalty !== Game.Penalty.NONE) options.push(this.challengePenalty);
    if (this.predictScore) options.push("Predict");
    if (this.allowTakeBack) options.push("Allow takeback");
    if (this.minPlayers)
      options.push(`>=${this.minPlayers}`);
    const ps = this.players.map(p => p.stringify()).join(",");
    options.push(`players:[${ps}]`);
    if (this.maxPlayers)
      options.push(`<=${this.maxPlayers}`);
    if (this.nextGameKey)
      options.push(`Next game ${this.nextGameKey}`);
    if (this.pausedBy)
      options.push(`Paused by ${this.pausedBy}`);
    return `Game ${this.key} {${options.join(", ")}}`;
  }

  /* c8 ignore stop */

  /**
   * Determine if any players are robots.
   * @return the first robot found.
   */
  hasRobot() {
    return this.players.find(p => p.isRobot);
  }

  /**
   * Create a simple structure describing a subset of the game state,
   * for sending to the 'games' interface.  The structure does not
   * suffice to fully reconstruct the game; there will be no `board`,
   * `rackSize`, `swapSize`, `bonuses`, `turns` will be a list of
   * {@linkcode Turn#sendable|Turn.sendable}, and `players`
   * will be a list of {@linkcode Player#sendable|Player.sendable}.
   * @param {UserManager?} um user manager object for getting emails; only
   * works on server side
   * @return {Promise} resolving to a simple object with
   * key game data
   */
  sendable(um) {
    return Promise.all(
      this.players.map(player => player.sendable(this, um)))
    .then(ps => {
      const simple = {
        key: this.key,
        creationTimestamp: this.creationTimestamp,
        edition: this.edition,
        dictionary: this.dictionary,
        state: this.state,
        allowUndo: this.allowUndo,
        // players is a list of Player.sendable
        players: ps,
        whosTurnKey: this.whosTurnKey,
        timerType: this.timerType,
        challengePenalty: this.challengePenalty,
        lastActivity: this.lastActivity(), // epoch ms
        // this.board is not sent
        // this.rackSize not sent
        // this.swapSize not sent
        // this.bonuses not sent
        // turns is a list of Turn.sendable
        turns: this.turns.map(t => t.sendable())
      };
      if (this.minPlayers) simple.minPlayers = this.minPlayers;
      if (this.maxPlayers) simple.maxPlayers = this.maxPlayers;
      simple.wordCheck = this.wordCheck;
      if (this.timerType != Game.Timer.NONE) {
        simple.timeAllowed = this.timeAllowed;
        simple.timePenalty = this.timePenalty;
      }
      if (this.challengePenalty === Game.Penalty.PER_TURN
          || this.challengePenalty === Game.Penalty.PER_WORD)
        simple.penaltyPoints = this.penaltyPoints;
      if (this.nextGameKey) simple.nextGameKey = this.nextGameKey;
      if (this.pausedBy) simple.pausedBy = this.pausedBy;
      if (this.predictScore) simple.predictScore = true;
      if (this.allowTakeBack) simple.allowTakeBack = true;

      return simple;
    });
  }

  /**
   * Encode the game in a URI parameter block
   * @return {object} parameter object
   */
  pack() {
    const params = {};

    params.a = this.lastActivity();
    params.b = this.board.pack();
    const cp = this.challengePenalty;
    if (cp >= 0) {
      params.c = cp;
      if (this.penaltyPoints > 0) params.o = this.penaltyPoints;
    }
    params.d = this.dictionary;
    params.e = this.edition;
    if (this.allowTakeBack) params.g = true;
    if (this.predictScore) params.i = true;
    params.k = this.key;
    params.m = this.creationTimestamp;
    if (this.nextGameKey) params.n = this.nextGameKey;
    this.players.forEach((player, index) => {
      // Transfer player parameters into flat param object indexed
      // by player number
      const p = player.pack();
      for (const key in p)
        params[`P${index}${key}`] = p[key];
    });
    if (this.allowUndo) {
      // Transfer turn parameters into flat param object indexed
      // by turn number
      this.turns.forEach((turn, index) => {
        const t = turn.pack();
        for (const key in t)
          params[`T${index}${key}`] = t[key];
      });
    } else if (this.turns.length > 0) {
      const t = this.turns[this.turns.length - 1].pack();
      for (const key in t)
        params[`T0${key}`] = t[key];
    }
    params.s = this.state;
    params.t = this.timerType;
    if (this.allowUndo) params.u = true;
    params.v = this.wordCheck;
    if (this.whosTurnKey) params.w = this.whosTurnKey;
    if (this.timerType != Game.Timer.NONE) {
      params.x = this.timeAllowed;
      params.y = this.timePenalty;
    }

    return params;
  }

  /**
   * Promise to construct a game from URI parameters.
   * @param {Object} params URI parameters
   * @return {Promise} a promise that resolves to a new game
   */
  static unpack(params) {
    let game;
    return new this({ edition: params.e })
    .create()
    .then(g => game = g)
    .then(() => game.promiseEdition())
    .then(edition => {
      game.board.unpack(params.b, edition);
      game.board.forEachTiledSquare(sq => {
        game.letterBag.removeTile(sq.tile);
        return false;
      });
      if (params.c) {
        game.challengePenalty = params.c;
        game.penaltyPoints = params.o;
      }
      game.dictionary = params.d;
      game.edition = params.e;
      game.state = params.s;
      if (params.g) game.allowTakeBack = true;
      if (params.i) game.predictScore = true;
      game.key = params.k;
      game.creationTimestamp = Number(params.m);
      if (params.t) {
        game.timerType = params.t;
        game.timeAllowed = Number(params.x);
        game.timePenalty = Number(params.y);
      }
      if (params.u) game.allowUndo = true;
      if (params.v) game.wordCheck = params.v;
      if (params.w) game.whosTurnKey = params.w;
      if (params.n) game.nextGameKey = params.n;

      game.players = [];
      let index = 0;
      while (params[`P${index}k`]) {
        const p = new Player(
          { key: params[`P${index}k`] },
          game.constructor.CLASSES);
        p.unpack(params, index, edition);
        game.addPlayer(p, false);
        p.rack.forEachTiledSquare(sq => {
          game.letterBag.removeTile(sq.tile);
          return false;
        });
        index++;
      }

      index = 0;
      game.turns = [];
      while (params[`T${index}t`]) {
        const t = new Turn();
        t.unpack(params, `T${index}`, edition);
        game.turns.push(t);
        index++;
      }
      return game;
    });
  }

  /**
   * Promise to finish the construction or load from serialisation
   * of a game.
   * A game has to know what DB so it knows where to save. The
   * database and connections are not serialised, and must be
   * reset when loading.
   * @param {Database} db the db to use to store games
   * @return {Promise} Promise that resolves to the game
   */
  onLoad(db) {
    // if this onLoad follows a load from serialisation, which
    // does not invoke the constructor.

    const toEnum = (n, compat) => {
      // assume undefined=>0, which should be the case for all enums
      if (typeof n === "undefined") return 0;
      if (typeof n === "number") return n;
      let nn = Number(n);
      if (Number.isNaN(nn)) {
        // Map to enum through string->enum mapping
        nn = compat[n];
        if (nn < 0) debugger;
        assert(nn >= 0, n);
        return nn;
      }
      return nn;
    };

    // Compatibility: Remap enums from text strings to numbers. Previously
    // we stored the whole string, now just a number.
    this.state = toEnum(this.state, Game.StateCompat);
    this.timerType = toEnum(this.timerType, Game.TimerCompat);
    this.challengePenalty = toEnum(this.challengePenalty, Game.PenaltyCompat);
    this.wordCheck = toEnum(this.wordCheck, Game.WordCheckCompat);
    
    /**
     * Database containing this game. Only available server-side,
     * and not serialised.
     * @member {Database}
     * @private
     */
    this._db = db;

    if (!this._channels)
      this._channels = [];

    // Compatibility; timeLimit in s to timeAllowed in minutes
    if (this.timeLimit && !this.timeAllowed)
      this.timeAllowed = this.timeLimit / 60;

    if (!this._debug)
      this._debug = () => {};
    if (!this.players)
      this.players = [];
    this.players.forEach(p => p._debug = this._debug);
    if (!this.turns)
      this.turns = [];

    return Promise.resolve(this);
  }

  /**
   * Load a game from a structure generated by sendable. This
   * method is designed to use to support rapid loading of games
   * into the `games` browser interface. The game will be incomplete,
   * only the fields supported by sendable will be populated.
   * @param {object} factory Game class to be used as factory
   * @param {object} simple object generated by sendable()
   */
  static fromSendable(simple, factory) {
    const game = new factory.Game(simple);
    game.state = simple.state;
    game.players = simple.players.map(
      p => factory.Player.fromSendable(p, factory));
    game.turns = simple.turns.map(t => Turn.fromSendable(t, factory));
    return game;
  }

  // Shortcuts for moving tiles around within the game

  /**
   * Shorthand to remove tiles from the board and put
   * them on a rack
   * @param {Tile[]} tiles list of tile placements
   * @param {Player} player player whose rack we are adjusting
   */
  boardToRack(tiles, player) {
    for (const placement of tiles) {
      const square = this.at(placement.col, placement.row);
      const tile = square.unplaceTile();
      assert(tile, `No tile at ${stringify(placement)}`);
      player.rack.addTile(tile);
    }
  }

  /**
   * Shorthand to move tiles from the rack to the board
   * at the locations dictated in a set of placements
   * @param {Tile[]} tiles list of tile placements
   * @param {Player} player player whose rack we are adjusting
   * @param {function?} cb optional callback on each tile that was placed
   */
  rackToBoard(tiles, player, cb) {
    for (const place of tiles) {
      const tile = player.rack.removeTile(place);
      assert(
        tile, `Tile ${stringify(place)} not found on rack`);
      const square = this.at(place.col, place.row);
      square.placeTile(tile, true);
      if (cb)
        cb(tile);
    }
  }

  /**
   * Shorthand method to take tiles out of the letter bag and put
   * them on a rack
   * @param {Tile[]} tiles list of tiles
   * @param {Player} player player whose rack we are adjusting
   */
  bagToRack(tiles, player) {
    for (const tile of tiles) {
      const removed = this.letterBag.removeTile(tile);
      assert(removed, `${stringify(tile)} missing from bag`);
      player.rack.addTile(removed);
    }
  }

  /**
   * Shorthand method to move a set of tiles from a rack to the bag
   * @param {Tile[]} tiles list of tiles
   * @param {Player} player player whose rack we are adjusting
   */
  rackToBag(tiles, player) {
    for (const tile of tiles) {
      const removed = player.rack.removeTile(tile);
      assert(removed, `${stringify(tile)} missing from rack`);
      this.letterBag.returnTile(removed);
    }
  }

  /**
   * Start, or continue, playing the game if preconditions are met.
   * @return {Promise} promise that resolves to the game
   */
  playIfReady() {
    /* c8 ignore next 2 */
    if (this._debug)
      this._debug("playIfReady ", this.key,
                  this.whosTurnKey ? `player ${this.whosTurnKey}` : "",
                  "state", this.state);

    if (this.hasEnded()) {
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("\tgame is over");
      return Promise.resolve(this);
    }

    // Check preconditions for starting the game
    if (this.players.length < (this.minPlayers || 2)) {
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("\tnot enough players");
      // Result is not used
      return Promise.resolve(this);
    }

    // If no turn has been allocated yet,
    // shuffle the players, and pick a random tile from the bag.
    // The shuffle can be suppressed for unit testing.
    if (this.state === Game.State.WAITING) {
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("\tpreconditions met");

      if (this.players.length > 1 && !this._noPlayerShuffle) {
        /* c8 ignore next 2 */
        if (this._debug)
          this._debug("\tshuffling player order");
        for (let i = this.players.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          // i = 1, j = 0,1
          //    j = 0, swap 0 and 1
          //    j = 1, leave 1 in place
          const temp = this.players[i];
          this.players[i] = this.players[j];
          this.players[j] = temp;
        }
        // Notify all connections of the order change
        // (asynchronously)
        this.sendCONNECTIONS();
      }

      const player = this.players[0];
      this.whosTurnKey = player.key; // assign before save()
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("\t", player.key, "to play");
      this.state = Game.State.PLAYING;

      return this.save()
      // startTurn will autoplay if the first player is
      // a robot. It will also start the clock.
      .then(() => this.startTurn(player));
    }

    const nextPlayer = this.getPlayer();
    if (nextPlayer) {
      if (nextPlayer.isRobot)
        return this.startTurn(nextPlayer);

      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("\twaiting for", nextPlayer.name, "to play");
      this.startTheClock();
    }
    return Promise.resolve(this);
  }

  /**
   * TODO: move to BackendGame
   * Wrap up after a command handler that is returning a Turn.
   * Log the command, determine whether the game has ended,
   * save state and notify connected players with the Turn object.
   * @param {Player} player player who's turn it was
   * @param {object} turn fields to populate the Turn to finish
   * @return {Promise} that resolves to the game
   */
  finishTurn(player, turn) {
    turn = new Turn(turn);
    turn.playerKey = player.key;

    // store turn (server side)
    this.pushTurn(turn);

    let redacted = turn;

    // Censor replacements for all but the player who's play it was
    if (!this.allowUndo && !this.syncRacks && turn.replacements) {
      redacted = new Turn(turn);
      redacted.replacements = [];
      for (const tile of turn.replacements) {
        const rt = new Tile(tile);
        rt.letter = '#';
        redacted.replacements.push(rt);
      }
    }

    return this.save()
    .then(() => Promise.all([
      this.notifyPlayer(player, Game.Notify.TURN, turn),
      this.notifyOthers(player, Game.Notify.TURN, redacted)
    ]))
    .then(() => this);
  }

  /**
   * If the game has a time limit, start an interval timer.
   * @return {boolean} true if the clock is started, false otherwise
   * (e.g. if it is already running)
   * @private
   */
  startTheClock() {
    if (typeof this._intervalTimer === "undefined"
        && this.timerType !== Game.Timer.NONE
        && this.state === Game.State.PLAYING
        && !this.pausedBy) {

      // Broadcast a ping every second
      /**
       * Timer object for ticking.
       * @member {object?}
       * @private
       */
      this._intervalTimer = setInterval(() => this.tick(), 1000);
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug(this.key, "started the clock");
      return true;
    }
    return false;
  }

  /**
   * Stop the interval timer, if there is one
   * @return {boolean} true if the clock is stopped, false otherwise
   * @private
   */
  stopTheClock() {
    if (typeof this._intervalTimer == "undefined")
      return false;
    /* c8 ignore next 2 */
    if (this._debug)
      this._debug(this.key, "stopped the clock");
    clearInterval(this._intervalTimer);
    delete(this._intervalTimer);
    return true;
  }

  /**
   * Tell all clients a tick has happened (or
   * remind them of the current number of seconds to play)
   * @private
   */
  tick() {
    const player = this.getPlayer();
    if (!player)
      return;

    player.tick();

    // Really should save(), otherwise the ticks won't
    // survive a server restart. However it's expensive, and server
    // restarts are rare, so let's not.
    this.notifyAll(
      Game.Notify.TICK,
      {
        gameKey: this.key,
        playerKey: player.key,
        clock: player.clock
      });
  }

  /**
   * Start (or restart) the turn of the given player.
   * @param {Player?} player the the player to get the turn.
   * @param {number?} timeout Only relevant when `timerType` is
   * `Game.Timer.TURN`. Turn timeout for this turn. Set if
   * this is a restart of an unfinished turn, defaults to
   * this.timeAllowed if undefined.
   * @return {Promise} a promise that resolves to undefined
   * @private
   */
  startTurn(player, timeout) {
    assert(player, "No player");

    if (!this.players.find(p => p.passes < 2))
      return this.confirmGameOver(player, Game.State.TWO_PASSES);

    /* c8 ignore next 2 */
    if (this._debug)
      this._debug("startTurn", player.name, player.key);

    this.whosTurnKey = player.key;

    if (player.isRobot) {
      // May recurse if the player after is also a robot, but
      // the recursion will always stop when a human player
      // is reached, so never deep.
      return this.autoplay();
    }

    // For a timed game, make sure the clock is running and
    // start the player's timer.

    if (this.timerType !== Game.Timer.NONE) {
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("\ttimed game,", player.name,
                    "has", (timeout || this.timeAllowed),
                    "left to play", this.timerType);
      this.startTheClock(); // does nothing if already started
    }
    else {
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("\tuntimed game, wait for", player.name, "to play");
      return Promise.resolve(this);
    }

    if (this.timerType === Game.Timer.TURN)
      // Make the player pass when their clock reaches 0
      player.setTimeout(
        timeout || this.timeAllowed * 60,
        () => this.pass(player, Turn.Type.TIMED_OUT));

    return Promise.resolve(this);
  }

  /**
   * Robot play for the current player. This may result in a challenge.
   * @return {Promise} resolving to this
   */
  autoplay() {
    const player = this.getPlayer();
    /* c8 ignore next 2 */
    if (this._debug)
      this._debug("Autoplaying", player.name,
                  "using", player.dictionary || this.dictionary);

    let pre = ((player.delayBeforePlay || 0) > 0)
        ? new Promise(
          resolve => setTimeout(resolve, player.delayBeforePlay * 500))
        : Promise.resolve();
    let mid = ((player.delayBeforePlay || 0) > 0)
        ? new Promise(
          resolve => setTimeout(resolve, player.delayBeforePlay * 500))
        : Promise.resolve();
    // Before making a robot move, consider challenging the last
    // player.
    // challenge is a Promise that will resolve to true if a
    // challenge is made, or false otherwise.
    let lastPlay = this.lastTurn();
    if (lastPlay && lastPlay.type === Turn.Type.PLAYED
        && this.dictionary
        && player.canChallenge) {
      const lastPlayer = this.getPlayerWithKey(lastPlay.playerKey);
      // There's no point if they are also a robot, though
      // that should never arise in a "real" game where there can
      // only be one robot.
      if (!lastPlayer.isRobot) {
        // use game dictionary, not robot dictionary
        pre = pre.then(() => this.promiseDictionary())
        .then(dict => {
          const bad = lastPlay.words
                .filter(word => !dict.hasWord(word.word));
          if (bad.length > 0) {
            // Challenge succeeded
            /* c8 ignore next 2 */
            if (this._debug)
              this._debug("Challenging", lastPlayer.name);
            /* c8 ignore next 2 */
            if (this._debug)
              this._debug("Bad words:", bad);
            return this.takeBack(player, Turn.Type.CHALLENGE_WON)
            .then(() => true);
          }
          return false; // no challenge made
        });
      }
    }

    return pre
    .then(challenged => {
      if (!challenged && lastPlay) {
        // Last play was good, check the last player has tiles
        // otherwise the game is over
        const lastPlayer = this.getPlayerWithKey(lastPlay.playerKey);
        if (lastPlayer.rack.isEmpty())
          return this.confirmGameOver(player, Game.State.GAME_OVER);
      }

      // We can play.
      let bestPlay = null;
      return this.findBestPlay(
        player.rack.tiles(),
        data => {
          if (typeof data === "string") {
            /* c8 ignore next 2 */
            if (this._debug)
              this._debug(data);
          } else {
            bestPlay = data;
            /* c8 ignore next 2 */
            if (this._debug)
              this._debug("Best", bestPlay.stringify());
          }
        }, player.dictionary || this.dictionary)
      .then(() => {
        if (bestPlay)
          return mid.then(() => this.play(player, bestPlay));

        /* c8 ignore next 2 */
        if (this._debug)
          this._debug(player.name, "can't play, passing");
        return this.pass(player, Turn.Type.PASSED);
      });
    });
  }

  /**
   * Get the dictionary for this game, lazy-loading as necessary
   * @return {Promise} promise resolves to a {@linkcode Dictionary}
   */
  promiseDictionary() {
    /* c8 ignore next */
    assert(this.dictionary, "Game has no dictionary");
    return loadDictionary(this.dictionary);
  }

  /**
   * Perform a save to the connected database (set in onLoad).
   * @return {Promise} promise resolves to this
   */
  save() {
    assert(this._db, "No _db for save()");
    /* c8 ignore next 2 */
    if (this._debug)
      this._debug("Saving game", this.key);
    return this._db.set(this.key, CBOR.encode(this, Game.CLASSES))
    .then(() => this);
  }

  /**
   * Send a notification to just one player, if they are connected
   * through a channel. Note that the player
   * may be connected multiple times through different channels.
   * @param {Player} player player to send to
   * @param {string} message to send
   * @param {Object} data to send with message.
   */
  notifyPlayer(player, message, data) {
    /* c8 ignore next 2 */
    if (this._debug)
      this._debug("b>f", player.key, message,
                stringify(data));
    data._timestamp = Date.now();
    // Player may be connected several times, or not at all
    this._channels.forEach(
      channel => {
        if (channel.player && channel.player.key === player.key)
          channel.emit(message, data);
        return false;
      });
  }

  /**
   * Broadcast a notification to all game observers. Note
   * that an observer may be connected multiple times,
   * through different channels, or not at all.
   * @param {string} message to send
   * @param {Object} data to send with message
   */
  notifyAll(message, data) {
    if (message !== Game.Notify.TICK)
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("b>f *", message, stringify(data));
    data._timestamp = Date.now();
    this._channels.forEach(channel => channel.emit(message, data));
  }

  /**
   * Broadcast a notification to all observers except the
   * given player.
   * @param {Player} player player to exclude
   * @param {string} message to send
   * @param {Object} data to send with message
   */
  notifyOthers(player, message, data) {
    /* c8 ignore next 2 */
    if (this._debug)
      this._debug("b>f !", player.key, message, stringify(data));
    data._timestamp = Date.now();
    this._channels.forEach(
      channel => {
        // Player may be connected several times, so check key and not object
        if (channel.player && channel.player.key !== player.key)
          channel.emit(message, data);
        return false;
      });
  }

  /**
   * Does player have an active connection to this game?
   * @param {Player} player the player
   * @return {Channel?} the connection channel, if connected.
   */
  getConnection(player) {
    // TODO: move this to backend
    if (player) {
      for (const channel of this._channels) {
        if (channel.player && channel.player === player) {
          player._isConnected = true;
          return channel;
        }
      }
      player._isConnected = false;
    }
    return undefined;
  }

  /**
   * Notify players with a list of the currently connected
   * players, non-playing observers and non-connected players.
   */
  sendCONNECTIONS() {
    Promise.all(
      this.players
      .map(player => player.sendable(this)
           .then(playerInfo => {
             playerInfo.gameKey = this.key;
             if (playerInfo.key === this.whosTurnKey)
               playerInfo.isNextToGo = true;
             return playerInfo;
           })))
    .then(res => {
      // Add observers who are not active players. These track
      // game state without participating, though at some point
      // we may add referreing functions.
      res = res.concat(
        this._channels
        .filter(channel => !channel.player)
        .map(() => {
          return {
            isObserver: true
          };
        }));
      this.notifyAll(Game.Notify.CONNECTIONS, res);
    });
  }

  /**
   * Connect to a player front end via the given notification channel.
   * Play the game if preconditions have been met.
   * @param {Channel} channel the channel that will be
   * used to send notifications to the front end for the given
   * player.
   * @param {string} playerKey the key identifying the player
   * @return {Promise} promise that resolves to undefined
   */
  connect(channel, playerKey) {

    // Make sure this is a valid (known) player
    const player = this.players.find(p => p.key === playerKey);
    /* c8 ignore next 2 */
    if (playerKey && !player)
      console.error("WARNING: player key", playerKey,
                    "not found in game", this.key);

    /* c8 ignore next 2 */
    if (this.getConnection(player)) {
      console.error("WARNING:", playerKey, "already connected to",
                    this.key);
      player._isConnected = true;
    } else if (player) {
      // This player is just connecting
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("\t", player.name, "connected to", this.key);
      player._isConnected = true;
    } else {
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug("\tconnected non-player");
    }

    // Player is connected. Decorate the channel. It may seem
    // rather cavalier writing over what might be a socket this
    // way, but it does simplify the code quite a bit.
    channel.game = this;
    channel.player = player;

    if (!this._channels)
      this._channels = [];
    this._channels.push(channel);

    // Tell players that the player is connected
    this.sendCONNECTIONS();

    // Add disconnect listener
    /* c8 ignore next */
    channel.on("disconnect", () => {
      if (channel.player) {
        channel.player._isConnected = false;
        /* c8 ignore next 2 */
        if (this._debug)
          this._debug(channel.player.name, "disconnected");
      } else {
        /* c8 ignore next 2 */
        if (this._debug)
          this._debug("non-player disconnected");
      }
      this._channels.splice(this._channels.indexOf(channel), 1);
      this.sendCONNECTIONS();
    });

    return this.playIfReady();
  }

  /**
   * Used for testing only.
   * @param sboard string representation of a game {@linkcode Board}
   * @return {Promise} resolving to `this`
   */
  loadBoard(sboard) {
    return this.promiseEdition()
    .then(ed => this.board.parse(this.constructor.CLASSES, ed, sboard))
    .then(() => this);
  }

  /**
   * @callback Platform~bestMoveCallback
   * @param {(Move|string)} best move found so far, or a
   * progress string for debug (only intended for developer)
   */

  /**
   * Find the best play. This is used to abstract
   * the best play controller from the rest of the server code,
   * so it can be invoked either directly or asynchronously.
   * @param {Game} game the Game
   * @param {Tile[]} rack rack in the form of a simple list of Tile
   * @param {Platform~bestMoveCallback} cb accepts a best play
   * whenever a new one is found, or a string containing a
   * message
   * @param {string?} dictionary name of (or path to) dictionary to
   * override the game dictionary
   * @return {Promise} Promise that resolves when all best moves
   * have been tried
   * @abstract
   */
  findBestPlay(rack, cb, dictionary) {
    return (Platform.USE_WORKERS
            ? import(
              /* webpackMode: "lazy" */
              /* webpackChunkName: "findBestPlayController" */
              "../backend/findBestPlayController.js")
            : import(
              /* webpackMode: "lazy" */
              /* webpackChunkName: "findBestPlay" */
              "../game/findBestPlay.js"))
    .then(mod => mod.findBestPlay(this, rack, cb, dictionary));
  }
}

export { Game }
