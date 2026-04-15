# Plan: Multiple App Icon Shapes for Home Menu

**Date:** 2026-04-05
**Module:** t4_theme
**Complexity:** MEDIUM
**Estimated Files:** 6 modified, 1 new

---

## Context

The t4_theme module has a fully custom OWL HomeMenu component (`t4_theme.HomeMenu`) registered as the `"menu"` action. App icons are rendered in a CSS grid with `rounded-3` (Bootstrap) border-radius on both the `<a>` wrapper and `.o_app_icon` element. The module already has a well-established pattern for per-company theme settings: `res.company` field -> `res.config.settings` related field -> settings XML UI -> `theme_color_service.js` applies CSS variables at runtime. This plan follows that exact pattern.

Currently, icon shape is hardcoded to rounded rectangle via the `rounded-3` class in the template and SCSS.

---

## Work Objectives

1. Allow users to choose from multiple app icon shapes (per company) via Settings.
2. Shapes are applied purely via CSS (no template changes per shape).
3. Works with both base64 image icons and custom color+FontAwesome icons.
4. Compatible with dark mode, edit mode, drag ghost, and mobile layouts.

---

## Guardrails

### Must Have
- Per-company setting stored on `res.company`
- At least 5 shapes: rounded rectangle (default), circle, square, rounded square (iOS-style), hexagon
- Works with existing `theme_color_service.js` delivery pattern
- Dark mode compatibility
- Mobile responsive

### Must NOT Have
- No changes to Odoo core files
- No JavaScript logic per shape (pure CSS approach)
- No breaking changes to existing icon editing or drag-and-drop
- No SVG masks or external assets (CSS-only: `clip-path`, `border-radius`)

---

## Task Flow

### Step 1: Add `theme_icon_shape` field to `res.company` and `res.config.settings`

**Files to modify:**
- `addons/t4_theme/models/res_company.py`
- `addons/t4_theme/models/res_config_settings.py`

**What to do:**

In `res_company.py`, add a Selection field after `theme_home_menu_overlay`:

```python
theme_icon_shape = fields.Selection(
    selection=[
        ('rounded_rect', 'Bo goc (Mac dinh)'),
        ('circle', 'Hinh tron'),
        ('square', 'Vuong'),
        ('ios', 'iOS (Squircle)'),
        ('hexagon', 'Luc giac'),
    ],
    string='Hinh dang icon ung dung',
    default='rounded_rect',
    help='Hinh dang icon tren man hinh Home Menu.',
)
```

In `res_config_settings.py`, add a related field:

```python
theme_icon_shape = fields.Selection(
    related='company_id.theme_icon_shape',
    readonly=False,
)
```

**Acceptance criteria:**
- Field exists on `res.company` with default `'rounded_rect'`
- Field is accessible via `res.config.settings`
- Odoo upgrade/migration does not break (Selection with default)

---

### Step 2: Expose the setting in the Settings UI

**Files to modify:**
- `addons/t4_theme/views/res_config_settings.xml`

**What to do:**

Add a new `<setting>` block inside the `theme_settings` block, after the "Background Image" setting and before the "Branding" setting. Use a Selection widget with visual labels:

```xml
<!-- App Icon Shape (per-company) -->
<setting
    string="Hinh dang icon"
    company_dependent="1"
    help="Chon hinh dang icon tren man hinh Home Menu"
>
    <div class="w-50 row">
        <field name="theme_icon_shape" widget="radio" class="w-100"/>
    </div>
</setting>
```

**Acceptance criteria:**
- Setting appears in Settings > "Giao dien Backend" section
- Changing the value persists per company
- Radio widget shows all 5 shape options clearly

---

### Step 3: Deliver the setting value to the frontend

**Files to modify:**
- `addons/t4_theme/static/src/services/theme_color_service.js`

**What to do:**

The `theme_color_service.js` already reads `user.activeCompany` and applies CSS variables. Extend it to also read `theme_icon_shape` and set a CSS class on `document.documentElement`:

```javascript
function applyIconShape(company) {
    const root = document.documentElement;
    const shape = company?.theme_icon_shape || 'rounded_rect';
    // Remove all shape classes, then add the active one
    root.classList.remove(
        't4-icon-rounded_rect', 't4-icon-circle', 't4-icon-square',
        't4-icon-ios', 't4-icon-hexagon'
    );
    root.classList.add(`t4-icon-${shape}`);
}
```

Call `applyIconShape(company)` in the `start()` method alongside the existing `applyThemeColors()` and `applyThemeFont()` calls, and also in the `MENUS:APP-CHANGED` listener.

For the company data to include `theme_icon_shape`, it must be added to the session info. Check `ir_http.py` or the session_info mechanism to ensure `theme_icon_shape` is included in `user.activeCompany`. The existing color fields are delivered via a `_t4_session_info` method or similar; add `theme_icon_shape` to the same dict.

**Acceptance criteria:**
- On page load, `<html>` element has CSS class like `t4-icon-circle`
- Changing company re-applies the correct class
- Default class is `t4-icon-rounded_rect`

---

### Step 4: Implement shape styles in SCSS

**Files to create:**
- `addons/t4_theme/static/src/webclient/home_menu/home_menu_shapes.scss`

