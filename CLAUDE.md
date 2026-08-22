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

### T4 Filter Bar (`static/src/filter_bar/`, UX udoo-style 2026-07-07)

Hàng Ô LỌC PER-COLUMN dưới header của MỌI list view gốc (viewType='list' +
có searchModel — list x2many trong form KHÔNG có).

- **UX theo `udoo_web_filter_bar` (v17)** (`D:\workspaces\projects\odoo17\ym\
  addons\udoo_web_filter_bar` — adapt sang v19): mỗi cột hiện **CHỈ 1 ô GIÁ
  TRỊ inline** (value editor của `tree_editor`, tự đúng type) + nút **▾** mở
  **popover** (`column_filter_popover.js` — `T4ColumnFilterPopover`) chứa
  dropdown TOÁN TỬ + ô value + nút Xóa/Áp dụng. Gõ inline = lọc nhanh toán tử
  mặc định; ▾ = chọn `>`, `between`, `chứa`, `in range`… KHÔNG dùng cả
  DomainSelector (v19 service-based, subclass rất mong manh + memory
  [[reference_owl_template_primary_inherit_extension]]); popover tự dựng gọn
  = đúng preview user chọn.
- **KHÔNG tự chế widget**: value/operator editor lấy từ `@web/core/tree_editor`
  (`getValueEditorInfo(fd, op, {addBlankOption:true})`,
  `getOperatorEditorInfo(ops, fd)` → `{component, extractProps, isSupported,
  defaultValue, stringify}`), render qua sub-template TỰ CHỨA
  `t4_theme.FilterBarEditor` (`info.component` + `extractProps`; KHÔNG t-call
  template nội bộ core). Xem [[reference_odoo19_tree_editor_reusable]].
- **Toán tử curated per type** (`t4FbOperators`, `[0]`=default inline) —
  KHÔNG dùng thẳng core `getDomainDisplayedOperators` vì: v19 m2o KHÔNG có
  `=` (chỉ in/not in) → curated thêm `=` cho record-picker đơn; date default
  core = "in range" → curated đổi `=` (ô date đơn inline, range/between để
  popover); text default `ilike` (chứa). Build domain:
  `condition(name, op, val, negate)` → `domainFromTree()` (tự eliminate
  between/in range/starts with) → `new Domain`.
- **boolean XỬ LÝ RIÊNG**: v19 core boolean chỉ có `set`/`not set` (không
  true/false, không value editor). → render `<select>` Tất cả/Có/Không
  (`t4FbSetBoolean`): Có→`set` (`!=False`=True), Không→`not set` (`=False`).
- **State per-column** (reactive `t4Fb.cols[name] = {operator, negate, value,
  touched}`): `t4FbState` đọc transient nếu chưa động (KHÔNG ghi reactive
  trong render); `_t4FbEnsure` ghi store trong event handler. Popover giữ
  `draft` reactive RIÊNG (tự re-render khi đổi toán tử → đổi ô value), mỗi
  thay đổi `commit()` về renderer (`t4FbCommit`) áp live → inline + popover
  đồng bộ. `touched=false` → chưa áp filter (tránh default auto-lọc); chỉ
  áp khi `fromValueEdit` hoặc toán tử `set/not set` (noValueOp). Empty value:
  text/số='', date/selection/boolean=false, m2o `=`=false / `in`=[].
- **Cơ chế apply**: mỗi cột = 1 FACET (`createNewFilters` — groupId track
  `t4FbGroupIds`); đổi giá trị → `deactivateGroup` cũ (blockNotification →
  reload 1 lần) + tạo mới; gỡ facet trên search bar → cột reset (listen
  'update' searchModel). Nhãn facet = "Cột: toán tử giá trị" (field quan hệ
  + toán tử id bỏ phần value vì editor chỉ giữ id).
- **Toggle**: nút phễu control panel cạnh refresh (`control_panel_patch.js`);
  nhớ per-action localStorage (`t4_filter_bar:<actionId>`), sync env.bus
  `T4-FILTER-BAR:TOGGLE`.
