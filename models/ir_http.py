# -*- coding: utf-8 -*-
from __future__ import annotations

import logging

from odoo import models

_logger = logging.getLogger(__name__)


class IrHttp(models.AbstractModel):
    _inherit = 'ir.http'

    def color_scheme(self) -> str:
        """Override to return actual theme config instead of hardcoded 'light'.

        Falls back to 'light' if no config exists or color_scheme is 'auto'
        (auto is handled client-side via JS matchMedia).
        """
        config = self.env['t4.theme.config'].sudo().search(
            [
                ('company_id', '=', self.env.company.id),
                ('is_active', '=', True),
            ],
            limit=1,
        )
        if not config:
            return 'light'
        scheme = config.color_scheme
        # 'auto' must be resolved client-side; server defaults to 'light'
        if scheme == 'auto':
            return 'light'
        return scheme
