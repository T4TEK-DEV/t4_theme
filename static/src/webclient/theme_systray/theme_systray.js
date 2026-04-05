import { Component, useState, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useBus, useService } from "@web/core/utils/hooks";
import { rpc } from '@web/core/network/rpc';
import { cookie } from "@web/core/browser/cookie";
import { browser } from "@web/core/browser/browser";
import { user } from "@web/core/user";
import { session } from "@web/session";
import { _t } from "@web/core/l10n/translation";
import {
    FONT_FAMILY_MAP_EXPORT as FONT_FAMILY_MAP,
    GOOGLE_FONT_MAP_EXPORT as GOOGLE_FONT_MAP,
} from "@t4_theme/services/theme_color_service";

const SIDEBAR_OPTIONS = [
    { key: "large", label: _t("Hiện"), icon: "fa-bars" },
    { key: "invisible", label: _t("Ẩn"), icon: "fa-times" },
];

const CHATTER_OPTIONS = [
    { key: "side", label: _t("Bên cạnh") },
    { key: "bottom", label: _t("Phía dưới") },
];

const DIALOG_OPTIONS = [
    { key: "minimize", label: _t("Thu nhỏ") },
    { key: "maximize", label: _t("Toàn màn hình") },
];

const ICON_SHAPE_OPTIONS = [
    { key: "rounded_rect", label: _t("Bo tròn góc"), icon: "fa-square" },
    { key: "circle", label: _t("Hình tròn"), icon: "fa-circle" },
    { key: "square", label: _t("Vuông"), icon: "fa-stop" },
    { key: "squircle", label: _t("iOS Squircle"), icon: "fa-tablet" },
    { key: "hexagon", label: _t("Lục giác"), icon: "fa-hexagon" },
];

const FONT_OPTIONS = [
    // Sans-serif
    { key: "system", label: "Mặc định hệ thống", category: "system" },
    { key: "inter", label: "Inter", category: "sans" },
    { key: "roboto", label: "Roboto", category: "sans" },
    { key: "open_sans", label: "Open Sans", category: "sans" },
    { key: "lato", label: "Lato", category: "sans" },
    { key: "nunito", label: "Nunito", category: "sans" },
    { key: "poppins", label: "Poppins", category: "sans" },
    { key: "source_sans", label: "Source Sans 3", category: "sans" },
    { key: "montserrat", label: "Montserrat", category: "sans" },
    { key: "raleway", label: "Raleway", category: "sans" },
    { key: "ubuntu", label: "Ubuntu", category: "sans" },
    { key: "work_sans", label: "Work Sans", category: "sans" },
    { key: "dm_sans", label: "DM Sans", category: "sans" },
    { key: "quicksand", label: "Quicksand", category: "sans" },
    { key: "josefin_sans", label: "Josefin Sans", category: "sans" },
    { key: "cabin", label: "Cabin", category: "sans" },
    { key: "karla", label: "Karla", category: "sans" },
    { key: "fira_sans", label: "Fira Sans", category: "sans" },
    { key: "barlow", label: "Barlow", category: "sans" },
    { key: "mulish", label: "Mulish", category: "sans" },
    { key: "pt_sans", label: "PT Sans", category: "sans" },
    { key: "noto_sans", label: "Noto Sans", category: "sans" },
    { key: "ibm_plex", label: "IBM Plex Sans", category: "sans" },
    { key: "manrope", label: "Manrope", category: "sans" },
    { key: "space_grotesk", label: "Space Grotesk", category: "sans" },
    { key: "plus_jakarta", label: "Plus Jakarta Sans", category: "sans" },
    { key: "lexend", label: "Lexend", category: "sans" },
    { key: "geist", label: "Geist", category: "sans" },
    // Vietnamese popular
    { key: "be_vietnam_pro", label: "Be Vietnam Pro", category: "vi" },
    { key: "sarabun", label: "Sarabun", category: "vi" },
    // Serif
    { key: "times_new_roman", label: "Times New Roman", category: "serif" },
    { key: "georgia", label: "Georgia", category: "serif" },
    { key: "merriweather", label: "Merriweather", category: "serif" },
    { key: "playfair", label: "Playfair Display", category: "serif" },
    { key: "lora", label: "Lora", category: "serif" },
    { key: "libre_baskerville", label: "Libre Baskerville", category: "serif" },
    // Monospace
    { key: "courier_new", label: "Courier New", category: "mono" },
    { key: "jetbrains_mono", label: "JetBrains Mono", category: "mono" },
    { key: "fira_code", label: "Fira Code", category: "mono" },
];

