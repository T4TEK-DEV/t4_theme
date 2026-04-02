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
        return saved;
    }
    // Fallback to server-side body class
    const body = document.body;
    if (body.classList.contains('mk_sidebar_type_invisible')) {
        return { visible: false, width: DEFAULT_WIDTH };
    }
    if (body.classList.contains('mk_sidebar_type_small')) {
        return { visible: true, width: 68 };
    }
    return { visible: true, width: DEFAULT_WIDTH };
}

patch(WebClient.prototype, {
    setup() {
        super.setup();

        const initial = _getInitialState();
        this.sidebarState = useState({
            visible: initial.visible !== false,
            width: initial.width || DEFAULT_WIDTH,
        });

        // ESC key to toggle sidebar
        useHotkey('escape', () => this._toggleSidebar(), {
            bypassEditableProtection: true,
            global: true,
        });

        onMounted(() => {
            this._applySidebarClass();
        });
    },

    _applySidebarClass() {
        document.body.classList.toggle('t4_sidebar_hidden', !this.sidebarState.visible);
    },

    _toggleSidebar() {
        this.sidebarState.visible = !this.sidebarState.visible;
        this._applySidebarClass();
        _saveSidebarState({
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
            visible: this.sidebarState.visible,
            width,
        });
    },
});

WebClient.components = { ...WebClient.components, AppsBar, ResizablePanel };