- Field `searchable=False` / widget handle / không có toán tử → icon ⚠.
- Files: `column_filter_popover.js/.xml` (popover) + `list_renderer_patch.js/
  .xml` (hàng lọc) + `filter_bar.scss`. Manifest khai popover TRƯỚC
  list_renderer_patch (import `@t4_theme/filter_bar/column_filter_popover`);
  list_renderer_patch.xml 'after' `web/.../list_renderer.xml`.
- **CHƯA browser-verify** (hoot skip: thiếu Chrome; bundle build sạch
  server-side HTTP 200). Cần kiểm tay: toggle; ô inline từng type (m2o chọn
  record, date, số, selection blank); ▾ popover đổi toán tử (>, between,
  chứa) + Xóa/Áp dụng; boolean select; xóa facet × → ô reset; đổi popover
  giữa các cột (không lẫn state); đổi trang/action; cột hẹp không vỡ.

### Search Panel Date Range (`static/src/search/search_panel_date_range/`, 2026-07-03)

Loại section MỚI **"Từ ngày / Đến ngày"** cho search panel — Odoo gốc chỉ có
section category/filter, KHÔNG có chọn khoảng thời gian. Generic, tái dùng
được. Khai báo **NGAY TRONG SEARCH VIEW** như field searchpanel thường
(arch-based — redesign theo feedback user, thay bản context-based đầu bị bug
không hiện panel vì `display.searchPanel` được core tính bên trong
`super.load()` trước khi patch đọc config):

```xml
<searchpanel>
    <field name="report_date" widget="t4_date_range"
           string="Kỳ Báo Cáo" icon="fa-calendar"
           context="{'default_from': 'month_start', 'default_to': 'today'}"/>
</searchpanel>
```

- `widget="t4_date_range"` đánh dấu section; defaults khai trong `context`
  (`'month_start'|'today'|'YYYY-MM-DD'|bỏ`) vì RNG search view chỉ cho attr
  chuẩn (widget/string/icon/color/context được phép; `default_from` attr
  riêng thì KHÔNG).
- **Parser**: patch `SearchArchParser.visitSearchPanel` — TÁCH node
  widget=t4_date_range ra TRƯỚC khi core parse (core sẽ coi là category →
  RPC `search_panel_select_range` nổ với field date), UNSHIFT section
  `{type:'t4_date_range', fieldName, from, to, values: new Map()}` lên đầu
  (from/to = ISO string). **`values: new Map()` BẮT BUỘC**:
  `SearchModel.exportState/_importState` serialize `section.values` cho MỌI
  section — thiếu → crash "map is not iterable" khi rời view (bug
  2026-07-03 lần 2).
- **SearchModel**: `getSections` ép `empty=false` cho type này (core
  `hasValues` không biết → bị lọc mất); **AND date-range vào `_getDomain`**
  (KHÔNG phải `_getSearchPanelDomain`) → leaves có mặt cả trong
  `searchDomain` (withSearchPanel:false) dùng fetch values/counters của
  section khác ⇒ đổi kỳ → `searchDomainChanged` → values section filter
  (vd Sản Phẩm select=multi) refetch THEO KỲ; `t4SetSectionDateRange`
  (guard giá trị không đổi) → `_notify()` → view reload. Arch có section →
  core tự hiện panel.
- **SearchPanel** + template extension: chèn nhánh `t-if type==='t4_date_range'`
  vào ĐẦU chuỗi if/elif/else của **`web.SearchPanel.Section`** (đổi t-if
  category gốc → t-elif) — render 2 `DateTimeInput` (datepicker chuẩn Odoo).
  **PHẢI vá Section** (resolve RUNTIME qua `callTemplate` → mọi caller
  Content/Regular/Small đều nhận), KHÔNG vá `web.SearchPanelContent`:
  `web.SearchPanel.Regular` là `t-inherit-mode="primary"` của Content,
  extension trên Content KHÔNG lan sang Regular → section rơi nhánh else
  (FiltersGroup) crash `values.keys()` undefined (bug OwlError 2026-07-03).
