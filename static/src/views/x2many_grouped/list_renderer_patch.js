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

    /**
     * Account for the leading STT column in the total column count.
     *
     * `nbCols` is consumed by 3 templates in web's list_renderer.xml:
     *   - empty filler rows (`<td t-att-colspan="nbCols">`)
     *   - the ungrouped "Add a line" row
     *   - the grouped "Add a line" row
     *
     * Without this override the filler/add-line rows render with a colspan
     * that is one cell short, leaving a visible gap on the right edge of
     * x2many lists where the STT column was injected.
     */
    get nbCols() {
        const base = super.nbCols;
        return this.props.t4WithRowNumber ? base + 1 : base;
    },

    /**
     * When the leading STT column is rendered, the group-name <th> needs to
     * span one more cell so the rest of the group header alignment is
     * preserved.
     */
    getGroupNameCellColSpan(group) {
        const base = super.getGroupNameCellColSpan(group);
        return this.props.t4WithRowNumber ? base + 1 : base;
    },

    /**
     * Lock the dragged row's horizontal position to the table's viewport
     * left edge so cursor X drift does not visibly shift the floating row
     * out of column alignment.
     *
     * Odoo upstream pins the row with `position: fixed` and updates `left`
     * each pointermove to `cursor.x - clickOffset.x` — there is no built-in
     * axis lock. We expose the table's left as a CSS variable on the
     * element; an `!important` rule in x2many_grouped.scss reads that var
     * and wins over Odoo's inline `left: ...px`.
     *
     * Cell widths are still copied from headers by the original sortStart
     * (super call), so the row keeps its column proportions.
     */
    sortStart(params) {
        const result = super.sortStart(params);
        if (this.tableRef && this.tableRef.el && params && params.element) {
            const tableRect = this.tableRef.el.getBoundingClientRect();
            params.element.style.setProperty(
                "--t4-drag-locked-x",
                `${tableRect.left}px`
            );
        }
        return result;
    },

    sortStop(params) {
        if (params && params.element) {
            params.element.style.removeProperty("--t4-drag-locked-x");
        }
        return super.sortStop(params);
    },
});
