# Nối khu vườn với máy chủ Firebase (miễn phí, làm một lần)

Web trên GitHub Pages chỉ là file tĩnh, nên không tự nhớ được vườn, khách, con trỏ hay nhật ký.
Các thứ đó được lưu trên **Firebase** (gói Spark, miễn phí). Làm một lần, sau đó mọi thao tác đều trên web.

## 1. Tạo dự án
1. Vào https://console.firebase.google.com → **Add project** → đặt tên (ví dụ `khu-vuon-tho`) → tắt Google Analytics → Create.

## 2. Bật đăng nhập
1. **Build → Authentication → Get started → Sign-in method.**
2. Bật **Anonymous** (cho khách) và **Email/Password** (cho chủ vườn).

## 3. Tạo tài khoản chủ vườn
1. **Authentication → Users → Add user.**
2. Email: `chu-vuon@khuvuontho.app`
3. Password: mật khẩu chủ vườn bạn muốn dùng (tối thiểu 6 ký tự).
   Đây chính là mật khẩu bạn gõ ở ô "Chủ vườn". Mật khẩu **không** nằm trong code.

## 4. Tạo cơ sở dữ liệu và luật bảo vệ
1. **Build → Realtime Database → Create database** → chọn vị trí (ví dụ Singapore) → chọn **Locked mode**.
2. Mở tab **Rules**, xóa hết, dán toàn bộ nội dung file `database.rules.json` trong thư mục này → **Publish**.

## 5. Lấy cấu hình và dán vào code
1. **Project settings (bánh răng) → General → Your apps → biểu tượng Web `</>`** → đặt tên → Register app.
2. Copy đoạn `firebaseConfig` (nhớ có dòng `databaseURL`).
3. Mở `firebase-config.js`, thay `window.FIREBASE_CONFIG = null;` bằng
   `window.FIREBASE_CONFIG = { ...đoạn vừa copy... };`
   Các giá trị này là công khai theo thiết kế; việc bảo vệ nằm ở **Rules** ở bước 4.

## 6. Cho phép tên miền GitHub Pages
1. **Authentication → Settings → Authorized domains → Add domain** → `diolmes.github.io`.

## 7. Đăng lên
Commit và push như thường. Mở web, chọn **Chủ vườn** (gõ mật khẩu) hoặc **Khách** (gõ tên).

## Chuyển vườn cũ lên mạng
Lần đầu vào bằng **Chủ vườn** trên trình duyệt có vườn cũ, web sẽ hỏi có chuyển lên mạng không.
Hoặc bấm **📥 Nhập** (chọn vườn cũ trên máy này, hoặc file sao lưu). **📤 Sao lưu** tải cả vườn về làm bản dự phòng.

## Ghi chú
- Gói Spark có giới hạn dung lượng và băng thông, đủ cho một khu vườn nhỏ.
- Chưa có cấu hình (`null`) thì web chạy "chế độ thử" trong trình duyệt, không chia sẻ cho ai.
