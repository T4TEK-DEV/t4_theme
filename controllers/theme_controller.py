# -*- coding: utf-8 -*-
from __future__ import annotations

import base64
import io
import logging

try:
    from werkzeug.utils import send_file
except ImportError:
    from odoo.tools._vendor.send_file import send_file

import odoo
from odoo import http
from odoo.http import request, Response
from odoo.tools import file_path
from odoo.tools.mimetypes import guess_mimetype

_logger = logging.getLogger(__name__)


class T4ThemeController(http.Controller):
    """Theme API endpoints and logo serving."""

    # ----------------------------------------------------------------
    # JSON API (for frontend JS service)
    # ----------------------------------------------------------------

    @http.route('/t4/theme/config', type='json', auth='user', methods=['POST'])
    def get_theme_config(self, company_id: int | None = None) -> dict:
        """Return theme config for the given company (or current company)."""
        return request.env['t4.theme.config'].get_config_for_company(company_id)

    @http.route('/t4/theme/presets', type='json', auth='user', methods=['POST'])
    def get_presets(self) -> list[dict]:
        """Return all available theme presets."""
        presets = request.env['t4.theme.preset'].sudo().search([])
        return [{**p.to_dict(), 'id': p.id} for p in presets]

    @http.route('/t4/theme/config/save', type='json', auth='user', methods=['POST'])
    def save_theme_config(
        self,
        company_id: int | None = None,
        config: dict | None = None,
    ) -> dict:
        """Save theme config from the floating panel."""
        if not config:
            return {'success': False, 'error': 'No config provided'}

        cid = company_id or request.env.company.id
        ThemeConfig = request.env['t4.theme.config'].sudo()
        existing = ThemeConfig.search([('company_id', '=', cid)], limit=1)
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

    # ----------------------------------------------------------------
    # Logo route (serves dark/light logo per color_scheme cookie)
    # ----------------------------------------------------------------

    @http.route('/t4/logo', type='http', auth='none', cors='*')
    def t4_logo(self, **kw):
        """Serve company logo matching the current color scheme.

        Reads color_scheme cookie → picks t4_logo_dark or t4_logo_light.
        Falls back to default company logo if custom logo is not set.
        Adapted from udoo_om_ux /uilogo pattern for Odoo 19.
        """
        dbname = request.db
        uid = (request.session.uid if dbname else None) or odoo.SUPERUSER_ID

        if not dbname:
            return self._default_logo_response()

        try:
            registry = odoo.modules.registry.Registry(dbname)
            with registry.cursor() as cr:
                company_id = int(kw['company']) if kw.get('company') else False
                is_dark = request.httprequest.cookies.get('color_scheme') == 'dark'
                field = 't4_logo_dark' if is_dark else 't4_logo_light'

                if company_id:
                    cr.execute(
                        f'SELECT {field}, write_date FROM res_company WHERE id = %s',
                        (company_id,),
                    )
                else:
                    cr.execute(
                        f'SELECT c.{field}, c.write_date '
                        f'FROM res_users u '
                        f'LEFT JOIN res_company c ON c.id = u.company_id '
                        f'WHERE u.id = %s',
                        (uid,),
                    )
                row = cr.fetchone()
                if row and row[0]:
                    image_bytes = base64.b64decode(row[0])
                    mimetype = guess_mimetype(image_bytes, default='image/png')
                    return send_file(
                        io.BytesIO(image_bytes),
                        request.httprequest.environ,
                        download_name='logo.png',
                        mimetype=mimetype,
                        last_modified=row[1],
                        response_class=Response,
                    )
        except Exception:
            _logger.debug('Failed to serve t4 logo, falling back to default', exc_info=True)

        return self._default_logo_response()

    def _default_logo_response(self):
        """Return the default Odoo logo as fallback."""
        return http.Stream.from_path(
            file_path('web/static/img/logo.png')
        ).get_response()
