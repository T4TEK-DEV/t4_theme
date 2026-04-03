import logging
import threading

import odoo
import werkzeug
from odoo import models, tools
from odoo.http import request, ROUTING_KEYS
from odoo.tools.misc import submap
from odoo.modules.registry import Registry
from odoo.addons.base.models.ir_http import _logger, FasterRule

from ..controllers.url_rewrite import url_prefix

_logger = logging.getLogger(__name__)


class IrHttp(models.AbstractModel):

    _inherit = "ir.http"

    #----------------------------------------------------------
    # URL Prefix: override routing_map to replace /odoo/ routes
    #----------------------------------------------------------

    @tools.ormcache('key', cache='routing')
    def routing_map(self, key=None):
        # Read prefix from DB and cache globally
        icp = self.env['ir.config_parameter'].sudo()
        try:
            prefix = icp.get_param('t4_theme.url_prefix', '')
            if prefix:
                prefix = prefix.strip().strip('/')
            url_prefix[0] = prefix or ''
        except Exception:
            url_prefix[0] = ''

        # Also read old prefix — keep routes alive for graceful redirect
        try:
            old_prefix = (icp.get_param('t4_theme.url_prefix_old', '') or '').strip().strip('/')
        except Exception:
            old_prefix = ''

        _logger.info("T4 routing_map key=%s prefix=%s old=%s", key, url_prefix[0], old_prefix)

        registry = Registry(threading.current_thread().dbname)
        installed = registry._init_modules.union(
            odoo.tools.config['server_wide_modules']
        )
        mods = sorted(installed)
        routing_map = werkzeug.routing.Map(
            strict_slashes=False,
            converters=self._get_converters(),
        )
        for url, endpoint in self._generate_routing_rules(mods, converters=self._get_converters()):
            routing = submap(endpoint.routing, ROUTING_KEYS)
            if routing['methods'] is not None and 'OPTIONS' not in routing['methods']:
                routing['methods'] = [*routing['methods'], 'OPTIONS']
            # Add original route
            rule = FasterRule(url, endpoint=endpoint, **routing)
            rule.merge_slashes = False
            routing_map.add(rule)

            if '/odoo' in url:
                # Add alias route for current prefix
                if url_prefix[0] and url_prefix[0] != 'odoo':
                    alias_url = url.replace('/odoo', f'/{url_prefix[0]}')
                    alias_rule = FasterRule(alias_url, endpoint=endpoint, **routing)
                    alias_rule.merge_slashes = False
                    routing_map.add(alias_rule)
                # Keep old prefix routes alive (so they don't 404)
                if (old_prefix and old_prefix != 'odoo'
                        and old_prefix != url_prefix[0]):
                    old_url = url.replace('/odoo', f'/{old_prefix}')
                    old_rule = FasterRule(old_url, endpoint=endpoint, **routing)
                    old_rule.merge_slashes = False
                    routing_map.add(old_rule)
        return routing_map

    #----------------------------------------------------------
    # Color Scheme
    #----------------------------------------------------------

    def color_scheme(self):
        scheme = request.httprequest.cookies.get("color_scheme")
        if scheme in ("dark", "light"):
            return scheme
        return super().color_scheme()

    @classmethod
    def _set_color_scheme(cls, response):
        scheme = request.httprequest.cookies.get("color_scheme")
        user = request.env.user
        user_scheme = "dark" if getattr(user, "dark_mode", None) else "light"
        device_dependent = getattr(user, "dark_mode_device_dependent", None)
        if (not device_dependent) and scheme != user_scheme:
            response.set_cookie("color_scheme", user_scheme)

    @classmethod
    def _post_dispatch(cls, response):
        cls._set_color_scheme(response)
        return super()._post_dispatch(response)

    # session_info is monkey-patched in controllers/url_rewrite.py
    # because _inherit override doesn't work reliably in this codebase
