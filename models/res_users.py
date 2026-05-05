import json
import re
import time
from functools import wraps

from odoo import api, models, fields, _
from odoo.exceptions import UserError, ValidationError
from odoo.http import request


_RE_HEX_COLOR = re.compile(r'^#[0-9A-Fa-f]{6}$')

_USER_THEME_COLOR_FIELDS = [
    'theme_color_brand',
    'theme_color_primary',
    'theme_color_success',
    'theme_color_info',
    'theme_color_warning',
    'theme_color_danger',
    'theme_color_appsmenu_text',
    'theme_color_appbar_text',
    'theme_color_appbar_active',
    'theme_color_appbar_background',
]

_USER_THEME_PERSONAL_FIELDS = _USER_THEME_COLOR_FIELDS + [
    'theme_use_personal_colors',
    'theme_font_family',
]

def _jsonable(o):
    try:
        json.dumps(o)
    except TypeError:
        return False
    else:
        return True


def check_identity(fn):
    """Decorator yêu cầu xác minh danh tính (mật khẩu) trước khi thực hiện.
    Nếu chưa verify trong 10 phút gần nhất, popup wizard đổi mật khẩu."""
    @wraps(fn)
    def wrapped(self, *args, **kwargs):
        if not request:
            raise UserError(_('This method can only be accessed over HTTP'))

        if request.session.get('identity-check-last', 0) > time.time() - 10 * 60:
            return fn(self, *args, **kwargs)

        w = self.sudo().env['t4.change.password.wizard'].create({
            'request': json.dumps([
                {k: v for k, v in self.env.context.items() if _jsonable(v)},
                self._name,
                self.ids,
                fn.__name__,
                args,
                kwargs,
            ])
        })

        return {
            'name': _('Thay đổi mật khẩu'),
            'type': 'ir.actions.act_window',
            'target': 'new',
            'res_id': w.id,
            'context': {
                'form_view_ref': 't4_theme.change_password_wizard_form',
            },
            'views': [(False, 'form')],
            'res_model': 't4.change.password.wizard',
            'view_mode': 'form',
        }
    wrapped.__has_check_identity = True
    return wrapped


class ResUsers(models.Model):

    _inherit = 'res.users'

    #----------------------------------------------------------
    # Properties
    #----------------------------------------------------------

    @property
    def SELF_READABLE_FIELDS(self):
        return super().SELF_READABLE_FIELDS + [
            'sidebar_type',
            'chatter_position',
            'dialog_size',
            'dark_mode',
            'dark_mode_device_dependent',
        ] + _USER_THEME_PERSONAL_FIELDS

    @property
    def SELF_WRITEABLE_FIELDS(self):
        return super().SELF_WRITEABLE_FIELDS + [
            'sidebar_type',
            'chatter_position',
            'dialog_size',
            'dark_mode',
            'dark_mode_device_dependent',
        ] + _USER_THEME_PERSONAL_FIELDS

    #----------------------------------------------------------
    # Fields
    #----------------------------------------------------------

    sidebar_type = fields.Selection(
        selection=[
            ('invisible', 'Ẩn'),
            ('large', 'Hiện'),
        ],
        string='Kiểu thanh bên',
        default='large',
        required=True,
    )

    chatter_position = fields.Selection(
        selection=[
            ('side', 'Bên cạnh'),
            ('bottom', 'Phía dưới'),
        ],
        string='Vị trí Chatter',
        default='side',
        required=True,
    )

    dialog_size = fields.Selection(
        selection=[
            ('minimize', 'Thu nhỏ'),
            ('maximize', 'Phóng to'),
        ],
        string='Kích thước Dialog',
        default='minimize',
        required=True,
    )

    dark_mode = fields.Boolean(
        string='Dark Mode',
        default=False,
    )

    dark_mode_device_dependent = fields.Boolean(
        string='Dark Mode theo thiết bị',
        default=False,
    )

    #----------------------------------------------------------
    # Fields - Personal Theme (per-user color override)
    #----------------------------------------------------------

    theme_use_personal_colors = fields.Boolean(
        string='Dùng màu cá nhân',
        default=False,
        help='Bật để sử dụng thiết lập màu sắc và phông chữ của riêng bạn thay vì dùng cấu hình chung của công ty.',
    )

    theme_color_brand = fields.Char(string='Màu thương hiệu (cá nhân)')
    theme_color_primary = fields.Char(string='Màu chính (cá nhân)')
    theme_color_success = fields.Char(string='Màu Success (cá nhân)')
    theme_color_info = fields.Char(string='Màu Info (cá nhân)')
    theme_color_warning = fields.Char(string='Màu Warning (cá nhân)')
    theme_color_danger = fields.Char(string='Màu Danger (cá nhân)')
    theme_color_appsmenu_text = fields.Char(string='Màu chữ menu (cá nhân)')
    theme_color_appbar_text = fields.Char(string='Màu chữ thanh bên (cá nhân)')
    theme_color_appbar_active = fields.Char(string='Màu đang chọn thanh bên (cá nhân)')
    theme_color_appbar_background = fields.Char(string='Màu nền thanh bên (cá nhân)')

    theme_font_family = fields.Char(
        string='Font Family (cá nhân)',
        help='Chọn phông chữ riêng của bạn, hoặc để trống để sử dụng phông chữ chung của công ty.',
    )

    #----------------------------------------------------------
    # Constraints
    #----------------------------------------------------------

    @api.constrains(*_USER_THEME_COLOR_FIELDS)
    def _check_user_theme_colors(self):
        for u in self:
            for fname in _USER_THEME_COLOR_FIELDS:
                value = u[fname]
                if value and not _RE_HEX_COLOR.match(value):
                    raise ValidationError(
                        _('Định dạng màu không hợp lệ cho %s: "%s". Sử dụng mã hex như #FF0000.')
                        % (fname, value)
                    )

    #----------------------------------------------------------
    # Actions
    #----------------------------------------------------------

    @check_identity
    def custom_preference_change_password(self):
        pass
