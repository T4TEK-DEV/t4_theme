/** @odoo-module **/

// ============================================================================
// T4 Theme Editor — Component Registry (Deep Recursive)
// 150+ properties across 40+ components, organized parent → child
//
// Property types: slider, color, select
// css: true = direct CSS property (not CSS var)
// ============================================================================

// Shared property presets
const SHADOW_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: '0 1px 3px rgba(0,0,0,0.08)', label: 'Subtle' },
    { value: '0 2px 8px rgba(0,0,0,0.12)', label: 'Medium' },
    { value: '0 4px 16px rgba(0,0,0,0.15)', label: 'Strong' },
    { value: '0 8px 30px rgba(0,0,0,0.12)', label: 'Floating' },
];

const WEIGHT_OPTIONS = [
    { value: '400', label: 'Normal' },
    { value: '500', label: 'Medium' },
    { value: '600', label: 'Semi Bold' },
    { value: '700', label: 'Bold' },
];

const TEXT_CASE_OPTIONS = [
    { value: 'none', label: 'Normal' },
    { value: 'uppercase', label: 'UPPERCASE' },
    { value: 'capitalize', label: 'Capitalize' },
    { value: 'lowercase', label: 'lowercase' },
];

export const THEME_COMPONENTS = {

    // =====================================================================
    // KANBAN VIEW — Parent + Children
    // =====================================================================

    '.o_kanban_renderer': {
        label: 'Kanban Container',
        icon: 'fa-paint-brush',
        category: 'kanban',
        cssTarget: '.o_kanban_renderer',
        properties: [
            { key: '--Kanban-background', label: 'Background', type: 'color', default: '' },
            { key: '--Kanban-gap', label: 'Column Gap', type: 'slider', min: 0, max: 40, unit: 'px', default: '' },
            { key: '--Kanban-padding', label: 'Padding', type: 'slider', min: 0, max: 24, unit: 'px', default: '' },
            { key: '--KanbanRecord-width', label: 'Card Width', type: 'select', options: [
                { value: '240px', label: 'Compact' }, { value: '300px', label: 'Small' },
                { value: '320px', label: 'Default' }, { value: '380px', label: 'Wide' },
                { value: '440px', label: 'Extra Wide' },
            ], default: '320px' },
            { key: '--KanbanRecord--small-width', label: 'Small Card Width', type: 'slider', min: 200, max: 400, unit: 'px', default: '300' },
        ],
    },

    '.o_kanban_record': {
        label: '  Kanban Card',
        icon: 'fa-th-large',
        category: 'kanban',
        cssTarget: '.o_kanban_record',
        properties: [
            { key: '--KanbanRecord-padding-v', label: 'Padding Y', type: 'slider', min: 0, max: 32, unit: 'px', default: '8' },
            { key: '--KanbanRecord-padding-h', label: 'Padding X', type: 'slider', min: 0, max: 32, unit: 'px', default: '8' },
            { key: '--KanbanRecord-gap-v', label: 'Inner Gap', type: 'slider', min: 0, max: 20, unit: 'px', default: '5' },
            { key: '--KanbanRecord-margin-v', label: 'Margin Y', type: 'slider', min: 0, max: 16, unit: 'px', default: '' },
            { key: '--KanbanRecord-margin-h', label: 'Margin X', type: 'slider', min: 0, max: 16, unit: 'px', default: '' },
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'border-radius', label: 'Corners', type: 'slider', min: 0, max: 20, unit: 'px', css: true },
            { key: 'border-color', label: 'Border Color', type: 'color', css: true },
            { key: 'box-shadow', label: 'Shadow', type: 'select', css: true, options: SHADOW_OPTIONS, default: '' },
        ],
    },

    '.o_kanban_record > main > footer': {
        label: '    Card Footer',
        icon: 'fa-ellipsis-h',
        category: 'kanban',
        cssTarget: '.o_kanban_record > main > footer, .o_kanban_record > footer',
        properties: [
            { key: '--Card-Footer-font-size', label: 'Font Size', type: 'slider', min: 10, max: 16, unit: 'px', default: '' },
            { key: '--Card-Footer-gap', label: 'Gap', type: 'slider', min: 0, max: 12, unit: 'px', default: '4' },
            { key: 'border-top', label: 'Top Border', type: 'select', css: true, options: [
                { value: 'none', label: 'None' }, { value: '1px solid #dee2e6', label: 'Subtle' },
                { value: '1px solid #adb5bd', label: 'Medium' },
            ] },
            { key: 'padding-top', label: 'Padding Top', type: 'slider', min: 0, max: 16, unit: 'px', css: true },
        ],
    },

    '.o_kanban_record aside': {
        label: '    Card Image',
        icon: 'fa-image',
        category: 'kanban',
        cssTarget: '.o_kanban_record aside',
        properties: [
            { key: '--KanbanRecord__image-width', label: 'Image Width', type: 'slider', min: 40, max: 120, unit: 'px', default: '64' },
            { key: 'border-radius', label: 'Corners', type: 'slider', min: 0, max: 20, unit: 'px', css: true },
        ],
    },

    '.o_kanban_group': {
        label: '  Kanban Column',
        icon: 'fa-columns',
        category: 'kanban',
        cssTarget: '.o_kanban_group',
        properties: [
            { key: '--KanbanGroup-background', label: 'Background', type: 'color', default: '' },
            { key: '--KanbanGroup-padding-h', label: 'Padding', type: 'slider', min: 0, max: 32, unit: 'px', default: '' },
            { key: 'border-radius', label: 'Corners', type: 'slider', min: 0, max: 16, unit: 'px', css: true },
        ],
    },

    '.o_kanban_header': {
        label: '    Column Header',
        icon: 'fa-header',
        category: 'kanban',
        cssTarget: '.o_kanban_header',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 20, unit: 'px', css: true },
            { key: 'font-weight', label: 'Weight', type: 'select', css: true, options: WEIGHT_OPTIONS },
            { key: 'padding', label: 'Padding', type: 'slider', min: 4, max: 24, unit: 'px', css: true },
            { key: 'color', label: 'Text Color', type: 'color', css: true },
        ],
    },

    '.o_kanban_counter': {
        label: '    Column Counter',
        icon: 'fa-hashtag',
        category: 'kanban',
        cssTarget: '.o_kanban_counter',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 16, unit: 'px', css: true },
            { key: 'color', label: 'Text Color', type: 'color', css: true },
        ],
    },

    // =====================================================================
    // LIST VIEW — Parent + Children
    // =====================================================================

    '.o_list_renderer': {
        label: 'List Container',
        icon: 'fa-table',
        category: 'list',
        cssTarget: '.o_list_renderer',
        properties: [
            { key: '--ListRenderer-table-padding-x', label: 'Side Padding', type: 'slider', min: 0, max: 40, unit: 'px', default: '' },
        ],
    },

    '.o_list_table': {
        label: '  List Table',
        icon: 'fa-bars',
        category: 'list',
        cssTarget: '.o_list_table',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 18, unit: 'px', css: true },
            { key: '--table-bg', label: 'Row Background', type: 'color', default: '' },
            { key: 'border-color', label: 'Border Color', type: 'color', css: true },
        ],
    },

    '.o_list_table thead': {
        label: '    Table Header',
        icon: 'fa-columns',
        category: 'list',
        cssTarget: '.o_list_renderer',
        properties: [
            { key: '--ListRenderer-thead-bg-color', label: 'Background', type: 'color', default: '' },
            { key: '--ListRenderer-thead-padding-y', label: 'Padding', type: 'slider', min: 2, max: 20, unit: 'px', default: '' },
            { key: '--ListRenderer-thead-border-end-color', label: 'Border Color', type: 'color', default: '' },
        ],
    },

    '.o_list_table thead th': {
        label: '      Header Cell',
        icon: 'fa-font',
        category: 'list',
        cssTarget: '.o_list_table thead th',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 16, unit: 'px', css: true },
            { key: 'font-weight', label: 'Weight', type: 'select', css: true, options: WEIGHT_OPTIONS },
            { key: 'text-transform', label: 'Text Case', type: 'select', css: true, options: TEXT_CASE_OPTIONS },
            { key: 'color', label: 'Text Color', type: 'color', css: true },
            { key: 'letter-spacing', label: 'Letter Spacing', type: 'slider', min: 0, max: 3, unit: 'px', css: true },
        ],
    },

    '.o_list_table tfoot': {
        label: '    Table Footer',
        icon: 'fa-minus',
        category: 'list',
        cssTarget: '.o_list_renderer',
        properties: [
            { key: '--ListRenderer-tfoot-bg-color', label: 'Background', type: 'color', default: '' },
        ],
    },

    '.o_list_table tfoot td': {
        label: '      Footer Cell',
        icon: 'fa-font',
        category: 'list',
        cssTarget: '.o_list_table tfoot td',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 16, unit: 'px', css: true },
            { key: 'font-weight', label: 'Weight', type: 'select', css: true, options: WEIGHT_OPTIONS },
            { key: 'color', label: 'Text Color', type: 'color', css: true },
        ],
    },

    '.o_data_row': {
        label: '    Data Row',
        icon: 'fa-align-justify',
        category: 'list',
        cssTarget: '.o_data_row',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 16, unit: 'px', css: true },
        ],
    },

    '.o_group_header': {
        label: '    Group Header',
        icon: 'fa-sitemap',
        category: 'list',
        cssTarget: '.o_group_header',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'font-weight', label: 'Weight', type: 'select', css: true, options: WEIGHT_OPTIONS },
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 16, unit: 'px', css: true },
            { key: 'color', label: 'Text Color', type: 'color', css: true },
        ],
    },

    '.o_data_row.o_selected_row': {
        label: '    Selected Row',
        icon: 'fa-pencil',
        category: 'list',
        cssTarget: '.o_data_row.o_selected_row',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
        ],
    },

    // =====================================================================
    // FORM VIEW — Parent + Children (deep)
    // =====================================================================

    '.o_form_view': {
        label: 'Form View',
        icon: 'fa-file-text-o',
        category: 'form',
        cssTarget: '.o_form_view',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
        ],
    },

    '.o_form_sheet_bg': {
        label: '  Sheet Background',
        icon: 'fa-square-o',
        category: 'form',
        cssTarget: '.o_form_sheet_bg',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: '--formView-sheetBg-padding-x', label: 'Side Padding', type: 'slider', min: 0, max: 48, unit: 'px', default: '' },
            { key: '--formView-sheetBg-padding-top', label: 'Top Padding', type: 'slider', min: 0, max: 32, unit: 'px', default: '' },
        ],
    },

    '.o_form_sheet': {
        label: '    Form Sheet',
        icon: 'fa-file',
        category: 'form',
        cssTarget: '.o_form_view .o_form_sheet',
        properties: [
            { key: '--formView-sheet-padding-y', label: 'Padding Y', type: 'slider', min: 0, max: 48, unit: 'px', default: '' },
            { key: '--formView-sheet-padding-x', label: 'Padding X', type: 'slider', min: 0, max: 64, unit: 'px', default: '' },
            { key: '--formView-sheet-border-radius', label: 'Corners', type: 'slider', min: 0, max: 20, unit: 'px', default: '' },
            { key: '--formView-sheet-border-width', label: 'Border Width', type: 'slider', min: 0, max: 3, unit: 'px', default: '1' },
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'box-shadow', label: 'Shadow', type: 'select', css: true, options: SHADOW_OPTIONS, default: '' },
        ],
    },

    '.o_form_statusbar': {
        label: '    Status Bar',
        icon: 'fa-tasks',
        category: 'form',
        cssTarget: '.o_form_statusbar',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'border-bottom-color', label: 'Border Color', type: 'color', css: true },
            { key: 'padding', label: 'Padding', type: 'slider', min: 0, max: 16, unit: 'px', css: true },
        ],
    },

    '.o_arrow_button': {
        label: '      Status Pill',
        icon: 'fa-chevron-right',
        category: 'form',
        cssTarget: '.o_arrow_button',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 16, unit: 'px', css: true },
            { key: 'font-weight', label: 'Weight', type: 'select', css: true, options: WEIGHT_OPTIONS },
        ],
    },

    '.o-form-buttonbox': {
        label: '    Button Box',
        icon: 'fa-th',
        category: 'form',
        cssTarget: '.o-form-buttonbox',
        properties: [
            { key: '--button-box-gap', label: 'Gap', type: 'slider', min: 0, max: 8, unit: 'px', default: '1' },
            { key: '--button-box-per-row', label: 'Columns', type: 'slider', min: 1, max: 6, unit: '', default: '2' },
            { key: '--button-box-border-color', label: 'Border Color', type: 'color', default: '' },
        ],
    },

    '.oe_stat_button': {
        label: '      Stat Button',
        icon: 'fa-bar-chart',
        category: 'form',
        cssTarget: '.oe_stat_button',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 16, unit: 'px', css: true },
            { key: 'padding', label: 'Padding', type: 'slider', min: 2, max: 16, unit: 'px', css: true },
            { key: 'border-radius', label: 'Corners', type: 'slider', min: 0, max: 12, unit: 'px', css: true },
        ],
    },

    '.oe_title': {
        label: '    Record Title',
        icon: 'fa-heading',
        category: 'form',
        cssTarget: '.oe_title',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 16, max: 36, unit: 'px', css: true },
            { key: 'font-weight', label: 'Weight', type: 'select', css: true, options: WEIGHT_OPTIONS },
            { key: 'color', label: 'Text Color', type: 'color', css: true },
        ],
    },

    '.o_form_label': {
        label: '    Form Labels',
        icon: 'fa-tag',
        category: 'form',
        cssTarget: '.o_form_view .o_form_label',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 18, unit: 'px', css: true },
            { key: 'font-weight', label: 'Weight', type: 'select', css: true, options: WEIGHT_OPTIONS },
            { key: 'color', label: 'Text Color', type: 'color', css: true },
            { key: 'text-transform', label: 'Text Case', type: 'select', css: true, options: TEXT_CASE_OPTIONS },
        ],
    },

    '.o_group': {
        label: '    Form Group',
        icon: 'fa-object-group',
        category: 'form',
        cssTarget: '.o_form_view .o_group',
        properties: [
            { key: 'padding', label: 'Padding', type: 'slider', min: 0, max: 24, unit: 'px', css: true },
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'border-radius', label: 'Corners', type: 'slider', min: 0, max: 16, unit: 'px', css: true },
        ],
    },

    '.o_inner_group': {
        label: '      Inner Group',
        icon: 'fa-object-ungroup',
        category: 'form',
        cssTarget: '.o_form_view .o_inner_group',
        properties: [
            { key: '--inner-group-row-gap', label: 'Row Gap', type: 'slider', min: 0, max: 16, unit: 'px', default: '' },
            { key: 'padding', label: 'Padding', type: 'slider', min: 0, max: 16, unit: 'px', css: true },
        ],
    },

    '.o_notebook': {
        label: '    Notebook / Tabs',
        icon: 'fa-folder-o',
        category: 'form',
        cssTarget: '.o_form_view .o_notebook',
        properties: [
            { key: '--Notebook-margin-x', label: 'Margin X', type: 'slider', min: -48, max: 0, unit: 'px', default: '' },
            { key: '--Notebook-padding-x', label: 'Padding X', type: 'slider', min: 0, max: 48, unit: 'px', default: '' },
        ],
    },

    '.o_notebook .nav-link': {
        label: '      Tab Button',
        icon: 'fa-bookmark-o',
        category: 'form',
        cssTarget: '.o_notebook .nav-link',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 18, unit: 'px', css: true },
            { key: 'font-weight', label: 'Weight', type: 'select', css: true, options: WEIGHT_OPTIONS },
            { key: 'padding', label: 'Padding', type: 'slider', min: 4, max: 16, unit: 'px', css: true },
            { key: 'color', label: 'Text Color', type: 'color', css: true },
            { key: 'border-radius', label: 'Corners', type: 'slider', min: 0, max: 12, unit: 'px', css: true },
        ],
    },

    '.o_horizontal_separator': {
        label: '    Separator',
        icon: 'fa-minus',
        category: 'form',
        cssTarget: '.o_horizontal_separator',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 20, unit: 'px', css: true },
            { key: 'font-weight', label: 'Weight', type: 'select', css: true, options: WEIGHT_OPTIONS },
            { key: 'color', label: 'Text Color', type: 'color', css: true },
            { key: 'border-bottom-color', label: 'Line Color', type: 'color', css: true },
        ],
    },

    '.o_field_widget': {
        label: '    Field Widget',
        icon: 'fa-puzzle-piece',
        category: 'form',
        cssTarget: '.o_form_view .o_field_widget',
        properties: [
            { key: '--fieldWidget-margin-bottom', label: 'Bottom Margin', type: 'slider', min: 0, max: 16, unit: 'px', default: '' },
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 18, unit: 'px', css: true },
        ],
    },

    '.o_input': {
        label: '      Input Field',
        icon: 'fa-i-cursor',
        category: 'form',
        cssTarget: '.o_form_view .o_input',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 18, unit: 'px', css: true },
            { key: 'border-radius', label: 'Corners', type: 'slider', min: 0, max: 12, unit: 'px', css: true },
            { key: 'padding', label: 'Padding', type: 'slider', min: 2, max: 12, unit: 'px', css: true },
            { key: 'border-color', label: 'Border Color', type: 'color', css: true },
        ],
    },

    // =====================================================================
    // CHATTER
    // =====================================================================

    '.o-mail-Chatter': {
        label: '  Chatter',
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
            { key: '--fc-neutral-bg-color', label: 'Neutral Background', type: 'color', default: '' },
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 10, max: 16, unit: 'px', css: true },
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
            { key: '--PivotView-width', label: 'Width', type: 'select', options: [
                { value: 'auto', label: 'Auto' }, { value: '100%', label: 'Full' },
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
    // CONTROL PANEL + Breadcrumb + Pager
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
            { key: 'box-shadow', label: 'Shadow', type: 'select', css: true, options: SHADOW_OPTIONS.slice(0, 3), default: '' },
        ],
    },

    '.o_breadcrumb': {
        label: '  Breadcrumb',
        icon: 'fa-angle-right',
        category: 'global',
        cssTarget: '.o_breadcrumb',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 12, max: 24, unit: 'px', css: true },
            { key: 'font-weight', label: 'Weight', type: 'select', css: true, options: WEIGHT_OPTIONS },
            { key: 'color', label: 'Text Color', type: 'color', css: true },
        ],
    },

    '.o_cp_switch_buttons .btn': {
        label: '  View Switch Buttons',
        icon: 'fa-th-list',
        category: 'global',
        cssTarget: '.o_cp_switch_buttons .btn',
        properties: [
            { key: 'font-size', label: 'Icon Size', type: 'slider', min: 12, max: 24, unit: 'px', css: true },
            { key: 'border-radius', label: 'Corners', type: 'slider', min: 0, max: 12, unit: 'px', css: true },
        ],
    },

    // =====================================================================
    // NAVBAR + Children
    // =====================================================================

    '.o_main_navbar': {
        label: 'Top Navbar',
        icon: 'fa-navicon',
        category: 'global',
        cssTarget: '.o_main_navbar',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'box-shadow', label: 'Shadow', type: 'select', css: true, options: SHADOW_OPTIONS.slice(0, 3), default: '' },
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 11, max: 18, unit: 'px', css: true },
            { key: '--t4-color-navbar-entry-color', label: 'Menu Text Color', type: 'color' },
            { key: '--t4-color-navbar-entry-color-hover', label: 'Menu Text Hover', type: 'color' },
            { key: '--t4-color-navbar-entry-bg', label: 'Menu Item BG', type: 'color' },
            { key: '--t4-color-navbar-entry-bg-hover', label: 'Menu Item BG Hover', type: 'color' },
            { key: '--t4-color-navbar-entry-bg-active', label: 'Menu Item BG Active', type: 'color' },
        ],
    },

    '.o_menu_brand': {
        label: '  Brand Name',
        icon: 'fa-bookmark',
        category: 'global',
        cssTarget: '.o_menu_brand',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 12, max: 24, unit: 'px', css: true },
            { key: 'font-weight', label: 'Weight', type: 'select', css: true, options: WEIGHT_OPTIONS },
            { key: 'color', label: 'Text Color', type: 'color', css: true },
        ],
    },

    '.o_menu_sections .o_nav_entry': {
        label: '  Nav Menu Entry',
        icon: 'fa-list',
        category: 'global',
        cssTarget: '.o_menu_sections .o_nav_entry',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 11, max: 16, unit: 'px', css: true },
            { key: 'font-weight', label: 'Weight', type: 'select', css: true, options: WEIGHT_OPTIONS },
            { key: 'color', label: 'Text Color', type: 'color', css: true },
            { key: 'padding', label: 'Padding', type: 'slider', min: 2, max: 16, unit: 'px', css: true },
        ],
    },

    // =====================================================================
    // ACTION MANAGER
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
            { key: 'border-radius', label: 'Corners', type: 'slider', min: 0, max: 20, unit: 'px', css: true },
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 11, max: 18, unit: 'px', css: true },
            { key: 'font-weight', label: 'Weight', type: 'select', css: true, options: WEIGHT_OPTIONS },
            { key: 'padding', label: 'Padding', type: 'slider', min: 2, max: 16, unit: 'px', css: true },
        ],
    },

    '.btn-secondary': {
        label: 'Secondary Button',
        icon: 'fa-square-o',
        category: 'global',
        cssTarget: '.btn-secondary',
        properties: [
            { key: 'border-radius', label: 'Corners', type: 'slider', min: 0, max: 20, unit: 'px', css: true },
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 11, max: 18, unit: 'px', css: true },
        ],
    },

    // =====================================================================
    // DROPDOWNS / POPOVERS
    // =====================================================================

    '.dropdown-menu': {
        label: 'Dropdown Menu',
        icon: 'fa-caret-square-o-down',
        category: 'global',
        cssTarget: '.dropdown-menu',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'border-radius', label: 'Corners', type: 'slider', min: 0, max: 16, unit: 'px', css: true },
            { key: 'box-shadow', label: 'Shadow', type: 'select', css: true, options: SHADOW_OPTIONS, default: '' },
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 11, max: 16, unit: 'px', css: true },
            { key: 'border-color', label: 'Border Color', type: 'color', css: true },
        ],
    },

    '.dropdown-item': {
        label: '  Dropdown Item',
        icon: 'fa-list-ul',
        category: 'global',
        cssTarget: '.dropdown-item',
        properties: [
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 11, max: 16, unit: 'px', css: true },
            { key: 'padding', label: 'Padding', type: 'slider', min: 2, max: 16, unit: 'px', css: true },
            { key: 'color', label: 'Text Color', type: 'color', css: true },
        ],
    },

    // =====================================================================
    // MODAL / DIALOG
    // =====================================================================

    '.modal-content': {
        label: 'Modal Dialog',
        icon: 'fa-window-restore',
        category: 'global',
        cssTarget: '.modal-content',
        properties: [
            { key: 'border-radius', label: 'Corners', type: 'slider', min: 0, max: 20, unit: 'px', css: true },
            { key: 'box-shadow', label: 'Shadow', type: 'select', css: true, options: SHADOW_OPTIONS, default: '' },
            { key: 'background-color', label: 'Background', type: 'color', css: true },
        ],
    },

    '.modal-header': {
        label: '  Modal Header',
        icon: 'fa-header',
        category: 'global',
        cssTarget: '.modal-header',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'padding', label: 'Padding', type: 'slider', min: 4, max: 24, unit: 'px', css: true },
            { key: 'font-size', label: 'Font Size', type: 'slider', min: 12, max: 24, unit: 'px', css: true },
            { key: 'border-bottom-color', label: 'Border Color', type: 'color', css: true },
        ],
    },

    '.modal-footer': {
        label: '  Modal Footer',
        icon: 'fa-ellipsis-h',
        category: 'global',
        cssTarget: '.modal-footer',
        properties: [
            { key: 'background-color', label: 'Background', type: 'color', css: true },
            { key: 'padding', label: 'Padding', type: 'slider', min: 4, max: 24, unit: 'px', css: true },
            { key: 'border-top-color', label: 'Border Color', type: 'color', css: true },
        ],
    },
};

// ============================================================================
// Utility
// ============================================================================

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
                // Compound selectors: fallback to querySelectorAll
            }
        }
        current = current.parentElement;
    }
    // Fallback for compound selectors (e.g. '.o_list_table thead th')
    for (const selector of selectors) {
        try {
            if (el.matches(selector)) {
                return { selector, config: THEME_COMPONENTS[selector] };
            }
        } catch {
            const all = document.querySelectorAll(selector);
            for (const candidate of all) {
                if (candidate.contains(el) || candidate === el) {
                    return { selector, config: THEME_COMPONENTS[selector] };
                }
            }
        }
    }
    return null;
}
