import { registry } from "@web/core/registry";
import { user } from "@web/core/user";

/**
 * Debranding service: thay tiêu đề mặc định "Odoo" của Odoo bằng tiêu đề tùy
 * chỉnh. "Odoo" chỉ xuất hiện như FALLBACK của title_service khi không có
 * breadcrumb — tức là ở màn hình chính / menu apps / lúc chưa mở action. Đây
 * cũng là tiêu đề trình duyệt ghi lại cho bookmark/gợi ý địa chỉ.
 *
 * Trang đang mở record/list có breadcrumb riêng (không chứa "Odoo") nên KHÔNG
 * bị đụng — giữ nguyên logic title gốc của Odoo (hiện tên record).
 *
 * Ưu tiên t4_bookmark_title, fallback t4_brand_name để tương thích cấu hình cũ.
 */
export const debrandingService = {
    dependencies: [],
    start(env) {
        const company = user.activeCompany || {};
        const homeTitle =
            company.t4_bookmark_title || company.t4_brand_name || "T4 ERP";

        const applyHomeTitle = () => {
            if (document.title.includes("Odoo")) {
                document.title = document.title.replace(/Odoo/g, homeTitle);
            }
        };

        // 1. Theo dõi thay đổi title (mỗi lần điều hướng) — chỉ động vào fallback.
        const observer = new MutationObserver(applyHomeTitle);
        observer.observe(
            document.querySelector("title"),
            { childList: true, characterData: true, subtree: true }
        );

        // 2. Sửa title lần tải đầu (root URL → quyết định bookmark/gợi ý địa chỉ).
        applyHomeTitle();

        return { homeTitle };
    },
};

registry.category("services").add("t4_debranding", debrandingService);
