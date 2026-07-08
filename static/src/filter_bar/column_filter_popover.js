/** @odoo-module */
/**
 * Popover "nâng cao" mở từ nút ▾ trên mỗi ô lọc của T4 Filter Bar.
 *
 * Cảm hứng từ udoo_web_filter_bar (v17) — nhưng thay vì nhúng nguyên
 * DomainSelector (v19 đổi hẳn sang service-based, subclass rất mong manh),
 * popover này CHỈ dựng đúng phần user cần cho 1 cột: dropdown TOÁN TỬ +
 * ô GIÁ TRỊ (tái dùng editor của `@web/core/tree_editor` qua sub-template
 * `t4_theme.FilterBarEditor`) + nút Xóa/Đóng. Khớp với preview user chọn
 * ([toán tử ▾][giá trị] + [Xóa][Áp dụng]).
 *
 * Popover giữ `draft` reactive riêng (tự re-render khi đổi toán tử → đổi ô
 * value); mỗi thay đổi commit ngay về ListRenderer qua `props.commit(...)`
 * (áp filter live), nên nút "Áp dụng" chỉ đóng popover.
 */
import { Component, useState } from '@odoo/owl';
import { getOperatorEditorInfo } from '@web/core/tree_editor/tree_editor_operator_editor';
import {
    getDefaultValue,
    getValueEditorInfo,
} from '@web/core/tree_editor/tree_editor_value_editors';

export class T4ColumnFilterPopover extends Component {
    static template = 't4_theme.ColumnFilterPopover';
    static props = {
        close: Function,
        label: String,
        fieldDef: Object,
        operators: Array,
        // trạng thái hiện tại của cột {operator, negate, value}
        state: Object,
        // commit(operator, negate, value, fromValueEdit) → áp filter
        commit: Function,
        // clear() → gỡ filter cột này
        clear: Function,
    };

    setup() {
        const s = this.props.state;
        this.draft = useState({
            operator: s.operator,
            negate: s.negate || false,
            value: s.value,
        });
    }

    get operatorInfo() {
        return getOperatorEditorInfo(this.props.operators, this.props.fieldDef);
    }

    get valueInfo() {
        // addBlankOption: khớp với ô inline (selection có option "trống").
        return getValueEditorInfo(
            this.props.fieldDef, this.draft.operator, { addBlankOption: true });
    }

    onOperator(operator, negate) {
        this.draft.operator = operator;
        this.draft.negate = negate || false;
        // Đổi toán tử → reset value (giữ nếu vẫn hợp lệ — mirror core).
        this.draft.value = getDefaultValue(
            this.props.fieldDef, operator, this.draft.value);
        this.props.commit(
            this.draft.operator, this.draft.negate, this.draft.value, false);
    }

    onValue(value) {
        this.draft.value = value;
        this.props.commit(this.draft.operator, this.draft.negate, value, true);
    }

    onClear() {
        this.props.clear();
        this.props.close();
    }
}
