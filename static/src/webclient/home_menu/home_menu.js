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

// ── Config Helpers ──

const WIDGET_DEFAULTS = {
    logo: { x: 50, y: 10, scale: 1, visible: true },
    time: { x: 50, y: 60, scale: 1, visible: true },
    date: { x: 50, y: 140, scale: 1, visible: true },
};

function parseConfig(raw) {
    if (!raw) return { appOrder: null, ...structuredClone(WIDGET_DEFAULTS) };
    if (Array.isArray(raw)) return { appOrder: raw, ...structuredClone(WIDGET_DEFAULTS) };
    // Migrate old "clock" key to "time" + "date"
    const legacy = raw.clock || {};
    return {
        appOrder: raw.appOrder || null,
        logo: { ...WIDGET_DEFAULTS.logo, ...(raw.logo || {}) },
        time: { ...WIDGET_DEFAULTS.time, ...(raw.time || legacy) },
        date: { ...WIDGET_DEFAULTS.date, ...(raw.date || {}) },
    };
}

function buildConfig(appOrder, logo, time, date) {
    return { appOrder, logo, time, date };
}

function extractPos(s) { return { x: s.x, y: s.y, scale: s.scale, visible: s.visible }; }

// ── Footer for command palette ──
class FooterComponent extends Component {
    static template = "t4_theme.HomeMenu.CommandPalette.Footer";
    static props = { switchNamespace: { type: Function, optional: true } };
    setup() { this.controlKey = isMacOS() ? "COMMAND" : "CONTROL"; }
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
        this.hm = useService("t4_home_menu");
        this.ui = useService("ui");
        this.dialog = useService("dialog");
        this.orm = useService("orm");

        this.state = useState({ focusedIndex: null, isIosApp: isIosApp() });
        this.inputRef = useRef("input");
        this.rootRef = useRef("root");
        this.toolbarRef = useRef("toolbar");

        // Parse config
        const raw = JSON.parse(user.settings?.homemenu_config || "null");
        const cfg = parseConfig(raw);

        // Widget states
        this.logoState = useState({ ...cfg.logo, dragging: false });
        this.timeState = useState({ ...cfg.time, dragging: false, hours: '', minutes: '', seconds: '', period: '' });
        this.dateState = useState({ ...cfg.date, dragging: false, text: '' });
        this._updateClock();

        if (!this.env.isSmall) this._registerHotkeys();

        useSortable({
            enable: () => this.hm.editMode,
            ref: this.rootRef,
            elements: ".o_draggable",
            cursor: "move",
            delay: 200,
            tolerance: 10,
            onWillStartDrag: ({ element, addClass }) => addClass(element.children[0], "o_dragged_app"),
            onDrop: ({ element, previous }) => this._sortAppDrop(element, previous),
        });

        useBus(this.env.bus, "HOME-MENU:EDIT-TOGGLED", () => this.render());

