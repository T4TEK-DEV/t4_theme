/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { user } from "@web/core/user";
import { T4ThemePanel } from "./theme_panel";

/**
 * T4 Theme Systray Button
 *
 * Only visible to super admin (base.group_system).
 * Clicking toggles the floating theme configuration panel.
 */
export class T4ThemeSystray extends Component {
    static template = "t4_theme.ThemeSystray";
    static components = { T4ThemePanel };
    static props = {};

    setup() {
        this.state = useState({ panelOpen: false });
        this.isSystem = user.isSystem;
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
