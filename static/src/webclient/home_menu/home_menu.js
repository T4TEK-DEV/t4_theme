/** @odoo-module **/
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { user } from "@web/core/user";
import { hasTouch, isIosApp, isMacOS } from "@web/core/browser/feature_detection";
import { useHotkey } from "@web/core/hotkeys/hotkey_hook";
import { useBus, useService } from "@web/core/utils/hooks";
import { useSortable } from "@web/core/utils/sortable_owl";
import { computeAppsAndMenuItems, reorderApps } from "@web/webclient/menus/menu_helpers";
import { standardActionServiceProps } from "@web/webclient/actions/action_service";

import {
    Component,
    useExternalListener,
    onMounted,
    onPatched,
    onWillUnmount,
    onWillUpdateProps,
    useState,
    useRef,
    reactive,
    xml,
} from "@odoo/owl";

// ── Footer for command palette ──
class FooterComponent extends Component {
    static template = "t4_theme.HomeMenu.CommandPalette.Footer";
    static props = { switchNamespace: { type: Function, optional: true } };
    setup() {
        this.controlKey = isMacOS() ? "COMMAND" : "CONTROL";
    }
}

// ── HomeMenu Component ──
export class HomeMenu extends Component {
    static template = "t4_theme.HomeMenu";
    static props = {
        apps: { type: Array, element: { type: Object, shape: { "*": true } } },
        reorderApps: { type: Function },
    };

    setup() {
        this.command = useService("command");
        this.menus = useService("menu");
        this.homeMenuService = useService("t4_home_menu");
        this.ui = useService("ui");
        this.dialog = useService("dialog");
        this.state = useState({ focusedIndex: null, isIosApp: isIosApp() });
        this.inputRef = useRef("input");
        this.rootRef = useRef("root");

        if (!this.env.isSmall) {
            this._registerHotkeys();
        }

        useSortable({
            enable: () => true,
            ref: this.rootRef,
            elements: ".o_draggable",
            cursor: "move",
            delay: 500,
            tolerance: 10,
            onWillStartDrag: ({ element, addClass }) => addClass(element.children[0], "o_dragged_app"),
            onDrop: ({ element, previous }) => this._sortAppDrop(element, previous),
        });

        onWillUpdateProps(() => { this.state.focusedIndex = null; });
        onMounted(() => { if (!hasTouch()) this._focusInput(); });
        onPatched(() => {
            if (this.state.focusedIndex !== null && !this.env.isSmall) {
                const el = document.querySelector(".o_home_menu .o_menuitem.o_focused");
                if (el) el.scrollIntoView({ block: "center" });
            }
        });
    }

    get displayedApps() { return this.props.apps; }

    get maxIconNumber() {
        const w = window.innerWidth;
        return w < 576 ? 3 : w < 768 ? 4 : 6;
    }

    _openMenu(menu) { return this.menus.selectMenu(menu); }

    _onAppClick(app) { this._openMenu(app); }

    _focusInput() {
        if (!this.env.isSmall && this.inputRef.el) {
            this.inputRef.el.focus({ preventScroll: true });
        }
    }

    _updateFocusedIndex(cmd) {
        const nbrApps = this.displayedApps.length;
        const lastIndex = nbrApps - 1;
        if (lastIndex < 0) return;
        if (this.state.focusedIndex === null) { this.state.focusedIndex = 0; return; }
        const fi = this.state.focusedIndex;
        const cols = this.maxIconNumber;
        const lines = Math.ceil(nbrApps / cols);
        const curLine = Math.ceil((fi + 1) / cols);
        let ni;
        switch (cmd) {
            case "previousElem": ni = fi - 1; break;
            case "nextElem": ni = fi + 1; break;
            case "previousColumn": ni = fi % cols ? fi - 1 : fi + Math.min(lastIndex - fi, cols - 1); break;
            case "nextColumn": ni = (fi === lastIndex || (fi + 1) % cols === 0) ? (curLine - 1) * cols : fi + 1; break;
            case "previousLine": ni = curLine === 1 ? Math.min(fi + (lines - 1) * cols, lastIndex) : fi - cols; break;
            case "nextLine": ni = curLine === lines ? fi % cols : fi + Math.min(cols, lastIndex - fi); break;
        }
        this.state.focusedIndex = ni < 0 ? lastIndex : ni > lastIndex ? 0 : ni;
    }

