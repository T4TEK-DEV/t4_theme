/** @odoo-module **/
import { patch } from '@web/core/utils/patch';
import { useService, useBus } from '@web/core/utils/hooks';
import { useHotkey } from '@web/core/hotkeys/hotkey_hook';
import { _t } from '@web/core/l10n/translation';
import { useEffect, useRef } from '@odoo/owl';

import { NavBar } from '@web/webclient/navbar/navbar';
import { AppsMenu } from '@t4_theme/webclient/appsmenu/appsmenu';

patch(NavBar.prototype, {
    setup() {
        super.setup();
        this.appMenuService = useService('app_menu');

        // home_menu service: safe access
        this.hm = this.env.services.t4_home_menu || null;

        if (this.hm) {
            this.menuAppsRef = useRef('menuApps');
            this.navRef = useRef('nav');
            useBus(this.env.bus, 'HOME-MENU:TOGGLED', () => this._updateMenuAppsIcon());
            useEffect(() => this._updateMenuAppsIcon());

            // Global ESC: toggle home menu from anywhere
            useHotkey('escape', () => this._toggleOrOpenFirstApp(), { global: true });
        }
    },

    get hasBackgroundAction() {
        return this.hm ? this.hm.hasBackgroundAction : false;
    },

    get isInApp() {
        return this.hm ? !this.hm.hasHomeMenu : true;
    },

    /**
     * Toggle home menu. If closing and no previous app, open the first app.
     */
    _toggleOrOpenFirstApp() {
        if (!this.hm) return;
        if (this.hm.hasHomeMenu && !this.hm.hasBackgroundAction) {
            // No previous app → select first app
            const apps = this.appMenuService.getAppsMenuItems();
            if (apps.length) {
                this.appMenuService.selectApp(apps[0]);
            }
        } else {
            this.hm.toggle();
        }
    },

    _openAppMenuSidebar() {
        if (this.hm && this.hm.hasHomeMenu) {
            this._toggleOrOpenFirstApp();
        } else {
            this.state.isAppMenuSidebarOpened = true;
        }
    },

    _updateMenuAppsIcon() {
        if (!this.menuAppsRef || !this.menuAppsRef.el) return;
        const el = this.menuAppsRef.el;
        // Always show toggle button, always 3x3 grid (no back arrow)
        el.classList.remove('o_hidden', 'o_menu_toggle_back');
        el.title = this.isInApp ? _t('Home menu') : _t('Close home menu');

        const nav = this.navRef && this.navRef.el;
        if (!nav) return;
        const sub = this.appSubMenus && this.appSubMenus.el;
        if (sub) sub.classList.toggle('o_hidden', !this.isInApp);
        const bc = nav.querySelector('.o_breadcrumb');
        if (bc) bc.classList.toggle('o_hidden', !this.isInApp);
    },

    onAllAppsBtnClick() {
        if (this.hm) {
            this.hm.toggle(true);
            this._closeAppMenuSidebar();
        }
    },
});

patch(NavBar, {
    components: { ...NavBar.components, AppsMenu },
});
