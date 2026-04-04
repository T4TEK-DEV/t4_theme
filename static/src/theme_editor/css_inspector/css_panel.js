/** @odoo-module */
import { Component, useState, useRef } from '@odoo/owl';
import { CSS_ALL_PROPERTIES } from './css_utils';
import { PropertyGroup } from './property_group';

// ============================================================================
// CssPanel — Floating draggable DevTools-like panel for a single element
// ============================================================================

export class CssPanel extends Component {
    static template = 't4_theme.CssPanel';
    static components = { PropertyGroup };
    static props = {
        panel: { type: Object },
        panelIndex: { type: Number },
        onPropertyChange: { type: Function },
        onResetPanel: { type: Function },
        onClose: { type: Function },
    };

    setup() {
        this.state = useState({
            collapsedGroups: {},
            position: { ...this.props.panel.position },
            addingProperty: false,
            addPropertyFilter: '',
        });

        this.headerRef = useRef('header');
        this._isDragging = false;
        this._dragOffset = { x: 0, y: 0 };

        this._onDragMove = this._onDragMove.bind(this);
        this._onDragEnd = this._onDragEnd.bind(this);
    }

    // ── Dragging ──

    onDragStart(ev) {
        if (ev.button !== 0) return;
        this._isDragging = true;
        this._dragOffset = {
            x: ev.clientX - this.state.position.left,
            y: ev.clientY - this.state.position.top,
        };
        document.addEventListener('mousemove', this._onDragMove);
        document.addEventListener('mouseup', this._onDragEnd);
        ev.preventDefault();
    }

    _onDragMove(ev) {
        if (!this._isDragging) return;
        this.state.position = {
            left: ev.clientX - this._dragOffset.x,
            top: ev.clientY - this._dragOffset.y,
        };
    }

    _onDragEnd() {
        this._isDragging = false;
        document.removeEventListener('mousemove', this._onDragMove);
        document.removeEventListener('mouseup', this._onDragEnd);
    }

    // ── Property value helpers ──

    getDisplayValue(prop) {
        const override = this.props.panel.overrides[prop.name];
        return override !== undefined ? override : prop.value;
    }

    // ── Property change ──

    onValueChange(propName, value) {
        this.props.onPropertyChange(this.props.panelIndex, propName, value);
    }

    // ── Group toggle ──

    toggleGroup(groupKey) {
        this.state.collapsedGroups[groupKey] = !this.state.collapsedGroups[groupKey];
    }

    // ── Add Property ──

    showAddProperty() {
        this.state.addingProperty = true;
        this.state.addPropertyFilter = '';
    }

    onAddPropertyFilter(ev) {
        this.state.addPropertyFilter = ev.target.value;
    }

    onAddPropertyKeydown(ev) {
        if (ev.key === 'Escape') {
            this.state.addingProperty = false;
            this.state.addPropertyFilter = '';
        }
    }

    get filteredProperties() {
        const filter = this.state.addPropertyFilter.toLowerCase();
        const shownNames = new Set(
            this.props.panel.groups.flatMap((g) => g.properties.map((p) => p.name))
        );
        return CSS_ALL_PROPERTIES.filter(
            (p) => !shownNames.has(p) && (!filter || p.includes(filter))
        );
    }

    addProperty(propName) {
        // Use computed style value from the element, or 'initial' as fallback
        let defaultValue = 'initial';
        if (this.props.panel.element) {
            const computed = window.getComputedStyle(this.props.panel.element);
            const val = computed.getPropertyValue(propName).trim();
            if (val) {
                defaultValue = val;
            }
        }
        this.onValueChange(propName, defaultValue);
        this.state.addingProperty = false;
        this.state.addPropertyFilter = '';
    }

    // ── Reset & Close ──

    onReset() {
        this.props.onResetPanel(this.props.panelIndex);
    }

    onCloseClick() {
        this.props.onClose(this.props.panelIndex);
    }
}
