/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { ListRenderer } from "@web/views/list/list_renderer";
import { onRendered } from "@odoo/owl";

// Register the additional optional prop so OWL prop validation passes.
if (!ListRenderer.props.includes("t4WithRowNumber?")) {
    ListRenderer.props.push("t4WithRowNumber?");
}

patch(ListRenderer.prototype, {
    setup() {
        super.setup();
        // After each render, propagate group.t4Depth onto group <tr> as
        // data-t4-depth, and copy it down to data rows belonging to the
        // group. XML template inheritance does the same statically but the
        // DOM walk is a robust fallback when the inheritance hasn't loaded
        // (e.g. asset cache issues) — and the cost is negligible (one
        // table walk per render, no layout thrashing since we only touch
        // attributes).
        // Propagate group depth (computed by the x2many_grouped adapter
        // from `t4_tree_depth`) onto each <tr> as `data-t4-depth`. SCSS
        // uses that attribute solely to indent the first cell per depth —
        // no other attributes (no `data-t4-last`/`-first`) needed.
        const applyTreeAttrs = () => {
            const tableEl = this.tableRef && this.tableRef.el;
            if (!tableEl) {
                return;
            }
            // Clear stale attrs from any previous render.
            for (const tr of tableEl.querySelectorAll(
                "tr[data-t4-depth], tr[data-t4-last], tr[data-t4-first]"
            )) {
                tr.removeAttribute("data-t4-depth");
                tr.removeAttribute("data-t4-last");
                tr.removeAttribute("data-t4-first");
            }
            const list = this.props && this.props.list;
            if (!list || !list.isGrouped || !Array.isArray(list.groups)) {
                return;
            }
            const depthByGroupId = {};
            list.groups.forEach((group) => {
                if (group && typeof group.t4Depth === "number") {
                    depthByGroupId[group.id] = group.t4Depth;
                }
            });
            for (const tr of tableEl.querySelectorAll(
                "tr.o_group_header, tr.o_data_row"
            )) {
                const gid = tr.getAttribute("data-group-id");
                if (gid && gid in depthByGroupId) {
                    tr.setAttribute("data-t4-depth", String(depthByGroupId[gid]));
                }
            }
        };
        onRendered(() => {
            requestAnimationFrame(applyTreeAttrs);
        });
    },

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
     *
     * Edge cases:
     *   - Record không có trong `records` (ví dụ draft mới tạo bằng
     *     "Add a line" chưa commit vào StaticList): trả về chuỗi rỗng
     *     thay vì 0 — fallback `idx=0` cũ làm STT âm khi `offset < 0`.
     *   - `offset` âm: ở x2many StaticList, `offset` có thể tạm thời nhận
     *     giá trị âm khi Odoo điều chỉnh count sau commit (đã thấy STT
     *     hiển thị -39 do `0 + (-40) + 1`). Clamp về 0 cho an toàn —
     *     pagination thực không bao giờ dưới 0.
     */
    t4GetRowNumber(record) {
        const baseList = this.props.list;
        if (!baseList || !baseList.records) {
            return "";
        }
        let idx = baseList.records.indexOf(record);
        // Grouped fallback: walk visible groups in render order khi record
        // nằm trong subList của 1 group nhưng records chính chưa sync
        // (xảy ra ngay sau khi attachGroupingToList rebuild groups).
        if (idx < 0 && Array.isArray(baseList.groups)) {
            let walked = 0;
            for (const group of baseList.groups) {
                if (group && group.isFolded) {
                    continue;
                }
                const recs = group && group.list && group.list.records;
                if (!recs) {
                    continue;
                }
                const local = recs.indexOf(record);
                if (local >= 0) {
                    idx = walked + local;
                    break;
                }
                walked += recs.length;
            }
        }
        if (idx < 0) {
            return "";
        }
        const rawOffset = baseList.offset;
        const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;
        return idx + offset + 1;
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
