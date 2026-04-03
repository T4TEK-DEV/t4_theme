"""
URL prefix rewrite: replaces /odoo/ with custom prefix across the system.

Approach (adapted from web_replace_url by ArefinShawon):
1. Override routing_map() — replace 'odoo' in all route URLs
2. Monkey-patch JavascriptAsset.content — replace 'odoo' in router.js/navbar.js
3. Monkey-patch http.Request.__init__ — rewrite path back on incoming requests
"""

import re
import logging

from odoo import http
from odoo.addons.base.models.assetsbundle import JavascriptAsset
from odoo.tools.js_transpiler import transpile_javascript

_logger = logging.getLogger(__name__)

# Global prefix cache — set by routing_map() override in ir_http.py
url_prefix = ['']


def _patch_js_assets():
    """Monkey-patch JavascriptAsset to replace 'odoo' in key JS files."""
    _original_content = JavascriptAsset.content.fget

    @property
    def patched_content(self):
        content = _original_content(self)
        prefix = url_prefix[0]
        if prefix and prefix != 'odoo':
            if self.name in (
                "/web/static/src/core/browser/router.js",
                "/web/static/src/webclient/navbar/navbar.js",
                "/web/static/src/webclient/menus/menu_helpers.js",
                "/web/static/src/core/pwa/pwa_service.js",
                "/web/static/src/service_worker.js",
                "/web/static/src/views/fields/many2one/many2one.js",
            ):
                content = re.sub(r'(?<!@)(?<!\w)/odoo(?=/|"|\`|\')', f'/{prefix}', content)
        if self.is_transpiled:
            if not self._converted_content:
                self._converted_content = transpile_javascript(self.url, content)
            return self._converted_content
        return content

    JavascriptAsset.content = patched_content
    _logger.info("T4 URL: JavascriptAsset.content patched")


def _patch_request_init():
    """Monkey-patch http.Request.__init__ to rewrite /odoo → /prefix."""
    _original_init = http.Request.__init__

    def patched_init(self, httprequest):
        prefix = url_prefix[0]
        # Rewrite /odoo/... → /prefix/... so it matches the modified routing map
        if prefix and prefix != 'odoo' and '/odoo' in httprequest.path:
            httprequest.environ['PATH_INFO'] = httprequest.path.replace(
                '/odoo', f'/{prefix}'
            )
        _original_init(self, httprequest)

    http.Request.__init__ = patched_init
    _logger.info("T4 URL: http.Request.__init__ patched")


def install_url_rewrite():
    """Install all monkey-patches for URL rewriting."""
    if getattr(http, '_t4_url_rewrite_installed', False):
        return
    _patch_js_assets()
    _patch_request_init()
    http._t4_url_rewrite_installed = True
    _logger.info("T4 URL: all patches installed")
