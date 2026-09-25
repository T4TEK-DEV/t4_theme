from odoo import http
from odoo.http import request
from odoo.addons.web.controllers.home import Home
from .url_rewrite import url_prefix


# 🔴 KHÔNG ghi đè route '/' ở đây. Xem docstring T4Home.
#
# Tiền tố URL tuỳ biến vẫn chạy mà không cần chạm '/': core Home.index đưa
# '/' → '/odoo', rồi web_client() bên dưới bắt '/odoo' và đưa tiếp về
# '/{prefix}'. Thêm một nhịp chuyển hướng, đổi lại không đụng gì tới '/'.


class T4Home(Home):
    """Chỉ nhận '/web', '/odoo', '/scoped_app' — CỐ Ý không nhận '/'.

    Hai lần hỏng vì route này (25/09/2026, demo.sqc.t4tek.co):

    1. Bản đầu ghi đè `index()` và redirect '/odoo' VÔ ĐIỀU KIỆN. Module
       `website` cũng ghi đè đúng `index()` đó (`Website(Home)`) để phục vụ
       trang chủ public; cùng gốc `Home` nên bản nạp sau thắng → trang chủ
       biến thành cú nhảy vào backend.

    2. Bản vá thứ nhất giữ route nhưng cho thân hàm gọi `super().index()`.
       VẪN HỎNG, vì thứ phải nhường không chỉ là thân hàm mà là **chính việc
       đăng ký route**: route ở đây khai `auth="none"` (không bind user →
       `request.env.user` RỖNG) và thiếu `website=True`, trong khi
       `Website.index` khai `auth="public", website=True, sitemap=True`. Kết
       quả: `_serve_page()` → `_allow_to_use_cache()` →
       `res.users._is_public()` → `ensure_one()` nổ
       `ValueError: Expected singleton: res.users()`.

    Bài học: sao chép route của người khác thì phải sao chép CẢ cờ auth và
    cờ routing, không chỉ thân hàm. Rẻ hơn và chắc hơn là đừng chiếm route.
    """

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
