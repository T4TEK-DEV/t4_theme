/** @odoo-module **/
import { patch } from '@web/core/utils/patch';
import { useService, useBus } from '@web/core/utils/hooks';
import { _t } from '@web/core/l10n/translation';
import { useEffect, useRef } from '@odoo/owl';

import { NavBar } from '@web/webclient/navbar/navbar';
import { AppsMenu } from '@t4_theme/webclient/appsmenu/appsmenu';

patch(NavBar.prototype, {
    setup() {
        super.setup();
        this.appMenuService = useService('app_menu');

        // home_menu service: safe access (may not be started yet)
        this.hm = this.env.services.t4_home_menu || null;

        if (this.hm) {
            this.menuAppsRef = useRef('menuApps');
            this.navRef = useRef('nav');
            useBus(this.env.bus, 'HOME-MENU:TOGGLED', () => this._updateMenuAppsIcon());
            useEffect(() => this._updateMenuAppsIcon());
        }
    },

    get hasBackgroundAction() {
        return this.hm ? this.hm.hasBackgroundAction : false;
    },

    get isInApp() {
        return this.hm ? !this.hm.hasHomeMenu : true;
    },

    _openAppMenuSidebar() {
        if (this.hm && this.hm.hasHomeMenu) {
            this.hm.toggle(false);
        } else {
            this.state.isAppMenuSidebarOpened = true;
        }
    },

    _updateMenuAppsIcon() {
        if (!this.menuAppsRef || !this.menuAppsRef.el) return;
        const el = this.menuAppsRef.el;
        el.classList.toggle('o_hidden', !this.isInApp && !this.hasBackgroundAction);
        el.classList.toggle('o_menu_toggle_back', !this.isInApp && this.hasBackgroundAction);
        el.title = (!this.isInApp && this.hasBackgroundAction) ? _t('Previous view') : _t('Home menu');

        const nav = this.navRef && this.navRef.el;
        if (!nav) return;
        for (const sel of ['.o_menu_brand', '.o_menu_brand_icon']) {
            const el2 = nav.querySelector(sel);
            if (el2) el2.classList.toggle('o_hidden', !this.isInApp);
        }
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
