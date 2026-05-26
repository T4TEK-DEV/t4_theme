/** @odoo-module **/

import { ImageField } from "@web/views/fields/image/image_field";
import { patch } from "@web/core/utils/patch";
import { onMounted, onPatched, onWillUnmount } from "@odoo/owl";

patch(ImageField.prototype, {
    setup() {
        super.setup(...arguments);
        this._boundOnMouseEnter = this._onMouseEnter.bind(this);
        this._boundOnMouseLeave = this._onMouseLeave.bind(this);
        onMounted(() => this._initHover());
        onPatched(() => this._initHover());
        onWillUnmount(() => this._hideZoomPreview());
    },

    _getWrapper() {
        const el = this.__owl__.bdom?.el;
        if (!el) return null;
        return el.closest?.('.d-inline-block') || el.querySelector?.('.d-inline-block');
    },

    /**
     * Bind hover (mouseenter/mouseleave) cho mọi ImageField — zoom preview luôn
     * khả dụng. Upload hint chỉ active khi edit mode (xử lý trong _onMouseEnter).
     */
    _initHover() {
        const wrapper = this._getWrapper();
        if (!wrapper) return;
        if (!wrapper.__t4HoverBound) {
            wrapper.__t4HoverBound = true;
            wrapper.addEventListener('mouseenter', this._boundOnMouseEnter);
            wrapper.addEventListener('mouseleave', this._boundOnMouseLeave);
        }
        if (!this.props.readonly && this.fieldType !== 'many2one') {
            this._resyncAfterImageLoad(wrapper);
        }
    },

    _resyncAfterImageLoad(wrapper) {
        const img = wrapper.querySelector('img');
        if (!img) return;
        if (img.complete) {
            this._syncOverlaySizes(wrapper);
        } else {
            img.addEventListener('load', () => this._syncOverlaySizes(wrapper), { once: true });
        }
    },

    _syncOverlaySizes(wrapper) {
        const img = wrapper.querySelector('img');
        if (!img) return;
        const w = img.offsetWidth + 'px';
        const h = img.offsetHeight + 'px';
        const hint = wrapper.querySelector('.o_image_upload_hint');
        if (hint) {
            hint.style.width = w;
            hint.style.height = h;
        }
        const uploader = wrapper.querySelector('.o_image_uploader_container');
        if (uploader) {
            uploader.style.width = w;
            uploader.style.zIndex = '3';
        }
        const fieldWidget = wrapper.closest('.o_field_image');
        if (fieldWidget) {
            fieldWidget.style.width = 'fit-content';
        }
    },

    _onMouseEnter() {
        const wrapper = this._getWrapper();
        if (!wrapper) return;
        // Upload hint chỉ active edit mode
        if (!this.props.readonly && this.fieldType !== 'many2one') {
            this._syncOverlaySizes(wrapper);
            const hint = wrapper.querySelector('.o_image_upload_hint');
            if (hint) {
                hint.style.opacity = '1';
                hint.style.pointerEvents = 'auto';
            }
        }
        this._showZoomPreview(wrapper);
    },

    _onMouseLeave() {
        const wrapper = this._getWrapper();
        if (!wrapper) return;
        const hint = wrapper.querySelector('.o_image_upload_hint');
        if (hint) {
            hint.style.opacity = '0';
            hint.style.pointerEvents = 'none';
        }
        this._hideZoomPreview();
    },

    /**
     * Tạo popup floating bên cạnh ảnh nguồn, hiển thị ảnh ở kích thước lớn
     * (giới hạn 480x480, fit contain). Bỏ qua placeholder (chưa có ảnh).
     */
    _showZoomPreview(wrapper) {
        const img = wrapper.querySelector('img');
        if (!img || !img.src) return;
        // Bỏ qua khi src là placeholder (ảnh trống)
        if (/placeholder|\/web\/static\/img\//.test(img.src)) return;
        if (this._zoomPreviewEl) return;

        const preview = document.createElement('div');
        preview.className = 't4-image-zoom-preview';
        const previewImg = document.createElement('img');
        previewImg.src = img.src;
        previewImg.alt = '';
        preview.appendChild(previewImg);
        document.body.appendChild(preview);
        this._zoomPreviewEl = preview;

        // Reposition sau khi load để biết được kích thước thật
        const place = () => this._placeZoomPreview(wrapper);
        if (previewImg.complete) {
            place();
        } else {
            previewImg.addEventListener('load', place, { once: true });
            place();
        }
    },

    _placeZoomPreview(wrapper) {
        if (!this._zoomPreviewEl) return;
        const rect = wrapper.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const previewRect = this._zoomPreviewEl.getBoundingClientRect();
        const pw = previewRect.width || 480;
        const ph = previewRect.height || 480;

        // Mặc định: hiện bên TRÁI ảnh nguồn. Nếu không đủ chỗ → bên phải.
        let left = rect.left - pw - 16;
        if (left < 8) {
            left = rect.right + 16;
        }
        if (left + pw > vw - 8) {
            left = Math.max(8, vw - pw - 8);
        }
        let top = rect.top + rect.height / 2 - ph / 2;
        top = Math.max(8, Math.min(top, vh - ph - 8));

        this._zoomPreviewEl.style.left = left + 'px';
        this._zoomPreviewEl.style.top = top + 'px';
    },

    _hideZoomPreview() {
        if (this._zoomPreviewEl) {
            this._zoomPreviewEl.remove();
            this._zoomPreviewEl = null;
        }
    },

    get imgClass() {
        let classes = super.imgClass;
        if (!this.props.readonly && this.fieldType !== 'many2one') {
            classes += " cursor-pointer";
        }
        return classes;
    },

    onImageClick(ev) {
        if (!this.props.readonly && this.fieldType !== 'many2one') {
            const container = ev.currentTarget.closest('.d-inline-block');
            if (container) {
                const uploadBtn = container.querySelector('.o_select_file_button');
                if (uploadBtn) {
                    uploadBtn.click();
                }
            }
        }
    }
});
