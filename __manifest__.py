{
    'name': 'Branding',
    'summary': 'Giao diện Backend cho Odoo Community',
    'description': '''
        Module cung cấp giao diện tương thích di động cho Odoo Community.
        Bao gồm: Thanh ứng dụng bên, Cải tiến Chatter, Màu theo công ty,
        Giao diện có sẵn, Dark mode, Dialog toàn màn hình, Thu gọn/Mở rộng nhóm,
        Làm mới view, Tùy chỉnh thương hiệu.
    ''',
    'version': '19.0.1.0.0',
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
        'security/ir.model.access.csv',
        'templates/web_layout.xml',
        'templates/webclient.xml',
        'templates/debranding.xml',
        'views/res_config_settings.xml',
        'views/res_users.xml',
        'views/ir_actions_server_views.xml',
        'views/t4_theme_demo_views.xml',
        'views/theme_settings_action.xml',
        'data/theme_demo_data.xml',
        'data/theme_preset_data.xml',
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
            # Dark mode base variables (loaded before Odoo's)
            (
                'before',
                'web/static/src/scss/primary_variables.scss',
                't4_theme/static/src/dark/primary_variables.scss',
            ),
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
        # Dark Mode Variables
        # ============================================================
        'web.assets_variables_dark': [
            (
                'before',
                't4_theme/static/src/dark/primary_variables.scss',
                't4_theme/static/src/dark/primary_variables.dark.scss',
            ),
            (
                'before',
                'web/static/src/scss/secondary_variables.scss',
                't4_theme/static/src/dark/secondary_variables.dark.scss',
            ),
            (
                'before',
                'web/static/src/**/*.variables.scss',
                't4_theme/static/src/dark/navbar.variables.dark.scss',
            ),
        ],
        # ============================================================
        # Dark Mode Helpers
        # ============================================================
        'web.assets_backend_helpers_dark': [
            (
                'before',
                'web/static/src/scss/bootstrap_overridden.scss',
                't4_theme/static/src/dark/bootstrap_overridden.dark.scss',
            ),
            (
                'after',
                'web/static/lib/bootstrap/scss/_functions.scss',
                't4_theme/static/src/dark/bs_functions_overrides.dark.scss',
            ),
        ],
        # ============================================================
        # Dark Mode Lazy Load
        # ============================================================
        'web.assets_backend_lazy_dark': [
            ('include', 'web.assets_variables_dark'),
            ('include', 'web.assets_backend_helpers_dark'),
        ],
        # ============================================================
        # Dark Mode Web Assets
        # ============================================================
        'web.assets_web_dark': [
            ('include', 'web.assets_variables_dark'),
            ('include', 'web.assets_backend_helpers_dark'),
            # Existing dark overrides
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
            # Home menu dark mode
            't4_theme/static/src/webclient/home_menu/home_menu.dark.scss',
            't4_theme/static/src/webclient/home_menu/home_menu_background.dark.scss',
            # Dark mode custom styles
            't4_theme/static/src/dark/custom_styles.dark.scss',
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

            # --- Services (per-company colors, dark mode toggle) ---
            't4_theme/static/src/services/theme_color_service.js',
            't4_theme/static/src/services/theme_colors.scss',
            't4_theme/static/src/services/dark_mode_service.js',
            't4_theme/static/src/services/debranding_service.js',
            't4_theme/static/src/services/url_prefix_service.js',

            # --- Theme Editor (CSS Inspector + Builder Sidebar) ---
            't4_theme/static/src/theme_editor/component_registry.js',
            't4_theme/static/src/theme_editor/css_inspector/css_utils.js',
            't4_theme/static/src/theme_editor/css_inspector/option_utils.js',
            't4_theme/static/src/theme_editor/css_inspector/property_group.js',
            't4_theme/static/src/theme_editor/css_inspector/property_group.xml',
            't4_theme/static/src/theme_editor/css_inspector/property_group.scss',
            't4_theme/static/src/theme_editor/css_inspector/css_panel.js',
            't4_theme/static/src/theme_editor/css_inspector/css_panel.xml',
            't4_theme/static/src/theme_editor/css_inspector/css_panel.scss',
            't4_theme/static/src/theme_editor/css_inspector/builder_sidebar.js',
            't4_theme/static/src/theme_editor/css_inspector/builder_sidebar.xml',
            't4_theme/static/src/theme_editor/css_inspector/builder_sidebar.scss',
            't4_theme/static/src/theme_editor/css_inspector/theme_css_inspector.js',
            't4_theme/static/src/theme_editor/css_inspector/theme_css_inspector.xml',
            't4_theme/static/src/theme_editor/css_inspector/theme_css_inspector.scss',

            # --- Shared SCSS variables & mixins ---
            't4_theme/static/src/scss/_t4_variables.scss',
            't4_theme/static/src/scss/_t4_mixins.scss',

            # --- Theme (navbar, appsmenu, form styles) ---
            't4_theme/static/src/webclient/**/*.xml',
            't4_theme/static/src/webclient/**/*.scss',
            't4_theme/static/src/webclient/**/*.js',
            # Exclude dark mode SCSS (loaded in web.assets_web_dark)
            ('remove', 't4_theme/static/src/webclient/home_menu/home_menu.dark.scss'),
            ('remove', 't4_theme/static/src/webclient/home_menu/home_menu_background.dark.scss'),
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
