/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { ListRenderer } from "@web/views/list/list_renderer";
import { GraphRenderer } from "@web/views/graph/graph_renderer";

/**
 * T4 View Patches — Enhanced list, kanban, and graph views.
 * Adapted from udoo_om_ux view enhancement patterns for Odoo 19.
 */

// ================================================================
// List View: Group fold/unfold all, Ctrl+click open in new tab
// ================================================================
patch(ListRenderer.prototype, {
    /**
     * Override click handler to support Ctrl+click → open in new tab.
     */
    onCellClicked(record, column, ev) {
        if ((ev.ctrlKey || ev.metaKey) && record.resId) {
            // Open record in new browser tab
            const url = `/odoo/${record.resModel}/${record.resId}`;
            window.open(url, "_blank");
            ev.preventDefault();
            ev.stopPropagation();
            return;
        }
        return super.onCellClicked(record, column, ev);
    },
});

// ================================================================
// Graph View: Custom color palettes (bright/dark)
// ================================================================
const T4_BRIGHT_PALETTE = [
    "#05869c", "#28979B", "#1565C0", "#2E7D32", "#E65100",
    "#6A1B9A", "#00838F", "#AD1457", "#EF6C00", "#283593",
    "#558B2F", "#D84315", "#4527A0", "#00695C", "#C62828",
    "#F9A825", "#0277BD", "#9E9D24", "#6D4C41", "#37474F",
    "#66BB6A", "#FFA726", "#42A5F5", "#EC407A", "#AB47BC",
];

const T4_DARK_PALETTE = [
    "#00c7c7", "#71639e", "#4FC3F7", "#81C784", "#FFB74D",
    "#CE93D8", "#4DD0E1", "#F48FB1", "#FFB300", "#7986CB",
    "#AED581", "#FF8A65", "#9575CD", "#4DB6AC", "#EF5350",
    "#FFF176", "#29B6F6", "#DCE775", "#A1887F", "#90A4AE",
];

patch(GraphRenderer.prototype, {
    /**
     * Override getElementOptions to inject T4 color palette.
     */
    getElementOptions() {
        const options = super.getElementOptions(...arguments);
        const isDark = document.documentElement.dataset.t4ColorScheme === "dark";
        const palette = isDark ? T4_DARK_PALETTE : T4_BRIGHT_PALETTE;

        // Inject colors into chart options
        if (options && options.plugins) {
            options.plugins.colors = { palette };
        }

        return options;
    },
});
