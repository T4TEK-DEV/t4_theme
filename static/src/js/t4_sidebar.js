/** @odoo-module **/

import { Component, useState, onMounted } from "@odoo/owl";
import { useService, useBus } from "@web/core/utils/hooks";
import { browser } from "@web/core/browser/browser";

const STORAGE_KEY_COLLAPSED = "t4_sidebar_collapsed";
const STORAGE_KEY_WIDTH = "t4_sidebar_width";
const DEFAULT_WIDTH = 240;
const COLLAPSED_WIDTH = 52;
const MIN_WIDTH = 180;
const MAX_WIDTH = 360;

/**
 * T4 Sidebar — Persistent vertical navigation sidebar.
 *
 * Features:
 * - App icons list (vertical)
 * - Current app submenu items (expandable)
 * - Collapse/expand toggle
 * - Sidebar resize via drag
 * - Recent items section
 *
 * Adapted from udoo_om_ux sidenav patterns for Odoo 19.
 */
export class T4Sidebar extends Component {
    static template = "t4_theme.Sidebar";
    static props = {};

    setup() {
        this.menuService = useService("menu");
        this.actionService = useService("action");

        const savedCollapsed = browser.localStorage.getItem(STORAGE_KEY_COLLAPSED) === "true";
        const savedWidth = parseInt(browser.localStorage.getItem(STORAGE_KEY_WIDTH)) || DEFAULT_WIDTH;

        this.state = useState({
            collapsed: savedCollapsed,
            width: savedWidth,
            resizing: false,
            expandedMenus: {},
        });

        // Listen for app changes to update submenu
        useBus(this.env.bus, "MENUS:APP-CHANGED", () => {
            this.state.expandedMenus = {};
        });

        onMounted(() => {
            this._applySidebarStyle();
        });
    }

    // ---- Getters ----

    get apps() {
        return this.menuService.getApps();
    }

    get currentApp() {
        return this.menuService.getCurrentApp();
    }

    get currentAppTree() {
        const app = this.currentApp;
        if (!app) return null;
        return this.menuService.getMenuAsTree(app.id);
    }

    get subMenuItems() {
        const tree = this.currentAppTree;
        if (!tree || !tree.childrenTree) return [];
        return tree.childrenTree;
    }

    get sidebarWidth() {
        return this.state.collapsed ? COLLAPSED_WIDTH : this.state.width;
    }

    get sidebarStyle() {
        return `width: ${this.sidebarWidth}px;`;
    }

    // ---- App Navigation ----

    onAppClick(app) {
        this.menuService.selectMenu(app);
    }

    isActiveApp(app) {
        const current = this.currentApp;
        return current && current.id === app.id;
    }

    getAppIcon(app) {
        if (app.webIconData) {
            return app.webIconData;
        }
        return null;
    }

    getAppIconClass(app) {
        const webIcon = app.webIcon;
        if (webIcon && typeof webIcon === "string") {
            const parts = webIcon.split(",");
            if (parts.length >= 1 && parts[0].startsWith("fa-")) {
                return `fa ${parts[0]}`;
            }
        }
        return "fa fa-th-large";
    }

    getAppIconColor(app) {
        const webIcon = app.webIcon;
        if (webIcon && typeof webIcon === "string") {
            const parts = webIcon.split(",");
            if (parts.length >= 2) {
                return parts[1].trim();
            }
        }
        return null;
    }

    getAppIconBg(app) {
        const webIcon = app.webIcon;
        if (webIcon && typeof webIcon === "string") {
            const parts = webIcon.split(",");
            if (parts.length >= 3) {
                return parts[2].trim();
            }
        }
        return null;
    }

    // ---- Submenu Navigation ----

    onMenuItemClick(menuItem) {
        if (menuItem.actionID) {
            this.menuService.selectMenu(menuItem);
        } else if (menuItem.childrenTree && menuItem.childrenTree.length) {
            this.toggleMenuExpand(menuItem.id);
        }
    }

    toggleMenuExpand(menuId) {
        this.state.expandedMenus[menuId] = !this.state.expandedMenus[menuId];
    }

    isMenuExpanded(menuId) {
        return !!this.state.expandedMenus[menuId];
    }

    // ---- Collapse/Expand ----

    toggleCollapse() {
        this.state.collapsed = !this.state.collapsed;
        browser.localStorage.setItem(STORAGE_KEY_COLLAPSED, String(this.state.collapsed));
        this._applySidebarStyle();
    }

    _applySidebarStyle() {
        const body = document.body;
        body.dataset.t4Sidebar = this.state.collapsed ? "collapsed" : "full";
        body.style.setProperty("--t4-sidebar-current-width", `${this.sidebarWidth}px`);
    }

    // ---- Resize ----

    onResizeStart(ev) {
        if (this.state.collapsed) return;
        ev.preventDefault();
        this.state.resizing = true;
        const startX = ev.clientX;
        const startWidth = this.state.width;

        const onMouseMove = (moveEv) => {
            const delta = moveEv.clientX - startX;
            const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
            this.state.width = newWidth;
            document.body.style.setProperty("--t4-sidebar-current-width", `${newWidth}px`);
        };

        const onMouseUp = () => {
            this.state.resizing = false;
            browser.localStorage.setItem(STORAGE_KEY_WIDTH, String(this.state.width));
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }
}