        onWillUpdateProps(() => { this.state.focusedIndex = null; });
        onMounted(() => {
            this._clockInterval = setInterval(() => this._updateClock(), 1000);
            if (!hasTouch()) this._focusInput();
        });
        onWillUnmount(() => {
            if (this._clockInterval) clearInterval(this._clockInterval);
        });
        onPatched(() => {
            if (this.state.focusedIndex !== null && !this.env.isSmall) {
                const el = document.querySelector(".o_home_menu .o_menuitem.o_focused");
                if (el) el.scrollIntoView({ block: "center" });
            }
        });
    }

    // ── Edit Mode ──
    get editMode() { return this.hm.editMode; }

    // ── Clock ──
    _updateClock() {
        const now = new Date();
        const h = now.getHours();
        const h12 = h % 12 || 12;
        this.timeState.hours = String(h12).padStart(2, '0');
        this.timeState.minutes = String(now.getMinutes()).padStart(2, '0');
        this.timeState.seconds = String(now.getSeconds()).padStart(2, '0');
        this.timeState.period = h >= 12 ? 'PM' : 'AM';
        this.dateState.text = now.toLocaleDateString([], {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });
    }

    // ── Widget Style/Visibility ──
    _widgetStyle(s) {
        return `left:${s.x}%;top:${s.y}px;transform:translate(-50%,0) scale(${s.scale});`;
    }
    get logoStyle() { return this._widgetStyle(this.logoState); }
    get timeStyle() { return this._widgetStyle(this.timeState); }
    get dateStyle() { return this._widgetStyle(this.dateState); }
    get companyLogoUrl() { return '/web/binary/company_logo'; }

    // ── Toggle Visibility ──
    toggleWidget(name) {
        const st = this[name + 'State'];
        st.visible = !st.visible;
        this._saveConfig();
    }

    // ── Reset to Default ──
    resetHomeMenu() {
        const defs = structuredClone(WIDGET_DEFAULTS);
        Object.assign(this.logoState, defs.logo, { dragging: false });
        Object.assign(this.timeState, defs.time, { dragging: false });
        Object.assign(this.dateState, defs.date, { dragging: false });
        this._saveConfig();
    }

    // ── Generic Drag ──
    _startDrag(widgetState, ev) {
        if (!this.editMode || widgetState.dragging) return;
        ev.preventDefault();
        const start = ev.touches ? ev.touches[0] : ev;
        const sx = start.clientX, sy = start.clientY;
        const origX = widgetState.x, origY = widgetState.y;
        const rootW = this.rootRef.el.offsetWidth;
        widgetState.dragging = true;

        const onMove = (e) => {
            const pt = e.touches ? e.touches[0] : e;
            widgetState.x = Math.max(5, Math.min(95, origX + ((pt.clientX - sx) / rootW) * 100));
            widgetState.y = Math.max(0, origY + (pt.clientY - sy));
        };
        const onEnd = () => {
            widgetState.dragging = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
            this._saveConfig();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }

    // ── Generic Resize ──
    _startResize(widgetState, ev) {
        if (!this.editMode) return;
        ev.preventDefault();
        ev.stopPropagation();
        const sy = (ev.touches ? ev.touches[0] : ev).clientY;
        const origScale = widgetState.scale;

        const onMove = (e) => {
            const pt = e.touches ? e.touches[0] : e;
            widgetState.scale = Math.max(0.3, Math.min(3, origScale + (pt.clientY - sy) * 0.005));
        };
        const onEnd = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
            this._saveConfig();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }

    // Event handlers (delegate to generic)
    onLogoDrag(ev) { this._startDrag(this.logoState, ev); }
    onLogoResize(ev) { this._startResize(this.logoState, ev); }
    onTimeDrag(ev) { this._startDrag(this.timeState, ev); }
    onTimeResize(ev) { this._startResize(this.timeState, ev); }
    onDateDrag(ev) { this._startDrag(this.dateState, ev); }
    onDateResize(ev) { this._startResize(this.dateState, ev); }

    // ── Toolbar Drag ──
    onToolbarDrag(ev) {
        // Only drag from grip or empty area, not from buttons
        if (ev.target.closest('button')) return;
        ev.preventDefault();
        const el = this.toolbarRef.el;
        if (!el) return;
        const start = ev.touches ? ev.touches[0] : ev;
        const rect = el.getBoundingClientRect();
        const offsetX = start.clientX - rect.left;
        const offsetY = start.clientY - rect.top;

        const onMove = (e) => {
            const pt = e.touches ? e.touches[0] : e;
            el.style.left = (pt.clientX - offsetX) + 'px';
            el.style.top = (pt.clientY - offsetY) + 'px';
            el.style.transform = 'none';
        };
        const onEnd = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }

    // ── Save ──
    _saveConfig() {
        const order = this.props.apps.map((a) => a.xmlid);
        const cfg = buildConfig(order, extractPos(this.logoState), extractPos(this.timeState), extractPos(this.dateState));
        try { user.setUserSettings("homemenu_config", JSON.stringify(cfg)); } catch {}
    }

    // ── Apps ──
    get displayedApps() { return this.props.apps; }
    get maxIconNumber() {
        const w = window.innerWidth;
        return w < 576 ? 3 : w < 768 ? 4 : 6;
    }

    _openMenu(menu) {
        if (this.editMode) return;
        return this.menus.selectMenu(menu);
    }
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

        const cfg = buildConfig(order, extractPos(this.logoState), extractPos(this.timeState), extractPos(this.dateState));
        try { user.setUserSettings("homemenu_config", JSON.stringify(cfg)); } catch {}
        this.orm.call("ir.ui.menu", "reorder_apps_sequence", [order]).catch(() => {});
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
            ["Escape", () => {
                if (this.editMode) { this.hm.toggleEditMode(); }
                else { this.hm.toggle(false); }
            }],
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
        const raw = JSON.parse(user.settings?.homemenu_config || "null");
        const cfg = parseConfig(raw);
        const apps = reactive(computeAppsAndMenuItems(this.menus.getMenuAsTree("root")).apps);
        if (cfg.appOrder) reorderApps(apps, cfg.appOrder);
        return { apps, reorderApps: (order) => reorderApps(apps, order) };
    }
}

registry.category("actions").add("menu", HomeMenuAction);
