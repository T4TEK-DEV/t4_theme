/** @odoo-module **/

import { registry } from "@web/core/registry";
import { user } from "@web/core/user";
import { reactive } from "@odoo/owl";

/**
 * T4 Bookmark Service
 *
 * Manages user bookmarks stored in res.users.settings (t4_bookmarks field).
 * Bookmarks are actions the user can pin for quick access.
 */

export const t4BookmarkService = {
    dependencies: ["action", "hotkey"],

    start(env, { action: actionService, hotkey: hotkeyService }) {
        const state = reactive({
            bookmarks: [...(user.settings?.t4_bookmarks || [])],
        });

        function _save() {
            user.setUserSettings("t4_bookmarks", [...state.bookmarks]).catch(() => {});
        }

        function add(bookmark) {
            // Deduplicate by actionId
            if (state.bookmarks.some((b) => b.actionId === bookmark.actionId)) {
                return false;
            }
            state.bookmarks.unshift({
                actionId: bookmark.actionId,
                name: bookmark.name,
                appName: bookmark.appName || "",
                pinned: bookmark.pinned || false,
                timestamp: Date.now(),
            });
            _save();
            return true;
        }

        function remove(actionId) {
            const idx = state.bookmarks.findIndex((b) => b.actionId === actionId);
            if (idx >= 0) {
                state.bookmarks.splice(idx, 1);
                _save();
                return true;
            }
            return false;
        }

        function togglePin(actionId) {
            const bm = state.bookmarks.find((b) => b.actionId === actionId);
            if (bm) {
                bm.pinned = !bm.pinned;
                _save();
            }
        }

        function isBookmarked(actionId) {
            return state.bookmarks.some((b) => b.actionId === actionId);
        }

        function bookmarkCurrent() {
            const controller = actionService.currentController;
            if (!controller || !controller.action) return false;
            const act = controller.action;
            if (act.type !== "ir.actions.act_window" || !act.display_name) return false;
            return add({
                actionId: act.id || act.xml_id,
                name: act.display_name,
                appName: "",
            });
        }

        // Register Alt+K hotkey
        hotkeyService.add("alt+k", () => {
            bookmarkCurrent();
        }, { global: true });

        return {
            get bookmarks() {
                return state.bookmarks;
            },
            get pinnedBookmarks() {
                return state.bookmarks.filter((b) => b.pinned);
            },
            add,
            remove,
            togglePin,
            isBookmarked,
            bookmarkCurrent,
        };
    },
};

registry.category("services").add("t4_bookmarks", t4BookmarkService);
