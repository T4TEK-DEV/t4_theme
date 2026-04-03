from odoo import http
from odoo.http import request
from odoo.addons.web.controllers.session import Session


class T4Session(Session):

    @http.route('/web/session/logout', type='http', auth="none")
    def logout(self, redirect=None):
        if not redirect:
            try:
                company = request.env.company
                prefix = company.t4_url_prefix
                if prefix:
                    prefix = prefix.strip().strip('/')
                    if prefix:
                        redirect = f'/{prefix}'
            except Exception:
                pass
        return super().logout(redirect=redirect or '/odoo')
