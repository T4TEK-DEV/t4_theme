/** @odoo-module */

import { findComponentForElement } from '../component_registry';

// ============================================================================
// CSS Inspector Utilities
// Pure utility module — no OWL imports, no side effects
// ============================================================================

/**
 * Transient state classes to skip when building selectors.
 * These classes change dynamically and do not identify structure.
 */
const TRANSIENT_CLASSES = new Set([
    'show', 'active', 'focus', 'hover', 'o_cursor_pointer',
    'd-none', 'd-flex', 'd-block',
]);

/**
 * CSS properties grouped by category.
 * Order within each group is preserved in output.
 */
const PROPERTY_GROUPS = {
    box: {
        name: 'Box Model',
        key: 'box',
        props: [
            'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
            'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
            'border-radius',
            'border-top-left-radius', 'border-top-right-radius',
            'border-bottom-right-radius', 'border-bottom-left-radius',
            'width', 'min-width', 'max-width',
            'height', 'min-height', 'max-height',
        ],
    },
    typography: {
        name: 'Typography',
        key: 'typography',
        props: [
            'font-size', 'font-weight', 'font-family', 'font-style',
            'line-height', 'letter-spacing', 'text-align', 'text-transform',
            'text-decoration', 'color', 'word-spacing',
        ],
    },
    background: {
        name: 'Background & Borders',
        key: 'background',
        props: [
            'background-color', 'background-image',
            'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
            'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
            'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
            'box-shadow', 'outline',
        ],
    },
    layout: {
        name: 'Layout',
        key: 'layout',
        props: [
            'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
            'flex-direction', 'flex-wrap', 'justify-content', 'align-items',
            'gap', 'overflow', 'opacity',
        ],
    },
    effects: {
        name: 'Effects',
        key: 'effects',
        props: ['transition', 'transform', 'cursor'],
    },
};

/**
 * Flat set of all tracked property names for fast lookup.
 */
const ALL_TRACKED_PROPS = new Set(
    Object.values(PROPERTY_GROUPS).flatMap((g) => g.props)
);

/**
 * Properties whose value is a CSS enum/keyword.
 */
const ENUM_PROPERTIES = new Set([
    'display', 'position', 'overflow', 'text-align', 'text-transform',
    'font-style', 'font-weight', 'flex-direction', 'flex-wrap',
    'justify-content', 'align-items', 'cursor', 'text-decoration',
    'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
]);

/**
 * Properties whose value is a size/dimension.
 */
const SIZE_PROP_PATTERN = /^(font-size|line-height|letter-spacing|word-spacing|gap|z-index|opacity|top|right|bottom|left|width|min-width|max-width|height|min-height|max-height|border-radius|border-top-left-radius|border-top-right-radius|border-bottom-right-radius|border-bottom-left-radius|border-top-width|border-right-width|border-bottom-width|border-left-width|(margin|padding)-(top|right|bottom|left))$/;

// ============================================================================
// Exported constants
// ============================================================================

/**
 * Valid values for enum CSS properties.
 */
