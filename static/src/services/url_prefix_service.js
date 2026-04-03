import { patch } from "@web/core/utils/patch";
import { registry } from "@web/core/registry";
import { session } from "@web/session";
import { NavBar } from "@web/webclient/navbar/navbar";

/**
 * URL Prefix Service: replaces /odoo/ with custom prefix in generated URLs.
 * /odoo/ routes still work (server rewrites custom→odoo), but UI shows custom prefix.
 */

function getUrlPrefix() {
    const prefix = session.t4_url_prefix;
    if (prefix) {
        const clean = prefix.replace(/^\/|\/$/g, '');
        if (clean) {
            return `/${clean}`;
        }
    }
    return '/odoo';
}

const URL_PREFIX = getUrlPrefix();

if (URL_PREFIX !== '/odoo') {
    // Patch NavBar.getMenuItemHref to use custom prefix
    patch(NavBar.prototype, {
        getMenuItemHref(payload) {
            return `${URL_PREFIX}/${payload.actionPath || "action-" + payload.actionID}`;
        },
    });
}

export const urlPrefixService = {
    dependencies: [],
    start(env) {
        if (URL_PREFIX === '/odoo') {
            return;
        }

        // Rewrite /odoo/ links in DOM continuously
        const rewrite = () => {
            document.querySelectorAll('a[href^="/odoo/"]').forEach(el => {
                el.setAttribute('href', el.getAttribute('href').replace(/^\/odoo\//, `${URL_PREFIX}/`));
            });
            document.querySelectorAll('a[href="/odoo"]').forEach(el => {
                el.setAttribute('href', URL_PREFIX);
            });
        };

        // Observe DOM changes for new links
        const observer = new MutationObserver(rewrite);
        observer.observe(document.body, { childList: true, subtree: true });

        // Also rewrite on navigation
        env.bus.addEventListener('MENUS:APP-CHANGED', rewrite);

        return { prefix: URL_PREFIX };
    },
};

registry.category("services").add("t4_url_prefix", urlPrefixService);
