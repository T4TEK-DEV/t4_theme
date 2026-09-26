# -*- coding: utf-8 -*-
"""Màu NỀN nút và màu CHỮ phải là hai biến khác nhau.

Sự cố 26/09/2026 trên demo.sqc.t4tek.co: theme "SQC Theme" đặt
`color_primary = #F7CB74` (vàng, lấy theo nút CTA của trang public). Nhưng
`--t4-color-primary` lúc đó làm HAI việc cùng lúc — vừa là nền `.btn-primary`,
vừa là màu chữ của link và `.text-primary`. Hệ quả: chữ vàng trên nền trắng chỉ
đạt **1,5 : 1**, trong khi WCAG đòi 4,5 : 1 cho chữ thường. Người dùng báo
"khó nhìn lắm".

Cách chữa: `theme_color_service.js` tính thêm hai biến dẫn xuất
(`--t4-color-on-primary`, `--t4-color-text-accent`) theo độ tương phản thật, và
SCSS dùng đúng biến cho đúng vai trò. Cả hai đều có fallback nên instance chưa
nạp JS mới giữ nguyên hành vi cũ.

Test đọc text vì module không có hạ tầng test JS — đủ để bắt việc ai đó gỡ mất
phần tách biến, là kiểu hỏng âm thầm (không lỗi, chỉ là chữ lại khó đọc).
"""
import os
import re

from odoo.tests import TransactionCase, tagged

_HERE = os.path.dirname(os.path.abspath(__file__))
_SCSS = os.path.join(_HERE, '..', 'static', 'src', 'services', 'theme_colors.scss')
_JS = os.path.join(_HERE, '..', 'static', 'src', 'services', 'theme_color_service.js')


def _read(path):
    with open(path, encoding='utf-8') as fh:
        return fh.read()


@tagged('post_install', '-at_install', 't4_theme', 't4_theme_contrast')
class TestThemeContrastSplit(TransactionCase):

    def test_primary_button_sets_its_own_text_color(self):
        """`.btn-primary` phải khai `--bs-btn-color`, không để Bootstrap tự quyết.

        Bootstrap tính màu chữ nút lúc BIÊN DỊCH SCSS, theo primary mặc định của
        Odoo — không biết gì về primary chạy lúc runtime. Primary sáng thì chữ
        trắng mặc định là không đọc được.
        """
        scss = _read(_SCSS)
        block = scss.split('.btn-primary {', 1)[1].split('}', 1)[0]
        self.assertIn(
            '--bs-btn-color: var(--t4-color-on-primary', block,
            '.btn-primary phải đặt màu chữ theo --t4-color-on-primary',
        )

    def test_links_do_not_use_raw_primary(self):
        """Link và .text-primary phải đi qua --t4-color-text-accent."""
        scss = _read(_SCSS)
        block = scss.split('// --- Links & Accents ---', 1)[1].split('// ---', 1)[0]
        # `(?<!-)` để không dính `background-color:` — nền thì dùng primary là
        # đúng, chỉ chữ mới cần đổi.
        for rule in re.findall(r'(?<!-)color:\s*([^;]+);', block):
            self.assertIn(
                '--t4-color-text-accent', rule,
                'Màu chữ dùng thẳng primary (%s) — primary là màu NỀN nút, trên '
                'nền trắng có thể không đọc được.' % rule.strip(),
            )

    def test_js_derives_both_contrast_vars(self):
        """JS phải tính và set cả hai biến dẫn xuất."""
        js = _read(_JS)
        for var in ('--t4-color-on-primary', '--t4-color-text-accent'):
            self.assertIn(var, js, 'theme_color_service.js không tạo %s' % var)
        self.assertRegex(
            js, r'WCAG_TEXT_MIN\s*=\s*4\.5',
            'Ngưỡng tương phản cho chữ thường phải là 4.5 (WCAG 2.1 AA).',
        )
