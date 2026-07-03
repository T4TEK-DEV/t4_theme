/** @odoo-module **/
/**
 * Search Panel — Date Range section (generic, tái dùng được).
 *
 * Odoo searchpanel gốc chỉ có section category/filter (checkbox theo record),
 * KHÔNG có chọn khoảng thời gian Từ/Đến. Widget này thêm loại section "date
 * range" dùng DateTimeInput (datepicker chuẩn Odoo), khai báo NGAY TRONG
 * SEARCH VIEW như field searchpanel thường:
 *
 *   <search>
 *       ...
 *       <searchpanel>
 *           <field name="report_date" widget="t4_date_range"
 *                  string="Kỳ Báo Cáo" icon="fa-calendar"
 *                  context="{'default_from': 'month_start',
 *                            'default_to': 'today'}"/>
 *       </searchpanel>
 *   </search>
 *
 * - `widget="t4_date_range"` đánh dấu section (RNG search view cho phép attr
 *   widget/string/icon/color/context trên field).
 * - defaults khai trong `context`: 'month_start' | 'today' | 'YYYY-MM-DD'
 *   | bỏ trống.
 *
 * Cơ chế:
 * - Patch `SearchArchParser.visitSearchPanel`: TÁCH field widget=t4_date_range
 *   ra khỏi node TRƯỚC khi core parse (core sẽ coi là category many2one →
 *   RPC search_panel_select_range nổ với field date), rồi push section
 *   {type: 't4_date_range', fieldName, from, to} vào this.sections.
 *   Có section trong arch → core tự hiện panel (không cần ép display).
 * - Patch `SearchModel`:
 *   + getSections: section date-range luôn empty=false (hasValues của core
 *     không biết type này).
 *   + _getSearchPanelDomain: AND thêm [(field,'>=',from),(field,'<=',to)].
 *   + t4SetSectionDateRange: đổi ngày → _notify() → view reload domain mới.
 * - Patch `SearchPanel` (+ template extension): section type t4_date_range
 *   render 2 ô DateTimeInput thay cho category/filter body.
 * - from/to lưu dạng ISO string (serializable — export/import state qua
 *   breadcrumb không vỡ), convert luxon ở edge render.
 *
 * Model thường: đây đơn thuần là filter khoảng ngày trên field đó. Model
 * báo cáo (vd t4_sti Báo Cáo XNT) có thể tiêu thụ leaf trong `_search` để
 * TÍNH LẠI dữ liệu theo kỳ.
 */
import { DateTimeInput } from "@web/core/datetime/datetime_input";
import { Domain } from "@web/core/domain";
import { evaluateExpr } from "@web/core/py_js/py";
import { patch } from "@web/core/utils/patch";
import { SearchArchParser } from "@web/search/search_arch_parser";
import { SearchModel } from "@web/search/search_model";
import { SearchPanel } from "@web/search/search_panel/search_panel";

const { DateTime } = luxon;

const T4_DATE_RANGE = "t4_date_range";
let t4SectionSeq = 1;

/** @returns {string|false} ISO date 'YYYY-MM-DD' */
function resolveDefaultDate(spec) {
    if (!spec) {
        return false;
    }
    if (spec === "today") {
        return DateTime.local().toISODate();
    }
    if (spec === "month_start") {
        return DateTime.local().startOf("month").toISODate();
    }
    return DateTime.fromISO(spec).isValid ? spec : false;
}

patch(SearchArchParser.prototype, {
    visitSearchPanel(searchPanelNode) {
        // Tách field t4_date_range TRƯỚC khi core parse (tránh core coi là
        // category → RPC select_range nổ với field date).
        const dateRangeNodes = [];
        for (const node of [...searchPanelNode.children]) {
            if (
                node.nodeType === 1 &&
                node.tagName === "field" &&
                node.getAttribute("widget") === T4_DATE_RANGE
            ) {
                searchPanelNode.removeChild(node);
                const invisible = node.getAttribute("invisible");
                if (invisible !== "True" && invisible !== "1") {
                    dateRangeNodes.push(node);
                }
            }
        }
        const result = super.visitSearchPanel(searchPanelNode);
        for (const node of dateRangeNodes) {
            const fieldName = node.getAttribute("name");
            const field = this.fields[fieldName];
            const ctx = node.getAttribute("context")
                ? evaluateExpr(node.getAttribute("context"))
                : {};
            const id = `t4dr_${fieldName}_${t4SectionSeq++}`;
            this.sections.push([id, {
                id,
                type: T4_DATE_RANGE,
                fieldName,
                description: node.getAttribute("string")
                    || (field && field.string) || fieldName,
                icon: node.getAttribute("icon") || "fa-calendar",
                color: node.getAttribute("color") || null,
                from: resolveDefaultDate(ctx.default_from),
                to: resolveDefaultDate(ctx.default_to),
            }]);
        }
        return result;
    },
});

patch(SearchModel.prototype, {
    getSections(predicate) {
        // Core hasValues() không biết type t4_date_range → empty=true → bị
        // SearchPanel lọc mất. Ép empty=false rồi mới áp predicate.
        let sections = super.getSections();
        sections = sections.map((s) =>
            s.type === T4_DATE_RANGE ? Object.assign({}, s, { empty: false }) : s
        );
        if (predicate) {
            sections = sections.filter(predicate);
        }
        return sections;
    },
    _getSearchPanelDomain() {
        const domains = [super._getSearchPanelDomain()];
        for (const section of this.sections.values()) {
            if (section.type !== T4_DATE_RANGE) {
                continue;
            }
            const leaves = [];
            if (section.from) {
                leaves.push([section.fieldName, ">=", section.from]);
            }
            if (section.to) {
                leaves.push([section.fieldName, "<=", section.to]);
            }
            if (leaves.length) {
                domains.push(new Domain(leaves));
            }
        }
        return Domain.and(domains);
    },
    /**
     * @param {string} sectionId
     * @param {"from"|"to"} part
     * @param {string|false} isoDate 'YYYY-MM-DD'
     */
    t4SetSectionDateRange(sectionId, part, isoDate) {
        const section = this.sections.get(sectionId);
        if (!section || section.type !== T4_DATE_RANGE) {
            return;
        }
        section[part] = isoDate || false;
        this._notify();
    },
});

Object.assign(SearchPanel.components, { DateTimeInput });

patch(SearchPanel.prototype, {
    /** ISO string → luxon DateTime cho DateTimeInput. */
    t4DateRangeValue(section, part) {
        return section[part] ? DateTime.fromISO(section[part]) : false;
    },
    onT4DateRangeApply(section, part, date) {
        this.env.searchModel.t4SetSectionDateRange(
            section.id, part, date ? date.toISODate() : false);
    },
});
