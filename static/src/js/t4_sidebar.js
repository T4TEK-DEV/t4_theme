/** @odoo-module **/

import { Component, useState, onMounted } from "@odoo/owl";
import { useService, useBus } from "@web/core/utils/hooks";
import { browser } from "@web/core/browser/browser";
import { user } from "@web/core/user";

const STORAGE_KEY_COLLAPSED = "t4_sidebar_collapsed";
const STORAGE_KEY_WIDTH = "t4_sidebar_width";
const STORAGE_KEY_RECENTS = "t4_sidebar_recents";
const DEFAULT_WIDTH = 240;
const COLLAPSED_WIDTH = 52;
const MIN_WIDTH = 180;
const MAX_WIDTH = 360;
const MAX_RECENTS = 30;

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

        // Read preferences from user settings (server-persisted), fallback to localStorage
        const settings = user.settings || {};
        const savedCollapsed = settings.t4_sidebar_collapsed
            ?? (browser.localStorage.getItem(STORAGE_KEY_COLLAPSED) === "true");
        const savedWidth = settings.t4_sidebar_width
            || parseInt(browser.localStorage.getItem(STORAGE_KEY_WIDTH))
            || DEFAULT_WIDTH;

        this.state = useState({
            collapsed: savedCollapsed,
            width: savedWidth,
            resizing: false,
            expandedMenus: {},
            recentItems: this._loadRecents(),
        });

        // Listen for app changes to update submenu
        useBus(this.env.bus, "MENUS:APP-CHANGED", () => {
            this.state.expandedMenus = {};
        });

        // Track navigation actions for recent items
        useBus(this.env.bus, "ACTION_MANAGER:UI-UPDATED", () => {
            this._trackCurrentAction();
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
        // Persist to server (fire-and-forget)
        user.setUserSettings("t4_sidebar_collapsed", this.state.collapsed).catch(() => {});
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
            user.setUserSettings("t4_sidebar_width", this.state.width).catch(() => {});
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }

    // ---- Recent Items ----

    _loadRecents() {
        try {
            const raw = browser.localStorage.getItem(STORAGE_KEY_RECENTS);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    _saveRecents() {
        browser.localStorage.setItem(
            STORAGE_KEY_RECENTS,
            JSON.stringify(this.state.recentItems)
        );
    }

    _trackCurrentAction() {
        const controller = this.actionService.currentController;
        if (!controller || !controller.action) return;

        const action = controller.action;
        // Only track window actions with a display name
        if (action.type !== "ir.actions.act_window" || !action.display_name) return;

        const entry = {
            id: `${action.id || action.xml_id}_${action.res_model || ""}`,
            name: action.display_name,
            actionId: action.id || action.xml_id,
            appName: this.currentApp?.name || "",
            timestamp: Date.now(),
        };

        // Deduplicate: remove existing entry with same id
        const filtered = this.state.recentItems.filter((r) => r.id !== entry.id);
        // Prepend new entry, trim to max
        this.state.recentItems = [entry, ...filtered].slice(0, MAX_RECENTS);
        this._saveRecents();
    }

    onRecentClick(item) {
        if (item.actionId) {
            this.actionService.doAction(item.actionId, { clearBreadcrumbs: true });
        }
    }

    clearRecents() {
        this.state.recentItems = [];
        this._saveRecents();
    }
}
