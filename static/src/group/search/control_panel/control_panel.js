/** @odoo-module **/
import { useState } from '@odoo/owl';
import { patch } from '@web/core/utils/patch';
import { ListController } from '@web/views/list/list_controller';

/**
 * ListController patch — 1 nút toggle ở vị trí cạnh "Mới" (sau o_list_buttons).
 *
 * Trạng thái:
 *   • isExpanded=false → click sẽ mở đến cấp N (N = context.expand_level
 *     hoặc tất cả nếu không set), nhãn "Mở đến cấp N" / "Mở tất cả".
 *   • isExpanded=true  → click sẽ đóng tất cả, nhãn "Thu gọn".
 *
 * Set context.expand_level trong action để quyết định độ sâu mặc định.
 */
patch(ListController.prototype, {
    setup() {
        super.setup(...arguments);
        this.t4ExpandState = useState({ isExpanded: false });
    },

    get t4ExpandLevel() {
        const ctx = this.props.context || {};
        const lvl = parseInt(ctx.expand_level, 10);
        return Number.isFinite(lvl) && lvl > 0 ? lvl : 0;
    },

    get t4ExpandLabel() {
        if (this.t4ExpandState.isExpanded) {
            return 'Thu gọn';
        }
        return this.t4ExpandLevel
            ? `Mở đến cấp ${this.t4ExpandLevel}`
            : 'Mở tất cả';
    },

    async onT4ToggleExpand() {
        const root = this.model.root;
        if (this.t4ExpandState.isExpanded) {
            // Collapse all — fold mọi cấp (cả top-level), nếu không top-level
            // giữ isFolded=false và lần expand kế sau filter sẽ rỗng.
            const collapse = (config) => {
                if (!config.groups) return;
                for (const k in config.groups) {
                    const g = config.groups[k];
                    g.isFolded = true;
                    if (g.list && g.list.groups) {
                        collapse(g.list);
                    }
                }
            };
            collapse(this.model.config);
        } else {
            // Expand to level
            const maxDepth = this.t4ExpandLevel || Infinity;
            let depth = 0;
            let groups = root.groups;
            while (groups.length && depth < maxDepth) {
                depth += 1;
                const folded = groups.filter((g) => g._config.isFolded);
                for (const g of folded) {
                    await g.toggle();
                }
                groups = folded
                    .map((g) => g.list.groups || [])
                    .reduce((a, b) => a.concat(b), []);
            }
        }
        this.t4ExpandState.isExpanded = !this.t4ExpandState.isExpanded;
        await root.load();
        this.model.notify();
    },
});
