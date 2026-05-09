/** @odoo-module **/

import { user } from '@web/core/user';
import { patch } from '@web/core/utils/patch';
import { NavBar } from '@web/webclient/navbar/navbar';

// Hide messaging (chat bubble) and activity (clock) systray icons for
// non-system users (not in base.group_system).
// Patch NavBar.systrayItems at render time — independent of registry/load order.
const ADMIN_ONLY_SYSTRAY_KEYS = new Set([
    'mail.messaging_menu',  // Discuss/messaging chat bubble with badge
    'mail.activity_menu',   // Activity clock icon
]);

patch(NavBar.prototype, {
    get systrayItems() {
        const items = super.systrayItems;
        if (user.isSystem) {
            return items;
        }
        return items.filter((item) => !ADMIN_ONLY_SYSTRAY_KEYS.has(item.key));
    },
});
