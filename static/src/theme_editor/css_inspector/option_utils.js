/** @odoo-module */

import { findComponentForElement } from '../component_registry';

// ============================================================================
// Option Utilities — maps component_registry entries to sidebar option sections
// Bridges raw CSS properties and visual controls
// ============================================================================

/**
 * The 6 sidebar sections with friendly labels and CSS property definitions.
 * Each prop entry describes how to render and constrain the control.
 */
export const OPTION_SECTIONS = [
    {
        key: 'spacing',
        label: 'Spacing',
        icon: 'fa-arrows-alt',
        props: [
            { css: 'padding-top', label: 'Padding Top', shortLabel: 'Top', unit: 'px', min: 0, max: 100, step: 1 },
            { css: 'padding-right', label: 'Padding Right', shortLabel: 'Right', unit: 'px', min: 0, max: 100, step: 1 },
            { css: 'padding-bottom', label: 'Padding Bottom', shortLabel: 'Bottom', unit: 'px', min: 0, max: 100, step: 1 },
            { css: 'padding-left', label: 'Padding Left', shortLabel: 'Left', unit: 'px', min: 0, max: 100, step: 1 },
            { css: 'margin-top', label: 'Margin Top', shortLabel: 'Top', unit: 'px', min: -50, max: 100, step: 1 },
            { css: 'margin-right', label: 'Margin Right', shortLabel: 'Right', unit: 'px', min: -50, max: 100, step: 1 },
            { css: 'margin-bottom', label: 'Margin Bottom', shortLabel: 'Bottom', unit: 'px', min: -50, max: 100, step: 1 },
            { css: 'margin-left', label: 'Margin Left', shortLabel: 'Left', unit: 'px', min: -50, max: 100, step: 1 },
            { css: 'gap', label: 'Gap', unit: 'px', min: 0, max: 60, step: 1 },
        ],
    },
    {
        key: 'typography',
        label: 'Typography',
        icon: 'fa-font',
        props: [
            { css: 'font-size', label: 'Size', unit: 'px', min: 8, max: 72, step: 1 },
            { css: 'font-weight', label: 'Weight', type: 'select', options: [
                { value: '300', label: 'Light' },
                { value: '400', label: 'Regular' },
                { value: '500', label: 'Medium' },
                { value: '600', label: 'Semi Bold' },
                { value: '700', label: 'Bold' },
                { value: '800', label: 'Extra Bold' },
            ]},
            { css: 'color', label: 'Text Color', type: 'color' },
            { css: 'text-align', label: 'Alignment', type: 'align' },
            { css: 'line-height', label: 'Line Height', unit: '', min: 0.8, max: 3, step: 0.1 },
            { css: 'letter-spacing', label: 'Letter Spacing', unit: 'px', min: -2, max: 10, step: 0.5 },
            { css: 'text-transform', label: 'Transform', type: 'select', options: [
                { value: 'none', label: 'Normal' },
                { value: 'uppercase', label: 'UPPERCASE' },
                { value: 'capitalize', label: 'Capitalize' },
                { value: 'lowercase', label: 'lowercase' },
            ]},
        ],
    },
    {
        key: 'background',
        label: 'Background',
        icon: 'fa-paint-brush',
        props: [
            { css: 'background-color', label: 'Color', type: 'color' },
            { css: 'opacity', label: 'Opacity', unit: '', min: 0, max: 1, step: 0.05 },
        ],
    },
    {
        key: 'border',
        label: 'Border & Shadow',
        icon: 'fa-square-o',
        props: [
            { css: 'border-radius', label: 'Border Radius', unit: 'px', min: 0, max: 50, step: 1 },
            { css: 'border-top-width', label: 'Border Width', unit: 'px', min: 0, max: 10, step: 1 },
            { css: 'border-top-style', label: 'Border Style', type: 'select', options: [
                { value: 'none', label: 'None' },
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'dotted', label: 'Dotted' },
            ]},
            { css: 'border-top-color', label: 'Border Color', type: 'color' },
            { css: 'box-shadow', label: 'Shadow', type: 'shadow-preset' },
        ],
    },
    {
        key: 'size',
        label: 'Size',
        icon: 'fa-expand',
        props: [
            { css: 'width', label: 'Width', unit: 'px', min: 0, max: 1200, step: 1 },
            { css: 'min-width', label: 'Min Width', unit: 'px', min: 0, max: 1200, step: 1 },
            { css: 'max-width', label: 'Max Width', unit: 'px', min: 0, max: 1200, step: 1 },
            { css: 'height', label: 'Height', unit: 'px', min: 0, max: 800, step: 1 },
            { css: 'min-height', label: 'Min Height', unit: 'px', min: 0, max: 800, step: 1 },
            { css: 'max-height', label: 'Max Height', unit: 'px', min: 0, max: 800, step: 1 },
        ],
    },
    {
        key: 'layout',
        label: 'Layout',
        icon: 'fa-th-large',
        props: [
            { css: 'display', label: 'Display', type: 'select', options: [
                { value: 'block', label: 'Block' },
                { value: 'flex', label: 'Flex' },
                { value: 'inline-block', label: 'Inline Block' },
                { value: 'inline', label: 'Inline' },
                { value: 'grid', label: 'Grid' },
                { value: 'none', label: 'Hidden' },
            ]},
            { css: 'flex-direction', label: 'Direction', type: 'select', options: [
                { value: 'row', label: 'Row \u2192' },
                { value: 'column', label: 'Column \u2193' },
                { value: 'row-reverse', label: 'Row \u2190' },
                { value: 'column-reverse', label: 'Column \u2191' },
            ]},
            { css: 'justify-content', label: 'Justify', type: 'select', options: [
                { value: 'flex-start', label: 'Start' },
                { value: 'center', label: 'Center' },
                { value: 'flex-end', label: 'End' },
                { value: 'space-between', label: 'Space Between' },
                { value: 'space-around', label: 'Space Around' },
            ]},
            { css: 'align-items', label: 'Align', type: 'select', options: [
                { value: 'stretch', label: 'Stretch' },
                { value: 'flex-start', label: 'Start' },
                { value: 'center', label: 'Center' },
                { value: 'flex-end', label: 'End' },
                { value: 'baseline', label: 'Baseline' },
            ]},
            { css: 'flex-wrap', label: 'Wrap', type: 'select', options: [
                { value: 'nowrap', label: 'No Wrap' },
                { value: 'wrap', label: 'Wrap' },
            ]},
        ],
    },
];

