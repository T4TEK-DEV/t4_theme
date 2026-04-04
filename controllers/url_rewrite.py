"""
URL prefix rewrite: replaces /odoo/ with custom prefix across the system.

Approach (adapted from web_replace_url by ArefinShawon):
1. Override routing_map() — add alias routes with custom prefix
2. Monkey-patch JavascriptAsset.content — replace 'odoo' in router.js/navbar.js
3. Redirect /odoo → /{prefix} via controller
"""

import re
import logging

from odoo import http
from odoo.addons.base.models.assetsbundle import JavascriptAsset, WebAsset
from odoo.tools.js_transpiler import transpile_javascript

_logger = logging.getLogger(__name__)

# Global prefix cache — set by routing_map() override in ir_http.py
url_prefix = ['']

# Files where "/odoo" URL paths need replacement
_URL_PATH_FILES = frozenset((
    "/web/static/src/core/browser/router.js",
    "/web/static/src/webclient/navbar/navbar.js",
    "/web/static/src/webclient/menus/menu_helpers.js",
    "/web/static/src/core/pwa/pwa_service.js",
    "/web/static/src/service_worker.js",
    "/web/static/src/views/fields/many2one/many2one.js",
))

# Regex: match "/odoo" in URL paths (not preceded by @odoo or word char)
_RE_SLASH_ODOO = re.compile(r'(?<!@)(?<!\w)/odoo(?=/|"|\'|`)')

# Regex: match bare "odoo" as a standalone string value in JS
# e.g. "odoo" or 'odoo' (like in startUrl() or array checks)
# Negative lookbehind: not @, not /, not word char (avoids @odoo, /odoo, odoo.define)
# Negative lookahead: not word char (avoids odooModule etc)
_RE_BARE_ODOO = re.compile(r'(?<=["\'`])odoo(?=["\'`])')


def _patch_js_assets():
    """Monkey-patch JavascriptAsset to replace 'odoo' in key JS files."""
    _original_raw_content = WebAsset.content.fget

    @property
    def patched_content(self):
        # Get RAW content from WebAsset (skip JavascriptAsset transpilation)
        content = _original_raw_content(self)
        prefix = url_prefix[0]
        if prefix and prefix != 'odoo' and self.name in _URL_PATH_FILES:
            # Replace "/odoo" paths → "/{prefix}"
            content = _RE_SLASH_ODOO.sub(f'/{prefix}', content)
            # Replace bare "odoo" string values → "{prefix}"
            # (e.g. startUrl() returns "odoo", array ["odoo", "scoped_app"])
            content = _RE_BARE_ODOO.sub(prefix, content)
        # Handle transpilation (same as original JavascriptAsset.content)
        if self.is_transpiled:
            if not self._converted_content:
                self._converted_content = transpile_javascript(self.url, content)
            return self._converted_content
        return content

    JavascriptAsset.content = patched_content
    _logger.info("T4 URL: JavascriptAsset.content patched")


def _patch_request_init():
    """No longer needed — both /odoo and /prefix routes coexist."""
    _logger.info("T4 URL: Request.__init__ patch skipped (dual routes)")


def _patch_session_info():
    """Monkey-patch ir.http session_info since _inherit override doesn't work."""
    from odoo.addons.web.models.ir_http import IrHttp

    _original_session_info = IrHttp.session_info

    def patched_session_info(self):
        result = _original_session_info(self)
        try:
            result['t4_theme_loaded'] = True
            # sudo: read system parameter for URL prefix (no user-specific data)
            result['t4_url_prefix'] = self.env['ir.config_parameter'].sudo().get_param(
                't4_theme.url_prefix', ''
            )
            if self.env.user._is_internal():
                for company in self.env.user.company_ids.with_context(bin_size=True):
                    cdata = result.get('user_companies', {}).get('allowed_companies', {}).get(company.id)
                    if cdata is None:
                        continue
                    cdata.update({
                        'has_appsbar_image': bool(company.appbar_image),
                        'has_background_image': bool(company.background_image),
                        'has_favicon': bool(company.favicon),
                        't4_web_title': company.t4_web_title or '',
                        't4_brand_name': company.t4_brand_name or 'T4 ERP',
                        't4_url_prefix': company.t4_url_prefix or '',
                        'theme_preset': company.theme_preset or 'default',
                        'theme_font_family': company.theme_font_family or 'system',
                        'theme_home_menu_overlay': company.theme_home_menu_overlay if company.theme_home_menu_overlay is not None else True,
                        'theme_view_overrides': company.theme_view_overrides or {},
                        'theme_colors': {
                            'color_brand': company.theme_color_brand or '#243742',
                            'color_primary': company.theme_color_primary or '#5D8DA8',
                            'color_success': company.theme_color_success or '#28A745',
                            'color_info': company.theme_color_info or '#17A2B8',
                            'color_warning': company.theme_color_warning or '#FFAC00',
                            'color_danger': company.theme_color_danger or '#DC3545',
                            'color_appsmenu_text': company.theme_color_appsmenu_text or '#F8F9FA',
                            'color_appbar_text': company.theme_color_appbar_text or '#DEE2E6',
                            'color_appbar_active': company.theme_color_appbar_active or '#5D8DA8',
                            'color_appbar_background': company.theme_color_appbar_background or '#111827',
                        },
                    })
            result['sidebar_type'] = self.env.user.sidebar_type
            result['chatter_position'] = self.env.user.chatter_position
            result['dialog_size'] = self.env.user.dialog_size
            result['pager_autoload_interval'] = int(
                self.env['ir.config_parameter'].sudo().get_param(
                    'muk_web_refresh.pager_autoload_interval', default=30000
                )
            )
        except Exception as e:
            _logger.error("T4 session_info error: %s", e)
            result['t4_theme_error'] = str(e)
        return result

    IrHttp.session_info = patched_session_info
    _logger.info("T4 URL: session_info monkey-patched")


def install_url_rewrite():
    """Install all monkey-patches."""
    if getattr(http, '_t4_url_rewrite_installed', False):
        return
    _patch_js_assets()
    _patch_request_init()
    _patch_session_info()
    http._t4_url_rewrite_installed = True
    _logger.info("T4 URL: all patches installed")
