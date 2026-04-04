import json
import logging
import re

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)


class ThemeEditorController(http.Controller):

    @http.route('/t4_theme/save_overrides', type='json', auth='user')
    def save_overrides(self, overrides):
        """Save view theme overrides without triggering ORM bus notifications.
        Uses direct SQL to avoid cache invalidation and page reload.
        """
        company = request.env.user.company_id
        if not company:
            return {'status': 'error', 'message': 'No company'}

        try:
            # Direct SQL update to bypass ORM notifications
            request.env.cr.execute(
                'UPDATE res_company SET theme_view_overrides = %s WHERE id = %s',
                (json.dumps(overrides), company.id)
            )
            return {'status': 'ok'}
        except Exception as e:
            _logger.exception('Theme editor save failed: %s', e)
            return {'status': 'error', 'message': str(e)}

    @http.route('/t4_theme/presets', type='json', auth='user')
    def get_presets(self):
        """Return all presets (built-in + company-specific)."""
        Preset = request.env['t4_theme.preset']
        company_id = request.env.user.company_id.id
        presets = Preset.search([
            '|',
            ('company_id', '=', False),
            ('company_id', '=', company_id),
        ], order='sequence, name')
        return [{
            'id': p.id,
            'name': p.name,
            'is_default': p.is_default,
            'preview_color': p.preview_color,
            'color_brand': p.color_brand,
            'color_primary': p.color_primary,
            'color_success': p.color_success,
            'color_info': p.color_info,
            'color_warning': p.color_warning,
            'color_danger': p.color_danger,
            'color_appsmenu_text': p.color_appsmenu_text,
            'color_appbar_text': p.color_appbar_text,
            'color_appbar_active': p.color_appbar_active,
            'color_appbar_background': p.color_appbar_background,
            'font_family': p.font_family,
            'view_overrides': p.view_overrides or {},
        } for p in presets]

    @http.route('/t4_theme/export_theme', type='json', auth='user')
    def export_theme(self):
        """Export current company theme config as structured JSON."""
        company = request.env.user.company_id
        Preset = request.env['t4_theme.preset']
        temp = Preset.new({
            'name': company.name + ' Theme',
            'color_brand': company.theme_color_brand,
            'color_primary': company.theme_color_primary,
            'color_success': company.theme_color_success,
            'color_info': company.theme_color_info,
            'color_warning': company.theme_color_warning,
            'color_danger': company.theme_color_danger,
            'color_appsmenu_text': company.theme_color_appsmenu_text,
            'color_appbar_text': company.theme_color_appbar_text,
            'color_appbar_active': company.theme_color_appbar_active,
            'color_appbar_background': company.theme_color_appbar_background,
            'font_family': company.theme_font_family or 'system',
            'view_overrides': company.theme_view_overrides or {},
        })
        return temp.to_export_dict()

    @http.route('/t4_theme/import_theme', type='json', auth='user')
    def import_theme(self, theme_data):
        """Import a theme JSON and create a new preset."""
        if not theme_data or not isinstance(theme_data, dict):
            return {'success': False, 'error': 'Invalid theme data'}

        if 'colors' not in theme_data:
            return {'success': False, 'error': 'Missing colors section'}

        hex_re = re.compile(r'^#[0-9A-Fa-f]{3,8}$')
        for key, color_obj in theme_data.get('colors', {}).items():
            value = color_obj.get('value', '') if isinstance(color_obj, dict) else color_obj
            if value and not hex_re.match(value):
                return {'success': False, 'error': f'Invalid color value for {key}: {value}'}

        company_id = request.env.user.company_id.id
        try:
            preset = request.env['t4_theme.preset'].from_import_dict(theme_data, company_id=company_id)
            return {'success': True, 'preset_id': preset.id, 'name': preset.name}
        except Exception as e:
            _logger.exception('Theme import failed: %s', e)
            return {'success': False, 'error': str(e)}

    @http.route('/t4_theme/preset/save_current', type='json', auth='user')
    def preset_save_current(self, name):
        """Save current company config as a new preset."""
        if not name or not name.strip():
            return {'success': False, 'error': 'Name is required'}

        company = request.env.user.company_id
        vals = {
            'name': name.strip(),
            'is_default': False,
            'company_id': company.id,
            'color_brand': company.theme_color_brand,
            'color_primary': company.theme_color_primary,
            'color_success': company.theme_color_success,
            'color_info': company.theme_color_info,
            'color_warning': company.theme_color_warning,
            'color_danger': company.theme_color_danger,
            'color_appsmenu_text': company.theme_color_appsmenu_text,
            'color_appbar_text': company.theme_color_appbar_text,
            'color_appbar_active': company.theme_color_appbar_active,
            'color_appbar_background': company.theme_color_appbar_background,
            'font_family': company.theme_font_family or 'system',
            'view_overrides': company.theme_view_overrides or {},
        }
        preset = request.env['t4_theme.preset'].create(vals)
        return {'success': True, 'preset_id': preset.id}

    @http.route('/t4_theme/preset/delete', type='json', auth='user')
    def preset_delete(self, preset_id):
        """Delete a custom preset. Built-in presets cannot be deleted."""
        preset = request.env['t4_theme.preset'].browse(preset_id)
        if not preset.exists():
            return {'success': False, 'error': 'Preset not found'}
        if preset.is_default:
            return {'success': False, 'error': 'Cannot delete built-in preset'}
        preset.unlink()
        return {'success': True}
