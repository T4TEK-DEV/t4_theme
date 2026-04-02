from odoo import models, fields


THEME_PRESETS = {
    'default': {
        'theme_color_brand': '#243742',
        'theme_color_primary': '#5D8DA8',
        'theme_color_success': '#28A745',
        'theme_color_info': '#17A2B8',
        'theme_color_warning': '#FFAC00',
        'theme_color_danger': '#DC3545',
        'theme_color_appsmenu_text': '#F8F9FA',
        'theme_color_appbar_text': '#DEE2E6',
        'theme_color_appbar_active': '#5D8DA8',
        'theme_color_appbar_background': '#111827',
    },
    'hqg': {
        'theme_color_brand': '#173b77',
        'theme_color_primary': '#007ad1',
        'theme_color_success': '#62ab00',
        'theme_color_info': '#00aff2',
        'theme_color_warning': '#febd00',
        'theme_color_danger': '#e53935',
        'theme_color_appsmenu_text': '#FFFFFF',
        'theme_color_appbar_text': '#DEE2E6',
        'theme_color_appbar_active': '#007ad1',
        'theme_color_appbar_background': '#173b77',
    },
    'ocean': {
        'theme_color_brand': '#0D4F8B',
        'theme_color_primary': '#0EA5E9',
        'theme_color_success': '#10B981',
        'theme_color_info': '#06B6D4',
        'theme_color_warning': '#F59E0B',
        'theme_color_danger': '#EF4444',
        'theme_color_appsmenu_text': '#F0F9FF',
        'theme_color_appbar_text': '#BAE6FD',
        'theme_color_appbar_active': '#0EA5E9',
        'theme_color_appbar_background': '#0C4A6E',
    },
    'forest': {
        'theme_color_brand': '#14532D',
        'theme_color_primary': '#16A34A',
        'theme_color_success': '#22C55E',
        'theme_color_info': '#0891B2',
        'theme_color_warning': '#EAB308',
        'theme_color_danger': '#DC2626',
        'theme_color_appsmenu_text': '#F0FDF4',
        'theme_color_appbar_text': '#BBF7D0',
        'theme_color_appbar_active': '#16A34A',
        'theme_color_appbar_background': '#1A3A2A',
    },
    'sunset': {
        'theme_color_brand': '#7C2D12',
        'theme_color_primary': '#EA580C',
        'theme_color_success': '#16A34A',
        'theme_color_info': '#0284C7',
        'theme_color_warning': '#F59E0B',
        'theme_color_danger': '#DC2626',
        'theme_color_appsmenu_text': '#FFF7ED',
        'theme_color_appbar_text': '#FED7AA',
        'theme_color_appbar_active': '#EA580C',
        'theme_color_appbar_background': '#431407',
    },
    'slate': {
        'theme_color_brand': '#1E293B',
        'theme_color_primary': '#6366F1',
        'theme_color_success': '#22C55E',
        'theme_color_info': '#3B82F6',
        'theme_color_warning': '#F59E0B',
        'theme_color_danger': '#EF4444',
        'theme_color_appsmenu_text': '#F8FAFC',
        'theme_color_appbar_text': '#CBD5E1',
        'theme_color_appbar_active': '#6366F1',
        'theme_color_appbar_background': '#0F172A',
    },
}


class ResCompany(models.Model):

    _inherit = 'res.company'

    #----------------------------------------------------------
    # Fields - Theme Preset
    #----------------------------------------------------------

    theme_preset = fields.Selection(
        selection=[
            ('default', 'Default'),
            ('hqg', 'HQG Blue'),
            ('ocean', 'Ocean'),
            ('forest', 'Forest'),
            ('sunset', 'Sunset'),
            ('slate', 'Slate Professional'),
        ],
        string='Theme Preset',
        default='default',
    )

    #----------------------------------------------------------
    # Fields - Images
    #----------------------------------------------------------

    appbar_image = fields.Binary(
        string='Apps Menu Footer Image',
        attachment=True
    )

    favicon = fields.Binary(
        string="Company Favicon",
        attachment=True
    )

    t4_web_title = fields.Char(
        string='Web Title',
        default='T4 ERP',
        help='Custom browser tab title per company.',
    )

    background_image = fields.Binary(
        string='Apps Menu Background Image',
        attachment=True
    )

    #----------------------------------------------------------
    # Fields - Brand Colors
    #----------------------------------------------------------

    theme_color_brand = fields.Char(
        string='Brand Color',
        default='#243742',
    )

    theme_color_primary = fields.Char(
        string='Primary Color',
        default='#5D8DA8',
    )

    #----------------------------------------------------------
    # Fields - Context Colors
    #----------------------------------------------------------

    theme_color_success = fields.Char(
        string='Success Color',
        default='#28A745',
    )

    theme_color_info = fields.Char(
        string='Info Color',
        default='#17A2B8',
    )

    theme_color_warning = fields.Char(
        string='Warning Color',
        default='#FFAC00',
    )

    theme_color_danger = fields.Char(
        string='Danger Color',
        default='#DC3545',
    )

    #----------------------------------------------------------
    # Fields - AppsBar / Menu Colors
    #----------------------------------------------------------

    theme_color_appsmenu_text = fields.Char(
        string='Apps Menu Text Color',
        default='#F8F9FA',
    )

    theme_color_appbar_text = fields.Char(
        string='AppsBar Text Color',
        default='#DEE2E6',
    )

    theme_color_appbar_active = fields.Char(
        string='AppsBar Active Color',
        default='#5D8DA8',
    )

    theme_color_appbar_background = fields.Char(
        string='AppsBar Background Color',
        default='#111827',
    )

    #----------------------------------------------------------
    # Actions
    #----------------------------------------------------------

    def action_apply_theme_preset(self):
        for company in self:
            preset = THEME_PRESETS.get(company.theme_preset, THEME_PRESETS['default'])
            company.write(preset)
