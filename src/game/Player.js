/*Copyright (C) 2019-2024 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/**
 * A player in a {@linkcode Game}. Player objects are specific to
 * a single game, and are used on both browser and server sides.
 */
class Player {

  // Note that we do NOT use the field syntax for the fields that
  // are serialised. If we do that, then the constructor blows the
  // field away when loading CBOR.

  /**
   * @param {object} spec named parameters, or other Player
   * object to copy. `name` and `key ` are required. Any of `_debug`,
   * `isRobot`, `canChallenge`, `wantsAdvice`,`dictionary` or
   * `missNextTurn` can be passed. The player will be initialised with
   * an empty rack (no squares).
   * @param {object.<string,class>} factory maps class name to a class
   */
  constructor(spec = {}, factory) {

    /**
     * Factory object used to create this object (not serialisable)
     * @private
     */
    this._factory = factory;

    /**
     * Player unique key. Required.
     * @member {Key}
     */
    this.key = spec.key;

    /**
     * Player name. Required.
     * @member {string}
     */
    this.name = spec.name;

    /**
     * Rack of tiles. By default an 8-cell rack is created, but
     * this will be replaced on a call to fillRack, as
     * it's only then we know how big it has to be.
     * @member {Rack}
     */
    this.rack = new this._factory.Rack(
      this._factory, {id: `Rack_${this.key}`, size: 8 });

    /**
     * Number of times this player has passed (or swapped)
     * since the last non-pass/swap play.
     * @member {number}
     */
    this.passes = 0;

    /**
     * Player's current score.
     * @member {number}
     */
    this.score = 0;

    /**
     * True if this player is due to miss their next play due
     * to a failed challenge. Default is false.
     * @member {boolean}
     */
    this.missNextTurn = false;

    if (spec.clock)
      /**
       * Player countdown clock. In games with `timerType` `TIMER_TURN`,
       * this is the number of seconds before the player's turn times
       * out (if they are the current player). For `TIMER_GAME` it's
       * the number of seconds before the chess clock runs out.
       * Setting and management is done in {@linkcode Game}
       * @member {number?}
       */
      this.clock = 0;

    if (spec._isConnected)
      /**
       * Whether the backend thinks the player is connected or not.
       * Not serialised.
       * @member {boolean?}
       */
      this._isConnected = true;

    if (spec.wantsAdvice)
      /**
       * Set true to advise human player of better plays than the one
       * they used. Default is false.
       * @member {boolean?}
       */
      this.wantsAdvice = true;

    if (spec.isRobot)
      /**
       * Is player a robot? Default is false.
       * @member {boolean?}
       */
      this.isRobot = true;

    if (spec.canChallenge)
      /**
       * Can robot player challenge? Default is false.
       * @member {boolean?}
       */
      this.canChallenge = true;

    if (spec.dictionary)
      /**
       * Name of (or path to) the dictionary the robot will use. Defaults to
       * the game dictionary. Only used for findBestPlay for robot players.
       * Default is undefined.
       * @member {string?}
       */
      this.dictionary = spec.dictionary;

    if (spec.delayBeforePlay && spec.delayBeforePlay > 0)
      /**
       * Number of seconds that a robot player must wait before it
       * can play it's move. This delay is to give the revious player
       * time to take back their move (or just think!)
       * @member {number?}
       */
      this.delayBeforePlay = spec.delayBeforePlay;

    /**
     * Debug function
     * @member {function?}
     */
    this._debug = spec._debug;
  }

  /**
   * Create simple flat structure describing a subset of the player
   * state. This is used for sending minimal player information to
   * the `games` interface using JSON.
   * @param {Game} game the game the player is participating in
   * @param {UserManager?} um user manager for getting emails if wanted.
   * Only works server-side.
   * @return {Promise} resolving to a simple structure describing
   * the player
   */
  sendable(game, um) {
    return ((this.isRobot || !um)
            ? Promise.resolve(this)
            : um.getUser({ key: this.key }).catch(() => this))
    .then(ump => {
      const simple = {
        name: this.name,
        key: this.key,
        score: this.score
      };
      if (this.isRobot) simple.isRobot = true;
      if (this._isConnected) simple._isConnected = true;
      if (this.dictionary) simple.dictionary = this.dictionary;
      if (this.clock) simple.clock = this.clock;

      // Can they be emailed?
      if (ump.email) simple.email = true;

      if (this.missNextTurn) simple.missNextTurn = true;

      return simple;
    });
  }

