# -*- coding: utf-8 -*-
{
    'name': 'T4 Theme Engine',
    'version': '1.1.0',
    'category': 'Technical',
    'sequence': 101,
    'summary': 'Full UX theme: sidebar nav, dark mode, bookmarks, form layout, presets',
    'description': """
        T4 Theme Engine
        ===============
        Theme configuration per-company cho chuẩn công nghiệp:
        - Color scheme: light / dark / auto (OS preference)
        - Primary, secondary, accent color pickers
        - Custom CSS variable override
        - Dark mode logo per company
        - Font selection, sidebar style
        - Import/Export theme presets (JSON)
        - Settings UI with live preview
    """,
    'author': 'T4Tek',
    'website': 'https://t4tek.co',
    'depends': ['t4_standard', 'auth_signup'],
    'data': [
        'security/ir.model.access.csv',
        'data/t4_theme_preset_data.xml',
        'views/webclient_templates.xml',
        'views/t4_theme_config_views.xml',
        'views/res_config_settings_views.xml',
        'views/menus.xml',
    ],
    'assets': {
        # Light mode: backend assets
        'web.assets_backend': [
            't4_theme/static/src/scss/variables/_light.scss',
            't4_theme/static/src/scss/components/_navbar.scss',
            't4_theme/static/src/scss/components/_sidebar.scss',
            't4_theme/static/src/scss/components/_t4_sidebar.scss',
            't4_theme/static/src/scss/components/_t4_form.scss',
            't4_theme/static/src/scss/components/_t4_views.scss',
            't4_theme/static/src/scss/_theme_panel.scss',
            't4_theme/static/src/scss/t4_theme.scss',
            't4_theme/static/src/js/theme_service.js',
            't4_theme/static/src/js/t4_bookmark_service.js',
            't4_theme/static/src/js/t4_sidebar.js',
            't4_theme/static/src/js/t4_webclient_patch.js',
            't4_theme/static/src/js/t4_form_patch.js',
            't4_theme/static/src/js/t4_view_patches.js',
            't4_theme/static/src/js/t4_navbar_patch.js',
            't4_theme/static/src/js/theme_panel.js',
            't4_theme/static/src/js/theme_systray.js',
            't4_theme/static/src/xml/t4_sidebar.xml',
            't4_theme/static/src/xml/theme_panel.xml',
            't4_theme/static/src/xml/theme_systray.xml',
        ],
        # Dark mode: all dark SCSS in one bundle only (NOT in _assets_primary_variables
        # which would break light mode since it's shared between both bundles).
        'web.assets_web_dark': [
            # Primary variable overrides BEFORE web's defaults (critical for SCSS compile order)
            ('before', 'web/static/src/scss/primary_variables.scss',
             't4_theme/static/src/scss/dark/primary_variables.dark.scss'),
            # Dark SCSS variable layers
            't4_theme/static/src/scss/variables/_dark.scss',
            't4_theme/static/src/scss/dark/secondary_variables.dark.scss',
            't4_theme/static/src/scss/dark/navbar.variables.dark.scss',
            # Bootstrap overrides for dark
            't4_theme/static/src/scss/dark/bootstrap_overridden.dark.scss',
            't4_theme/static/src/scss/dark/bs_functions_overrides.dark.scss',
            # Component dark styles
            't4_theme/static/src/scss/components/_navbar.dark.scss',
            't4_theme/static/src/scss/components/_sidebar.dark.scss',
            't4_theme/static/src/scss/dark/custom_styles.dark.scss',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
}
