/** @odoo-module **/

import { AGGREGATABLE_FIELD_TYPES } from "@web/model/relational_model/utils";
import { toRaw } from "@odoo/owl";

const FOLD_PLACEHOLDER = "__t4_x2m_grouped_fold__";
const T4_GROUPING_TAG = Symbol.for("t4ThemeX2mGroupingInstalled");
const GROUPING_KEYS = ["isGrouped", "groups", "groupBy", "groupByField"];

function readGroupKey(value, field) {
    if (value === null || value === undefined || value === false || value === "") {
        return { key: FOLD_PLACEHOLDER, display: field.string ? `${field.string}: -` : "-" };
    }
    switch (field.type) {
        case "many2one":
        case "many2one_reference":
        case "reference": {
            const id = value && (value.id ?? value);
            const name =
                (value && (value.display_name ?? value.displayName)) ||
                (id !== undefined && id !== false ? String(id) : "-");
            return { key: `m2o_${id ?? "false"}`, display: name };
        }
        case "selection": {
            const opt = (field.selection || []).find((s) => s[0] === value);
            return { key: `sel_${value}`, display: opt ? opt[1] : String(value) };
        }
        case "boolean":
            return { key: value ? "bool_true" : "bool_false", display: value ? "True" : "False" };
        case "date":
        case "datetime":
            return { key: `dt_${value}`, display: String(value) };
        case "many2many":
        case "one2many":
            return {
                key: `m2m_${Array.isArray(value) ? value.join("-") : String(value)}`,
                display: Array.isArray(value) ? value.join(", ") : String(value),
            };
        default:
            return { key: `v_${String(value)}`, display: String(value) };
    }
}

function computeGroupAggregates(records, fields, archInfoColumns) {
    const aggregates = {};
    if (!archInfoColumns) {
        return aggregates;
    }
    // Track currency fields used by monetary columns. ListRenderer's
    // computeAggregates / getFieldCurrencies expects `group.aggregates[ccy]`
    // to be an array of currency ids for grouped lists (mirrors the server's
    // read_group response). Without this, ListRenderer crashes with
    // `Cannot read properties of undefined (reading 'forEach')`.
    const currencyFields = new Set();
    for (const column of archInfoColumns) {
        if (column.type !== "field") {
            continue;
        }
        const field = fields[column.name];
        if (!field) {
            continue;
        }
        if (field.type === "monetary" || column.widget === "monetary") {
            const ccy =
                (column.options && column.options.currency_field) ||
                field.currency_field ||
                "currency_id";
            if (ccy) {
                currencyFields.add(ccy);
            }
        }
        if (!AGGREGATABLE_FIELD_TYPES.includes(field.type)) {
            continue;
        }
        const attrs = column.attrs || {};
        const func =
            (attrs.sum && "sum") ||
            (attrs.avg && "avg") ||
            (attrs.max && "max") ||
            (attrs.min && "min");
        if (!func) {
            continue;
        }
        const values = records.map((r) => r.data[column.name]).filter((v) => v || v === 0);
        if (!values.length) {
            continue;
        }
        let result;
        switch (func) {
            case "sum":
                result = values.reduce((a, b) => a + b, 0);
                break;
            case "avg":
                result = values.reduce((a, b) => a + b, 0) / values.length;
                break;
            case "max":
                result = Math.max(...values);
                break;
            case "min":
                result = Math.min(...values);
                break;
        }
        aggregates[column.name] = result;
    }
    for (const ccy of currencyFields) {
        if (!(ccy in fields)) {
            // currency field not on the model — fall back to empty array so
            // ListRenderer's forEach doesn't crash.
            aggregates[ccy] = [];
            continue;
        }
        const ids = new Set();
        for (const r of records) {
            const v = r.data ? r.data[ccy] : undefined;
            if (v == null || v === false) {
                continue;
            }
            ids.add(typeof v === "object" ? v.id : v);
        }
        aggregates[ccy] = Array.from(ids);
    }
    return aggregates;
}

