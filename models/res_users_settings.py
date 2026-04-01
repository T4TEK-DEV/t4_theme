# -*- coding: utf-8 -*-
from __future__ import annotations

from odoo import fields, models


class ResUsersSettings(models.Model):
    _inherit = 'res.users.settings'

    # T4 Theme user preferences
    # These are automatically included in session_info via _res_users_settings_format
    # and can be read/written from JS via user.settings / user.setUserSettings

    t4_sidebar_collapsed = fields.Boolean(
        string='Sidebar Collapsed',
        default=False,
    )
    t4_sidebar_width = fields.Integer(
        string='Sidebar Width',
        default=240,
    )
    t4_fav_apps = fields.Json(
        string='Favorite Apps',
        default=list,
        help='JSON list of favorite app menu IDs.',
    )
    t4_home_action = fields.Char(
        string='Home Action',
        help='XML ID or numeric ID of the startup action.',
    )
    t4_bookmarks = fields.Json(
        string='Bookmarks',
        default=list,
        help='JSON list of bookmarked actions.',
    )
