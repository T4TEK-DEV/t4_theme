import { registry } from "@web/core/registry";
import { user } from "@web/core/user";
import { session } from "@web/session";

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

const FONT_FAMILY_MAP = {
    system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    inter: '"Inter", sans-serif',
    roboto: '"Roboto", sans-serif',
    open_sans: '"Open Sans", sans-serif',
    lato: '"Lato", sans-serif',
    nunito: '"Nunito", sans-serif',
    poppins: '"Poppins", sans-serif',
    source_sans: '"Source Sans 3", sans-serif',
    montserrat: '"Montserrat", sans-serif',
    raleway: '"Raleway", sans-serif',
    ubuntu: '"Ubuntu", sans-serif',
    work_sans: '"Work Sans", sans-serif',
    dm_sans: '"DM Sans", sans-serif',
    quicksand: '"Quicksand", sans-serif',
    josefin_sans: '"Josefin Sans", sans-serif',
    cabin: '"Cabin", sans-serif',
    karla: '"Karla", sans-serif',
    fira_sans: '"Fira Sans", sans-serif',
    barlow: '"Barlow", sans-serif',
    mulish: '"Mulish", sans-serif',
    pt_sans: '"PT Sans", sans-serif',
    noto_sans: '"Noto Sans", sans-serif',
    ibm_plex: '"IBM Plex Sans", sans-serif',
    manrope: '"Manrope", sans-serif',
    space_grotesk: '"Space Grotesk", sans-serif',
    plus_jakarta: '"Plus Jakarta Sans", sans-serif',
    lexend: '"Lexend", sans-serif',
    geist: '"Geist", sans-serif',
    // Vietnamese popular
    be_vietnam_pro: '"Be Vietnam Pro", sans-serif',
    sarabun: '"Sarabun", sans-serif',
    // Serif
    times_new_roman: '"Times New Roman", Times, serif',
    georgia: 'Georgia, serif',
    merriweather: '"Merriweather", serif',
    playfair: '"Playfair Display", serif',
    lora: '"Lora", serif',
    libre_baskerville: '"Libre Baskerville", serif',
    // Monospace
    courier_new: '"Courier New", Courier, monospace',
    jetbrains_mono: '"JetBrains Mono", monospace',
    fira_code: '"Fira Code", monospace',
};

