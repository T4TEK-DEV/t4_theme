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

    @http.route(
        ['/web', '/odoo', '/odoo/<path:subpath>', '/scoped_app/<path:subpath>'],
        type='http', auth="none",
    )
    def web_client(self, s_action=None, **kw):
        prefix = url_prefix[0]
        if prefix and prefix != 'odoo':
            path = request.httprequest.path
            # Redirect anything that is NOT /{current_prefix} to /{prefix}
            if not path.startswith(f'/{prefix}/') and path != f'/{prefix}':
                # Extract subpath after the first segment
                parts = path.strip('/').split('/', 1)
                rest = parts[1] if len(parts) > 1 else ''
                new_path = f'/{prefix}/{rest}' if rest else f'/{prefix}'
                qs = request.httprequest.query_string.decode()
                redirect_url = f'{new_path}?{qs}' if qs else new_path
                return request.redirect(redirect_url, 302)
        return super().web_client(s_action=s_action, **kw)
