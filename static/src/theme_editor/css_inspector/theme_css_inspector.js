/** @odoo-module */

import { Component, useState, onMounted, onWillUnmount } from '@odoo/owl';
import { rpc } from '@web/core/network/rpc';
import { user } from '@web/core/user';
import { generateSelector, getRelevantProperties, groupProperties, buildBreadcrumb } from './css_utils';
import { findComponentForElement } from '../component_registry';
import { getElementInfo, getSectionsForElement } from './option_utils';
import { CssPanel } from './css_panel';
import { BuilderSidebar } from './builder_sidebar';

// ============================================================================
// T4 Theme Design Mode — Main Controller Component
// Supports two modes: 'visual' (builder sidebar) and 'advanced' (CSS panels)
// ============================================================================

const STYLE_ID = 't4-theme-editor-overrides';

export class ThemeCssInspector extends Component {
    static template = 't4_theme.ThemeCssInspector';
    static components = { CssPanel, BuilderSidebar };
    static props = {
        onClose: { type: Function },
    };

    setup() {
        this.state = useState({
            inspecting: true,
            collapsed: false,
            mode: 'visual',            // 'visual' or 'advanced'
            hoveredElement: null,
            // Visual mode state
            selectedElement: null,      // DOM element reference
            selectedInfo: null,         // { label, icon, selector, category, registryProps }
            selectedSections: [],       // Option sections with computed values
            sidebarOverrides: {},       // { propName: value } for selected element
            // Advanced mode state
            panels: [],
            // Shared
            saveStatus: '',
            dirty: false,
        });

        // In-memory overrides: { 'cssTarget|||propKey': 'value' }
        this._overrides = {};
        this._rafPending = false;

        // Bind event handlers
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseClick = this._onMouseClick.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);

        // Load existing overrides from company
        const existing = user.activeCompany?.theme_view_overrides || {};
        if (existing && typeof existing === 'object') {
            Object.assign(this._overrides, existing);
        }

        onMounted(() => {
            document.body.classList.add('t4_design_mode', 't4_inspecting');
            document.addEventListener('mousemove', this._onMouseMove, true);
            document.addEventListener('click', this._onMouseClick, true);
            document.addEventListener('keydown', this._onKeyDown);
            this._injectStyleTag();
        });

