from odoo import models
from odoo.http import request


class IrHttp(models.AbstractModel):

    _inherit = "ir.http"

    #----------------------------------------------------------
    # Functions
    #----------------------------------------------------------

    def color_scheme(self):
        """Read color scheme from cookie (set by dark_mode_service.js)."""
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

    def session_info(self):
        result = super().session_info()
        if self.env.user._is_internal():
            for company in self.env.user.company_ids.with_context(bin_size=True):
                result['user_companies']['allowed_companies'][company.id].update({
                    'has_appsbar_image': bool(company.appbar_image),
                    'has_background_image': bool(company.background_image),
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
