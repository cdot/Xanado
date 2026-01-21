# The Origins of Xanado

While there are a number of freely accessible servers out there
offering clones of the classic SCRABBLE® game, I wanted a game I
could host on my own server, so I could experiment with different
dictionaries, board layouts, tile sets, and rule combinations. And I
wanted it to be completely free. The public servers I found didn't
work for me because:

- Their code is not public, and setting up your own server is not an option.
- They are generally limited to a single version of the game.
- Their (English) dictionaries are usually based on the standard American Scrabble Tournament dictionary, which is stuffed full of obscure words that only a dedicated aficionado would know. This makes their robot games inaccessible for casual players, as a computer player will beat them every time.
- They plague you with tedious advertisements and in-app purchases.

Enter [Hans Hübner's html-scrabble](https://github.com/hanshuebner/html-scrabble), which this is a fork of.
I started out working on their code but rapidly realised the scope and
number of changes I intended required a fork, rather than bothering
them with hundreds of pull requests.

-- Crawford Currie

# Getting started
You will need installations of `git` and a recent version of `node.js` to
support development.

```
git clone https://github.com/cdot/Xanado.git
cd Xanado
npm install
npm run build
```
This clones the repository locally, then installs the dependencies.
Finally it builds the client code.

# File structure

Two versions are built, a client-server version supporting multiple
players, and a standalone version offering solo games against the
computer. As much as possible of the code is shared between the two versions.

The repository has subdirectories as follows:
* `audio` contains audio samples
* `bin` has top level scripts
* `build` has webpack configuration files used for building
* `css` contains style sheets
    * `css/default` contains the default theme. Other subdirectories
      contain files that can override all or some of the default css.
* `dictionaries` contains all the dictionaries
* `dist` is where distributions are built
* `editions` contains the edition specifications
* `games` contains the database of games (initially empty)
* `html` has the html for the user interfaces, `games_ui.html` for
  the control panel, `game_ui.html` for the game itself, and `solver.html` for the dictionary explorer.
* `i18n` contains the master English `en.json`, `qqq` documentation, and
  any other translations of the interface.
* `images` contains images used by the game
* `src` has all the source code
    * `src/backend` has game code specific to the backend
	* `src/browser` has shared browser-specific code
    * `src/client` has the client user interface code for the
      client-server version
    * `src/common` has generic code and interface specifications
	* `src/design` is the Valett program
	* `src/game` has basic game code shared between frontend and backend
	* `src/i18n` has the translations
	* `src/server` has the server code for the client-server version
    * `src/standalone` has the interfaces that run entirely
      in the browser
* `test` has all the unit tests and fixtures

# Flow of Control

Players access `/` on the server. This will load the games
interface, which is used to view available games and create new games.
The following describes the client-server version of the game.

A game is joined by opening a server URL which identifies the game
and player (`GET /join/gameKey/playerKey`). The server adds the
player to the game and responds with the gameKey and playerKey, and
establishes web sockets for further communication. The games interface
supports exploration of existing and past games, and creation of new
games. Players join a game from this interface, which redirects to
a game URL.

The game interface asks the server for the state of the
game using a `GET /game/gameKey` URI. The server recognises this as a
request for JSON, and serves up the game, as serialised to
(CBOR)[http://github.com/cdot/CBOR). The UI thaws this data and loads the
game, then manually connects the socket, attaching handlers.
 
Once construction is complete, the UI will listen for events coming
over the socket from the server and modify the client local copy of
the game accordingly. It will also listen for user interface events
coming from the user, and will POST messages using the `/command` route
to reflect user actions: `makeMove`, `challenge`, `swap`, `takeBack`,
`pass`, `confirmGameOver`, `pause` and `unpause`.

Information about a play is passed to the server in a `Move` object,
and results are broadcast asynchronously over the sockets as events
parameterised by `Turn` objects. A single play will usually result in
a single `Turn` being broadcast, but there is no theoretical
limit on the number of `Turn` objects that might be broadcast for a
single interactive play. For example, a robot play following a human
play will likely result in a sequence of turns. `Turn` objects are recorded
in the game history, allowing a full replay of game events at a later
date (e.g. when refreshing the UI.)

A complete list of the routes handled by the server can be found in
the code documentation for the `Server` class.

The standalone game works in essentially the same way, except that sockets
are not required and the game code that normally runs in the server, runs
directly in the browser instead.

# Testing
The `test` subdirectory contains unit tests for the server
written using the [mocha](https://mochajs.org/) framework. Run them using `npm run test`.

Also supported is test coverage analysis using [istanbul](https://istanbul.js.org/); run
`npm run coverage`.
Coverage statistics are outout in the `coverage` directory.

You can also run [eslint](https://eslint.org/) on the code using `npm run lint`.

The client UI supports an automaton for UI testing. This can be enabled by passing `autoplay` in the URL parameters to an open game. Once a first manual play has been played, all subsequent plays in that UI will be completed automatically.

# Debugging
## Server
`npm run debug_server` will run the server with debug options enabled
(very verbose). The `--debug` option to `bin/server.js` gives fine
control over the messages. Use `node --inspect bin/server.js` to run
the server with the Chrome debugger.

## Client
Client code is webpacked into the `dist` directory using
`npm run build`. This minifies the Javascript, making it hard to debug.
However `npm run debug_build` will webpack the code without minification,
making debugging easier.

If the server is run without any parameters (i.e. `node bin/server.js`)
then it will serve the top level HTML from the `dist` directory. This
requires that the `dist` code has been built.

Alternatively you can use the HTML direct from the `html` directory
by passing `--html html` to `node bin/server.js`. This HTML loads the
code direct from the `src` tree. and is the approach used during development.

## Standalone
Debugging is via the browser's built-in debugger. Adding the `debug` url parameter will make it output progress to the console.

# Publishing
First ensure indexes are up to date by running `npm run indexing`, and that
translations are consistent using `npm run tx`. Then run `npm run build`.

## Docker
`build/Dockerfile` is used for building local docker images (assuming you have
a docker server running, and it allows non-root builds).
```
npm run docker
```
will build a local docker image
```
$ docker run -p9093:9093 xanado
```
will run the image, mapping port 9093 on the docker image to port 9093 on the host. Note that docker requires the app to listen on all interfaces i.e. host `0.0.0.0`.

The docker image is automatically built when a new version
is checked in to github.

## npm
Use `npm publish --dry-run` to test the configuration and make sure all
required files are published. Publishing happens automatically when the
code is pushed to github (it's published to the npm repository, and
can be installed using `npm install @cdot/xanado`)

# Internationalisation
Xanado uses the
[Banana-i18n library](https://wikimedia.github.io/banana-i18n/)
to support translations. To generate your own translation, copy
`i18n/en.json` to a file using your language code (e.g. `uk.json` for
Ukranian) and edit the new file to provide the translation. `qqq.json`
contains descriptions of all the strings requiring translation. You
can use `npm run tx` to check the completeness of your translations.

There is a helper script `bin/txAssist.js` that can help with your
translation activities. Run it to get help.

If you create a new translation, you will have to add it to
`i18n/index.json` for the standalone game to pick it up (or run
`npm run indexing`, which will do that for you).

# Theming the UI
Support for theming the UI exists at two levels.
- To theme the look of the jQuery components of the UI, you can select
  a jQuery theme in the user preferences dialog.
- To theme the Xanado specific classes, you can add your own CSS file
  to the `css/` directory. An example is given in `css/exander77`.

If you add a new theme, use `npm run indexing` to add it to the index files for the standalone version.

# Build system
The build system uses [webpack](https://webpack.js.org/) to generate indexes and minimal browser scripts in the `dist` subdirectory. Run it using `npm run build` (or `npm run debug_build`). The `dist` code is built automatically
when the code is pushed to github.

When the server is run, it resolves the path to the client code using the optional `html_dir` configuration setting. This defaults to `dist`, so by default the webpacked client code is served to clients. `html_dir` can be overridden using the `--html`/`-h` options on the server invocation command line. Setting it to `html` will serve the unpacked client code instead (`npm run debug_server`).

# Documentation
The code is documented using `jsdoc`. The documentation is automatically
built when a new version is pushed to github, and can be found on <a href="https://cdot.github.io/Xanado/">github pages</a>.

For development, `npm run doc` will generate the documentation in the `doc`
directory.
You can read the doc in a browser by opening `file:///..../doc/index.html`
or, if the game server is running, by loading `http://localhost:9093/doc/index.html` (adjust URL to suit your install)

# Ideas

The github repository has a list of issues that need to be addressed, including
a number of enhancements. Here are some other enhancements that you might like
to explore.

## Designing your own game
Game definitions can be found in `.json` files in the `editions` directory. 

To create your own word game, it's easiest if you start from
one of the existing editions.
* `layout` - layout of the bottom right quadrant of the board (boards must
be bilaterally symmetrical). `M` is the middle/start square, `d` and `D` double
letter and double word squares, `t` and `T` triple, and `q` and `Q` quad.
`_` is an empty square.
* `swapCount` and `rackCount` are the sizes of the swap and main racks.
* `bonuses` maps from a number of tiles placed to a bonus score.
* `bag` is an array of tiles, each with:
 * `letter` a unicode string representing the letter. If not given
   then the tile is a blank.
 * `score` score for playing that tile
 * `count` number of that tile in the bag

If you create a new edition, you will have to add it to
`editions/index.json` for the standalone game to pick it up (or
`npx run build`, which will do that for you).

### Valett
Choosing point values for tiles, and the number of tiles of each letter,
can be difficult to get right. Included is a version of
[Joshua Lewis' Valett program](https://github.com/jmlewis/valett)
which analyses a word corpus and recommends tile values and counts for the
letter combinations encountered in the corpus based on probability (the corpus
can be any big list of words, or it can simply be a lexicon). Run the program
`node bin/valett.js` for help.

## Dictionary
Dictionary support uses the [dictionary](https://github.com/cdot/dictionary) npm module. 

Dictionaries are stored in the `dictionaries` directory. To build a new dictionary, create a file in that directory with the extension `.txt` and populate it with the words in the new dictionary, one per line. Use `make` to build it into a `.dict` file.

```
$ cd dictionaries && make
```
(If you don't have `make` you can run the `compress` program manually; see `dictionaries/Makefile` for help)

If you are extending an existing dictionary with new words, you don't
immediately need to run the compressor. If there is a file in the `dictionaries`
folder with the same name as the dictionary and the extension `.white`
it will be read and the words in it loaded into the dictionary when
the server starts. It will affect the performance of the dictionary,
so you are recommended to run the compressor every so often to
incorporate those words.

If you create a new dictionary, you will have to add it to
`dictionaries/index.json` for the standalone game to pick it up. This
is done automatically when you `npm run build`.

The dictionary support is designed to be reusable in other games. It might be fun to implement Wordle, for example, or the word search game often found in newspapers where you try to make as many words as possible from a 9 letter anagram. See [github](https://github.com/cdot/dictionary) for more.

## Public Server
It would be nice to see a truly public server that anyone could sign in to and play against other random people. However this would have to be done with great care.

- there are already a number of security features, such as simple XSS avoidance (thanks to @pkolano) and use of HTTPS, but it has some potential holes that might be exploited by an evil person. An audit is required.
- would also have to address things like the size and performance of the database, and the performance of the robot.
- the games interface would be unusable without some sort of grouping of users and/or games - for example, into "rooms".
