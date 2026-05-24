/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { ListRenderer } from "@web/views/list/list_renderer";
import { onRendered } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

// Register the additional optional prop so OWL prop validation passes.
if (!ListRenderer.props.includes("t4WithRowNumber?")) {
    ListRenderer.props.push("t4WithRowNumber?");
}

const T4_ACTION_SERVICE = Symbol("t4ThemeActionService");

patch(ListRenderer.prototype, {
    setup() {
        super.setup();
        // Acquire actionService lazily — registry might be absent in some
        // test harnesses; fall back to no-op so the renderer keeps working.
        try {
            this[T4_ACTION_SERVICE] = useService("action");
        } catch (e) {
            this[T4_ACTION_SERVICE] = null;
        }
        // After each render, propagate group.t4Depth onto group <tr> as
        // data-t4-depth, and copy it down to data rows belonging to the
        // group. XML template inheritance does the same statically but the
        // DOM walk is a robust fallback when the inheritance hasn't loaded
        // (e.g. asset cache issues) — and the cost is negligible (one
        // table walk per render, no layout thrashing since we only touch
        // attributes).
        const applyTreeAttrs = () => {
            const tableEl = this.tableRef && this.tableRef.el;
            if (!tableEl) {
                return;
            }
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
            // Walk the group tree RECURSIVELY — top-level + every nested
            // level — so sub-groups also pick up their t4Depth. Earlier
            // versions only iterated `list.groups` (top level), which
            // worked for flat grouping but lost data-t4-depth on nested
            // sub-groups, and worse, the clearing pass above wiped the
            // attribute set statically by the template inheritance.
            const depthByGroupId = {};
            const collectDepths = (groups) => {
                if (!Array.isArray(groups)) {
                    return;
                }
                for (const group of groups) {
                    if (group && typeof group.t4Depth === "number") {
                        depthByGroupId[group.id] = group.t4Depth;
                    }
                    if (group && group.list && Array.isArray(group.list.groups)) {
                        collectDepths(group.list.groups);
                    }
                }
            };
            collectDepths(list.groups);
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
     * Compute the 1-based STT (row number) for a given record.
     *
     * Rules:
     *   - Grouped (any client-side widget setting `list.isGrouped`): STT
     *     restarts at 1 inside each group/sub-group. The record's index
     *     within its containing group's direct records (preferring
     *     `t4DirectRecords` set by the nested-group adapter, falling
     *     back to `records` for the legacy grouped widget) plus 1.
     *   - Ungrouped flat x2many: global index in `list.records` plus
     *     `list.offset` (pagination-aware), 1-based.
     *
     * Returns "" when the record is not found (e.g., draft row from
     * "Add a line" not yet committed) so the cell stays blank instead of
     * rendering a misleading 0 / negative number.
     */
    t4GetRowNumber(record) {
        const baseList = this.props.list;
        if (!baseList) {
            return "";
        }
        if (baseList.isGrouped && Array.isArray(baseList.groups)) {
            const localIdx = this._t4FindLocalIndex(baseList.groups, record);
            if (localIdx >= 0) {
                return localIdx + 1;
            }
            return "";
        }
        if (!baseList.records) {
            return "";
        }
        const idx = baseList.records.indexOf(record);
        if (idx < 0) {
            return "";
        }
        const rawOffset = baseList.offset;
        const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;
        return idx + offset + 1;
    },

    /**
     * Walk the group tree depth-first looking for `record`. Returns its
     * 0-based local index within the containing group's direct records,
     * or -1 if not found. Used only by `t4GetRowNumber` in grouped mode.
     *
     * Match by record.id (OWL StaticList internal id) instead of object
     * identity (`===` / indexOf). Identity-based match fails when the
     * record passed by the template is a reactive proxy wrapping a
     * different underlying ref than the one cached in `t4DirectRecords`
     * (happens when buckets are built from `toRaw(staticList)` records
     * but the renderer iterates the proxied list at a deeper nesting
     * level). `record.id` is stable per-instance across both refs.
     * resId fallback handles edge case where record.id is undefined.
     */
    _t4FindLocalIndex(groups, record) {
        const targetId = record && (record.id ?? record.resId);
        if (targetId == null) {
            return -1;
        }
        const matches = (r) =>
            r && (r.id === targetId || r.resId === targetId);
        for (const group of groups) {
            const list = group && group.list;
            if (!list) {
                continue;
            }
            const direct = Array.isArray(list.t4DirectRecords)
                ? list.t4DirectRecords
                : list.records;
            if (Array.isArray(direct)) {
                const idx = direct.findIndex(matches);
                if (idx >= 0) {
                    return idx;
                }
            }
            if (Array.isArray(list.groups) && list.groups.length) {
                const sub = this._t4FindLocalIndex(list.groups, record);
                if (sub >= 0) {
                    return sub;
                }
            }
        }
        return -1;
    },

    /**
     * Override Odoo's `getGroupLevel` for nested-group widget groups.
     *
     * Upstream formula:
     *   `props.list.groupBy.length - group.list.groupBy.length - 1`
     *
     * This assumes a multi-level groupBy where each nesting strictly
     * decreases the sub-list's groupBy.length. Our nested adapter sets
     * `subList.groupBy = ["_t4_nested"]` on parent buckets so Odoo
     * iterates `subList.groups`, but that gives `level = 1 - 1 - 1 = -1`
     * for the top-level group. The negative value flows through
     *   margin-inline-start: var(--o-list-group-level) * 1.5rem
     * pushing the caret off-screen to the left, so the user sees no
     * triangle on the FIRST group while nested groups (which have
     * `groupBy = []`, giving level 0) render their caret normally.
     *
     * Fix: for our groups (identifiable by `t4Depth`), return 0 always
     * — caret indent isn't needed because the SCSS already pads
     * `th.o_group_name` proportionally to depth. Non-t4 groups fall
     * through to upstream behavior.
     */
    getGroupLevel(group) {
        if (group && typeof group.t4Depth === "number") {
            return 0;
        }
        return super.getGroupLevel(group);
    },

    /**
     * Open-record click handler for nested-group widget. Opens the
     * record referenced by `group.t4OpenInfo` (set by the nested-group
     * adapter when `list_tree_open_field` resolves to a many2one).
     *
     * The button itself is rendered by the GroupRow template extension
     * in list_renderer_stt.xml — only when `group.t4OpenInfo` is set, so
     * other grouped list views are unaffected.
     */
    t4OpenGroupRecord(ev, group) {
        if (ev) {
            ev.stopPropagation();
            ev.preventDefault();
        }
        const actionSvc = this[T4_ACTION_SERVICE];
        const info = group && group.t4OpenInfo;
        if (!actionSvc || !info || !info.model || !info.resId) {
            return;
        }
        actionSvc.doAction({
            type: "ir.actions.act_window",
            res_model: info.model,
            res_id: info.resId,
            views: [[false, "form"]],
            target: "current",
        });
    },

    /**
     * Lock the dragged row's horizontal position to the table's viewport
     * left edge and counter any containing-block offset so the row stays
     * pinned to the cursor.
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
