/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { X2ManyField } from "@web/views/fields/x2many/x2many_field";
import { getTemplate } from "@web/core/templates";
import { useState, onWillRender, onWillUnmount } from "@odoo/owl";
import { attachGroupingToList } from "./x2many_grouped_adapter";
import { attachNestedGroupingToList } from "./x2many_nested_group_adapter";

const T4_FOLD_STATE = Symbol("t4ThemeX2mFoldState");
const T4_UNINSTALL = Symbol("t4ThemeX2mUninstaller");
const T4_INSTALLED_LIST = Symbol("t4ThemeX2mInstalledList");
const T4_INSTALLED_MODE = Symbol("t4ThemeX2mInstalledMode");

// Cache ket qua do kha nang STT theo cap ten template
// (`${Renderer.template}|${Renderer.recordRowTemplate}`). Templates la
// static per class nen ket qua khong doi trong 1 phien.
//
// LUU Y khi chay hoot: cache key chi gom TEN template. Test harness co the
// dang ky lai template khac nhau duoi cung mot ten (do co
// `clearProcessedTemplates()` trong `@web/core/templates`) — khi do gia tri
// `false` cu se song sot sang test sau. Chua gay van de vi hoot suite hien
// khong cham cac widget nay; neu sau nay co, phai clear Map nay cung luc.
const T4_STT_TEMPLATE_SUPPORT = new Map();

/**
 * Template `name` sau khi COMPILE co chua o STT (marker `data-t4-stt`)
 * hay khong.
 *
 * Phai doc template da compile chu khong the suy tu ten class: xem
 * comment o `t4RendererSupportsRowNumber`.
 *
 * `getTemplate` tra ve null khi ten chua dang ky, va NEM khi template cha
 * cua no khong ton tai. Ca hai truong hop deu quy ve "khong ho tro" —
 * mat cot STT con hon vo bang.
 */
function t4TemplateHasSttCell(name) {
    if (!name) {
        return false;
    }
    try {
        const tmpl = getTemplate(name);
        return !!(tmpl && tmpl.querySelector && tmpl.querySelector("[data-t4-stt]"));
    } catch {
        return false;
    }
}

