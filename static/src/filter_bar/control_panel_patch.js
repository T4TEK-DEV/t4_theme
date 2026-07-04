/** @odoo-module */
/**
 * Nút bật/tắt T4 Filter Bar trên control panel (cạnh nút Refresh).
 *
 * Chỉ hiện ở list view có searchModel. Trạng thái nhớ per-action trong
 * localStorage (cùng key với list_renderer_patch — nguồn sự thật là
 * localStorage, nút chỉ flip + bắn bus cho renderer đọc lại).
 */
import { browser } from '@web/core/browser/browser';
import { patch } from '@web/core/utils/patch';
import { ControlPanel } from '@web/search/control_panel/control_panel';
import { useState } from '@odoo/owl';

import {
    T4_FILTER_BAR_TOGGLE,
    t4FilterBarStorageKey,
} from '@t4_theme/filter_bar/list_renderer_patch';

patch(ControlPanel.prototype, {
    setup() {
        super.setup();
        this.t4FbState = useState({
            active: !!browser.localStorage.getItem(
                t4FilterBarStorageKey(this.env)),
        });
    },

    get t4FbToggleAvailable() {
        return this.env.config?.viewType === 'list' && !!this.env.searchModel;
    },

    t4FbToggle() {
        const key = t4FilterBarStorageKey(this.env);
        if (browser.localStorage.getItem(key)) {
            browser.localStorage.removeItem(key);
            this.t4FbState.active = false;
        } else {
            browser.localStorage.setItem(key, '1');
            this.t4FbState.active = true;
        }
        this.env.bus.trigger(T4_FILTER_BAR_TOGGLE);
    },
});
