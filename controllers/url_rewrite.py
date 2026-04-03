"""
WSGI middleware that rewrites custom URL prefix → /odoo/ before Odoo routing.

Reads prefix from ir.config_parameter 't4_theme.url_prefix' via direct SQL.
E.g. if prefix = "app", then /app/settings → /odoo/settings internally.
"""

import logging
import threading

import odoo
from odoo import http

_logger = logging.getLogger(__name__)

_prefix_cache = threading.local()


def invalidate_prefix_cache():
    """Called from res.company.write when prefix changes."""
    _prefix_cache.value = None


def _read_prefix_from_db():
    """Read prefix from ir.config_parameter via direct SQL."""
    try:
        db_name = getattr(http.request, 'db', None) if hasattr(http, 'request') and http.request else None
        if not db_name:
            db_name = odoo.tools.config.get('db_name')
        if not db_name:
            return ''
        registry = odoo.registry(db_name)
        with registry.cursor() as cr:
            cr.execute(
                "SELECT value FROM ir_config_parameter "
                "WHERE key = 't4_theme.url_prefix' LIMIT 1"
            )
            row = cr.fetchone()
            if row and row[0]:
                return row[0].strip().strip('/')
    except Exception:
        pass
    return ''


def _get_prefix():
    """Get cached prefix or read from DB."""
    val = getattr(_prefix_cache, 'value', None)
    if val is not None:
        return val
    val = _read_prefix_from_db()
    _prefix_cache.value = val
    return val


def install_middleware():
    """Wrap Odoo's HTTP root with URL rewrite middleware."""
    if not hasattr(http, 'root') or http.root is None:
        return

    if hasattr(http.root, '_t4_url_rewrite'):
        return  # Already installed

    original_dispatch = http.root.__class__.__call__

    def patched_call(self, environ, start_response):
        prefix = _get_prefix()
        if prefix:
            path = environ.get('PATH_INFO', '/')
            pfx = f'/{prefix}'
            if path == pfx or path.startswith(f'{pfx}/'):
                environ['PATH_INFO'] = '/odoo' + path[len(pfx):]
        return original_dispatch(self, environ, start_response)

    http.root.__class__.__call__ = patched_call
    http.root._t4_url_rewrite = True
    _logger.info("T4 Theme: URL rewrite middleware active")
