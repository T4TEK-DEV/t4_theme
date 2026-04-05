# t4_theme - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ ThemeSystray │  │  Home Menu   │  │   CSS Inspector   │  │
│  │ (popup panel)│  │ (drag/drop)  │  │ (live editing)    │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│  ┌──────┴─────────────────┴────────────────────┴─────────┐  │
│  │              OWL Services Layer                       │  │
│  │  theme_color_service │ dark_mode │ debranding │ url   │  │
│  └──────────────────────┬────────────────────────────────┘  │
│                         │                                   │
│  ┌──────────────────────┴────────────────────────────────┐  │
│  │           CSS Variables / Classes on <html>           │  │
│  │  --t4-color-brand, --t4-font-family,                  │  │
│  │  .t4-icon-shape-*, .mk_sidebar_type_*                 │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ RPC / ORM
┌──────────────────────────┴──────────────────────────────────┐
│                     Odoo Server (Python)                     │
│                                                              │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ res.company│  │  res.users   │  │ t4_theme.preset     │  │
│  │ (colors,   │  │ (sidebar,   │  │ (custom presets,     │  │
│  │  font,     │  │  chatter,   │  │  import/export)      │  │
│  │  icon,     │  │  dialog)    │  │                      │  │
│  │  branding) │  │             │  │                      │  │
│  └────────────┘  └─────────────┘  └──────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   Controllers                          │  │
│  │  /t4_theme/presets  │  /t4_theme/export_theme          │  │
│  │  /t4_theme/import_theme  │  /t4_theme/css_inspector/*  │  │
│  │  /t4_theme/preset/save_current  │  url_rewrite         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              ir.http (session_info)                     │  │
│  │  Inject: theme_colors, sidebar_type, chatter_position, │  │
│  │          dialog_size, icon_shape, font, branding...     │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Module Structure

```
t4_theme/
├── __manifest__.py              # Module metadata, depends, assets
├── __init__.py                  # Import models, controllers
│
├── models/
│   ├── res_company.py           # Per-company theme settings (colors, font, icon_shape, branding)
│   ├── res_config_settings.py   # Related fields (Settings UI disabled)
│   ├── res_users.py             # Per-user layout preferences
│   ├── res_users_settings.py    # User settings extension
│   ├── ir_http.py               # Session info injection
│   ├── ir_ui_menu.py            # Menu customization
│   ├── ir_actions_server.py     # Server actions
│   ├── theme_preset.py          # Custom theme presets (DB model)
│   └── t4_theme_demo.py         # Demo data model
│
├── controllers/
│   ├── home.py                  # Home page
│   ├── session.py               # Session info endpoint
│   ├── url_rewrite.py           # URL prefix rewriting
│   └── theme_editor.py          # CSS inspector endpoints
│
├── views/
│   ├── res_config_settings.xml  # Settings (disabled - using sidebar)
│   ├── res_users.xml            # User preferences view
│   ├── theme_settings_action.xml # Client action
│   ├── ir_actions_server_views.xml
│   └── t4_theme_demo_views.xml
│
├── templates/
│   ├── web_layout.xml           # Web layout overrides
│   ├── webclient.xml            # Webclient template
│   └── debranding.xml           # Odoo branding removal
│
├── data/
│   ├── theme_preset_data.xml    # Default theme presets
│   └── theme_demo_data.xml      # Demo data
│
├── security/
│   └── ir.model.access.csv      # Access rights
│
├── static/src/
│   ├── services/                # OWL services
│   │   ├── theme_color_service.js   # Core: apply colors, font, icon shape
│   │   ├── dark_mode_service.js     # Dark mode toggle
│   │   ├── debranding_service.js    # Replace "Odoo" text
│   │   └── url_prefix_service.js    # URL rewrite client-side
│   │
│   ├── webclient/
│   │   ├── theme_systray/       # Main UI: popup sidebar panel
│   │   ├── home_menu/           # Custom home menu + icon shapes
│   │   ├── navbar/              # Custom navbar
│   │   └── debranding/          # Debranding templates
│   │
│   ├── appsbar/                 # Sidebar AppBar
│   ├── chatter/                 # Chatter position (side/bottom)
│   ├── dialog/                  # Dialog size (minimize/maximize)
│   ├── group/                   # Expand/Collapse all groups
│   ├── refresh/                 # View refresh button
│   ├── theme_editor/            # CSS Inspector + Builder Sidebar
│   ├── colors/                  # Color SCSS (light/dark)
│   ├── dark/                    # Dark mode SCSS overrides
│   └── scss/                    # Shared variables & mixins
│
└── tests/                       # Python + JS tests
```

## Data Model

### res.company (per-company settings)

| Field | Type | Purpose |
|-------|------|---------|
| `theme_preset` | Selection | Active preset (default/hqg/ocean/forest/sunset/slate) |
| `theme_color_brand` | Char | Brand color hex (#243742) |
| `theme_color_primary` | Char | Primary color hex |
| `theme_color_success/info/warning/danger` | Char | Context colors hex |
| `theme_color_appbar_*` | Char | AppBar colors (text, bg, active) |
| `theme_color_appsmenu_text` | Char | Apps menu text color |
| `theme_font_family` | Selection | Font family (system/inter/roboto/...) |
| `theme_icon_shape` | Selection | Icon shape (rounded_rect/circle/square/squircle/hexagon) |
| `theme_home_menu_overlay` | Boolean | Home menu overlay toggle |
| `t4_brand_name` | Char | Custom brand name (replaces "Odoo") |
| `t4_web_title` | Char | Browser tab title |
| `t4_url_prefix` | Char | URL prefix (replaces /odoo/) |
| `appbar_image` | Binary | Sidebar logo |
| `background_image` | Binary | Home menu background |
| `favicon` | Binary | Custom favicon |
| `theme_view_overrides` | Json | CSS inspector overrides |

### res.users (per-user preferences)

| Field | Type | Purpose |
|-------|------|---------|
| `sidebar_type` | Selection | Sidebar visibility (large/invisible) |
| `chatter_position` | Selection | Chatter placement (side/bottom) |
| `dialog_size` | Selection | Dialog mode (minimize/maximize) |

### t4_theme.preset (custom presets)

| Field | Type | Purpose |
|-------|------|---------|
| `name` | Char | Preset name |
| `color_*` | Char | All color values |
| `font_family` | Char | Font family |
| `is_default` | Boolean | Built-in preset flag |

## Feature Modules

### 1. ThemeSystray (Popup Sidebar)
- Entry point: systray button (paint-brush icon)
- Full theme configuration UI: presets, colors, font, icon shape, layout, branding
- Live CSS preview before saving
- Import/Export theme JSON
- Custom preset CRUD

### 2. Color System
- 10 configurable colors per company
- CSS variables injected on `<html>` via `theme_color_service.js`
- Light/dark mode variants via SCSS

### 3. Typography
- 30+ font options (Google Fonts + system)
- On-demand font loading
- Preview in font dropdown

### 4. Icon Shapes
- 5 shapes: rounded_rect, circle, square, squircle, hexagon
- Applied via CSS class on `<html>`: `t4-icon-shape-{shape}`
- Affects Home Menu + AppBar sidebar icons

### 5. AppBar (Sidebar)
- Vertical app navigation sidebar
- Toggle visibility (large/invisible)
- Custom logo support
- Per-company colors

### 6. Chatter Customization
- Position: side (beside form) or bottom (below form)
- Per-user preference

### 7. Dialog Customization
- Size: minimize (standard) or maximize (fullscreen)
- Per-user preference

### 8. Dark Mode
- Cookie-based toggle
- Full SCSS override layer
- Compatible with all theme colors

### 9. CSS Inspector (Theme Editor)
- Live CSS property editing
- Builder sidebar with property groups
- Overrides saved as JSON in `theme_view_overrides`

### 10. Debranding
- Replace "Odoo" with custom brand name
- Custom browser title
- Custom favicon
- URL prefix rewrite

## Asset Bundle Strategy

```
web._assets_primary_variables  → Color variables, dark mode base
web._assets_backend_helpers    → SCSS mixins
web.assets_variables_dark      → Dark mode variable overrides
web.assets_backend_helpers_dark → Dark mode helper overrides
web.assets_web_dark            → Dark mode styles
web.assets_backend             → All component JS/XML/SCSS
web.assets_unit_tests          → Test files
```

## Security

- `ir.model.access.csv` covers all custom models
- `sudo()` usage documented in `res_company.write()` for URL routing config
- JSON controller endpoints use `auth='user'`
- CSRF built-in for `type='json'` routes