  /**
   * Encode the player in a URI parameter block.
   * Keys:
   * `d` - (optional) dictionary
   * `k` - player key
   * `m` - (optional) miss next turn?
   * `n` - name
   * `p` - (if > 0) pass count
   * `r` - (if robot) robot?
   * `R` - rack
   * `s` - score
   * @return {object} packed parameter object
   */
  pack() {
    const packed = {};
    if (this.dictionary) packed.d = this.dictionary;
    packed.k = this.key;
    if (this.missNextTurn) packed.m = true;
    packed.n = this.name;
    if (this.passes > 0) packed.p = this.passes;
    if (this.isRobot) packed.r = true;
    packed.R = this.rack.pack();
    packed.s = this.score;
    return packed;
  }

  /**
   * Unpack a parameter block created by pack().
   * @param {Object} packed parameter block
   * @param {Edition} edition edition, used to get letter scores for
   * tiles.
   * @return {Player} this
   */
  unpack(packed, edition) {
    if (packed.d) this.dictionary = packed.d;
    this.key = packed.k;
    if (packed.m) this.missNextTurn = true;
    this.name = packed.n;
    if (packed.p) this.passes = Number(packed.p);
    if (packed.r) this.isRobot = true;
    this.rack.unpack(packed.R, edition);
    this.score = Number(packed.s);
    return this;
  }

  /**
   * Construct a player object from a structure generated by
   * sendable()
   * @param {object} simple object generated by sendable()
   * @param {object} factory class object mapping class name to a class
   * @return {Player} the generated player object
   */
  static fromSendable(simple, factory) {
    const player = new factory.Player(simple, factory);
    if (simple.passes)
      player.passes = simple.passes;
    if (simple.score)
      player.score = simple.score;
    if (simple.clock)
      player.clock = simple.clock;
    return player;
  }

  /**
   * Draw an initial rack from the letter bag.
   * @param {LetterBag} letterBag LetterBag to draw tiles from. Note that
   * tiles are copied, with the copy being constructed using the
   * factory that was passed to the constructor.
   * @param {number} rackSize size of the rack
   */
  fillRack(letterBag, rackSize) {
    // +1 to allow space for tile sorting in the UI
    // Use the player key for the rack id, so we can maintain
    // unique racks for different players
    this.rack = new (this._factory.Rack)(
      this._factory, { id: `Rack_${this.key}`, size: rackSize + 1 });
    for (let i = 0; i < rackSize; i++)
      this.rack.addTile(new (this._factory.Tile)(letterBag.getRandomTile()));
    this.score = 0;
  }

  /**
   * Return all tiles to the letter bag.
   * @param {LetterBag} letterBag LetterBag to return tiles to
   */
  returnTiles(letterBag) {
    for (let tile of this.rack.tiles())
      letterBag.returnTile(this.rack.removeTile(tile));
  }

  /**
   * Handle a tick of the server clock.
   */
  tick() {
    this.clock--;
    /* c8 ignore next 2 */
    if (this._debug)
      this._debug("Tick", this.name, this.clock);
    if (this.clock <= 0 && typeof this._onTimeout === "function") {
      /* c8 ignore next 2 */
      if (this._debug)
        this._debug(this.name, "has timed out at", new Date());
      this._onTimeout();
      // Timeout only happens once!
      delete this._onTimeout;
    }
  }

  /**
   * Set a timeout for the player, which will be triggered when the
   * clock reaches exactly 0. The timeout is only triggered once for
   * a call to setTimeout, resetting the clock will not invoke it
   * again.
   * @param {number} time number of seconds before timeout
   * @param {function} onTimeout a function() invoked if the
   * timer expires, ignored if time undefined
   */
  setTimeout(time, onTimeout) {
    /* c8 ignore next 2 */
    if (this._debug)
      this._debug(this.name, `turn timeout in ${time}s`);
    this.clock = time;
    this._onTimeout = onTimeout;
  }

  /**
   * Generate debug representation
   */
  stringify() {
    let s = `Player '${this.name}'`;
    if (this.isRobot)
      s += " (Robot)";
    if (this.key)
      s += ` key ${this.key}`;
    s += ` rack "${this.rack.letters().sort().join("")}"`;
    return s + ` score ${this.score}`;
  }

  /**
   * Toggle wantsAdvice on/off
   */
  toggleAdvice() {
    this.wantsAdvice = !this.wantsAdvice;
  }

}

export { Player }
