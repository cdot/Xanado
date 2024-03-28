/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser */

/* global assert */
/* global Platform */

/**
 * Base class of modal dialogs with demand-loadable HTML and a submit
 * button.
 *
 * HTML is loaded on demand from the html directory, based in the `id`
 * of the dialog (or the `html` option.
 *
 * In the HTML, any input or select that has a "name" attribute will
 * be used to populate a structure representing the dialog data.
 *
 * If a `postAction` URL option is set, this structure will be posted to the
 * URL and the result passed to an optional `postResult` function.
 *
 * Alternatively (or additionally), the `onSubmit` option can be set to
 * a function that will be called with `this` when the submit button
 * is pressed, *before* the `postAction` is sent.
 */
class Dialog {

  /**
   * Construct the named dialog, demand-loading the HTML as
   * necessary. Note that most options are consistent with the dialog,
   * widget, with the exception of:
   * * `modal` defaults to true
   * @param {string} id the dialog name
   * @param {object} options dialog options. These are passed on the
   * dialog widget with some exceptions
   * @param {string?} options.html optional name of HTML file to
   * load, defaults to the id of the dialog
   * @param {string?} options.postAction AJAX call name. If defined,
   * the dialog fields will be posted here on close.
   * @param {function?} options.postResult passed result
   * of postAction AJAX call. Does nothing unless `postAction` is also
   * defined.
   * @param {function?} options.onSubmit Passed this, can be used without
   * postAction.
   * @param {function?} options.onReady Passed this, called when
   * openDialog has completed on the dialog (i.e. it's ready to be
   * interacted with)
   * @param {function?} options.debug same sig as console.debug
   * @param {function} options.error error function, passed jqXHR
   */
  constructor(id, options) {

    /**
     * Identifier for this dialog
     */
    this.id = id;

    assert(!options.open, "open is not supported");

    /**
     * Cache of settings
     * @member {object}
     */
    this.options = $.extend({
      modal: true,
      minWidth: 400,
      width: 'auto'
    }, options);

    /**
     * Cache of jQuery object
     * @member {jQuery}
     * @private
     */
    this.$dlg = $(`#${id}`);

    if (this.options.debug)
      this.options.debug("Constructing", id);

    let promise;
    if (this.$dlg.length === 0) {
      // HTML is not already present; load it asynchronously.
      const path = Platform.absolutePath(
        `html/${this.options.html || id}.html`);
      promise = $.get(path)
      .then(html_code => {
        if (this.options.debug)
          this.options.debug("\tloaded html from", path);
        const $dlg = $(document.createElement("div"))
              .attr("id", id)
              .addClass("dialog");
        $dlg.html(html_code);
        $("body").append($dlg);
        this.$dlg = $(`#${id}`);
      });
    } else
      promise = Promise.resolve();

    this.options.open = () => {
      let prom;
      if (this.$dlg.data("DIALOG_CREATED"))
        prom = this.openDialog();
      else {
        prom = this.createDialog()
        .then(() => {
          this.$dlg.data("DIALOG_CREATED", true);
          // Note that if a dialog is destroyed, then DIALOG_CREATED
          // has to be removed manually.
          return this.openDialog();
        });
      }
      prom
      .then(() => {
        this.$dlg.data("DIALOG_OPEN", true);
        this.enableSubmit();
        if (this.options.onReady)
          this.options.onReady(this);
      })
      .catch(e => console.error(e));
    };

    const foreclose = this.options.close;
    this.options.close = () => {
      this.$dlg.removeData("DIALOG_OPEN");
      if (typeof foreclose === "function")
        foreclose();
    };

    promise
    .then(() => {
        this.$dlg.dialog(this.options);
    });
  }

