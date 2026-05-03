/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { X2ManyField } from "@web/views/fields/x2many/x2many_field";
import { useState } from "@odoo/owl";
import { wrapListWithGroups } from "./x2many_grouped_adapter";

const T4_GROUPED_FOLD_STATES = Symbol("t4ThemeX2mFoldStates");
const T4_GROUPED_CACHE = Symbol("t4ThemeX2mGroupedCache");

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
        const list = this.list;
        const cache = this[T4_GROUPED_CACHE];
        const signature = buildSignature(list, groupByFields);
        // Reuse the same Proxy + groups objects when records haven't changed
        // since last render. This keeps prop identity stable for ListRenderer
        // and avoids rebuilding aggregates on every reactive read.
        if (cache.list === list && cache.signature === signature && cache.wrapped) {
            props.list = cache.wrapped;
            return props;
        }
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
        return props;
    },
});
