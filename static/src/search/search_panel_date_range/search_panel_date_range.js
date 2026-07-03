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
 *           <field name="product_id" select="multi" .../>  <!-- core -->
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
 *   RPC search_panel_select_range nổ với field date), rồi UNSHIFT section
 *   {type:'t4_date_range', fieldName, from, to, values: new Map()} lên đầu
 *   this.sections (hiện trên cùng panel). `values` Map RỖNG bắt buộc:
 *   SearchModel.exportState/_importState serialize `section.values` cho MỌI
 *   section (mapToArray(undefined) → crash "map is not iterable" khi rời
 *   view). from/to lưu ISO string (serializable qua breadcrumb state).
 * - Patch `SearchModel`:
 *   + getSections: section date-range luôn empty=false (hasValues của core
 *     không biết type này → bị SearchPanel lọc mất).
 *   + `_getDomain` (KHÔNG phải _getSearchPanelDomain): AND thêm
 *     [(field,'>=',from),(field,'<=',to)] vào MỌI biến thể domain — kể cả
 *     `searchDomain` (withSearchPanel:false) dùng fetch section values/
 *     counters → đổi kỳ ⇒ searchDomainChanged ⇒ values các section filter
 *     (vd Sản Phẩm) refetch THEO KỲ.
 *   + t4SetSectionDateRange: đổi ngày (guard giá trị không đổi) →
 *     _notify() → with_search re-render → view reload domain mới.
 * - Patch `SearchPanel` + extension template `web.SearchPanel.Section`
 *   (PHẢI là Section — resolve RUNTIME qua callTemplate, mọi caller
 *   Content/Regular/Small đều nhận; extension trên SearchPanelContent KHÔNG
 *   lan sang Regular vì Regular là t-inherit-mode="primary").
 *
 * Model thường: filter khoảng ngày trên field đó. Model báo cáo (vd t4_sti
 * Báo Cáo XNT) tiêu thụ leaf trong `_search` để TÍNH LẠI dữ liệu theo kỳ.
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
        const sections = [];
        for (const node of dateRangeNodes) {
            const fieldName = node.getAttribute("name");
            const field = this.fields[fieldName];
            const ctx = node.getAttribute("context")
                ? evaluateExpr(node.getAttribute("context"))
                : {};
            const id = `t4dr_${fieldName}_${t4SectionSeq++}`;
            sections.push([id, {
                id,
                type: T4_DATE_RANGE,
                fieldName,
                description: node.getAttribute("string")
                    || (field && field.string) || fieldName,
                icon: node.getAttribute("icon") || "fa-calendar",
                color: node.getAttribute("color") || null,
                from: resolveDefaultDate(ctx.default_from),
                to: resolveDefaultDate(ctx.default_to),
                // Bắt buộc: exportState serialize values cho mọi section.
                values: new Map(),
            }]);
        }
        // Lên ĐẦU panel (trước các section category/filter core).
        this.sections.unshift(...sections);
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
    /** @returns {Domain} gộp leaves >=/<= của mọi section date-range. */
    _t4GetDateRangeDomain() {
        const leaves = [];
        for (const section of this.sections.values()) {
            if (section.type !== T4_DATE_RANGE) {
                continue;
            }
            if (section.from) {
                leaves.push([section.fieldName, ">=", section.from]);
            }
            if (section.to) {
                leaves.push([section.fieldName, "<=", section.to]);
            }
        }
        return new Domain(leaves);
    },
    /**
     * AND date-range vào MỌI domain — kể cả searchDomain
     * (withSearchPanel:false, dùng fetch values/counters của section khác)
     * → đổi kỳ ⇒ searchDomainChanged ⇒ section values refetch theo kỳ.
     */
    _getDomain(params = {}) {
        const base = super._getDomain({ ...params, raw: true });
        const drDomain = this._t4GetDateRangeDomain();
        const domain = Domain.and([base, drDomain]);
        return params.raw ? domain : domain.toList(this.domainEvalContext);
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
        const value = isoDate || false;
        if (section[part] === value) {
            return;
        }
        section[part] = value;
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