        onWillUnmount(() => {
            document.body.classList.remove('t4_design_mode', 't4_design_collapsed', 't4_inspecting');
            document.removeEventListener('mousemove', this._onMouseMove, true);
            document.removeEventListener('click', this._onMouseClick, true);
            document.removeEventListener('keydown', this._onKeyDown);
            const styleEl = document.getElementById(STYLE_ID);
            if (styleEl) styleEl.remove();
        });
    }

    // ── Mode Switching ──

    switchMode(mode) {
        this.state.mode = mode;
        // Clear visual selection when switching to advanced
        if (mode === 'advanced') {
            this.state.selectedElement = null;
            this.state.selectedInfo = null;
            this.state.selectedSections = [];
        }
        // Clear panels when switching to visual
        if (mode === 'visual') {
            this.state.panels = [];
        }
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
            const isVar = propKey.startsWith('--');
            groups[target].push(`${propKey}: ${value}${isVar ? ' !important' : ''}`);
        }

        let css = '/* T4 Theme Editor Overrides */\n';
        for (const [selector, props] of Object.entries(groups)) {
            css += `${selector} { ${props.join('; ')} }\n`;
        }
        styleEl.textContent = css;
    }

    // ── Mouse Handlers ──

    _onMouseMove(ev) {
        if (!this.state.inspecting) return;
        // Lock hover if an element is currently selected in visual mode
        if (this.state.mode === 'visual' && this.state.selectedElement) return;

        const el = ev.target;
        if (el.closest('.t4_css_inspector, .t4_builder_sidebar')) return;

        if (this._rafPending) return;
        this._rafPending = true;

        requestAnimationFrame(() => {
            this._rafPending = false;
            const rect = el.getBoundingClientRect();
            const selector = generateSelector(el);

            const registryMatch = findComponentForElement(el);
            const label = (registryMatch && registryMatch.config && registryMatch.config.label)
                ? registryMatch.config.label
                : selector;

            this.state.hoveredElement = {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height,
                selector,
                label,
            };
        });
    }

    _onMouseClick(ev) {
        if (!this.state.inspecting) return;
        const el = ev.target;
        if (el.closest('.t4_css_inspector, .t4_builder_sidebar')) return;

        ev.preventDefault();
        ev.stopPropagation();

        if (this.state.mode === 'visual') {
            if (this.state.selectedElement === el) {
                this.deselectElement();
            } else if (this.state.selectedElement) {
                // Locked, do nothing
                return;
            } else {
                this._selectElementVisual(el);
            }
        } else {
            this._openAdvancedPanel(el);
            this.state.hoveredElement = null;
        }
    }

    // ── Visual Mode: Select element → populate sidebar ──

    _selectElementVisual(el) {
        const info = getElementInfo(el);
        const sections = getSectionsForElement(el);

        // Load existing overrides for this selector
        const overrides = {};
        const prefix = info.selector + '|||';
        for (const [key, value] of Object.entries(this._overrides)) {
            if (key.startsWith(prefix)) {
                overrides[key.slice(prefix.length)] = value;
            }
        }

        this.state.selectedElement = el;
        this.state.selectedInfo = info;
        this.state.selectedSections = sections;
        this.state.sidebarOverrides = overrides;
    }

    deselectElement() {
        this.state.selectedElement = null;
        this.state.selectedInfo = null;
        this.state.selectedSections = [];
        this.state.sidebarOverrides = {};
    }

    // ── Visual Mode: Property change from sidebar ──

    onSidebarPropertyChange(propName, value) {
        if (!this.state.selectedInfo) return;
        const selector = this.state.selectedInfo.selector;
        const compoundKey = `${selector}|||${propName}`;

        if (value !== null && value !== undefined && value !== '') {
            this._overrides[compoundKey] = value;
            this.state.sidebarOverrides = { ...this.state.sidebarOverrides, [propName]: value };
        } else {
            delete this._overrides[compoundKey];
            const { [propName]: _removed, ...rest } = this.state.sidebarOverrides;
            this.state.sidebarOverrides = rest;
        }

        this._injectStyleTag();
        this.state.dirty = true;
        this.state.saveStatus = '';
    }

    onSidebarReset() {
        if (!this.state.selectedInfo) return;
        const prefix = `${this.state.selectedInfo.selector}|||`;
        for (const key of Object.keys(this._overrides)) {
            if (key.startsWith(prefix)) {
                delete this._overrides[key];
            }
        }
        this.state.sidebarOverrides = {};
        this._injectStyleTag();
        this.state.dirty = true;
    }

    // ── Advanced Mode: Floating panels (existing logic) ──

    _openAdvancedPanel(el) {
        const selector = generateSelector(el);
        const properties = getRelevantProperties(el);
        const groups = groupProperties(properties);
        const breadcrumb = buildBreadcrumb(el);

        const rect = el.getBoundingClientRect();
        let panelLeft = rect.right + 12;
        if (panelLeft + 340 > window.innerWidth) {
            panelLeft = rect.left - 340 - 12;
        }
        if (panelLeft < 0) {
            panelLeft = Math.max(0, rect.left + (rect.width / 2) - 170);
        }

        let panelTop = rect.top + window.scrollY;
        if (rect.bottom + 400 > window.innerHeight) {
            panelTop = Math.max(50, window.innerHeight - 420 + window.scrollY);
        }

        const registryMatch = findComponentForElement(el);
        const panelOverrides = {};
        const prefix = selector + '|||';
        for (const [key, value] of Object.entries(this._overrides)) {
            if (key.startsWith(prefix)) {
                panelOverrides[key.slice(prefix.length)] = value;
            }
        }

        const panel = {
            id: Date.now(),
            selector,
            element: el,
            breadcrumb,
            groups,
            overrides: panelOverrides,
            position: { top: panelTop, left: panelLeft },
            registryMatch: registryMatch ? registryMatch.config : null,
        };

        const panels = [...this.state.panels, panel];
        if (panels.length > 5) {
            panels.shift();
        }
        this.state.panels = panels;
    }

    _onKeyDown(ev) {
        if (ev.key === 'Escape') {
            if (this.state.mode === 'visual' && this.state.selectedElement) {
                this.deselectElement();
            } else if (this.state.mode === 'advanced' && this.state.panels.length > 0) {
                this.state.panels = this.state.panels.slice(0, -1);
            } else {
                this.close();
            }
        }
    }

    // ── Advanced Mode: Property Handlers ──

    onPropertyChange(panelIndex, propName, value) {
        const panel = this.state.panels[panelIndex];
        if (!panel) return;

        const compoundKey = `${panel.selector}|||${propName}`;
        if (value !== null && value !== undefined) {
            this._overrides[compoundKey] = value;
            panel.overrides = { ...panel.overrides, [propName]: value };
        } else {
            delete this._overrides[compoundKey];
            const { [propName]: _removed, ...rest } = panel.overrides;
            panel.overrides = rest;
        }

        this._injectStyleTag();
        this.state.dirty = true;
        this.state.saveStatus = '';
    }

    onResetPanel(panelIndex) {
        const panel = this.state.panels[panelIndex];
        if (!panel) return;

        const prefix = `${panel.selector}|||`;
        for (const key of Object.keys(this._overrides)) {
            if (key.startsWith(prefix)) {
                delete this._overrides[key];
            }
        }
        panel.overrides = {};
        this._injectStyleTag();
        this.state.dirty = true;
    }

    closePanel(panelIndex) {
        this.state.panels = this.state.panels.filter((_, i) => i !== panelIndex);
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

    // ── UI Controls ──

    toggleCollapse() {
        this.state.collapsed = !this.state.collapsed;
        document.body.classList.toggle('t4_design_collapsed', this.state.collapsed);
    }

    close() {
        this.props.onClose();
    }

    // ── Template Helpers ──

    get highlightStyle() {
        const h = this.state.hoveredElement;
        if (!h) return 'display:none';
        return `top:${h.top}px;left:${h.left}px;width:${h.width}px;height:${h.height}px`;
    }

    get highlightLabelStyle() {
        const h = this.state.hoveredElement;
        if (!h) return 'display:none';
        return `top:${h.top - 22}px;left:${h.left}px`;
    }

    /**
     * Get the display value for a sidebar property.
     * Override takes priority, then falls back to computed value.
     */
    getSidebarValue(propCss) {
        const override = this.state.sidebarOverrides[propCss];
        if (override !== undefined) return override;
        // Find in sections
        for (const section of this.state.selectedSections) {
            for (const prop of section.props) {
                if (prop.css === propCss) return prop.currentValue;
            }
        }
        return '';
    }

    isSidebarOverridden(propCss) {
        return propCss in this.state.sidebarOverrides;
    }
}
