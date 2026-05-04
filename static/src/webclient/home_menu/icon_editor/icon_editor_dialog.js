/** @odoo-module **/
import { Dialog } from '@web/core/dialog/dialog';
import { rpc } from '@web/core/network/rpc';
import { user } from '@web/core/user';
import { useService } from '@web/core/utils/hooks';
import { FileInput } from '@web/core/file_input/file_input';

import { Component, useState } from '@odoo/owl';

const BG_COLORS = [
    '#F06050', '#F4A460', '#F7CD1F', '#6CC1ED', '#814968',
    '#EB7E7F', '#2C8397', '#475577', '#D6145F', '#30C381',
    '#9365B8', '#FF0080', '#FF8A00', '#00B6CB', '#7C7BAD',
];

const ICON_COLORS = [
    '#FFFFFF', '#F4F5F8', '#000000', '#F06050', '#F4A460',
    '#F7CD1F', '#6CC1ED', '#814968', '#EB7E7F', '#2C8397',
    '#475577', '#D6145F', '#30C381', '#9365B8',
];

const ICON_CLASSES = [
    'fa fa-home', 'fa fa-star', 'fa fa-heart', 'fa fa-cog', 'fa fa-users',
    'fa fa-shopping-cart', 'fa fa-truck', 'fa fa-money', 'fa fa-bar-chart',
    'fa fa-calendar', 'fa fa-book', 'fa fa-wrench', 'fa fa-envelope',
    'fa fa-folder', 'fa fa-tasks', 'fa fa-briefcase', 'fa fa-graduation-cap',
    'fa fa-industry', 'fa fa-cube', 'fa fa-sitemap', 'fa fa-database',
    'fa fa-file-text', 'fa fa-comments', 'fa fa-rocket', 'fa fa-bullhorn',
    'fa fa-puzzle-piece', 'fa fa-paint-brush', 'fa fa-leaf', 'fa fa-globe',
    'fa fa-building', 'fa fa-medkit', 'fa fa-cutlery', 'fa fa-plane',
];

export class IconEditorDialog extends Component {
    static props = {
        editedAppData: Object,
        appId: Number,
        close: Function,
    };
    static template = 't4_theme.IconEditorDialog';
    static components = { Dialog, FileInput };

    setup() {
        this.menus = useService('menu');
        this.orm = useService('orm');
        this.notification = useService('notification');
        this.initialAppData = { ...this.props.editedAppData };
        this.editedAppData = useState({
            iconClass: 'fa fa-home',
            color: '#FFFFFF',
            backgroundColor: '#875A7B',
            ...this.props.editedAppData,
        });
        this.state = useState({
            activeTab: this.props.editedAppData.type || 'custom_icon',
        });
        this.bgColors = BG_COLORS;
        this.iconColors = ICON_COLORS;
        this.iconClasses = ICON_CLASSES;
        this.fileInputProps = {
            acceptedFileExtensions: 'image/png',
            resModel: 'res.users',
            resId: user.userId,
        };
    }

    onTabChange(tab) {
        this.state.activeTab = tab;
    }

    onBgColorClick(color) {
        this.editedAppData.backgroundColor = color;
        this.editedAppData.type = 'custom_icon';
    }

    onIconColorClick(color) {
        this.editedAppData.color = color;
        this.editedAppData.type = 'custom_icon';
    }

    onIconClassClick(iconClass) {
        this.editedAppData.iconClass = iconClass;
        this.editedAppData.type = 'custom_icon';
    }

    async onFileUploaded([file]) {
        if (!file) {
            return;
        }
        const res = await this.orm.read('ir.attachment', [file.id], ['datas']);
        Object.assign(this.editedAppData, {
            type: 'base64',
            uploaded_attachment_id: file.id,
            webIconData: 'data:image/png;base64,' + res[0].datas.replace(/\s/g, ''),
        });
        this.state.activeTab = 'base64';
    }

    async saveIcon() {
        const appId = this.props.appId;
        let iconValue;

        if (this.editedAppData.type === 'base64' && this.editedAppData.uploaded_attachment_id) {
            iconValue = this.editedAppData.uploaded_attachment_id;
        } else if (this.editedAppData.type === 'custom_icon') {
            const iconClass = this.editedAppData.iconClass || 'fa fa-home';
            const color = this.editedAppData.color || '#FFFFFF';
            const backgroundColor = this.editedAppData.backgroundColor || '#875A7B';
            iconValue = [iconClass, color, backgroundColor];
        }

        if (!iconValue) {
            this.props.close();
            return;
        }

        const result = await rpc('/t4_theme/edit_menu_icon', {
            icon: iconValue,
            menu_id: appId,
        });
        if (!result || !result.success) {
            this.notification.add(
                (result && result.error) || 'Lưu biểu tượng thất bại',
                { type: 'danger' },
            );
            return;
        }
        await this.menus.reload();
        this.props.close();
    }
}
