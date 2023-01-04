"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(window["webpackChunk_cdot_xanado"] = window["webpackChunk_cdot_xanado"] || []).push([["SettingsDialog"],{

/***/ "./src/browser/Dialog.js":
/*!*******************************!*\
  !*** ./src/browser/Dialog.js ***!
  \*******************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"Dialog\": () => (/* binding */ Dialog)\n/* harmony export */ });\n/* provided dependency */ var $ = __webpack_require__(/*! jquery */ \"./node_modules/jquery/dist/jquery.js\");\n/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado\n  License MIT. See README.md at the root of this distribution for full copyright\n  and license information. Author Crawford Currie http://c-dot.co.uk*/\n/* eslint-env browser */\n\n/* global Platform */\n\n/**\n * Base class of modal dialogs with demand-loadable HTML and a submit\n * button.\n *\n * HTML is loaded on demand from the html directory, based in the `id`\n * of the dialog (or the `html` option.\n *\n * In the HTML, any input or select that has a \"name\" attribute will\n * be used to populate a structure representing the dialog data.\n *\n * If a `postAction` URL option is set, this structure will be posted to the\n * URL and the result passed to an optional `postResult` function.\n *\n * Alternatively (or additionally), the `onSubmit` option can be set to\n * a function that will be called with `this` when the submit button\n * is pressed, *before* the `postAction` is sent.\n */\nclass Dialog {\n\n  /**\n   * Construct the named dialog, demand-loading the HTML as\n   * necessary. Do not use this - use {@linkcode Dialog#open|open()}\n   * instead.\n   * @param {string} id the dialog name\n   * @param {object} options options\n   * @param {string?} options.html optional name of HTML file to\n   * load, defaults to the id of the dialog\n   * @param {string?} options.postAction AJAX call name. If defined,\n   * the dialog fields will be posted here on close.\n   * @param {function?} options.postResult passed result\n   * of postAction AJAX call. Does nothing unless `postAction` is also\n   * defined.\n   * @param {function?} options.onSubmit Passed this, can be used without\n   * postAction.\n   * @param {function} options.error error function, passed jqXHR\n   */\n  constructor(id, options) {\n    /**\n     * Identifier for this dialog\n     */\n    this.id = id;\n\n    /**\n     * Cache of settings\n     * @member {object}\n     */\n    this.options = options;\n\n    /**\n     * Cache of jQuery object\n     * @member {jQuery}\n     * @private\n     */\n    this.$dlg = $(`#${id}`);\n\n    let promise;\n    if (this.$dlg.length === 0) {\n      // HTML is not already present; load it asynchronously.\n      promise = $.get(Platform.getFilePath(\n        `html/${options.html || id}.html`))\n      .then(html_code => {\n        $(\"body\").append(\n          $(document.createElement(\"div\"))\n          .attr(\"id\", id)\n          .addClass(\"dialog\")\n          .html(html_code));\n        this.$dlg = $(`#${id}`);\n      });\n    } else\n      promise = Promise.resolve();\n\n    promise\n    .then(() => this.$dlg.dialog({\n      title: options.title,\n      width: 'auto',\n      minWidth: 400,\n      modal: true,\n      open: () => {\n        let prom;\n        if (this.$dlg.data(\"dialog_created\"))\n          prom = this.openDialog();\n        else {\n          this.$dlg.data(\"dialog_created\", true);\n          prom = this.createDialog()\n          .then(() => this.openDialog());\n        }\n        prom\n        .catch(e => console.error(e));\n      }\n    }));\n  }\n\n  /**\n   * Handle dialog creation once the HTML has been loaded, mainly\n   * for associating handlers and loading background data. This is\n   * invoked on an `open` event rather than `create` so we can be\n   * sure all initialisation steps are complete before the dialog\n   * opens.\n   * Override in subclasses to attach handlers etc. Subclasses should\n   * return super.createDialog()\n   * @protected\n   */\n  createDialog() {\n    this.$dlg\n    .find(\"[data-i18n]\")\n    .i18n();\n\n    this.$dlg\n    .find(\"input[data-i18n-placeholder]\")\n    .each(function() {\n      $(this).attr(\"placeholder\", $.i18n(\n        $(this).data(\"i18n-placeholder\")));\n    });\n\n    this.$dlg\n    .find(\"label[data-image]\")\n    .each(function() {\n      $(this).css(\"background-image\",\n                  `url(\"${$(this).data('image')}\")`);\n    });\n\n    // Using tooltips with a selectmenu is tricky.\n    // Applying tooltip() to the select is useless, you have\n    // to apply it to the span that is inserted as next\n    // sibling after the select. However this span is not\n    // created until some indeterminate time in the future,\n    // and there is no event triggered.\n    //\n    // What we have to do is to wait until the selectmenus\n    // have (hopefully!) been created before creating the\n    // tooltips.\n    const self = this;\n    this.$dlg\n    .find('select')\n    .selectmenu()\n    .on(\"selectmenuchange\",\n        function() {\n          $(this).blur();\n          self.$dlg.data(\"this\").enableSubmit();\n        });\n\n    setTimeout(\n      () => this.$dlg\n      .find('select[data-i18n-tooltip] ~ .ui-selectmenu-button')\n      .tooltip({\n        items: \".ui-selectmenu-button\",\n        position: {\n          my: \"left+15 center\",\n          at: \"right center\",\n          within: \"body\"\n        },\n        content: function() {\n          return $.i18n(\n            $(this)\n            .prev()\n            .data('i18n-tooltip'));\n        }\n      }),\n      100);\n\n    this.$dlg.find(\".submit\")\n    .on(\"click\", () => this.submit());\n\n    this.enableSubmit();\n\n    console.debug(\"Created\", this.id);\n    return Promise.resolve();\n  }\n\n  /**\n   * Subclass to set any dynamic values from context.\n   * Superclass must be called BEFORE subclass code.\n   * @return {Promise} promise that resolves to undefined\n   */\n  openDialog() {\n    console.debug(\"Opening\", this.id);\n    this.$dlg.data(\"this\", this);\n    return Promise.resolve(this);\n  }\n\n  /**\n   * Validate fields to determine if submit can be enabled.\n   * Override in subclasses.\n   */\n  canSubmit() {\n    return true;\n  }\n\n  /**\n   * Enable submit if field values allow it.\n   * @protected\n   */\n  enableSubmit() {\n    this.$dlg.find(\".submit\").prop(\n      \"disabled\", !this.canSubmit());\n  }\n\n  /**\n   * Populate a structure mapping field names to values.\n   * @param {object} p optional hash of param values, so subclasses\n   * can handle non-input type data.\n   */\n  getFieldValues(p)  {\n    if (!p)\n      p = {};\n    this.$dlg\n    .find(\"input[name],select[name],textarea[name]\")\n    .each(function() {\n      let name = $(this).attr(\"name\");\n      let value;\n      if (this.type === \"checkbox\")\n        value = $(this).is(\":checked\") ? true : false;\n      else if (this.type === \"radio\") {\n        if (!$(this).is(\":checked\"))\n          return;\n        // Radio buttons are grouped by name, so use id\n        name = this.id;\n        value = true;\n      } else if (this.type === \"number\") {\n        value = parseInt($(this).val());\n        if (isNaN(value))\n          return;\n      } else // text, password, email, <select, <textarea\n        value = $(this).val() || $(this).text();\n      //console.debug(name,\"=\",value);\n      // Collect <input with the same name, and make arrays\n      if (typeof p[name] === \"undefined\")\n        p[name] = value;\n      else if (typeof p[name] === \"string\")\n        p[name] = [ p[name], value ];\n      else\n        p[name].push(value);\n    });\n\n    return p;\n  }\n\n  /**\n   * Handle submit button\n   * @param {object} vals optional hash of param values, so subclasses\n   * can handle non-input type data.\n   * @private\n   */\n  submit(vals) {\n    this.$dlg.dialog(\"close\");\n    vals = this.getFieldValues(vals);\n\n    if (this.options.onSubmit)\n      this.options.onSubmit(this, vals);\n\n    if (!this.options.postAction)\n      return;\n\n    // Note that password fields are sent as plain text. This is\n    // not a problem so long as the comms are protected by HTTPS,\n    // and is simpler/cleaner than using BasicAuth.\n    // Some day we may implement OpenAuth, but there's no hurry.\n    $.ajax({\n      url: this.options.postAction,\n      type: \"POST\",\n      contentType: \"application/json\",\n      data: JSON.stringify(vals)\n    })\n    .then(data => {\n      if (typeof this.options.postResult === \"function\")\n        this.options.postResult(data);\n    })\n    .catch(jqXHR => {\n      // Note that the console sees an XML parsing error on a 401\n      // response to /signin, due to the response body containing a\n      // non-XML string (\"Unauthorized\"). It would be nice to catch\n      // this gracefully and suppress the console print, but I can't\n      // find any way to do that.\n      if (typeof this.options.error === \"function\")\n        this.options.error(jqXHR);\n      else\n        console.error(jqXHR.responseText);\n    });\n  }\n}\n\n\n\n\n//# sourceURL=webpack://@cdot/xanado/./src/browser/Dialog.js?");

