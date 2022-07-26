## File structure

The installation has subdirectories as follows:
* `audio` contains audio samples
* `css` contains style sheets
    * `css/default` contains the default theme. Other subdirectories
      contain files that can override all or some of the default css.
* `dictionaries` contains all the dictionaries
* `editions` contains the edition specifications
* `games` contains the database of games (initially empty)
* `html` has the html for the user interfaces, `games.html` for the control panel, and `game.html` for the game itself.
* `i18n` contains the master English `en.json`, qqq documentation, and any other contributed translations of the interface.
* `images` contains images used by the game
* `js` has all the source code
    * `js/common` has generic code shared between server and browser
	* `js/dawg` is generation and management of DAWGs
	* `js/design` is the Valett program
	* `js/game` has game code shared between browser and server
	* `js/i18n` has the translations checker
	* `js/browser` is the browser code
	* `js/server` has the server code
* `test` has all the unit tests and fixtures

## Building your own dictionary

Dictionaries are stored in the `dictionaries` directory in the form of
a DAWG (Directed Acyclic Word Graph), which is generated from a
lexicon (list of words) using a processor based on [Daniel Weck's
DAWG_Compressor program](https://github.com/danielweck/scrabble-html-ui). To build a new dictionary, follow the
instructions given when you run:
```
$ node js/dawg/compressor.js
```
`js/dawg/explore.js` can be used to explore the generated DAWG(s) e.g.
```
$ node js/dawg/explore.js SOWPODS_English --anagrams scrabble
```
Run it with no parameters for help.

If you are extending an existing dictionary with new words, you don't
need to run the compressor. If there is a file in the `dictionaries`
folder with the same name as the dictionary and the extension `.white`
it will be read and the words in it loaded into the dictionary when
the server starts. It will affect the performance of the dictionary,
so you are recommended to run the compressor every so often to
incorporate those words.

## Flow of Control

Players access `/` on the server. This will load the `games`
interface, which is used to view available games and create new games.

A game is joined by opening a URL which identifies the game
and player (`GET /join/gameKey/playerKey`). The server adds the
player to the game and responds with the gameKey and playerKey. The 
`games` interface then opens a new window on `html/game.html`, which
loads the UI. When the document is ready, it executes `/js/game.js`,
which creates the UI.

Construction of the UI object asks the server for the state of the
game using a `GET /game/gameKey` URI. The server recognises this as a
request for JSON, and serves up the game, as serialised by
`js/game/Freeze.js`.  The UI thaws this data and loads the game, then
manually connects the `WebSocket`, attaching handlers for managing the
socket.
 
Once construction is complete, the UI will listen for events coming
over the socket from the server and modify the client local copy of
the game accordingly. It will also listen for events coming from the
user, and will POST messages using the `/command` route to reflect
user actions: `makeMove`, `challenge`, `swap`, `takeBack`, `pass`,
`confirmGameOver`, `pause` and `unpause`.

Information about a play is passed to the server in a `Move` object,
and results are broadcast asynchronously as `turn` events
parameterised by `Turn` objects. A single play will usually result in
a single `Turn` object being broadcast, but there is no theoretical
limit on the number of `Turn` objects that might be broadcast for a
single interactive play. For example, a robot play following a human
play will result in a sequence of turns. `Turn` objects are recorded
in the game history, allowing a full replay of game events at a later
date (e.g. when refreshing the Ui.)

## Testing
The `test` subdirectory contains unit tests for the server
written using the `mocha` framework. Run them using `npm run test`.

Also supported is test coverage analysis using `istanbul`; run
`npm run coverage`.
Coverage statistics are outout in the `coverage` directory.

You can also run `eslint` on the code using `npm run lint`.

## Internationalisation
Xanado uses the [Wikimedia jQuery.i18n framework](https://github.com/wikimedia/jquery.i18n) to support translations. Currently translation files are provided for English, (une très mauvaise traduction en) French, and (eine schlechte Übersetzung ins) German. To generate your own translation, copy `/i18n/en.json` to a file using your language code (e.g. `it` for Italian) and edit the new file to provide the translation. You can use `npm run tx` to check the completeness of your translations.

## Documentation
The code is documented using `jsdoc`. The documentation is automatically
built when a new version is pushed to github, and can be found on <a href="https://cdot.github.io/Xanado/">github pages</a>.

For development, `npm run doc` will generate the documentation in the `doc`
subdirectory.
You can read the doc in a browser by opening `file:///..../doc/index.html`
or, if the game server is running, by loading `http://localhost:9093/doc/index.html` (adjust URL to suit your install)

## Docker
`Dockerfile` can be used for building local docker images (assuming you have
a docker server running).
```
npm run docker
```
will build an image using `Dockerfile`
```
$ docker run -p9093:9093 xword
```
will run the image, mapping `localhost` port 9093 to port 9093 on the docker image. The docker image is automatically built when a new version is checked in
to github.

## Ideas

The github repository has a list of issues that need to be addressed, including
a number of enhancements. Here are some other enhancements that you might like
to explore.

### Designing your own game
Game definitions can be found in the `/editions` directory. Each
definition describes the layout of the lower-right quadrant of the
board (it is assumed to be mirrored), the contents of the bag, the
number of tiles on the rack, the number of tiles that can be swapped
in a play, and the bonuses for playing certain numbers of tiles in one
play.

### Valett
Choosing point values for tiles, and the number of tiles of each letter,
can be difficult to get right. Included is a version of
[Joshua Lewis' Valett program](https://github.com/jmlewis/valett)
which analyses a word corpus and recommends tile values and counts for the
letter combinations encountered in the corpus based on probability (the corpus
can be any big list of words, or it can simply be a lexicon). Run the program
`node js/design/valett.js` for help.

### DAWG
The DAWG support is designed to be reusable in other games. It might be fun to implement Wordle, for example, or the word search game often found in newspapers where you try to make as many words as possible from a 9 letter anagram. The `js/dawg/explore.js` is a basic command-line tool for exploring a DAWG.

### Public Server
It would be nice to see a truly public server that anyone could sign in to and play against other random people. However this would have to be done with great care.

- there are already a number of security features, such as simple XSS avoidance (thanks to @pkolano) and use of HTTPS, but it has some potential holes that might be exploited by an evil person. An audit is required.
- would also have to address things like the size and performance of the database, and the performance of the robot.
- the games interface would be unusable without some sort of grouping of users and/or games - for example, into "rooms".
