/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { X2ManyField } from "@web/views/fields/x2many/x2many_field";
import { useState } from "@odoo/owl";
import { wrapListWithGroups } from "./x2many_grouped_adapter";

const T4_GROUPED_FOLD_STATES = Symbol("t4ThemeX2mFoldStates");

patch(X2ManyField.prototype, {
    setup() {
        super.setup();
        this[T4_GROUPED_FOLD_STATES] = useState({});
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
        const wrapped = wrapListWithGroups(
            this.list,
            groupByFields,
            this[T4_GROUPED_FOLD_STATES],
            props.archInfo && props.archInfo.columns
        );
        if (wrapped) {
            props.list = wrapped;
        }
        return props;
    },
});
