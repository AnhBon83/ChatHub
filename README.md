<div align="center">

<img src="build/icon.png" width="112" alt="ChatHub">

# ChatHub

**Gom Zalo, Messenger, Fanpage, WhatsApp, Telegram, Shopee, TikTok Shop vào một cửa sổ.**
Nhiều tài khoản, tách biệt hoàn toàn. Mã nguồn mở, không theo dõi, có bản portable không cần cài.

[![Phiên bản mới nhất](https://img.shields.io/github/v/release/AnhBon83/ChatHub?label=phi%C3%AAn%20b%E1%BA%A3n&color=0284c7)](https://github.com/AnhBon83/ChatHub/releases/latest)
[![Lượt tải](https://img.shields.io/github/downloads/AnhBon83/ChatHub/total?label=l%C6%B0%E1%BB%A3t%20t%E1%BA%A3i&color=16a34a)](https://github.com/AnhBon83/ChatHub/releases)
[![Giấy phép MIT](https://img.shields.io/badge/gi%E1%BA%A5y%20ph%C3%A9p-MIT-64748b)](LICENSE)
![Windows | Linux | macOS](https://img.shields.io/badge/h%E1%BB%87%20%C4%91i%E1%BB%81u%20h%C3%A0nh-Windows%20%7C%20Linux%20%7C%20macOS-475569)

### [⬇️ Tải về bản mới nhất](https://github.com/AnhBon83/ChatHub/releases/latest)

<img src="docs/screenshots/01-giao-dien-chinh.png" alt="Giao diện chính của ChatHub" width="900">

</div>

---

## Giới thiệu

Bán hàng online thường phải mở cùng lúc Zalo, Messenger, Fanpage, Shopee, TikTok Shop… mỗi thứ một tab,
mỗi nick một trình duyệt. **ChatHub** gom tất cả vào **một cửa sổ duy nhất**: mỗi tài khoản là một icon
bên trái, có số tin chưa đọc, có thông báo, chuyển qua lại bằng một cú bấm.

ChatHub được viết để **dễ kiểm tra**: toàn bộ mã nguồn chỉ khoảng 700 dòng, không có thư viện lạ,
không gửi dữ liệu đi đâu. File cài đặt được **GitHub tự build công khai từ chính mã nguồn này**
(xem tab [Actions](https://github.com/AnhBon83/ChatHub/actions)), không ai build tay trên máy riêng.

## Tính năng

| | |
|---|---|
| 💬 **7 dịch vụ có sẵn** | Zalo, Messenger, Fanpage (Meta Business Suite), WhatsApp, Telegram, Shopee Kênh Người Bán, TikTok Shop — và **bất kỳ trang web nào** khác |
| 👥 **Nhiều nick cùng dịch vụ** | Mỗi tài khoản có vùng đăng nhập riêng (cookie tách biệt), thêm bao nhiêu nick Zalo / Facebook cũng được |
| 🔴 **Đếm tin chưa đọc** | Số đỏ trên từng icon và trên thanh taskbar |
| 🔔 **Thông báo desktop** | Nhận thông báo tin mới kể cả khi đang ở tài khoản khác |
| ⚡ **Trả lời nhanh** | Lưu sẵn mẫu tin (chào khách, báo giá, số tài khoản…), bấm một cái là chèn vào ô chat |
| 😴 **Chế độ ngủ** | Tắt tạm nick ít dùng để tiết kiệm RAM |
| 🎒 **Bản portable** | Một file `.exe`, không cần cài, **không cần quyền admin**, dữ liệu nằm cạnh file — mang theo USB được |
| ⌨️ **Phím tắt** | `Ctrl+1…9` chuyển tài khoản · `Ctrl+R` tải lại · `Ctrl +/-/0` phóng to, thu nhỏ |

## Hình ảnh

<table>
<tr>
<td width="50%"><img src="docs/screenshots/02-tra-loi-nhanh.png" alt="Trả lời nhanh"><p align="center"><b>Trả lời nhanh</b> — bấm mẫu là chèn vào ô chat</p></td>
<td width="50%"><img src="docs/screenshots/03-them-tai-khoan.png" alt="Thêm tài khoản"><p align="center"><b>Thêm tài khoản</b> — chọn dịch vụ, đặt tên gợi nhớ</p></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/04-tao-mau-tra-loi.png" alt="Tạo mẫu trả lời"><p align="center"><b>Tạo mẫu trả lời</b> của riêng bạn</p></td>
<td width="50%"><img src="docs/screenshots/00-man-hinh-chao.png" alt="Màn hình chào"><p align="center"><b>Lần đầu mở app</b></p></td>
</tr>
</table>

> Ảnh minh họa dùng trang chat demo để không lộ dữ liệu khách hàng thật. Khi dùng thật, bạn sẽ thấy
> đúng giao diện web của Zalo, Messenger… như khi mở trên trình duyệt.

## Tải về & cài đặt

Vào trang **[Releases](https://github.com/AnhBon83/ChatHub/releases/latest)** và chọn file phù hợp:

| File | Dùng khi nào |
|---|---|
| `ChatHub-Portable-x.y.z.exe` | **Khuyên dùng.** Windows, không cần cài, không cần admin. Chép vào một thư mục riêng hoặc USB rồi bấm đúp |
| `ChatHub-Setup-x.y.z.exe` | Windows, muốn có icon ở Start Menu / Desktop. Cài cho riêng tài khoản Windows của bạn |
| `ChatHub-x.y.z.AppImage` | Linux. `chmod +x` rồi chạy |
| `SHA256SUMS.txt` | Mã kiểm tra, để chắc chắn file tải về không bị sửa |

**Lần đầu mở trên Windows** sẽ có cảnh báo *"Windows protected your PC"* vì app chưa mua chứng chỉ ký số
(vài trăm USD/năm). Bấm **More info → Run anyway**. Nếu muốn chắc chắn, hãy
[kiểm tra mã SHA256](#kiểm-tra-file-tải-về) hoặc [tự build từ mã nguồn](#tự-build-từ-mã-nguồn).

### Cách dùng

1. Mở app → bấm **+ Thêm tài khoản** → chọn dịch vụ → đặt tên (VD: *Zalo shop chính*).
2. Đăng nhập như trên web (Zalo / WhatsApp quét QR bằng điện thoại).
3. Muốn thêm nick khác: bấm **+** ở thanh bên trái.
4. **Chuột phải** vào icon tài khoản để: tải lại, đổi tên, sắp xếp, cho ngủ, xóa.
5. Bấm **⚡** để mở bảng trả lời nhanh.

## Bảo mật & quyền riêng tư

Lý do ChatHub ra đời là để **không phải tin vào một file .exe không rõ nguồn gốc** khi đưa các tài khoản bán hàng vào.

- ❌ **Không** telemetry, analytics, quảng cáo, auto-update, không tải code từ server nào.
  App chỉ kết nối tới đúng các trang chat bạn thêm vào.
- 🔒 Trang chat chạy trong **sandbox**, `contextIsolation` bật, **không có quyền Node.js** — không đọc được file trên máy.
- 🔒 **Không chèn script** vào Zalo / Facebook… Số tin chưa đọc lấy từ tiêu đề trang (VD: `(3) Messenger`).
- 🔒 Chỉ cấp quyền: thông báo, micro/camera (ghi âm, gọi), ghi clipboard, toàn màn hình. Vị trí, USB, Bluetooth… đều bị từ chối.
- 🔒 Link ra ngoài mở bằng trình duyệt mặc định; giao thức lạ (`bytedance://`, `file://`…) bị chặn.
- 🔒 Chỉ 2 thư viện chính chủ: `electron` và `electron-builder`, phiên bản ghim cứng.
- 🔒 File cài đặt build tự động trên GitHub Actions từ mã nguồn công khai — ai cũng xem được quá trình build.

**Dữ liệu lưu ở đâu?** Chỉ trên máy bạn:

| Bản | Thư mục dữ liệu |
|---|---|
| Portable | Thư mục `ChatHub-data` nằm **cạnh file .exe** |
| Cài đặt (Windows) | `%APPDATA%\ChatHub` |
| Linux | `~/.config/ChatHub` |
| macOS | `~/Library/Application Support/ChatHub` |

> ⚠️ Thư mục này chứa phiên đăng nhập, giống như dữ liệu của Chrome. Ai có nó là dùng được các tài khoản
> của bạn. Đừng chia sẻ, và xóa nó khi thôi dùng trên máy công ty / máy dùng chung.

### Kiểm tra file tải về

Mở PowerShell ở thư mục chứa file và chạy:

```powershell
Get-FileHash .\ChatHub-Portable-1.0.0.exe -Algorithm SHA256
```

So kết quả với dòng tương ứng trong `SHA256SUMS.txt` ở trang Releases. Trùng khớp = file nguyên vẹn.

## Tự build từ mã nguồn

Cần [Node.js](https://nodejs.org) bản LTS (20 trở lên).

```bash
git clone https://github.com/AnhBon83/ChatHub.git
cd ChatHub
npm install
npm start                 # chạy thử
npm run build:portable    # -> dist/ChatHub-Portable-x.y.z.exe
npm run build:win         # -> dist/ChatHub-Setup-x.y.z.exe
npm run build:linux       # -> dist/ChatHub-x.y.z.AppImage
npm run build:mac         # -> dist/ChatHub-x.y.z.dmg (chạy trên máy Mac)
```

### Cấu trúc mã nguồn

| File | Vai trò |
|---|---|
| [`src/main.js`](src/main.js) | Tiến trình chính: cửa sổ, tách session từng tài khoản, chính sách bảo mật |
| [`src/services.js`](src/services.js) | Danh sách dịch vụ — thêm dịch vụ mới chỉ cần thêm vài dòng |
| [`src/preload.js`](src/preload.js) | Cầu nối an toàn cho thanh bên (không nạp vào trang chat) |
| [`src/renderer/`](src/renderer) | Giao diện thanh bên, hộp thoại, trả lời nhanh |
| [`.github/workflows/release.yml`](.github/workflows/release.yml) | Tự build & phát hành khi có phiên bản mới |

## Câu hỏi thường gặp

**Có bị khóa nick không?** ChatHub chỉ mở bản web chính thức của từng dịch vụ, giống hệt bạn mở bằng Chrome —
không tự động nhắn tin, không spam, không cào dữ liệu.

**Trang X không vào được / bị đổi địa chỉ?** Chuột phải icon → *Về trang chủ dịch vụ*. Nếu vẫn lỗi,
thêm bằng mục *Trang web khác* với địa chỉ đúng, và [báo lỗi tại đây](https://github.com/AnhBon83/ChatHub/issues).

**Zalo / WhatsApp đòi quét QR lại?** Đó là chính sách hết hạn phiên của họ, không phải lỗi app.

**Dùng trên máy công ty không có quyền admin?** Dùng bản **Portable**. Lưu ý tuân thủ quy định IT của công ty bạn.

## Lịch sử phiên bản

Xem [CHANGELOG.md](CHANGELOG.md).

## Đóng góp

Báo lỗi, đề xuất tính năng: mở [Issue](https://github.com/AnhBon83/ChatHub/issues). Pull request luôn được chào đón.

## Giấy phép

[MIT](LICENSE) © 2026 AnhBon83. Zalo, Messenger, Facebook, WhatsApp, Telegram, Shopee, TikTok là thương hiệu
của các chủ sở hữu tương ứng. ChatHub là dự án độc lập, không liên kết với các công ty này.
