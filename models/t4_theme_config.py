# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import logging
from typing import Any

from odoo import api, fields, models
from odoo.exceptions import ValidationError

_logger = logging.getLogger(__name__)

FONT_SELECTIONS = [
    ('inherit', 'System Default'),
    ('inter', 'Inter'),
    ('roboto', 'Roboto'),
    ('open_sans', 'Open Sans'),
    ('lato', 'Lato'),
    ('source_sans', 'Source Sans 3'),
    ('noto_sans', 'Noto Sans'),
]

SIDEBAR_SELECTIONS = [
    ('full', 'Full'),
    ('collapsed', 'Collapsed'),
    ('auto_hide', 'Auto-hide'),
]

COLOR_SCHEME_SELECTIONS = [
    ('light', 'Light'),
    ('dark', 'Dark'),
    ('auto', 'Auto (OS Preference)'),
]

# CSS custom property → model field mapping
CSS_VAR_MAP = {
    '--t4-primary': 'primary_color',
    '--t4-secondary': 'secondary_color',
    '--t4-accent': 'accent_color',
}


class T4ThemeConfig(models.Model):
    _name = 't4.theme.config'
    _description = 'T4 Theme Configuration'
    _inherit = ['mail.thread', 't4.audit.mixin']
    _rec_name = 'company_id'

    _t4_audit_fields = [
        'color_scheme', 'primary_color', 'secondary_color',
        'accent_color', 'font_family', 'sidebar_style', 'is_active',
    ]

    company_id = fields.Many2one(
        'res.company',
        string='Company',
        required=True,
        ondelete='cascade',
        index=True,
        default=lambda self: self.env.company,
    )
    is_active = fields.Boolean(string='Active', default=True, tracking=True)

    # -- Color Scheme --
    color_scheme = fields.Selection(
        COLOR_SCHEME_SELECTIONS,
        string='Color Scheme',
        default='light',
        required=True,
        tracking=True,
    )

    # -- Colors --
    primary_color = fields.Char(
        string='Primary Color',
        default='#714B67',
        tracking=True,
        help='Main brand color used for navbar and primary buttons.',
    )
    secondary_color = fields.Char(
        string='Secondary Color',
        default='#8f8f8f',
        tracking=True,
        help='Secondary color for less prominent elements.',
    )
    accent_color = fields.Char(
        string='Accent Color',
        default='#00A09D',
        tracking=True,
        help='Accent color for highlights and focus states.',
    )

    # -- Dark Mode Logo --
    dark_mode_logo = fields.Binary(
        string='Dark Mode Logo',
        help='Logo variant for dark mode. If empty, uses company default logo.',
    )

    # -- Font --
    font_family = fields.Selection(
        FONT_SELECTIONS,
        string='Font',
        default='inherit',
        required=True,
        tracking=True,
    )

    # -- Sidebar --
    sidebar_style = fields.Selection(
        SIDEBAR_SELECTIONS,
        string='Sidebar Style',
        default='full',
        required=True,
        tracking=True,
    )

    # -- Advanced: Custom CSS Variables --
    custom_css_vars = fields.Text(
        string='Custom CSS Variables',
        help='Advanced: JSON object of CSS custom property overrides.\n'
             'Example: {"--t4-border-radius": "8px", "--t4-navbar-bg": "#333"}',
    )

    # -- Preset link --
    preset_id = fields.Many2one(
        't4.theme.preset',
        string='Based on Preset',
        ondelete='set null',
    )

    _sql_constraints = [
        (
            'unique_company_config',
            'UNIQUE(company_id)',
            'Only one theme configuration per company is allowed.',
        ),
    ]

    @api.constrains('custom_css_vars')
    def _check_custom_css_vars(self) -> None:
        """Validate that custom_css_vars is valid JSON if provided."""
        for record in self:
            if not record.custom_css_vars:
                continue
            try:
                data = json.loads(record.custom_css_vars)
                if not isinstance(data, dict):
                    raise ValidationError(
                        'Custom CSS Variables must be a JSON object (dict).'
                    )
            except (json.JSONDecodeError, TypeError) as exc:
                raise ValidationError(
                    f'Invalid JSON in Custom CSS Variables: {exc}'
                ) from exc

    def _to_css_vars_dict(self) -> dict[str, str]:
        """Convert config to a flat dict of CSS custom properties."""
        self.ensure_one()
        result: dict[str, str] = {}

        # Map model fields to CSS vars
        for css_var, field_name in CSS_VAR_MAP.items():
            value = self[field_name]
            if value:
                result[css_var] = value

        # Font family
        if self.font_family and self.font_family != 'inherit':
            font_map = {
                'inter': '"Inter", sans-serif',
                'roboto': '"Roboto", sans-serif',
                'open_sans': '"Open Sans", sans-serif',
                'lato': '"Lato", sans-serif',
                'source_sans': '"Source Sans 3", sans-serif',
                'noto_sans': '"Noto Sans", sans-serif',
            }
            result['--t4-font-family'] = font_map.get(
                self.font_family, 'inherit'
            )

        # Merge custom CSS vars
        if self.custom_css_vars:
            try:
                custom = json.loads(self.custom_css_vars)
                if isinstance(custom, dict):
                    result.update(custom)
            except (json.JSONDecodeError, TypeError):
                pass

        return result

    def to_frontend_dict(self) -> dict[str, Any]:
        """Serialize config for the frontend JS service."""
        self.ensure_one()
        return {
            'id': self.id,
            'company_id': self.company_id.id,
            'color_scheme': self.color_scheme,
            'primary_color': self.primary_color,
            'secondary_color': self.secondary_color,
            'accent_color': self.accent_color,
            'font_family': self.font_family,
            'sidebar_style': self.sidebar_style,
            'css_vars': self._to_css_vars_dict(),
            'is_active': self.is_active,
        }

    @api.model
    def get_config_for_company(self, company_id: int | None = None) -> dict[str, Any]:
        """Get theme config for a company. Returns default if none exists."""
        cid = company_id or self.env.company.id
        config = self.sudo().search(
            [('company_id', '=', cid), ('is_active', '=', True)],
            limit=1,
        )
        if config:
            return config.to_frontend_dict()
        # Return defaults
        return {
            'id': False,
            'company_id': cid,
            'color_scheme': 'light',
            'primary_color': '#714B67',
            'secondary_color': '#8f8f8f',
            'accent_color': '#00A09D',
            'font_family': 'inherit',
            'sidebar_style': 'full',
            'css_vars': {},
            'is_active': False,
        }

    def apply_preset(self, preset: models.Model) -> None:
        """Apply a preset's values to this config."""
        self.ensure_one()
        data = preset.to_dict()
        vals = {
            'color_scheme': data.get('color_scheme', self.color_scheme),
            'primary_color': data.get('primary_color', self.primary_color),
            'secondary_color': data.get('secondary_color', self.secondary_color),
            'accent_color': data.get('accent_color', self.accent_color),
            'font_family': data.get('font_family', self.font_family),
            'sidebar_style': data.get('sidebar_style', self.sidebar_style),
            'custom_css_vars': json.dumps(data.get('custom_css_vars', {})),
            'preset_id': preset.id,
        }
        self.write(vals)
