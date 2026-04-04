/** @odoo-module **/

// ============================================================================
// T4 Theme Editor — Component Registry (Expanded)
// Maps DOM selectors → themeable CSS vars + direct CSS properties
//
// Property types:
//   slider  — range input (min/max/unit)
//   color   — color picker + hex input
//   select  — dropdown presets
//   toggle  — on/off switch
// ============================================================================

export const THEME_COMPONENTS = {

    // =====================================================================
    // KANBAN VIEW
    // =====================================================================

    '.o_kanban_record': {
        label: 'Kanban Card',
        icon: 'fa-th-large',
        category: 'kanban',
        cssTarget: '.o_kanban_renderer',
        properties: [
            // CSS vars (Odoo native)
            { key: '--KanbanRecord-padding-v', label: 'Padding Top/Bottom', type: 'slider', min: 0, max: 32, unit: 'px', default: '8' },
            { key: '--KanbanRecord-padding-h', label: 'Padding Left/Right', type: 'slider', min: 0, max: 32, unit: 'px', default: '8' },
            { key: '--KanbanRecord-gap-v', label: 'Inner Gap', type: 'slider', min: 0, max: 20, unit: 'px', default: '5' },
            { key: '--KanbanRecord-margin-v', label: 'Card Margin Vertical', type: 'slider', min: 0, max: 16, unit: 'px', default: '' },
            { key: '--KanbanRecord-margin-h', label: 'Card Margin Horizontal', type: 'slider', min: 0, max: 16, unit: 'px', default: '' },
            { key: '--KanbanRecord-width', label: 'Card Width', type: 'select', options: [
                { value: '240px', label: 'Compact' },
                { value: '300px', label: 'Small' },
                { value: '320px', label: 'Default' },
                { value: '380px', label: 'Wide' },
                { value: '440px', label: 'Extra Wide' },
            ], default: '320px' },
            // Direct CSS
            { key: 'border-radius', label: 'Corner Radius', type: 'slider', min: 0, max: 20, unit: 'px', css: true },
            { key: 'box-shadow', label: 'Shadow', type: 'select', css: true, options: [
                { value: 'none', label: 'None' },
                { value: '0 1px 3px rgba(0,0,0,0.08)', label: 'Subtle' },
                { value: '0 2px 8px rgba(0,0,0,0.12)', label: 'Medium' },
                { value: '0 4px 16px rgba(0,0,0,0.15)', label: 'Strong' },
                { value: '0 8px 30px rgba(0,0,0,0.12)', label: 'Floating' },
            ], default: '' },
        ],
    },

    '.o_kanban_renderer': {
        label: 'Kanban Container',
        icon: 'fa-paint-brush',
        category: 'kanban',
        cssTarget: '.o_kanban_renderer',
        properties: [
            { key: '--Kanban-background', label: 'Background', type: 'color', default: '' },
            { key: '--Kanban-gap', label: 'Column Gap', type: 'slider', min: 0, max: 40, unit: 'px', default: '' },
            { key: '--KanbanGroup-background', label: 'Group Background', type: 'color', default: '' },
            { key: '--KanbanGroup-padding-h', label: 'Group Padding', type: 'slider', min: 0, max: 32, unit: 'px', default: '' },
            { key: '--KanbanRecord--small-width', label: 'Small Card Width', type: 'slider', min: 200, max: 400, unit: 'px', default: '300' },
        ],
    },

    '.o_kanban_header': {
        label: 'Kanban Column Header',
        icon: 'fa-header',
        category: 'kanban',
        cssTarget: '.o_kanban_header',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 20, unit: 'px', css: true },
            { key: 'font-weight', label: 'Font Weight', type: 'select', css: true, options: [
                { value: '400', label: 'Normal' },
                { value: '500', label: 'Medium' },
                { value: '600', label: 'Semi Bold' },
                { value: '700', label: 'Bold' },
            ] },
            { key: 'padding', label: 'Padding', type: 'slider', min: 4, max: 24, unit: 'px', css: true },
        ],
    },

    // =====================================================================
    // LIST VIEW
    // =====================================================================

    '.o_list_renderer': {
        label: 'List Table',
        icon: 'fa-table',
        category: 'list',
        cssTarget: '.o_list_renderer',
        properties: [
            { key: '--ListRenderer-table-padding-x', label: 'Side Padding', type: 'slider', min: 0, max: 40, unit: 'px', default: '' },
            { key: '--ListRenderer-thead-bg-color', label: 'Header Background', type: 'color', default: '' },
            { key: '--ListRenderer-thead-padding-y', label: 'Header Padding', type: 'slider', min: 2, max: 20, unit: 'px', default: '' },
            { key: '--ListRenderer-thead-border-end-color', label: 'Header Border Color', type: 'color', default: '' },
            { key: '--ListRenderer-tfoot-bg-color', label: 'Footer Background', type: 'color', default: '' },
        ],
    },

    '.o_list_table': {
        label: 'List Rows',
        icon: 'fa-bars',
        category: 'list',
        cssTarget: '.o_list_table',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 18, unit: 'px', css: true },
            { key: '--table-bg', label: 'Row Background', type: 'color', default: '' },
            { key: 'border-color', label: 'Border Color', type: 'color', css: true },
        ],
    },

    '.o_list_table thead th': {
        label: 'List Header Cell',
        icon: 'fa-columns',
        category: 'list',
        cssTarget: '.o_list_table thead th',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 16, unit: 'px', css: true },
            { key: 'font-weight', label: 'Font Weight', type: 'select', css: true, options: [
                { value: '400', label: 'Normal' },
                { value: '600', label: 'Semi Bold' },
                { value: '700', label: 'Bold' },
            ] },
            { key: 'text-transform', label: 'Text Case', type: 'select', css: true, options: [
                { value: 'none', label: 'Normal' },
                { value: 'uppercase', label: 'UPPERCASE' },
                { value: 'capitalize', label: 'Capitalize' },
            ] },
            { key: 'color', label: 'Text Color', type: 'color', css: true },
        ],
    },

    '.o_group_header': {
        label: 'List Group Row',
        icon: 'fa-sitemap',
        category: 'list',
        cssTarget: '.o_group_header',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'font-weight', label: 'Font Weight', type: 'select', css: true, options: [
                { value: '500', label: 'Medium' },
                { value: '600', label: 'Semi Bold' },
                { value: '700', label: 'Bold' },
            ] },
        ],
    },

    // =====================================================================
    // FORM VIEW
    // =====================================================================

    '.o_form_sheet': {
        label: 'Form Sheet',
        icon: 'fa-file-text-o',
        category: 'form',
        cssTarget: '.o_form_view .o_form_sheet',
        properties: [
            { key: '--formView-sheet-padding-y', label: 'Padding Vertical', type: 'slider', min: 0, max: 48, unit: 'px', default: '' },
            { key: '--formView-sheet-padding-x', label: 'Padding Horizontal', type: 'slider', min: 0, max: 64, unit: 'px', default: '' },
            { key: '--formView-sheet-border-radius', label: 'Border Radius', type: 'slider', min: 0, max: 20, unit: 'px', default: '' },
            { key: '--formView-sheet-border-width', label: 'Border Width', type: 'slider', min: 0, max: 3, unit: 'px', default: '1' },
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'box-shadow', label: 'Shadow', type: 'select', css: true, options: [
                { value: 'none', label: 'None' },
                { value: '0 1px 4px rgba(0,0,0,0.08)', label: 'Subtle' },
                { value: '0 2px 12px rgba(0,0,0,0.1)', label: 'Medium' },
                { value: '0 4px 20px rgba(0,0,0,0.12)', label: 'Strong' },
            ], default: '' },
        ],
    },

    '.o_form_sheet_bg': {
        label: 'Form Background',
        icon: 'fa-square-o',
        category: 'form',
        cssTarget: '.o_form_sheet_bg',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: '--formView-sheetBg-padding-x', label: 'Side Padding', type: 'slider', min: 0, max: 48, unit: 'px', default: '' },
        ],
    },

    '.o_form_statusbar': {
        label: 'Status Bar',
        icon: 'fa-tasks',
        category: 'form',
        cssTarget: '.o_form_statusbar',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'border-bottom-color', label: 'Border Color', type: 'color', css: true },
            { key: 'padding', label: 'Padding', type: 'slider', min: 0, max: 16, unit: 'px', css: true },
        ],
    },

    '.o-form-buttonbox': {
        label: 'Button Box',
        icon: 'fa-th',
        category: 'form',
        cssTarget: '.o-form-buttonbox',
        properties: [
            { key: '--button-box-gap', label: 'Gap', type: 'slider', min: 0, max: 8, unit: 'px', default: '1' },
            { key: '--button-box-per-row', label: 'Columns', type: 'slider', min: 1, max: 6, unit: '', default: '2' },
            { key: '--button-box-border-color', label: 'Border Color', type: 'color', default: '' },
        ],
    },

    '.o_form_label': {
        label: 'Form Labels',
        icon: 'fa-tag',
        category: 'form',
        cssTarget: '.o_form_view .o_form_label',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 18, unit: 'px', css: true },
            { key: 'font-weight', label: 'Font Weight', type: 'select', css: true, options: [
                { value: '400', label: 'Normal' },
                { value: '500', label: 'Medium' },
                { value: '600', label: 'Semi Bold' },
                { value: '700', label: 'Bold' },
            ] },
            { key: 'color', label: 'Text Color', type: 'color', css: true },
        ],
    },

    '.o_notebook': {
        label: 'Notebook / Tabs',
        icon: 'fa-folder-o',
        category: 'form',
        cssTarget: '.o_form_view .o_notebook',
        properties: [
            { key: '--Notebook-margin-x', label: 'Margin X', type: 'slider', min: -48, max: 0, unit: 'px', default: '' },
            { key: '--Notebook-padding-x', label: 'Padding X', type: 'slider', min: 0, max: 48, unit: 'px', default: '' },
        ],
    },

    '.o_group': {
        label: 'Form Group',
        icon: 'fa-object-group',
        category: 'form',
        cssTarget: '.o_form_view .o_group',
        properties: [
            { key: 'padding', label: 'Padding', type: 'slider', min: 0, max: 24, unit: 'px', css: true },
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'border-radius', label: 'Corner Radius', type: 'slider', min: 0, max: 16, unit: 'px', css: true },
        ],
    },

    // =====================================================================
    // CALENDAR VIEW
    // =====================================================================

    '.o_calendar_renderer': {
        label: 'Calendar',
        icon: 'fa-calendar',
        category: 'calendar',
        cssTarget: '.o_calendar_renderer',
        properties: [
            { key: '--fc-today-bg-color', label: 'Today Highlight', type: 'color', default: '' },
            { key: '--o-cw-bg', label: 'Today Badge BG', type: 'color', default: '' },
            { key: '--o-cw-color', label: 'Today Badge Text', type: 'color', default: '' },
            { key: '--fc-border-color', label: 'Grid Border', type: 'color', default: '' },
            { key: '--fc-page-bg-color', label: 'Page Background', type: 'color', default: '' },
        ],
    },

    // =====================================================================
    // CONTROL PANEL (shared across views)
    // =====================================================================

    '.o_control_panel': {
        label: 'Control Panel',
        icon: 'fa-sliders',
        category: 'global',
        cssTarget: '.o_control_panel',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'padding', label: 'Padding', type: 'slider', min: 0, max: 24, unit: 'px', css: true },
            { key: 'border-bottom-color', label: 'Border Color', type: 'color', css: true },
            { key: 'box-shadow', label: 'Shadow', type: 'select', css: true, options: [
                { value: 'none', label: 'None' },
                { value: '0 1px 4px rgba(0,0,0,0.06)', label: 'Subtle' },
                { value: '0 2px 8px rgba(0,0,0,0.1)', label: 'Medium' },
            ], default: '' },
        ],
    },

    // =====================================================================
    // NAVBAR
    // =====================================================================

    '.o_main_navbar': {
        label: 'Top Navbar',
        icon: 'fa-navicon',
        category: 'global',
        cssTarget: '.o_main_navbar',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'box-shadow', label: 'Shadow', type: 'select', css: true, options: [
                { value: 'none', label: 'None' },
                { value: '0 2px 4px rgba(0,0,0,0.1)', label: 'Subtle' },
                { value: '0 2px 12px rgba(0,0,0,0.15)', label: 'Medium' },
            ], default: '' },
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 11, max: 18, unit: 'px', css: true },
        ],
    },

    // =====================================================================
    // CHATTER
    // =====================================================================

    '.o-mail-Chatter': {
        label: 'Chatter',
        icon: 'fa-comments-o',
        category: 'form',
        cssTarget: '.o-mail-Chatter',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 11, max: 16, unit: 'px', css: true },
            { key: 'padding', label: 'Padding', type: 'slider', min: 0, max: 24, unit: 'px', css: true },
        ],
    },

    // =====================================================================
    // PIVOT VIEW
    // =====================================================================

    '.o_pivot': {
        label: 'Pivot Table',
        icon: 'fa-bar-chart',
        category: 'pivot',
        cssTarget: '.o_pivot',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 16, unit: 'px', css: true },
            { key: '--PivotView-width', label: 'Table Width', type: 'select', options: [
                { value: 'auto', label: 'Auto' },
                { value: '100%', label: 'Full Width' },
            ], default: 'auto' },
        ],
    },

    // =====================================================================
    // GRAPH VIEW
    // =====================================================================

    '.o_graph_view': {
        label: 'Graph View',
        icon: 'fa-area-chart',
        category: 'graph',
        cssTarget: '.o_graph_view',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'min-height', label: 'Min Height', type: 'slider', min: 200, max: 800, unit: 'px', css: true },
        ],
    },

    // =====================================================================
    // ACTION MANAGER / VIEW CONTAINER
    // =====================================================================

    '.o_action_manager': {
        label: 'View Container',
        icon: 'fa-window-maximize',
        category: 'global',
        cssTarget: '.o_action_manager',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'padding', label: 'Padding', type: 'slider', min: 0, max: 24, unit: 'px', css: true },
        ],
    },

    // =====================================================================
    // BUTTONS (global)
    // =====================================================================

    '.btn-primary': {
        label: 'Primary Button',
        icon: 'fa-square',
        category: 'global',
        cssTarget: '.btn-primary',
        properties: [
            { key: 'border-radius', label: 'Corner Radius', type: 'slider', min: 0, max: 20, unit: 'px', css: true },
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 11, max: 18, unit: 'px', css: true },
            { key: 'font-weight', label: 'Font Weight', type: 'select', css: true, options: [
                { value: '400', label: 'Normal' },
                { value: '500', label: 'Medium' },
                { value: '700', label: 'Bold' },
            ] },
        ],
    },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Find the best matching component definition for a DOM element.
 */
export function findComponentForElement(el) {
    const selectors = Object.keys(THEME_COMPONENTS);
    let current = el;
    while (current && current !== document.body) {
        for (const selector of selectors) {
            try {
                if (current.matches(selector)) {
                    return { selector, config: THEME_COMPONENTS[selector] };
                }
            } catch {
                // Skip invalid selectors for matches() (e.g. compound selectors)
                const found = document.querySelector(selector);
                if (found && found.contains(current)) {
                    return { selector, config: THEME_COMPONENTS[selector] };
                }
            }
        }
        current = current.parentElement;
    }
    return null;
}

/**
 * Build property key → cssTarget selector map.
 * For CSS vars: use cssTarget from component
 * For direct CSS (css: true): use cssTarget directly as the rule selector
 */
export function buildTargetMap() {
    const map = {};
    for (const [, config] of Object.entries(THEME_COMPONENTS)) {
        const target = config.cssTarget || ':root';
        for (const prop of config.properties) {
            map[prop.key] = { target, isDirect: !!prop.css };
        }
    }
    return map;
}