- Model thường = filter khoảng ngày trên field đó; model báo cáo tiêu thụ
  leaf trong `_search` để TÍNH LẠI dữ liệu theo kỳ (xem t4_sti Báo Cáo XNT
  v1.0.168/169).

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

## Cập nhật 2026-07 — Lazy-load dữ liệu panel ThemeSystray

`_loadPresets()` + `_loadThemeExtras()` KHÔNG còn gọi trong `setup()` (trước đây tốn
3 RPC mỗi lần reload trang dù chưa mở sidebar). Giờ fetch lần đầu trong `togglePanel()`
(guard `_extrasLoaded`); `_loadThemeExtras()` chỉ gọi khi `canEditCompanyTheme`
(super admin — user thường không thấy section copy công ty / OdooBot).
Lưu ý khi thêm entry point mở panel mới: phải đi qua `togglePanel()` (hoặc tự trigger
lazy-load), không set `state.open = true` trực tiếp.

## Cập nhật 2026-07-26 — PERF nút "Mở tất cả / Thu gọn" trên list nhiều nhóm

Triệu chứng (user báo trên POC02, list `t4_sti.view_t4_product_template_list`
group 2 cấp `level_1`/`level_2`): mở/đóng nhóm lâu; mở hết rồi thì bấm nút gì
cũng lag, scroll giật.

**Đo trên chính POC02** (3.459 SP, 4 nhóm cấp 1 → 46 nhóm cấp 2; DB đã
`jit=off` sẵn — KHÔNG phải [[project_pg_jit_slow_search]]): server chỉ chiếm
**0,57s** cho lần `web_read_group` mở hết (payload 724KB, 1.482 record) và
**0,06s** cho thu gọn; aggregate `qty_available:sum` (override
`product_template._read_group_select`) chỉ tốn ~0,06s → KHÔNG đáng sửa. Phần
còn lại là **client dựng/xóa 1.482 dòng DOM** (list view Odoo không có virtual
scroll). 3 sửa đổi:

- **`group/search/control_panel/control_panel.js` — bỏ 1 lần load NẶNG vô ích.**
  `_t4ExpandToLevel(Infinity)` dừng theo "số cấp không tăng" (`_t4CountLevels`)
  nên khi các cấp trên đã mở sẵn (`expand_level=1` là mặc định của action),
  load ĐẦU TIÊN đã kéo về đủ record nhưng vòng lặp vẫn load LẦN HAI chỉ để
  thấy điều đó → fetch + dựng lại toàn bộ record lần nữa. Nhánh Infinity giờ
  dừng theo **`!_t4HasFoldedGroups(config)`** — chính xác tuyệt đối vì core ghi
  lại `groupConfig.isFolded = !('__records' in groupData)` từ phản hồi server
  sau MỖI load (`relational_model.js::_loadGroupedList`), tức "không còn nhóm
  folded" = server đã xác nhận mọi nhóm có record. Cùng vị từ với getter
  `t4IsFullyExpanded` → vòng lặp dừng đúng lúc nhãn nút đổi sang "Thu gọn".
  Số load: 1 (cấp con đã có sẵn) / 2 (cấp con chưa vật thể hóa — tối thiểu),
  trước đây luôn +1. Nhánh maxLevel HỮU HẠN giữ nguyên logic đếm cấp (mark chủ
  động fold các cấp sâu nên "còn nhóm folded" là trạng thái mong muốn, không
  dùng làm điều kiện dừng được).
- **`control_panel.js` — giới hạn số dòng mỗi nhóm khi "Mở tất cả"**:
  `_t4SetRecordLimit(N, config)` set `g.list.limit` cho nhóm CẤP CUỐI
  (`g.list.groupBy.length === 0` — KHÔNG đếm depth: với nhóm chưa mở thì `limit`
  trong `opening_info` là giới hạn số SUB-NHÓM ở `_open_groups` server, đặt
  nhầm sẽ ẩn mất nhóm con). Mặc định `T4_EXPAND_ALL_GROUP_LIMIT = 20`, override
  bằng context `expand_all_group_limit`. POC02: 1.482 → 604 dòng. Nhóm còn dòng
  chưa hiện vẫn có pager riêng của Odoo (`showGroupPager` = `limit < count`).
  `_t4CollapseToLevel` trả `limit` về `model.initialLimit` (80) để user mở LẺ
  từng nhóm sau đó vẫn thấy đủ dòng như bình thường. `limit` đã set SỐNG SÓT
  qua `load()` (`_getNextConfig` shallow-copy, chỉ `delete config.groups` khi
  ĐỔI groupBy) → đổi filter/domain trong lúc đang mở hết vẫn giữ 20 dòng/nhóm
  đồng nhất (không có tình trạng lẫn 20/80); đổi tiêu chí group thì config
  nhóm dựng lại từ đầu = 80 như mặc định.
