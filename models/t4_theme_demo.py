from odoo import fields, models


class T4ThemeDemo(models.Model):
    _name = 't4.theme.demo'
    _description = 'Theme Demo Record'
    _order = 'sequence, id'

    name = fields.Char(string='Name', required=True)
    description = fields.Text(string='Description')
    stage = fields.Selection([
        ('draft', 'Draft'),
        ('progress', 'In Progress'),
        ('review', 'Review'),
        ('done', 'Done'),
        ('cancel', 'Cancelled'),
    ], string='Stage', default='draft')
    priority = fields.Selection([
        ('0', 'Normal'),
        ('1', 'Important'),
        ('2', 'Urgent'),
    ], string='Priority', default='0')
    color = fields.Integer(string='Color')
    partner_id = fields.Many2one('res.partner', string='Contact')
    user_id = fields.Many2one('res.users', string='Assigned To')
    date_start = fields.Date(string='Start Date')
    date_end = fields.Date(string='End Date')
    amount = fields.Float(string='Amount')
    progress = fields.Integer(string='Progress', default=0)
    active = fields.Boolean(string='Active', default=True)
    sequence = fields.Integer(string='Sequence', default=10)
    tag_ids = fields.Many2many('t4.theme.demo.tag', string='Tags')
    note = fields.Html(string='Notes')


class T4ThemeDemoTag(models.Model):
    _name = 't4.theme.demo.tag'
    _description = 'Theme Demo Tag'

    name = fields.Char(string='Name', required=True)
    color = fields.Integer(string='Color')
