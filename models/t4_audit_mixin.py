# -*- coding: utf-8 -*-
from __future__ import annotations

import logging
from typing import Any

from markupsafe import Markup

from odoo import api, fields, models

_logger = logging.getLogger(__name__)


class T4AuditMixin(models.AbstractModel):
    """Mixin tự động track changes và post vào chatter.

    Usage:
        class MyModel(models.Model):
            _name = 'my.model'
            _inherit = ['mail.thread', 't4.audit.mixin']
            _t4_audit_fields = ['name', 'state', 'amount']
    """

    _name = 't4.audit.mixin'
    _description = 'T4 Audit Trail Mixin'

    _t4_audit_fields: list[str] = []

    def _t4_get_audit_fields(self) -> list[str]:
        """Return list of field names to audit. Override to customize."""
        return list(self._t4_audit_fields)

    def _t4_format_field_value(self, field_name: str, value: Any) -> str:
        """Format a field value for display in audit log."""
        field = self._fields.get(field_name)
        if field is None:
            return str(value)
        if field.type == 'many2one' and value:
            return value.display_name or str(value.id)
        if field.type == 'selection':
            selection_dict = dict(
                field._description_selection(self.env)
            )
            return selection_dict.get(value, str(value))
        if field.type == 'boolean':
            return 'Yes' if value else 'No'
        if value is False or value is None:
            return '(empty)'
        return str(value)

    def _t4_collect_changes(self, vals: dict[str, Any]) -> dict[str, tuple[str, str]]:
        """Collect old → new values for audited fields that changed.

        Returns:
            Dict mapping field_name → (old_formatted, new_formatted)
        """
        audit_fields = self._t4_get_audit_fields()
        if not audit_fields:
            return {}

        changes: dict[str, tuple[str, str]] = {}
        for fname in audit_fields:
            if fname not in vals:
                continue
            field = self._fields.get(fname)
            if field is None:
                continue
            for record in self:
                old_value = record[fname]
                old_formatted = self._t4_format_field_value(fname, old_value)
                new_raw = vals[fname]
                # For many2one, resolve ID to record for formatting
                if field.type == 'many2one' and isinstance(new_raw, int):
                    comodel = self.env[field.comodel_name]
                    new_display = comodel.browse(new_raw).display_name or str(new_raw)
                else:
                    new_display = self._t4_format_field_value(fname, new_raw)
                if old_formatted != new_display:
                    changes[fname] = (old_formatted, new_display)
        return changes

    def _t4_post_audit_message(self, changes: dict[str, tuple[str, str]]) -> None:
        """Post a formatted audit message to chatter."""
        if not changes:
            return
        lines = []
        for fname, (old_val, new_val) in changes.items():
            field = self._fields.get(fname)
            label = field.string if field else fname
            lines.append(
                f'<li><b>{label}</b>: {old_val} → {new_val}</li>'
            )
        body = Markup('<ul>%s</ul>') % Markup('').join(
            Markup(line) for line in lines
        )
        for record in self:
            if hasattr(record, 'message_post'):
                record.message_post(body=body, subtype_xmlid='mail.mt_note')

    def write(self, vals: dict[str, Any]) -> bool:
        """Override write to auto-post audit trail."""
        changes = self._t4_collect_changes(vals)
        result = super().write(vals)
        self._t4_post_audit_message(changes)
        return result
