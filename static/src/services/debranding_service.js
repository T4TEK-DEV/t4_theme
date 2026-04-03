import { registry } from "@web/core/registry";
import { user } from "@web/core/user";

/**
 * Debranding service: replaces "Odoo" with company brand name
 * across JS-rendered UI elements.
 */
export const debrandingService = {
    dependencies: [],
    start(env) {
        const brandName = user.activeCompany?.t4_brand_name || "T4 ERP";

        // 1. Patch document title — replace "Odoo" fallback
        const originalGetTitle = document.title;
        const observer = new MutationObserver(() => {
            if (document.title.includes("Odoo")) {
                document.title = document.title.replace(/Odoo/g, brandName);
            }
        });
        observer.observe(
            document.querySelector("title"),
            { childList: true, characterData: true, subtree: true }
        );

        // 2. Initial title fix
        if (document.title.includes("Odoo")) {
            document.title = document.title.replace(/Odoo/g, brandName);
        }

        return { brandName };
    },
};

registry.category("services").add("t4_debranding", debrandingService);
