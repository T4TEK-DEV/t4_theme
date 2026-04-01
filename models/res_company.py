# -*- coding: utf-8 -*-
from __future__ import annotations

from odoo import fields, models


class ResCompany(models.Model):
    _inherit = 'res.company'

    t4_logo_light = fields.Binary(
        string='Light Mode Logo',
        attachment=False,
        help='Logo displayed when light color scheme is active.',
    )
    t4_logo_dark = fields.Binary(
        string='Dark Mode Logo',
        attachment=False,
        help='Logo displayed when dark color scheme is active.',
    )
