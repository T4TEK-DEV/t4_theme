/** @odoo-module */
/**
 * T4 Filter Bar — hàng ô lọc per-column dưới header list view.
 *
 * UX theo udoo_web_filter_bar (v17), adapt sang API core v19:
 *   - MỖI cột lọc được: header cell hiện ĐÚNG 1 ô GIÁ TRỊ (value editor của
 *     `@web/core/tree_editor`, tự đúng type) + nút ▾. Gõ/chọn ngay ô đó =
 *     lọc nhanh với toán tử mặc định theo type.
 *   - Nút ▾ mở POPOVER (`column_filter_popover.js`): dropdown TOÁN TỬ +
 *     ô GIÁ TRỊ + nút Xóa/Áp dụng — để chọn toán tử khác (>, between, chứa…).
 *
 * KHÔNG tự chế widget: value/operator editor lấy từ tree_editor (đúng thứ
 * hộp thoại "Bộ lọc tùy chỉnh" của Odoo dùng). Toán tử theo type = danh sách
 * curated (t4FbOperators) — thân thiện cho lọc (text mặc định "chứa", số "=",
 * date "=" + range/between trong popover, m2o record-picker đơn).
 *
 * Build domain: condition(name, op, value, negate) → domainFromTree() (tự
 * eliminate virtual op: between / in range / starts with). Mỗi cột = 1 FACET
 * riêng trong SearchModel (createNewFilters; đổi giá trị = deactivate group
 * cũ + tạo mới; gỡ facet trên search bar → cột reset qua event 'update').
 *
 * CHỈ hoạt động ở list view gốc (viewType === 'list' + có searchModel).
 */
import { browser } from '@web/core/browser/browser';
import { Domain } from '@web/core/domain';
import { condition } from '@web/core/tree_editor/condition_tree';
import { domainFromTree } from '@web/core/tree_editor/domain_from_tree';
import { getOperatorEditorInfo } from '@web/core/tree_editor/tree_editor_operator_editor';
import {
    getDefaultValue,
    getValueEditorInfo,
} from '@web/core/tree_editor/tree_editor_value_editors';
import { getDomainDisplayedOperators } from '@web/core/domain_selector/domain_selector_operator_editor';
import { useBus } from '@web/core/utils/hooks';
import { usePopover } from '@web/core/popover/popover_hook';
import { patch } from '@web/core/utils/patch';
import { ListRenderer } from '@web/views/list/list_renderer';
import { useState } from '@odoo/owl';

import { T4ColumnFilterPopover } from '@t4_theme/filter_bar/column_filter_popover';
import { t4FbInjectPlaceholder } from '@t4_theme/filter_bar/filter_bar_utils';

export const T4_FILTER_BAR_TOGGLE = 'T4-FILTER-BAR:TOGGLE';

// Value editor options: bật blank option cho selection để value rỗng (false)
// hợp lệ (ô "Tất cả" trống) thay vì auto-chọn option đầu.
const VALUE_EDITOR_OPTS = { addBlankOption: true };

export function t4FilterBarStorageKey(env) {
    const key = env.config?.actionId || env.searchModel?.resModel || '';
    return `t4_filter_bar:${key}`;
}

