import { patch } from "@web/core/utils/patch";
import { registry } from "@web/core/registry";
import { user } from "@web/core/user";
import { NavBar } from "@web/webclient/navbar/navbar";
import { computeAppsAndMenuItems } from "@web/webclient/menus/menu_helpers";

/**
 * URL Prefix Service: replaces /odoo/ with custom prefix in generated URLs.
 * The /odoo/ routes still work (server handles both), but the UI shows the custom prefix.
 */

function getUrlPrefix() {
    const prefix = user.activeCompany?.t4_url_prefix;
    if (prefix) {
        const clean = prefix.replace(/^\/|\/$/g, '');
        if (clean) {
            return `/${clean}`;
        }
    }
    return '/odoo';
}

// Patch NavBar.getMenuItemHref to use custom prefix
patch(NavBar.prototype, {
    getMenuItemHref(payload) {
        const prefix = getUrlPrefix();
        return `${prefix}/${payload.actionPath || "action-" + payload.actionID}`;
    },
});

// Patch menu_helpers.computeAppsAndMenuItems result
// The href is generated in menu_helpers.js — we patch it via a service
// that rewrites hrefs after computation
export const urlPrefixService = {
    dependencies: ["menu"],
    start(env, { menu }) {
        const prefix = getUrlPrefix();
        if (prefix === '/odoo') {
            return; // No custom prefix, skip patching
        }

        // Intercept MENUS:APP-CHANGED to rewrite hrefs
        env.bus.addEventListener('MENUS:APP-CHANGED', () => {
            rewriteMenuLinks(prefix);
        });

        // Initial rewrite after page load
        queueMicrotask(() => rewriteMenuLinks(prefix));
    },
};

function rewriteMenuLinks(prefix) {
    // Rewrite all /odoo/ links in the DOM to use custom prefix
    document.querySelectorAll('a[href^="/odoo/"]').forEach(el => {
        el.href = el.href.replace(/\/odoo\//, `${prefix}/`);
    });
    document.querySelectorAll('a[href="/odoo"]').forEach(el => {
        el.href = prefix;
    });
}

registry.category("services").add("t4_url_prefix", urlPrefixService);
