from odoo import http
from odoo.http import request
from odoo.addons.web.controllers.home import Home
from odoo.addons.web.controllers.utils import is_user_internal
from .url_rewrite import url_prefix


class T4Home(Home):

    @http.route('/', type='http', auth="none")
    def index(self, s_action=None, db=None, **kw):
        if request.db and request.session.uid and not is_user_internal(request.session.uid):
            return request.redirect_query('/web/login_successful', query=request.params)
        prefix = url_prefix[0]
        redirect_to = f'/{prefix}' if prefix and prefix != 'odoo' else '/odoo'
        return request.redirect_query(redirect_to, query=request.params)
