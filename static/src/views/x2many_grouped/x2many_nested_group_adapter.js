/** @odoo-module **/

import { AGGREGATABLE_FIELD_TYPES } from "@web/model/relational_model/utils";
import { toRaw } from "@odoo/owl";

const FOLD_PLACEHOLDER = "__t4_x2m_nested_fold__";
const T4_NESTED_TAG = Symbol.for("t4ThemeX2mNestedGroupInstalled");
const GROUPING_KEYS = ["isGrouped", "groups", "groupBy", "groupByField"];

/**
 * Hierarchical nested-group x2many adapter.
 *
 * Differs from the contiguous-bucketing widget (x2many_grouped_adapter.js)
 * and the simple flat-bucket variant (early version of this file):
 *
 *   - One bucket per unique group key (no contiguous split).
 *   - Buckets organized as a TREE following `t4_tree_depth`+`t4_tree_sort_path`:
 *     a bucket at depth D is nested inside the bucket containing its
 *     immediate parent record (the DFS-preceding record at depth D-1).
 *   - Each bucket's sub-list holds BOTH its direct records (records whose
 *     own depth == bucket's depth) AND its child buckets — rendered by the
 *     patched list_renderer template as records-first then sub-groups.
 *   - Each bucket exposes `t4OpenInfo` (model + resId) used by the patched
 *     GroupRow template to render an "open" icon.
 *
 * Context flag:  `list_nested_group_by: ['creation_id']`
 * Optional:      `list_tree_open_field: 'creation_id'` — field whose
 *                target record opens when clicking the group header icon.
 *                Defaults to the first group-by field.
 *
 * Returns an uninstaller function — call it on component unmount.
 */

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
            return { key: `m2o_${id ?? "false"}`, display: name, resId: id };
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

/**
 * Build a hierarchical bucket tree from rawList records.
 *
 * Algorithm:
 *   1. Sort records by `t4_tree_sort_path` (DFS order). Required to find
 *      each record's tree parent — the immediate DFS predecessor at
 *      depth-1.
 *   2. Walk records DFS. Maintain `depthStack`: for each depth D, the
 *      bucket key of the most recent record at depth D. This lets us
 *      find each record's "parent bucket key" in O(1).
 *   3. For each record:
 *        - find/create bucket for record.groupKey
 *        - bucket.parentKey = depthStack[depth-1] (if record.depth > 1)
 *        - bucket.records.push(record)
 *        - bucket.depth = min depth seen so far (== record.depth on first
 *          insertion in DFS order)
 *   4. Link buckets: for each bucket with a parentKey, append to
 *      parent.children.
 *
 * Returns { rootBuckets, allBuckets } — rootBuckets are buckets without
 * an in-tree parent (i.e., the topmost level of the FG component tree).
 */
function buildBucketTree(rawList, fieldName) {
    const field = rawList.fields[fieldName];
    if (!field) {
        return { rootBuckets: [], allBuckets: [] };
    }
    const sorted = rawList.records.slice().sort((a, b) => {
        const pa = (a.data && a.data.t4_tree_sort_path) || "";
        const pb = (b.data && b.data.t4_tree_sort_path) || "";
        return pa < pb ? -1 : pa > pb ? 1 : 0;
    });

    const buckets = new Map();
    const rootBuckets = [];
    const depthStack = []; // depthStack[D] = bucket key of most recent record at depth D

    for (const record of sorted) {
        const depth = Number((record.data && record.data.t4_tree_depth) || 0);
        const value = record.data[fieldName];
        const { key, display, resId } = readGroupKey(value, field);

        // Pop stale entries above current depth.
        depthStack.length = depth + 1;

        let bucket = buckets.get(key);
        if (!bucket) {
            bucket = {
                key,
                displayName: display,
                rawValue: value,
                resId: resId ?? null,
                depth, // first-seen depth (== bucket's level in tree)
                records: [],
                children: [], // child buckets
                parentKey: null,
                parentSet: false,
            };
            buckets.set(key, bucket);
        }
        bucket.records.push(record);

        // Set parent only once per bucket — first time we see one of its
        // records. The first DFS occurrence determines hierarchy; later
        // occurrences of the same key (records of the same creation
        // scattered in DFS) inherit the same parent.
        if (!bucket.parentSet) {
            const parentDepth = depth - 1;
            if (parentDepth >= 0 && depthStack[parentDepth]) {
                bucket.parentKey = depthStack[parentDepth];
            }
            bucket.parentSet = true;
        }
        depthStack[depth] = key;
    }

    // Link parent ↔ child.
    for (const bucket of buckets.values()) {
        if (bucket.parentKey && buckets.has(bucket.parentKey) && bucket.parentKey !== bucket.key) {
            const parent = buckets.get(bucket.parentKey);
            parent.children.push(bucket);
        } else {
            rootBuckets.push(bucket);
        }
    }

    // Direct records of a bucket B = records whose own creation_id equals
    // B's key (they're already in B.records by construction) AND whose
    // depth equals B.depth. Records at deeper depths within B's tree
    // sub-range belong to descendant buckets — they're already attached
    // to those buckets (not to B). So B.records IS the direct-records set
    // by definition.

    return { rootBuckets, allBuckets: Array.from(buckets.values()) };
}

