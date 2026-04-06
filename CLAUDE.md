# T4TEK STI — Odoo 19 Project Workflow

Dự án Odoo 19 custom modules tại `addons/`. Mỗi module nằm trong một thư mục riêng trong `addons/`.

---

## Quy trình A-Z: Tạo tính năng hoặc module mới

### Bước 0 — Kích hoạt chế độ làm việc

Gõ một trong các keyword để OMC tự điều phối toàn bộ:

```
autopilot: <mô tả tính năng hoặc module>
ulw: <mô tả tính năng hoặc module>
```

Hoặc làm thủ công theo các bước bên dưới.

---

### Bước 1 — Phân tích yêu cầu (Analyst)

- Xác định: module mới hay thêm tính năng vào module có sẵn?
- Xác định dependencies (Odoo built-in, module khác trong addons/)
- Xác định model, view, controller, wizard cần tạo
- Ghi rõ: input/output, business logic, security rules

**Trigger thủ công:**
```
/gsd-discuss-phase
```

---

### Bước 2 — Lập kế hoạch (Planner → GSD)

```
/gsd-plan-phase
```

Planner tạo file `.planning/PLAN.md` gồm:
- Danh sách task theo thứ tự
- File cần tạo / chỉnh sửa
- Test cases cần viết
- Rủi ro và cách xử lý

---

### Bước 3 — Tạo cấu trúc module (nếu module mới)

Cấu trúc chuẩn cho mỗi module trong `addons/<ten_module>/`:

```
addons/<ten_module>/
├── __init__.py
├── __manifest__.py          # version: "1.0" (KHÔNG dùng "19.0.x.x.x")
├── models/
│   ├── __init__.py
│   └── <model_name>.py
├── views/
│   └── <model_name>_views.xml
├── security/
│   ├── ir.model.access.csv
│   └── <module>_security.xml  (nếu cần groups)
├── data/                    (optional)
├── static/                  (optional, cho JS/CSS/img)
├── controllers/             (optional, cho HTTP routes)
├── wizard/                  (optional)
├── tests/
│   ├── __init__.py
│   └── test_<feature>.py
└── README.md
```

---

### Bước 4 — Viết code (Executor)

Thứ tự viết:
1. `__manifest__.py` — khai báo module
2. `models/` — định nghĩa model (fields, methods, constraints)
3. `security/ir.model.access.csv` — phân quyền
4. `views/` — giao diện (form, list, search, action, menu)
5. `controllers/` — HTTP endpoints (nếu có)
6. `static/` — JS/OWL components (nếu có)
7. `data/` — dữ liệu mặc định (nếu có)
8. `tests/` — unit tests

**Quy tắc bắt buộc:**
- `version` trong `__manifest__.py` dùng `"1.0"` (KHÔNG phải `"19.0.x.x.x"`)
- Mọi model kế thừa `models.Model` hoặc mixin thích hợp
- `_name` theo dạng `t4.<domain>.<entity>` (ví dụ: `t4.hid.device`)
- Không hardcode strings — dùng `_()` cho i18n
- Không mutate dữ liệu trực tiếp — dùng `write()`, `create()` của ORM

---

### Bước 5 — Test (TDD Guide)

```
/gsd-add-tests
```

- Viết test trước khi implement (hoặc song song)
- Chạy test trong Odoo shell hoặc `python -m pytest`
- Coverage tối thiểu 80% cho business logic

**Test mẫu:**
```python
from odoo.tests.common import TransactionCase

class TestFeature(TransactionCase):
    def setUp(self):
        super().setUp()
        # setup data

    def test_basic_flow(self):
        # arrange → act → assert
```

---

### Bước 6 — Review (Code Reviewer + Security Reviewer)

```
/gsd-validate-phase
```

Checklist tự động kiểm tra:
- [ ] Không có hardcoded secrets
- [ ] SQL dùng ORM hoặc parameterized query
- [ ] Access rights đầy đủ trong `ir.model.access.csv`
- [ ] Không có `sudo()` vô căn cứ
- [ ] Views có `string` attributes đầy đủ
- [ ] `__manifest__.py` có `installable: True`, `auto_install: False`

---

### Bước 7 — Xác minh (Verifier)

```
/gsd-verify-work
```

- Module install được không lỗi
- Các model tạo đúng table trong DB
- Views render không crash
- Test pass hết

---

### Bước 8 — Commit

```
/commit
```

Format commit message:
```
feat(<ten_module>): <mô tả ngắn>

<chi tiết nếu cần>
```

Ví dụ:
```
feat(t4_passivehid_bridge): add WebSocket reconnect with exponential backoff
```

---

## Conventions của project này

### Module naming
- Prefix: `t4_`
- Snake case: `t4_ten_module`
- Model `_name`: `t4.<domain>.<entity>`

### Version
- Luôn dùng `"version": "1.0"` trong `__manifest__.py`
- KHÔNG dùng `"19.0.1.0.0"` hay bất kỳ format `x.x.x.x.x` nào — module sẽ không install được

### Odoo 19 specifics
- OWL 3 cho frontend components (không dùng Widget legacy)
- `env.ref()` thay cho `pool.get()`
- `recordset.filtered_domain()` thay cho `search()` trong vòng lặp
- Dùng `@api.model_create_multi` cho `create()`

### File size
- Mỗi file tối đa 400 dòng
- Tách model lớn thành nhiều file trong `models/`

---

## Agents tự động theo từng bước

| Bước | Agent | Lệnh |
|------|-------|-------|
| Phân tích | `analyst` (Opus) | tự động khi dùng autopilot |
| Lập kế hoạch | `planner` (Opus) | `/gsd-plan-phase` |
| Viết code | `executor` (Sonnet) | tự động |
| Review | `code-reviewer` | tự động sau khi viết |
| Security | `security-reviewer` | `/gsd-secure-phase` |
| Test | `tdd-guide` | `/gsd-add-tests` |
| Xác minh | `verifier` | `/gsd-verify-work` |
| Docs | `writer` (Haiku) | `/gsd-docs-update` |

---

## Keyword shortcuts

| Gõ | Tác dụng |
|----|----------|
| `autopilot: <task>` | OMC tự làm A-Z, báo cáo khi xong |
| `ulw: <task>` | Ultrawork — parallel agents tối đa |
| `tdd: <task>` | Bắt buộc viết test trước |
| `deepsearch: <query>` | Tìm kiếm sâu trong codebase |
| `ultrathink: <vấn đề>` | Phân tích sâu với extended reasoning |

---

## Cấu trúc addons hiện tại

```
addons/
├── t4_custom_dashboard/     # Dashboard tùy chỉnh
├── t4_passivehid_bridge/    # WebSocket bridge cho thiết bị HID
├── t4_sequential_auto_input/ # Nhập liệu tự động tuần tự
└── t4_theme/                # Theme Odoo tùy chỉnh
```

Mỗi module mới thêm vào đây theo đúng cấu trúc trên.
