/** @odoo-module **/

import { Component, useState, onMounted, onWillUnmount } from '@odoo/owl';
import { rpc } from '@web/core/network/rpc';
import { user } from '@web/core/user';
import { findComponentForElement } from './component_registry';

// ============================================================================
// T4 Theme Editor — Overlay System
// ============================================================================

const STYLE_ID = 't4-theme-editor-overrides';

export class ThemeEditorOverlay extends Component {
    static template = 't4_theme.ThemeEditorOverlay';
    static props = {
        onClose: { type: Function },
    };

    setup() {
        this.state = useState({
            active: true,
            collapsed: false,
            highlight: null,
            panel: null,
            saveStatus: '',
            dirty: false,
        });

        // In-memory overrides: { 'cssTarget|||propKey': 'value' }
        this._overrides = {};

        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseClick = this._onMouseClick.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._currentEl = null;

        // Load existing overrides from session
        const existing = user.activeCompany?.theme_view_overrides || {};
        if (existing && typeof existing === 'object') {
            Object.assign(this._overrides, existing);
        }

        onMounted(() => {
            document.body.classList.add('t4_design_mode');
            document.addEventListener('mousemove', this._onMouseMove, true);
            document.addEventListener('click', this._onMouseClick, true);
            document.addEventListener('keydown', this._onKeyDown);
            this._injectStyleTag();
        });

        onWillUnmount(() => {
            document.body.classList.remove('t4_design_mode');
            document.body.classList.remove('t4_design_collapsed');
            document.removeEventListener('mousemove', this._onMouseMove, true);
            document.removeEventListener('click', this._onMouseClick, true);
            document.removeEventListener('keydown', this._onKeyDown);
        });
    }

    // ── Style Tag Injection ──

    _injectStyleTag() {
        let styleEl = document.getElementById(STYLE_ID);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = STYLE_ID;
            document.head.appendChild(styleEl);
        }

        const groups = {};
        for (const [compoundKey, value] of Object.entries(this._overrides)) {
            if (!value) continue;
            const sep = compoundKey.indexOf('|||');
            if (sep < 0) continue;
            const target = compoundKey.slice(0, sep);
            const propKey = compoundKey.slice(sep + 3);
            if (!groups[target]) groups[target] = [];
            // CSS vars need !important to override Odoo declarations
            // Direct CSS properties should NOT use !important to avoid cascade pollution
            const isVar = propKey.startsWith('--');
            groups[target].push(`${propKey}: ${value}${isVar ? ' !important' : ''}`);
        }