function buildGroups(rawList, fieldName, foldState, archInfoColumns) {
    const field = rawList.fields[fieldName];
    if (!field) {
        return null;
    }
    const buckets = new Map();
    const order = [];
    for (const record of rawList.records) {
        const value = record.data[fieldName];
        const { key, display } = readGroupKey(value, field);
        if (!buckets.has(key)) {
            buckets.set(key, { key, displayName: display, rawValue: value, records: [] });
            order.push(key);
        }
        buckets.get(key).records.push(record);
    }
    return order.map((key) => {
        const bucket = buckets.get(key);
        const groupId = `t4_x2m_${fieldName}_${key}`;
        const groupRecords = bucket.records;
        const groupByField = {
            name: fieldName,
            string: field.string || fieldName,
            type: field.type,
        };
        const aggregates = computeGroupAggregates(groupRecords, rawList.fields, archInfoColumns);
        const subList = {
            records: groupRecords,
            isGrouped: false,
            groupBy: [],
            groupByField,
            model: rawList.model,
            fields: rawList.fields,
            activeFields: rawList.activeFields,
            resModel: rawList.resModel,
            offset: 0,
            limit: Math.max(groupRecords.length, 1),
            count: groupRecords.length,
            evalContext: rawList.evalContext,
            selection: [],
            handleField: rawList.handleField,
            orderBy: rawList.orderBy,
            isDomainSelected: false,
            get editedRecord() {
                return groupRecords.find((r) => r.isInEdition);
            },
            canResequence: () => false,
            load: async () => {},
            leaveEditMode: (...args) => rawList.leaveEditMode(...args),
            sortBy: (...args) => rawList.sortBy(...args),
        };
        return {
            id: groupId,
            displayName: bucket.displayName,
            count: groupRecords.length,
            aggregates,
            value: false,
            groupByField,
            record: { resId: false, isNew: false, evalContext: rawList.evalContext },
            list: subList,
            get isFolded() {
                return !!foldState[groupId];
            },
            toggle() {
                foldState[groupId] = !foldState[groupId];
            },
            addNewRecord: async (params = {}, topPosition = false) => {
                const groupContext = {};
                let defaultValue = bucket.rawValue;
                if (defaultValue !== undefined && defaultValue !== false && defaultValue !== null) {
                    if (field.type === "many2one" && typeof defaultValue === "object") {
                        defaultValue = defaultValue.id;
                    }
                    if (defaultValue !== undefined) {
                        groupContext[`default_${fieldName}`] = defaultValue;
                    }
                }
                return rawList.addNewRecord({
                    ...params,
                    context: { ...groupContext, ...(params.context || {}) },
                    position: topPosition ? "top" : "bottom",
                });
            },
        };
    });
}

/**
 * Install client-side grouping directly on the StaticList instance.
 *
 * Why this approach (vs Proxy wrapping):
 *   Wrapping the StaticList in a Proxy and passing it as `props.list` confused
 *   OWL's reactive system. Even with markRaw and aggressive caching, OWL was
 *   re-rendering X2ManyField ~3000 times per second (CPU >20%). The cause
 *   appeared to be subscription churn around the foreign Proxy identity.
 *
 *   By defining `isGrouped` / `groups` / `groupBy` / `groupByField` directly
 *   on the StaticList instance via `Object.defineProperty` on the *raw*
 *   target (toRaw), the staticList object identity that ListRenderer sees is
 *   exactly the same one OWL has always tracked. No proxy layer, no
 *   subscription churn, no loop.
 *
 * Returns an uninstaller function — call it on component unmount.
 */
export function attachGroupingToList(staticList, groupByFields, foldState, archInfoColumns) {
    if (!staticList || !Array.isArray(groupByFields) || !groupByFields.length) {
        return null;
    }
    const fieldName = groupByFields[0];
    if (!fieldName || !(fieldName in staticList.fields)) {
        return null;
    }
    const rawList = toRaw(staticList);
    if (rawList[T4_GROUPING_TAG]) {
        // Already attached by another X2ManyField for the same list; reuse.
        // (Shouldn't normally happen because each field has its own list.)
        return () => {};
    }

    const field = staticList.fields[fieldName];
    const groupByField = {
        name: fieldName,
        string: field.string || fieldName,
        type: field.type,
    };
    const groupBy = [fieldName];

    let cachedGroups = null;
    let cacheSig = null;

    function currentSignature() {
        const records = rawList.records;
        let sig = `${records.length}`;
        for (const r of records) {
            const id = r.resId || r._virtualId || r.id;
            const v = r.data ? r.data[fieldName] : undefined;
            const vKey =
                v && typeof v === "object"
                    ? `o${v.id ?? ""}`
                    : v === false
                    ? "f"
                    : String(v);
            sig += `|${id}=${vKey}`;
        }
        return sig;
    }

    function getOrBuildGroups() {
        const sig = currentSignature();
        if (sig !== cacheSig) {
            cachedGroups = buildGroups(rawList, fieldName, foldState, archInfoColumns) || [];
            cacheSig = sig;
        }
        return cachedGroups;
    }

    Object.defineProperty(rawList, T4_GROUPING_TAG, {
        value: true,
        configurable: true,
        enumerable: false,
        writable: false,
    });
    Object.defineProperty(rawList, "isGrouped", {
        configurable: true,
        enumerable: true,
        get: () => true,
    });
    Object.defineProperty(rawList, "groups", {
        configurable: true,
        enumerable: true,
        get: getOrBuildGroups,
    });
    Object.defineProperty(rawList, "groupBy", {
        configurable: true,
        enumerable: true,
        get: () => groupBy,
    });
    Object.defineProperty(rawList, "groupByField", {
        configurable: true,
        enumerable: true,
        get: () => groupByField,
    });

    return () => {
        for (const key of GROUPING_KEYS) {
            // Use try/catch — if the property has already been redefined or
            // the list is being torn down by Odoo, we still want a clean
            // uninstall.
            try {
                delete rawList[key];
            } catch (e) {
                // ignore
            }
        }
        delete rawList[T4_GROUPING_TAG];
    };
}
