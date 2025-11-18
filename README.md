# XANADO

## Word grid game

Play a variety of SCRABBLE®-like games against the computer, or host
your own web server to play games against friends and family.

You can try it [here](https://cdot.github.io/Xanado/dist/standalone_games.html)!

<p style="text-align:center;">
<img src="/images/splash.png" width="265" height="300" alt="Board" />
</p>

* Has a single-player version which runs entirely in the browser, and a multi-player version which uses a host server.
* You can play against a computer player, and/or against other people.
* Play against the clock if you want to.
* Supports several different board layouts, and you can even define your own.
- Includes sets of tiles for many different languages, and it's easy to add more.
* Has dictionaries in a number of languages, and it's straightforward to add your own.
* Supports logins, which helps you to set up tournaments and record long-term player performance (server version only).
* Players can use the dictionary to explore alternative moves (i.e. cheat).

# Installation

The server code is written in modern Javascript ES6 and the server is tested using `node.js` version 19.2.0. It may work in earlier versions of `node.js`, but is untested. The server has only been tested running on Ubuntu 22.04.

The browser code is also written in Javascript ES6 and works in all the
browsers tested so far. Oldest tested versions are:

* Chrome 72
* Edge 80
* Firefox 80
* Opera 60
* Safari 14.1 (Big Sur)

## Single-player (runs in the browser)

If you want to play the single-player version against the computer, then all
you have to do is to visit a server where it has been installed.
Nothing is saved back to the server. Games are saved in the `localStorage`
area in your browser which has a limited size, so don't get too carried away!

You can try it [here](https://cdot.github.io/Xanado/dist/standalone_games.html).

## Multi-player (client-server)

### [Docker](https://www.docker.com)
The simplest way to install the server is to use the latest Docker
image, which you can find on [github](https://github.com/cdot/Xanado/pkgs/container/xanado).
The Docker image takes care of all dependencies for you. Download the image and:
```
$ docker run -p 9093:9093 xanado
```
to run the server on port 9093 of the host machine.

### npm
If you are familar with npm you can install the production version of
Xanado directly:
```
$ npm install --global @cdot/xanado
```

### Developers
There is developer documentation [here](DEVELOPING.md).

### Configuring the server
The default configuration is described [here](CONFIGURATION.md).
You can override any of the configuration defaults using `--config`.

Once you are happy with the configuration, run the server with:
```
npm run server
```
You can then visit the games page at `http://localhost:9093`.

### Playing with other people

If you want other internet users to access your game server, they have
to be able to access a port on the server. If your server is already
public on the internet that's no problem, but if it is hidden away on
your local area network, you may need to make it visible. Fortunately
that's fairly easy to do, and does not compromise security if it's
done properly.
[This article](https://medium.com/botfuel/how-to-expose-a-local-development-server-to-the-internet-c31532d741cc) describes how.

If you want the server to send out email invitations, you should refer to the `nodemailer` documentation for information on how to configure it.

# Usage

The instructions are pretty much the same for both the single-player and
the multi-player versions, except that you are always "signed in" on the
single-player version and there are some minor differences in the interface.

Players start on the games page. This shows a leader board and a list
of games. You can select "Show finished games" to view games that have
ended.

When you click on a game, a dialog opens up showing a list of players
in the game with their scores and whether they are currently connected
or not.  If you are signed in, you can join the game (or open a game
you have previously joined), leave the game, add a robot, or delete
it.
 
If you are signed in you can also create a new game.  Normally one
player will create a game, then other players sign in and join
the game from the games page. 

The game interface is fairly self explanatory if you know
the [rules of Scrabble](https://www.officialgamerules.org/scrabble).

When you create a game you can select the edition (the game board,
rules, and tile set), the dictionary for checking words, and whether
there is to be a time limit. You can also set a minimum number of
players, or a maximum number of players who can join, and enable or
disable some gameplay features.

Anyone signed in to a multi-player game can add or remove a
robot player, or even delete the game, even if they are not a player.
You can only have one robot in any one game, and you need at least one
human player (otherwise, what's the point?)

When you add a robot to a game, you can optionally select a different
dictionary that the robot will search to find plays. Limiting the
robot to a smaller dictionary will give less challenging gameplay, but
may be more suitable for less experienced players.

Single-player games always have a robot.

The installation comes with a number of 'editions' that emulate some
commercially available games - SCRABBLE®, Super SCRABBLE®, Lexulous®,
and Words With Friends® - all of which have very similar
gameplay. And it's not too hard to create your own custom game, too.

## Game play

The game user interface uses the mouse, or screen touches on mobile
devices. Click the mouse on a letter in the rack and drag it to the
board position where you want to drop it, or touch the tile you want
to move, then touch where you want to place it.

You can also use the keyboard for rapid word entry.
* Click on any empty square on the board (or type `*`) and a "typing cursor" will appear, pointing right ⇒
* Click again (or hit the spacebar) and it will turn to point down ⇓
* Each letter from the rack that you type on the keyboard will be picked and placed, and the typing cursor moved in the direction it is pointing.
* If you type a letter that isn't on the rack, but you have a blank tile, then the blank will be used for that letter.
* Use Backspace or Delete to put the letter behind the typing cursor back on the rack.
* When the typing cursor is displayed, you can also use the arrow keys to move it around the board.
* You can still use the mouse while the typing cursor is visible.
* If you haven't placed any tiles on the board yet, you can hold down the `Alt` key and type letters from your rack to move them to the swap rack. You can't swap blanks.
* Typing a number instead of a letter will place/move the tile at the corresponding position on the rack (where the leftmost letter is '1').

There are also a number of other keyboard shortcuts:
* The `End` or `Enter` keys will make the current move.
* The `Home` key will take back placed tiles.
* `#` will shuffle the rack.
* `?` will pass the current turn.
* `!` will take back your last move, or challenge the last player's move, depending on what the log says.
* `;` will let you type into the chat window.

## Learning (and Cheating)

To abet the aspiring logodaedalus, there are some special 'chat' messages that can be entered.
- `hint` tells you the highest scoring play the computer can find for you, before your play.
- `advise` will turn on/off post-play analysis. This will suggest an alternative, higher-scoring play, if one exists, that you could have played.
- `allow <word>` adds `<word>` to the dictionary. The new word will not be written back to the dictionary database, so will be lost when the server is restarted. If you want to keep the word forever, see [Whitelists](#Whitelists).

Note that these only work in games for which a dictionary has been selected. To discourage cheating, everyone in the game is told when you use one of these special features.

# Editions

The `/editions` directory contains the files that are used to specify the
games that can be played. Each specification is made up from:
* A board layout, giving the size of the board and the locations of score multiplier squares
* A tile set, which lists the legal letters and the number of tiles of each letter
* A rack size, and the number of tiles you can swap
* Bonuses to be given for long words

The following editions are included:
* Scrabble, with tile sets for many languages
* English SuperScrabble (21x21 board)
* English Words with Friends
* English Lexulous

# Dictionaries
The `/dictionaries` directory contains the
dictionaries. Included with the installation are a number of pre-built dictionaries:
- `CSW2019_English` - 279496 words from the Collins Scrabble Words 2019 dictionary
- `CSW2021_English` - 279077 word bowdlerized version of CS2019, now the official dictionary for tournament play in most places
- `SOWPODS_English` - 267753 words from an [unofficial version](https://www.wordgamedictionary.com/sowpods/download/sowpods.txt) of the standard European English SCRABBLE® competition dictionary. Now replaced in most competitions by CSW2021.
- `German` - 404014 word list from the [germandict project on Sourceforge](https://sourceforge.net/projects/germandict/files/).
- `British_English` - a custom 67896 word British English dictionary, designed for casual players, to reflect the average vocabulary of a university-educated Briton. Note that many American spellings are also included, to reflect the flexible nature of our shared language.
- `ODS8_French` - 411430 word French SCRABBLE® competition dictionary.
- `Oxford_5000` - 29485 English words derived from the [Oxford Learner's Dictionary](https://www.oxfordlearnersdictionaries.com/wordlists/oxford3000-5000)
- `DISC_Catalan` - 582236 Catalan words.

See [DEVELOPING](DEVELOPING.md) for help on creating your own dictionary.

To help in dictionary development there is a simple user interface that lets you explore anagrams and hangmen arrangements of letters in the various dictionaries. You can find it [here](https://cdot.github.io/Xanado/html/solver.html).

## Whitelists
Regenerating a dictionary can be time consuming, so dictionaries can
be extended "on the fly" using a file containing a simple list of
words, one per line. The file must be alongside the dictionary file,
with the same name but the extension `.white`. For example,
`Oxford_5000.white`. The file will be read each time the server is
restarted. `allow` builds a whitelist in server memory, but it doesn't
write it back to the file - that's up to you.

# Server Security
The assumption is that you will be running the multi-player game server
on a private host with a limited, trustworthy audience.

The server can be configured to use HTTPS, see [configuration](CONFIGURATION.md)
for how. HTTPS is required for social media logins and notifications
to work, and is highly recommended when using default logins. To use
HTTPS you require an SSL certificate. See
https://linuxize.com/post/creating-a-self-signed-ssl-certificate/
for instructions.

Note that by default the server binds to `0.0.0.0:9093`. You can make it
bind to a specific host and/or different port using the
[configuration options](CONFIGURATION.md).

# Development

Further development is welcome, especially:
- User interface translations
- Security
- Dictionaries and tile sets for new languages
- Keeping dependencies up to date
See [DEVELOPING](DEVELOPING.md) for more.

# IMPORTANT NOTICES

- [SCRABBLE and SuperSCRABBLE](http://www.scrabble.com/) are registered trademarks owned in the USA and Canada by Hasbro Inc, and throughout the rest of the world by J.W. Spear & Sons Limited of Maidenhead, Berkshire, UK
- [Words With Friends](https://www.zynga.com/games/words-with-friends-2/) is a registered trademark of Zynga Inc, 699 Eighth Street, San Francisco, California 94103, USA
- [Lexulous](http://lexulous.com) is a registered trademark of RJ Softwares, 8th Floor, Lansdowne Court, 5B Sarat Bose Road, Kolkata, India 700020

This not-for-profit project is not associated with any of the owners
of the aforementioned trade marks.

The name "XANADO" is also used by a number of other businesses /
individuals. This not-for-profit project is not associated with any of
these businesses.

## Privacy

Xanado is hosted on your own server and doesn't store any information about you anywhere else. The standalone version hosted on github doesn't store any information either. If you suspect otherwise, please get in touch because that would be a bug!

## CODE COPYRIGHT AND LICENSE

The current code was written by Crawford Currie and is
Copyright &copy; 2021-2024 Xanado Project. However it is
built on the work of [many people](#CONTRIBUTORS). All these individuals
are acknowledged as sharing the copyright to parts of the work.

The code is licensed under the terms of the
[MIT license](https://en.wikipedia.org/wiki/MIT_License)
as the most restrictive of the licenses of the contributory works.

## CONTRIBUTORS
Xanado builds on previous work by many people, most notably Hans
Hübner, Daniel Weck, Elijah Sawyers, Andrew Appel, Guy Jacobsen, and
Joshua Lewis, and the many people who they in turn based their work
on.

A large number of [npm](https://www.npmjs.com/) modules are used,
directly or indirectly, for which their authors are acknowledged and
thanked.

This project is tested with [BrowserStack](https://www.browserstack.com/)

Direct contributors to Xanado are (in alphabetical order)
- Alexander Weps
- Crawford Currie
- Joan Montané
- Paul Kolano
- Warren Bank

All sounds were downloaded from [freesound.org](audio/ACKNOWLEDGEMENTS.md).