        let css = '/* T4 Theme Editor Overrides */\n';
        for (const [selector, props] of Object.entries(groups)) {
            css += `${selector} { ${props.join('; ')} }\n`;
        }
        styleEl.textContent = css;
    }

    // Build compound key using the ACTIVE PANEL's cssTarget
    _makeKeyForPanel(propKey) {
        if (!this.state.panel) return `:root|||${propKey}`;
        return `${this.state.panel.config.cssTarget}|||${propKey}`;
    }

    _setOverride(propKey, value) {
        const key = this._makeKeyForPanel(propKey);
        if (value) {
            this._overrides[key] = value;
        } else {
            delete this._overrides[key];
        }
        this._injectStyleTag();
        this.state.dirty = true;
        this.state.saveStatus = '';
    }

    // ── Mouse Handlers ──

    _onMouseMove(ev) {
        if (!this.state.active || this.state.panel) return;
        const el = ev.target;
        if (el.closest('.t4_theme_highlight, .t4_theme_highlight_label, .t4_style_panel, .t4_design_toolbar, .t4_design_badge')) return;

        const match = findComponentForElement(el);
        if (match) {
            const targetEl = el.closest(match.selector) || this._findTarget(el, match.selector);
            if (targetEl && targetEl !== this._currentEl) {
                this._currentEl = targetEl;
                const rect = targetEl.getBoundingClientRect();
                this.state.highlight = {
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                    height: rect.height,
                    label: match.config.label,
                    icon: match.config.icon,
                    selector: match.selector,
                };
            }
        } else {
            this._currentEl = null;
            this.state.highlight = null;
        }
    }

    // Fallback for compound selectors where el.closest() may fail
    _findTarget(el, selector) {
        try {
            const all = document.querySelectorAll(selector);
            for (const candidate of all) {
                if (candidate.contains(el)) return candidate;
            }
        } catch { /* invalid selector */ }
        return null;
    }

    _onMouseClick(ev) {
        if (!this.state.active) return;
        const el = ev.target;

        if (el.closest('.t4_design_toolbar, .t4_design_badge')) return;
        if (el.closest('.t4_style_panel')) return;

        // Click outside panel → close panel
        if (this.state.panel) {
            this.state.panel = null;
            return;
        }

        const match = findComponentForElement(el);
        if (!match) return;

        ev.preventDefault();
        ev.stopPropagation();

        const targetEl = this._currentEl || this._findTarget(el, match.selector);
        if (!targetEl) return;

        const rect = targetEl.getBoundingClientRect();
        let panelLeft = rect.right + 12;
        if (panelLeft + 340 > window.innerWidth) {
            panelLeft = rect.left - 340 - 12;
        }
        if (panelLeft < 0) panelLeft = 12;

        let panelTop = rect.top;
        if (panelTop + 400 > window.innerHeight) {
            panelTop = window.innerHeight - 420;
        }
        if (panelTop < 50) panelTop = 50;

        this.state.panel = {
            selector: match.selector,
            config: match.config,
            top: panelTop,
            left: panelLeft,
        };
    }

    _onKeyDown(ev) {
        if (ev.key === 'Escape') {
            if (this.state.panel) {
                this.state.panel = null;
            } else {
                this.close();
            }
        }
    }

    // ── Property Handlers ──
    // All use _makeKeyForPanel() which reads cssTarget from the OPEN panel

    onSliderInput(ev) {
        const propKey = ev.target.dataset.cssVar;
        const unit = ev.target.dataset.unit || '';
        const value = ev.target.value;
        this._setOverride(propKey, unit ? `${value}${unit}` : value);
    }

    onColorInput(ev) {
        const propKey = ev.target.dataset.cssVar;
        this._setOverride(propKey, ev.target.value);
    }

    onSelectInput(ev) {
        const propKey = ev.target.dataset.cssVar;
        this._setOverride(propKey, ev.target.value);
    }

    onResetAll() {
        if (!this.state.panel) return;
        const cssTarget = this.state.panel.config.cssTarget;
        for (const prop of this.state.panel.config.properties) {
            const key = `${cssTarget}|||${prop.key}`;
            delete this._overrides[key];
        }
        this._injectStyleTag();
        this.state.dirty = true;
        this.state.saveStatus = '';
    }

    // ── Save ──

    async onSave() {
        this.state.saveStatus = 'saving';
        try {
            await rpc('/t4_theme/save_overrides', { overrides: { ...this._overrides } });
            this.state.dirty = false;
            this.state.saveStatus = 'saved';
            setTimeout(() => { this.state.saveStatus = ''; }, 2000);
        } catch (e) {
            console.error('Theme save failed:', e);
            this.state.saveStatus = 'error';
        }
    }

    // ── Panel / Close ──

    closePanel() {
        this.state.panel = null;
    }

    toggleCollapse() {
        this.state.collapsed = !this.state.collapsed;
        document.body.classList.toggle('t4_design_collapsed', this.state.collapsed);
    }

    close() {
        const styleEl = document.getElementById(STYLE_ID);
        if (styleEl) styleEl.remove();
        this.state.active = false;
        this.props.onClose();
    }

    // ── Template Helpers ──

    get highlightStyle() {
        const h = this.state.highlight;
        if (!h) return 'display: none';
        return `top:${h.top}px;left:${h.left}px;width:${h.width}px;height:${h.height}px`;
    }

    get labelStyle() {
        const h = this.state.highlight;
        if (!h) return 'display: none';
        return `top:${h.top - 24}px;left:${h.left}px`;
    }

    get panelStyle() {
        const p = this.state.panel;
        if (!p) return 'display: none';
        return `top:${p.top}px;left:${p.left}px`;
    }

    getPropertyValue(prop) {
        // Use PANEL's cssTarget to build the correct compound key
        const cssTarget = this.state.panel ? this.state.panel.config.cssTarget : ':root';
        const key = `${cssTarget}|||${prop.key}`;
        const memValue = this._overrides[key];
        if (memValue) {
            if (prop.unit && memValue.endsWith(prop.unit)) {
                return memValue.slice(0, -prop.unit.length);
            }
            return memValue;
        }
        // Fallback: CSS vars → read computed value
        if (!prop.css && prop.key.startsWith('--')) {
            const computed = getComputedStyle(document.documentElement).getPropertyValue(prop.key).trim();
            if (computed && prop.unit && computed.endsWith(prop.unit)) {
                return computed.slice(0, -prop.unit.length);
            }
            if (computed) return computed;
        }
        return prop.default || '';
    }
}
