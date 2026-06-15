# t4_theme — Module Branding / Giao diện Backend

Module theme/branding cho **Odoo 19 Community Edition**. Cung cấp giao diện mobile-friendly, dark mode, màu sắc per-company, theme presets, debranding, và URL rewrite. Không tương thích với `web_enterprise` (excludes).

---

## Dependencies & Excludes

```python
'depends': ['web', 'mail', 'bus', 'base_setup', 'base_automation']
'excludes': ['web_enterprise']
```

---

## Architecture — Config qua ThemeSystray Sidebar

**Toàn bộ cấu hình giao diện** nằm trong **ThemeSystray popup sidebar** (nút paint-brush trên navbar phải), KHÔNG qua `Settings`. File `views/res_config_settings.xml` cố tình rỗng.

Luồng dữ liệu:

```
User → ThemeSystray (popup sidebar bên phải)
  → ORM write → res.company (màu, font, icon, branding)
             → res.users (sidebar, chatter, dialog)
  → Live CSS preview (CSS variables trên <html>)
  → Save → reload → theme_color_service.js apply từ session_info
```

Session info được inject qua `ir.http.session_get_fields()` — controllers không cần query thêm.

---

## Models

### `res.company` — Cài đặt per-company (`models/res_company.py`)

| Field | Loại | Mục đích |
|-------|------|----------|
| `theme_preset` | Selection | Preset đang dùng (default/ocean/forest/sunset/slate) |
| `theme_color_brand` | Char | Brand color hex |
| `theme_color_primary` | Char | Primary color hex |
| `theme_color_success/info/warning/danger` | Char | Context colors |
| `theme_color_appbar_text/active/background` | Char | AppBar colors |
| `theme_color_appsmenu_text` | Char | Apps menu text |
| `theme_font_family` | Selection | Font (system/inter/roboto/...) |
| `theme_icon_shape` | Selection | Icon shape (rounded_rect/circle/square/squircle/hexagon) |
| `theme_home_menu_overlay` | Boolean | Home menu overlay |
| `t4_brand_name` | Char | Tên thương hiệu thay thế "Odoo" |
| `t4_web_title` | Char | Tiêu đề tab trình duyệt |
| `t4_url_prefix` | Char | URL prefix thay `/odoo/` |
| `appbar_image` | Binary | Logo sidebar |
| `background_image` | Binary | Ảnh nền home menu |
| `favicon` | Binary | Custom favicon |
| `theme_view_overrides` | Json | CSS inspector overrides |

### `res.users` — Preferences per-user (`models/res_users.py`)

| Field | Loại | Mục đích |
|-------|------|----------|
| `sidebar_type` | Selection | `large` / `invisible` |
| `chatter_position` | Selection | `side` / `bottom` |
| `dialog_size` | Selection | `minimize` / `maximize` |

### `res.users.settings` — Extension (`models/res_users_settings.py`)

Mở rộng `res.users.settings` với các related fields từ `res.users`.

### `t4_theme.preset` — Custom presets (`models/theme_preset.py`)

| Field | Loại | Mục đích |
|-------|------|----------|
| `name` | Char | Tên preset |
| `sequence` | Integer | Thứ tự hiển thị |
| `is_default` | Boolean | Preset built-in (không xóa được) |
| `color_brand/primary/success/info/warning/danger` | Char | Màu context |
| `color_appsmenu_text` | Char | Apps menu text |
| `color_appbar_text/active/background` | Char | AppBar colors |
| `font_family` | Char | Font family |

### `t4_theme.demo` & `t4_theme.demo.tag` (`models/t4_theme_demo.py`)

Model demo dùng để test giao diện list/form/kanban/search trong ThemeSystray.

### `t4.change.password.wizard` (`models/change_password_wizard.py`)

Wizard đổi mật khẩu có UI riêng (thay dialog mặc định Odoo).

### `ir.http` (`models/ir_http.py`)

Inject session_info: `theme_colors`, `sidebar_type`, `chatter_position`, `dialog_size`, `icon_shape`, `font_family`, `branding`, `url_prefix`.

### `ir.ui.menu` (`models/ir_ui_menu.py`)

Mở rộng menu: thêm icon tùy chỉnh, theme-specific overrides.

### `ir.actions.server` (`models/ir_actions_server.py`)

Mở rộng server actions để hỗ trợ theme-related automation.

### `res.config.settings` (`models/res_config_settings.py`)

Related fields kết nối Settings ↔ res.company. **UI bị vô hiệu hóa** — chỉ giữ để tương thích API.

---

## OWL Components (Frontend)

### Services (`static/src/services/`)

| File | Vai trò |
|------|---------|
| `theme_color_service.js` | Apply colors, font, icon shape vào CSS variables trên `<html>` |
| `dark_mode_service.js` | Toggle dark mode via cookie |
| `debranding_service.js` | Thay text "Odoo" bằng `t4_brand_name` |
| `url_prefix_service.js` | URL prefix client-side rewrite |

