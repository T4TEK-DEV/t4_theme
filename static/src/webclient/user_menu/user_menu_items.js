/** @odoo-module **/

import { registry } from '@web/core/registry';
import { _t } from '@web/core/l10n/translation';
import { browser } from '@web/core/browser/browser';
import { user } from '@web/core/user';
import { patch } from '@web/core/utils/patch';
import { UserMenu } from '@web/webclient/user_menu/user_menu';

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

// Hide admin-only items for non-system users (not in base.group_system).
// Patch UserMenu.getElements at render time — independent of registry/load order.
// Keep: darkmode (switch), change_password, logout_custom.
const ADMIN_ONLY_USER_MENU_IDS = new Set([
    'support',       // Help (web)
    'shortcuts',     // Shortcuts CTRL+K (web)
    'im_status',     // Offline/Online presence dropdown (mail)
    'preferences',   // My Preferences (web)
    'odoo_account',  // My Odoo.com Account (web)
    'install_pwa',   // Install App (web)
]);

patch(UserMenu.prototype, {
    getElements() {
        const elements = super.getElements();
        if (user.isSystem) {
            return elements;
        }
        return elements.filter((el) => {
            if (el.type === 'separator') {
                return false;
            }
            return !ADMIN_ONLY_USER_MENU_IDS.has(el.id);
        });
    },
});
