import { registry } from "@web/core/registry";
import { user } from "@web/core/user";

const CSS_VAR_MAP = {
    color_brand: '--t4-color-brand',
    color_primary: '--t4-color-primary',
    color_success: '--t4-color-success',
    color_info: '--t4-color-info',
    color_warning: '--t4-color-warning',
    color_danger: '--t4-color-danger',
    color_appsmenu_text: '--t4-color-appsmenu-text',
    color_appbar_text: '--t4-color-appbar-text',
    color_appbar_active: '--t4-color-appbar-active',
    color_appbar_background: '--t4-color-appbar-background',
};

function applyThemeColors(colors) {
    const root = document.documentElement;
    if (!colors) {
        return;
    }
    for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
        const value = colors[key];
        if (value) {
            root.style.setProperty(cssVar, value);
        }
    }
}

function getActiveCompanyColors() {
    const activeCompany = user.activeCompany;
    return activeCompany?.theme_colors || null;
}

export const themeColorService = {
    dependencies: [],
    start(env) {
        applyThemeColors(getActiveCompanyColors());
        env.bus.addEventListener('MENUS:APP-CHANGED', () => {
            applyThemeColors(getActiveCompanyColors());
        });
    },
};

registry.category("services").add("t4_theme.colors", themeColorService);
