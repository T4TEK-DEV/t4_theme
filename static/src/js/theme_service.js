/** @odoo-module **/

import { browser } from "@web/core/browser/browser";
import { registry } from "@web/core/registry";
import { cookie } from "@web/core/browser/cookie";
import { session } from "@web/session";
import { reactive } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

/**
 * T4 Theme Service
 *
 * Manages per-company theme configuration:
 * - Reads initial config from session_info (injected by ir.http)
 * - Sets CSS custom properties on :root
 * - Sets color_scheme cookie for Odoo core compatibility
 * - Handles "auto" scheme via OS prefers-color-scheme
 * - Falls back to RPC if session data is missing
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

        let mediaQuery = null;

        // --- Core: fetch config from backend (fallback) ---
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

        // --- Hex to RGB helper ---
        function hexToRgbStr(hex) {
            if (!hex) return null;
            const c = hex.replace("#", "");
            if (c.length !== 6) return null;
            return `${parseInt(c.substring(0, 2), 16)}, ${parseInt(c.substring(2, 4), 16)}, ${parseInt(c.substring(4, 6), 16)}`;
        }

        // --- Apply CSS custom properties to :root ---
        function applyCssVars(cssVars) {
            const root = document.documentElement;
            for (const [prop, value] of Object.entries(cssVars)) {
                if (value) {
                    root.style.setProperty(prop, value);
                    // Also set RGB variant for Bootstrap opacity support
                    if (prop === "--t4-primary" || prop === "--t4-accent") {
                        const rgb = hexToRgbStr(value);
                        if (rgb) {
                            root.style.setProperty(`${prop}-rgb`, rgb);
                            if (prop === "--t4-primary") {
                                root.style.setProperty("--bs-primary", value);
                                root.style.setProperty("--bs-primary-rgb", rgb);
                            }
                        }
                    }
                }
            }
        }

        // --- Set color_scheme cookie for Odoo core compat ---
        function setColorSchemeCookie(scheme) {
            const effective = resolveScheme(scheme);
            cookie.set(T4_COOKIE_NAME, effective, 365 * 24 * 60 * 60);
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

        // --- Init: use session_info data if available, else fetch via RPC ---
        async function init() {
            const t4Data = session.t4_theme;
            if (t4Data && t4Data.config) {
                applyConfig(t4Data.config);
                setupAutoListener(t4Data.config.color_scheme);
            } else {
                // Fallback: fetch via RPC (e.g. session_info not populated)
                try {
                    const config = await rpc("/t4/theme/config", {});
                    applyConfig(config || DEFAULT_CONFIG);
                    setupAutoListener((config || DEFAULT_CONFIG).color_scheme);
                } catch {
                    applyConfig(DEFAULT_CONFIG);
                }
            }
        }

        init();

        return {
            get state() {
                return state;
            },
            resolveScheme,
            applyConfig,
            fetchConfig,
        };
    },
};

registry.category("services").add("t4_theme", t4ThemeService);
