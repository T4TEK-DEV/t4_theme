/** @odoo-module **/

import { Component, useState, useRef, onMounted, onWillUnmount } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";
import { cookie } from "@web/core/browser/cookie";
import { browser } from "@web/core/browser/browser";
import { session } from "@web/session";

/**
 * T4 Theme Panel — Floating real-time theme configurator.
 *
 * Changes are applied instantly via CSS custom properties.
 * User clicks Save to persist, or Cancel to revert.
 */

const COLOR_SCHEME_OPTIONS = [
    { value: "light", label: "Light", icon: "fa-sun-o" },
    { value: "dark", label: "Dark", icon: "fa-moon-o" },
    { value: "auto", label: "Auto", icon: "fa-desktop" },
];

const FONT_OPTIONS = [
    { value: "inherit", label: "System Default" },
    { value: "inter", label: "Inter" },
    { value: "roboto", label: "Roboto" },
    { value: "open_sans", label: "Open Sans" },
    { value: "lato", label: "Lato" },
    { value: "source_sans", label: "Source Sans 3" },
    { value: "noto_sans", label: "Noto Sans" },
];

const SIDEBAR_OPTIONS = [
    { value: "full", label: "Full", icon: "fa-columns" },
    { value: "collapsed", label: "Collapsed", icon: "fa-align-left" },
    { value: "auto_hide", label: "Auto-hide", icon: "fa-arrows-h" },
];

const FONT_CSS_MAP = {
    inherit: "inherit",
    inter: '"Inter", sans-serif',
    roboto: '"Roboto", sans-serif',
    open_sans: '"Open Sans", sans-serif',
    lato: '"Lato", sans-serif',
    source_sans: '"Source Sans 3", sans-serif',
    noto_sans: '"Noto Sans", sans-serif',
};

// Map our vars to Bootstrap vars for maximum effect
const BOOTSTRAP_COLOR_MAP = {
    primary_color: ["--t4-primary", "--bs-primary"],
    secondary_color: ["--t4-secondary", "--bs-secondary"],
    accent_color: ["--t4-accent"],
};

export class T4ThemePanel extends Component {
    static template = "t4_theme.ThemePanel";
    static props = { onClose: { type: Function } };

    setup() {
        this.panelRef = useRef("panel");
        this.colorSchemeOptions = COLOR_SCHEME_OPTIONS;
        this.fontOptions = FONT_OPTIONS;
        this.sidebarOptions = SIDEBAR_OPTIONS;

        // Saved state (for revert on cancel)
        this.savedConfig = null;

        // Editable state
        this.state = useState({
            color_scheme: "light",
            primary_color: "#714B67",
            secondary_color: "#8f8f8f",
            accent_color: "#00A09D",
            font_family: "inherit",
            sidebar_style: "full",
            dirty: false,
            saving: false,
            presets: [],
        });

        onMounted(() => {
            this._loadConfig();
            this._loadPresets();
            document.addEventListener("click", this._onClickOutside);
        });

        onWillUnmount(() => {
            document.removeEventListener("click", this._onClickOutside);
        });
    }

    // --- Data Loading ---

    async _loadConfig() {
        // Try session_info first, then fallback to RPC
        const t4Data = session.t4_theme;
        if (t4Data && t4Data.config) {
            this._applyToState(t4Data.config);
            this.savedConfig = { ...this.state };
            this.savedConfig.dirty = false;
            return;
        }
        try {
            const config = await rpc("/t4/theme/config", {});
            if (config) {
                this._applyToState(config);
                this.savedConfig = { ...this.state };
                this.savedConfig.dirty = false;
            }
        } catch {
            // Use defaults
        }
    }

    async _loadPresets() {
        // Try session_info first, then fallback to RPC
        const t4Data = session.t4_theme;
        if (t4Data && t4Data.presets) {
            this.state.presets = t4Data.presets;
            return;
        }
        try {
            const presets = await rpc("/t4/theme/presets", {});
            this.state.presets = presets || [];
        } catch {
            this.state.presets = [];
        }
    }

    _applyToState(config) {
        this.state.color_scheme = config.color_scheme || "light";
        this.state.primary_color = config.primary_color || "#714B67";
        this.state.secondary_color = config.secondary_color || "#8f8f8f";
        this.state.accent_color = config.accent_color || "#00A09D";
        this.state.font_family = config.font_family || "inherit";
        this.state.sidebar_style = config.sidebar_style || "full";
        this.state.dirty = false;
    }

    // --- Live Preview (instant CSS updates) ---

