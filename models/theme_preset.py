from odoo import api, fields, models


class ThemePreset(models.Model):
    _name = 't4_theme.preset'
    _description = 'Theme Preset'
    _order = 'sequence, name'

    name = fields.Char(string='Name', required=True)
    sequence = fields.Integer(string='Sequence', default=10)
    is_default = fields.Boolean(string='Built-in', default=False, readonly=True)
    company_id = fields.Many2one(
        'res.company',
        string='Company',
        help='If set, preset is only visible to this company. Empty = shared.',
    )

    # Colors (10 fields)
    color_brand = fields.Char(string='Brand Color', default='#243742')
    color_primary = fields.Char(string='Primary Color', default='#5D8DA8')
    color_success = fields.Char(string='Success Color', default='#28A745')
    color_info = fields.Char(string='Info Color', default='#17A2B8')
    color_warning = fields.Char(string='Warning Color', default='#FFAC00')
    color_danger = fields.Char(string='Danger Color', default='#DC3545')
    color_appsmenu_text = fields.Char(string='Apps Menu Text', default='#F8F9FA')
    color_appbar_text = fields.Char(string='Sidebar Text', default='#DEE2E6')
    color_appbar_active = fields.Char(string='Sidebar Active', default='#5D8DA8')
    color_appbar_background = fields.Char(string='Sidebar Background', default='#111827')

    # Typography
    font_family = fields.Char(string='Font Family', default='system')

    # View overrides (full JSON)
    view_overrides = fields.Json(
        string='View Overrides',
        default=dict,
        help='CSS overrides grouped by view category.',
    )

    # Computed preview color for thumbnail
    preview_color = fields.Char(
        string='Preview Color',
        compute='_compute_preview_color',
        store=True,
    )

    @api.depends('color_primary')
    def _compute_preview_color(self):
        for rec in self:
            rec.preview_color = rec.color_primary or '#5D8DA8'

    def to_export_dict(self):
        """Export preset as AI-friendly JSON dict with descriptions."""
        self.ensure_one()

        # Group view_overrides by category
        overrides = self.view_overrides or {}
        grouped = {}
        for key, value in overrides.items():
            sep = key.find('|||')
            if sep < 0:
                continue
            selector = key[:sep]
            # Determine category from selector
            category = self._categorize_selector(selector)
            if category not in grouped:
                grouped[category] = {}
            grouped[category][key] = value

        return {
            '$schema': 't4_theme/1.0',
            '$description': (
                'T4 Theme configuration file for Odoo 19. '
                'Each color key maps to a CSS variable. '
                'view_overrides use compound keys: cssSelector|||cssProperty. '
                'Give this file to an AI with a reference website URL to auto-fill values.'
            ),
            'name': self.name,
            'version': '1.0',
            'colors': {
                'brand': {
                    'value': self.color_brand or '',
                    'css_var': '--t4-color-brand',
                    'description': 'Main brand color — used in navbar, primary buttons, key UI accents',
                },
                'primary': {
                    'value': self.color_primary or '',
                    'css_var': '--t4-color-primary',
                    'description': 'Primary action color — links, active states, hover highlights',
                },
                'success': {
                    'value': self.color_success or '',
                    'css_var': '--t4-color-success',
                    'description': 'Success/positive state — confirmations, completed status',
                },
                'info': {
                    'value': self.color_info or '',
                    'css_var': '--t4-color-info',
                    'description': 'Informational state — neutral info badges, tooltips',
                },
                'warning': {
                    'value': self.color_warning or '',
                    'css_var': '--t4-color-warning',
                    'description': 'Warning state — attention needed, pending actions',
                },
                'danger': {
                    'value': self.color_danger or '',
                    'css_var': '--t4-color-danger',
                    'description': 'Danger/error state — destructive actions, errors',
                },
                'appsmenu_text': {
                    'value': self.color_appsmenu_text or '',
                    'css_var': '--t4-color-appsmenu-text',
                    'description': 'Apps sidebar menu text color',
                },
                'appbar_text': {
                    'value': self.color_appbar_text or '',
                    'css_var': '--t4-color-appbar-text',
                    'description': 'Left sidebar navigation text color',
                },
                'appbar_active': {
                    'value': self.color_appbar_active or '',
                    'css_var': '--t4-color-appbar-active',
                    'description': 'Active/selected item highlight in left sidebar',
                },
                'appbar_background': {
                    'value': self.color_appbar_background or '',
                    'css_var': '--t4-color-appbar-background',
                    'description': 'Left sidebar background color',
                },
            },
            'typography': {
                'font_family': {
                    'value': self.font_family or 'system',
                    'description': (
                        'Font family key. Options: system, inter, roboto, open_sans, lato, '
                        'nunito, poppins, montserrat, raleway, dm_sans, plus_jakarta, etc.'
                    ),
                },
            },
            'view_overrides': grouped,
        }

    @staticmethod
    def _categorize_selector(selector):
        """Categorize a CSS selector into a view category."""
        s = selector.lower()
        if 'kanban' in s:
            return 'kanban'
        if 'list' in s or 'data_row' in s:
            return 'list'
        if 'form' in s or 'sheet' in s or 'statusbar' in s or 'stat_button' in s:
            return 'form'
        if 'calendar' in s:
            return 'calendar'
        if 'pivot' in s:
            return 'pivot'
        if 'graph' in s:
            return 'graph'
        if 'chatter' in s or 'mail' in s:
            return 'chatter'
        if 'modal' in s or 'dialog' in s:
            return 'modal'
        if 'navbar' in s or 'control_panel' in s or 'breadcrumb' in s or 'btn' in s or 'dropdown' in s:
            return 'global'
        return 'other'

    @api.model
    def from_import_dict(self, data, company_id=None):
        """Create a preset from an imported JSON dict."""
        colors = data.get('colors', {})
        typography = data.get('typography', {})
        raw_overrides = data.get('view_overrides', {})

        # Flatten grouped overrides back to compound keys
        flat_overrides = {}
        for category_data in raw_overrides.values():
            if isinstance(category_data, dict):
                flat_overrides.update(category_data)

        vals = {
            'name': data.get('name', 'Imported Theme'),
            'is_default': False,
            'company_id': company_id,
            'color_brand': colors.get('brand', {}).get('value', ''),
            'color_primary': colors.get('primary', {}).get('value', ''),
            'color_success': colors.get('success', {}).get('value', ''),
            'color_info': colors.get('info', {}).get('value', ''),
            'color_warning': colors.get('warning', {}).get('value', ''),
            'color_danger': colors.get('danger', {}).get('value', ''),
            'color_appsmenu_text': colors.get('appsmenu_text', {}).get('value', ''),
            'color_appbar_text': colors.get('appbar_text', {}).get('value', ''),
            'color_appbar_active': colors.get('appbar_active', {}).get('value', ''),
            'color_appbar_background': colors.get('appbar_background', {}).get('value', ''),
            'font_family': typography.get('font_family', {}).get('value', 'system'),
            'view_overrides': flat_overrides,
        }
        return self.create(vals)
