import { session } from "@web/session";
import { expect, test } from "@odoo/hoot";

import { Component, xml } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";

import { 
    contains, 
    makeDialogMockEnv, 
    mountWithCleanup 
} from "@web/../tests/web_test_helpers";
import { defineMailModels } from "@mail/../tests/mail_test_helpers";

import "@t4_theme/dialog/core/dialog/dialog";

// Dich vu cua mail khoi dong cung moi truong test va hoi server model
// "discuss.channel"; khong khai thi Hoot bao "loi chua ai nhan" va test do
// vi mot chuyen chang lien quan. t4_theme depends mail nen dung duoc helper
// chuan nay. (Truoc 28/09 khong ai thay vi bundle unit test cua t4_theme
// hong nen KHONG test JS nao chay duoc - xem ghi chu o __manifest__.py.)
defineMailModels();

test.tags("muk_web_dialog");
test("dialog size toggle switches between fullscreen and initial size", async () => {
    const realDialogSize = session.dialog_size;
    try {
        session.dialog_size = "maximize";

        class Parent extends Component {
            static components = { Dialog };
            static template = xml`
                <Dialog title="'Hello'">
                    Hello
                </Dialog>
            `;
            static props = ["*"];
        }

        await makeDialogMockEnv();
        await mountWithCleanup(Parent);
        expect(".o_dialog").toHaveCount(1);
        expect(".o_dialog .mk_btn_dialog_size").toHaveCount(1);
        expect(".o_dialog .modal-fs").toHaveCount(1);
        expect(".o_dialog .mk_btn_dialog_size i.fa-compress").toHaveCount(1);
        await contains(".o_dialog .mk_btn_dialog_size").click();
        expect(".o_dialog .modal-lg").toHaveCount(1);
        expect(".o_dialog .mk_btn_dialog_size i.fa-expand").toHaveCount(1);
        await contains(".o_dialog .mk_btn_dialog_size").click();
        expect(".o_dialog .modal-fs").toHaveCount(1);
        expect(".o_dialog .mk_btn_dialog_size i.fa-compress").toHaveCount(1);
    } finally {
        session.dialog_size = realDialogSize;
    }
});
