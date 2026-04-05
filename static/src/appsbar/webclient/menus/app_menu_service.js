import { registry } from "@web/core/registry";
import { user } from "@web/core/user";

import { computeAppsAndMenuItems, reorderApps } from "@web/webclient/menus/menu_helpers";

export const appMenuService = {
    dependencies: ["menu"],
    async start(env, { menu }) {
        const company = user.activeCompany || {};
        const homeMenuOverlay = company.theme_home_menu_overlay !== false;

        return {
        	homeMenuOverlay,
        	getCurrentApp () {
        		return menu.getCurrentApp();
        	},
        	getAppsMenuItems() {
				const menuItems = computeAppsAndMenuItems(
					menu.getMenuAsTree('root')
				)
				const apps = menuItems.apps;
				const raw = JSON.parse(
					user.settings?.homemenu_config || 'null'
				);
				// Support both old format (array) and new format ({appOrder, logo, clock})
				const order = Array.isArray(raw) ? raw : (raw?.appOrder || null);
				if (order) {
                    reorderApps(apps, order);
				}
        		return apps;
			},
			selectApp(app) {
				menu.selectMenu(app);
			}
        };
    },
};

registry.category("services").add("app_menu", appMenuService);
