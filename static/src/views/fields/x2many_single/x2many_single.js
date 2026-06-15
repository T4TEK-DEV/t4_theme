/** @odoo-module **/

// Widget x2many_single — cho trường many2many / one2many hiển thị & hành xử
// như MANY2ONE: chỉ chọn được 1 giá trị, ô chọn dạng dropdown (không phải chip).
// Khi chọn giá trị mới → thay thế giá trị cũ (link mới, unlink hết phần còn lại).
// Dùng: <field name="tax_ids" widget="x2many_single"/>.
import { Component } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { Many2One } from "@web/views/fields/many2one/many2one";
import { standardFieldProps } from "@web/views/fields/standard_field_props";

export class X2ManySingleField extends Component {
    static template = "t4_theme.X2ManySingle";
    static components = { Many2One };
    static props = { ...standardFieldProps };

    setup() {
        // Bind để truyền callback giữ đúng `this`.
        this.updateValue = this.updateValue.bind(this);
    }

    get list() {
        return this.props.record.data[this.props.name];
    }

    get relation() {
        return this.props.record.fields[this.props.name].relation;
    }

    // Giá trị hiển thị kiểu m2o: lấy bản ghi ĐẦU TIÊN (đơn trị) → {id, display_name}.
    get m2oValue() {
        const rec = this.list && this.list.records && this.list.records[0];
        if (rec) {
            return {
                id: rec.resId,
                display_name: rec.data.display_name ?? rec.data.name ?? "",
            };
        }
        return false;
    }

    // Ghi NGƯỢC vào x2many: link id mới, unlink mọi id khác → chỉ còn 1 (hoặc rỗng).
    async updateValue(value) {
        const newId = value && value.id ? value.id : false;
        const remove = this.list.currentIds.filter((id) => id !== newId);
        await this.list.addAndRemove({ add: newId ? [newId] : [], remove });
    }
}

export const x2ManySingleField = {
    component: X2ManySingleField,
    displayName: "Đơn trị (như many2one)",
    supportedTypes: ["many2many", "one2many"],
    // BẮT BUỘC nạp display_name của bản ghi liên kết — nếu không, ô chọn hiện
    // TRỐNG (chỉ có id). Mirror cách many2many_tags fetch tên hiển thị.
    relatedFields: () => [{ name: "display_name", type: "char" }],
};

registry.category("fields").add("x2many_single", x2ManySingleField);
