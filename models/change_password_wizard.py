import json
import time

from odoo import fields, models, _
from odoo.exceptions import AccessDenied, UserError, ValidationError
from odoo.http import request


class ChangePasswordWizard(models.TransientModel):
    _name = 't4.change.password.wizard'
    _description = 'Đổi Mật Khẩu'
    _transient_max_hours = 0.1

    current_password = fields.Char(string='Mật khẩu hiện tại')
    new_password = fields.Char(string='Mật khẩu mới')
    confirm_password = fields.Char(string='Xác nhận mật khẩu mới')
    request = fields.Char(readonly=True, groups=fields.NO_ACCESS)

    def _check_identity(self):
        try:
            credential = {
                'login': self.env.user.login,
                'password': self.current_password,
                'type': 'password',
            }
            self.create_uid._check_credentials(credential, {'interactive': True})
        except AccessDenied:
            raise UserError(_('Mật khẩu hiện tại không chính xác, vui lòng nhập lại!'))

    def run_check(self):
        assert request, 'This method can only be accessed over HTTP'
        self._check_identity()
        self.current_password = False

        request.session['identity-check-last'] = time.time()
        ctx, model, ids, method, args, kwargs = json.loads(self.sudo().request)
        method = getattr(self.env(context=ctx)[model].browse(ids), method)
        assert getattr(method, '__has_check_identity', False)
        return method(*args, **kwargs)

    def change_password(self):
        self.run_check()
        if self.confirm_password != self.new_password:
            raise ValidationError(_('Mật khẩu mới và xác nhận mật khẩu phải giống nhau.'))
        self.env.user._change_password(self.new_password)
        self.unlink()
        return {'type': 'ir.actions.client', 'tag': 'logout_tag'}
