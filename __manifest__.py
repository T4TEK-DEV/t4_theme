{
    'name': 'T4 Backend Theme',
    'summary': 'Odoo Community Backend Theme',
    'description': '''
        This module offers a mobile compatible design for Odoo Community.
        Furthermore it allows the user to define some design preferences.
        Includes: AppsBar sidebar, Chatter enhancements, Color customization,
        Dialog fullscreen, Group expand/collapse, View refresh.
    ''',
    'version': '1.0',
    'category': 'Themes/Backend',
    'license': 'LGPL-3',
    'author': 'T4Tek',
    'depends': [
        'web',
        'mail',
        'bus',
        'base_setup',
        'base_automation',
    ],
    'excludes': [
        'web_enterprise',
    ],
    'data': [
        'templates/web_layout.xml',
        'templates/webclient.xml',
        'views/res_config_settings.xml',
        'views/res_users.xml',
        'views/ir_actions_server_views.xml',
    ],
    'demo': [
        'demo/base_automation.xml',
        'demo/ir_actions_server.xml',
    ],
    'assets': {
        # ============================================================
        # Primary Variables
        # ============================================================
        'web._assets_primary_variables': [
            # Colors (light mode base)
            ('prepend', 't4_theme/static/src/colors/scss/colors.scss'),
            (
                'before',
                't4_theme/static/src/colors/scss/colors.scss',
                't4_theme/static/src/colors/scss/colors_light.scss',
            ),
            # AppsBar variables
            't4_theme/static/src/appsbar/scss/variables.scss',
            # Chatter variables (form max-width overrides)
            (
                'after',
                'web/static/src/scss/primary_variables.scss',
                't4_theme/static/src/chatter/scss/variables.scss',
            ),
            # Dialog variables (form max-width overrides)
            (
                'after',
                'web/static/src/scss/primary_variables.scss',
                't4_theme/static/src/dialog/scss/variables.scss',
            ),
            # Theme colors (appsmenu/appbar colors)
            (
                'after',
                'web/static/src/scss/primary_variables.scss',
                't4_theme/static/src/scss/colors.scss',
            ),
            # Theme variables
            (
                'after',
                'web/static/src/scss/primary_variables.scss',
                't4_theme/static/src/scss/variables.scss',
            ),
        ],
        # ============================================================
        # Backend Helpers (mixins)
        # ============================================================
        'web._assets_backend_helpers': [
            't4_theme/static/src/appsbar/scss/mixins.scss',
        ],
        # ============================================================
        # Dark Mode
        # ============================================================
        'web.assets_web_dark': [
            (
                'after',
                't4_theme/static/src/colors/scss/colors.scss',
                't4_theme/static/src/colors/scss/colors_dark.scss',
            ),
            (
                'after',
                't4_theme/static/src/appsbar/scss/variables.scss',
                't4_theme/static/src/appsbar/scss/variables.dark.scss',
            ),
        ],
        # ============================================================
        # Backend Assets
        # ============================================================
        'web.assets_backend': [
            # --- AppsBar ---
            (
                'after',
                'web/static/src/webclient/webclient.js',
                't4_theme/static/src/appsbar/webclient/webclient.js',
            ),
            (
                'after',
                'web/static/src/webclient/webclient.xml',
                't4_theme/static/src/appsbar/webclient/webclient.xml',
            ),
            (
                'after',
                'web/static/src/webclient/webclient.js',
                't4_theme/static/src/appsbar/webclient/menus/app_menu_service.js',
            ),
            (
                'after',
                'web/static/src/webclient/webclient.js',
                't4_theme/static/src/appsbar/webclient/appsbar/appsbar.js',
            ),
            't4_theme/static/src/appsbar/webclient/webclient.scss',
            't4_theme/static/src/appsbar/webclient/appsbar/appsbar.xml',
            't4_theme/static/src/appsbar/webclient/appsbar/appsbar.scss',

            # --- Chatter ---
            't4_theme/static/src/chatter/core/**/*.*',
            't4_theme/static/src/chatter/chatter/*.scss',
            't4_theme/static/src/chatter/chatter/*.xml',
            (
                'after',
                'mail/static/src/chatter/web_portal/chatter.js',
                't4_theme/static/src/chatter/chatter/chatter.js',
            ),
            (
                'after',
                'mail/static/src/core/common/composer.js',
                't4_theme/static/src/chatter/chatter/composer.js',
            ),
            (
                'after',
                'mail/static/src/core/common/store_service.js',
                't4_theme/static/src/chatter/chatter/store_service.js',
            ),
            (
                'after',
                'mail/static/src/chatter/web/form_compiler.js',
                't4_theme/static/src/chatter/views/form/form_compiler.js',
            ),
            't4_theme/static/src/chatter/views/form/form_renderer.js',

            # --- Dialog ---
            (
                'after',
                'web/static/src/core/dialog/dialog.js',
                't4_theme/static/src/dialog/core/dialog/dialog.js',
            ),
            (
                'after',
                'web/static/src/core/dialog/dialog.scss',
                't4_theme/static/src/dialog/core/dialog/dialog.scss',
            ),
            (
                'after',
                'web/static/src/core/dialog/dialog.xml',
                't4_theme/static/src/dialog/core/dialog/dialog.xml',
            ),
            (
                'after',
                'web/static/src/views/view_dialogs/select_create_dialog.js',
                't4_theme/static/src/dialog/views/view_dialogs/select_create_dialog.js',
            ),

            # --- Group Expand/Collapse ---
            't4_theme/static/src/group/search/**/*',

            # --- Refresh ---
            't4_theme/static/src/refresh/core/utils.js',
            't4_theme/static/src/refresh/scss/refresh.scss',
            (
                'after',
                'web/static/src/search/control_panel/control_panel.js',
                't4_theme/static/src/refresh/search/control_panel.js',
            ),
            (
                'after',
                'web/static/src/search/control_panel/control_panel.xml',
                't4_theme/static/src/refresh/search/control_panel.xml',
            ),
            't4_theme/static/src/refresh/services/refresh_service.js',

            # --- Theme (navbar, appsmenu, form styles) ---
            't4_theme/static/src/webclient/**/*.xml',
            't4_theme/static/src/webclient/**/*.scss',
            't4_theme/static/src/webclient/**/*.js',
            't4_theme/static/src/views/**/*.scss',
        ],
        # ============================================================
        # Unit Tests
        # ============================================================
        'web.assets_unit_tests': [
            't4_theme/static/src/appsbar/tests/**/*.test.js',
            't4_theme/static/src/chatter/tests/**/*.test.js',
            't4_theme/static/src/dialog/tests/**/*.test.js',
            't4_theme/static/src/group/search/**/*.js',
            't4_theme/static/src/group/search/**/*.xml',
            't4_theme/static/src/group/tests/**/*.test.js',
            't4_theme/static/src/refresh/tests/**/*.test.js',
            't4_theme/static/tests/**/*.test.js',
        ],
    },
    'images': [
        'static/description/banner.png',
        'static/description/theme_screenshot.png'
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
    'post_init_hook': '_setup_module',
    'uninstall_hook': '_uninstall_cleanup',
}
