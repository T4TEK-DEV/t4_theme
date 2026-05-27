/** @odoo-module **/

import { registry } from "@web/core/registry";
import { _t } from "@web/core/l10n/translation";
import { imageUrl } from "@web/core/utils/urls";
import { CharField, charField } from "@web/views/fields/char/char_field";

import { Component, useRef, onWillUnmount } from "@odoo/owl";

/**
 * Widget hiển thị ảnh của CHÍNH record (vd. `image_128`) đứng trước giá trị Char,
 * mô phỏng cách `many2one_avatar` của Odoo gộp avatar + text vào 1 cột.
 *
 * Khác với `many2one_avatar`:
 *   - Áp dụng cho field **Char** (không phải many2one).
 *   - Ảnh lấy từ chính record qua `/web/image/<model>/<id>/<image_field>`,
 *     KHÔNG phải avatar của record liên quan.
 *
 * Compose `CharField` để giữ nguyên hành vi readonly/edit của field gốc
 * (giống cách `many2one_avatar` compose `Many2One`).
 *
 * Hover-zoom: di chuột vào avatar → popup floating hiển thị ảnh độ phân giải cao
 * (`zoom_field`), tái dùng style `.t4-image-zoom-preview` của `image_field_patch`.
 *
 * Options:
 *   image_field (str): field ảnh hiển thị trong cột. Mặc định `"image_128"`.
 *   size (int):        kích thước avatar (px). Bỏ trống → dùng `--Avatar-size` mặc định.
 *   zoom (bool):       bật/tắt hover-zoom. Mặc định `true`.
 *   zoom_field (str):  field ảnh dùng cho popup zoom. Mặc định `"image_1024"`.
 */
export class T4AvatarTextField extends Component {
    static template = "t4_theme.T4AvatarTextField";
    static components = { CharField };
    static props = {
        ...CharField.props,
        imageField: { type: String, optional: true },
        size: { type: Number, optional: true },
        enableZoom: { type: Boolean, optional: true },
        zoomField: { type: String, optional: true },
    };
    static defaultProps = {
        ...CharField.defaultProps,
        imageField: "image_128",
        enableZoom: true,
        zoomField: "image_1024",
    };

    setup() {
        this.avatarRef = useRef("avatar");
        onWillUnmount(() => this._hideZoom());
    }

    /**
     * Props chuyển tiếp cho CharField con. Phải strip mọi prop riêng của widget
     * này — OWL reject prop con không khai báo.
     * LƯU Ý: thêm prop mới vào `static props` thì nhớ strip ở đây.
     */
    get charProps() {
        const { imageField, size, enableZoom, zoomField, ...props } = this.props;
        return props;
    }

    get hasImage() {
        return Boolean(this.props.record.resId);
    }

    /** Record thực sự có ảnh hay không (gate hover-zoom — tránh zoom placeholder). */
    get hasRealImage() {
        return Boolean(this.props.record.data[this.props.imageField]);
    }

    get imageSrc() {
        return imageUrl(
            this.props.record.resModel,
            this.props.record.resId,
            this.props.imageField,
            { unique: this.props.record.data.write_date }
        );
    }

    get zoomSrc() {
        return imageUrl(
            this.props.record.resModel,
            this.props.record.resId,
            this.props.zoomField,
            { unique: this.props.record.data.write_date }
        );
    }

    get avatarStyle() {
        return this.props.size ? `--Avatar-size: ${this.props.size}px;` : "";
    }

    onMouseEnter() {
        if (!this.props.enableZoom || !this.hasRealImage) {
            return;
        }
        this._showZoom();
    }

    onMouseLeave() {
        this._hideZoom();
    }

    _showZoom() {
        if (this._zoomEl) {
            return;
        }
        const anchor = this.avatarRef.el;
        if (!anchor) {
            return;
        }
        const preview = document.createElement("div");
        preview.className = "t4-image-zoom-preview";
        const img = document.createElement("img");
        img.src = this.zoomSrc;
        img.alt = "";
        preview.appendChild(img);
        document.body.appendChild(preview);
        this._zoomEl = preview;

        // Reposition sau khi load để biết kích thước thật của ảnh.
        const place = () => this._placeZoom(anchor);
        if (img.complete) {
            place();
        } else {
            img.addEventListener("load", place, { once: true });
            place();
        }
    }

    _placeZoom(anchor) {
        if (!this._zoomEl) {
            return;
        }
        const rect = anchor.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const previewRect = this._zoomEl.getBoundingClientRect();
        const pw = previewRect.width || 480;
        const ph = previewRect.height || 480;

        // Mặc định hiện bên PHẢI avatar; không đủ chỗ → bên trái.
        let left = rect.right + 16;
        if (left + pw > vw - 8) {
            left = rect.left - pw - 16;
        }
        left = Math.max(8, Math.min(left, vw - pw - 8));
        let top = rect.top + rect.height / 2 - ph / 2;
        top = Math.max(8, Math.min(top, vh - ph - 8));

        this._zoomEl.style.left = `${left}px`;
        this._zoomEl.style.top = `${top}px`;
    }

    _hideZoom() {
        if (this._zoomEl) {
            this._zoomEl.remove();
            this._zoomEl = null;
        }
    }
}

export const t4AvatarTextField = {
    component: T4AvatarTextField,
    displayName: _t("T4 Avatar + Text"),
    supportedTypes: ["char"],
    // Function-style: nạp thêm field ảnh vào record.data để gate hover-zoom.
    fieldDependencies: (fieldNode) => {
        const imageField = (fieldNode.options && fieldNode.options.image_field) || "image_128";
        return [
            { name: "write_date", type: "datetime" },
            { name: imageField, type: "binary" },
        ];
    },
    supportedOptions: [
        {
            label: _t("Image field"),
            name: "image_field",
            type: "field",
            availableTypes: ["binary"],
        },
        {
            label: _t("Avatar size (px)"),
            name: "size",
            type: "number",
        },
        {
            label: _t("Enable zoom"),
            name: "zoom",
            type: "boolean",
        },
        {
            label: _t("Zoom image field"),
            name: "zoom_field",
            type: "field",
            availableTypes: ["binary"],
        },
    ],
    extractProps(staticInfo, dynamicInfo) {
        return {
            ...charField.extractProps(staticInfo, dynamicInfo),
            imageField: staticInfo.options.image_field,
            size: staticInfo.options.size,
            enableZoom: staticInfo.options.zoom,
            zoomField: staticInfo.options.zoom_field,
        };
    },
};

registry.category("fields").add("t4_avatar_text", t4AvatarTextField);
