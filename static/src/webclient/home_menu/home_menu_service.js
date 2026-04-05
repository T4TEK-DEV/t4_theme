/** @odoo-module **/
import { registry } from "@web/core/registry";
import { Mutex } from "@web/core/utils/concurrency";
import { reactive } from "@odoo/owl";

const homeMenuService = {
    dependencies: ["action"],
    start(env) {
        const state = reactive({
            hasHomeMenu: false,
            hasBackgroundAction: false,
        });
        const mutex = new Mutex();

        state.toggle = async function toggle(show) {
            return mutex.exec(async () => {
                show = show === undefined ? !state.hasHomeMenu : Boolean(show);
                if (show !== state.hasHomeMenu) {
                    if (show) {
                        await env.services.action.doAction("menu");
                    } else {
                        // Clear state immediately so UI updates
                        state.hasHomeMenu = false;
                        state.hasBackgroundAction = false;
                        document.body.classList.remove("o_home_menu_background");
                        try {
                            await env.services.action.restore();
                        } catch {
                            // No previous action — stay on home menu
                            state.hasHomeMenu = true;
                            document.body.classList.add("o_home_menu_background");
                        }
                    }
                }
                return new Promise((r) => setTimeout(r));
            });
        };

        state.setHomeMenu = function setHomeMenu(val, hasBg) {
            state.hasHomeMenu = val;
            state.hasBackgroundAction = hasBg;
            document.body.classList.toggle("o_home_menu_background", val);
        };

        return state;
    },
};

registry.category("services").add("t4_home_menu", homeMenuService);
