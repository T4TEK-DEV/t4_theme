from odoo import http
from odoo.http import request
from odoo.addons.web.controllers.session import Session


class T4Session(Session):

    @http.route('/web/session/logout', type='http', auth="none")
    def logout(self, redirect=None):
        if not redirect:
            try:
                prefix = request.env['ir.config_parameter'].sudo().get_param(
                    't4_theme.url_prefix', ''
                )
                if prefix:
                    prefix = prefix.strip().strip('/')
                    if prefix:
                        redirect = f'/{prefix}'
            except Exception:
                pass
        return super().logout(redirect=redirect or '/odoo')
