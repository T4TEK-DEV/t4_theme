/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { X2ManyField } from "@web/views/fields/x2many/x2many_field";
import { useState, onWillRender } from "@odoo/owl";
import { wrapListWithGroups } from "./x2many_grouped_adapter";

const T4_GROUPED_FOLD_STATES = Symbol("t4ThemeX2mFoldStates");
const T4_GROUPED_CACHE = Symbol("t4ThemeX2mGroupedCache");

// =============================================================================
// DEBUG instrumentation — REMOVE after diagnosing render-loop
// =============================================================================
const T4_DEBUG_PATCH = {
    setupCalls: 0,
    rendererPropsCalls: 0,
    componentRenders: 0,
    cacheHits: 0,
    cacheMisses: 0,
    lastFlushAt: 0,
};
function t4DebugPatchFlush() {
    const now = performance.now();
    if (now - T4_DEBUG_PATCH.lastFlushAt < 500) {
        return;
    }
    T4_DEBUG_PATCH.lastFlushAt = now;
    const propsPerRender =
        T4_DEBUG_PATCH.componentRenders > 0
            ? (T4_DEBUG_PATCH.rendererPropsCalls / T4_DEBUG_PATCH.componentRenders).toFixed(1)
            : "n/a";
    // eslint-disable-next-line no-console
    console.log(
        `[t4-x2m] patch counters: setup=${T4_DEBUG_PATCH.setupCalls} ` +
            `componentRenders=${T4_DEBUG_PATCH.componentRenders} ` +
            `rendererProps=${T4_DEBUG_PATCH.rendererPropsCalls} ` +
            `(${propsPerRender}/render) ` +
            `hits=${T4_DEBUG_PATCH.cacheHits} miss=${T4_DEBUG_PATCH.cacheMisses}`
    );
}
window.__t4DebugX2mPatch = T4_DEBUG_PATCH;
window.__t4DebugX2mPatchReset = () => {
    T4_DEBUG_PATCH.setupCalls = 0;
    T4_DEBUG_PATCH.rendererPropsCalls = 0;
    T4_DEBUG_PATCH.componentRenders = 0;
    T4_DEBUG_PATCH.cacheHits = 0;
    T4_DEBUG_PATCH.cacheMisses = 0;
    T4_DEBUG_PATCH.lastFlushAt = 0;
};
// =============================================================================

function buildSignature(staticList, groupByFields) {
    const records = staticList.records || [];
    // Cheap signature: count + concatenation of record ids + group field
    // values. Avoids JSON.stringify and references record object identities.
    let sig = `${groupByFields.join("|")}::${records.length}`;
    const fieldName = groupByFields[0];
    for (const r of records) {
        const id = r.resId || r._virtualId || r.id;
        const v = r.data ? r.data[fieldName] : undefined;
        const vKey =
            v && typeof v === "object" ? `o${v.id ?? ""}` : v === false ? "f" : String(v);
        sig += `|${id}=${vKey}`;
    }
    return sig;
}

patch(X2ManyField.prototype, {
    setup() {
        super.setup();
        this[T4_GROUPED_FOLD_STATES] = useState({});
        this[T4_GROUPED_CACHE] = { signature: null, list: null, wrapped: null };
        T4_DEBUG_PATCH.setupCalls++;
        // eslint-disable-next-line no-console
        console.log(
            "[t4-x2m] setup #" + T4_DEBUG_PATCH.setupCalls + " field=" + this.props.name
        );
        // Count actual component renders separately from rendererProps getter
        // accesses. Ratio (rendererProps / componentRenders) tells us whether
        // OWL's t-props is calling the getter once per render or many times.
        onWillRender(() => {
            T4_DEBUG_PATCH.componentRenders++;
        });
    },

    /**
     * Read `list_groupbys` from the field context. Value may be an array of
     * field names (`['field_a']`) or a single string. Returns only fields
     * that actually exist on the relational model so an invalid value does
     * not break the renderer.
     *
     * @returns {string[]}
     */
    get t4GroupByFields() {
        if (this.props.viewMode !== "list") {
            return [];
        }
        const ctx = this.props.context || {};
        let raw = ctx.list_groupbys;
        if (typeof raw === "string") {
            raw = [raw];
        }
        if (!Array.isArray(raw) || !raw.length) {
            return [];
        }
        const list = this.list;
        if (!list || !list.fields) {
            return [];
        }
        return raw.filter((name) => typeof name === "string" && name in list.fields);
    },

    get rendererProps() {
        const props = super.rendererProps;
        const groupByFields = this.t4GroupByFields;
        if (!groupByFields.length) {
            return props;
        }
        T4_DEBUG_PATCH.rendererPropsCalls++;
        const list = this.list;
        const cache = this[T4_GROUPED_CACHE];
        const signature = buildSignature(list, groupByFields);
        // Reuse the same Proxy + groups objects when records haven't changed
        // since last render. This keeps prop identity stable for ListRenderer
        // and avoids rebuilding aggregates on every reactive read.
        if (cache.list === list && cache.signature === signature && cache.wrapped) {
            T4_DEBUG_PATCH.cacheHits++;
            t4DebugPatchFlush();
            props.list = cache.wrapped;
            return props;
        }
        T4_DEBUG_PATCH.cacheMisses++;
        // eslint-disable-next-line no-console
        console.log("[t4-x2m] rendererProps cache MISS", {
            field: this.props.name,
            recordCount: list.records ? list.records.length : 0,
            sigPreview: signature.slice(0, 120),
            sameList: cache.list === list,
            sameSig: cache.signature === signature,
        });
        const wrapped = wrapListWithGroups(
            list,
            groupByFields,
            this[T4_GROUPED_FOLD_STATES],
            props.archInfo && props.archInfo.columns
        );
        if (wrapped) {
            cache.list = list;
            cache.signature = signature;
            cache.wrapped = wrapped;
            props.list = wrapped;
        } else {
            cache.list = null;
            cache.signature = null;
            cache.wrapped = null;
        }
        t4DebugPatchFlush();
        return props;
    },
});