const GOOGLE_FONT_MAP = {
    inter: 'Inter:wght@300;400;500;600;700',
    roboto: 'Roboto:wght@300;400;500;700',
    open_sans: 'Open+Sans:wght@300;400;500;600;700',
    lato: 'Lato:wght@300;400;700',
    nunito: 'Nunito:wght@300;400;500;600;700',
    poppins: 'Poppins:wght@300;400;500;600;700',
    source_sans: 'Source+Sans+3:wght@300;400;500;600;700',
    montserrat: 'Montserrat:wght@300;400;500;600;700',
    raleway: 'Raleway:wght@300;400;500;600;700',
    ubuntu: 'Ubuntu:wght@300;400;500;700',
    work_sans: 'Work+Sans:wght@300;400;500;600;700',
    dm_sans: 'DM+Sans:wght@300;400;500;600;700',
    quicksand: 'Quicksand:wght@300;400;500;600;700',
    josefin_sans: 'Josefin+Sans:wght@300;400;500;600;700',
    cabin: 'Cabin:wght@400;500;600;700',
    karla: 'Karla:wght@300;400;500;600;700',
    fira_sans: 'Fira+Sans:wght@300;400;500;600;700',
    barlow: 'Barlow:wght@300;400;500;600;700',
    mulish: 'Mulish:wght@300;400;500;600;700',
    pt_sans: 'PT+Sans:wght@400;700',
    noto_sans: 'Noto+Sans:wght@300;400;500;600;700',
    ibm_plex: 'IBM+Plex+Sans:wght@300;400;500;600;700',
    manrope: 'Manrope:wght@300;400;500;600;700',
    space_grotesk: 'Space+Grotesk:wght@300;400;500;600;700',
    plus_jakarta: 'Plus+Jakarta+Sans:wght@300;400;500;600;700',
    lexend: 'Lexend:wght@300;400;500;600;700',
    geist: 'Geist:wght@300;400;500;600;700',
    be_vietnam_pro: 'Be+Vietnam+Pro:wght@300;400;500;600;700',
    sarabun: 'Sarabun:wght@300;400;500;600;700',
    merriweather: 'Merriweather:wght@300;400;700',
    playfair: 'Playfair+Display:wght@400;500;600;700',
    lora: 'Lora:wght@400;500;600;700',
    libre_baskerville: 'Libre+Baskerville:wght@400;700',
    // times_new_roman, georgia, courier_new are system fonts — no Google Font needed
    jetbrains_mono: 'JetBrains+Mono:wght@300;400;500;600;700',
    fira_code: 'Fira+Code:wght@300;400;500;600;700',
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

function loadGoogleFont(fontKey) {
    const spec = GOOGLE_FONT_MAP[fontKey];
    if (!spec) {
        return;
    }
    const linkId = `t4-google-font-${fontKey}`;
    if (document.getElementById(linkId)) {
        return;
    }
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
    document.head.appendChild(link);
}

function applyThemeFont(company) {
    const root = document.documentElement;
    const fontKey = getEffectiveFontKey(company);

    if (fontKey !== 'system') {
        loadGoogleFont(fontKey);
    }
    const fontStack = FONT_FAMILY_MAP[fontKey] || FONT_FAMILY_MAP.system;
    root.style.setProperty('--t4-font-family', fontStack);
}

function getEffectiveFontKey(company) {
    if (session.user_theme_use_personal && session.user_theme_font_family) {
        return session.user_theme_font_family;
    }
    return company?.theme_font_family || 'system';
}

const ICON_SHAPE_CLASS_PREFIX = 't4-icon-shape-';
const VALID_ICON_SHAPES = ['rounded_rect', 'circle', 'square', 'squircle', 'hexagon'];

function applyIconShape(company) {
    const root = document.documentElement;
    const shape = company?.theme_icon_shape || 'rounded_rect';
    // Remove all existing shape classes
    for (const s of VALID_ICON_SHAPES) {
        root.classList.remove(ICON_SHAPE_CLASS_PREFIX + s);
    }
    // Add the active shape class
    root.classList.add(ICON_SHAPE_CLASS_PREFIX + shape);
}

function applyViewOverrides(company) {
    const overrides = company?.theme_view_overrides || {};
    const styleId = 't4-theme-view-overrides';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
    }

    // Overrides use compound key format: 'cssTarget|||propKey'
    const groups = {};
    for (const [compoundKey, value] of Object.entries(overrides)) {
        if (!value) continue;
        const [target, propKey] = compoundKey.split('|||');
        if (!target || !propKey) continue;
        if (!groups[target]) groups[target] = [];
        const isVar = propKey.startsWith('--');
        groups[target].push(`${propKey}: ${value}${isVar ? ' !important' : ''}`);
    }

    let css = '/* T4 View Overrides */\n';
    for (const [selector, props] of Object.entries(groups)) {
        css += `${selector} { ${props.join('; ')} }\n`;
    }
    styleEl.textContent = css;
}

function getActiveCompanyColors() {
    const activeCompany = user.activeCompany;
    const companyColors = activeCompany?.theme_colors || null;
    if (!session.user_theme_use_personal) {
        return companyColors;
    }
    const userColors = session.user_theme_colors || {};
    const merged = { ...(companyColors || {}) };
    for (const [key, value] of Object.entries(userColors)) {
        if (value) {
            merged[key] = value;
        }
    }
    return merged;
}

export const FONT_FAMILY_MAP_EXPORT = FONT_FAMILY_MAP;
export const GOOGLE_FONT_MAP_EXPORT = GOOGLE_FONT_MAP;

export const themeColorService = {
    dependencies: [],
    start(env) {
        const company = user.activeCompany;
        applyThemeColors(getActiveCompanyColors());
        applyThemeFont(company);
        applyIconShape(company);
        applyViewOverrides(company);
        env.bus.addEventListener('MENUS:APP-CHANGED', () => {
            applyThemeColors(getActiveCompanyColors());
            applyThemeFont(user.activeCompany);
            applyIconShape(user.activeCompany);
            applyViewOverrides(user.activeCompany);
        });
    },
};

registry.category("services").add("t4_theme.colors", themeColorService);
