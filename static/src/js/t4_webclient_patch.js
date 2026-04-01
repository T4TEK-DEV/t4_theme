/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { WebClient } from "@web/webclient/webclient";
import { T4Sidebar } from "./t4_sidebar";

/**
 * Patch WebClient to register T4Sidebar as a child component.
 * The template extension (t4_theme.WebClient) inserts <T4Sidebar/>
 * before <ActionContainer/>.
 */
patch(WebClient, {
    components: {
        ...WebClient.components,
        T4Sidebar,
    },
});