patch(ListRenderer.prototype, {
    setup() {
        super.setup();
        if (!this.t4FbAvailable) {
            return;
        }
        // groupId của facet per-column — plumbing, không reactive.
        this.t4FbGroupIds = {};
        this.t4Fb = useState({
            visible: !!browser.localStorage.getItem(
                t4FilterBarStorageKey(this.env)),
            // cols[name] = { operator, negate, value, touched }
            cols: {},
        });
        this.t4FbPopover = usePopover(T4ColumnFilterPopover, {
            position: 'bottom-start',
            popoverClass: 't4_fb_popover',
        });
        useBus(this.env.bus, T4_FILTER_BAR_TOGGLE, () => {
            this.t4Fb.visible = !!browser.localStorage.getItem(
                t4FilterBarStorageKey(this.env));
        });
        // User gỡ facet trên search bar (bấm ×) → cột đó reset.
        useBus(this.env.searchModel, 'update', () => this.t4FbSyncFacets());
    },

    get t4FbAvailable() {
        return this.env.config?.viewType === 'list' && !!this.env.searchModel;
    },

    get t4FbVisible() {
        return this.t4FbAvailable && this.t4Fb && this.t4Fb.visible;
    },

    // ------------------------------------------------------------------
    //  Field def / toán tử / khả năng lọc
    // ------------------------------------------------------------------

    /**
     * Danh sách toán tử curated theo type ([0] = mặc định inline). Thân thiện
     * cho lọc nhanh; popover cho phép chọn cả list. boolean xử lý riêng
     * (select Tất cả/Có/Không), không đi qua đây.
     */
    t4FbOperators(column) {
        const fd = this.fields[column.name];
        if (!fd) {
            return [];
        }
        switch (fd.type) {
            case 'char':
            case 'text':
            case 'html':
                return ['ilike', 'not ilike', '=', '!=', 'set', 'not set'];
            case 'integer':
            case 'float':
            case 'monetary':
                return ['=', '!=', '>', '>=', '<', '<=', 'between', 'set', 'not set'];
            case 'date':
            case 'datetime':
                return ['=', '>=', '<=', 'between', 'in range', 'set', 'not set'];
            case 'selection':
                return ['=', '!=', 'in', 'not in', 'set', 'not set'];
            case 'many2one':
                return ['=', '!=', 'in', 'not in', 'ilike', 'not ilike', 'set', 'not set'];
            case 'many2many':
            case 'one2many':
                return ['in', 'not in', '=', '!=', 'ilike', 'not ilike', 'set', 'not set'];
            case 'boolean':
                return ['set', 'not set'];
            default:
                try {
                    return getDomainDisplayedOperators(fd) || [];
                } catch {
                    return [];
                }
        }
    },

    t4FbIsBoolean(column) {
        return this.fields[column.name]?.type === 'boolean';
    },

    /** Cột có lọc được không (có field, searchable, có toán tử). */
    t4FbFilterable(column) {
        const fd = this.fields[column.name];
        if (!fd || fd.searchable === false || column.widget === 'handle') {
            return false;
        }
        return this.t4FbIsBoolean(column) || this.t4FbOperators(column).length > 0;
    },

    // ------------------------------------------------------------------
    //  State per-column
    // ------------------------------------------------------------------

    /**
     * Value "trống" hiển thị ban đầu: text/số = '' (ô rỗng), date/datetime/
     * selection/boolean = false (ô/blank trống), quan hệ = default core
     * (m2o '='=false, m2m 'in'=[]). touched=false nên chưa áp filter.
     */
    _t4FbEmptyValue(fd, operator) {
        const t = fd.type;
        if (['char', 'text', 'html', 'integer', 'float', 'monetary'].includes(t)) {
            return '';
        }
        if (['date', 'datetime', 'selection', 'boolean'].includes(t)) {
            return false;
        }
        return getDefaultValue(fd, operator);
    },

    /** State đọc cho template — transient nếu cột chưa được động tới. */
    t4FbState(column) {
        const stored = this.t4Fb.cols[column.name];
        if (stored) {
            return stored;
        }
        const fd = this.fields[column.name];
        const operator = this.t4FbOperators(column)[0];
        return {
            operator,
            negate: false,
            value: this._t4FbEmptyValue(fd, operator),
            touched: false,
        };
    },

    /** Ghi state vào store (gọi trong event handler, không trong render). */
    _t4FbEnsure(column) {
        const name = column.name;
        if (!this.t4Fb.cols[name]) {
            this.t4Fb.cols[name] = this.t4FbState(column);
        }
        return this.t4Fb.cols[name];
    },

    // ------------------------------------------------------------------
    //  Render info (editor của tree_editor)
    // ------------------------------------------------------------------

    t4FbValueInfo(column) {
        const fd = this.fields[column.name];
        return t4FbInjectPlaceholder(
            getValueEditorInfo(fd, this.t4FbState(column).operator, VALUE_EDITOR_OPTS),
            fd);
    },

    /**
     * {info, value, update} cho ô value inline — `update` BIND cứng vào
     * `column` trong JS. KHÔNG dùng arrow `(v) => t4FbInlineSetValue(column,v)`
     * trực tiếp trong template t-call: arrow đó capture biến foreach `column`
     * qua biên t-call, khi component (vd m2o autocomplete) gọi update SAU khi
     * tự re-render thì ctx.column đã bị xóa → undefined (lỗi select m2o
     * 2026-07-08). Closure JS đóng trên tham số `column` ổn định tuyệt đối.
     */
    t4FbInlineEditor(column) {
        return {
            info: this.t4FbValueInfo(column),
            value: this.t4FbState(column).value,
            update: (value) => this.t4FbInlineSetValue(column, value),
        };
    },

    t4FbOperatorInfo(column) {
        return getOperatorEditorInfo(
            this.t4FbOperators(column), this.fields[column.name]);
    },

    // ------------------------------------------------------------------
    //  Handlers — inline + popover + boolean
    // ------------------------------------------------------------------

    /** Áp giá trị từ ô value inline (toán tử hiện tại của cột). */
    t4FbInlineSetValue(column, value) {
        const col = this._t4FbEnsure(column);
        this.t4FbCommit(column, col.operator, col.negate, value, true);
    },

    /** Select boolean inline/popover: '' = bỏ lọc, 'yes' = có, 'no' = không. */
    t4FbBooleanChoice(column) {
        const col = this.t4Fb.cols[column.name];
        if (!col || !col.touched) {
            return '';
        }
        return col.operator === 'set' ? 'yes' : (col.operator === 'not set' ? 'no' : '');
    },

    t4FbSetBoolean(column, choice) {
        if (!choice) {
            this.t4FbClear(column);
            return;
        }
        // 'set' = có giá trị (!= False = True), 'not set' = = False.
        this.t4FbCommit(column, choice === 'yes' ? 'set' : 'not set', false, false, true);
    },

    /** Mở popover nâng cao (chọn toán tử) từ nút ▾. */
    t4FbOpenPopover(ev, column) {
        if (this.t4FbPopover.isOpen) {
            this.t4FbPopover.close();
            return;
        }
        const col = this._t4FbEnsure(column);
        this.t4FbPopover.open(ev.currentTarget, {
            label: column.label || this.fields[column.name].string || column.name,
            fieldDef: this.fields[column.name],
            operators: this.t4FbOperators(column),
            state: col,
            commit: (operator, negate, value, fromValueEdit) =>
                this.t4FbCommit(column, operator, negate, value, fromValueEdit),
            clear: () => this.t4FbClear(column),
        });
    },

    /**
     * Ghi state cột + áp filter. fromValueEdit=true khi user nhập giá trị
     * (đánh dấu touched); đổi toán tử suông (chưa nhập) KHÔNG auto-lọc trừ
     * toán tử không cần value (set/not set).
     */
    t4FbCommit(column, operator, negate, value, fromValueEdit) {
        const col = this._t4FbEnsure(column);
        const fd = this.fields[column.name];
        col.operator = operator;
        col.negate = negate || false;
        col.value = value;
        // touched TÍNH LẠI mỗi lần (KHÔNG OR dồn): chỉ áp filter khi user nhập
        // giá trị (fromValueEdit) hoặc toán tử không cần value (set/not set).
        // Đổi toán tử suông (fromValueEdit=false) trên cột đang lọc → nhả filter
        // tới khi user nhập lại — tránh áp default (số=1, date=hôm nay...) oan.
        const noValueOp = getValueEditorInfo(fd, operator, VALUE_EDITOR_OPTS).component == null;
        col.touched = fromValueEdit || noValueOp;
        this.t4FbApply(column);
    },

    t4FbClear(column) {
        const col = this._t4FbEnsure(column);
        const fd = this.fields[column.name];
        const operator = this.t4FbOperators(column)[0];
        col.operator = operator;
        col.negate = false;
        col.value = this._t4FbEmptyValue(fd, operator);
        col.touched = false;
        this._t4FbReplaceFacet(column, null, '');
    },

    // ------------------------------------------------------------------
    //  Apply -> facet
    // ------------------------------------------------------------------

    /** Value coi như "trống" (không tạo filter). */
    _t4FbIsEmpty(value) {
        if (value === '' || value === false || value === null || value === undefined) {
            return true;
        }
        if (Array.isArray(value)) {
            return value.length === 0 || value.every((v) => this._t4FbIsEmpty(v));
        }
        return false;
    },

    async t4FbApply(column) {
        const col = this._t4FbEnsure(column);
        const fd = this.fields[column.name];
        const valueInfo = getValueEditorInfo(fd, col.operator, VALUE_EDITOR_OPTS);
        // Toán tử "set"/"not set" không có ô value (component null) nhưng vẫn
        // là filter hợp lệ.
        const noValueOp = valueInfo.component == null;
        const active = col.touched && (
            noValueOp ||
            (valueInfo.isSupported(col.value) && !this._t4FbIsEmpty(col.value)));
        let domain = null;
        let label = this._t4FbFacetLabel(column, col, valueInfo);
        if (active) {
            try {
                const tree = condition(
                    column.name, col.operator, col.value, col.negate);
                domain = new Domain(domainFromTree(tree));
                // Nhãn facet resolve TÊN record cho m2o/x2many (id → tên) qua
                // treeProcessor — nếu không, chip chỉ hiện "Cột: =" trống trơn.
                const sm = this.env.searchModel;
                try {
                    label = await sm.treeProcessor.getDomainTreeDescription(
                        sm.resModel, tree);
                } catch {
                    label = this._t4FbFacetLabel(column, col, valueInfo);
                }
            } catch {
                domain = null;
            }
        }
        this._t4FbReplaceFacet(column, domain, label);
    },

    /**
     * Nhãn facet: "<Cột>: <toán tử> <giá trị>". Field quan hệ + toán tử theo
     * id (=/≠/in/child_of...) bỏ phần giá trị (value editor chỉ giữ id); ilike
     * trên field quan hệ = tìm chuỗi → vẫn hiện chuỗi.
     */
    _t4FbFacetLabel(column, col, valueInfo) {
        const fd = this.fields[column.name];
        let label = column.label || fd.string || column.name;
        try {
            const opInfo = this.t4FbOperatorInfo(column);
            label += `: ${opInfo.stringify([col.operator, col.negate])}`;
        } catch {
            /* giữ nguyên label */
        }
        const relationalIdOp = fd.relation && [
            '=', '!=', 'in', 'not in', 'child_of', 'parent_of',
        ].includes(col.operator);
        if (valueInfo.component != null && !relationalIdOp && valueInfo.stringify) {
            try {
                const valLabel = valueInfo.stringify(col.value);
                if (valLabel) {
                    label += ` ${valLabel}`;
                }
            } catch {
                /* bỏ phần giá trị */
            }
        }
        return label;
    },

    /**
     * Thay facet của cột: deactivate group cũ (nếu có) + tạo filter mới.
     * blockNotification để 2 thao tác chỉ reload list 1 lần.
     */
    _t4FbReplaceFacet(column, domain, label) {
        const sm = this.env.searchModel;
        const oldGroupId = this.t4FbGroupIds[column.name];
        if (oldGroupId) {
            delete this.t4FbGroupIds[column.name];
            if (domain) {
                sm.blockNotification = true;
                sm.deactivateGroup(oldGroupId);
                sm.blockNotification = false;
            } else {
                sm.deactivateGroup(oldGroupId);
                return;
            }
        }
        if (!domain) {
            return;
        }
        const preFilter = {
            description: label,
            domain: domain.toString(),
            invisible: 'True',
        };
        sm.createNewFilters([preFilter]);
        // createNewFilters gán groupId vào chính preFilter object.
        this.t4FbGroupIds[column.name] = preFilter.groupId;
    },

    /** User gỡ facet trên search bar → cột đó reset về trống. */
    t4FbSyncFacets() {
        const sm = this.env.searchModel;
        for (const [name, groupId] of Object.entries(this.t4FbGroupIds)) {
            const stillActive = sm.query.some(
                (qe) => sm.searchItems[qe.searchItemId]?.groupId === groupId);
            if (!stillActive) {
                delete this.t4FbGroupIds[name];
                const fd = this.fields[name];
                if (!fd) {
                    continue;
                }
                const operator = this.t4FbOperators({ name })[0];
                this.t4Fb.cols[name] = {
                    operator,
                    negate: false,
                    value: this._t4FbEmptyValue(fd, operator),
                    touched: false,
                };
            }
        }
    },
});
