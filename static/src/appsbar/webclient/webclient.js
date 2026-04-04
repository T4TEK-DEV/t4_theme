import { patch } from '@web/core/utils/patch';
import { useHotkey } from '@web/core/hotkeys/hotkey_hook';

import { WebClient } from '@web/webclient/webclient';
import { ResizablePanel } from '@web/core/resizable_panel/resizable_panel';
import { AppsBar } from '@t4_theme/appsbar/webclient/appsbar/appsbar';
import { onMounted, onWillUnmount, useState } from '@odoo/owl';

const SIDEBAR_KEY = 't4_sidebar';
// Half viewport — computed once, recalculated on window resize
let MAX_WIDTH = Math.floor(window.innerWidth / 2);
window.addEventListener('resize', () => {
    MAX_WIDTH = Math.floor(window.innerWidth / 2);
});
const SM_THRESHOLD = 142;
const DEFAULT_WIDTH = 200;

function _loadSidebarState() {
    try {
        const raw = localStorage.getItem(SIDEBAR_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function _saveSidebarState(state) {
    try {
        localStorage.setItem(SIDEBAR_KEY, JSON.stringify(state));
    } catch {}
}

function _updateSidebarCssVar(width) {
    document.documentElement.style.setProperty('--t4-sidebar-width', `${width}px`);
}

function _getInitialState() {
    const saved = _loadSidebarState();
    if (saved) {
        const mode = (saved.mode === 'small') ? 'large' : (saved.mode || 'large');
        return {
            mode: saved.visible === false ? 'hidden' : mode,
            width: saved.width || DEFAULT_WIDTH,
        };
    }
    const body = document.body;
    if (body.classList.contains('mk_sidebar_type_invisible') || body.classList.contains('mk_sidebar_type_hidden')) {
        return { mode: 'hidden', width: DEFAULT_WIDTH };
    }
    return { mode: 'large', width: DEFAULT_WIDTH };
}

patch(WebClient.prototype, {
    setup() {
        super.setup();

        const initial = _getInitialState();
        this.sidebarState = useState({
            mode: initial.mode,
            visible: initial.mode !== 'hidden',
            width: initial.width || DEFAULT_WIDTH,
        });

        this._panelEl = null;
        this._lastResizeWidth = null;

        useHotkey('control+shift+arrowleft', () => this._toggleSidebar(), {
            bypassEditableProtection: true,
            global: true,
        });

        onMounted(() => {
            this._panelEl = document.querySelector('.t4_sidebar_panel');
            this._applySidebarClass();
            this._applySizeClass();
            _updateSidebarCssVar(this.sidebarState.visible ? this.sidebarState.width : 0);
            this._installFastResize();
        });

        onWillUnmount(() => {
            this._uninstallFastResize();
        });

        this._onSidebarPreview = (ev) => {
            const { type } = ev.detail;
            const mode = type === 'invisible' ? 'hidden' : 'large';
            this.sidebarState.mode = mode;
            if (mode === 'hidden') {
                this.sidebarState.visible = false;
                this.sidebarState.width = DEFAULT_WIDTH;
            } else {
                this.sidebarState.visible = true;
                this.sidebarState.width = DEFAULT_WIDTH;
            }
            this._applySidebarClass();
            _updateSidebarCssVar(this.sidebarState.visible ? this.sidebarState.width : 0);
            _saveSidebarState({
                mode: mode,
                visible: this.sidebarState.visible,
                width: this.sidebarState.width,
            });
        };
        document.addEventListener('t4:sidebar-preview', this._onSidebarPreview);
    },

    _applySidebarClass() {
        const body = document.body;
        const isHidden = this.sidebarState.mode === 'hidden';
        body.classList.toggle('t4_sidebar_hidden', !this.sidebarState.visible);
        body.classList.toggle('t4_sidebar_mode_hidden', isHidden);
        const sidebarArea = document.querySelector('.t4_sidebar_area');
        if (sidebarArea) {
            sidebarArea.classList.toggle('t4_sidebar_removed', isHidden);
        }
    },

    _applySizeClass() {
        const panel = this._panelEl || document.querySelector('.t4_sidebar_panel');
        if (panel) {
            panel.classList.toggle('sm', this.sidebarState.width < SM_THRESHOLD);
        }
    },

    _toggleSidebar() {
        if (this.sidebarState.mode === 'hidden') {
            return;
        }
        this.sidebarState.visible = !this.sidebarState.visible;
        this._applySidebarClass();
        // Set CSS var to 0 when hidden so grid column collapses
        _updateSidebarCssVar(this.sidebarState.visible ? this.sidebarState.width : 0);
        _saveSidebarState({
            mode: this.sidebarState.mode,
            visible: this.sidebarState.visible,
            width: this.sidebarState.width,
        });
    },

    // ── Fast resize: intercept handle to skip ResizablePanel forced layouts ──
    _installFastResize() {
        const panel = this._panelEl;
        if (!panel) return;
        const handle = panel.parentElement?.querySelector('.o_resizable_panel_handle');
        if (!handle) return;

        this._fastHandle = handle;
        this._fastOnDown = (ev) => {
            ev.stopImmediatePropagation();
            this._fastDragging = true;
            this._fastStartX = ev.clientX;
            this._fastStartWidth = panel.offsetWidth;
            this._fastRafId = null;

            document.body.classList.add('pe-none', 'user-select-none');
            panel.classList.add('t4-resizing');

            document.addEventListener('mousemove', this._fastOnMove);
            document.addEventListener('mouseup', this._fastOnUp, { once: true });
        };

        this._fastOnMove = (ev) => {
            if (!this._fastDragging) return;
            const delta = ev.clientX - this._fastStartX;
            const raw = this._fastStartWidth + delta;
            const width = Math.max(79, Math.min(raw, MAX_WIDTH));

            if (this._fastRafId) cancelAnimationFrame(this._fastRafId);
            this._fastRafId = requestAnimationFrame(() => {
                this._fastRafId = null;
                panel.style.setProperty('width', `${width}px`);
                panel.classList.toggle('sm', width < SM_THRESHOLD);
                _updateSidebarCssVar(width);
                this._lastResizeWidth = width;
            });
        };

        this._fastOnUp = () => {
            this._fastDragging = false;
            if (this._fastRafId) {
                cancelAnimationFrame(this._fastRafId);
                this._fastRafId = null;
            }
            document.body.classList.remove('pe-none', 'user-select-none');
            panel.classList.remove('t4-resizing');
            document.removeEventListener('mousemove', this._fastOnMove);

            const finalWidth = this._lastResizeWidth || this._fastStartWidth;
            this.sidebarState.width = finalWidth;
            this._applySizeClass();
            _saveSidebarState({
                mode: this.sidebarState.mode,
                visible: this.sidebarState.visible,
                width: finalWidth,
            });
        };

        handle.addEventListener('mousedown', this._fastOnDown, { capture: true });
    },

    _uninstallFastResize() {
        if (this._fastHandle) {
            this._fastHandle.removeEventListener('mousedown', this._fastOnDown, { capture: true });
        }
        document.removeEventListener('mousemove', this._fastOnMove);
    },

    // Fallback: called by ResizablePanel if fast resize not intercepted
    _onSidebarResize(width) {
        if (width > MAX_WIDTH) return;
        const panel = this._panelEl;
        if (panel) {
            panel.classList.toggle('sm', width < SM_THRESHOLD);
        }
        _updateSidebarCssVar(width);
        this._lastResizeWidth = width;
    },
});

WebClient.components = { ...WebClient.components, AppsBar, ResizablePanel };
