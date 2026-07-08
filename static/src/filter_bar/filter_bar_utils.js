/** @odoo-module */
/**
 * Helper dùng chung cho T4 Filter Bar (hàng lọc inline + popover nâng cao).
 * Tách riêng để tránh circular import giữa list_renderer_patch ↔
 * column_filter_popover.
 */
import { _t } from '@web/core/l10n/translation';

/** Placeholder tiếng Việt theo type (core dùng chuỗi tiếng Anh chưa dịch). */
export function t4FbPlaceholder(fd) {
    const t = fd?.type;
    if (['many2one', 'many2many', 'one2many', 'selection'].includes(t)) {
        return _t('Chọn giá trị…');
    }
    if (['date', 'datetime'].includes(t)) {
        return _t('Chọn ngày…');
    }
    return _t('Nhập để lọc…');
}

/**
 * Bọc extractProps của value editor để ép placeholder tiếng Việt (core trả
 * placeholder tiếng Anh "Select one or several criteria" / 'Press "Enter" to
 * add criterion' — chưa dịch, hiện lộn xộn trên ô lọc hẹp). Trả info MỚI
 * (không mutate info gốc).
 */
export function t4FbInjectPlaceholder(info, fd) {
    if (!info || !info.component || typeof info.extractProps !== 'function') {
        return info;
    }
    const orig = info.extractProps;
    return {
        ...info,
        extractProps: (args) => {
            const props = orig(args);
            // CHỈ ghi đè khi editor VỐN có placeholder — KHÔNG thêm prop lạ vào
            // component không khai báo (List/Range/InRange...) → OWL nổ
            // "unknown prop". Input/Select/DateTimeInput/autocomplete đều có.
            if (props && 'placeholder' in props) {
                props.placeholder = t4FbPlaceholder(fd);
            }
            return props;
        },
    };
}