function bucketToGroup(bucket, rawList, archInfoColumns, foldState, openModel) {
    const groupId = `t4_x2m_nested_${bucket.key}_d${bucket.depth}`;
    const directRecords = bucket.records;
    const childGroups = bucket.children.map((child) =>
        bucketToGroup(child, rawList, archInfoColumns, foldState, openModel)
    );
    const groupByField = {
        name: "_t4_nested",
        string: "",
        type: "many2one",
    };
    // Aggregate over ALL descendants — includes direct records + every
    // record of every child bucket recursively. Sum displayed on the
    // header reflects the whole sub-tree, not just direct records.
    const allDescendantRecords = [];
    (function collect(b) {
        for (const r of b.records) {
            allDescendantRecords.push(r);
        }
        for (const c of b.children) {
            collect(c);
        }
    })(bucket);
    const aggregates = computeGroupAggregates(
        allDescendantRecords,
        rawList.fields,
        archInfoColumns
    );

    // The group's `list` mirrors a StaticList enough for ListRenderer to
    // iterate. Crucially we set:
    //   - `records`         direct lines, used by leaf-bucket rendering
    //                       (when isGrouped=false the template iterates
    //                       this naturally) and for internal references
    //                       (editedRecord, etc.).
    //   - `t4DirectRecords` parallel field read by our template patch in
    //                       the grouped branch — renders direct lines
    //                       BEFORE sub-groups inside the same parent.
    //   - `groups`          child buckets, iterated by the grouped
    //                       branch naturally.
    const subList = {
        records: directRecords,
        t4DirectRecords: directRecords,
        groups: childGroups,
        // `isGrouped` triggers the groups branch in rowsTemplate. With
        // our patch the records branch ALSO runs when records.length>0,
        // so both render.
        isGrouped: childGroups.length > 0,
        groupBy: childGroups.length > 0 ? ["_t4_nested"] : [],
        groupByField,
        model: rawList.model,
        fields: rawList.fields,
        activeFields: rawList.activeFields,
        resModel: rawList.resModel,
        offset: 0,
        // Force limit == count so `showGroupPager` (limit < count) stays
        // false. We never paginate inside a client-side nested group —
        // all direct records are already in memory.
        limit: Math.max(directRecords.length, 1),
        count: directRecords.length,
        evalContext: rawList.evalContext,
        selection: [],
        handleField: rawList.handleField,
        orderBy: rawList.orderBy,
        isDomainSelected: false,
        get editedRecord() {
            return directRecords.find((r) => r.isInEdition);
        },
        canResequence: () => false,
        load: async () => {},
        leaveEditMode: (...args) => rawList.leaveEditMode(...args),
        sortBy: (...args) => rawList.sortBy(...args),
    };
    return {
        id: groupId,
        displayName: bucket.displayName,
        // Count = total descendants (header reads "(N)").
        count: allDescendantRecords.length,
        aggregates,
        value: false,
        groupByField,
        record: { resId: false, isNew: false, evalContext: rawList.evalContext },
        list: subList,
        t4Depth: bucket.depth,
        // Open-info exposed to the GroupRow template patch — when set,
        // the header renders an external-link icon that doAction()s to
        // this resId in the open model.
        t4OpenInfo:
            openModel && bucket.resId ? { model: openModel, resId: bucket.resId } : null,
        get isFolded() {
            return !!foldState[groupId];
        },
        toggle() {
            foldState[groupId] = !foldState[groupId];
        },
        addNewRecord: async () => {
            // Read-only x2many — no inline add.
        },
    };
}