    _sortAppDrop(element, previous) {
        const order = this.props.apps.map((a) => a.xmlid);
        const id = element.children[0].dataset.menuXmlid;
        order.splice(order.indexOf(id), 1);
        const prevIdx = previous ? order.indexOf(previous.children[0].dataset.menuXmlid) : -1;
        order.splice(prevIdx + 1, 0, id);
        this.props.reorderApps(order);
        try { user.setUserSettings("homemenu_config", JSON.stringify(order)); } catch {}
    }

    _registerHotkeys() {
        [
            ["ArrowDown", () => this._updateFocusedIndex("nextLine")],
            ["ArrowRight", () => this._updateFocusedIndex("nextColumn")],
            ["ArrowUp", () => this._updateFocusedIndex("previousLine")],
            ["ArrowLeft", () => this._updateFocusedIndex("previousColumn")],
            ["Tab", () => this._updateFocusedIndex("nextElem")],
            ["shift+Tab", () => this._updateFocusedIndex("previousElem")],
            ["Enter", () => { const m = this.displayedApps[this.state.focusedIndex]; if (m) this._openMenu(m); }],
            ["Escape", () => this.homeMenuService.toggle(false)],
        ].forEach((h) => useHotkey(...h, { allowRepeat: true }));
        useExternalListener(window, "keydown", () => {
            if (document.activeElement !== this.inputRef.el && this.ui.activeElement === document && !["TEXTAREA", "INPUT"].includes(document.activeElement.tagName)) {
                this._focusInput();
            }
        });
    }

    _onInputSearch() {
        const onClose = () => { this._focusInput(); if (this.inputRef.el) this.inputRef.el.value = ""; };
        const searchValue = this.compositionStart ? "/" : `/${this.inputRef.el.value.trim()}`;
        this.compositionStart = false;
        this.command.openMainPalette({ searchValue, FooterComponent }, onClose);
    }

    _onInputBlur() {
        if (hasTouch()) return;
        setTimeout(() => {
            if (document.activeElement === document.body && this.ui.activeElement === document) this._focusInput();
        }, 0);
    }

    _onCompositionStart() { this.compositionStart = true; }

    onEditIconClick(ev, app) {
        ev.preventDefault();
        ev.stopPropagation();
        const mod = odoo.loader.modules.get("@t4_theme/webclient/home_menu/icon_editor/icon_editor_dialog");
        if (!mod) return;
        const editedAppData = app.webIconData
            ? { webIconData: app.webIconData, type: "base64" }
            : { backgroundColor: app.webIcon?.backgroundColor || "#875A7B", color: app.webIcon?.color || "#FFFFFF", iconClass: app.webIcon?.iconClass || "fa fa-home", type: "custom_icon" };
        this.dialog.add(mod.IconEditorDialog, { editedAppData, appId: app.id });
    }
}

// ── Register HomeMenu as "menu" action ──
class HomeMenuAction extends Component {
    static components = { HomeMenu };
    static target = "current";
    static props = { ...standardActionServiceProps };
    static template = xml`<HomeMenu t-props="homeMenuProps"/>`;
    static displayName = _t("Home");

    setup() {
        this.menus = useService("menu");
        this.hm = useService("t4_home_menu");
        onMounted(() => {
            const hasBg = this.env.config.breadcrumbs.length > 0;
            this.hm.setHomeMenu(true, hasBg);
        });
        onWillUnmount(() => {
            this.hm.setHomeMenu(false, false);
        });
        useBus(this.env.bus, "MENUS:APP-CHANGED", () => this.render());
    }

    get homeMenuProps() {
        const cfg = JSON.parse(user.settings?.homemenu_config || "null");
        const apps = reactive(computeAppsAndMenuItems(this.menus.getMenuAsTree("root")).apps);
        if (cfg) reorderApps(apps, cfg);
        return { apps, reorderApps: (order) => reorderApps(apps, order) };
    }
}

registry.category("actions").add("menu", HomeMenuAction);