export const CSS_ENUM_VALUES = {
    'display': ['none', 'block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'table', 'contents'],
    'position': ['static', 'relative', 'absolute', 'fixed', 'sticky'],
    'overflow': ['visible', 'hidden', 'scroll', 'auto', 'clip'],
    'text-align': ['left', 'center', 'right', 'justify', 'start', 'end'],
    'text-transform': ['none', 'uppercase', 'lowercase', 'capitalize'],
    'font-style': ['normal', 'italic', 'oblique'],
    'font-weight': ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
    'flex-direction': ['row', 'row-reverse', 'column', 'column-reverse'],
    'flex-wrap': ['nowrap', 'wrap', 'wrap-reverse'],
    'justify-content': ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
    'align-items': ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'],
    'cursor': ['default', 'pointer', 'text', 'move', 'not-allowed', 'grab', 'crosshair'],
    'text-decoration': ['none', 'underline', 'overline', 'line-through'],
    'border-top-style': ['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge'],
    'border-right-style': ['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge'],
    'border-bottom-style': ['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge'],
    'border-left-style': ['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge'],
};

/**
 * ~150 common CSS property names for autocomplete, sorted alphabetically.
 */
export const CSS_ALL_PROPERTIES = [
    'align-content', 'align-items', 'align-self',
    'animation', 'animation-delay', 'animation-direction', 'animation-duration',
    'animation-fill-mode', 'animation-iteration-count', 'animation-name',
    'animation-play-state', 'animation-timing-function',
    'appearance', 'aspect-ratio',
    'backdrop-filter',
    'background', 'background-attachment', 'background-clip', 'background-color',
    'background-image', 'background-origin', 'background-position',
    'background-repeat', 'background-size',
    'border', 'border-bottom', 'border-bottom-color', 'border-bottom-left-radius',
    'border-bottom-right-radius', 'border-bottom-style', 'border-bottom-width',
    'border-collapse', 'border-color', 'border-image', 'border-left',
    'border-left-color', 'border-left-style', 'border-left-width',
    'border-radius', 'border-right', 'border-right-color', 'border-right-style',
    'border-right-width', 'border-spacing', 'border-style',
    'border-top', 'border-top-color', 'border-top-left-radius',
    'border-top-right-radius', 'border-top-style', 'border-top-width', 'border-width',
    'bottom', 'box-shadow', 'box-sizing',
    'caption-side', 'clear', 'clip', 'clip-path', 'color',
    'column-count', 'column-gap', 'column-rule', 'column-span', 'column-width',
    'content', 'counter-increment', 'counter-reset', 'cursor',
    'direction', 'display',
    'empty-cells',
    'filter', 'flex', 'flex-basis', 'flex-direction', 'flex-flow',
    'flex-grow', 'flex-shrink', 'flex-wrap', 'float', 'font',
    'font-family', 'font-kerning', 'font-size', 'font-size-adjust',
    'font-stretch', 'font-style', 'font-variant', 'font-weight',
    'gap', 'grid', 'grid-area', 'grid-auto-columns', 'grid-auto-flow',
    'grid-auto-rows', 'grid-column', 'grid-column-end', 'grid-column-start',
    'grid-row', 'grid-row-end', 'grid-row-start', 'grid-template',
    'grid-template-areas', 'grid-template-columns', 'grid-template-rows',
    'height',
    'isolation',
    'justify-content', 'justify-items', 'justify-self',
    'left', 'letter-spacing', 'line-height', 'list-style',
    'list-style-image', 'list-style-position', 'list-style-type',
    'margin', 'margin-bottom', 'margin-left', 'margin-right', 'margin-top',
    'max-height', 'max-width', 'min-height', 'min-width', 'mix-blend-mode',
    'object-fit', 'object-position', 'opacity', 'order', 'outline',
    'outline-color', 'outline-offset', 'outline-style', 'outline-width',
    'overflow', 'overflow-x', 'overflow-y',
    'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top',
    'place-content', 'place-items', 'place-self', 'pointer-events', 'position',
    'resize', 'right', 'row-gap',
    'scroll-behavior', 'scroll-snap-type',
    'table-layout', 'text-align', 'text-decoration', 'text-decoration-color',
    'text-decoration-line', 'text-decoration-style', 'text-indent',
    'text-overflow', 'text-shadow', 'text-transform',
    'top', 'transform', 'transform-origin', 'transform-style',
    'transition', 'transition-delay', 'transition-duration',
    'transition-property', 'transition-timing-function',
    'user-select', 'vertical-align', 'visibility',
    'white-space', 'width', 'will-change', 'word-break',
    'word-spacing', 'word-wrap', 'writing-mode',
    'z-index',
];

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Return the first meaningful class for a selector segment.
 * Prefers `.o_*` classes, then any non-transient class.
 * @param {Element} el
 * @returns {string} class token with leading dot, or empty string
 */
function _pickClass(el) {
    const classes = Array.from(el.classList).filter((c) => !TRANSIENT_CLASSES.has(c));
    const odooClass = classes.find((c) => c.startsWith('o_'));
    if (odooClass) {
        return '.' + odooClass;
    }
    return classes.length ? '.' + classes[0] : '';
}

/**
 * Build a positional nth-child suffix for an element when no class is available.
 * @param {Element} el
 * @returns {string} e.g. ':nth-child(2)' or ''
 */
function _nthChild(el) {
    const parent = el.parentElement;
    if (!parent) {
        return '';
    }
    const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === el.tagName
    );
    if (siblings.length <= 1) {
        return '';
    }
    const idx = siblings.indexOf(el) + 1;
    return `:nth-child(${idx})`;
}

/**
 * Build a single selector segment for an element.
 * @param {Element} el
 * @returns {string}
 */
