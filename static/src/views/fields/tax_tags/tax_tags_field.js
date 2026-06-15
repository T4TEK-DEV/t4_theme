/** @odoo-module **/

// Widget t4_tax_tags — many2many chọn THUẾ (account.tax) tiện hơn:
// hiển thị mức thuế (vd "Thuế GTGT 8% · 8%") ngay trên từng chip để khỏi phải
// mở record xem. Kế thừa many2many_tags chuẩn nên giữ nguyên hành vi chọn/xoá,
// no_create, color... Dùng: <field ... widget="t4_tax_tags"/>.
import { registry } from "@web/core/registry";
import {
    Many2ManyTagsField,
    many2ManyTagsField,
} from "@web/views/fields/many2many_tags/many2many_tags_field";

export class TaxTagsField extends Many2ManyTagsField {
    setup() {
        super.setup();
        // ĐƠN TRỊ: ép trường many2many (vd Thuế) chỉ giữ 1 giá trị như many2one.
        // Mỗi lần chọn giá trị mới → xóa hết giá trị cũ rồi thêm giá trị vừa chọn.
        const baseUpdate = this.update;
        this.update = async (recordlist) => {
            // Bỏ phần tử đã có sẵn; lấy phần tử MỚI cuối cùng được chọn.
            const fresh = (recordlist || []).filter(
                (el) => !this.tags.some((t) => t.resId === el.id)
            );
            if (!fresh.length) {
                return;
            }
            const keep = fresh[fresh.length - 1];
            // Xóa toàn bộ tag hiện có trước khi thêm tag mới → chỉ còn 1.
            for (const tag of [...this.tags]) {
                await this.deleteTag(tag.id);
            }
            return baseUpdate([keep]);
        };
    }

    getTagProps(record) {
        const props = super.getTagProps(record);
        const amount = record.data.amount;
        const amountType = record.data.amount_type;
        if (amount !== undefined && amount !== null) {
            let suffix = "";
            if (amountType === "percent" || amountType === "division") {
                suffix = `${amount}%`;
            } else if (amountType === "fixed") {
                suffix = `${amount}`;
            }
            // Chỉ nối mức thuế khi nhãn CHƯA chứa nó (tránh trùng "10% · 10%"
            // khi tên thuế vốn đã là mức %).
            const text = String(props.text || "");
            if (suffix && !text.includes(suffix)) {
                props.text = `${text} · ${suffix}`;
            }
        }
        return props;
    }
}

export const taxTagsField = {
    ...many2ManyTagsField,
    component: TaxTagsField,
    // Nạp thêm amount/amount_type để hiển thị mức thuế trên chip.
    relatedFields: (fieldInfo) => {
        return [
            ...many2ManyTagsField.relatedFields(fieldInfo),
            { name: "amount", type: "float" },
            { name: "amount_type", type: "selection" },
        ];
    },
};

registry.category("fields").add("t4_tax_tags", taxTagsField);
