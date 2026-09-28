import { expect, test } from "@odoo/hoot";
import {
    models,
    fields,
    defineModels,
    mountView,
    contains,
    onRpc,
} from "@web/../tests/web_test_helpers";
import { defineMailModels } from "@mail/../tests/mail_test_helpers";

import "@t4_theme/group/search/expand_all/expand_all";
import "@t4_theme/group/search/collapse_all/collapse_all";

// Dich vu cua mail khoi dong cung moi truong test va hoi server model
// "discuss.channel"; khong khai thi Hoot bao "loi chua ai nhan" va test do
// vi mot chuyen chang lien quan. t4_theme depends mail nen dung duoc helper
// chuan nay. (Truoc 28/09 khong ai thay vi bundle unit test cua t4_theme
// hong nen KHONG test JS nao chay duoc - xem ghi chu o __manifest__.py.)
defineMailModels();
class Category extends models.Model {
    _records = [
        { id: 1, name: "Cat A" },
        { id: 2, name: "Cat B" },
    ];
    name = fields.Char();
}

class Product extends models.Model {
    _records = [
        { id: 1, name: "A-1", category_id: 1 },
        { id: 2, name: "A-2", category_id: 1 },
        { id: 3, name: "B-1", category_id: 2 },
    ];
    name = fields.Char();
    category_id = fields.Many2one({ 
        relation: "category", 
    });
}

// defineMailModels() da bao gom TOAN BO webModels (mailModels = {...webModels, ...}),
// goi them defineWebModels() la dinh nghia trung -> "Cyclic __proto__ value",
// test chet ngay truoc khi chay assertion nao.
defineModels({ Category, Product });

onRpc("has_group", () => true);

test.tags("muk_web_group");
test("nút mở/thu toàn bộ nhóm nằm INLINE trên control panel của list đã gom nhóm", async () => {
    // 🔴 Test này trước đây đòi hai mục trong cog menu (.mk_expand_all_menu /
    // .mk_collapse_all_menu). Cả hai dòng `cogMenuRegistry.add(...)` đã bị CHÚ
    // THÍCH LẠI trong expand_all.js và collapse_all.js — tính năng chuyển sang
    // một nút gộp đặt thẳng trên control panel (group/search/control_panel/).
    // Test cũ vì vậy luôn đỏ; không ai thấy vì bundle web.assets_unit_tests của
    // t4_theme hỏng nên KHÔNG test JS nào trong dự án chạy được (sửa 28/09).
    await mountView({
        type: "list",
        resModel: "product",
        groupBy: ["category_id"],
        arch: "<list string='Products'><field name='name'/><field name='category_id'/></list>",
    });
    expect(".o_group_header").toHaveCount(2);

    // Nhóm đang thu: nút mời "Mở tất cả".
    expect(".t4-toggle-group-btn").toHaveCount(1);
    expect("tbody tr.o_data_row").toHaveCount(0);

    await contains(".t4-toggle-group-btn").click();
    expect("tbody tr.o_data_row").toHaveCount(3);

    // Đã mở hết thì chính nút đó đổi thành "Thu gọn".
    await contains(".t4-toggle-group-btn").click();
    expect("tbody tr.o_data_row").toHaveCount(0);
    expect(".o_group_header").toHaveCount(2);
});