patch(X2ManyField.prototype, {
    setup() {
        super.setup();
        this[T4_FOLD_STATE] = useState({});
        this[T4_UNINSTALL] = null;
        this[T4_INSTALLED_LIST] = null;
        this[T4_INSTALLED_MODE] = null;

        // Re-evaluate grouping each render. Two mutually-exclusive client-
        // side modes are supported via the field context:
        //
        //   list_nested_group_by:  ['field']   → global aggregation per
        //       key (one bucket per unique value). True per-key count/sum
        //       like Odoo's native multi-level groupBy. NEW widget — see
        //       x2many_nested_group_adapter.js.
        //
        //   list_groupbys:         ['field']   → contiguous-run bucketing
        //       (same key may appear multiple times if interrupted by a
        //       different key in DFS order). Used to preserve tree
        //       structure visually. OLD widget — see
        //       x2many_grouped_adapter.js. Kept unchanged.
        //
        // When both are set, `list_nested_group_by` wins.
        onWillRender(() => {
            const list = this.list;
            const archInfoColumns = this.archInfo && this.archInfo.columns;
            const nestedFields = this.t4NestedGroupByFields;
            const groupByFields = nestedFields.length ? [] : this.t4GroupByFields;
            const desiredMode = nestedFields.length
                ? "nested"
                : groupByFields.length
                ? "group"
                : null;

            if (!desiredMode || !list) {
                if (this[T4_UNINSTALL]) {
                    this[T4_UNINSTALL]();
                    this[T4_UNINSTALL] = null;
                    this[T4_INSTALLED_LIST] = null;
                    this[T4_INSTALLED_MODE] = null;
                }
                return;
            }
            if (
                this[T4_INSTALLED_LIST] === list &&
                this[T4_INSTALLED_MODE] === desiredMode
            ) {
                return; // already installed in the right mode on this list
            }
            if (this[T4_UNINSTALL]) {
                this[T4_UNINSTALL]();
            }
            if (desiredMode === "nested") {
                this[T4_UNINSTALL] = attachNestedGroupingToList(
                    list,
                    nestedFields,
                    this[T4_FOLD_STATE],
                    archInfoColumns,
                    this.t4NestedOpenField
                );
            } else {
                this[T4_UNINSTALL] = attachGroupingToList(
                    list,
                    groupByFields,
                    this[T4_FOLD_STATE],
                    archInfoColumns
                );
            }
            this[T4_INSTALLED_LIST] = this[T4_UNINSTALL] ? list : null;
            this[T4_INSTALLED_MODE] = this[T4_UNINSTALL] ? desiredMode : null;
        });

        onWillUnmount(() => {
            if (this[T4_UNINSTALL]) {
                this[T4_UNINSTALL]();
                this[T4_UNINSTALL] = null;
                this[T4_INSTALLED_LIST] = null;
                this[T4_INSTALLED_MODE] = null;
            }
        });
    },

    /**
     * Read `list_groupbys` from the field context (old contiguous-bucketing
     * widget). Value may be an array of field names or a single string.
     * Returns only fields that actually exist on the relational model.
     */
    get t4GroupByFields() {
        if (this.props.viewMode !== "list") {
            return [];
        }
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
     * Read `list_nested_group_by` from the field context (new global-
     * aggregate widget). Same shape as `list_groupbys` but resolves to a
     * different adapter — one bucket per unique key, no contiguous split.
     */
    get t4NestedGroupByFields() {
        if (this.props.viewMode !== "list") {
            return [];
        }
        if (typeof window !== "undefined" && window.__t4SkipX2mGrouping) {
            return [];
        }
        const ctx = this.props.context || {};
        let raw = ctx.list_nested_group_by;
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
     * Optional `list_tree_open_field` context — name of a Many2one field
     * whose target opens when the user clicks the open icon on a nested
     * group header. Defaults to the first `list_nested_group_by` field.
     */
    get t4NestedOpenField() {
        const ctx = this.props.context || {};
        const raw = ctx.list_tree_open_field;
        if (typeof raw !== "string" || !raw) {
            return "";
        }
        const list = this.list;
        if (!list || !list.fields) {
            return "";
        }
        return raw in list.fields ? raw : "";
    },

    /**
     * Tell the inner ListRenderer to draw a leading "STT" (sequence number)
     * column for every list view embedded in a form view. The cell value
     * accounts for `list.offset` so pagination produces continuous numbers.
     *
     * Only inject the prop when the *actual* renderer class accepts it.
     * Some X2ManyField subclasses swap in a custom renderer (e.g. account's
     * `ProductLabelSectionAndNoteListRender` on PO/SO/invoice order lines).
     * Those renderers descend from `SectionAndNoteListRenderer`, which clones
     * its `static props` array at class-load time (`[...super.props, ...]`) —
     * so our later `ListRenderer.props.push("t4WithRowNumber?")` never reaches
     * the clone and OWL prop validation rejects the unknown key. They also use
     * a separate template that doesn't inherit the STT <th>/<td> markup, so the
     * column couldn't render there anyway. Guarding on the renderer's declared
     * props both prevents the crash and keeps the column where it belongs.
     */
    get rendererProps() {
        const props = super.rendererProps;
        if (
            this.props.viewMode === "list" &&
            this.t4RendererAcceptsRowNumber &&
            this.t4RendererSupportsRowNumber
        ) {
            props.t4WithRowNumber = true;
        }
        return props;
    },

    /**
     * Whether the resolved ListRenderer component for this field declares the
     * optional `t4WithRowNumber` prop. Reads `this.constructor.components`
     * (subclasses override `static components.ListRenderer`) so the check
     * follows whatever renderer is actually mounted.
     */
    get t4RendererAcceptsRowNumber() {
        const Renderer =
            this.constructor.components && this.constructor.components.ListRenderer;
        const rProps = Renderer && Renderer.props;
        if (Array.isArray(rProps)) {
            return (
                rProps.includes("t4WithRowNumber?") ||
                rProps.includes("t4WithRowNumber")
            );
        }
        if (rProps && typeof rProps === "object") {
            return "t4WithRowNumber" in rProps;
        }
        return false;
    },

    /**
     * Template <th>/<td> cua renderer nay co THUC SU chua nhanh STT khong.
     *
     * 🔴 KHONG DUOC suy tu ten class hay tu `recordRowTemplate === "web..."`.
     * Ly do nam o co che ke thua template cua Odoo
     * (`web/static/src/core/templates.js::_getTemplate`):
     *
     *     const parentTemplate = _getTemplate(inheritFrom, blockId || info[name].blockId);
     *     ...
     *     for (const otherBlockId in templateExtensions[name] || {}) {
     *         if (blockId && otherBlockId > blockId) { break; }
     *
     * Template khai bao `t-inherit-mode="primary"` tao ra BAN SAO cua
     * template cha TAI THOI DIEM no duoc nap trong bundle: moi extension
     * dang ky voi blockId LON HON deu bi `break` bo qua. Hau qua:
     *
     *   - `resource.SectionListRenderer.RecordRow` (widget
     *     `section_one2many`) chup ban sao truoc t4_theme → hang KHONG co
     *     <td> STT, trong khi header lay tu `web.ListRenderer` (request
     *     voi blockId=null nen an het extension) VAN co <th> STT.
     *     → thead nhieu hon tbody 1 o, moi cot lech trai 1 nhip.
     *   - Chieu nguoc lai cung xay ra: `hr_skills.SkillsListRenderer` la
     *     ban sao primary cua `web.ListRenderer` (mat <th>) nhung van
     *     dung `recordRowTemplate` mac dinh (con <td>).
     *   - NHUNG `t4_sti.T4MovesListRenderer.RecordRow` cung la ban sao
     *     primary ma LAI co STT — vi t4_sti depends t4_theme nen nap SAU.
     *
     * Chinh ca thu 3 loai bo moi phep doan theo ten. Cach dung duy nhat la
     * DOC TEMPLATE DA COMPILE va tim marker `data-t4-stt` (dat trong
     * list_renderer_stt.xml). Doi BAT BUOC ca hai template — header lech
     * hay row lech deu vo bang nhu nhau.
     *
     * Khac vai tro voi `t4RendererAcceptsRowNumber`: getter kia chan CRASH
     * (renderer clone `static props` nen OWL tu choi prop la); getter nay
     * chan LECH COT. Hai loi khac nhau, dung gop lam mot.
     */
    get t4RendererSupportsRowNumber() {
        const Renderer =
            this.constructor.components && this.constructor.components.ListRenderer;
        if (!Renderer) {
            return false;
        }
        const key = `${Renderer.template}|${Renderer.recordRowTemplate}`;
        if (!T4_STT_TEMPLATE_SUPPORT.has(key)) {
            T4_STT_TEMPLATE_SUPPORT.set(
                key,
                t4TemplateHasSttCell(Renderer.template) &&
                    t4TemplateHasSttCell(Renderer.recordRowTemplate)
            );
        }
        return T4_STT_TEMPLATE_SUPPORT.get(key);
    },
});
