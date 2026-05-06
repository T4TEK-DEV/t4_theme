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
     * left edge and counter any containing-block offset so the row stays
     * pinned to the cursor.
     *
     * Odoo upstream pins the row with `position: fixed` and updates `left`
     * / `top` each pointermove to `cursor.{x,y} - clickOffset.{x,y}`
     * (draggable_hook_builder.js updateElementPosition). Two issues:
     *
     *   1. Cursor X drift visibly shifts the row out of column alignment.
     *   2. When any ancestor of the row creates a containing block for
     *      `position: fixed` (CSS `transform`/`filter`/`perspective`/
     *      `contain`/`will-change`), the row's `top`/`left` resolve
     *      relative to that ancestor instead of the viewport. Cursor
     *      coords stay viewport-relative, so the row visibly drifts away
     *      from the cursor by the offset between the ancestor and the
     *      viewport (~46px below cursor in our case).
     *
     * Fix:
     *   - `--t4-drag-locked-x`: pin the row's left to the table's left.
     *   - `--t4-drag-cb-offset-{x,y}`: detect containing-block offset by
     *     comparing the resolved rect against what we asked for, then
     *     counter it via a translate. Read once at dragStart since the
     *     containing block does not change mid-drag.
     *
     * The `!important` rules in x2many_grouped.scss apply both vars and
     * win over Odoo's inline `left/top: ...px`.
     *
     * Cell widths are still copied from headers by the original sortStart
     * (super call), so the row keeps its column proportions.
     */
    sortStart(params) {
        const result = super.sortStart(params);
        if (this.tableRef && this.tableRef.el && params && params.element) {
            const el = params.element;
            const tableRect = this.tableRef.el.getBoundingClientRect();
            el.style.setProperty("--t4-drag-locked-x", `${tableRect.left}px`);
            // Force a reflow via getBoundingClientRect so the rect reflects
            // the just-applied X lock, then derive the containing-block
            // offset from the diff between resolved rect and asked-for
            // values. styleTop is what Odoo wrote inline (viewport coord).
            const rect = el.getBoundingClientRect();
            const styleTop = parseFloat(el.style.top) || 0;
            const cbOffsetX = rect.left - tableRect.left;
            const cbOffsetY = rect.top - styleTop;
            el.style.setProperty("--t4-drag-cb-offset-x", `${-cbOffsetX}px`);
            el.style.setProperty("--t4-drag-cb-offset-y", `${-cbOffsetY}px`);
        }
        return result;
    },

    sortStop(params) {
        if (params && params.element) {
            params.element.style.removeProperty("--t4-drag-locked-x");
            params.element.style.removeProperty("--t4-drag-cb-offset-x");
            params.element.style.removeProperty("--t4-drag-cb-offset-y");
        }
        return super.sortStop(params);
    },
});
