# -*- coding: utf-8 -*-
from __future__ import annotations

import json
from typing import Any

from odoo import api, fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    # -- Theme Config (delegated to t4.theme.config for current company) --
    t4_theme_config_id = fields.Many2one(
        't4.theme.config',
        string='Theme Configuration',
        compute='_compute_t4_theme_config_id',
    )
    t4_color_scheme = fields.Selection(
        [('light', 'Light'), ('dark', 'Dark'), ('auto', 'Auto (OS Preference)')],
        string='Color Scheme',
        default='light',
    )
    t4_primary_color = fields.Char(string='Primary Color', default='#714B67')
    t4_secondary_color = fields.Char(string='Secondary Color', default='#8f8f8f')
    t4_accent_color = fields.Char(string='Accent Color', default='#00A09D')
    t4_font_family = fields.Selection(
        [
            ('inherit', 'System Default'),
            ('inter', 'Inter'),
            ('roboto', 'Roboto'),
            ('open_sans', 'Open Sans'),
            ('lato', 'Lato'),
            ('source_sans', 'Source Sans 3'),
            ('noto_sans', 'Noto Sans'),
        ],
        string='Font',
        default='inherit',
    )
    t4_sidebar_style = fields.Selection(
        [('full', 'Full'), ('collapsed', 'Collapsed'), ('auto_hide', 'Auto-hide')],
        string='Sidebar Style',
        default='full',
    )
    t4_custom_css_vars = fields.Text(string='Custom CSS Variables')
    t4_dark_mode_logo = fields.Binary(string='Dark Mode Logo')
    t4_preset_id = fields.Many2one('t4.theme.preset', string='Theme Preset')
    t4_preset_json_import = fields.Text(string='Import Preset JSON')

    @api.depends('company_id')
    def _compute_t4_theme_config_id(self) -> None:
        ThemeConfig = self.env['t4.theme.config']
        for record in self:
            config = ThemeConfig.sudo().search(
                [('company_id', '=', record.company_id.id)],
                limit=1,
            )
            record.t4_theme_config_id = config.id if config else False

    @api.model
    def get_values(self) -> dict[str, Any]:
        res = super().get_values()
        config = self.env['t4.theme.config'].sudo().search(
            [('company_id', '=', self.env.company.id)],
            limit=1,
        )
        if config:
            res.update({
                't4_color_scheme': config.color_scheme,
                't4_primary_color': config.primary_color,
                't4_secondary_color': config.secondary_color,
                't4_accent_color': config.accent_color,
                't4_font_family': config.font_family,
                't4_sidebar_style': config.sidebar_style,
                't4_custom_css_vars': config.custom_css_vars,
                't4_dark_mode_logo': config.dark_mode_logo,
                't4_preset_id': config.preset_id.id,
            })
        return res

    def set_values(self) -> None:
        super().set_values()
        ThemeConfig = self.env['t4.theme.config'].sudo()
        config = ThemeConfig.search(
            [('company_id', '=', self.env.company.id)],
            limit=1,
        )
        vals = {
            'color_scheme': self.t4_color_scheme or 'light',
            'primary_color': self.t4_primary_color,
            'secondary_color': self.t4_secondary_color,
            'accent_color': self.t4_accent_color,
            'font_family': self.t4_font_family or 'inherit',
            'sidebar_style': self.t4_sidebar_style or 'full',
            'custom_css_vars': self.t4_custom_css_vars,
            'dark_mode_logo': self.t4_dark_mode_logo,
            'preset_id': self.t4_preset_id.id if self.t4_preset_id else False,
            'is_active': True,
        }
        if config:
            config.write(vals)
        else:
            vals['company_id'] = self.env.company.id
            ThemeConfig.create(vals)

    def action_apply_preset(self) -> None:
        """Apply selected preset to current company's theme config."""
        self.ensure_one()
        if not self.t4_preset_id:
            return
        ThemeConfig = self.env['t4.theme.config'].sudo()
        config = ThemeConfig.search(
            [('company_id', '=', self.env.company.id)],
            limit=1,
        )
        if not config:
            config = ThemeConfig.create({
                'company_id': self.env.company.id,
            })
        config.apply_preset(self.t4_preset_id)

    def action_import_preset(self) -> None:
        """Import a preset from JSON text field."""
        self.ensure_one()
        if not self.t4_preset_json_import:
            return
        preset = self.env['t4.theme.preset'].import_from_json(
            self.t4_preset_json_import
        )
        self.t4_preset_id = preset.id
        self.t4_preset_json_import = False

    def action_reset_defaults(self) -> None:
        """Reset theme config to factory defaults."""
        self.ensure_one()
        config = self.env['t4.theme.config'].sudo().search(
            [('company_id', '=', self.env.company.id)],
            limit=1,
        )
        if config:
            config.write({
                'color_scheme': 'light',
                'primary_color': '#714B67',
                'secondary_color': '#8f8f8f',
                'accent_color': '#00A09D',
                'font_family': 'inherit',
                'sidebar_style': 'full',
                'custom_css_vars': False,
                'dark_mode_logo': False,
                'preset_id': False,
            })
