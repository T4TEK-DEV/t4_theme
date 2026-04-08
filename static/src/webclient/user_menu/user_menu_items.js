/** @odoo-module **/

import { registry } from '@web/core/registry';
import { _t } from '@web/core/l10n/translation';
import { browser } from '@web/core/browser/browser';
import { user } from '@web/core/user';

const userMenuRegistry = registry.category('user_menuitems');

export function changePassword(env) {
    return {
        type: 'item',
        id: 'change_password',
        description: _t('Đổi mật khẩu'),
        callback: async function () {
            const actionDescription = await env.services.orm.call(
                'res.users',
                'custom_preference_change_password',
                [[user.userId]],
            );
            env.services.action.doAction(actionDescription);
        },
        sequence: 50,
    };
}

// Replace default change_password with custom one
userMenuRegistry.remove('change_password');
userMenuRegistry.add('change_password', changePassword);

// Replace logout label
userMenuRegistry.remove('log_out');
userMenuRegistry.add('logout_custom', (env) => ({
    type: 'item',
    id: 'logout_custom',
    description: _t('Đăng xuất'),
    href: `${browser.location.origin}/web/session/logout`,
    callback: () => {
        browser.location.href = '/web/session/logout';
    },
    sequence: 100,
}));