### Webclient (`static/src/webclient/`)

| File | Vai trò |
|------|---------|
| `theme_systray/theme_systray.js` | **Main UI** — popup sidebar cài đặt theme đầy đủ |
| `home_menu/home_menu.js` | Custom home menu (drag-and-drop apps) |
| `home_menu/home_menu_service.js` | State management home menu |
| `navbar/navbar.js` | Custom navbar |
| `debranding/` | QWeb templates debranding |

### AppBar (`static/src/appsbar/`)

| File | Vai trò |
|------|---------|
| `webclient/appsbar/appsbar.js` | Sidebar vertical app navigation |
| `webclient/menus/app_menu_service.js` | App menu state service |
| `webclient/webclient.js` | WebClient patch để gắn AppBar |

### Chatter (`static/src/chatter/`)

| File | Vai trò |
|------|---------|
| `chatter/chatter.js` | Patch chatter position (side/bottom) |
| `chatter/composer.js` | Composer customization |
| `chatter/store_service.js` | Store service patch |
| `views/form/form_compiler.js` | Form compiler patch |
| `views/form/form_renderer.js` | Form renderer (chatter layout) |
| `core/` | Shared chatter utilities |

### Dialog (`static/src/dialog/`)

| File | Vai trò |
|------|---------|
| `core/dialog/dialog.js` | Patch dialog: minimize/maximize fullscreen |
| `views/view_dialogs/select_create_dialog.js` | Patch select/create dialog |

### Group Expand/Collapse (`static/src/group/`)

Thêm nút "Expand All / Collapse All" cho list views có groupBy.

### View Refresh (`static/src/refresh/`)

| File | Vai trò |
|------|---------|
| `search/control_panel.js` | Thêm nút refresh vào control panel |
| `services/refresh_service.js` | Service quản lý auto-refresh |

### CSS Inspector / Theme Editor (`static/src/theme_editor/`)

| File | Vai trò |
|------|---------|
| `css_inspector/css_panel.js` | Panel hiển thị CSS properties |
| `css_inspector/builder_sidebar.js` | Sidebar builder với property groups |
| `css_inspector/theme_css_inspector.js` | Live CSS editing system |
| `css_inspector/property_group.js` | Nhóm thuộc tính CSS |
| `component_registry.js` | Registry đăng ký theme components |

### Views Extensions (`static/src/views/`)

| File | Vai trò |
|------|---------|
| `fields/image/image_field_patch.js` | Image field: upload-on-hover overlay |
| `x2many_grouped/x2many_grouped_adapter.js` | Client-side grouping cho x2many lists |
| `x2many_grouped/x2many_field_patch.js` | X2many field patch |
| `x2many_grouped/list_renderer_patch.js` | Row-number column cho x2many list |

---

## SCSS Layers

### `web._assets_primary_variables` (loaded earliest)

