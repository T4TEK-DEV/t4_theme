from odoo import http
from odoo.http import request
from odoo.addons.web.controllers.home import Home
from odoo.addons.web.controllers.utils import is_user_internal


class T4Home(Home):

    @http.route('/', type='http', auth="none")
    def index(self, s_action=None, db=None, **kw):
        if request.db and request.session.uid and not is_user_internal(request.session.uid):
            return request.redirect_query('/web/login_successful', query=request.params)
        prefix = self._get_url_prefix()
        return request.redirect_query(prefix, query=request.params)

    @classmethod
    def _get_url_prefix(cls):
        """Get custom URL prefix from company settings."""
        try:
            prefix = request.env.company.sudo().t4_url_prefix
            if prefix:
                prefix = prefix.strip().strip('/')
                if prefix:
                    return f'/{prefix}'
        except Exception:
            pass
        return '/odoo'
