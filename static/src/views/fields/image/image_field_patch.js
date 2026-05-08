/** @odoo-module **/

import { ImageField } from "@web/views/fields/image/image_field";
import { patch } from "@web/core/utils/patch";
import { onMounted, onPatched } from "@odoo/owl";

patch(ImageField.prototype, {
    setup() {
        super.setup(...arguments);
        this._boundOnMouseEnter = this._onMouseEnter.bind(this);
        this._boundOnMouseLeave = this._onMouseLeave.bind(this);
        onMounted(() => this._initUploadHint());
        onPatched(() => this._initUploadHint());
    },

    _getWrapper() {
        const el = this.__owl__.bdom?.el;
        if (!el) return null;
        return el.closest?.('.d-inline-block') || el.querySelector?.('.d-inline-block');
    },

    _initUploadHint() {
        if (this.props.readonly || this.fieldType === 'many2one') return;
        const wrapper = this._getWrapper();
        if (!wrapper) return;
        if (!wrapper.__t4HoverBound) {
            wrapper.__t4HoverBound = true;
            wrapper.addEventListener('mouseenter', this._boundOnMouseEnter);
            wrapper.addEventListener('mouseleave', this._boundOnMouseLeave);
        }
        this._resyncAfterImageLoad(wrapper);
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
        this._syncOverlaySizes(wrapper);
        const hint = wrapper.querySelector('.o_image_upload_hint');
        if (hint) {
            hint.style.opacity = '1';
            hint.style.pointerEvents = 'auto';
        }
    },

    _onMouseLeave() {
        const wrapper = this._getWrapper();
        if (!wrapper) return;
        const hint = wrapper.querySelector('.o_image_upload_hint');
        if (hint) {
            hint.style.opacity = '0';
            hint.style.pointerEvents = 'none';
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
