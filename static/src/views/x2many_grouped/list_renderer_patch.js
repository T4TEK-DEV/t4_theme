/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { ListRenderer } from "@web/views/list/list_renderer";

// Register the additional optional prop so OWL prop validation passes.
if (!ListRenderer.props.includes("t4WithRowNumber?")) {
    ListRenderer.props.push("t4WithRowNumber?");
}

patch(ListRenderer.prototype, {
    /**
     * Inject a virtual STT (sequence number) column into the active column
     * list when `t4WithRowNumber` is set on the renderer props.
     *
     * The column is a real entry in `this.columns` (not a template-injected
     * cell) so Odoo's `useMagicColumnWidths` hook computes widths correctly:
     *
     *   - `attrs.width = "48px"` → getWidthSpecs returns minWidth=maxWidth=48
     *   - `type = "t4_stt"` (custom) → canShrink=false, so the hook never
     *     squeezes STT below 48px even when the parent is narrow
     *   - `column.id = "_t4_stt"` is unique → magic-widths' hash detects
     *     the column set correctly when STT toggles on/off
     *
     * Position:
     *   - if a `widget="handle"` column exists, STT goes immediately after
     *     it so the drag handle stays leftmost (matches list-editable
     *     convention)
     *   - otherwise STT is the leading column, after the optional selector
     *
     * The dedicated cell is rendered in list_renderer_stt.xml via a
     * `column.type === "t4_stt"` branch added to both the thead foreach
     * (label "STT") and the row foreach (row number).
     */
    getActiveColumns() {
        const baseColumns = super.getActiveColumns();
        if (!this.props.t4WithRowNumber) {
            return baseColumns;
        }
        const sttColumn = {
            id: "_t4_stt",
            type: "t4_stt",
            name: "_t4_stt",
            label: "STT",
            attrs: { width: "48px" },
            optional: false,
            hasLabel: false,
            invisible: undefined,
            column_invisible: undefined,
        };
        const handleIdx = baseColumns.findIndex((col) => col.widget === "handle");
        const insertIdx = handleIdx >= 0 ? handleIdx + 1 : 0;
        const newColumns = baseColumns.slice();
        newColumns.splice(insertIdx, 0, sttColumn);
        return newColumns;
    },

    /**
     * Compute the global 1-based row number for a given record, accounting
     * for the current list offset (pagination). Used by the STT column
     * cell rendered in list_renderer_stt.xml.
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
