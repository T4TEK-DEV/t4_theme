/** @odoo-module */
/**
 * T4 Filter Bar — hàng ô lọc per-column dưới header list view.
 *
 * Bật/tắt bằng nút phễu trên control panel (control_panel_patch.js —
 * event bus `T4-FILTER-BAR:TOGGLE`, trạng thái nhớ theo action trong
 * localStorage). Mỗi cột (field lọc được) có 1 input; giá trị nhập →
 * build domain theo type field → đẩy vào SearchModel như 1 facet riêng
 * per-column (createNewFilters; đổi giá trị = deactivate group cũ + tạo
 * mới; xóa facet trên search bar → input tự trống lại — sync qua event
 * 'update' của SearchModel).
 *
 * Domain theo type:
 *   char/text/html/m2o/x2many : ilike
 *   selection                 : = (dropdown)
 *   boolean                   : = true/false (dropdown Có/Không)
 *   integer/float/monetary    : `5`, `>5`, `>=5`, `<5`, `<=5`, `=5`, `1..9`
 *   date/datetime             : `dd/mm/yyyy` hoặc `dd/mm/yyyy..dd/mm/yyyy`
 *                               (datetime = trọn ngày theo múi giờ user)
 *
 * CHỈ hoạt động ở list view gốc (viewType === 'list' + có searchModel) —
 * list x2many trong form KHÔNG có filter bar.
 */
import { _t } from '@web/core/l10n/translation';
import { browser } from '@web/core/browser/browser';
import { Domain } from '@web/core/domain';
import {
    parseDate,
    serializeDate,
    serializeDateTime,
} from '@web/core/l10n/dates';
import { useBus, useService } from '@web/core/utils/hooks';
import { patch } from '@web/core/utils/patch';
import { ListRenderer } from '@web/views/list/list_renderer';
import { useState } from '@odoo/owl';

export const T4_FILTER_BAR_TOGGLE = 'T4-FILTER-BAR:TOGGLE';

