from . import controllers
from . import models
from . import tests

import base64
import logging

from odoo.tools import file_open

_logger = logging.getLogger(__name__)

# Install WSGI middleware on every server start (module import time)
try:
    from .controllers.url_rewrite import install_middleware
    install_middleware()
except Exception as e:
    _logger.debug("T4 Theme: deferred middleware install: %s", e)


def _setup_module(env):
    if env.ref('base.main_company', False):
        with file_open('web/static/img/favicon.ico', 'rb') as file:
            env.ref('base.main_company').write({
                'favicon': base64.b64encode(file.read())
            })
        with file_open('t4_theme/static/src/img/background.png', 'rb') as file:
            env.ref('base.main_company').write({
                'background_image': base64.b64encode(file.read())
            })
        with file_open('base/static/img/res_company_logo.png', 'rb') as file:
            env.ref('base.main_company').write({
                'appbar_image': base64.b64encode(file.read())
            })

    # Retry middleware install (http.root may be ready now)
    try:
        from .controllers.url_rewrite import install_middleware
        install_middleware()
    except Exception:
        pass


def _uninstall_cleanup(env):
    pass
