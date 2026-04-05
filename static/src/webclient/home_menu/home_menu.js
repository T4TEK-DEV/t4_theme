/** @odoo-module **/
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { user } from "@web/core/user";
import { hasTouch, isIosApp, isMacOS } from "@web/core/browser/feature_detection";
import { useHotkey } from "@web/core/hotkeys/hotkey_hook";
import { useBus, useService } from "@web/core/utils/hooks";
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

// ── Constants ──
const DEFAULT_GRID_COLS = 6;

const WIDGET_DEFAULTS = {
    logo: { x: 50, y: 10, scale: 1, visible: true },
    time: { x: 50, y: 60, scale: 1, visible: true },
    date: { x: 50, y: 140, scale: 1, visible: true },
};

// ── Config Helpers ──

function parseConfig(raw) {
    if (!raw) {
        return {
            appOrder: null, appPositions: null, gridCols: DEFAULT_GRID_COLS,
            ...structuredClone(WIDGET_DEFAULTS),
        };
    }
    if (Array.isArray(raw)) {
        return {
            appOrder: raw, appPositions: null, gridCols: DEFAULT_GRID_COLS,
            ...structuredClone(WIDGET_DEFAULTS),
        };
    }
    const legacy = raw.clock || {};
    return {
        appOrder: raw.appOrder || null,
        appPositions: raw.appPositions || null,
        gridCols: raw.gridCols || DEFAULT_GRID_COLS,
        logo: { ...WIDGET_DEFAULTS.logo, ...(raw.logo || {}) },
        time: { ...WIDGET_DEFAULTS.time, ...(raw.time || legacy) },
        date: { ...WIDGET_DEFAULTS.date, ...(raw.date || {}) },
    };
}

function buildConfig(appOrder, appPositions, gridCols, logo, time, date) {
    return { appOrder, appPositions, gridCols, logo, time, date };
}

function generatePositions(apps, gridCols) {
    const positions = {};
    apps.forEach((app, idx) => {
        positions[app.xmlid] = {
            row: Math.floor(idx / gridCols),
            col: idx % gridCols,
        };
    });
    return positions;
}

