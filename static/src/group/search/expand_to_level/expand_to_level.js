/** @odoo-module **/
import { Component } from '@odoo/owl';
import { registry } from '@web/core/registry';
import { DropdownItem } from '@web/core/dropdown/dropdown_item';

const cogMenuRegistry = registry.category('cogMenu');

/**
 * ExpandToLevel — mở rộng groups tới cấp N (1, 2, 3) hoặc tất cả.
 * Mỗi instance tương ứng 1 level, registered dưới key riêng biệt.
 *
 * Khác với ExpandAll (đã có sẵn): level có thể config qua static `level`.
 * Dùng depth-controlled traversal thay vì BFS không giới hạn.
 */
export class ExpandToLevel extends Component {
    static template = 't4_theme.ExpandToLevel';
    static components = { DropdownItem };
    static props = {
        level: { type: Number, optional: true },
        label: { type: String, optional: true },
    };

    // Level mặc định (dùng khi spawn dynamic); 0 = Infinity (all)
    static defaultProps = { level: 0, label: 'Mở tất cả' };

    get displayLevel() {
        return this.props.level || 0;
    }

    get displayLabel() {
        return this.props.label || 'Mở tất cả';
    }

    /**
     * Toggle groups xuống đến maxDepth (1-based). Với maxDepth=0 → no limit.
     */
    async onExpandClicked() {
        const maxDepth = this.props.level || Infinity;
        let depth = 0;
        let groups = this.env.model.root.groups;

        while (groups.length && depth < maxDepth) {
            depth += 1;
            const folded = groups.filter((g) => g._config.isFolded);
            for (const group of folded) {
                await group.toggle();
            }
            // Gom sub-groups cho vòng tiếp theo
            groups = folded
                .map((g) => g.list.groups || [])
                .reduce((a, b) => a.concat(b), []);
        }

        await this.env.model.root.load();
        this.env.model.notify();
    }
}

/**
 * Factory helper: tạo 1 entry cogMenu với level cụ thể.
 * level = 0 → Infinity (mở tất cả) — dành cho trường hợp dynamic.
 */
function makeLevelItem(level, label) {
    class LevelComponent extends ExpandToLevel {
        static defaultProps = { level, label };
    }
    return {
        Component: LevelComponent,
        groupNumber: 15,
        isDisplayed: async (env) => (
            ['kanban', 'list'].includes(env.config.viewType) &&
            env.model.root.isGrouped
        ),
    };
}

// Đăng ký 4 menu item: Level 1, 2, 3, All
cogMenuRegistry.add(
    't4-expand-level-1',
    makeLevelItem(1, 'Mở đến cấp 1'),
    { sequence: 3 },
);
cogMenuRegistry.add(
    't4-expand-level-2',
    makeLevelItem(2, 'Mở đến cấp 2'),
    { sequence: 4 },
);
cogMenuRegistry.add(
    't4-expand-level-3',
    makeLevelItem(3, 'Mở đến cấp 3'),
    { sequence: 5 },
);
