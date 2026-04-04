/** @odoo-module **/

import { Component, useState, onMounted, onWillUnmount } from '@odoo/owl';
import { rpc } from '@web/core/network/rpc';
import { user } from '@web/core/user';
import { findComponentForElement, buildTargetMap } from './component_registry';

// ============================================================================
// T4 Theme Editor — Overlay System
// ============================================================================
// Uses <style> tag injection for realtime CSS var overrides.
// Saves to DB only on explicit "Save" click — no auto-save, no reload.

const STYLE_ID = 't4-theme-editor-overrides';

export class ThemeEditorOverlay extends Component {
    static template = 't4_theme.ThemeEditorOverlay';
    static props = {
        onClose: { type: Function },
    };

    setup() {
        this.state = useState({
            active: true,
            highlight: null,
            panel: null,
            saveStatus: '',
            dirty: false,
        });

        // In-memory overrides: { 'selector|||propKey': 'value' }
        // Key format: 'cssTarget|||propertyKey' to support same prop on different selectors
        this._overrides = {};
        this._targetMap = buildTargetMap();

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
            // Apply existing overrides via style tag
            this._injectStyleTag();
        });

        onWillUnmount(() => {
            document.body.classList.remove('t4_design_mode');
            document.removeEventListener('mousemove', this._onMouseMove, true);
            document.removeEventListener('click', this._onMouseClick, true);
            document.removeEventListener('keydown', this._onKeyDown);
        });
    }

    // ── Style Tag Injection (realtime CSS override) ──

    _injectStyleTag() {
        let styleEl = document.getElementById(STYLE_ID);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = STYLE_ID;
            document.head.appendChild(styleEl);
        }

        // Group overrides by target selector
        // Key format in _overrides: 'target|||propKey' → value
        const groups = {};
        for (const [compoundKey, value] of Object.entries(this._overrides)) {
            if (!value) continue;
            const [target, propKey] = compoundKey.split('|||');
            if (!groups[target]) groups[target] = [];
            groups[target].push(`${propKey}: ${value}`);
        }

        let css = '/* T4 Theme Editor Overrides */\n';
        for (const [selector, props] of Object.entries(groups)) {
            css += `${selector} { ${props.join(' !important; ')} !important }\n`;
        }
        styleEl.textContent = css;
    }

    _makeKey(propKey) {
        // Build compound key: 'cssTarget|||propKey'
        const info = this._targetMap[propKey];
        const target = info ? info.target : ':root';
        return `${target}|||${propKey}`;
    }

    _setOverride(propKey, value) {
        const key = this._makeKey(propKey);
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
        if (el.closest('.t4_theme_highlight, .t4_theme_highlight_label, .t4_style_panel, .t4_design_toolbar')) return;

        const match = findComponentForElement(el);
        if (match) {
            const targetEl = el.closest(match.selector);
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

    _onMouseClick(ev) {
        if (!this.state.active) return;
        const el = ev.target;

        if (el.closest('.t4_design_toolbar')) return;
        if (el.closest('.t4_style_panel')) return;

        if (this.state.panel && !el.closest('.t4_style_panel')) {
            this.state.panel = null;
            return;
        }

        const match = findComponentForElement(el);
        if (!match) return;

        ev.preventDefault();
        ev.stopPropagation();

        const targetEl = el.closest(match.selector) || this._currentEl;
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

    onSliderInput(ev) {
        const cssVar = ev.target.dataset.cssVar;
        const unit = ev.target.dataset.unit || '';
        const value = ev.target.value;
        this._setOverride(cssVar, unit ? `${value}${unit}` : value);
    }

    onColorInput(ev) {
        const cssVar = ev.target.dataset.cssVar;
        this._setOverride(cssVar, ev.target.value);
    }

    onSelectInput(ev) {
        const propKey = ev.target.dataset.cssVar;
        this._setOverride(propKey, ev.target.value);
    }

    onResetAll() {
        if (!this.state.panel) return;
        for (const prop of this.state.panel.config.properties) {
            const key = this._makeKey(prop.key);
            delete this._overrides[key];
        }
        this._injectStyleTag();
        this.state.dirty = true;
        this.state.saveStatus = '';
    }

    // ── Save (explicit, on button click only) ──

    async onSave() {
        this.state.saveStatus = 'saving';
        try {
            const overrides = { ...this._overrides };
            // Use custom endpoint to avoid ORM bus → no reload
            await rpc('/t4_theme/save_overrides', { overrides });
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

    close() {
        // Remove style tag on exit (persisted overrides loaded by theme_color_service)
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
        // Check in-memory overrides (compound key)
        const key = this._makeKey(prop.key);
        const memValue = this._overrides[key];
        if (memValue) {
            if (prop.unit && memValue.endsWith(prop.unit)) {
                return memValue.slice(0, -prop.unit.length);
            }
            return memValue;
        }
        // Fallback: for CSS vars, read computed; for direct CSS, use default
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