**Files to modify:**
- `addons/t4_theme/__manifest__.py` (add the new SCSS file to `web.assets_backend`)

**What to do:**

Create a new SCSS file with shape definitions. Each shape targets `.o_app_icon` inside the home menu, keyed by the CSS class on `<html>`:

```scss
// ── App Icon Shapes ──

// Default: Rounded Rectangle (Bootstrap rounded-3 is already applied in template)
// No override needed for .t4-icon-rounded_rect

// Circle
.t4-icon-circle .o_home_menu .o_app .o_app_icon {
    border-radius: 50% !important;
}

// Square (no rounding)
.t4-icon-square .o_home_menu .o_app .o_app_icon {
    border-radius: 0 !important;
}

// iOS Squircle (superellipse approximation)
.t4-icon-ios .o_home_menu .o_app .o_app_icon {
    border-radius: 22.5% !important;
}

// Hexagon
.t4-icon-hexagon .o_home_menu .o_app .o_app_icon {
    border-radius: 0 !important;
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    border: none !important;
}
```

Also apply the same shapes to:
- `.t4_hm_drag_ghost .o_app_icon` (drag ghost during reorder)
- The apps bar sidebar icons if applicable
- Dark mode variant (should inherit automatically since shapes use the root class)

Handle the hexagon border specially: since `clip-path` clips the border, use `box-shadow: inset ...` instead of `border` for the hexagon shape, or wrap in a container with the same clip-path.

**Acceptance criteria:**
- Each of the 5 shapes renders correctly on both image icons and custom/FontAwesome icons
- Hexagon clips correctly without visual artifacts
- Hover effects (translateY, box-shadow) still work with all shapes
- Drag ghost matches the active shape
- Shapes render correctly on mobile (flex layout)

---

### Step 5: Ensure the icon shape value is in session_info / company data

**Files to modify:**
- `addons/t4_theme/models/res_company.py` or `addons/t4_theme/controllers/` (wherever `_t4_session_info` or session_info enrichment happens)

**What to do:**

Find where the existing theme fields (colors, font_family, etc.) are serialized into session_info for the frontend. Add `theme_icon_shape` to the same dictionary. This is typically done via overriding `_get_session_info_fields()` or by enriching the company dict returned to the webclient.

Search for how `theme_font_family` or `theme_color_brand` gets delivered to `user.activeCompany` in JavaScript, and follow the same mechanism.

**Acceptance criteria:**
- `user.activeCompany.theme_icon_shape` is available in JavaScript
- Value updates when company is switched or setting is saved (after reload)

---

### Step 6: Register the new SCSS asset

**Files to modify:**
- `addons/t4_theme/__manifest__.py`

**What to do:**

Add the new SCSS file to `web.assets_backend` in the manifest. Place it after the existing home_menu SCSS files:

```python
# In web.assets_backend after the webclient/**/*.scss glob:
't4_theme/static/src/webclient/home_menu/home_menu_shapes.scss',
```

Since the manifest already has a glob `'t4_theme/static/src/webclient/**/*.scss'`, the new file should be picked up automatically. Verify this by checking if the glob already covers it. If it does, no manifest change is needed for the SCSS file itself. However, verify that the glob does not also include the dark mode files (they are explicitly removed, so the glob is used).

**Acceptance criteria:**
- SCSS file is loaded in the backend bundle
- No duplicate loading
- `clip-path` and `border-radius` overrides actually take effect

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `clip-path` hexagon clips border/shadow | HIGH | MEDIUM | Use `filter: drop-shadow()` instead of `box-shadow` for hexagon; apply clip-path to a wrapper or use inset shadow |
| session_info not including new field | MEDIUM | HIGH | Trace how `theme_font_family` reaches `user.activeCompany` and replicate exactly |
| Mobile flex layout breaks with non-rectangular shapes | LOW | MEDIUM | Test all shapes on mobile breakpoints; hexagon may need reduced size on small screens |
| Edit mode icon editor button position breaks with circle/hexagon | LOW | LOW | The edit button is absolutely positioned relative to `.position-relative` parent; should work regardless of icon shape |
| Hover transform + clip-path interaction | LOW | LOW | Test `transform: translateY(-3px)` with `clip-path`; should be fine as transform doesn't affect clip-path |

---

## Dependencies

```
Step 1 (model fields)
  └── Step 2 (settings UI) -- can be done in parallel with Step 5
  └── Step 5 (session_info delivery)
       └── Step 3 (JS service reads and applies CSS class)
            └── Step 4 (SCSS shape definitions)
                 └── Step 6 (asset registration / verification)
```

Steps 1, 2, and 5 are backend. Steps 3, 4, and 6 are frontend.

---

## Success Criteria

- [ ] User can select icon shape from Settings > "Giao dien Backend"
- [ ] Selected shape persists per company and survives page reload
- [ ] All 5 shapes render correctly on the home menu grid
- [ ] Both image-based and custom (color+icon) app icons display with the chosen shape
- [ ] Dark mode shows the same shape correctly
- [ ] Edit mode drag-and-drop works with all shapes
- [ ] Mobile layout works with all shapes
- [ ] Default (rounded_rect) matches current behavior exactly (no visual regression)
