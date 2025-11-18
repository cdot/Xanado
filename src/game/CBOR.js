/*Copyright (C) 2023
 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

import { Encoder, Decoder, IDREFHandler, TypeMapHandler, KeyDictionaryHandler, TagHandler } from "@cdot/cbor";
import { Fridge } from "../common/Fridge.js";

// Use the same CBOR tag handler for encoding and decoding, switching the
// typeMap as required. This is Javascript, strictly synchronous.
const CBOR_tagHandler = new (KeyDictionaryHandler(
  IDREFHandler(TypeMapHandler(TagHandler))))({
    added: k => { throw Error(k) },
    keys: [
      // Square
      "type", "surface", "col", "row", "tile", "underlay",
      "letterScoreMultiplier", "wordScoreMultiplier",
      // Tile
      "letter", "score", "isBlank", "isLocked",
      // Surface
      "id", "cols", "rows", "squares", "midrow", "midcol",
      // LetterBag
      "tiles", "legalLetters", "isWild", "predictable",
      // Game
      "key", "state", "creationTimestamp", "players", "turns", "board",
      "rackSize", "swapSize", "bonuses", "letterBag", "whosTurnKey",
      "edition", "dictionary", "timerType", "timeAllowed", "timePenalty",
      "challengePenalty", "penaltyPoints",
      "wordCheck", "minPlayers", "maxPlayers", "predictScore",
      "allowTakeBack", "allowUndo", "syncRacks", "nextGameKey", "pausedBy",
      // Bonus levels
      "3", "4", "5", "6", "7", "8", "9",
      // Player
      "name", "rack", "passes", "clock", "missNextTurn", "wantsAdvice",
      "isRobot", "canChallenge", "delayBeforePlay",
      // Turn
      "gameKey", "playerKey", "nextToGoKey", "timestamp",
      "placements", "replacements", "challengerKey", "endState", "endStates",
      // EndState
      /*key, tiles, */"tilesRemaining", "time",
      // Move
      "words", "word",
      // findBestPlayController
      "game", "Platform", "data",
      // Replay
      "nextTurn", "predictable",
    ]
  });

class CBOR {
    /**
   * Encode the data using CBOR and the Game type map.
   * @param {object} data data to encode
   * @param {object.{string,object>} typeMap map from prototype name to prototype
   * @param {function?} debug debug function passed to cbor encoder, same
   * sig as console.debug.
   * @return {Uint8Array} encoded data
   */
  static encode(data, typeMap, debug) {
    // Debug function to find where a missing key is coming from
    /*function sniffOut(data, what, path) {
      if (typeof data === "object") {
        if (Array.isArray(data)) {
          for (const e of data)
            sniffOut(e, what, `${path}[]`);
        } else {
          if (!data._sniffed) {
            data._sniffed = true;
            if (typeof data[what] !== "undefined") {
              console.log("SNIFFED OUT", data);
              throw Error(path);
            }
            for (const k in data)
              sniffOut(data[k], what, `${path}.${k}`);
          }
        }
      }
    }
    sniffOut(data, "babefacebabeface", "");*/
    CBOR_tagHandler.typeMap = typeMap;
    return Encoder.encode(data, CBOR_tagHandler, debug);
  }

  /**
   * Decode the data using CBOR and the given type map.
   * @param {ArrayBuffer|TypedArray|DataView} cbor data to decode
   * @param {object.{string,object>} map from prototype name to prototype
   * @param {function?} debug debug function passed to cbor decoder, same
   * sig as console.debug.
   * @return {object} decoded data
   */
  static decode(cbor, typeMap, debug) {
    CBOR_tagHandler.typeMap = typeMap;
    try {
      return Decoder.decode(cbor, CBOR_tagHandler, debug);
    } catch (e) {
      // Maybe Fridge? Old format.
      if (debug)
        debug("CBOR error decoding:\n", e.message);

      // Compatibility; try using Fridge, versions of FileDatabase
      // prior to 3.1.0 used it.
      try {
        return Fridge.thaw(cbor.toString(), typeMap);
      } catch (e) {
        throw Error(`Thawing error: ${e}`);
      }
    }
  }
}

export { CBOR }
