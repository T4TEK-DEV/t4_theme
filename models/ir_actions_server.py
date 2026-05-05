from odoo import _, fields, models


class IrActionsServer(models.Model):

    _inherit = 'ir.actions.server'

    # ----------------------------------------------------------
    # Fields
    # ----------------------------------------------------------

    state = fields.Selection(
        selection_add=[
            ('refresh', 'Tải lại View'),
        ],
        ondelete={'refresh': 'cascade'},
    )

    refresh_view_types = fields.Char(
        string='View Types',
        help=(
            'Các kiểu hiển thị (ví dụ: dạng danh sách, dạng bảng) được phân tách bằng dấu phẩy. '
            'Để trống nếu muốn áp dụng cho tất cả.'
        ),
    )

    # ----------------------------------------------------------
    # Helper
    # ----------------------------------------------------------

    def _generate_action_name(self):
        if self.state == 'refresh':
            return _('Tải lại View')
        return super()._generate_action_name()

    def _run_action_refresh_multi(self, eval_context=None):
        records = (
            eval_context.get('records') or
            eval_context.get('record')
        )
        message = {
            'model': self.model_id.model,
            'view_types': [
                vt.strip()
                for vt in (self.refresh_view_types or '').split(',')
                if vt.strip()
            ],
            'rec_ids': records.ids if records else [],
        }
        internal_users = self.env['res.users'].search(
            [('share', '=', False)]
        )
        internal_users._bus_send('muk_web_refresh.reload', message)
