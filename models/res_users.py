import json
import time
from functools import wraps

from odoo import models, fields, _
from odoo.exceptions import UserError
from odoo.http import request

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
        ]

    @property
    def SELF_WRITEABLE_FIELDS(self):
        return super().SELF_WRITEABLE_FIELDS + [
            'sidebar_type',
            'chatter_position',
            'dialog_size',
            'dark_mode',
            'dark_mode_device_dependent',
        ]

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
    # Actions
    #----------------------------------------------------------

    @check_identity
    def custom_preference_change_password(self):
        pass
