/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { X2ManyField } from "@web/views/fields/x2many/x2many_field";
import { useState, onWillRender, onWillUnmount } from "@odoo/owl";
import { attachGroupingToList } from "./x2many_grouped_adapter";

const T4_FOLD_STATE = Symbol("t4ThemeX2mFoldState");
const T4_UNINSTALL = Symbol("t4ThemeX2mUninstaller");
const T4_INSTALLED_LIST = Symbol("t4ThemeX2mInstalledList");

patch(X2ManyField.prototype, {
    setup() {
        super.setup();
        this[T4_FOLD_STATE] = useState({});
        this[T4_UNINSTALL] = null;
        this[T4_INSTALLED_LIST] = null;

        // Re-evaluate grouping each render. Install once when groupByFields
        // are configured; uninstall if config disappears or list reference
        // changes (record reload, etc.). The install simply defines getters
        // on the StaticList instance — no Proxy, no extra reactive layer.
        onWillRender(() => {
            const groupByFields = this.t4GroupByFields;
            const list = this.list;
            const archInfoColumns = this.archInfo && this.archInfo.columns;

            if (!groupByFields.length || !list) {
                if (this[T4_UNINSTALL]) {
                    this[T4_UNINSTALL]();
                    this[T4_UNINSTALL] = null;
                    this[T4_INSTALLED_LIST] = null;
                }
                return;
            }
            if (this[T4_INSTALLED_LIST] === list) {
                return; // already installed on this list
            }
            if (this[T4_UNINSTALL]) {
                this[T4_UNINSTALL]();
            }
            this[T4_UNINSTALL] = attachGroupingToList(
                list,
                groupByFields,
                this[T4_FOLD_STATE],
                archInfoColumns
            );
            this[T4_INSTALLED_LIST] = this[T4_UNINSTALL] ? list : null;
        });

        onWillUnmount(() => {
            if (this[T4_UNINSTALL]) {
                this[T4_UNINSTALL]();
                this[T4_UNINSTALL] = null;
                this[T4_INSTALLED_LIST] = null;
            }
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
        // Runtime kill switch for diagnosis — re-open the form view after
        // toggling to fully apply.
        if (typeof window !== "undefined" && window.__t4SkipX2mGrouping) {
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

    /**
     * Tell the inner ListRenderer to draw a leading "STT" (sequence number)
     * column for every list view embedded in a form view. The cell value
     * accounts for `list.offset` so pagination produces continuous numbers.
     */
    get rendererProps() {
        const props = super.rendererProps;
        if (this.props.viewMode === "list") {
            props.t4WithRowNumber = true;
        }
        return props;
    },
});
