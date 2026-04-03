"""
WSGI middleware that rewrites custom URL prefix → /odoo/ before Odoo routing.

Reads prefix from ir.config_parameter 't4_theme.url_prefix'.
E.g. if prefix = "app", then /app/settings → /odoo/settings internally.

This runs at the WSGI layer, before werkzeug/Odoo routing, so the standard
/odoo/ controllers handle all requests transparently.
"""

import logging
import threading

import odoo
from odoo import http

_logger = logging.getLogger(__name__)

# Cache the prefix to avoid DB reads on every request.
# Invalidated when res.company.write updates t4_url_prefix.
_prefix_cache = threading.local()


def _get_cached_prefix():
    """Read prefix from cache or DB."""
    prefix = getattr(_prefix_cache, 'value', None)
    if prefix is not None:
        return prefix
    # Not cached yet — will be set on first request with DB access
    return None


def invalidate_prefix_cache():
    """Called from res.company.write when prefix changes."""
    _prefix_cache.value = None


def _read_prefix_from_db():
    """Read prefix from ir.config_parameter (requires DB cursor)."""
    try:
        db_name = odoo.tools.config.get('db_name')
        if not db_name:
            return ''
        registry = odoo.registry(db_name)
        with registry.cursor() as cr:
            cr.execute(
                "SELECT value FROM ir_config_parameter WHERE key = 't4_theme.url_prefix' LIMIT 1"
            )
            row = cr.fetchone()
            if row and row[0]:
                return row[0].strip().strip('/')
    except Exception:
        pass
    return ''


class UrlRewriteMiddleware:
    """WSGI middleware: rewrite /<prefix>/... → /odoo/... before routing."""

    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        prefix = _get_cached_prefix()
        if prefix is None:
            # First request — read from DB and cache
            prefix = _read_prefix_from_db()
            _prefix_cache.value = prefix

        if prefix:
            path = environ.get('PATH_INFO', '/')
            prefix_with_slash = f'/{prefix}'

            if path == prefix_with_slash or path.startswith(f'{prefix_with_slash}/'):
                # Rewrite: /custom/... → /odoo/...
                new_path = '/odoo' + path[len(prefix_with_slash):]
                environ['PATH_INFO'] = new_path or '/odoo'

        return self.app(environ, start_response)


def install_middleware():
    """Wrap Odoo's WSGI app with our URL rewrite middleware."""
    if hasattr(http.root, '_t4_url_rewrite_installed'):
        return  # Already installed
    http.root.app = UrlRewriteMiddleware(http.root.app)
    http.root._t4_url_rewrite_installed = True
    _logger.info("T4 Theme: URL rewrite middleware installed")