function _segment(el) {
    const tag = el.tagName.toLowerCase();
    const cls = _pickClass(el);
    if (cls) {
        return cls;
    }
    return tag + _nthChild(el);
}

// ============================================================================
// Exported functions
// ============================================================================

/**
 * Generate a unique CSS selector for any DOM element.
 *
 * Priority:
 * 1. If the element matches a registered theme component, use its `cssTarget`.
 * 2. Otherwise, build from classes (prefer `.o_*`) with up to 3 parent levels.
 *
 * @param {Element} el
 * @returns {string}
 */
export function generateSelector(el) {
    const found = findComponentForElement(el);
    if (found && found.config && found.config.cssTarget) {
        return found.config.cssTarget;
    }

    const segments = [];
    let current = el;
    let depth = 0;
    const maxDepth = 3;

    while (current && current !== document.body && depth <= maxDepth) {
        segments.unshift(_segment(current));
        current = current.parentElement;
        depth++;
        // Stop early if we already have a meaningful anchor
        if (depth > 1 && segments[0].startsWith('.o_')) {
            break;
        }
    }

    return segments.join(' ');
}

/**
 * Extract computed styles for an element, returning only the ~60 most
 * commonly edited CSS properties.
 *
 * @param {Element} el
 * @returns {Object.<string, string>} e.g. `{ 'font-size': '14px', ... }`
 */
export function getRelevantProperties(el) {
    const computed = window.getComputedStyle(el);
    const result = {};
    for (const prop of ALL_TRACKED_PROPS) {
        const value = computed.getPropertyValue(prop).trim();
        if (value) {
            result[prop] = value;
        }
    }
    return result;
}

/**
 * Group a properties object into display categories.
 *
 * @param {Object.<string, string>} properties — output of `getRelevantProperties()`
 * @returns {Array<{name: string, key: string, properties: Array<{name: string, value: string, editorType: string}>}>}
 */
export function groupProperties(properties) {
    return Object.values(PROPERTY_GROUPS).map((group) => {
        const items = group.props
            .filter((prop) => prop in properties)
            .map((prop) => ({
                name: prop,
                value: properties[prop],
                editorType: detectEditorType(prop, properties[prop]),
            }));
        return {
            name: group.name,
            key: group.key,
            properties: items,
        };
    });
}

/**
 * Determine the editor type for a CSS property + value pair.
 *
 * @param {string} propName  — e.g. 'font-size'
 * @param {string} value     — e.g. '14px'
 * @returns {'color'|'size'|'enum'|'shorthand'|'text'}
 */
export function detectEditorType(propName, value) {
    // Shorthand (getComputedStyle returns longhand; this path is mainly for AddProperty)
    if (propName === 'margin' || propName === 'padding' || propName === 'border-radius') {
        return 'shorthand';
    }

    // Color
    if (propName.includes('color')) {
        return 'color';
    }
    const colorValuePattern = /^(#[0-9a-fA-F]{3,8}|rgb[a]?\(|hsl[a]?\()/;
    if (colorValuePattern.test(value)) {
        return 'color';
    }

    // Enum
    if (ENUM_PROPERTIES.has(propName)) {
        return 'enum';
    }

    // Size
    const sizeValuePattern = /^-?[\d.]+(px|rem|em|%|vh|vw|vmin|vmax|ch|ex|pt|cm|mm|in)$/;
    if (sizeValuePattern.test(value) || SIZE_PROP_PATTERN.test(propName)) {
        return 'size';
    }

    return 'text';
}

/**
 * Walk up the DOM from `el` to `body`, collecting breadcrumb path segments.
 *
 * Each segment is the tag name plus the first meaningful class (prefer `.o_*`).
 * Maximum 6 segments are returned.
 *
 * @param {Element} el
 * @returns {string[]} e.g. `['body', '.o_action_manager', '.o_kanban_view', '.o_kanban_record']`
 */
export function buildBreadcrumb(el) {
    const path = [];
    let current = el;
    const maxSegments = 6;

    while (current && path.length < maxSegments) {
        const tag = current.tagName.toLowerCase();
        const cls = _pickClass(current);
        path.unshift(cls || tag);
        if (current === document.body) {
            break;
        }
        current = current.parentElement;
    }

    // Ensure body is the root if we walked all the way up
    if (path[0] !== 'body' && (!el.closest || !el.closest('body'))) {
        path.unshift('body');
    }

    return path.slice(0, maxSegments);
}
