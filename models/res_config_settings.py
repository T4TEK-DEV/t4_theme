import logging

from odoo import fields, models

_logger = logging.getLogger(__name__)


class ResConfigSettings(models.TransientModel):

    _inherit = 'res.config.settings'

    #----------------------------------------------------------
    # Fields - Theme Preset
    #----------------------------------------------------------

    theme_preset = fields.Selection(
        related='company_id.theme_preset',
        readonly=False,
    )

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

    t4_web_title = fields.Char(
        related='company_id.t4_web_title',
        readonly=False,
    )

    t4_brand_name = fields.Char(
        related='company_id.t4_brand_name',
        readonly=False,
    )

    t4_url_prefix = fields.Char(
        related='company_id.t4_url_prefix',
        readonly=False,
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
    # Fields - Typography (per-company)
    #----------------------------------------------------------

    theme_font_family = fields.Selection(
        related='company_id.theme_font_family',
        readonly=False,
    )

    theme_font_size = fields.Char(
        related='company_id.theme_font_size',
        readonly=False,
    )

    theme_home_menu_overlay = fields.Boolean(
        related='company_id.theme_home_menu_overlay',
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

    def action_apply_theme_preset(self):
        self.company_id.action_apply_theme_preset()
        return {
            'type': 'ir.actions.client',
            'tag': 'reload',
        }

    def action_reset_theme_colors(self):
        from .res_company import THEME_PRESETS
        self.company_id.write(THEME_PRESETS['default'])
        return {
            'type': 'ir.actions.client',
            'tag': 'reload',
        }