const COLOR_CSS_MAP = {
    colorBrand: "--t4-color-brand",
    colorPrimary: "--t4-color-primary",
    colorSuccess: "--t4-color-success",
    colorInfo: "--t4-color-info",
    colorWarning: "--t4-color-warning",
    colorDanger: "--t4-color-danger",
    colorAppbarBg: "--t4-color-appbar-background",
    colorAppbarText: "--t4-color-appbar-text",
    colorAppbarActive: "--t4-color-appbar-active",
    colorAppsmenuText: "--t4-color-appsmenu-text",
};

const COLOR_FIELD_MAP = {
    colorBrand: "theme_color_brand",
    colorPrimary: "theme_color_primary",
    colorSuccess: "theme_color_success",
    colorInfo: "theme_color_info",
    colorWarning: "theme_color_warning",
    colorDanger: "theme_color_danger",
    colorAppbarBg: "theme_color_appbar_background",
    colorAppbarText: "theme_color_appbar_text",
    colorAppbarActive: "theme_color_appbar_active",
    colorAppsmenuText: "theme_color_appsmenu_text",
};

const SIDEBAR_CLASS_PREFIX = "mk_sidebar_type_";


function buildInitialState(company, colors) {
    return {
        currentPreset: company.theme_preset || "default",
        colorBrand: colors.color_brand || "#243742",
        colorPrimary: colors.color_primary || "#5D8DA8",
        colorSuccess: colors.color_success || "#28A745",
        colorInfo: colors.color_info || "#17A2B8",
        colorWarning: colors.color_warning || "#FFAC00",
        colorDanger: colors.color_danger || "#DC3545",
        colorAppbarBg: colors.color_appbar_background || "#111827",
        colorAppbarText: colors.color_appbar_text || "#DEE2E6",
        colorAppbarActive: colors.color_appbar_active || "#5D8DA8",
        colorAppsmenuText: colors.color_appsmenu_text || "#F8F9FA",
        sidebarType: session.sidebar_type || "large",
        chatterPosition: session.chatter_position || "side",
        dialogSize: session.dialog_size || "minimize",
        fontFamily: company.theme_font_family || "system",
        iconShape: company.theme_icon_shape || "rounded_rect",
        homeMenuOverlay: company.theme_home_menu_overlay !== false,
        brandName: company.t4_brand_name || "T4 ERP",
        webTitle: company.t4_web_title || "",
        urlPrefix: company.t4_url_prefix || "",
    };
}

// =========================================================================
// Component
// =========================================================================

export class ThemeSystray extends Component {
    static template = "t4_theme.ThemeSystray";
    static props = {};

    setup() {
        this.orm = useService("orm");
        this.ui = useService("ui");
        this.actionService = useService("action");
        this.hm = this.env.services.t4_home_menu || null;
        this.panelRef = useRef("panel");

        const company = user.activeCompany || {};
        const colors = company.theme_colors || {};

        this.original = buildInitialState(company, colors);

        this.state = useState({
            open: false,
            companyId: company.id,
            darkMode: cookie.get("color_scheme") === "dark",
            dirty: false,
            saving: false,
            needsReload: false,
            fontDropdownOpen: false,
            ...buildInitialState(company, colors),
            hasLogo: Boolean(company.has_appsbar_image),
            hasBackground: Boolean(company.has_background_image),
            hasFavicon: Boolean(company.has_favicon),
        });

        // Re-render when home menu edit mode or visibility changes
        useBus(this.env.bus, "HOME-MENU:EDIT-TOGGLED", () => this.render());
        useBus(this.env.bus, "HOME-MENU:TOGGLED", () => this.render());

        this.dirtyFields = new Set();

        this.state.presets = [];
        this.state.showCreatePreset = false;
        this.state.newPresetName = '';
        this.state.importing = false;

        this._loadPresets();
    }

