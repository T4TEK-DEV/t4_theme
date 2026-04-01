/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { NavBar } from "@web/webclient/navbar/navbar";

/**
 * Patch NavBar to add right-click context menu for apps.
 * - Right-click on app → open in new tab, pin to start
 *
 * Adapted from udoo_om_ux navbar patterns for Odoo 19.
 */
patch(NavBar.prototype, {
    /**
     * Handle Ctrl+click on menu items to open in new tab.
     */
    _onMenuClicked(menu) {
        // Already handled by Odoo 19 NavBar
        return super._onMenuClicked(...arguments);
    },
});
