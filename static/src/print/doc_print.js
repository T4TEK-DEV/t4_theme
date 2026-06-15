/** @odoo-module **/
/**
 * T4 Doc Print — In tài liệu (đơn bán / đơn mua) qua hidden iframe.
 *
 * Dùng chung cho mọi module muốn in HTML report bằng máy in của trình duyệt
 * thay vì tải file qweb-pdf. Lý do KHÔNG dùng qweb-pdf / act_url:
 *   - act_url mở tab mới → UX rời rạc.
 *   - qweb-pdf auto-download + wkhtmltopdf thiếu font tiếng Việt trên nhiều
 *     môi trường (Docker / Linux server) → mất dấu.
 *
 * Cách dùng — Python (method action trên model):
 *
 *      return {
 *          'type': 'ir.actions.client',
 *          'tag': 't4_doc_print',
 *          'params': {'url': '/report/html/<reportname>/<docids>'},
 *      }
 *
 * Flow:
 *   1. Tạo iframe ẩn (A4 portrait 210mm×297mm THẬT để layout đúng từ đầu),
 *      append vào body, load URL từ params.
 *   2. onload → document.fonts.ready + 2×requestAnimationFrame + setTimeout
 *      50ms → win.print() → browser bật cửa sổ Print đè lên trang hiện tại.
 *   3. afterprint event → remove iframe. Fallback 60s nếu afterprint không
 *      fire (browser cũ / iframe lỗi).
 *
 * KHÁC với t4_picking_print: KHÔNG có bước soft_reload sau in (SO/PO không
 * cần reload form sau khi in).
 */
import { registry } from "@web/core/registry";

let _activeIframe = null;

function _cleanupActive() {
    if (!_activeIframe) {
        return;
    }
    const iframe = _activeIframe;
    _activeIframe = null;
    try {
        iframe.remove();
    } catch (err) {
        // Iframe đã bị remove rồi — idempotent guard, bỏ qua.
    }
}

function t4DocPrintAction(env, action) {
    const params = action.params || {};
    const url = params.url;
    if (!url) {
        return;
    }

    // Dọn iframe của lần in trước (nếu user click "In" liên tục).
    _cleanupActive();

    const iframe = document.createElement("iframe");
    // Iframe cần có kích thước A4 portrait THẬT (không phải 0×0) để document
    // bên trong layout đúng từ đầu. Nếu để 0×0, viewport width = 0 → table
    // render bị nén / cắt bên phải; print() chụp ngay state đó.
    iframe.style.position = "fixed";
    iframe.style.top = "-10000px";
    iframe.style.left = "0";
    iframe.style.width = "210mm";   // A4 portrait width
    iframe.style.height = "297mm";  // A4 portrait height
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    iframe.setAttribute("aria-hidden", "true");
    _activeIframe = iframe;

    iframe.onload = () => {
        // Race guard: nếu user trigger 1 print khác sau đó, _activeIframe đã
        // chỉ tới iframe mới → bỏ qua callback của iframe cũ.
        if (_activeIframe !== iframe) {
            return;
        }
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        if (!win || !doc) {
            _cleanupActive();
            return;
        }

        const triggerPrint = () => {
            if (_activeIframe !== iframe) {
                return;
            }
            try {
                win.addEventListener("afterprint", () => {
                    if (_activeIframe === iframe) {
                        _cleanupActive();
                    }
                });
                win.focus();
                win.print();
            } catch (err) {
                // Cross-origin / lỗi không mong muốn → cleanup ngay.
                _cleanupActive();
            }
        };

        // Đợi font + layout settle trước khi print:
        //   1. document.fonts.ready: chờ web fonts load xong (nếu có).
        //   2. 2× requestAnimationFrame: chờ browser hoàn tất 2 frame paint.
        //   3. setTimeout 50ms buffer: an toàn cho slow machines.
        const fontsReady =
            doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
        fontsReady.then(() => {
            if (_activeIframe !== iframe) {
                return;
            }
            win.requestAnimationFrame(() => {
                win.requestAnimationFrame(() => {
                    setTimeout(triggerPrint, 50);
                });
            });
        });
    };

    // Fallback cleanup: nếu afterprint không fire (Safari cũ) hoặc onload
    // không fire (network error) — cleanup sau 60s để không leak DOM node.
    setTimeout(() => {
        if (_activeIframe === iframe) {
            _cleanupActive();
        }
    }, 60000);

    document.body.appendChild(iframe);
    iframe.src = url;
}

registry.category("actions").add("t4_doc_print", t4DocPrintAction);