export function attachNestedGroupingToList(
    staticList,
    groupByFields,
    foldState,
    archInfoColumns,
    openField
) {
    if (!staticList || !Array.isArray(groupByFields) || !groupByFields.length) {
        return null;
    }
    const fieldName = groupByFields[0];
    if (!fieldName || !(fieldName in staticList.fields)) {
        return null;
    }
    const rawList = toRaw(staticList);
    if (rawList[T4_NESTED_TAG]) {
        return () => {};
    }

    // Resolve open model from `openField` (must be a many2one). STRICT
    // opt-in: nếu caller không pass `list_tree_open_field` context →
    // `openField` rỗng → trả `null` → `t4OpenInfo` không build → template
    // bỏ qua nút mở. Trước đây fallback về `fieldName` khiến button luôn
    // hiện khi group field là many2one — phá behavior configurable.
    const resolveOpenModel = () => {
        if (!openField) {
            return null;
        }
        const def = rawList.fields[openField];
        return def && def.type === "many2one" ? def.relation : null;
    };

    const groupByField = {
        name: fieldName,
        string: rawList.fields[fieldName].string || fieldName,
        type: rawList.fields[fieldName].type,
    };
    const groupBy = [fieldName];

    let cachedGroups = null;
    let cacheSig = null;
    // Map từ (record.id || record.resId) → local 0-based index trong
    // bucket trực tiếp chứa record đó. Build 1 lần ở `getOrBuildGroups`
    // ngay sau khi rebuild buckets. ListRenderer patch `t4GetRowNumber`
    // lookup O(1) qua map này thay vì walk groups + indexOf — tránh được
    // các vấn đề identity mismatch giữa proxy/raw refs ở deep-nested
    // levels (đặc biệt khi 1 bucket vừa có directRecords vừa có
    // childGroups, native template iterate qua đường khác với cách
    // bucket build).
    let recordToLocalIdx = new Map();

    function currentSignature() {
        const records = rawList.records;
        let sig = `${records.length}|${openField || fieldName}`;
        const hasDepth = "t4_tree_depth" in rawList.fields;
        const hasPath = "t4_tree_sort_path" in rawList.fields;
        for (const r of records) {
            // Include `r.id` (OWL StaticList internal id, changes when the
            // record is re-instantiated) alongside `resId` (DB id, stable).
            // Without `r.id`, a soft_reload that recreates records with the
            // same resIds keeps the signature unchanged → cache returns
            // STALE record refs → `_t4FindLocalIndex` indexOf fails for
            // records at deeper nesting levels (rendered via different
            // proxy path than cached) → STT cell renders empty.
            const id = `${r.resId || r._virtualId || ""}#${r.id || ""}`;
            const v = r.data ? r.data[fieldName] : undefined;
            const vKey =
                v && typeof v === "object"
                    ? `o${v.id ?? ""}`
                    : v === false
                    ? "f"
                    : String(v);
            sig += `|${id}=${vKey}`;
            if (hasDepth && r.data) {
                sig += `:d${Number(r.data.t4_tree_depth) || 0}`;
            }
            if (hasPath && r.data) {
                sig += `:p${r.data.t4_tree_sort_path || ""}`;
            }
        }
        return sig;
    }

    function getOrBuildGroups() {
        const sig = currentSignature();
        if (sig !== cacheSig) {
            const openModel = resolveOpenModel();
            const { rootBuckets, allBuckets } = buildBucketTree(rawList, fieldName);
            cachedGroups = rootBuckets.map((b) =>
                bucketToGroup(b, rawList, archInfoColumns, foldState, openModel)
            );
            // Build flat record-id → local-idx map: mỗi record map về
            // index của nó trong `bucket.records` (= directRecords) của
            // bucket chứa nó. Bucket được build sao cho mỗi record xuất
            // hiện trong đúng 1 bucket → mỗi record có đúng 1 local idx.
            recordToLocalIdx = new Map();
            for (const bucket of allBuckets) {
                bucket.records.forEach((rec, idx) => {
                    const key = rec.id ?? rec.resId;
                    if (key != null) {
                        recordToLocalIdx.set(key, idx);
                    }
                });
            }
            cacheSig = sig;
        }
        return cachedGroups;
    }

    // Expose map qua getter trên rawList — ListRenderer patch đọc qua
    // `this.props.list.t4LocalIdxMap`. Lazy access đảm bảo buckets được
    // build trước (qua getOrBuildGroups trigger từ template iteration
    // hoặc explicit call).
    Object.defineProperty(rawList, "t4LocalIdxMap", {
        configurable: true,
        enumerable: false,
        get: () => {
            getOrBuildGroups();
            return recordToLocalIdx;
        },
    });

    Object.defineProperty(rawList, T4_NESTED_TAG, {
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
            try {
                delete rawList[key];
            } catch (e) {
                // ignore
            }
        }
        try {
            delete rawList.t4LocalIdxMap;
        } catch (e) {
            // ignore
        }
        delete rawList[T4_NESTED_TAG];
    };
}
