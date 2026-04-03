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
        try:
            prefix = self.env['ir.config_parameter'].sudo().get_param(
                't4_theme.url_prefix', ''
            )
            if prefix:
                prefix = prefix.strip().strip('/')
            url_prefix[0] = prefix or ''
        except Exception:
            url_prefix[0] = ''

        _logger.warning("T4 ROUTING MAP CALLED key=%s prefix=%s", key, url_prefix[0])

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
            # Replace /odoo with /prefix in route URLs
            if url_prefix[0] and url_prefix[0] != 'odoo' and '/odoo' in url:
                url = url.replace('/odoo', f'/{url_prefix[0]}')
            routing = submap(endpoint.routing, ROUTING_KEYS)
            if routing['methods'] is not None and 'OPTIONS' not in routing['methods']:
                routing['methods'] = [*routing['methods'], 'OPTIONS']
            rule = FasterRule(url, endpoint=endpoint, **routing)
            rule.merge_slashes = False
            routing_map.add(rule)
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

    #----------------------------------------------------------
    # Session Info
    #----------------------------------------------------------

    def session_info(self):
        result = super().session_info()
        result['t4_theme_loaded'] = True
        try:
            result['t4_url_prefix'] = self.env['ir.config_parameter'].sudo().get_param(
                't4_theme.url_prefix', ''
            )
        except Exception:
            result['t4_url_prefix'] = ''
        if self.env.user._is_internal():
            for company in self.env.user.company_ids.with_context(bin_size=True):
                result['user_companies']['allowed_companies'][company.id].update({
                    'has_appsbar_image': bool(company.appbar_image),
                    'has_background_image': bool(company.background_image),
                    'has_favicon': bool(company.favicon),
                    't4_web_title': company.t4_web_title or '',
                    't4_brand_name': company.t4_brand_name or 'T4 ERP',
                    't4_url_prefix': company.t4_url_prefix or '',
                    'theme_preset': company.theme_preset or 'default',
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
        result['chatter_position'] = self.env.user.chatter_position
        result['dialog_size'] = self.env.user.dialog_size
        result['pager_autoload_interval'] = int(
            self.env['ir.config_parameter'].sudo().get_param(
                'muk_web_refresh.pager_autoload_interval',
                default=30000
            )
        )
        return result
