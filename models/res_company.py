import re

from odoo import _, api, models, fields
from odoo.exceptions import ValidationError


THEME_PRESETS = {
    'default': {
        'theme_color_brand': '#243742',
        'theme_color_primary': '#5D8DA8',
        'theme_color_success': '#28A745',
        'theme_color_info': '#17A2B8',
        'theme_color_warning': '#FFAC00',
        'theme_color_danger': '#DC3545',
        'theme_color_appsmenu_text': '#F8F9FA',
        'theme_color_appbar_text': '#DEE2E6',
        'theme_color_appbar_active': '#5D8DA8',
        'theme_color_appbar_background': '#111827',
    },
    'hqg': {
        'theme_color_brand': '#173b77',
        'theme_color_primary': '#007ad1',
        'theme_color_success': '#62ab00',
        'theme_color_info': '#00aff2',
        'theme_color_warning': '#febd00',
        'theme_color_danger': '#e53935',
        'theme_color_appsmenu_text': '#FFFFFF',
        'theme_color_appbar_text': '#DEE2E6',
        'theme_color_appbar_active': '#007ad1',
        'theme_color_appbar_background': '#173b77',
    },
    'ocean': {
        'theme_color_brand': '#0D4F8B',
        'theme_color_primary': '#0EA5E9',
        'theme_color_success': '#10B981',
        'theme_color_info': '#06B6D4',
        'theme_color_warning': '#F59E0B',
        'theme_color_danger': '#EF4444',
        'theme_color_appsmenu_text': '#F0F9FF',
        'theme_color_appbar_text': '#BAE6FD',
        'theme_color_appbar_active': '#0EA5E9',
        'theme_color_appbar_background': '#0C4A6E',
    },
    'forest': {
        'theme_color_brand': '#14532D',
        'theme_color_primary': '#16A34A',
        'theme_color_success': '#22C55E',
        'theme_color_info': '#0891B2',
        'theme_color_warning': '#EAB308',
        'theme_color_danger': '#DC2626',
        'theme_color_appsmenu_text': '#F0FDF4',
        'theme_color_appbar_text': '#BBF7D0',
        'theme_color_appbar_active': '#16A34A',
        'theme_color_appbar_background': '#1A3A2A',
    },
    'sunset': {
        'theme_color_brand': '#7C2D12',
        'theme_color_primary': '#EA580C',
        'theme_color_success': '#16A34A',
        'theme_color_info': '#0284C7',
        'theme_color_warning': '#F59E0B',
        'theme_color_danger': '#DC2626',
        'theme_color_appsmenu_text': '#FFF7ED',
        'theme_color_appbar_text': '#FED7AA',
        'theme_color_appbar_active': '#EA580C',
        'theme_color_appbar_background': '#431407',
    },
    'slate': {
        'theme_color_brand': '#1E293B',
        'theme_color_primary': '#6366F1',
        'theme_color_success': '#22C55E',
        'theme_color_info': '#3B82F6',
        'theme_color_warning': '#F59E0B',
        'theme_color_danger': '#EF4444',
        'theme_color_appsmenu_text': '#F8FAFC',
        'theme_color_appbar_text': '#CBD5E1',
        'theme_color_appbar_active': '#6366F1',
        'theme_color_appbar_background': '#0F172A',
    },
}


_RE_HEX_COLOR = re.compile(r'^#[0-9A-Fa-f]{6}$')
_RE_URL_PREFIX = re.compile(r'^[a-zA-Z0-9_-]*$')

_THEME_COLOR_FIELDS = [
    'theme_color_brand',
    'theme_color_primary',
    'theme_color_success',
    'theme_color_info',
    'theme_color_warning',
    'theme_color_danger',
    'theme_color_appsmenu_text',
    'theme_color_appbar_text',
    'theme_color_appbar_active',
    'theme_color_appbar_background',
]