function extractPos(s) {
    return { x: s.x, y: s.y, scale: s.scale, visible: s.visible };
}

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

        this.state = useState({
            focusedIndex: null,
            isIosApp: isIosApp(),
            draggingApp: null,
            highlightRow: -1,
            highlightCol: -1,
        });
        this.inputRef = useRef("input");
        this.rootRef = useRef("root");
        this.toolbarRef = useRef("toolbar");
        this.gridRef = useRef("grid");

        // Parse config
        const raw = JSON.parse(user.settings?.homemenu_config || "null");
        const cfg = parseConfig(raw);
        this._gridCols = cfg.gridCols || DEFAULT_GRID_COLS;

        // Initialize app positions
        if (cfg.appPositions && Object.keys(cfg.appPositions).length) {
            this.appPositions = useState({ ...cfg.appPositions });
        } else {
            this.appPositions = useState(generatePositions(this.props.apps, this._gridCols));
        }
        this._ensureAllAppsPositioned();

        // Widget states
        this.logoState = useState({ ...cfg.logo, dragging: false });
        this.timeState = useState({ ...cfg.time, dragging: false, hours: '', minutes: '', seconds: '', period: '' });
        this.dateState = useState({ ...cfg.date, dragging: false, text: '' });
        this._updateClock();

        if (!this.env.isSmall) this._registerHotkeys();

        useBus(this.env.bus, "HOME-MENU:EDIT-TOGGLED", () => this.render());

        onWillUpdateProps(() => {
            this.state.focusedIndex = null;
            this._ensureAllAppsPositioned();
        });
        onMounted(() => {
            this._clockInterval = setInterval(() => this._updateClock(), 1000);
            if (!hasTouch()) this._focusInput();
        });
        onWillUnmount(() => {
            if (this._clockInterval) clearInterval(this._clockInterval);
            this._cleanupDrag();
        });
        onPatched(() => {
            if (this.state.focusedIndex !== null && !this.env.isSmall) {
                const el = document.querySelector(".o_home_menu .o_menuitem.o_focused");
                if (el) el.scrollIntoView({ block: "center" });
            }
        });
    }

    // ── Ensure all apps have positions ──
    _ensureAllAppsPositioned() {
        const occupied = new Set(
            Object.values(this.appPositions).map((p) => `${p.row},${p.col}`)
        );
        for (const app of this.props.apps) {
            if (!this.appPositions[app.xmlid]) {
                for (let r = 0; ; r++) {
                    let placed = false;
                    for (let c = 0; c < this._gridCols; c++) {
                        const key = `${r},${c}`;
                        if (!occupied.has(key)) {
                            this.appPositions[app.xmlid] = { row: r, col: c };
                            occupied.add(key);
                            placed = true;
                            break;
                        }
                    }
                    if (placed) break;
                }
            }
        }
        // Remove positions for apps that no longer exist
        const appXmlids = new Set(this.props.apps.map((a) => a.xmlid));
        for (const xmlid of Object.keys(this.appPositions)) {
            if (!appXmlids.has(xmlid)) {
                delete this.appPositions[xmlid];
            }
        }
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
        // Reset app positions to default grid
        const newPositions = generatePositions(this.props.apps, this._gridCols);
        for (const key of Object.keys(this.appPositions)) {
            delete this.appPositions[key];
        }
        Object.assign(this.appPositions, newPositions);
        this._saveConfig();
        this._syncBackendOrder();
    }

    // ── Compact Apps ──
    compactApps() {
        const ordered = this._getOrderFromPositions();
        const newPositions = {};
        ordered.forEach((xmlid, idx) => {
            newPositions[xmlid] = {
                row: Math.floor(idx / this._gridCols),
                col: idx % this._gridCols,
            };
        });
        for (const key of Object.keys(this.appPositions)) {
            delete this.appPositions[key];
        }
        Object.assign(this.appPositions, newPositions);
        this._saveConfig();
    }

    // ── Generic Widget Drag ──
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

    // ── Generic Widget Resize ──
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

    // ── Grid Properties ──
    get gridCols() { return this._gridCols; }

    get gridRows() {
        const positions = Object.values(this.appPositions);
        if (!positions.length) return this.editMode ? 2 : 1;
        const maxRow = Math.max(0, ...positions.map((p) => p.row));
        return maxRow + (this.editMode ? 2 : 1);
    }

    get gridStyle() {
        return `grid-template-columns: repeat(${this.gridCols}, 1fr);`;
    }

    get gridCells() {
        const cols = this.gridCols;
        const rows = this.gridRows;
        const appByPos = {};

        for (const app of this.props.apps) {
            const pos = this.appPositions[app.xmlid];
            if (pos) {
                appByPos[`${pos.row},${pos.col}`] = app;
            }
        }

        // Build display-order index map
        const sortedApps = this.displayedApps;
        const appIndexMap = {};
        sortedApps.forEach((app, idx) => { appIndexMap[app.xmlid] = idx; });

        const cells = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const app = appByPos[`${r},${c}`] || null;
                if (app || this.editMode) {
                    cells.push({
                        row: r,
                        col: c,
                        app,
                        appIndex: app ? (appIndexMap[app.xmlid] ?? -1) : -1,
                    });
                }
            }
        }
        return cells;
    }

    cellStyle(cell) {
        return `grid-row: ${cell.row + 1}; grid-column: ${cell.col + 1};`;
    }

    // ── App Grid Drag & Drop ──
    onAppGridDrag(ev, app) {
        if (!this.editMode) return;
        if (ev.target.closest('.t4_edit_icon')) return;

        // Prevent native browser drag on <a>/<img> — critical for custom drag to work
        ev.preventDefault();
        ev.stopPropagation();

        const isTouch = !!ev.touches;
        const start = isTouch ? ev.touches[0] : ev;
        const sx = start.clientX, sy = start.clientY;
        let moved = false;
        let ghost = null;

        // Use ev.target.closest() — more reliable than ev.currentTarget in OWL delegation
        const cellEl = ev.target.closest('.t4_hm_cell');
        if (!cellEl) return;

        const onMove = (e) => {
            const pt = e.touches ? e.touches[0] : e;
            const dx = pt.clientX - sx, dy = pt.clientY - sy;

            if (!moved) {
                if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                moved = true;
                this.state.draggingApp = app.xmlid;

                // Create ghost element
                ghost = cellEl.cloneNode(true);
                ghost.classList.add('t4_hm_drag_ghost');
                ghost.style.cssText = `
                    position: fixed;
                    width: ${cellEl.offsetWidth}px;
                    height: ${cellEl.offsetHeight}px;
                    pointer-events: none;
                    z-index: 9999;
                    opacity: 0.85;
                    transform: rotate(3deg) scale(1.05);
                    transition: none;
                `;
                document.body.appendChild(ghost);
            }

            if (isTouch) e.preventDefault();

            if (ghost) {
                ghost.style.left = (pt.clientX - cellEl.offsetWidth / 2) + 'px';
                ghost.style.top = (pt.clientY - cellEl.offsetHeight / 2) + 'px';
            }

            // Find target cell under cursor
            if (ghost) ghost.style.display = 'none';
            const el = document.elementFromPoint(pt.clientX, pt.clientY);
            if (ghost) ghost.style.display = '';

            const targetCell = el?.closest('.t4_hm_cell');
            if (targetCell) {
                this.state.highlightRow = parseInt(targetCell.dataset.row);
                this.state.highlightCol = parseInt(targetCell.dataset.col);
            } else {
                this.state.highlightRow = -1;
                this.state.highlightCol = -1;
            }
        };

        const onEnd = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);

            if (ghost) {
                ghost.remove();
                ghost = null;
            }

            if (moved && this.state.highlightRow >= 0 && this.state.highlightCol >= 0) {
                this._moveAppToCell(app.xmlid, this.state.highlightRow, this.state.highlightCol);
            }

            this.state.draggingApp = null;
            this.state.highlightRow = -1;
            this.state.highlightCol = -1;
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }

    _moveAppToCell(xmlid, targetRow, targetCol) {
        const currentPos = this.appPositions[xmlid];
        if (currentPos && currentPos.row === targetRow && currentPos.col === targetCol) return;

        // Check if target cell is occupied
        const occupantEntry = Object.entries(this.appPositions).find(
            ([id, pos]) => pos.row === targetRow && pos.col === targetCol && id !== xmlid
        );

        if (occupantEntry) {
            // Swap positions
            const [occupantId] = occupantEntry;
            this.appPositions[occupantId] = { row: currentPos.row, col: currentPos.col };
        }

        this.appPositions[xmlid] = { row: targetRow, col: targetCol };
        this._saveConfig();
        this._syncBackendOrder();
    }

    _cleanupDrag() {
        const ghost = document.querySelector('.t4_hm_drag_ghost');
        if (ghost) ghost.remove();
    }

    // ── Save ──
    _saveConfig() {
        const order = this._getOrderFromPositions();
        const positions = {};
        for (const [xmlid, pos] of Object.entries(this.appPositions)) {
            positions[xmlid] = { row: pos.row, col: pos.col };
        }
        const cfg = buildConfig(
            order, positions, this._gridCols,
            extractPos(this.logoState), extractPos(this.timeState), extractPos(this.dateState)
        );
        try { user.setUserSettings("homemenu_config", JSON.stringify(cfg)); } catch {}
    }

    _getOrderFromPositions() {
        return Object.entries(this.appPositions)
            .sort(([, a], [, b]) => a.row !== b.row ? a.row - b.row : a.col - b.col)
            .map(([xmlid]) => xmlid);
    }

    _syncBackendOrder() {
        const order = this._getOrderFromPositions();
        this.props.reorderApps(order);
        this.orm.call("ir.ui.menu", "reorder_apps_sequence", [order]).catch(() => {});
    }

    // ── Apps ──
    get displayedApps() {
        return [...this.props.apps].sort((a, b) => {
            const pa = this.appPositions[a.xmlid] || { row: 999, col: 999 };
            const pb = this.appPositions[b.xmlid] || { row: 999, col: 999 };
            return pa.row !== pb.row ? pa.row - pb.row : pa.col - pb.col;
        });
    }

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
        const apps = this.displayedApps;
        const lastIndex = apps.length - 1;
        if (lastIndex < 0) return;
        if (this.state.focusedIndex === null) { this.state.focusedIndex = 0; return; }

        const fi = this.state.focusedIndex;

        if (cmd === "nextElem") {
            this.state.focusedIndex = fi >= lastIndex ? 0 : fi + 1;
            return;
        }
        if (cmd === "previousElem") {
            this.state.focusedIndex = fi <= 0 ? lastIndex : fi - 1;
            return;
        }

        // Grid-based navigation
        const currentApp = apps[fi];
        if (!currentApp) return;
        const currentPos = this.appPositions[currentApp.xmlid];
        if (!currentPos) return;

        let targetRow = currentPos.row;
        let targetCol = currentPos.col;

        switch (cmd) {
            case "nextColumn": targetCol++; break;
            case "previousColumn": targetCol--; break;
            case "nextLine": targetRow++; break;
            case "previousLine": targetRow--; break;
        }

        // Find closest app to target position
        let bestIdx = fi;
        let bestDist = Infinity;
        apps.forEach((app, idx) => {
            const pos = this.appPositions[app.xmlid];
            if (!pos) return;
            const dist = Math.abs(pos.row - targetRow) * 1000 + Math.abs(pos.col - targetCol);
            if (dist < bestDist && dist > 0) {
                bestDist = dist;
                bestIdx = idx;
            }
        });
        this.state.focusedIndex = bestIdx;
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
