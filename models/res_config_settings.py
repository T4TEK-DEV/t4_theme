from odoo import fields, models


class ResConfigSettings(models.TransientModel):

    _inherit = 'res.config.settings'

    #----------------------------------------------------------
    # Fields - Images
    #----------------------------------------------------------

    appbar_image = fields.Binary(
        related='company_id.appbar_image',
        readonly=False
    )

    theme_favicon = fields.Binary(
        related='company_id.favicon',
        readonly=False
    )

    theme_background_image = fields.Binary(
        related='company_id.background_image',
        readonly=False
    )

    #----------------------------------------------------------
    # Fields - Brand Colors (per-company)
    #----------------------------------------------------------

    theme_color_brand = fields.Char(
        related='company_id.theme_color_brand',
        readonly=False,
    )

    theme_color_primary = fields.Char(
        related='company_id.theme_color_primary',
        readonly=False,
    )

    #----------------------------------------------------------
    # Fields - Context Colors (per-company)
    #----------------------------------------------------------

    theme_color_success = fields.Char(
        related='company_id.theme_color_success',
        readonly=False,
    )

    theme_color_info = fields.Char(
        related='company_id.theme_color_info',
        readonly=False,
    )

    theme_color_warning = fields.Char(
        related='company_id.theme_color_warning',
        readonly=False,
    )

    theme_color_danger = fields.Char(
        related='company_id.theme_color_danger',
        readonly=False,
    )

    #----------------------------------------------------------
    # Fields - AppsBar Colors (per-company)
    #----------------------------------------------------------

    theme_color_appsmenu_text = fields.Char(
        related='company_id.theme_color_appsmenu_text',
        readonly=False,
    )

    theme_color_appbar_text = fields.Char(
        related='company_id.theme_color_appbar_text',
        readonly=False,
    )

    theme_color_appbar_active = fields.Char(
        related='company_id.theme_color_appbar_active',
        readonly=False,
    )

    theme_color_appbar_background = fields.Char(
        related='company_id.theme_color_appbar_background',
        readonly=False,
    )

    #----------------------------------------------------------
    # Action
    #----------------------------------------------------------

    def action_reset_theme_colors(self):
        self.company_id.write({
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
        })
        return {
            'type': 'ir.actions.client',
            'tag': 'reload',
        }
