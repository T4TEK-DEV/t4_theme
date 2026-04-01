# -*- coding: utf-8 -*-
from __future__ import annotations

import logging

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)


class T4ThemeController(http.Controller):
    """REST endpoint for the frontend JS theme service."""

    @http.route(
        '/t4/theme/config',
        type='json',
        auth='user',
        methods=['POST'],
    )
    def get_theme_config(self, company_id: int | None = None) -> dict:
        """Return theme config for the given company (or current company).

        Called by t4ThemeService on startup and company switch.
        """
        ThemeConfig = request.env['t4.theme.config']
        return ThemeConfig.get_config_for_company(company_id)

    @http.route(
        '/t4/theme/presets',
        type='json',
        auth='user',
        methods=['POST'],
    )
    def get_presets(self) -> list[dict]:
        """Return all available theme presets."""
        presets = request.env['t4.theme.preset'].sudo().search([])
        return [{**p.to_dict(), 'id': p.id} for p in presets]

    @http.route(
        '/t4/theme/config/save',
        type='json',
        auth='user',
        methods=['POST'],
    )
    def save_theme_config(
        self,
        company_id: int | None = None,
        config: dict | None = None,
    ) -> dict:
        """Save theme config from the floating panel.

        Creates config if none exists for the company.
        """
        if not config:
            return {'success': False, 'error': 'No config provided'}

        cid = company_id or request.env.company.id
        ThemeConfig = request.env['t4.theme.config'].sudo()
        existing = ThemeConfig.search(
            [('company_id', '=', cid)], limit=1,
        )
        vals = {
            'color_scheme': config.get('color_scheme', 'light'),
            'primary_color': config.get('primary_color'),
            'secondary_color': config.get('secondary_color'),
            'accent_color': config.get('accent_color'),
            'font_family': config.get('font_family', 'inherit'),
            'sidebar_style': config.get('sidebar_style', 'full'),
            'is_active': True,
        }
        if existing:
            existing.write(vals)
        else:
            vals['company_id'] = cid
            existing = ThemeConfig.create(vals)
        return existing.to_frontend_dict()
