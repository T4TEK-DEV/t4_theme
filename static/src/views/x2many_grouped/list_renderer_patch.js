/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { ListRenderer } from "@web/views/list/list_renderer";

// Register the additional optional prop so OWL prop validation passes.
if (!ListRenderer.props.includes("t4WithRowNumber?")) {
    ListRenderer.props.push("t4WithRowNumber?");
}

patch(ListRenderer.prototype, {
    /**
     * Compute the global 1-based row number for a given record, accounting
     * for the current list offset (pagination). Used by the leading "STT"
     * column injected via t4_theme.ListRendererSTT* template extensions.
     *
     * For both grouped and ungrouped lists we look up the index in
     * `props.list.records` (the master records array), so a record sitting
     * inside a client-side group still gets a globally-stable number.
     */
    t4GetRowNumber(record) {
        const baseList = this.props.list;
        if (!baseList || !baseList.records) {
            return "";
        }
        const offset = baseList.offset || 0;
        const idx = baseList.records.indexOf(record);
        return (idx >= 0 ? idx : 0) + offset + 1;
    },
});
