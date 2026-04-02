from odoo import models, fields


class ResCompany(models.Model):

    _inherit = 'res.company'

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
