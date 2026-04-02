import { expect, test } from "@odoo/hoot";

import "@t4_theme/appsbar/webclient/menus/app_menu_service";
import "@t4_theme/webclient/navbar/navbar";

import { NavBar } from "@web/webclient/navbar/navbar";
import { AppsMenu } from "@t4_theme/webclient/appsmenu/appsmenu";

test.tags("t4_theme");
test("navbar uses AppsMenu component", async () => {
    expect(NavBar.components.AppsMenu).toBe(AppsMenu);
});
