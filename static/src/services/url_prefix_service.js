import { patch } from "@web/core/utils/patch";
import { registry } from "@web/core/registry";
import { session } from "@web/session";
import { browser } from "@web/core/browser/browser";
import { NavBar } from "@web/webclient/navbar/navbar";

/**
 * URL Prefix Service: replaces /odoo/ with custom prefix everywhere.
 *
 * Three layers:
 * 1. history.pushState/replaceState interception — rewrites /odoo → /{prefix}
 * 2. NavBar.getMenuItemHref patch — generates correct menu links
 * 3. MutationObserver — rewrites stale /odoo hrefs in DOM
 */

function getUrlPrefix() {
    const prefix = session.t4_url_prefix;
    if (prefix) {
        const clean = prefix.replace(/^\/|\/$/g, "");
        if (clean) {
            return `/${clean}`;
        }
    }
    return "/odoo";
}

const URL_PREFIX = getUrlPrefix();

// ── Layer 0: Prefix mismatch safety net ──────────────────────
// If URL has an old/wrong prefix (e.g. /test/ but session says /hqg/),
// redirect immediately before the app renders.
const KNOWN_PREFIXES = ["web", "odoo", "scoped_app"];
if (URL_PREFIX !== "/odoo") {
    const pathParts = browser.location.pathname.split("/").filter(Boolean);
    const currentPrefix = pathParts[0] || "";
    const expectedPrefix = URL_PREFIX.replace(/^\//, "");
    if (
        currentPrefix &&
        currentPrefix !== expectedPrefix &&
        !KNOWN_PREFIXES.includes(currentPrefix)
    ) {
        const rest = pathParts.slice(1).join("/");
        const newPath = `${URL_PREFIX}${rest ? "/" + rest : ""}`;
        const newUrl = newPath + browser.location.search + browser.location.hash;
        browser.location.replace(newUrl);
    }
}

// ── Layer 1: History API interception ──────────────────────────
// Catches ALL URL changes from router.js (stateToUrl → pushState/replaceState)
if (URL_PREFIX !== "/odoo") {
    const _pushState = browser.history.pushState.bind(browser.history);
    const _replaceState = browser.history.replaceState.bind(browser.history);

    function rewriteUrl(url) {
        if (typeof url === "string" && url.includes("/odoo")) {
            return url.replace(/\/odoo(?=\/|$|\?|#)/g, URL_PREFIX);
        }
        return url;
    }

    browser.history.pushState = (state, title, url) =>
        _pushState(state, title, rewriteUrl(url));
    browser.history.replaceState = (state, title, url) =>
        _replaceState(state, title, rewriteUrl(url));

    // Also rewrite the initial URL if it somehow ended up as /odoo
    if (browser.location.pathname.startsWith("/odoo")) {
        const newPath = browser.location.pathname.replace(
            /\/odoo(?=\/|$)/,
            URL_PREFIX,
        );
        const newUrl = newPath + browser.location.search + browser.location.hash;
        _replaceState(history.state, "", newUrl);
    }
}

// ── Layer 2: NavBar menu link patch ───────────────────────────
if (URL_PREFIX !== "/odoo") {
    patch(NavBar.prototype, {
        getMenuItemHref(payload) {
            return `${URL_PREFIX}/${payload.actionPath || "action-" + payload.actionID}`;
        },
    });
}

// ── Layer 3: Service with DOM observer ────────────────────────
export const urlPrefixService = {
    dependencies: [],
    start(env) {
        if (URL_PREFIX === "/odoo") {
            return;
        }

        const rewrite = () => {
            document.querySelectorAll('a[href^="/odoo/"]').forEach((el) => {
                el.setAttribute(
                    "href",
                    el.getAttribute("href").replace(/^\/odoo\//, `${URL_PREFIX}/`),
                );
            });
            document.querySelectorAll('a[href="/odoo"]').forEach((el) => {
                el.setAttribute("href", URL_PREFIX);
            });
        };

        const observer = new MutationObserver(rewrite);
        observer.observe(document.body, { childList: true, subtree: true });
        env.bus.addEventListener("MENUS:APP-CHANGED", rewrite);

        return { prefix: URL_PREFIX };
    },
};

registry.category("services").add("t4_url_prefix", urlPrefixService);
