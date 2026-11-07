# Zalo Credentials Extractor (Extension)

Tiện ích mở rộng Manifest V3 chạy trên **Zalo Web** (`https://chat.zalo.me/*`) để trích xuất `cookies` và `IMEI` dùng cho thư viện [`zalo-client`](https://github.com/DEVTRAN07/Zalo-Client).

## Tính năng
- Trích xuất cookie Zalo (`zpw_*`) qua `chrome.cookies` API.
- Tạo `IMEI` từ `userAgent` theo cùng thuật toán với `zalo-client`: `uuid-md5(userAgent)`.
- Popup hiển thị thông tin và cho phép **Sao chép JSON** theo định dạng tương thích `Credentials`.

## Cài đặt (Chrome/Edge)
1. Mở trang quản lý extension:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
2. Bật **Developer mode** (Chế độ dành cho nhà phát triển).
3. Chọn **Load unpacked** / **Tải tiện ích đã giải nén**.
4. Chọn thư mục: `.../zalo-client/extension`.

## Cách sử dụng
1. Mở và đăng nhập [https://chat.zalo.me](https://chat.zalo.me).
2. Nhấn biểu tượng extension **Zalo Credentials Extractor**.
3. Nhấn **Trích xuất** (popup cũng tự thử trích xuất khi đang ở trang Zalo).
4. Nhấn **Sao chép JSON** để lấy credentials.

## Định dạng đầu ra
JSON được sao chép tương thích với kiểu `Credentials` của `zalo-client`:

```json
{
  "imei": "<uuid>-<md5(userAgent)>",
  "cookie": [
    {
      "domain": ".zalo.me",
      "expirationDate": 0,
      "hostOnly": false,
      "httpOnly": true,
      "name": "zpw_sek",
      "path": "/",
      "sameSite": "no_restriction",
      "secure": true,
      "session": false,
      "storeId": "0",
      "value": "..."
    }
  ],
  "userAgent": "...",
  "language": "vi"
}
```

> `language` là tùy chọn trong `Credentials`. Trường `cookie` là mảng cookie (tương thích cách `zalo-client` đọc).

## Cấu trúc extension
- `manifest.json` — Manifest V3, permissions: `cookies`, `activeTab`, `scripting`, `clipboardWrite`; host: `https://chat.zalo.me/*`, `https://*.zalo.me/*`.
- `background.js` — Service worker: **chỉ** lấy cookie qua `chrome.cookies` (không dùng `navigator`).
- `content.js` — Content script trên `chat.zalo.me`, hỗ trợ lấy `userAgent`/`language` từ trang.
- `injected.js` — Script tiêm vào page (tham khảo); lấy dữ liệu `zpw_*` khả dụng trong ngữ cảnh trang.
- `popup.html` / `popup.js` — UI; tạo IMEI (`uuid` + `md5(userAgent)`) trong popup (có `navigator/crypto`), ghép với cookies từ background.
- `icons/` — `icon16.png`, `icon48.png`, `icon128.png`.

## Lưu ý bảo mật
- Cookie/IMEI là thông tin nhạy cảm, tương đương phiên đăng nhập. **Không chia sẻ** file/JSON này.
- Chỉ cài extension từ nguồn bạn tin cậy và kiểm tra mã nguồn trước khi dùng.
