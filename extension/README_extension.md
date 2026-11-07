# Zalo Credentials Extractor (Extension)

Tiện ích mở rộng Manifest V3 chạy trên **Zalo Web** (`https://chat.zalo.me/*`) để trích xuất `cookies` và `IMEI` dùng cho thư viện [`zalo-client`](https://github.com/DEVTRAN07/Zalo-Client).

## Tính năng
- Trích xuất cookie Zalo (`zpw_*`) qua `chrome.cookies` API.
- Lấy `IMEI` từ `localStorage` của Zalo Web (`z_uuid` hoặc `sh_z_uuid`) theo chuẩn zlapi.
- Popup hiển thị thông tin (kèm nguồn IMEI) và cho phép **Sao chép JSON** theo định dạng tương thích `Credentials`.

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

> Lưu ý: IMEI chỉ có sau khi bạn đã đăng nhập Zalo Web (được lưu trong `localStorage` với key `z_uuid`/`sh_z_uuid`). Nếu chưa thấy IMEI, hãy đăng nhập và thử lại.

## Định dạng đầu ra
JSON được sao chép tương thích với kiểu `Credentials` của `zalo-client` (IMEI lấy trực tiếp từ localStorage Zalo Web):

```json
{
  "imei": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
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
- `content.js` — Content script trên `chat.zalo.me`: lấy `userAgent`/`language` và **IMEI từ `localStorage`** (`z_uuid`/`sh_z_uuid`).
- `injected.js` — Script tiêm vào page (tham khảo); lấy dữ liệu `zpw_*` và **IMEI từ `localStorage`** trong ngữ cảnh trang.
- `popup.html` / `popup.js` — UI; nhận IMEI từ page data (content script), ghép với cookies từ background, hiển thị nguồn IMEI và xuất JSON.
- `icons/` — `icon16.png`, `icon48.png`, `icon128.png`.

## Lưu ý bảo mật
- Cookie/IMEI là thông tin nhạy cảm, tương đương phiên đăng nhập. **Không chia sẻ** file/JSON này.
- Chỉ cài extension từ nguồn bạn tin cậy và kiểm tra mã nguồn trước khi dùng.
