/** @odoo-module **/

import { Component, useState, onMounted, onWillUnmount } from '@odoo/owl';
import { registry } from '@web/core/registry';
import { useService } from '@web/core/utils/hooks';
import { View } from '@web/views/view';
import { rpc } from '@web/core/network/rpc';
import { user } from '@web/core/user';
import { THEME_COMPONENTS, findComponentForElement } from './component_registry';

const STYLE_ID = 't4-theme-settings-overrides';

const VIEW_TABS = [
    { key: 'kanban', label: 'Kanban', icon: 'fa-th-large' },
    { key: 'list', label: 'List', icon: 'fa-list' },
    { key: 'form', label: 'Form', icon: 'fa-file-text-o' },
    { key: 'pivot', label: 'Pivot', icon: 'fa-bar-chart' },
    { key: 'graph', label: 'Graph', icon: 'fa-area-chart' },
];

export class ThemeSettingsAction extends Component {
    static template = 't4_theme.ThemeSettingsAction';
    static components = { View };

    setup() {
        this.actionService = useService('action');

        this.state = useState({
            activeTab: 'kanban',
            selectedComponent: null,
            saveStatus: '',
            dirty: false,
        });

        this._overrides = {};
        this._previewRef = null;

        // Load existing overrides
        const existing = user.activeCompany?.theme_view_overrides || {};
        if (existing && typeof existing === 'object') {
            Object.assign(this._overrides, existing);
        }

        this._onPreviewClick = this._onPreviewClick.bind(this);

        onMounted(() => {
            this._injectStyleTag();
            const preview = document.querySelector('.t4_ts_preview');
            if (preview) {
                preview.addEventListener('click', this._onPreviewClick, true);
            }
        });

        onWillUnmount(() => {
            const preview = document.querySelector('.t4_ts_preview');
            if (preview) {
                preview.removeEventListener('click', this._onPreviewClick, true);
            }
        });
    }

    // ── Tab Switching ──

    get viewTabs() {
        return VIEW_TABS;
    }

    onTabClick(ev) {
        this.state.activeTab = ev.currentTarget.dataset.tab;
        this.state.selectedComponent = null;
    }

    // ── Preview Click → Select Component ──

    _onPreviewClick(ev) {
        const el = ev.target;
        if (el.closest('.t4_ts_tabs, .o_dropdown_kanban, .dropdown-menu, .modal')) return;

        const match = findComponentForElement(el);
        if (match) {
            ev.preventDefault();
            ev.stopPropagation();
            this.state.selectedComponent = {
                selector: match.selector,
                config: match.config,
            };
        }
    }

    // ── Style Tag ──

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

        let css = '/* T4 Theme Settings Overrides */\n';
        for (const [selector, props] of Object.entries(groups)) {
            css += `${selector} { ${props.join('; ')} }\n`;
        }
        styleEl.textContent = css;
    }

    // ── Property Handlers ──

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

    _setOverride(propKey, value) {
        if (!this.state.selectedComponent) return;
        const cssTarget = this.state.selectedComponent.config.cssTarget;
        const key = `${cssTarget}|||${propKey}`;
        if (value) {
            this._overrides[key] = value;
        } else {
            delete this._overrides[key];
        }
        this._injectStyleTag();
        this.state.dirty = true;
        this.state.saveStatus = '';
    }

    onResetComponent() {
        if (!this.state.selectedComponent) return;
        const cssTarget = this.state.selectedComponent.config.cssTarget;
        for (const prop of this.state.selectedComponent.config.properties) {
            delete this._overrides[`${cssTarget}|||${prop.key}`];
        }
        this._injectStyleTag();
        this.state.dirty = true;
        this.state.saveStatus = '';
    }

    getPropertyValue(prop) {
        if (!this.state.selectedComponent) return prop.default || '';
        const cssTarget = this.state.selectedComponent.config.cssTarget;
        const key = `${cssTarget}|||${prop.key}`;
        const memValue = this._overrides[key];
        if (memValue) {
            if (prop.unit && memValue.endsWith(prop.unit)) {
                return memValue.slice(0, -prop.unit.length);
            }
            return memValue;
        }
        if (!prop.css && prop.key.startsWith('--')) {
            const computed = getComputedStyle(document.documentElement).getPropertyValue(prop.key).trim();
            if (computed && prop.unit && computed.endsWith(prop.unit)) {
                return computed.slice(0, -prop.unit.length);
            }
            if (computed) return computed;
        }
        return prop.default || '';
    }

    // ── Save / Back ──

    async onSave() {
        this.state.saveStatus = 'saving';
        try {
            await rpc('/t4_theme/save_overrides', { overrides: { ...this._overrides } });
            this.state.dirty = false;
            this.state.saveStatus = 'saved';
            setTimeout(() => { this.state.saveStatus = ''; }, 2000);
        } catch (e) {
            this.state.saveStatus = 'error';
        }
    }

    onBack() {
        this.actionService.restore();
    }

    onDeselectComponent() {
        this.state.selectedComponent = null;
    }
}

registry.category('actions').add('t4_theme_settings', ThemeSettingsAction);