    // =========================================================================
    // Getters
    // =========================================================================

    get presets() { return this.state.presets; }
    get sidebarOptions() { return SIDEBAR_OPTIONS; }
    get chatterOptions() { return CHATTER_OPTIONS; }
    get dialogOptions() { return DIALOG_OPTIONS; }
    get fontOptions() { return FONT_OPTIONS; }
    get iconShapeOptions() { return ICON_SHAPE_OPTIONS; }

    get selectedFontLabel() {
        const opt = FONT_OPTIONS.find(f => f.key === this.state.fontFamily);
        return opt ? opt.label : "Mặc định hệ thống";
    }

    get selectedFontStyle() {
        const stack = FONT_FAMILY_MAP[this.state.fontFamily];
        return stack ? `font-family: ${stack}` : "";
    }

    fontStyle(key) {
        const stack = FONT_FAMILY_MAP[key];
        return stack ? `font-family: ${stack}` : "";
    }

    togglePanel() { this.state.open = !this.state.open; }
    closePanel() { this.state.open = false; }

    toggleFontDropdown() {
        this.state.fontDropdownOpen = !this.state.fontDropdownOpen;
        // Preload all fonts for preview when dropdown opens
        if (this.state.fontDropdownOpen) {
            for (const opt of FONT_OPTIONS) {
                if (opt.key !== "system") {
                    this._preloadFont(opt.key);
                }
            }
        }
    }

    _preloadFont(fontKey) {
        const spec = GOOGLE_FONT_MAP[fontKey];
        if (!spec) return;
        const linkId = `t4-google-font-${fontKey}`;
        if (document.getElementById(linkId)) return;
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
        document.head.appendChild(link);
    }

    // =========================================================================
    // Live Preview Helpers
    // =========================================================================

    _markDirty(field) {
        this.dirtyFields.add(field);
        this.state.dirty = true;
    }

    _applyColorPreview(stateKey, value) {
        const cssVar = COLOR_CSS_MAP[stateKey];
        if (cssVar) {
            document.documentElement.style.setProperty(cssVar, value);
        }
    }

    _applyAllColorPreview() {
        for (const key of Object.keys(COLOR_CSS_MAP)) {
            this._applyColorPreview(key, this.state[key]);
        }
    }

    _applyFontPreview(fontKey) {
        const root = document.documentElement;
        if (fontKey !== "system") {
            this._preloadFont(fontKey);
        }
        const fontStack = FONT_FAMILY_MAP[fontKey] || FONT_FAMILY_MAP.system;
        root.style.setProperty("--t4-font-family", fontStack);
    }

    _applyIconShapePreview(value) {
        const root = document.documentElement;
        const shapes = ['rounded_rect', 'circle', 'square', 'squircle', 'hexagon'];
        for (const s of shapes) {
            root.classList.remove('t4-icon-shape-' + s);
        }
        root.classList.add('t4-icon-shape-' + value);
    }

    _applySidebarPreview(value) {
        const body = document.body;
        for (const opt of SIDEBAR_OPTIONS) {
            body.classList.remove(`${SIDEBAR_CLASS_PREFIX}${opt.key}`);
        }
        body.classList.add(`${SIDEBAR_CLASS_PREFIX}${value}`);
        document.dispatchEvent(
            new CustomEvent("t4:sidebar-preview", { detail: { type: value } })
        );
    }