/***/ }),

/***/ "./src/browser/SettingsDialog.js":
/*!***************************************!*\
  !*** ./src/browser/SettingsDialog.js ***!
  \***************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"SettingsDialog\": () => (/* binding */ SettingsDialog)\n/* harmony export */ });\n/* harmony import */ var _Dialog_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Dialog.js */ \"./src/browser/Dialog.js\");\n/* provided dependency */ var $ = __webpack_require__(/*! jquery */ \"./node_modules/jquery/dist/jquery.js\");\n/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado\n  License MIT. See README.md at the root of this distribution for full copyright\n  and license information. Author Crawford Currie http://c-dot.co.uk*/\n\n/**\n * Dialog for user settings.\n */\n\n\nclass SettingsDialog extends _Dialog_js__WEBPACK_IMPORTED_MODULE_0__.Dialog {\n\n  constructor(options) {\n    super(\"SettingsDialog\", $.extend({\n      title: $.i18n(\"Options\")\n    }, options));\n\n    // Known users, got afresh from /users each time the\n    // dialog is opened\n    this.users = [];\n  }\n\n  // @override\n  createDialog() {\n    const curlan = $.i18n().locale;\n    //console.log(\"Curlan\",curlan);\n\n    this.$dlg.find('input[type=checkbox]').checkboxradio();\n    const ui = this.options.ui;\n    const $css = this.$dlg.find('[name=xanadoCSS]');\n    const $jqt = this.$dlg.find(\"[name=jqTheme]\");\n    const $locale = this.$dlg.find('[name=language]');\n\n    return Promise.all([ ui.getCSS(), ui.getLocales() ])\n    .then(all => {\n      all[0].forEach(css => $css.append(`<option>${css}</option>`));\n      all[1]\n      .filter(d => d !== \"qqq\")\n      .sort((a, b) => new RegExp(`^${a}`,\"i\").test(curlan) ? -1 :\n            new RegExp(`^${b}`,\"i\").test(curlan) ? 1 : 0)\n      .forEach(d => $locale.append(`<option>${d}</option>`));\n      $css.selectmenu();\n      $jqt.selectmenu();\n      $locale.selectmenu();\n      this.enableSubmit();\n      super.createDialog();\n    });\n  }\n\n  // @override\n  openDialog() {\n    return super.openDialog()\n    .then(() => {\n      const ui = this.options.ui;\n\n      this.$dlg.find('[name=theme]')\n      .val(ui.getSetting('theme'))\n      .selectmenu(\"refresh\");\n\n      this.$dlg.find(\"[name=jqTheme]\")\n      .val(ui.getSetting('jqTheme'))\n      .selectmenu(\"refresh\");\n\n      this.$dlg.find('input[type=checkbox]')\n      .each(function() {\n        $(this).prop('checked', ui.getSetting(this.name) === \"true\")\n        .checkboxradio(\"refresh\");\n      });\n      // Notification requires https\n      this.$dlg.find(\".require-https\").toggle(ui.usingHttps === true);\n    });\n  }\n}\n\n\n\n\n//# sourceURL=webpack://@cdot/xanado/./src/browser/SettingsDialog.js?");

/***/ })

}]);