  /**
   * Handle dialog creation once the HTML has been loaded, mainly
   * for associating handlers and loading background data. This is
   * invoked on an `open` event rather than `create` so we can be
   * sure all initialisation steps are complete before the dialog
   * opens.
   * Override in subclasses to attach handlers etc. Subclasses should
   * call super.createDialog() first.
   * @protected
   */
  createDialog() {
    $("[data-i18n]", this.$dlg)
    .i18n();

    this.$dlg
    .find("input[data-i18n-placeholder]")
    .each(function() {
      $(this).attr("placeholder", $.i18n($(this).data("i18n-placeholder")));
    });

    // WARNING: if a checkbox has no label, this will spin!
    this.$dlg.find('input[type=checkbox]')
    .checkboxradio();

    this.$dlg.find("button").button();

    this.$dlg
    .find("label[data-image]")
    .each(function() {
      $(this).css("background-image",
                  `url("${$(this).data('image')}")`);
    });

    const self = this;

    const $selects = this.$dlg.find("select");
    if ($selects.length > 0) {

      $selects
      .selectmenu()
      .on("selectmenuchange",
          function() {
            $(this).blur();
            self.$dlg.data("this").enableSubmit();
          });

      // Using tooltips with a selectmenu is tricky.  Applying
      // tooltip() to the select is useless, you have to apply it to
      // the span that is inserted as next sibling after the
      // select. However this span is not created until some
      // indeterminate time in the future, and there is no event
      // triggered.
      //
      // The following code waits until the selectmenus have
      // (hopefully!) been created before creating the tooltips.  This
      // works, up to a point, but there is some interaction that
      // causes flickering between the tooltip and the dropdown menu
      // that makes it unusable. The code is kept for reference.
      /*
      setTimeout(
        () => {
          // prev ~ siblings selects all sibling elements that follow after
          // the “prev” element, have the same parent, and match the
          // filtering “siblings” selector.
          const $tts = this.$dlg
                .find('select[data-i18n-tooltip] ~ .ui-selectmenu-button');
          $tts.tooltip({
            // the .ui-selectmenu-button has no title attribute, so we have
            // to define items
            items: ".ui-selectmenu-button",
            position: {
              my: "left+15 center",
              at: "right center",
              within: "body"
            },
            content: function() {
              const $select = $(this.previousSibling);
              return $.i18n($select.data('i18n-tooltip'));
            }
          });
        }, 100);
      */

    }

    this.$dlg.find("[data-i18n-tooltip]")
    .tooltip({
      items: "[data-i18n-tooltip]",
      content: function() {
        return $.i18n($(this).data("i18n-tooltip"));
      }
      /* c8 ignore stop */
    });

    $(".submit", this.$dlg)
    .on("click", () => this.submit());

    if (this.options.debug)
      this.options.debug("\tcreated", this.id);
    return Promise.resolve();
  }

  /**
   * Subclass to set any dynamic values from context.
   * Superclass must be called BEFORE subclass code.
   * @return {Promise} promise that resolves to undefined
   */
  openDialog() {
    if (this.options.debug)
      this.options.debug("\topening", this.id);
    this.$dlg.data("this", this);
    return Promise.resolve(this);
  }

  /**
   * Validate fields to determine if submit can be enabled.
   * Override in subclasses.
   */
  canSubmit() {
    return true;
  }

  /**
   * Enable submit if field values allow it.
   * @protected
   */
  enableSubmit() {
    this.$dlg.find(".submit").prop(
      "disabled", !this.canSubmit());
  }

  /**
   * Populate a structure mapping field names to values.
   * @param {object} p optional hash of param values, so subclasses
   * can handle non-input type data.
   */
  getFieldValues(p)  {
    if (!p)
      p = {};
    this.$dlg
    .find("input[name],select[name],textarea[name]")
    .each(function() {
      let name = $(this).attr("name");
      let value;
      if (this.type === "checkbox")
        value = $(this).is(":checked") ? true : false;
      else if (this.type === "radio") {
        if (!$(this).is(":checked"))
          return;
        // Radio buttons are grouped by name, so use id
        name = this.id;
        value = true;
      } else if (this.type === "number") {
        value = parseInt($(this).val());
        if (isNaN(value))
          return;
      } else // text, password, email, <select, <textarea
        value = $(this).val() || $(this).text();
      //console.debug(name,"=",value);
      // Collect <input with the same name, and make arrays
      if (typeof p[name] === "undefined")
        p[name] = value;
      else if (typeof p[name] === "string")
        p[name] = [ p[name], value ];
      else
        p[name].push(value);
    });

    return p;
  }

  /**
   * Handle submit button
   * @param {object} vals optional hash of param values, so subclasses
   * can handle non-input type data.
   * @private
   */
  submit(vals) {
    vals = this.getFieldValues(vals);

    if (this.options.onSubmit)
      this.options.onSubmit(this, vals);

    this.$dlg.dialog("close");

    if (!this.options.postAction)
      return;

    // Note that password fields are sent as plain text. This is
    // not a problem so long as the comms are protected by HTTPS,
    // and is simpler/cleaner than using BasicAuth.
    // Some day we may implement OpenAuth, but there's no hurry.
    $.ajax({
      url: this.options.postAction,
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(vals)
    })
    .then(data => {
      if (typeof this.options.postResult === "function")
        this.options.postResult(data);
    })
    /* c8 ignore start */
    .catch(jqXHR => {
      // Note that the console sees an XML parsing error on a 401
      // response to /signin, due to the response body containing a
      // non-XML string ("Unauthorized"). It would be nice to catch
      // this gracefully and suppress the console print, but I can't
      // find any way to do that.
      if (typeof this.options.error === "function")
        this.options.error(jqXHR);
      else
        console.error(jqXHR.responseText);
    });
    /* c8 ignore stop */
  }
}

export { Dialog }
