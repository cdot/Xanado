/*@preserve Copyright (C) 2017-2019 Crawford Currie http://c-dot.co.uk license MIT*/

/**
 * Mini-widget that extends the jquery button widget to simplify using
 * buttons with images for icons, and no text. The "icon" option is extended
 * to detect if the icon-name starts with "ui-icon-" and if not, assumes the
 * icon is styled by the "icon_button" CSS class.
 * ```
 * $button.icon_button({ icon: "my-icon" });
 * ```
 * CSS
 * ```
 * .my_icon {background-image: url("../images/my_icon.svg")!important; }
 * ```
 * The `!important` is required to override jQuery.
 * ```
 * It also supports specifying an icon using a `data-icon` attribute in HTML
 * ```
 * &lt;button data-icon="my-icon">&lt;/button>
 * ```
 */
import "jquery";
import "jquery-ui";

$.widget("jquery.icon_button", $.ui.button, {
  _create: function () {
    this.options.icon = this.options.icon || this.element.data("icon");
    if (typeof this.options.showLabel === "undefined")
      this.options.showLabel = false;
    this._super();
  }
});