- **`views/fields/avatar_text/avatar_text.{js,xml}` — không bắn request ảnh cho
  record không có ảnh.** `hasImage` (= có `resId`) chỉ còn quyết định CÓ Ô
  avatar (giữ text thẳng hàng); `<img src="/web/image/...">` giờ gate bằng
  `hasRealImage` (`record.data[imageField]`, đã có sẵn qua `fieldDependencies`),
  không có ảnh thì render `<span class="o_avatar_empty o_m2o_avatar_empty"/>`
  (đúng pattern core `many2one_avatar_field.xml`; sizing từ
  `web/core/avatar/avatar.scss` nên giữ nguyên chiều rộng ô, `avatar_text.scss`
  thêm selector cho bo góc 4px). POC02 **0/3.459 SP có ảnh**
  → trước đây mở hết nhóm là ~1.5k request ảnh chỉ để nhận placeholder, lazy
  load bắn dần theo scroll → chính là nguồn giật khi scroll.
- **`views/x2many_grouped/list_renderer_patch.js` — bỏ DOM walk trên list view
  top-level.** `applyTreeAttrs` (chạy trong `onRendered` → mọi render) xóa/ghi
  `data-t4-depth/-last/-first` trên MỌI `tr` của bảng. Toàn bộ SCSS tree-indent
  lại scope dưới `.o_field_x2many_list` (x2many trong form) → với list view
  thường nó là vô ích 100%: 1.5k dòng ⇒ ~4,6k attribute mutation + invalidate
  style cả bảng mỗi lần render. Thêm guard `env.config?.viewType === 'list'` →
  return sớm. Nhánh x2many giữ nguyên hành vi cũ (kể cả việc clear attribute
  tĩnh do template inheritance đặt — x2many grouped không dùng tree depth vẫn
  cần clear để `[data-t4-depth] > th.o_group_name > div { transform: none }`
  không áp oan).

CHƯA browser-verify (máy dev không có Chrome cho hoot; runtime bị session khác
giữ lock lúc sửa). Cần kiểm tay: nút Mở tất cả/Thu gọn (nhãn + số dòng/nhóm +
pager trong group header), avatar SP CÓ ảnh vẫn hiện + hover-zoom, x2many
grouped trong form (Phiếu Lắp) indent không đổi.

## Cập nhật 2026-08-01 — Tên user trên navbar: luôn hiện (không cần bật debug)

`static/src/webclient/user_menu/user_menu.xml` (mới — glob
`t4_theme/static/src/webclient/**/*.xml` tự nạp, KHÔNG cần sửa manifest).
Chỉ 1 file XML, **KHÔNG override CSS**: bố cục giữ nguyên như Odoo gốc — tên
nằm BÊN PHẢI avatar.

- `t-inherit="web.UserMenu"` mode extension, 2 xpath:
  - `//small[hasclass('oe_topbar_name')]` position="attributes" — giữ y class
    gốc (`d-none ms-2 text-start smaller lh-1 text-truncate`), THÊM cố định
    `d-lg-inline-block` và XÓA `t-att-class` (đặt `<attribute name="x"/>` rỗng
    = remove, đúng cho cả bản Python `template_inheritance.py` lẫn bản JS
    `web/core/template_inheritance.js`). Odoo gốc chỉ hiện tên khi bật debug
    (`t-att-class="{'d-lg-inline-block': env.debug}"`) → giờ luôn hiện từ
    breakpoint **lg** trở lên (dưới lg vẫn chỉ avatar — `.o_user_menu` gốc đã
    `d-none d-md-block`).
  - `//small[...]/mark` — thêm `t-if="env.debug"` để dòng tên **database** vẫn
    CHỈ hiện khi bật debug (giữ hành vi cũ).