    _revertPreview() {
        for (const key of Object.keys(COLOR_CSS_MAP)) {
            this._applyColorPreview(key, this.original[key]);
        }
        this._applySidebarPreview(this.original.sidebarType);
        this._applyFontPreview(this.original.fontFamily);
        this._applyIconShapePreview(this.original.iconShape);
        document.title = this.original.webTitle || "Odoo";
        Object.assign(this.state, { ...this.original });
        this.state.dirty = false;
        this.state.needsReload = false;
        this.dirtyFields.clear();
    }

    // =========================================================================
    // Dark Mode (immediate)
    // =========================================================================

    async onToggleDarkMode() {
        const scheme = this.state.darkMode ? "light" : "dark";
        cookie.set("color_scheme", scheme);
        await this.orm.write("res.users", [user.userId], {
            dark_mode: scheme === "dark",
        });
        this.ui.block();
        browser.location.reload();
    }

    // =========================================================================
    // Preview-only handlers
    // =========================================================================

    async _loadPresets() {
        try {
            const presets = await rpc('/t4_theme/presets');
            this.state.presets = presets;
        } catch (e) {
            console.error('Failed to load presets:', e);
        }
    }

    onSelectPreset(preset) {
        // preset is an object from DB: { id, name, color_brand, color_primary, ... }
        this.state.currentPreset = preset.id;
        this.state.colorBrand = preset.color_brand;
        this.state.colorPrimary = preset.color_primary;
        this.state.colorSuccess = preset.color_success;
        this.state.colorInfo = preset.color_info;
        this.state.colorWarning = preset.color_warning;
        this.state.colorDanger = preset.color_danger;
        this.state.colorAppsmenuText = preset.color_appsmenu_text;
        this.state.colorAppbarText = preset.color_appbar_text;
        this.state.colorAppbarActive = preset.color_appbar_active;
        this.state.colorAppbarBg = preset.color_appbar_background;
        this._applyAllColorPreview();
        this._markDirty("preset");
        for (const key of Object.keys(COLOR_FIELD_MAP)) {
            this._markDirty(key);
        }
        // If preset has font, apply it too
        if (preset.font_family && preset.font_family !== 'system') {
            this.state.fontFamily = preset.font_family;
            this._applyFontPreview(preset.font_family);
            this._markDirty("fontFamily");
        }
    }

    onSelectSidebar(value) {
        this.state.sidebarType = value;
        this._applySidebarPreview(value);
        this._markDirty("sidebarType");
        const sidebarMap = {
            large: { mode: "large", visible: true, width: 200 },
            invisible: { mode: "hidden", visible: false, width: 200 },
        };
        try {
            localStorage.setItem("t4_sidebar", JSON.stringify(sidebarMap[value]));
        } catch {}
    }

    onSelectChatter(value) {
        this.state.chatterPosition = value;
        this._markDirty("chatterPosition");
        this.state.needsReload = true;
    }

    onSelectDialog(value) {
        this.state.dialogSize = value;
        this._markDirty("dialogSize");
        this.state.needsReload = true;
    }

    onSelectFont(value) {
        this.state.fontFamily = value;
        this.state.fontDropdownOpen = false;
        this._applyFontPreview(value);
        this._markDirty("fontFamily");
    }

    onSelectIconShape(value) {
        this.state.iconShape = value;
        this._applyIconShapePreview(value);
        this._markDirty("iconShape");
    }

    onColorChange(stateKey, ev) {
        const value = ev.target.value;
        this.state[stateKey] = value;
        this._applyColorPreview(stateKey, value);
        this._markDirty(stateKey);
    }

    onToggleHomeMenuOverlay() {
        this.state.homeMenuOverlay = !this.state.homeMenuOverlay;
        this._markDirty("homeMenuOverlay");
        this.state.needsReload = true;
    }

    onChangeUrlPrefix(ev) {
        const value = ev.target.value.replace(/[^a-zA-Z0-9_-]/g, "");
        this.state.urlPrefix = value;
        this._markDirty("urlPrefix");
        this.state.needsReload = true;
    }

    onChangeBrandName(ev) {
        this.state.brandName = ev.target.value;
        this._markDirty("brandName");
    }

