# Lịch sử phiên bản

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), đánh số theo [Semantic Versioning](https://semver.org/lang/vi/).

## [1.0.0] - 2026-11-21

Phiên bản đầu tiên.

### Tính năng
- Hỗ trợ sẵn 7 dịch vụ: Zalo, Messenger, Fanpage (Meta Business Suite), WhatsApp, Telegram, Shopee Kênh Người Bán, TikTok Shop, cùng mục *Trang web khác* để thêm bất kỳ trang nào.
- Nhiều tài khoản cho cùng một dịch vụ, mỗi tài khoản có vùng đăng nhập (cookie) riêng.
- Đếm tin chưa đọc trên từng icon và trên thanh taskbar.
- Thông báo desktop từ các trang chat.
- Trả lời nhanh: lưu mẫu tin, tìm kiếm, bấm để chèn vào ô chat hoặc sao chép.
- Chế độ ngủ cho tài khoản ít dùng để tiết kiệm RAM.
- Menu chuột phải trên icon: tải lại, về trang chủ, đổi tên, sắp xếp, cho ngủ, xóa (xóa sạch dữ liệu đăng nhập).
- Menu chuột phải trong trang chat: cắt, sao chép, dán, sao chép ảnh, mở link bằng trình duyệt.
- Phím tắt `Ctrl+1…9`, `Ctrl+R`, `Ctrl +/-/0`.
- **Bản portable cho Windows**: không cần cài, không cần quyền admin, dữ liệu lưu trong thư mục `ChatHub-data` cạnh file `.exe`.
- Bản cài đặt Windows (cài theo người dùng, không cần admin) và bản AppImage cho Linux.

### Bảo mật
- Trang chat chạy sandbox, `contextIsolation`, không có quyền Node.js, không bị chèn script.
- Chỉ cấp quyền thông báo, micro/camera, ghi clipboard, toàn màn hình; mọi quyền khác bị từ chối.
- Chặn giao thức lạ; link ngoài mở bằng trình duyệt mặc định.
- Không telemetry, không auto-update.
- File phát hành được build tự động trên GitHub Actions, kèm mã SHA256.

[1.0.0]: https://github.com/AnhBon83/ChatHub/releases/tag/v1.0.0
