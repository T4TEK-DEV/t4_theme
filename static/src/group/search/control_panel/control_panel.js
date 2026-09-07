/** @odoo-module **/
import { useEffect } from '@odoo/owl';
import { patch } from '@web/core/utils/patch';
import { ListController } from '@web/views/list/list_controller';

// Số dòng tối đa mỗi nhóm CẤP CUỐI khi bấm "Mở tất cả" (override bằng context
// `expand_all_group_limit`). Odoo mặc định 80 dòng/nhóm — list nhiều nhóm thì
// tổng số dòng dựng vào DOM tăng rất nhanh (POC02: 46 nhóm × 80 = 1.482 dòng)
// và list view Odoo KHÔNG có virtual scroll → mở/đóng/scroll đều nặng. Nhóm nào
// còn dòng chưa hiện vẫn có pager riêng của Odoo để tải thêm.
const T4_EXPAND_ALL_GROUP_LIMIT = 20;

/**
 * ListController patch — nút toggle group expand/collapse, cạnh "Mới".
 *
 * Context flag:
 *   - `expand_level` (Number) — quyết định trạng thái mặc định khi view load.
 *     VD: `expand_level=1` → tự động mở cấp 1 ngay khi groups load xong.
 *   - `expand_all_group_limit` (Number) — số dòng/nhóm khi "Mở tất cả"
 *     (mặc định 20). Đặt lớn hơn nếu list ít nhóm và cần xem nhiều dòng.
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

    get t4ExpandAllGroupLimit() {
        const ctx = this.props.context || {};
        const n = parseInt(ctx.expand_all_group_limit, 10);
        return Number.isFinite(n) && n > 0 ? n : T4_EXPAND_ALL_GROUP_LIMIT;
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
     * Đặt số dòng tối đa cho nhóm CẤP CUỐI (nhóm hiển thị record).
     *
     * Nhận diện cấp cuối bằng `g.list.groupBy.length === 0` (core set khi dựng
     * config — xem `relational_model.js::_loadGroupedList`), KHÔNG đếm depth:
     * với nhóm CHƯA mở thì `limit` trong opening_info là giới hạn số SUB-NHÓM
     * (`_open_groups` bên server dùng nó cho `_formatted_read_group_with_length`)
     * → đặt nhầm chỗ sẽ ẩn mất nhóm con.
     */
    _t4SetRecordLimit(recordLimit, config) {
        if (!config.groups) return;
        for (const key in config.groups) {
            const g = config.groups[key];
            if (!g.list) continue;
            if (g.list.groupBy && g.list.groupBy.length) {
                this._t4SetRecordLimit(recordLimit, g.list);
            } else {
                g.list.limit = recordLimit;
                g.list.offset = 0;
            }
        }
    },

    /**
     * Iterative expand: vì sub-groups chỉ tồn tại sau khi parent load, ta cần
     * lặp: mark → load → mark mới (sub-groups vừa xuất hiện) → load …
     * Dừng khi: (a) maxLevel = Infinity → không còn nhóm nào folded; hoặc
     * (b) maxLevel hữu hạn → số cấp không tăng nữa / đã tới maxLevel.
     *
     * `recordLimit` (tùy chọn) — giới hạn số dòng mỗi nhóm cấp cuối, áp lại
     * mỗi vòng vì nhóm con mới vật thể hóa sau mỗi load.
     */
    async _t4ExpandToLevel(maxLevel, recordLimit = null) {
        const limit = Number.isFinite(maxLevel) ? maxLevel : 10;
        let prev = -1;
        for (let i = 0; i < limit + 3; i++) {
            this._t4MarkFolded(maxLevel, this.model.config);
            if (recordLimit) {
                this._t4SetRecordLimit(recordLimit, this.model.config);
            }
            await this.model.load();
            // MỞ TẤT CẢ: điều kiện dừng CHÍNH XÁC là "không còn nhóm folded",
            // KHÔNG phải "số cấp không tăng". `isFolded` được core ghi lại từ
            // phản hồi server sau MỖI load (`groupConfig.isFolded =
            // !('__records' in groupData)`, relational_model.js) nên đây là tín
            // hiệu server đã xác nhận: mọi nhóm đã mở VÀ đã có record.
            // Trước đây chỉ so số cấp → khi các cấp trên đã mở sẵn (mặc định
            // `expand_level=1`) thì load ĐẦU TIÊN đã kéo về đủ record nhưng
            // vòng lặp vẫn phải load LẦN HAI chỉ để thấy "không có cấp mới" —
            // lần load đó fetch + dựng lại toàn bộ record (list Sản Phẩm:
            // ~0,6s server + 0,7MB payload + dựng lại ~1.5k dòng DOM) vô ích,
            // làm nút chậm gấp đôi.
            if (!Number.isFinite(maxLevel)
                    && !this._t4HasFoldedGroups(this.model.config)) {
                break;
            }
            const curr = this._t4CountLevels(this.model.config);
            if (curr === prev) break;
            prev = curr;
            if (Number.isFinite(maxLevel) && curr >= maxLevel) break;
        }
        this.model.notify();
    },

    async _t4CollapseToLevel(maxLevel) {
        this._t4MarkFolded(maxLevel, this.model.config);
        // Trả `limit` về mặc định của view: nhóm bị "Mở tất cả" cắt còn N dòng
        // mà user mở lại LẺ từng nhóm thì phải thấy đủ 80 dòng như bình thường.
        this._t4SetRecordLimit(this.model.initialLimit, this.model.config);
        await this.model.load();
        this.model.notify();
    },

    async onT4ToggleExpand() {
        if (this.t4IsFullyExpanded) {
            await this._t4CollapseToLevel(this.t4ExpandLevel);
        } else {
            await this._t4ExpandToLevel(
                Infinity, this.t4ExpandAllGroupLimit);
        }
        // Label tự cập nhật qua getter `t4IsFullyExpanded` sau `model.notify()`.
    },
});
