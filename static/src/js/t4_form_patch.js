/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { FormRenderer } from "@web/views/form/form_renderer";

/**
 * Patch FormRenderer for enhanced layout:
 * - Side-by-side chatter on XL+ screens (beside form instead of below)
 * - Controlled by CSS class on the form container
 *
 * Adapted from udoo_om_ux form_renderer / chatter patterns.
 */
patch(FormRenderer.prototype, {
    setup() {
        super.setup(...arguments);
        // Add a class to enable side-by-side chatter on wide screens
        // The actual layout switching is done via CSS
    },
});
