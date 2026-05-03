/** @odoo-module **/

import { AGGREGATABLE_FIELD_TYPES } from "@web/model/relational_model/utils";

const FOLD_PLACEHOLDER = "__t4_x2m_grouped_fold__";

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
            // Best-effort: group by id list serialization
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
    for (const column of archInfoColumns) {
        if (column.type !== "field") {
            continue;
        }
        const field = fields[column.name];
        if (!field || !AGGREGATABLE_FIELD_TYPES.includes(field.type)) {
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
        const values = records
            .map((r) => r.data[column.name])
            .filter((v) => v || v === 0);
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
    return aggregates;
}

function buildGroups(staticList, fieldName, foldState, archInfoColumns) {
    const field = staticList.fields[fieldName];
    if (!field) {
        return null;
    }
    const buckets = new Map();
    const order = [];
    for (const record of staticList.records) {
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
        const aggregates = computeGroupAggregates(
            groupRecords,
            staticList.fields,
            archInfoColumns
        );
        const subList = {
            records: groupRecords,
            isGrouped: false,
            groupBy: [],
            groupByField,
            model: staticList.model,
            fields: staticList.fields,
            activeFields: staticList.activeFields,
            resModel: staticList.resModel,
            offset: 0,
            limit: Math.max(groupRecords.length, 1),
            count: groupRecords.length,
            evalContext: staticList.evalContext,
            selection: [],
            handleField: staticList.handleField,
            orderBy: staticList.orderBy,
            isDomainSelected: false,
            get editedRecord() {
                return groupRecords.find((r) => r.isInEdition);
            },
            canResequence: () => false,
            load: async () => {},
            leaveEditMode: (...args) => staticList.leaveEditMode(...args),
            sortBy: (...args) => staticList.sortBy(...args),
        };
        return {
            id: groupId,
            displayName: bucket.displayName,
            count: groupRecords.length,
            aggregates,
            value: false,
            groupByField,
            record: { resId: false, isNew: false, evalContext: staticList.evalContext },
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
                return staticList.addNewRecord({
                    ...params,
                    context: { ...groupContext, ...(params.context || {}) },
                    position: topPosition ? "top" : "bottom",
                });
            },
        };
    });
}

export function wrapListWithGroups(staticList, groupByFields, foldState, archInfoColumns) {
    if (!staticList || !Array.isArray(groupByFields) || !groupByFields.length) {
        return null;
    }
    const fieldName = groupByFields[0];
    if (!fieldName || !(fieldName in staticList.fields)) {
        return null;
    }
    const groups = buildGroups(staticList, fieldName, foldState, archInfoColumns);
    if (!groups || !groups.length) {
        return null;
    }
    const field = staticList.fields[fieldName];
    const groupByField = {
        name: fieldName,
        string: field.string || fieldName,
        type: field.type,
    };
    const groupBy = [fieldName];
    // Per-proxy bound function cache — avoid recreating bound copies for the
    // many method reads ListRenderer + OWL reactivity perform on each tick.
    const boundCache = new WeakMap();
    return new Proxy(staticList, {
        get(target, prop) {
            if (prop === "isGrouped") {
                return true;
            }
            if (prop === "groups") {
                return groups;
            }
            if (prop === "groupBy") {
                return groupBy;
            }
            if (prop === "groupByField") {
                return groupByField;
            }
            // CRUCIAL: pass `target` (not `receiver`) as the receiver so that
            // any getter on StaticList.prototype (e.g. `editedRecord`,
            // `evalContext`, `currentIds`) runs with `this === target`. If we
            // forwarded `this === proxy`, every nested `this.records` /
            // `this.config` access would re-enter this trap, causing an
            // exponential blow-up that froze the form view.
            const value = Reflect.get(target, prop, target);
            if (typeof value === "function") {
                let bound = boundCache.get(value);
                if (!bound) {
                    bound = value.bind(target);
                    boundCache.set(value, bound);
                }
                return bound;
            }
            return value;
        },
    });
}
