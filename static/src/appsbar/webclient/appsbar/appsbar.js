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

        this.subnav = useState({
            visible: false,
            appId: null,
            sections: [],
            top: 0,
        });

        // Track collapsed sections
        this.collapsedSections = useState({});

        const renderAfterMenuChange = () => {
            this.subnav.visible = false;
            this._sectionsCache = {}; // invalidate cache on menu change
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

    _getAppSections(app) {
        // Cache sections per app to avoid repeated tree lookups during render
        if (!this._sectionsCache) {
            this._sectionsCache = {};
        }
        if (!this._sectionsCache[app.id]) {
            const tree = this.menuService.getMenuAsTree(app.id);
            this._sectionsCache[app.id] = tree.childrenTree || [];
        }
        return this._sectionsCache[app.id];
    }

    _onAppClick(app, ev) {
        this.subnav.visible = false;
        return this.appMenuService.selectApp(app);
    }

    _onShowSubnav(app, ev) {
        ev.preventDefault();
        ev.stopPropagation();

        const sections = this._getAppSections(app);
        if (!sections.length) {
            this.subnav.visible = false;
            return;
        }

        // Toggle if same app
        if (this.subnav.visible && this.subnav.appId === app.id) {
            this.subnav.visible = false;
            return;
        }

        const itemRect = ev.currentTarget.closest('.nav-item').getBoundingClientRect();
        const panel = ev.currentTarget.closest('.mk_apps_sidebar_panel');
        const panelRight = panel ? panel.getBoundingClientRect().right : itemRect.right;
        this.subnav.appId = app.id;
        this.subnav.sections = sections;
        this.subnav.top = itemRect.top;
        this.subnav.left = panelRight + 5;
        this.subnav.visible = true;
    }

    _toggleSection(sectionId) {
        this.collapsedSections[sectionId] = !this.collapsedSections[sectionId];
    }

    _isSectionCollapsed(sectionId) {
        return !!this.collapsedSections[sectionId];
    }

    _onSubnavMenuClick(menuItem) {
        this.subnav.visible = false;
        this.menuService.selectMenu(menuItem);
    }

    _onSubnavMouseLeave() {
        this.subnav.visible = false;
    }

    get subnavStyle() {
        return `top: ${this.subnav.top}px; left: ${this.subnav.left || 0}px`;
    }
}