class ResCompany(models.Model):

    _inherit = 'res.company'

    #----------------------------------------------------------
    # Fields - Theme Preset
    #----------------------------------------------------------

    theme_preset = fields.Selection(
        selection=[
            ('default', 'Mặc định'),
            ('hqg', 'HQG Blue'),
            ('ocean', 'Ocean'),
            ('forest', 'Forest'),
            ('sunset', 'Sunset'),
            ('slate', 'Slate chuyên nghiệp'),
        ],
        string='Giao diện có sẵn',
        default='default',
    )

    #----------------------------------------------------------
    # Fields - Images
    #----------------------------------------------------------

    appbar_image = fields.Binary(
        string='Ảnh chân trang menu ứng dụng',
        attachment=True
    )

    favicon = fields.Binary(
        string='Favicon',
        attachment=True
    )

    t4_web_title = fields.Char(
        string='Tiêu đề trình duyệt',
        default='T4 ERP',
        help='Tiêu đề tab trình duyệt tùy chỉnh theo công ty.',
    )

    t4_brand_name = fields.Char(
        string='Tên thương hiệu',
        default='T4 ERP',
        help='Thay thế tên hệ thống mặc định bằng tên thương hiệu của bạn trên toàn bộ ứng dụng.',
    )

    t4_url_prefix = fields.Char(
        string='URL Prefix',
        default='',
        help='Tùy chỉnh đường dẫn địa chỉ mặc định. Để trống nếu muốn giữ nguyên đường dẫn gốc.',
    )

    #----------------------------------------------------------
    # Constraints
    #----------------------------------------------------------

    @api.constrains(*_THEME_COLOR_FIELDS)
    def _check_theme_colors(self):
        for company in self:
            for fname in _THEME_COLOR_FIELDS:
                value = company[fname]
                if value and not _RE_HEX_COLOR.match(value):
                    raise ValidationError(
                        _('Định dạng màu không hợp lệ cho %s: "%s". Sử dụng mã hex như #FF0000.')
                        % (fname, value)
                    )

    @api.constrains('t4_url_prefix')
    def _check_url_prefix(self):
        for company in self:
            prefix = company.t4_url_prefix or ''
            if prefix and not _RE_URL_PREFIX.match(prefix):
                raise ValidationError(
                    _('Tiền tố URL chỉ được chứa chữ cái, số, dấu gạch ngang và dấu gạch dưới.')
                )

    #----------------------------------------------------------
    # CRUD
    #----------------------------------------------------------

    def write(self, vals):
        if 't4_url_prefix' in vals:
            # sudo: read/write system parameters for URL routing config
            icp = self.env['ir.config_parameter'].sudo()
            # Save old prefix BEFORE write so routing_map() can keep old routes alive
            old = icp.get_param('t4_theme.url_prefix', '')
            icp.set_param('t4_theme.url_prefix_old', old)
        res = super().write(vals)
        if 't4_url_prefix' in vals:
            from ..controllers.url_rewrite import url_prefix
            # sudo: write system parameter for URL routing config
            icp = self.env['ir.config_parameter'].sudo()
            prefix = (vals['t4_url_prefix'] or '').strip().strip('/')
            icp.set_param('t4_theme.url_prefix', prefix)
            # Update global cache
            url_prefix[0] = prefix
            # Clear routing cache + regenerate assets
            self.env['ir.http'].env.registry.clear_cache('routing')
            # sudo: regenerate assets requires admin access
            self.env['ir.attachment'].sudo().regenerate_assets_bundles()
        return res

    background_image = fields.Binary(
        string='Ảnh nền menu ứng dụng',
        attachment=True
    )

    #----------------------------------------------------------
    # Fields - Brand Colors
    #----------------------------------------------------------

    theme_color_brand = fields.Char(
        string='Màu thương hiệu',
        default='#243742',
    )

    theme_color_primary = fields.Char(
        string='Màu chính',
        default='#5D8DA8',
    )

    #----------------------------------------------------------
    # Fields - Context Colors
    #----------------------------------------------------------

    theme_color_success = fields.Char(
        string='Màu Success',
        default='#28A745',
    )

    theme_color_info = fields.Char(
        string='Màu Info',
        default='#17A2B8',
    )

    theme_color_warning = fields.Char(
        string='Màu Warning',
        default='#FFAC00',
    )

    theme_color_danger = fields.Char(
        string='Màu Danger',
        default='#DC3545',
    )

    #----------------------------------------------------------
    # Fields - Typography
    #----------------------------------------------------------

    theme_font_family = fields.Selection(
        selection=[
            ('system', 'Mặc định hệ thống'),
            # Sans-serif
            ('inter', 'Inter'),
            ('roboto', 'Roboto'),
            ('open_sans', 'Open Sans'),
            ('lato', 'Lato'),
            ('nunito', 'Nunito'),
            ('poppins', 'Poppins'),
            ('source_sans', 'Source Sans 3'),
            ('montserrat', 'Montserrat'),
            ('raleway', 'Raleway'),
            ('ubuntu', 'Ubuntu'),
            ('work_sans', 'Work Sans'),
            ('dm_sans', 'DM Sans'),
            ('quicksand', 'Quicksand'),
            ('josefin_sans', 'Josefin Sans'),
            ('cabin', 'Cabin'),
            ('karla', 'Karla'),
            ('fira_sans', 'Fira Sans'),
            ('barlow', 'Barlow'),
            ('mulish', 'Mulish'),
            ('pt_sans', 'PT Sans'),
            ('noto_sans', 'Noto Sans'),
            ('ibm_plex', 'IBM Plex Sans'),
            ('manrope', 'Manrope'),
            ('space_grotesk', 'Space Grotesk'),
            ('plus_jakarta', 'Plus Jakarta Sans'),
            ('lexend', 'Lexend'),
            ('geist', 'Geist'),
            # Vietnamese popular
            ('be_vietnam_pro', 'Be Vietnam Pro'),
            ('sarabun', 'Sarabun'),
            # Serif
            ('times_new_roman', 'Times New Roman'),
            ('georgia', 'Georgia'),
            ('merriweather', 'Merriweather'),
            ('playfair', 'Playfair Display'),
            ('lora', 'Lora'),
            ('libre_baskerville', 'Libre Baskerville'),
            # Monospace
            ('courier_new', 'Courier New'),
            ('jetbrains_mono', 'JetBrains Mono'),
            ('fira_code', 'Fira Code'),
        ],
        string='Font Family',
        default='system',
    )


    theme_icon_shape = fields.Selection(
        selection=[
            ('rounded_rect', 'Rounded Rectangle'),
            ('circle', 'Circle'),
            ('square', 'Square'),
            ('squircle', 'iOS Squircle'),
            ('hexagon', 'Hexagon'),
        ],
        string='Hình dạng icon ứng dụng',
        default='rounded_rect',
    )

    theme_home_menu_overlay = fields.Boolean(
        string='Home Menu Overlay',
        default=True,
        help='Cho phép hiển thị hoặc ẩn màn hình menu chính toàn trang (có thể dùng phím ESC).',
    )

    #----------------------------------------------------------
    # Fields - AppsBar / Menu Colors
    #----------------------------------------------------------

    theme_color_appsmenu_text = fields.Char(
        string='Màu chữ menu ứng dụng',
        default='#F8F9FA',
    )

    theme_color_appbar_text = fields.Char(
        string='Màu chữ thanh bên',
        default='#DEE2E6',
    )

    theme_color_appbar_active = fields.Char(
        string='Màu đang chọn thanh bên',
        default='#5D8DA8',
    )

    theme_color_appbar_background = fields.Char(
        string='Màu nền thanh bên',
        default='#111827',
    )

    #----------------------------------------------------------
    # Actions
    #----------------------------------------------------------

    def action_apply_theme_preset(self):
        for company in self:
            preset = THEME_PRESETS.get(company.theme_preset, THEME_PRESETS['default'])
            company.write(preset)

    #----------------------------------------------------------
    # Fields - View Overrides
    #----------------------------------------------------------

    theme_view_overrides = fields.Json(
        string='View Theme Overrides',
        default=dict,
        help='Cấu hình hiển thị giao diện tùy chỉnh.',
    )
