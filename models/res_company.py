from odoo import models, fields


class ResCompany(models.Model):

    _inherit = 'res.company'

    #----------------------------------------------------------
    # Fields
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
