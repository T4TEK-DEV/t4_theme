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
     * Lock the dragged row's position so it visually snaps to the
     * placeholder slot (the drop target) instead of floating wherever the
     * cursor goes.
     *
     * Odoo upstream pins the row with `position: fixed` and updates
     * `left` / `top` each pointermove to `cursor.{x,y} - clickOffset.{x,y}`
     * (draggable_hook_builder.js updateElementPosition). Cursor drift on
     * either axis visibly desyncs the row from the table column grid and
     * from the row slot the user is hovering.
     *
     * We expose two CSS variables on the dragged element:
     *   --t4-drag-locked-x : table's viewport left edge (constant per drag)
     *   --t4-drag-locked-y : current placeholder's viewport top edge,
     *                        refreshed on each pointermove via rAF
     *
     * `!important` rules in x2many_grouped.scss read these vars and win
     * over Odoo's inline `left/top: ...px`.
     *
     * Cell widths are still copied from headers by the original sortStart
     * (super call), so the row keeps its column proportions.
     */
    sortStart(params) {
        const result = super.sortStart(params);
        if (!params || !params.element) {
            return result;
        }
        const element = params.element;
        if (this.tableRef && this.tableRef.el) {
            const tableRect = this.tableRef.el.getBoundingClientRect();
            element.style.setProperty("--t4-drag-locked-x", `${tableRect.left}px`);
        }
        // The placeholder is a clone Sortable inserts into the table flow at
        // the drop target. We sync the dragged row's locked-y to its top so
        // the floating row visually sits in the slot the user is hovering.
        const tableEl = this.tableRef && this.tableRef.el;
        const findPlaceholder = () => {
            if (!tableEl) {
                return null;
            }
            // Placeholder = original <tr> cloned + Sortable's `d-table-row`
            // class; the original (this dragged row) is excluded by
            // :not(.o_dragged).
            return tableEl.querySelector(
                "tr.o_data_row.d-table-row:not(.o_dragged)"
            );
        };
        let rafId = null;
        const syncLockedY = () => {
            rafId = null;
            const placeholder = findPlaceholder();
            if (!placeholder) {
                return;
            }
            const top = placeholder.getBoundingClientRect().top;
            element.style.setProperty("--t4-drag-locked-y", `${top}px`);
        };
        const onPointerMove = () => {
            if (rafId !== null) {
                return;
            }
            rafId = requestAnimationFrame(syncLockedY);
        };
        document.addEventListener("pointermove", onPointerMove);
        // Initial sync so the row snaps before the first pointermove.
        syncLockedY();
        this._t4DragCleanup = () => {
            document.removeEventListener("pointermove", onPointerMove);
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        };
        return result;
    },

    sortStop(params) {
        if (this._t4DragCleanup) {
            this._t4DragCleanup();
            this._t4DragCleanup = null;
        }
        if (params && params.element) {
            params.element.style.removeProperty("--t4-drag-locked-x");
            params.element.style.removeProperty("--t4-drag-locked-y");
        }
        return super.sortStop(params);
    },
});
