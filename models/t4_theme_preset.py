# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import logging
from typing import Any

from odoo import api, fields, models
from odoo.exceptions import ValidationError

_logger = logging.getLogger(__name__)


class T4ThemePreset(models.Model):
    _name = 't4.theme.preset'
    _description = 'T4 Theme Preset'
    _order = 'sequence, name'

    name = fields.Char(string='Preset Name', required=True, translate=True)
    sequence = fields.Integer(string='Sequence', default=10)
    is_system = fields.Boolean(
        string='System Preset',
        default=False,
        help='System presets cannot be deleted by users.',
    )

    # -- Preset values (mirrored from t4.theme.config) --
    color_scheme = fields.Selection(
        [('light', 'Light'), ('dark', 'Dark'), ('auto', 'Auto')],
        string='Color Scheme',
        default='light',
        required=True,
    )
    primary_color = fields.Char(string='Primary Color', default='#714B67')
    secondary_color = fields.Char(string='Secondary Color', default='#8f8f8f')
    accent_color = fields.Char(string='Accent Color', default='#00A09D')
    font_family = fields.Selection(
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
        required=True,
    )
    sidebar_style = fields.Selection(
        [('full', 'Full'), ('collapsed', 'Collapsed'), ('auto_hide', 'Auto-hide')],
        string='Sidebar Style',
        default='full',
        required=True,
    )
    custom_css_vars = fields.Text(
        string='Custom CSS Variables',
        help='JSON object of extra CSS custom property overrides.',
    )

    # -- JSON export/import --
    json_data = fields.Text(
        string='JSON Data',
        compute='_compute_json_data',
        inverse='_inverse_json_data',
        help='Full preset as JSON for export/import.',
    )

    @api.depends(
        'name', 'color_scheme', 'primary_color', 'secondary_color',
        'accent_color', 'font_family', 'sidebar_style', 'custom_css_vars',
    )
    def _compute_json_data(self) -> None:
        for record in self:
            record.json_data = json.dumps(record.to_dict(), indent=2)

    def _inverse_json_data(self) -> None:
        for record in self:
            if not record.json_data:
                continue
            record._apply_from_json(record.json_data)

    def to_dict(self) -> dict[str, Any]:
        """Export preset to a plain dict."""
        self.ensure_one()
        custom = {}
        if self.custom_css_vars:
            try:
                custom = json.loads(self.custom_css_vars)
            except (json.JSONDecodeError, TypeError):
                pass
        return {
            'name': self.name,
            'color_scheme': self.color_scheme,
            'primary_color': self.primary_color,
            'secondary_color': self.secondary_color,
            'accent_color': self.accent_color,
            'font_family': self.font_family,
            'sidebar_style': self.sidebar_style,
            'custom_css_vars': custom,
        }

    def _apply_from_json(self, json_str: str) -> None:
        """Apply values from a JSON string to this preset."""
        self.ensure_one()
        try:
            data = json.loads(json_str)
        except (json.JSONDecodeError, TypeError) as exc:
            raise ValidationError(f'Invalid JSON: {exc}') from exc

        if not isinstance(data, dict):
            raise ValidationError('JSON must be an object.')

        vals: dict[str, Any] = {}
        if 'name' in data:
            vals['name'] = data['name']
        for field_name in (
            'color_scheme', 'primary_color', 'secondary_color',
            'accent_color', 'font_family', 'sidebar_style',
        ):
            if field_name in data:
                vals[field_name] = data[field_name]
        if 'custom_css_vars' in data:
            vals['custom_css_vars'] = json.dumps(data['custom_css_vars'])

        if vals:
            self.write(vals)

    @api.model
    def import_from_json(self, json_str: str) -> models.Model:
        """Create a new preset from JSON string."""
        try:
            data = json.loads(json_str)
        except (json.JSONDecodeError, TypeError) as exc:
            raise ValidationError(f'Invalid JSON: {exc}') from exc

        if not isinstance(data, dict) or 'name' not in data:
            raise ValidationError('JSON must contain at least a "name" field.')

        custom_css = data.get('custom_css_vars', {})
        return self.create({
            'name': data['name'],
            'color_scheme': data.get('color_scheme', 'light'),
            'primary_color': data.get('primary_color', '#714B67'),
            'secondary_color': data.get('secondary_color', '#8f8f8f'),
            'accent_color': data.get('accent_color', '#00A09D'),
            'font_family': data.get('font_family', 'inherit'),
            'sidebar_style': data.get('sidebar_style', 'full'),
            'custom_css_vars': json.dumps(custom_css) if custom_css else False,
            'is_system': False,
        })

    def unlink(self) -> bool:
        """Prevent deletion of system presets."""
        for record in self:
            if record.is_system:
                raise ValidationError(
                    f'Cannot delete system preset "{record.name}".'
                )
        return super().unlink()
