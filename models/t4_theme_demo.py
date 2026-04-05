from odoo import fields, models


class T4ThemeDemo(models.Model):
    _name = 't4.theme.demo'
    _description = 'Bản ghi demo giao diện'
    _order = 'sequence, id'

    name = fields.Char(string='Tên', required=True)
    description = fields.Text(string='Mô tả')
    stage = fields.Selection([
        ('draft', 'Nháp'),
        ('progress', 'Đang thực hiện'),
        ('review', 'Đang duyệt'),
        ('done', 'Hoàn thành'),
        ('cancel', 'Đã hủy'),
    ], string='Giai đoạn', default='draft')
    priority = fields.Selection([
        ('0', 'Bình thường'),
        ('1', 'Quan trọng'),
        ('2', 'Khẩn cấp'),
    ], string='Ưu tiên', default='0')
    color = fields.Integer(string='Màu')
    partner_id = fields.Many2one('res.partner', string='Liên hệ')
    user_id = fields.Many2one('res.users', string='Giao cho')
    date_start = fields.Date(string='Ngày bắt đầu')
    date_end = fields.Date(string='Ngày kết thúc')
    amount = fields.Float(string='Số tiền')
    progress = fields.Integer(string='Tiến độ', default=0)
    active = fields.Boolean(string='Hoạt động', default=True)
    sequence = fields.Integer(string='Thứ tự', default=10)
    tag_ids = fields.Many2many('t4.theme.demo.tag', string='Nhãn')
    note = fields.Html(string='Ghi chú')


class T4ThemeDemoTag(models.Model):
    _name = 't4.theme.demo.tag'
    _description = 'Nhãn demo giao diện'

    name = fields.Char(string='Tên', required=True)
    color = fields.Integer(string='Màu')
