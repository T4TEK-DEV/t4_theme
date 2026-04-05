from odoo import models, fields


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
