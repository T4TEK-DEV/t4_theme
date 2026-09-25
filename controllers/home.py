from odoo import http
from odoo.http import request
from odoo.addons.web.controllers.home import Home
from odoo.addons.web.controllers.utils import is_user_internal
from .url_rewrite import url_prefix


def index_redirect_target(prefix):
    """Đích redirect cho route '/', hoặc None = NHƯỜNG route cho lớp dưới.

    Tách ra khỏi controller để test được thẳng, không cần dựng `request`.

    🔴 Trả None khi chưa đặt tiền tố tuỳ biến là điểm mấu chốt. Trước 25/09/2026
    hàm này luôn redirect về `/odoo`, kể cả khi module không dùng tính năng
    tiền tố — tức là nó CHIẾM route '/' vô cớ. Trên instance có module
    `website`, `Website(Home).index` cũng ghi đè đúng route đó để phục vụ trang
    chủ public; hai class cùng gốc `Home` nên bản nạp sau thắng, và trang chủ
    biến thành cú nhảy vào backend (đo thật trên demo.sqc.t4tek.co).
    """
    prefix = (prefix or '').strip().strip('/')
    if not prefix or prefix == 'odoo':
        return None
    return f'/{prefix}'


class T4Home(Home):

    @http.route('/', type='http', auth="none")
    def index(self, s_action=None, db=None, **kw):
        target = index_redirect_target(url_prefix[0])
        if target is None:
            # Nhường route. Có `website` → Website.index phục vụ trang chủ
            # public; không có → Home.index của core, vốn redirect '/odoo'
            # y hệt nhánh cũ. Nên instance KHÔNG cài website không đổi hành vi.
            return super().index(s_action=s_action, db=db, **kw)
        if request.db and request.session.uid and not is_user_internal(request.session.uid):
            return request.redirect_query('/web/login_successful', query=request.params)
        return request.redirect_query(target, query=request.params)

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