| File | Vai trò |
|------|---------|
| `dark/primary_variables.scss` | Dark mode base variables (before Odoo's) |
| `colors/scss/colors.scss` | Color base (prepend) |
| `colors/scss/colors_light.scss` | Light mode overrides |
| `appsbar/scss/variables.scss` | AppBar variables |
| `chatter/scss/variables.scss` | Chatter max-width overrides |
| `dialog/scss/variables.scss` | Dialog max-width overrides |
| `scss/colors.scss` | AppBar/AppMenu colors |
| `scss/variables.scss` | Theme variables chung |

### `web._assets_backend_helpers`

- `appsbar/scss/mixins.scss` — AppBar SCSS mixins

### `web.assets_backend` (runtime)

- `scss/_t4_variables.scss`, `scss/_t4_mixins.scss` — Shared variables/mixins
- `services/theme_colors.scss` — CSS variable definitions
- Tất cả JS/XML/SCSS của components (theo thứ tự trong manifest)

### Dark Mode Assets

| Bundle | Files |
|--------|-------|
| `web.assets_variables_dark` | `dark/primary_variables.dark.scss`, `dark/secondary_variables.dark.scss`, `dark/navbar.variables.dark.scss` |
| `web.assets_backend_helpers_dark` | `dark/bootstrap_overridden.dark.scss`, `dark/bs_functions_overrides.dark.scss` |
| `web.assets_web_dark` | include cả 2 bundles trên + `colors/scss/colors_dark.scss`, `appsbar/scss/variables.dark.scss`, home_menu dark, `dark/custom_styles.dark.scss` |

---

## Templates Patches

### `templates/web_layout.xml`

Override `web.layout` — inject CSS variables, favicon, custom title.

### `templates/webclient.xml`

Override `web.webclient` — thêm ThemeSystray, AppBar, custom navbar.

### `templates/debranding.xml`

Patch các template Odoo để thay thế "Odoo" branding bằng `t4_brand_name`.

---

## Theme Presets (`data/theme_preset_data.xml`)

5 preset built-in (`is_default=True`, `noupdate="1"`):

| ID | Tên | Brand color | Đặc trưng |
|----|-----|-------------|-----------|
| `preset_default` | Default | `#243742` | Dark slate + blue |
| `preset_ocean` | Ocean | `#0D4F8B` | Deep ocean blue |
| `preset_forest` | Forest | `#14532D` | Dark green |
| `preset_sunset` | Sunset | `#7C2D12` | Deep orange/red |
| `preset_slate` | Slate | `#1E293B` | Dark slate + indigo |

Sub-module có thể thêm preset riêng (vd: `t4_sti_hqg` thêm preset HQG Blue với sequence=2).

---

## Demo Module (`data/theme_demo_data.xml`)

- Tạo records demo cho `t4.theme.demo` và `t4.theme.demo.tag`
- Dùng để test rendering list/form/kanban trong ThemeSystray
- Demo Odoo data (base automations, server actions) trong `demo/base_automation.xml`, `demo/ir_actions_server.xml`

---

## Controllers (`controllers/`)

| File | Route | Mục đích |
|------|-------|----------|
| `home.py` | `/` | Home page |
| `session.py` | `/web/session/get_session_info` | Session info endpoint |
| `url_rewrite.py` | dynamic | URL prefix rewriting (`/odoo/` → `/app/` hoặc custom) |
| `theme_editor.py` | `/t4_theme/presets`, `/t4_theme/export_theme`, `/t4_theme/import_theme`, `/t4_theme/css_inspector/*`, `/t4_theme/preset/save_current` | CSS inspector + preset CRUD |

Tất cả JSON endpoints dùng `auth='user'` — CSRF built-in.

---

## Security (`security/ir.model.access.csv`)

| Model | User | Admin (group_system) |
|-------|------|----------------------|
| `t4.theme.demo` | CRUD | CRUD |
| `t4.theme.demo.tag` | CRUD | CRUD |
| `t4_theme.preset` | Read only | CRUD |
| `t4.change.password.wizard` | CRUD | CRUD |

`sudo()` dùng trong `res_company.write()` để cập nhật `ir.config_parameter` cho URL routing — có comment giải thích.

---

## Integration với Module Khác

- **`t4_sti`** — menu skeleton và security groups; `t4_theme` không phụ thuộc nhưng styling áp dụng cho toàn bộ UI
- **`t4_sti_hqg`** (planned) — override preset bằng cách tạo record `t4_theme.preset` với `sequence=2` trong `data/` riêng; có thể import preset JSON qua endpoint `/t4_theme/import_theme`
- Các module khác có thể dùng service `theme_color_service` để đọc CSS variables hiện tại

---

## Hooks (`__manifest__.py`)

```python
'post_init_hook': '_setup_module'    # Khởi tạo theme cho company hiện tại
'uninstall_hook': '_uninstall_cleanup'  # Dọn dẹp CSS overrides, config params
```

---

## Cập nhật 2026-06 — ThemeSystray: sao chép cấu hình + đổi tên OdooBot

3 tính năng thêm vào panel phải (ThemeSystray), gate `canEditCompanyTheme` (super admin):

- **Sao chép cấu hình công ty khác** — section mới: chọn công ty nguồn (`<select>`) →
  `res.company.t4_copy_theme_from(source_id)` copy `_THEME_COPY_FIELDS` (màu/font/icon/
  branding/images/layout) sang công ty hiện tại. **CỐ Ý bỏ `t4_url_prefix`** (global +
  rebuild assets trong `write()`). Ghi xong reload (pattern `onResetToOdoo`).
- **Đổi tên OdooBot** — field trong section Thương hiệu: `t4_get_odoobot_name()` /
  `t4_set_odoobot_name(name)` ghi `base.partner_root.name` (sudo, toàn hệ thống). Reload
  vì chatter cache tên author client-side.
- **Home Menu Overlay** — tách khỏi nhóm "Bố cục" ra `t4_section` riêng (dùng
  `t4_section_label` như Dark Mode) cho nổi bật, thay vì `small.text-muted` cũ.

JS: `theme_systray.js` thêm state `companies/copyFromId/copying/odoobotName`, load qua
`_loadThemeExtras()` (searchRead res.company + orm.call t4_get_odoobot_name).

## References

- Agent guide: `addons/t4_theme/AGENTS.md`
- Architecture diagram: `addons/t4_theme/docs/ARCHITECTURE.md`
- Odoo 19 migration rules: `addons/t4_sti/docs/INDEX.md` → CLAUDE.md project root
