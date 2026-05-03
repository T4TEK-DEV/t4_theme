# X2Many Grouped Lists trong Form View

## Vấn đề

Trong Odoo 19, list view hiển thị bên trong form view (cho field `One2many` /
`Many2many`) **không hỗ trợ group-by** giống như list view ở action level.
Lý do: x2many list dùng `StaticList` (flat list of records) chứ không phải
`DynamicGroupList`, nên không có khái niệm `groups`.

## Giải pháp `t4_theme`

Module patch `X2ManyField` để thêm tính năng group-by **client-side**:

- Đọc `context.list_groupbys` trên field x2many.
- Build groups in-memory từ `staticList.records`.
- Wrap `staticList` bằng `Proxy` expose `isGrouped=true` + `groups` cho
  `ListRenderer` mặc định của Odoo dùng lại nguyên xi (tận dụng template QWeb
  có sẵn — không patch ListRenderer).
- Toggle fold/unfold dùng reactive state ở component level.
- **Save/Discard form view giữ nguyên**: tất cả thao tác CRUD vẫn đi qua
  `staticList._commands` → form save/discard hoạt động bình thường.

## Cách dùng

Trong file XML view, thêm `context="{'list_groupbys': ['field_name']}"` lên
field x2many:

```xml
<field name="line_ids" context="{'list_groupbys': ['category_id']}">
    <list editable="bottom">
        <field name="category_id"/>
        <field name="product_id"/>
        <field name="quantity"/>
        <field name="price_unit"/>
    </list>
</field>
```

Group có thể là:

- `many2one` (group theo display_name).
- `selection` (group theo label).
- `boolean`, `date`, `datetime`, `char`, `integer`...

Field group-by **không bắt buộc** phải nằm trong `<list>`. Nếu ngoài list, ta
chỉ thấy header group nhưng không thấy column tương ứng — vẫn group đúng theo
`record.data[field]`.

Cũng accept các alias: `list_groupby`, `list_groups` (đều là string hoặc array
một phần tử). Patch sẽ pick key đầu tiên có giá trị.

## Aggregates

Nếu column trong list có attr `sum`, `avg`, `max`, `min`, footer mỗi group
sẽ tự cộng/trung bình các giá trị của records trong group đó (computed
client-side, không cần `read_group` server).

## Hành vi "Add a line"

- Nút "Add a line" mặc định ở cuối list vẫn hoạt động — record mới rơi vào
  group `Undefined`.
- Mỗi group có nút "Add a line" riêng — record mới được pre-set field
  group-by bằng giá trị của group đó (qua `default_<field>`).
- Click pencil/edit → mở dialog form view, save dialog → record cập nhật
  trong group tương ứng.
- Save/Discard ở **form view cha** vẫn áp dụng cho tất cả thay đổi của
  x2many (không thay đổi).

## Hạn chế (v1)

- **Multi-level group-by**: chỉ hỗ trợ 1 cấp đầu tiên trong array.
- **Drag-drop sequence**: bị disable khi grouped (an toàn vì sequence không
  phù hợp ngữ cảnh đa nhóm).
- **Group config menu** (cog icon): bị ẩn vì grouping client-side, không có
  ngữ nghĩa "delete group" / "edit group" như khi group-by trên action.
- **Pagination per-group**: bỏ qua, render hết records của group (x2many
  thường ít rows).

## Files

| File | Vai trò |
|------|---------|
| `static/src/views/x2many_grouped/x2many_grouped_adapter.js` | Build synthetic groups + Proxy wrap StaticList |
| `static/src/views/x2many_grouped/x2many_field_patch.js` | Patch `X2ManyField.rendererProps` đọc `list_groupbys` |
| `static/src/views/x2many_grouped/x2many_grouped.scss` | Style nhẹ cho group header + ẩn cog icon |

## Tham khảo source upstream

- `D:/workspaces/odoo_19_base/odoo/addons/web/static/src/views/fields/x2many/x2many_field.js`
- `D:/workspaces/odoo_19_base/odoo/addons/web/static/src/views/list/list_renderer.{js,xml}`
- `D:/workspaces/odoo_19_base/odoo/addons/web/static/src/model/relational_model/static_list.js`
