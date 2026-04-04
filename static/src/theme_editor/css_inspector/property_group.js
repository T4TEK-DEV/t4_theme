/** @odoo-module */
import { Component } from '@odoo/owl';
import { CSS_ENUM_VALUES } from './css_utils';

// ============================================================================
// PropertyGroup — Renders a collapsible group of CSS properties with editors
// ============================================================================

export class PropertyGroup extends Component {
    static template = 't4_theme.PropertyGroup';
    static props = {
        group: { type: Object },
        collapsed: { type: Boolean },
        panelOverrides: { type: Object },
        onToggle: { type: Function },
        onValueChange: { type: Function },
    };

    getDisplayValue(prop) {
        const override = this.props.panelOverrides[prop.name];
        return override !== undefined ? override : prop.value;
    }

    isOverridden(prop) {
        return prop.name in this.props.panelOverrides;
    }

    onColorInput(propName, ev) {
        this.props.onValueChange(propName, ev.target.value);
    }

    onSizeInput(propName, ev) {
        const raw = ev.target.value;
        const unit = ev.target.dataset.unit || 'px';
        this.props.onValueChange(propName, raw ? raw + unit : '');
    }

    onSliderInput(propName, ev) {
        const raw = ev.target.value;
        const unit = ev.target.dataset.unit || 'px';
        this.props.onValueChange(propName, raw ? raw + unit : '');
    }

    onEnumInput(propName, ev) {
        this.props.onValueChange(propName, ev.target.value);
    }

    onTextInput(propName, ev) {
        this.props.onValueChange(propName, ev.target.value);
    }

    getEnumOptions(propName) {
        return CSS_ENUM_VALUES[propName] || [];
    }

    parseNumericValue(value) {
        const match = String(value).match(/^(-?[\d.]+)/);
        return match ? parseFloat(match[1]) : 0;
    }

    parseUnit(value) {
        const match = String(value).match(/[a-z%]+$/i);
        return match ? match[0] : 'px';
    }

    getSliderRange(propName, value) {
        if (propName === 'font-size') return { min: 0, max: 72, step: 1 };
        if (propName === 'line-height') return { min: 0, max: 5, step: 0.1 };
        if (propName === 'opacity') return { min: 0, max: 1, step: 0.01 };
        if (propName === 'z-index') return { min: -100, max: 10000, step: 1 };
        if (/^border-.+-width$/.test(propName)) return { min: 0, max: 20, step: 1 };
        if (/^(padding|margin)/.test(propName)) return { min: -100, max: 200, step: 1 };
        if (/^border-.+-radius$/.test(propName) || propName === 'border-radius') return { min: 0, max: 100, step: 1 };
        if (propName === 'gap') return { min: 0, max: 100, step: 1 };
        if (propName === 'letter-spacing' || propName === 'word-spacing') return { min: -10, max: 50, step: 0.5 };
        if (/^(width|height|min-width|min-height|max-width|max-height)$/.test(propName)) return { min: 0, max: 2000, step: 1 };
        return { min: 0, max: 200, step: 1 };
    }
}
