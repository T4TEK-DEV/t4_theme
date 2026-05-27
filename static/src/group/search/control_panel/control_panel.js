/** @odoo-module **/
import { useEffect } from '@odoo/owl';
import { patch } from '@web/core/utils/patch';
import { ListController } from '@web/views/list/list_controller';

/**
 * ListController patch — nút toggle group expand/collapse, cạnh "Mới".
 *
 * Context flag:
 *   - `expand_level` (Number) — quyết định trạng thái mặc định khi view load.
 *     VD: `expand_level=1` → tự động mở cấp 1 ngay khi groups load xong.
 *
 * Trạng thái nút (suy ra từ model qua `t4IsFullyExpanded`, KHÔNG giữ flag riêng
 * → luôn đúng kể cả sau restore từ breadcrumb):
 *   • Còn nhóm folded ở bất kỳ cấp → nhãn "Mở tất cả", click MỞ TẤT CẢ các cấp.
 *   • Đã mở hết mọi cấp → nhãn "Thu gọn", click thu gọn về `expand_level`
 *     (hoặc root nếu không có context).
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
        // Khi khôi phục từ breadcrumb / action stack, `props.state` đã chứa sẵn
        // trạng thái expand/collapse + records mà user để lại. KHÔNG auto-expand
        // lại: lệnh `model.load()` của effect sẽ đua (race) với restore-load của
        // framework → list bị trống (phải reload tay). Đánh dấu đã-áp-dụng để
        // effect bỏ qua, giữ nguyên view đúng như khi rời đi. Chỉ auto-expand khi
        // load MỚI (props.state rỗng).
        this.t4InitialExpandApplied = Boolean(this.props.state);

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
        return this.t4IsFullyExpanded ? 'Thu gọn' : 'Mở tất cả';
    },

    /**
     * Trạng thái nút suy ra TRỰC TIẾP từ model (không giữ flag riêng) → luôn
     * khớp thực tế kể cả sau khi restore từ breadcrumb hay khi user tự fold/
     * unfold từng nhóm. "Đã mở hết" = đang grouped, có groups, và KHÔNG còn
     * nhóm nào folded ở mọi cấp.
     */
    get t4IsFullyExpanded() {
        const groups = this.model.config.groups || {};
        if (!this.model.root.isGrouped || !Object.keys(groups).length) {
            return false;
        }
        return !this._t4HasFoldedGroups(this.model.config);
    },

    _t4HasFoldedGroups(config) {
        if (!config.groups) {
            return false;
        }
        for (const key in config.groups) {
            const g = config.groups[key];
            if (g.isFolded) {
                return true;
            }
            if (g.list && g.list.groups && this._t4HasFoldedGroups(g.list)) {
                return true;
            }
        }
        return false;
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
        if (this.t4IsFullyExpanded) {
            await this._t4CollapseToLevel(this.t4ExpandLevel);
        } else {
            await this._t4ExpandToLevel(Infinity);
        }
        // Label tự cập nhật qua getter `t4IsFullyExpanded` sau `model.notify()`.
    },
});