/**
 * Predefined box-shadow presets for the shadow-preset control type.
 */
export const SHADOW_PRESETS = [
    { key: 'none', label: 'None', value: 'none' },
    { key: 'subtle', label: 'Subtle', value: '0 1px 3px rgba(0,0,0,0.12)' },
    { key: 'medium', label: 'Medium', value: '0 2px 8px rgba(0,0,0,0.15)' },
    { key: 'strong', label: 'Strong', value: '0 4px 16px rgba(0,0,0,0.2)' },
    { key: 'floating', label: 'Floating', value: '0 8px 32px rgba(0,0,0,0.25)' },
];

/**
 * Get user-friendly info about a clicked element.
 * Looks up the component registry first; falls back to tag/class inference.
 *
 * @param {Element} el
 * @returns {{label: string, icon: string, selector: string, category: string, registryProps: Array}}
 */
export function getElementInfo(el) {
    const registryMatch = findComponentForElement(el);
    if (registryMatch) {
        return {
            label: registryMatch.config.label,
            icon: registryMatch.config.icon || 'fa-cube',
            selector: registryMatch.config.cssTarget || registryMatch.selector,
            category: registryMatch.config.category || 'general',
            registryProps: registryMatch.config.properties || [],
        };
    }
    // Fallback for unregistered elements
    const tag = el.tagName.toLowerCase();
    const cls = Array.from(el.classList).find((c) => c.startsWith('o_')) || '';
    return {
        label: cls ? cls.replace('o_', '').replace(/_/g, ' ') : tag,
        icon: 'fa-cube',
        selector: cls ? '.' + cls : tag,
        category: 'general',
        registryProps: [],
    };
}

/**
 * Determine which option sections are relevant for a given element.
 * Reads computed styles and annotates each prop with its current value
 * and whether it maps to a registry-defined property.
 *
 * Sections in `alwaysShow` are included regardless of registry presence.
 * Other sections are included only when at least one prop is in the registry.
 *
 * @param {Element} el
 * @returns {Array<{key: string, label: string, icon: string, props: Array, relevant: boolean}>}
 */
export function getSectionsForElement(el) {
    const computed = window.getComputedStyle(el);
    const info = getElementInfo(el);

    // Build set of CSS properties from registry for this element
    const registryCssProps = new Set();
    for (const prop of info.registryProps) {
        // Registry props use 'key' which may be CSS var or CSS property
        if (prop.css) {
            registryCssProps.add(prop.css);
        } else if (prop.key && !prop.key.startsWith('--')) {
            registryCssProps.add(prop.key);
        }
    }

    return OPTION_SECTIONS.map((section) => {
        const props = section.props.map((prop) => {
            const raw = computed.getPropertyValue(prop.css).trim();
            return {
                ...prop,
                currentValue: raw,
                inRegistry: registryCssProps.has(prop.css),
            };
        });

        // Section is "relevant" if at least one prop is in registry OR section is always-show
        const alwaysShow = ['spacing', 'typography', 'background', 'border'];
        const hasRegistryProp = props.some((p) => p.inRegistry);
        const relevant = alwaysShow.includes(section.key) || hasRegistryProp;

        return {
            ...section,
            props,
            relevant,
        };
    });
}

/**
 * Parse a CSS value string into numeric and unit parts.
 *
 * @param {string} value — raw CSS value e.g. '14px', '1.5', 'auto'
 * @param {string} unit  — fallback unit when none is present in value
 * @returns {{num: number, unit: string, raw: string}}
 */
export function parseValue(value, unit) {
    if (!value || value === 'auto' || value === 'none' || value === 'normal') {
        return { num: 0, unit: unit || 'px', raw: value };
    }
    const match = String(value).match(/^(-?[\d.]+)\s*(px|rem|em|%|vh|vw|pt)?$/);
    if (match) {
        return { num: parseFloat(match[1]), unit: match[2] || unit || '', raw: value };
    }
    return { num: 0, unit: unit || '', raw: value };
}

/**
 * Format a number and unit back into a CSS value string.
 *
 * @param {number} num
 * @param {string} unit — e.g. 'px', 'rem', or '' for unitless values
 * @returns {string}
 */
export function formatValue(num, unit) {
    if (unit) {
        return `${num}${unit}`;
    }
    return String(num);
}
