/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { T4ThemePanel } from "./theme_panel";

/**
 * T4 Theme Systray Button
 *
 * Adds a paint brush icon to the navbar systray area.
 * Clicking toggles the floating theme configuration panel.
 */
export class T4ThemeSystray extends Component {
    static template = "t4_theme.ThemeSystray";
    static components = { T4ThemePanel };
    static props = {};

    setup() {
        this.state = useState({ panelOpen: false });
        this.themeState = useService("t4_theme");
    }

    togglePanel() {
        this.state.panelOpen = !this.state.panelOpen;
    }

    closePanel() {
        this.state.panelOpen = false;
    }
}

export const systrayItem = {
    Component: T4ThemeSystray,
};

registry.category("systray").add("t4_theme", systrayItem, { sequence: 50 });
