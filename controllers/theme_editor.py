import json
import logging

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)


class ThemeEditorController(http.Controller):

    @http.route('/t4_theme/save_overrides', type='json', auth='user')
    def save_overrides(self, overrides):
        """Save view theme overrides without triggering ORM bus notifications.
        Uses direct SQL to avoid cache invalidation and page reload.
        """
        company = request.env.user.company_id
        if not company:
            return {'status': 'error', 'message': 'No company'}

        try:
            # Direct SQL update to bypass ORM notifications
            request.env.cr.execute(
                'UPDATE res_company SET theme_view_overrides = %s WHERE id = %s',
                (json.dumps(overrides), company.id)
            )
            return {'status': 'ok'}
        except Exception as e:
            _logger.exception('Theme editor save failed: %s', e)
            return {'status': 'error', 'message': str(e)}
