from odoo import http
from odoo.addons.web.controllers.session import Session
from .url_rewrite import url_prefix


class T4Session(Session):

    @http.route('/web/session/logout', type='http', auth="none")
    def logout(self, redirect=None):
        if not redirect:
            prefix = url_prefix[0]
            if prefix and prefix != 'odoo':
                redirect = f'/{prefix}'
        return super().logout(redirect=redirect or '/odoo')
