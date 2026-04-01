# -*- coding: utf-8 -*-
from __future__ import annotations

import logging

from odoo import api, models
from odoo.http import request

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

    def session_info(self) -> dict:
        """Inject t4_theme config and presets into session_info.

        This eliminates the need for a separate RPC call on page load,
        following the pattern used by udoo_om_ux.
        """
        result = super().session_info()
        if not request or not request.session.uid:
            return result
        try:
            ThemeConfig = self.env['t4.theme.config']
            config_data = ThemeConfig.get_config_for_company()
            presets = self.env['t4.theme.preset'].sudo().search([])
            preset_list = [{**p.to_dict(), 'id': p.id} for p in presets]
            result['t4_theme'] = {
                'config': config_data,
                'presets': preset_list,
            }
        except Exception:
            _logger.warning('Failed to load t4_theme config for session_info', exc_info=True)
        return result