const TEXT_TYPES = ['char', 'text', 'html'];
const RELATIONAL_TYPES = ['many2one', 'many2many', 'one2many'];
const NUMBER_TYPES = ['integer', 'float', 'monetary'];
const DATE_TYPES = ['date', 'datetime'];

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
        this.t4FbNotification = useService('notification');
        // groupId của facet per-column — không cần reactive.
        this.t4FbGroupIds = {};
        this.t4Fb = useState({
            visible: !!browser.localStorage.getItem(
                t4FilterBarStorageKey(this.env)),
            values: {},
        });
        useBus(this.env.bus, T4_FILTER_BAR_TOGGLE, () => {
            this.t4Fb.visible = !!browser.localStorage.getItem(
                t4FilterBarStorageKey(this.env));
        });
        // User gỡ facet trên search bar (bấm ×) → input cột đó trống lại.
        useBus(this.env.searchModel, 'update', () => this.t4FbSyncFacets());
    },

    get t4FbAvailable() {
        return this.env.config?.viewType === 'list' && !!this.env.searchModel;
    },

    get t4FbVisible() {
        return this.t4FbAvailable && this.t4Fb && this.t4Fb.visible;
    },

    /**
     * Loại input cho 1 cột: 'text' | 'number' | 'date' | 'select' |
     * 'boolean' | '' (không lọc được).
     */
    t4FbKind(column) {
        const field = this.fields[column.name];
        if (!field || field.searchable === false || column.widget === 'handle') {
            return '';
        }
        const { type } = field;
        if (TEXT_TYPES.includes(type) || RELATIONAL_TYPES.includes(type)) {
            return 'text';
        }
        if (NUMBER_TYPES.includes(type)) {
            return 'number';
        }
        if (DATE_TYPES.includes(type)) {
            return 'date';
        }
        if (type === 'selection') {
            return 'select';
        }
        if (type === 'boolean') {
            return 'boolean';
        }
        return '';
    },

    t4FbSelectionOptions(column) {
        return this.fields[column.name].selection || [];
    },

    t4FbValue(column) {
        return this.t4Fb.values[column.name] || '';
    },

    t4FbOnKeydown(ev, column) {
        if (ev.key === 'Enter') {
            this.t4FbApply(column, ev.target.value);
        } else if (ev.key === 'Escape') {
            ev.target.value = '';
            this.t4FbApply(column, '');
        }
    },

    t4FbOnChange(ev, column) {
        this.t4FbApply(column, ev.target.value);
    },

    t4FbApply(column, raw) {
        raw = (raw || '').trim();
        if ((this.t4Fb.values[column.name] || '') === raw) {
            return;
        }
        this.t4Fb.values[column.name] = raw;
        let domain = null;
        if (raw) {
            try {
                domain = this._t4FbBuildDomain(column, raw);
            } catch {
                domain = undefined;
            }
            if (domain === undefined) {
                this.t4FbNotification.add(
                    _t('Giá trị lọc "%s" không hợp lệ cho cột %s.',
                        raw, column.label),
                    { type: 'warning' },
                );
                return;
            }
        }
        this._t4FbReplaceFacet(column, domain, this._t4FbDisplayValue(column, raw));
    },

    /**
     * Giá trị hiển thị trên facet: selection/boolean dùng NHÃN thay vì
     * raw value (VD 'not_have_fg_product' → 'Chưa Lắp Ráp').
     */
    _t4FbDisplayValue(column, raw) {
        const field = this.fields[column.name];
        if (field.type === 'selection') {
            const opt = (field.selection || []).find(([v]) => v === raw);
            return opt ? opt[1] : raw;
        }
        if (field.type === 'boolean') {
            return raw === '1' ? _t('Có') : _t('Không');
        }
        return raw;
    },

    /**
     * Thay facet của cột: deactivate group cũ (nếu có) + tạo filter mới.
     * blockNotification để 2 thao tác chỉ reload list 1 lần.
     */
    _t4FbReplaceFacet(column, domain, raw) {
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
            description: `${column.label}: ${raw}`,
            domain: domain.toString(),
            invisible: 'True',
        };
        sm.createNewFilters([preFilter]);
        // createNewFilters gán groupId vào chính preFilter object.
        this.t4FbGroupIds[column.name] = preFilter.groupId;
    },

    t4FbSyncFacets() {
        const sm = this.env.searchModel;
        for (const [fieldName, groupId] of Object.entries(this.t4FbGroupIds)) {
            const stillActive = sm.query.some(
                (qe) => sm.searchItems[qe.searchItemId]?.groupId === groupId);
            if (!stillActive) {
                delete this.t4FbGroupIds[fieldName];
                this.t4Fb.values[fieldName] = '';
            }
        }
    },

    /**
     * @returns {Domain|undefined} undefined = giá trị không hợp lệ.
     */
    _t4FbBuildDomain(column, raw) {
        const field = this.fields[column.name];
        const name = column.name;
        const { type } = field;
        if (TEXT_TYPES.includes(type) || RELATIONAL_TYPES.includes(type)) {
            return new Domain([[name, 'ilike', raw]]);
        }
        if (type === 'selection') {
            return new Domain([[name, '=', raw]]);
        }
        if (type === 'boolean') {
            return new Domain([[name, '=', raw === '1']]);
        }
        if (NUMBER_TYPES.includes(type)) {
            return this._t4FbNumberDomain(name, raw);
        }
        if (DATE_TYPES.includes(type)) {
            return this._t4FbDateDomain(name, type, raw);
        }
        return undefined;
    },

    _t4FbParseNumber(raw) {
        let s = raw.replace(/\s/g, '');
        if (s.includes(',')) {
            // định dạng VN: '.' nghìn, ',' thập phân
            s = s.replace(/\./g, '').replace(',', '.');
        }
        const n = parseFloat(s);
        return isNaN(n) ? undefined : n;
    },

    _t4FbNumberDomain(name, raw) {
        const range = raw.split('..');
        if (range.length === 2) {
            const lo = this._t4FbParseNumber(range[0]);
            const hi = this._t4FbParseNumber(range[1]);
            if (lo === undefined || hi === undefined) {
                return undefined;
            }
            return new Domain([[name, '>=', lo], [name, '<=', hi]]);
        }
        const m = raw.match(/^(>=|<=|>|<|=)?\s*(.+)$/);
        const value = this._t4FbParseNumber(m ? m[2] : raw);
        if (value === undefined) {
            return undefined;
        }
        return new Domain([[name, (m && m[1]) || '=', value]]);
    },

    _t4FbDateDomain(name, type, raw) {
        const parts = raw.split('..');
        if (parts.length > 2) {
            return undefined;
        }
        const from = parseDate(parts[0].trim());
        const to = parseDate((parts[parts.length - 1]).trim());
        if (!from || !to) {
            return undefined;
        }
        if (type === 'date') {
            return new Domain([
                [name, '>=', serializeDate(from)],
                [name, '<=', serializeDate(to)],
            ]);
        }
        // datetime: trọn ngày theo múi giờ user → serialize UTC
        return new Domain([
            [name, '>=', serializeDateTime(from.startOf('day'))],
            [name, '<=', serializeDateTime(to.endOf('day'))],
        ]);
    },
});
