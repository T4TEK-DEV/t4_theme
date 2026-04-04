/** @odoo-module */
import { Component, useState } from '@odoo/owl';
import { SHADOW_PRESETS, parseValue, formatValue } from './option_utils';

export class BuilderSidebar extends Component {
    static template = 't4_theme.BuilderSidebar';

    static props = {
        section: { type: Object },
        overrides: { type: Object },
        onPropertyChange: { type: Function },
        getSidebarValue: { type: Function },
        isSidebarOverridden: { type: Function },
    };

    setup() {
        this.state = useState({
            collapsed: false,
        });
        this.shadowPresets = SHADOW_PRESETS;
    }

    toggleCollapse() {
        this.state.collapsed = !this.state.collapsed;
    }

    onSliderInput(propCss, unit, ev) {
        const value = formatValue(ev.target.value, unit);
        this.props.onPropertyChange(propCss, value);
    }

    onNumberInput(propCss, unit, ev) {
        const value = formatValue(ev.target.value, unit);
        this.props.onPropertyChange(propCss, value);
    }

    onColorInput(propCss, ev) {
        this.props.onPropertyChange(propCss, ev.target.value);
    }

    onSelectInput(propCss, ev) {
        this.props.onPropertyChange(propCss, ev.target.value);
    }

    onAlignClick(propCss, value) {
        this.props.onPropertyChange(propCss, value);
    }

    onShadowPreset(value) {
        this.props.onPropertyChange('box-shadow', value);
    }

    getNumericValue(propCss) {
        const raw = this.props.getSidebarValue(propCss);
        const parsed = parseValue(raw, 'px');
        return parsed.num;
    }

    getCurrentAlign(propCss) {
        return this.props.getSidebarValue(propCss) || 'left';
    }
}
