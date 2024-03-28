/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/**
 * Interface isolating platform details from the rest of
 * the code. The purpose is to allow common code to run on
 * both browser and server.
 * @interface
 */
class Platform {

  /* c8 ignore start */

  /**
   * Make a loud noise about a failure and throw a suitable error.
   * @param {string} descr Error description
   * @throws {Error}
   */
  static fail(descr) {
    throw Error(`Platform.fail ${descr}`);
  }

  /**
   * Emit the given event for handling by the platform's event system
   * @param {string} event name of event to emit
   * @param {object[]} args array of arguments to pass to the
   * event handler
   * @abstract
   */
  static trigger(event, args) {
    throw Error(`Platform.trigger ${event} ${args}`);
  }

  /**
   * Signature as {@link https://nodejs.org/api/path.html#pathformatpathobject|path.parse}
   * @param {string} p a path to split
   * @return {object}
   * @abstract
   */
  static parsePath(p) {
    throw Error(`Platform.parsePath ${p}`);
  }

  /**
   * Signature as {@link https://nodejs.org/api/path.html#pathformatpathobject|path.format}
   * @param {object} p a path object
   * @return {string}
   * @abstract
   */
  static formatPath(p) {
    throw Error(`Platform.formatPath ${p}`);
  }

  /**
   * Get the absolute path to a file or directory relative to the root
   * of the installation. This can be a file path or a URL path,
   * depending on the context.
   * @param {string} p a path relative to the root of the installation
   * @abstract
   */
  static absolutePath(p) {
    throw Error(`Platform.absolutePath ${p}`);
  }

  /**
   * Read a text resource.
   * @return {Promise} resolves to the {string} contents.
   * @abstract
   */
  static getText(path) {
    throw Error(`Platform.getText ${path}`);
  }

  /**
   * Read JSON from a resource, and parse it.
   * @return {Promise} resolves to the (parsed) contents.
   * @abstract
   */
  static getJSON(path) {
    throw Error(`Platform.getJSON ${path}`);
  }

  /**
   * Read binary data from a resource.
   * @return {Promise} resolves to the {Buffer} contents.
   * @abstract
   */
  static getBinary(path) {
    throw Error(`Platform.getBinary ${path}`);
  }

  /* c8 ignore stop */
}

export { Platform }
