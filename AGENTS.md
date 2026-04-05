# t4_theme - Agent Guide

## Module Overview

Module giao diện Backend cho Odoo 19 Community. Cung cấp: thanh ứng dụng bên (AppBar), tùy chỉnh màu sắc theo công ty, dark mode, theme presets, typography, icon shapes, chatter/dialog tùy chỉnh, CSS inspector, debranding, URL rewrite.

## Recommended Agents

| Agent | Khi nào dùng |
|-------|-------------|
| `odoo-reviewer` | Review code Odoo: ORM, OWL, manifest, security |
| `odoo-debugger` | Debug lỗi runtime, template, asset bundle |
| `odoo-performance` | Tối ưu query, asset loading, SCSS compilation |
| `build-error-resolver` | Lỗi build JS/SCSS, asset bundle fail |
| `code-reviewer` | Review chất lượng code chung |
| `security-reviewer` | Kiểm tra CSRF, XSS, sudo(), access rights |

## Architecture Quick Reference

```
t4_theme/
├── models/           # Python models (res_company, res_users, theme_preset...)
├── controllers/      # HTTP controllers (home, session, url_rewrite, theme_editor)
├── views/            # XML views & actions
├── templates/        # QWeb templates (webclient, debranding, web_layout)
├── data/             # Theme preset data, demo data
├── security/         # ir.model.access.csv
├── static/src/
│   ├── appsbar/      # Sidebar AppBar component
│   ├── chatter/      # Chatter customization (side/bottom position)
│   ├── colors/       # SCSS color variables (light/dark)
│   ├── dark/         # Dark mode overrides
│   ├── dialog/       # Dialog customization (minimize/maximize)
│   ├── group/        # Expand/Collapse all groups
│   ├── refresh/      # View refresh button
│   ├── services/     # OWL services (theme_color, dark_mode, debranding, url_prefix)
│   ├── theme_editor/ # CSS Inspector & Builder Sidebar
│   ├── webclient/    # Home menu, navbar, theme systray, debranding
│   └── scss/         # Shared variables & mixins
└── tests/            # Python & JS unit tests
```

## Key Files

### Python (Backend)

| File | Chức năng |
|------|-----------|
| `models/res_company.py` | Fields giao diện per-company: colors, font, icon_shape, preset, branding |
| `models/res_config_settings.py` | Related fields cho Settings (hiện không dùng UI) |
| `models/res_users.py` | User preferences: sidebar_type, chatter_position, dialog_size |
| `models/res_users_settings.py` | User settings extension |
| `models/theme_preset.py` | CRUD theme presets (DB-backed) |
| `models/ir_http.py` | Session info injection (colors, preferences) |
| `controllers/home.py` | Home page controller |
| `controllers/session.py` | Session info endpoint |
| `controllers/url_rewrite.py` | URL prefix rewriting (/odoo/ → /app/) |
| `controllers/theme_editor.py` | CSS inspector save/load endpoints |

### JavaScript (Frontend - OWL)

| File | Chức năng |
|------|-----------|
| `services/theme_color_service.js` | Apply colors, font, icon shape vào CSS variables |
| `services/dark_mode_service.js` | Dark mode toggle via cookie |
| `services/debranding_service.js` | Replace "Odoo" branding |
| `services/url_prefix_service.js` | URL prefix client-side rewrite |
| `webclient/theme_systray/theme_systray.js` | Popup sidebar cài đặt giao diện (main UI) |
| `webclient/home_menu/home_menu.js` | Custom home menu with drag-and-drop |
| `webclient/home_menu/home_menu_service.js` | Home menu state management |
| `webclient/navbar/navbar.js` | Custom navbar |
| `theme_editor/css_inspector/` | Live CSS editing system |
| `appsbar/webclient/appsbar/appsbar.js` | Sidebar AppBar component |

## Data Flow

```
User → ThemeSystray (popup sidebar) → ORM write → res.company / res.users
                                    ↓
                              Live CSS preview (CSS variables trên <html>)
                                    ↓
                              Save → reload → theme_color_service apply từ session
```

## Development Notes

- Tất cả cấu hình giao diện quản lý qua **ThemeSystray** (popup sidebar bên phải), không qua Settings
- Colors lưu per-company trong `res.company`, preferences lưu per-user trong `res.users`
- Theme presets lưu trong model `t4_theme.preset` (DB-backed, import/export JSON)
- Icon shape apply qua CSS class `t4-icon-shape-{shape}` trên `<html>` element
- Font apply qua CSS variable `--t4-font-family`, load Google Fonts on-demand
- URL prefix rewrite dùng `ir.config_parameter` + global cache + routing map override