    onChangeWebTitle(ev) {
        const value = ev.target.value;
        this.state.webTitle = value;
        document.title = value || "Odoo";
        this._markDirty("webTitle");
    }

    // =========================================================================
    // Image Upload / Remove (immediate)
    // =========================================================================

    async onUploadImage(field, ev) {
        const file = ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result.split(",")[1];
            await this.orm.call("res.company", "write", [
                [this.state.companyId], { [field]: base64 },
            ]);
            if (field === "appbar_image") this.state.hasLogo = true;
            else if (field === "background_image") this.state.hasBackground = true;
            else if (field === "favicon") this.state.hasFavicon = true;
            this.ui.block();
            browser.location.reload();
        };
        reader.readAsDataURL(file);
    }

    async onRemoveImage(field) {
        await this.orm.call("res.company", "write", [
            [this.state.companyId], { [field]: false },
        ]);
        if (field === "appbar_image") this.state.hasLogo = false;
        else if (field === "background_image") this.state.hasBackground = false;
        else if (field === "favicon") this.state.hasFavicon = false;
        this.ui.block();
        browser.location.reload();
    }

    // =========================================================================
    // Reset to stock Odoo
    // =========================================================================

    async onResetToOdoo() {
        const companyId = this.state.companyId;
        await this.orm.call("res.company", "write", [[companyId], {
            theme_preset: "default",
            theme_font_family: "system",
            theme_icon_shape: "rounded_rect",
            theme_home_menu_overlay: true,
            theme_color_brand: "#714B67",
            theme_color_primary: "#714B67",
            theme_color_success: "#28A745",
            theme_color_info: "#17A2B8",
            theme_color_warning: "#FFAC00",
            theme_color_danger: "#DC3545",
            theme_color_appsmenu_text: "#FFFFFF",
            theme_color_appbar_text: "#FFFFFF",
            theme_color_appbar_active: "#714B67",
            theme_color_appbar_background: "#2C2C33",
            t4_brand_name: "",
            t4_web_title: "",
            theme_view_overrides: {},
        }]);
        await this.orm.write("res.users", [user.userId], {
            sidebar_type: "large",
            chatter_position: "bottom",
            dialog_size: "minimize",
        });
        localStorage.removeItem("t4_sidebar");
        this.ui.block();
        browser.location.reload();
    }

    // =========================================================================
    // Save & Reset
    // =========================================================================

    async onClickSave() {
        if (!this.state.dirty) return;
        this.state.saving = true;
        const companyId = this.state.companyId;

        try {
            const companyVals = {};
            // Preset is now saved via individual color fields, no need to save preset key
            for (const [stateKey, fieldName] of Object.entries(COLOR_FIELD_MAP)) {
                if (this.dirtyFields.has(stateKey)) {
                    companyVals[fieldName] = this.state[stateKey];
                }
            }
            if (this.dirtyFields.has("fontFamily")) {
                companyVals.theme_font_family = this.state.fontFamily;
            }
            if (this.dirtyFields.has("iconShape")) {
                companyVals.theme_icon_shape = this.state.iconShape;
            }
            if (this.dirtyFields.has("homeMenuOverlay")) {
                companyVals.theme_home_menu_overlay = this.state.homeMenuOverlay;
            }
            if (this.dirtyFields.has("urlPrefix")) {
                companyVals.t4_url_prefix = this.state.urlPrefix;
            }
            if (this.dirtyFields.has("brandName")) {
                companyVals.t4_brand_name = this.state.brandName;
            }
            if (this.dirtyFields.has("webTitle")) {
                companyVals.t4_web_title = this.state.webTitle;
            }

            const userVals = {};
            if (this.dirtyFields.has("sidebarType")) {
                userVals.sidebar_type = this.state.sidebarType;
            }
            if (this.dirtyFields.has("chatterPosition")) {
                userVals.chatter_position = this.state.chatterPosition;
            }
            if (this.dirtyFields.has("dialogSize")) {
                userVals.dialog_size = this.state.dialogSize;
            }

            const promises = [];
            if (Object.keys(companyVals).length) {
                promises.push(
                    this.orm.call("res.company", "write", [[companyId], companyVals])
                );
            }
            if (Object.keys(userVals).length) {
                promises.push(
                    this.orm.write("res.users", [user.userId], userVals)
                );
            }
            await Promise.all(promises);

            this.original = buildInitialState(
                {
                    theme_preset: this.state.currentPreset,
                    theme_font_family: this.state.fontFamily,
                    theme_icon_shape: this.state.iconShape,
                    theme_home_menu_overlay: this.state.homeMenuOverlay,
                    t4_brand_name: this.state.brandName,
                    t4_web_title: this.state.webTitle,
                    t4_url_prefix: this.state.urlPrefix,
                },
                {
                    color_brand: this.state.colorBrand,
                    color_primary: this.state.colorPrimary,
                    color_success: this.state.colorSuccess,
                    color_info: this.state.colorInfo,
                    color_warning: this.state.colorWarning,
                    color_danger: this.state.colorDanger,
                    color_appbar_background: this.state.colorAppbarBg,
                    color_appbar_text: this.state.colorAppbarText,
                    color_appbar_active: this.state.colorAppbarActive,
                    color_appsmenu_text: this.state.colorAppsmenuText,
                }
            );
            this.original.sidebarType = this.state.sidebarType;
            this.original.chatterPosition = this.state.chatterPosition;
            this.original.dialogSize = this.state.dialogSize;

            this.dirtyFields.clear();
            this.state.dirty = false;

            if (this.state.needsReload) {
                this.state.needsReload = false;
                this.ui.block();
                browser.location.reload();
            }
        } finally {
            this.state.saving = false;
        }
    }

    onClickReset() {
        this._revertPreview();
    }

    async onExportTheme() {
        try {
            const data = await rpc('/t4_theme/export_theme');
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (data.name || 'theme') + '.json';
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export failed:', e);
        }
    }

    onImportThemeClick() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (ev) => this._handleImportFile(ev);
        input.click();
    }

    async _handleImportFile(ev) {
        const file = ev.target.files[0];
        if (!file) return;
        this.state.importing = true;
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const result = await rpc('/t4_theme/import_theme', { theme_data: data });
            if (result.success) {
                await this._loadPresets();
            } else {
                alert(result.error || 'Import failed');
            }
        } catch (e) {
            console.error('Import failed:', e);
            alert('Tệp JSON không hợp lệ');
        } finally {
            this.state.importing = false;
        }
    }

    onShowCreatePreset() {
        this.state.showCreatePreset = true;
        this.state.newPresetName = '';
    }

    onCancelCreatePreset() {
        this.state.showCreatePreset = false;
        this.state.newPresetName = '';
    }

    async onSaveNewPreset() {
        const name = this.state.newPresetName.trim();
        if (!name) return;
        try {
            await rpc('/t4_theme/preset/save_current', { name });
            this.state.showCreatePreset = false;
            this.state.newPresetName = '';
            await this._loadPresets();
        } catch (e) {
            console.error('Create preset failed:', e);
        }
    }

    async onDeletePreset(presetId) {
        try {
            const result = await rpc('/t4_theme/preset/delete', { preset_id: presetId });
            if (result.success) {
                await this._loadPresets();
            }
        } catch (e) {
            console.error('Delete preset failed:', e);
        }
    }

    onNewPresetNameInput(ev) {
        this.state.newPresetName = ev.target.value;
    }

    onOpenThemeSettings() {
        this.state.open = false;
        document.dispatchEvent(new CustomEvent('t4:toggle-design-mode'));
    }

    onToggleHomeEdit() {
        if (this.hm) {
            this.hm.toggleEditMode();
        }
    }

    get isOnHomeMenu() {
        return this.hm ? this.hm.hasHomeMenu : false;
    }

    get isHomeEditMode() {
        return this.hm ? this.hm.editMode : false;
    }
}

registry.category("systray").add(
    "t4_theme.theme_systray",
    { Component: ThemeSystray },
    { sequence: 50 }
);
