from odoo import api, models


class IrUiMenu(models.Model):
    _inherit = 'ir.ui.menu'

    @api.model
    def reorder_apps_sequence(self, xmlids):
        """Update sequence of top-level menus based on ordered xmlid list.

        Called from home menu drag & drop. Only ERP managers can reorder.
        """
        if not self.env.user.has_group('base.group_erp_manager'):
            return False
        for idx, xmlid in enumerate(xmlids):
            menu = self.env.ref(xmlid, raise_if_not_found=False)
            if menu:
                # sudo: admin-verified sequence update for app ordering
                menu.sudo().write({'sequence': (idx + 1) * 10})
        return True
