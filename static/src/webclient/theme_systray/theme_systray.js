import { Component, useState, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { cookie } from "@web/core/browser/cookie";
import { browser } from "@web/core/browser/browser";
import { user } from "@web/core/user";
import { session } from "@web/session";
import { _t } from "@web/core/l10n/translation";

const THEME_PRESETS = [
    { key: "default", label: _t("Default"), color: "#5D8DA8" },
    { key: "hqg", label: _t("HQG Blue"), color: "#007ad1" },
    { key: "ocean", label: _t("Ocean"), color: "#0EA5E9" },
    { key: "forest", label: _t("Forest"), color: "#16A34A" },
    { key: "sunset", label: _t("Sunset"), color: "#EA580C" },
    { key: "slate", label: _t("Slate"), color: "#6366F1" },
];

const SIDEBAR_OPTIONS = [
    { key: "large", label: _t("Large") },
    { key: "small", label: _t("Small") },
    { key: "invisible", label: _t("Hidden") },
];

const CHATTER_OPTIONS = [
    { key: "side", label: _t("Side") },
    { key: "bottom", label: _t("Bottom") },
];

const DIALOG_OPTIONS = [
    { key: "minimize", label: _t("Normal") },
    { key: "maximize", label: _t("Fullscreen") },
];

export class ThemeSystray extends Component {
    static template = "t4_theme.ThemeSystray";
    static props = {};

    setup() {
        this.orm = useService("orm");
        this.ui = useService("ui");
        this.panelRef = useRef("panel");
        this.state = useState({
            open: false,
            darkMode: cookie.get("color_scheme") === "dark",
            chatterPosition: session.chatter_position || "side",
            dialogSize: session.dialog_size || "minimize",
            sidebarType: "large",
            currentPreset: user.activeCompany?.theme_preset || "default",
            // Colors
            colorBrand: user.activeCompany?.theme_colors?.color_brand || "#243742",
            colorPrimary: user.activeCompany?.theme_colors?.color_primary || "#5D8DA8",
            colorSuccess: user.activeCompany?.theme_colors?.color_success || "#28A745",
            colorInfo: user.activeCompany?.theme_colors?.color_info || "#17A2B8",
            colorWarning: user.activeCompany?.theme_colors?.color_warning || "#FFAC00",
            colorDanger: user.activeCompany?.theme_colors?.color_danger || "#DC3545",
            colorAppbarBg: user.activeCompany?.theme_colors?.color_appbar_background || "#111827",
            colorAppbarText: user.activeCompany?.theme_colors?.color_appbar_text || "#DEE2E6",
            colorAppbarActive: user.activeCompany?.theme_colors?.color_appbar_active || "#5D8DA8",
            colorAppsmenuText: user.activeCompany?.theme_colors?.color_appsmenu_text || "#F8F9FA",
        });
    }

    get presets() {
        return THEME_PRESETS;
    }
    get sidebarOptions() {
        return SIDEBAR_OPTIONS;
    }
    get chatterOptions() {
        return CHATTER_OPTIONS;
    }
    get dialogOptions() {
        return DIALOG_OPTIONS;
    }

    togglePanel() {
        this.state.open = !this.state.open;
    }

    closePanel() {
        this.state.open = false;
    }

    onClickBackdrop() {
        this.closePanel();
    }

    // --- Dark Mode ---
    async onToggleDarkMode() {
        const scheme = this.state.darkMode ? "light" : "dark";
        cookie.set("color_scheme", scheme);
        await this.orm.write("res.users", [user.userId], {
            dark_mode: scheme === "dark",
        });
        this.ui.block();
        browser.location.reload();
    }

    // --- Theme Preset ---
    async onSelectPreset(preset) {
        const companyId = user.activeCompany.id;
        await this.orm.call("res.company", "write", [[companyId], {
            theme_preset: preset,
        }]);
        await this.orm.call("res.company", "action_apply_theme_preset", [[companyId]]);
        this.ui.block();
        browser.location.reload();
    }

    // --- User Preferences ---
    async onSelectSidebar(value) {
        await this.orm.write("res.users", [user.userId], { sidebar_type: value });
        this.state.sidebarType = value;
        this.ui.block();
        browser.location.reload();
    }

    async onSelectChatter(value) {
        await this.orm.write("res.users", [user.userId], { chatter_position: value });
        this.state.chatterPosition = value;
        this.ui.block();
        browser.location.reload();
    }

    async onSelectDialog(value) {
        await this.orm.write("res.users", [user.userId], { dialog_size: value });
        this.state.dialogSize = value;
        this.ui.block();
        browser.location.reload();
    }

    // --- Individual Color Change ---
    async onColorChange(field, ev) {
        const value = ev.target.value;
        const companyId = user.activeCompany.id;
        await this.orm.call("res.company", "write", [[companyId], {
            [`theme_color_${field}`]: value,
        }]);
        // Apply CSS variable immediately
        const cssVarMap = {
            brand: '--t4-color-brand',
            primary: '--t4-color-primary',
            success: '--t4-color-success',
            info: '--t4-color-info',
            warning: '--t4-color-warning',
            danger: '--t4-color-danger',
            appbar_background: '--t4-color-appbar-background',
            appbar_text: '--t4-color-appbar-text',
            appbar_active: '--t4-color-appbar-active',
            appsmenu_text: '--t4-color-appsmenu-text',
        };
        if (cssVarMap[field]) {
            document.documentElement.style.setProperty(cssVarMap[field], value);
        }
    }
}

registry.category("systray").add("t4_theme.theme_systray", {
    Component: ThemeSystray,
}, { sequence: 50 });
