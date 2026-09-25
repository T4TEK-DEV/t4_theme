# -*- coding: utf-8 -*-
"""Route '/' không được chiếm của module `website`.

Sự cố 25/09/2026 trên demo.sqc.t4tek.co: cài t4_theme lên instance có
`website` → vào trang chủ public là nhảy thẳng vào backend. Nguyên nhân:
`T4Home(Home)` ghi đè `index()` và redirect `/odoo` VÔ ĐIỀU KIỆN, trong khi
`website/controllers/main.py::Website(Home)` cũng ghi đè `index()` để phục vụ
trang chủ. Cùng gốc `Home`, bản nào nạp sau thì thắng.

Cái chốt ở đây: KHÔNG có tiền tố URL tuỳ biến thì module này không có việc gì
ở route '/' — phải nhường cho lớp dưới.
"""
import os
import re

from odoo.tests import TransactionCase, tagged

from odoo.addons.t4_theme.controllers.home import index_redirect_target

_HOME_PY = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', 'controllers', 'home.py')


@tagged('post_install', '-at_install', 't4_theme', 't4_theme_route')
class TestHomeRouteDelegation(TransactionCase):

    def test_no_custom_prefix_delegates_to_super(self):
        """Chưa đặt t4_theme.url_prefix → trả None = nhường route.

        Đây chính là cấu hình mặc định, và là trường hợp đã phá sqc: prefix
        rỗng mà vẫn redirect vào backend.
        """
        for prefix in ('', None, 'odoo'):
            with self.subTest(prefix=prefix):
                self.assertIsNone(
                    index_redirect_target(prefix),
                    'prefix %r phải nhường route cho website/core, không được '
                    'tự redirect' % (prefix,),
                )

    def test_custom_prefix_still_redirects(self):
        """Có đặt tiền tố riêng thì vẫn phải đưa về đúng tiền tố đó."""
        self.assertEqual(index_redirect_target('erp'), '/erp')
        self.assertEqual(index_redirect_target('  erp  '), '/erp')

    def test_index_actually_calls_super(self):
        """Chốt ở mức nguồn: index() phải có nhánh gọi super().

        Hàm thuần ở trên có trả None mấy cũng vô nghĩa nếu controller không
        thực sự uỷ quyền xuống lớp dưới.
        """
        with open(_HOME_PY, encoding='utf-8') as fh:
            source = fh.read()
        body = source.split('def index(', 1)[1].split('\n    @http.route', 1)[0]
        self.assertTrue(
            re.search(r'return\s+super\(\)\.index\(', body),
            'T4Home.index phải gọi super().index() khi không có tiền tố tuỳ '
            'biến — nếu không nó chiếm mất trang chủ của module website.',
        )
