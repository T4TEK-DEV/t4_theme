/** @odoo-module **/

import { browser } from "@web/core/browser/browser";
import { registry } from "@web/core/registry";
import { cookie } from "@web/core/browser/cookie";
import { user } from "@web/core/user";
import { reactive } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

/**
 * T4 Theme Service
 *
 * Manages per-company theme configuration:
 * - Fetches config from backend on startup
 * - Sets CSS custom properties on :root
 * - Listens for company switch → re-applies theme
 * - Sets color_scheme cookie for Odoo core compatibility
 * - Handles "auto" scheme via OS prefers-color-scheme
 */

const T4_COOKIE_NAME = "color_scheme";

const DEFAULT_CONFIG = {
    color_scheme: "light",
    primary_color: "#714B67",
    secondary_color: "#8f8f8f",
    accent_color: "#00A09D",
    font_family: "inherit",
    sidebar_style: "full",
    css_vars: {},
    is_active: false,
};

export const t4ThemeService = {
    dependencies: [],

    start(env) {
        const state = reactive({ ...DEFAULT_CONFIG, loading: true });

        let currentCompanyId = user.activeCompanies?.[0]?.id || user.defaultCompany?.id;
        let mediaQuery = null;

        // --- Core: fetch config from backend ---
        async function fetchConfig(companyId) {
            try {
                const config = await rpc("/t4/theme/config", {
                    company_id: companyId,
                });
                return config || DEFAULT_CONFIG;
            } catch (err) {
                console.warn("[t4_theme] Failed to fetch config:", err);
                return DEFAULT_CONFIG;
            }
        }

        // --- Resolve effective scheme (handle "auto") ---
        function resolveScheme(configScheme) {
            if (configScheme === "auto") {
                const prefersDark = browser.matchMedia?.(
                    "(prefers-color-scheme: dark)"
                )?.matches;
                return prefersDark ? "dark" : "light";
            }
            return configScheme || "light";
        }

        // --- Apply CSS custom properties to :root ---
        function applyCssVars(cssVars) {
            const root = document.documentElement;
            for (const [prop, value] of Object.entries(cssVars)) {
                if (value) {
                    root.style.setProperty(prop, value);
                }
            }
        }

        // --- Set color_scheme cookie for Odoo core compat ---
        function setColorSchemeCookie(scheme) {
            const effective = resolveScheme(scheme);
            cookie.set(T4_COOKIE_NAME, effective, 365 * 24 * 60 * 60, "optional");
        }

        // --- Apply sidebar style as data attribute ---
        function applySidebarStyle(style) {
            document.body.dataset.t4Sidebar = style || "full";
        }

        // --- Main apply function ---
        function applyConfig(config) {
            Object.assign(state, config, { loading: false });

            const effectiveScheme = resolveScheme(config.color_scheme);
            setColorSchemeCookie(config.color_scheme);

            // Set scheme on html element for CSS selectors
            document.documentElement.dataset.t4ColorScheme = effectiveScheme;

            // Apply CSS custom properties
            if (config.css_vars && typeof config.css_vars === "object") {
                applyCssVars(config.css_vars);
            }

            applySidebarStyle(config.sidebar_style);
        }

        // --- Listen for OS color scheme changes (for "auto" mode) ---
        function setupAutoListener(configScheme) {
            if (mediaQuery) {
                mediaQuery.removeEventListener("change", onMediaChange);
                mediaQuery = null;
            }
            if (configScheme === "auto" && browser.matchMedia) {
                mediaQuery = browser.matchMedia("(prefers-color-scheme: dark)");
                mediaQuery.addEventListener("change", onMediaChange);
            }
        }

        function onMediaChange() {
            if (state.color_scheme === "auto") {
                const effective = resolveScheme("auto");
                setColorSchemeCookie("auto");
                document.documentElement.dataset.t4ColorScheme = effective;
            }
        }

        // --- Init: fetch and apply on startup ---
        async function init() {
            if (currentCompanyId) {
                const config = await fetchConfig(currentCompanyId);
                applyConfig(config);
                setupAutoListener(config.color_scheme);
            }
        }

        init();

        // --- Listen for company switch (page reload in Odoo 19) ---
        // Odoo 19 reloads the page on company switch, so init() handles it.
        // But we also listen in case future versions support hot-switch.
        env.bus?.addEventListener?.("COMPANY-CHANGED", async () => {
            const newCompanyId = user.activeCompanies?.[0]?.id;
            if (newCompanyId && newCompanyId !== currentCompanyId) {
                currentCompanyId = newCompanyId;
                state.loading = true;
                const config = await fetchConfig(newCompanyId);
                applyConfig(config);
                setupAutoListener(config.color_scheme);
            }
        });

        return state;
    },
};

registry.category("services").add("t4_theme", t4ThemeService);
