import { url } from '@web/core/utils/urls';
import { useService } from '@web/core/utils/hooks';
import { user } from "@web/core/user";

import { Component, onWillUnmount, useState } from '@odoo/owl';

export class AppsBar extends Component {
	static template = 'muk_web_appsbar.AppsBar';
    static props = {};

	setup() {
        this.appMenuService = useService('app_menu');
        this.menuService = useService('menu');

    	if (user.activeCompany.has_appsbar_image) {
            this.sidebarImageUrl = url('/web/image', {
                model: 'res.company',
                field: 'appbar_image',
                id: user.activeCompany.id,
            });
    	}

        this.flyout = useState({
            visible: false,
            appId: null,
            sections: [],
            top: 0,
        });

    	const renderAfterMenuChange = () => {
            this.flyout.visible = false;
            this.render();
        };
        this.env.bus.addEventListener(
        	'MENUS:APP-CHANGED', renderAfterMenuChange
        );
        onWillUnmount(() => {
            this.env.bus.removeEventListener(
            	'MENUS:APP-CHANGED', renderAfterMenuChange
            );
        });
    }

    get isSmallMode() {
        const panel = document.querySelector('.t4_sidebar_panel');
        return panel && panel.classList.contains('sm');
    }

    _onAppClick(app) {
        this.flyout.visible = false;
        return this.appMenuService.selectApp(app);
    }

    _onAppMouseEnter(app, ev) {
        // Show flyout in small mode when hovering active app
        if (!this.isSmallMode) {
            return;
        }
        this._showFlyout(app, ev.currentTarget);
    }

    _onAppClickFlyout(app, ev) {
        // In small mode, clicking active app toggles flyout instead of navigating
        if (this.isSmallMode && app.id === this.appMenuService.getCurrentApp()?.id) {
            ev.preventDefault();
            if (this.flyout.visible && this.flyout.appId === app.id) {
                this.flyout.visible = false;
            } else {
                this._showFlyout(app, ev.currentTarget);
            }
            return;
        }
        this.flyout.visible = false;
        return this.appMenuService.selectApp(app);
    }

    _showFlyout(app, targetEl) {
        const tree = this.menuService.getMenuAsTree(app.id);
        const sections = tree.childrenTree || [];
        if (!sections.length) {
            this.flyout.visible = false;
            return;
        }
        // Position flyout next to the clicked item
        const rect = targetEl.getBoundingClientRect();
        this.flyout.appId = app.id;
        this.flyout.sections = sections;
        this.flyout.top = rect.top;
        this.flyout.visible = true;
    }

    _onFlyoutMenuClick(menuItem) {
        this.flyout.visible = false;
        this.menuService.selectMenu(menuItem);
    }

    _onFlyoutMouseLeave() {
        this.flyout.visible = false;
    }

    get flyoutStyle() {
        return `top: ${this.flyout.top}px`;
    }
}
