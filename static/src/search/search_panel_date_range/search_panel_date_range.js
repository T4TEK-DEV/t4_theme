/** @odoo-module **/
/**
 * Search Panel — Date Range section (generic, tái dùng được).
 *
 * Odoo searchpanel gốc chỉ có section category/filter (checkbox theo record),
 * KHÔNG có chọn khoảng thời gian Từ/Đến. Widget này thêm 1 section "date
 * range" dùng DateTimeInput (datetime picker chuẩn Odoo), cấu hình qua
 * CONTEXT của action (house-style giống t4_passive_buttons — không đụng RNG
 * validation của search arch):
 *
 *   'context': {
 *       't4_searchpanel_date_range': {
 *           'field': 'report_date',        // field nhận domain >=/<=
 *           'string': 'Kỳ Báo Cáo',        // tiêu đề section
 *           'icon': 'fa-calendar',         // optional
 *           'default_from': 'month_start', // 'month_start' | 'today'
 *                                          // | 'YYYY-MM-DD' | false
 *           'default_to': 'today',
 *       },
 *   }
 *
 * Hoạt động: patch SearchModel —
 *   - load(): đọc config từ globalContext → state t4DateRange (from/to luxon).
 *   - _getDisplay(): ép hiện search panel kể cả khi search arch KHÔNG có
 *     <searchpanel> (core yêu cầu sections.size > 0).
 *   - _getSearchPanelDomain(): AND thêm [(field,'>=',from),(field,'<=',to)].
 * Patch SearchPanel render section From/To; đổi ngày → _notify() → view
 * reload với domain mới. Với model thường, đây đơn thuần là filter khoảng
 * ngày; model báo cáo (vd XNT) có thể tiêu thụ leaf trong _where_calc để
 * TÍNH LẠI dữ liệu theo kỳ.
 *
 * Giới hạn v1: chưa render ở mobile (web.SearchPanel.Small); không lưu vào
 * favorite/breadcrumb state (quay lại → về default).
 */
import { DateTimeInput } from "@web/core/datetime/datetime_input";
import { Domain } from "@web/core/domain";
import { serializeDate } from "@web/core/l10n/dates";
import { patch } from "@web/core/utils/patch";
import { SearchModel } from "@web/search/search_model";
import { SearchPanel } from "@web/search/search_panel/search_panel";

const { DateTime } = luxon;

function resolveDefaultDate(spec) {
    if (!spec) {
        return false;
    }
    if (spec === "today") {
        return DateTime.local().startOf("day");
    }
    if (spec === "month_start") {
        return DateTime.local().startOf("month");
    }
    const parsed = DateTime.fromISO(spec);
    return parsed.isValid ? parsed.startOf("day") : false;
}

patch(SearchModel.prototype, {
    async load(config) {
        await super.load(config);
        const cfg = (this.globalContext || {}).t4_searchpanel_date_range;
        if (cfg && cfg.field) {
            this.t4DateRange = {
                field: cfg.field,
                string: cfg.string || "Khoảng Thời Gian",
                icon: cfg.icon || "fa-calendar",
                from: resolveDefaultDate(cfg.default_from),
                to: resolveDefaultDate(cfg.default_to),
            };
        }
    },
    _getDisplay(display = {}) {
        const result = super._getDisplay(display);
        if (this.t4DateRange) {
            // Core chỉ hiện panel khi arch có <searchpanel> (sections.size).
            // Section date-range đến từ context → ép hiện (trừ khi action
            // tắt tường minh display.searchPanel).
            result.searchPanel =
                "searchPanel" in display ? display.searchPanel : true;
        }
        return result;
    },
    _getSearchPanelDomain() {
        const base = super._getSearchPanelDomain();
        if (!this.t4DateRange) {
            return base;
        }
        const leaves = [];
        if (this.t4DateRange.from) {
            leaves.push([
                this.t4DateRange.field, ">=", serializeDate(this.t4DateRange.from),
            ]);
        }
        if (this.t4DateRange.to) {
            leaves.push([
                this.t4DateRange.field, "<=", serializeDate(this.t4DateRange.to),
            ]);
        }
        return Domain.and([base, new Domain(leaves)]);
    },
    /**
     * @param {"from"|"to"} part
     * @param {luxon.DateTime|false} value
     */
    t4SetDateRange(part, value) {
        if (!this.t4DateRange) {
            return;
        }
        this.t4DateRange[part] = value ? value.startOf("day") : false;
        this._notify();
    },
});

Object.assign(SearchPanel.components, { DateTimeInput });

patch(SearchPanel.prototype, {
    get t4DateRange() {
        return this.env.searchModel.t4DateRange || null;
    },
    onT4DateRangeApply(part, date) {
        this.env.searchModel.t4SetDateRange(part, date);
    },
});