- **`user_menu.scss`** (thêm lại 2026-08-01, theo yêu cầu user "màu nhạt hơn
  so với bật debug"): `.o_main_navbar .o_user_menu .oe_topbar_name` →
  `color: var(--NavBar-entry-color--hover, #fff)` + `font-weight: 500`.
  Lý do: `<small>` kế thừa `--NavBar-entry-color` (core `rgba($o-white, .9)`)
  nên trông nhạt; biến `--hover` là bản đục 100% và vẫn theo màu theme công ty
  (`services/theme_colors.scss:46-47`). **KHÔNG có rule nào phụ thuộc debug** —
  Odoo có `body.o_debug` (`web/static/src/start.js:52`) nhưng không SCSS nào
  dùng; cảm giác "đậm hơn khi bật debug" là do chip `<mark>` nền vàng của dòng
  tên DB tương phản mạnh, không phải màu chữ đổi.
- Bản đầu (commit `b0bb946`/`1a85728`) từng xếp DỌC (tên dưới avatar) bằng
  `user_menu.scss` — user yêu cầu bỏ, đã `git rm` file SCSS. Nếu sau này cần
  xếp dọc lại: ngân sách chiều cao là **đúng 46px** (`$o-navbar-padding-v: 0`,
  button `py-lg-0`, `.dropdown-toggle` nhận `%-main-navbar-entry-base` height
  cố định), phải prefix `.o_main_navbar` để thắng `line-height: 46px` của
  `%-main-navbar-entry-spacing`, và `mark` cần `padding: 0` (Bootstrap reboot
  cho `mark` `.1875em`) — xem lịch sử git 2 commit đó.
- Lưu ý chung: template `t-inherit-mode="extension"` được apply **CLIENT-SIDE**
  (`registerTemplateExtension` trong `assetsbundle.py::generate_xml_bundle`)
  → xpath sai KHÔNG nổ lúc `-u module`, chỉ nổ trong console trình duyệt.
  Upgrade sạch KHÔNG chứng minh xpath đúng.
- Verify: script offline chạy `apply_inheritance_specs` trên chuỗi (core →
  mail `user_menu_patch.xml` → patch này) xác nhận 2 xpath match + markup ra
  đúng mong đợi; build bundle qua `odoo shell`
  (`env['ir.qweb']._get_asset_bundle('web.assets_backend').generate_xml_bundle()`)
  có `registerTemplateExtension("web.UserMenu", "/t4_theme/.../user_menu.xml")`.
  **CHƯA browser-verify** (máy dev không có Chrome). Cần kiểm tay: tắt debug →
  hiện tên bên phải avatar, KHÔNG có dòng DB; bật debug → thêm dòng DB như cũ;
  màn hình < lg → chỉ avatar.

## Cập nhật 2026-08-21 — Cột STT không được chèn vào renderer có template riêng

Triệu chứng user báo: form Working Hours (`resource.calendar`, field
`attendance_ids` `widget="section_one2many"` — dùng ở
`SEM-backend/sem_extra/views/resource_calendar_attendance_views.xml`) bị **lệch
cột**: header có `STT` nhưng dòng dữ liệu thiếu 1 ô ⇒ mọi cột dữ liệu trượt
sang trái 1 nhịp, cột Name bị bóp còn 1 ký tự.

**Nguyên nhân — cơ chế `t-inherit-mode="primary"` của Odoo**, ở
`web/static/src/core/templates.js::_getTemplate`:

```js
const parentTemplate = _getTemplate(inheritFrom, blockId || info[name].blockId);
...
for (const otherBlockId in templateExtensions[name] || {}) {
    if (blockId && otherBlockId > blockId) { break; }
```

Template `primary` **chụp bản sao template cha TẠI VỊ TRÍ nó nằm trong
bundle**; mọi extension đăng ký với `blockId` lớn hơn bị `break` bỏ qua.
`resource.SectionListRenderer.RecordRow` (core, nạp trước `t4_theme`) vì thế
**không có** nhánh `<td>` STT, trong khi header lấy từ `web.ListRenderer` —
được request với `blockId=null` nên ăn đủ extension — **vẫn có** `<th>` STT.

Chiều ngược lại cũng có thật: `hr_skills.SkillsListRenderer` là bản sao primary
của `web.ListRenderer` (mất `<th>`) nhưng dùng `recordRowTemplate` mặc định
(còn `<td>`) — widget `skills_one2many` + `resume_one2many` đang dùng ở
`SEM-backend/SEM/views/hr_resume_line_views.xml`.

**Vì sao không thể chặn theo tên class/template**: `t4_sti.T4MovesListRenderer.RecordRow`
(phiếu kho) cũng là bản sao primary **nhưng LẠI có STT** — do `t4_sti` depends
`t4_theme` nên nạp SAU. Guard kiểu `recordRowTemplate === "web.ListRenderer.RecordRow"`
sẽ âm thầm làm mất cột STT trên form phiếu kho.

**blockId đo thực tế** trên bundle `web.assets_backend` của DB `t4_sti`
(mô phỏng đúng bộ đếm của `templates.js`: `blockId++` mỗi khi `blockType` lật
giữa `templates`/`extensions`; tổng 97 block). `list_renderer_stt.xml` =
**blockId 82**:

| Template primary | blockId | Có ô STT? |
|---|---|---|
| `resource.SectionListRenderer.RecordRow` | 45 | ✗ `<td>` |
| `hr_skills.SkillsListRenderer` (header) | 59 | ✗ `<th>` |
| `hr_skills.ResumeListRenderer.RecordRow` | 59 | ✗ `<td>` |
| `account.SectionAndNoteListRenderer` (+`.RecordRow`) | 63 | ✗ cả hai |
| `sale.ListRenderer.RecordRow` | 63 | ✗ `<td>` |
| **`t4_sti.T4MovesListRenderer.RecordRow`** | **89** | **✓ `<td>`** |

Không có cặp nào trùng blockId với 82 nên không rơi vào biên `>` (bằng nhau
thì extension VẪN áp dụng — `if (blockId && otherBlockId > blockId) break`).
Lưu ý `t4_theme` còn 1 extension khác trên `web.ListRenderer` ở blockId 6
(`filter_bar/list_renderer_patch.xml`) — không liên quan STT.

**Cách sửa** (`views/x2many_grouped/`):
- `list_renderer_stt.xml` — gắn marker `data-t4-stt="1"` lên cả `<th>` và `<td>`
  STT. Dùng **attribute** chứ không dùng class: trong XML document, `class`
  không phải thuộc tính đặc biệt nên selector `[class~="..."]` không đáng tin
  trên DOM template đã parse.
- `x2many_field_patch.js` — getter mới `t4RendererSupportsRowNumber`: gọi
  `getTemplate()` (`@web/core/templates`) cho **cả** `Renderer.template` và
  `Renderer.recordRowTemplate`, tìm `[data-t4-stt]`. Chỉ khi CẢ HAI đều có mới
  set prop `t4WithRowNumber`. Kết quả cache theo cặp tên template.
  `getTemplate` trả `null` khi tên chưa đăng ký và **ném** khi template cha
  không tồn tại → `try/catch`, cả hai quy về "không hỗ trợ": mất cột STT còn
  hơn vỡ bảng.

Getter này **khác vai trò** với `t4RendererAcceptsRowNumber` có sẵn — cái kia
chặn CRASH (renderer clone `static props` nên OWL từ chối prop lạ, vd
`SectionAndNoteListRenderer` của account), cái này chặn LỆCH CỘT. Đừng gộp.

### Bật lại STT cho widget core (user chốt giữ cột — 2026-08-21)

Getter dò marker khiến việc bật lại STT chỉ còn là **đăng ký thêm extension cho
đúng tên template primary** — đặt marker vào là tự bật, không phải sửa JS. Đã
làm cho 2 widget, kèm phần bù đi theo:

| Widget | Template thêm | Ghi chú |
|---|---|---|
| `section_one2many` | `resource.SectionListRenderer.RecordRow` (`<td>`) | header lấy từ `web.ListRenderer` nên đã có `<th>` |
| `skills_one2many` | `hr_skills.SkillsListRenderer` (`<th>`) | dòng dùng `web.ListRenderer.RecordRow` mặc định nên đã có `<td>` |
| | `hr_skills.SkillsListRenderer.Rows` | `colspan` header nhóm + `t-set list` |

Hai chỉnh sửa đi kèm cho bảng kỹ năng, **đừng gỡ**:
- `colspan` của dòng tiêu đề nhóm lấy từ getter `colspan` =
  `allColumns.length` (+1 nếu editable) — `allColumns` là cột khai trong
  **arch**, KHÔNG gồm cột STT ảo (chèn ở `getActiveColumns`) ⇒ thiếu 1 ô. Cộng
  bù bằng `t-att-colspan="colspan + (props.t4WithRowNumber ? 1 : 0)"` thay vì
  patch class `CommonSkillsListRenderer` — import class đó buộc `t4_theme` phụ
  thuộc `hr_skills`.
- `t-set list` = `skill_group[1].list`: template Rows của hr_skills không đặt
  biến `list`, mà `t4GetRowNumber` đọc `list.records`. Không có thì rơi về
  nhánh dự phòng (`props.list` phẳng) ⇒ STT chạy liên tục xuyên nhóm thay vì
  đếm lại từ 1 mỗi nhóm.

**KHÔNG làm cho `resume_one2many`** — có chủ ý, không phải bỏ sót.
`hr_skills.ResumeListRenderer.RecordRow` **REPLACE nguyên** vòng
`t-foreach="getColumns(record)"` bằng 2 `<td>` viết tay (chấm tròn timeline +
thẻ nội dung), và thead bị REPLACE bằng 3 `<th>` cố định (32px / w-100 / 32px).
Đó là dải thời gian hồ sơ CV, không phải bảng dữ liệu — không còn mô hình cột
để chèn STT vào.

`purchase_requisition` alt-POs cùng dạng bệnh nhưng module chưa cài ở env nào
nên chưa thêm (thêm thì không verify được).

Còn lại vẫn **không có cột STT** (nhóm `account`
`section_and_note_one2many` — dòng SO/PO/hóa đơn): renderer đó clone
`static props` nên OWL từ chối prop lạ ⇒ thêm STT là **crash**, không phải
lệch cột. Đó là việc khác hẳn, `t4RendererAcceptsRowNumber` vẫn chặn.

**CHƯA browser-verify** (máy dev không có Chrome cho hoot). Cần kiểm tay:
Working Hours không còn lệch cột; form phiếu kho VẪN còn cột STT; tab kỹ năng /
hồ sơ nhân viên (SEM) thẳng hàng.

🔴 **`-u t4_theme` KHÔNG chạy được trên DB `t4_sti` local** (2026-08-21): upgrade
lan sang `t4_production` (phụ thuộc gián tiếp), và
`t4_production/migrations/1.2.0/pre-migration.py` đổ vì `relation
"t4_production_request_component" does not exist` — DB đang ở 1.0.0, script
`pre-` chạy TRƯỚC khi ORM tạo bảng của model mới. Registry rollback sạch (mọi
module vẫn `installed`), nhưng **mọi session đều bị chặn upgrade trên DB này**
cho tới khi module đó sửa. Thay đổi ở đây thuần asset (JS/XML) nên vẫn tới
trình duyệt qua checksum bundle, không cần upgrade — đã xác minh bằng cách dump
`generate_xml_bundle()` trong `odoo shell`.

## References

- Agent guide: `addons/t4_theme/AGENTS.md`
- Architecture diagram: `addons/t4_theme/docs/ARCHITECTURE.md`
- Odoo 19 migration rules: `addons/t4_sti/docs/INDEX.md` → CLAUDE.md project root