    _applyLive() {
        const root = document.documentElement;

        // Colors → CSS vars (both t4 and Bootstrap)
        for (const [field, cssVars] of Object.entries(BOOTSTRAP_COLOR_MAP)) {
            const value = this.state[field];
            if (value) {
                for (const cssVar of cssVars) {
                    root.style.setProperty(cssVar, value);
                    // Also set RGB variant for Bootstrap opacity support
                    const rgb = this._hexToRgb(value);
                    if (rgb) {
                        root.style.setProperty(`${cssVar}-rgb`, `${rgb.r}, ${rgb.g}, ${rgb.b}`);
                    }
                }
            }
        }

        // Font
        const fontCss = FONT_CSS_MAP[this.state.font_family] || "inherit";
        root.style.setProperty("--t4-font-family", fontCss);
        document.body.style.fontFamily = fontCss;

        // Sidebar
        document.body.dataset.t4Sidebar = this.state.sidebar_style || "full";

        // Color scheme
        const effective = this._resolveScheme(this.state.color_scheme);
        root.dataset.t4ColorScheme = effective;
        cookie.set("color_scheme", effective, 365 * 24 * 60 * 60);

        // Navbar bg
        root.style.setProperty("--t4-navbar-bg", this.state.primary_color);
    }

    _hexToRgb(hex) {
        if (!hex) return null;
        const clean = hex.replace("#", "");
        if (clean.length !== 6) return null;
        return {
            r: parseInt(clean.substring(0, 2), 16),
            g: parseInt(clean.substring(2, 4), 16),
            b: parseInt(clean.substring(4, 6), 16),
        };
    }

    _resolveScheme(scheme) {
        if (scheme === "auto") {
            return browser.matchMedia?.("(prefers-color-scheme: dark)")?.matches
                ? "dark"
                : "light";
        }
        return scheme || "light";
    }

    // --- User Actions ---

    onColorSchemeChange(value) {
        this.state.color_scheme = value;
        this.state.dirty = true;
        // Color scheme changes require reload (different CSS bundles),
        // so we only update the state here. Actual switch happens on Save.
    }

    onColorChange(field, ev) {
        this.state[field] = ev.target.value;
        this.state.dirty = true;
        this._applyLive();
    }

    onFontChange(ev) {
        this.state.font_family = ev.target.value;
        this.state.dirty = true;
        this._applyLive();
    }

    onSidebarChange(value) {
        this.state.sidebar_style = value;
        this.state.dirty = true;
        this._applyLive();
    }

    async onPresetClick(preset) {
        this.state.color_scheme = preset.color_scheme || "light";
        this.state.primary_color = preset.primary_color || "#714B67";
        this.state.secondary_color = preset.secondary_color || "#8f8f8f";
        this.state.accent_color = preset.accent_color || "#00A09D";
        this.state.font_family = preset.font_family || "inherit";
        this.state.sidebar_style = preset.sidebar_style || "full";
        this.state.dirty = true;
        this._applyLive();
    }

    async onSave() {
        this.state.saving = true;
        const schemeChanged =
            this.savedConfig && this.savedConfig.color_scheme !== this.state.color_scheme;
        try {
            await rpc("/t4/theme/config/save", {
                config: {
                    color_scheme: this.state.color_scheme,
                    primary_color: this.state.primary_color,
                    secondary_color: this.state.secondary_color,
                    accent_color: this.state.accent_color,
                    font_family: this.state.font_family,
                    sidebar_style: this.state.sidebar_style,
                },
            });
            // If color scheme changed (light↔dark), must reload to swap CSS bundles
            if (schemeChanged) {
                const effective = this._resolveScheme(this.state.color_scheme);
                cookie.set("color_scheme", effective, 365 * 24 * 60 * 60);
                browser.location.reload();
                return;
            }
            this.savedConfig = { ...this.state };
            this.savedConfig.dirty = false;
            this.state.dirty = false;
        } catch (err) {
            console.warn("[t4_theme] Save failed:", err);
        } finally {
            this.state.saving = false;
        }
    }

    onCancel() {
        if (this.savedConfig) {
            this._applyToState(this.savedConfig);
            this._applyLive();
        }
        this.props.onClose();
    }

    onReset() {
        this.state.color_scheme = "light";
        this.state.primary_color = "#714B67";
        this.state.secondary_color = "#8f8f8f";
        this.state.accent_color = "#00A09D";
        this.state.font_family = "inherit";
        this.state.sidebar_style = "full";
        this.state.dirty = true;
        this._applyLive();
    }

    // --- Click Outside ---

    _onClickOutside = (ev) => {
        if (this.panelRef.el && !this.panelRef.el.contains(ev.target)) {
            const systrayBtn = ev.target.closest(".t4_theme_systray");
            if (!systrayBtn) {
                this.props.onClose();
            }
        }
    };
}
