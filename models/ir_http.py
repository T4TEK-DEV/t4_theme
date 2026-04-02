from odoo import models


class IrHttp(models.AbstractModel):

    _inherit = "ir.http"

    #----------------------------------------------------------
    # Functions
    #----------------------------------------------------------

    def session_info(self):
        result = super().session_info()
        if self.env.user._is_internal():
            for company in self.env.user.company_ids.with_context(bin_size=True):
                result['user_companies']['allowed_companies'][company.id].update({
                    'has_appsbar_image': bool(company.appbar_image),
                    'has_background_image': bool(company.background_image),
                })
        result['chatter_position'] = self.env.user.chatter_position
        result['dialog_size'] = self.env.user.dialog_size
        result['pager_autoload_interval'] = int(
            self.env['ir.config_parameter'].sudo().get_param(
                'muk_web_refresh.pager_autoload_interval',
                default=30000
            )
        )
        return result
