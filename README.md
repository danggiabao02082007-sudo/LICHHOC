# 📚 Lịch Học HCMUS

App (PWA) theo dõi **thời khóa biểu, phòng học, giờ học, lịch thi, phòng thi, kết quả học tập, thông báo** của sinh viên Trường ĐH Khoa học Tự nhiên – ĐHQG-HCM, có **báo khi lịch đổi** và **nhắc giờ học / giờ thi / hạn nộp** về điện thoại.

Link app: https://danggiabao02082007-sudo.github.io/LICHHOC/

## Cách app lấy dữ liệu

| Nguồn | Cách lấy | Tần suất |
|---|---|---|
| Portal sinh viên (TKB, lịch thi, điểm, thông báo portal) | Tiện ích **Tampermonkey** chạy trong trình duyệt khi bạn đã đăng nhập portal; hoặc **dán tay** ở mục Đồng bộ | Mỗi lần mở portal (tự quét tối đa 3 giờ/lần) hoặc bấm "Đồng bộ ngay" |
| Tin trường (hcmus.edu.vn) | Máy chạy ngầm GitHub Actions | 30 phút |
| Tin Khoa Vật lý – Vật lý kỹ thuật (phys.hcmus.edu.vn) | Máy chạy ngầm GitHub Actions | 30 phút |
| Nhắc giờ học, giờ thi, hạn nộp; thông báo thay đổi | Máy chạy ngầm gửi thông báo đẩy | 30 phút |

**Vì sao không tự đăng nhập portal?** Trang đăng nhập portal có Google reCAPTCHA. App không vượt reCAPTCHA và không lưu mật khẩu portal. Tiện ích chỉ đọc các trang trong phiên bạn đã tự đăng nhập.

## Cài đặt lần đầu

1. **Tạo cơ sở dữ liệu:** supabase.com → New project (vùng Singapore) → SQL Editor → dán toàn bộ `supabase/setup.sql` → Run.
2. **Nối app:** điền `SUPABASE_URL` và `SUPABASE_ANON_KEY` (khóa *anon public*, không phải *service_role*) vào `public/config.js`, build và đưa lên gh-pages.
3. **Mở app → "Tạo tài khoản lần đầu".** Tài khoản đầu tiên là chủ app; sau đó không ai tạo thêm được.
4. **Tiện ích portal:** cài Tampermonkey → mở `…/LICHHOC/lichhoc.user.js` → Install. Trong app, mục **Đồng bộ portal** → "Tạo mã kết nối" → dán mã vào nút 📚 LICHHOC trên portal.
5. **Máy chạy ngầm:** trong app, mục Đồng bộ → "Tạo khóa máy chạy ngầm". Vào repo → Settings → Secrets and variables → Actions, tạo 3 secret: `SB_URL`, `SB_ANON`, `CRON_KEY`.
6. **Thông báo điện thoại:** Cài đặt → "Bật thông báo trên máy này". Trên iPhone phải "Thêm vào MH chính" trước (iOS 16.4+).

## Phát triển

```bash
npm install
npm run dev          # chạy thử
npm run build        # dist/ + dist/lichhoc.user.js
npm test             # cần Docker: Supabase cục bộ + 4 bộ kiểm thử (parser, CSDL, máy chạy ngầm, trọn vòng trên trình duyệt)
./scripts/make-setup.sh   # tạo lại supabase/setup.sql sau khi sửa migration
```

- `src/lib/portal.js` đọc bảng portal theo **tên cột** (không theo vị trí), nên chịu được việc portal thêm/bớt cột. Bảng không nhận ra được báo trong tiện ích kèm tên cột, để sửa bộ đọc.
- `tests/fixtures/portal/layout.cjs` là portal **giả lập**. Định dạng bảng thật của portal chưa kiểm chứng được (cần đăng nhập).

## Điểm cần biết

- **Giờ tiết học mặc định chưa xác minh** với lịch chính thức của trường. Sửa ở Cài đặt → Giờ tiết học.
- **Quy đổi thang 4 và xếp loại** theo mức thường dùng; quy chế của trường có thể khác.
- **Ngày Tết / Trung Thu** (cho chủ đề giao diện) tính sẵn đến năm 2030.
- **GitHub tắt lịch chạy** của repo công khai sau 60 ngày không có commit. Khi đó vào tab Actions bấm "Enable workflow".
- GitHub Actions có thể trễ vài phút so với mốc 30 phút.
- Repo công khai: nhật ký Actions chỉ in số lượng, không in dữ liệu cá nhân. Khóa bí mật nằm trong GitHub Secrets và Supabase.
