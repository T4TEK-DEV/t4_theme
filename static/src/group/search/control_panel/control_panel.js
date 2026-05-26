/** @odoo-module **/
import { useState, useEffect } from '@odoo/owl';
import { patch } from '@web/core/utils/patch';
import { ListController } from '@web/views/list/list_controller';

/**
 * ListController patch — nút toggle group expand/collapse, cạnh "Mới".
 *
 * Context flag:
 *   - `expand_level` (Number) — quyết định trạng thái mặc định khi view load.
 *     VD: `expand_level=1` → tự động mở cấp 1 ngay khi groups load xong.
 *
 * Trạng thái nút:
 *   • isExpanded=false (mặc định) → click sẽ MỞ TẤT CẢ các cấp, nhãn "Mở tất cả".
 *   • isExpanded=true → click sẽ thu gọn về `expand_level` (hoặc root nếu
 *     không có context), nhãn "Thu gọn".
 *
 * Pattern: trực tiếp mutate `isFolded` trên `model.config` rồi `model.load()`
 * 1 lần — nhanh hơn loop `await group.toggle()` tuần tự. Với view ≥ 2 cấp,
 * lặp load tới khi không phát hiện thêm cấp mới (sub-groups chỉ vật thể hóa
 * sau khi parent được load).
 *
 * Auto-expand on load: dùng useEffect watch số lượng groups trong config —
 * onMounted có thể fire TRƯỚC khi RelationalModel load xong root groups, nên
 * effect chờ tới khi groups xuất hiện rồi mới apply expand_level.
 */
patch(ListController.prototype, {
    setup() {
        super.setup(...arguments);
        this.t4ExpandState = useState({ isExpanded: false });
        this.t4InitialExpandApplied = false;

        useEffect(
            () => {
                if (this.t4InitialExpandApplied) return;
                if (!this.model.root.isGrouped) return;
                const groups = this.model.config.groups || {};
                if (!Object.keys(groups).length) return;
                const level = this.t4ExpandLevel;
                if (level <= 0) return;
                this.t4InitialExpandApplied = true;
                this._t4ExpandToLevel(level);
            },
            () => [
                this.model.root.isGrouped,
                Object.keys(this.model.config.groups || {}).length,
            ],
        );
    },

    get t4ExpandLevel() {
        const ctx = this.props.context || {};
        const lvl = parseInt(ctx.expand_level, 10);
        return Number.isFinite(lvl) && lvl > 0 ? lvl : 0;
    },

    get t4ExpandLabel() {
        return this.t4ExpandState.isExpanded ? 'Thu gọn' : 'Mở tất cả';
    },

    /**
     * Đếm số cấp thực tế đang có trong config (dựa trên `g.list.groups`).
     * Root không tính → top-level groups = depth 1.
     */
    _t4CountLevels(config, currentLevel = 0) {
        if (!config.groups || !Object.keys(config.groups).length) {
            return currentLevel;
        }
        let maxLevel = currentLevel;
        for (const key in config.groups) {
            const g = config.groups[key];
            if (g.list && g.list.groups) {
                maxLevel = Math.max(
                    maxLevel,
                    this._t4CountLevels(g.list, currentLevel + 1),
                );
            }
        }
        return maxLevel;
    },

    /**
     * Mutate `isFolded`: group ở depth < maxLevel mở, còn lại đóng.
     * maxLevel = 0 → đóng tất cả (về root).
     * maxLevel = Infinity → mở tất cả.
     */
    _t4MarkFolded(maxLevel, config, currentDepth = 0) {
        if (!config.groups) return;
        for (const key in config.groups) {
            const g = config.groups[key];
            g.isFolded = currentDepth >= maxLevel;
            if (g.list && g.list.groups) {
                this._t4MarkFolded(maxLevel, g.list, currentDepth + 1);
            }
        }
    },

    /**
     * Iterative expand: vì sub-groups chỉ tồn tại sau khi parent load, ta cần
     * lặp: mark → load → mark mới (sub-groups vừa xuất hiện) → load …
     * Dừng khi số cấp không tăng nữa hoặc tới maxLevel.
     */
    async _t4ExpandToLevel(maxLevel) {
        const limit = Number.isFinite(maxLevel) ? maxLevel : 10;
        let prev = -1;
        for (let i = 0; i < limit + 3; i++) {
            this._t4MarkFolded(maxLevel, this.model.config);
            await this.model.load();
            const curr = this._t4CountLevels(this.model.config);
            if (curr === prev) break;
            prev = curr;
            if (Number.isFinite(maxLevel) && curr >= maxLevel) break;
        }
        this.model.notify();
    },

    async _t4CollapseToLevel(maxLevel) {
        this._t4MarkFolded(maxLevel, this.model.config);
        await this.model.load();
        this.model.notify();
    },

    async onT4ToggleExpand() {
        if (this.t4ExpandState.isExpanded) {
            await this._t4CollapseToLevel(this.t4ExpandLevel);
        } else {
            await this._t4ExpandToLevel(Infinity);
        }
        this.t4ExpandState.isExpanded = !this.t4ExpandState.isExpanded;
    },
});
