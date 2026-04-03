import { patch } from '@web/core/utils/patch';
import { useHotkey } from '@web/core/hotkeys/hotkey_hook';

import { WebClient } from '@web/webclient/webclient';
import { ResizablePanel } from '@web/core/resizable_panel/resizable_panel';
import { AppsBar } from '@t4_theme/appsbar/webclient/appsbar/appsbar';
import { onMounted, useState } from '@odoo/owl';

const SIDEBAR_KEY = 't4_sidebar';
const MAX_WIDTH = 320;
const SM_THRESHOLD = 120;
const DEFAULT_WIDTH = 200;
const SMALL_WIDTH = 68;

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

function _getInitialState() {
    const saved = _loadSidebarState();
    if (saved) {
        return {
            mode: saved.mode || (saved.visible === false ? 'hidden' : (saved.width <= SMALL_WIDTH ? 'small' : 'large')),
            width: saved.width || DEFAULT_WIDTH,
        };
    }
    const body = document.body;
    if (body.classList.contains('mk_sidebar_type_invisible') || body.classList.contains('mk_sidebar_type_hidden')) {
        return { mode: 'hidden', width: DEFAULT_WIDTH };
    }
    if (body.classList.contains('mk_sidebar_type_small')) {
        return { mode: 'small', width: SMALL_WIDTH };
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
            width: initial.mode === 'small' ? SMALL_WIDTH : (initial.width || DEFAULT_WIDTH),
        });

        useHotkey('control+shift+arrowleft', () => this._toggleSidebar(), {
            bypassEditableProtection: true,
            global: true,
        });

        onMounted(() => {
            this._applySidebarClass();
            this._applySizeClass();
        });

        // Listen for theme panel sidebar preview events
        this._onSidebarPreview = (ev) => {
            const { type } = ev.detail;
            // "invisible" from SIDEBAR_OPTIONS key, normalize to "hidden"
            const mode = type === 'invisible' ? 'hidden' : type;
            this.sidebarState.mode = mode;
            if (mode === 'hidden') {
                this.sidebarState.visible = false;
                this.sidebarState.width = DEFAULT_WIDTH;
            } else if (mode === 'small') {
                this.sidebarState.visible = true;
                this.sidebarState.width = SMALL_WIDTH;
            } else {
                this.sidebarState.visible = true;
                this.sidebarState.width = DEFAULT_WIDTH;
            }
            this._applySidebarClass();
            this._applySizeClass();
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
        // Also toggle CSS class on sidebar area element for instant preview
        const sidebarArea = document.querySelector('.t4_sidebar_area');
        if (sidebarArea) {
            sidebarArea.classList.toggle('t4_sidebar_removed', isHidden);
        }
    },

    _applySizeClass() {
        const panel = document.querySelector('.t4_sidebar_panel');
        if (panel) {
            panel.classList.toggle('sm', this.sidebarState.mode === 'small' || this.sidebarState.width < SM_THRESHOLD);
        }
    },

    _toggleSidebar() {
        // Hidden mode: toggle does nothing
        if (this.sidebarState.mode === 'hidden') {
            return;
        }
        this.sidebarState.visible = !this.sidebarState.visible;
        this._applySidebarClass();
        _saveSidebarState({
            mode: this.sidebarState.mode,
            visible: this.sidebarState.visible,
            width: this.sidebarState.width,
        });
    },

    _onSidebarResize(width) {
        if (width > MAX_WIDTH) {
            return;
        }
        const panel = document.querySelector('.t4_sidebar_panel');
        if (panel) {
            panel.classList.toggle('sm', width < SM_THRESHOLD);
        }
        this.sidebarState.width = width;
        _saveSidebarState({
            mode: this.sidebarState.mode,
            visible: this.sidebarState.visible,
            width,
        });
    },
});

WebClient.components = { ...WebClient.components, AppsBar, ResizablePanel };
