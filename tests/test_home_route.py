# -*- coding: utf-8 -*-
"""t4_theme KHÔNG được đăng ký route '/'.

Hỏng hai lần trong cùng một ngày (25/09/2026, demo.sqc.t4tek.co):

1. `T4Home.index` redirect '/odoo' vô điều kiện → trên instance có `website`,
   trang chủ public biến thành cú nhảy vào backend. Cùng gốc `Home`, bản nạp
   sau thắng.
2. Vá lần một: giữ route, cho thân hàm gọi `super().index()`. VẪN HỎNG —
   route ở t4_theme khai `auth="none"` nên `request.env.user` RỖNG, trong khi
   `Website.index` cần `auth="public"`; `_allow_to_use_cache()` gọi
   `res.users._is_public()` → `ensure_one()` nổ "Expected singleton".

Kết luận: thứ phải nhường là **việc đăng ký route**, không chỉ thân hàm. Test
này chốt đúng điều đó ở mức nguồn — không cần dựng HTTP, và bắt được cả hai
kiểu hỏng trên.
"""
import os
import re

from odoo.tests import TransactionCase, tagged

_HOME_PY = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', 'controllers', 'home.py')

# @http.route('/') hoặc @http.route(['/', ...]) — bắt cả hai dạng khai báo.
_RE_ROOT_ROUTE = re.compile(r"""@http\.route\(\s*\[?\s*['"]/['"]""")


def _read_home():
    with open(_HOME_PY, encoding='utf-8') as fh:
        return fh.read()


@tagged('post_install', '-at_install', 't4_theme', 't4_theme_route')
class TestHomeRouteNotClaimed(TransactionCase):

    def test_does_not_register_root_route(self):
        """Không được có @http.route cho '/' trong home.py."""
        self.assertIsNone(
            _RE_ROOT_ROUTE.search(_read_home()),
            "t4_theme đăng ký lại route '/' — sẽ chiếm mất trang chủ của "
            "module `website`. Tiền tố URL tuỳ biến không cần chạm '/': core "
            "đưa '/' → '/odoo', rồi web_client() ở đây đưa tiếp về '/{prefix}'.",
        )

    def test_still_handles_odoo_route_for_prefix_redirect(self):
        """Nhưng vẫn phải giữ '/odoo' — đó là chỗ tiền tố tuỳ biến hoạt động.

        Nếu ai đó "dọn" luôn route này thì tính năng đổi tiền tố chết âm thầm:
        không lỗi, chỉ là URL không bao giờ đổi sang tiền tố đã cấu hình.
        """
        source = _read_home()
        self.assertIn("'/odoo'", source)
        self.assertRegex(source, r'def web_client\(')

    def test_root_route_still_served_by_someone(self):
        """Gỡ route ở t4_theme rồi thì '/' vẫn phải có người phục vụ.

        Đọc thẳng routing map của instance thay vì tin vào suy luận: tuỳ instance
        có `website` hay không mà chủ route khác nhau, nhưng KHÔNG được là
        t4_theme.
        """
        rules = [
            r for r in self.env['ir.http'].routing_map().iter_rules()
            if r.rule == '/'
        ]
        self.assertTrue(rules, "Không còn ai phục vụ route '/'")
        for rule in rules:
            self.assertNotIn(
                't4_theme', getattr(rule.endpoint, '__module__', ''),
                "route '/' vẫn đang do t4_theme phục vụ",
            )
