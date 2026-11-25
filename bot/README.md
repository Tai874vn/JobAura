# JobAura Traffic & Smoke Bot

Thư mục `bot/` chứa hai công cụ tự động chạy vào trang JobAura đang hoạt động (mặc định `https://www.jobaura.site`) để:

1. **Kiểm tra khói (smoke test):** xác nhận các trang chính, luồng đăng nhập và API công khai vẫn chạy ổn định, không vỡ giao diện hay báo lỗi.
2. **Tạo lưu lượng thật (traffic):** sinh lượt tải trang trình duyệt và lời gọi API thật để **Sentry** thu thập dữ liệu tốc độ (Web Vitals, traces) phục vụ báo cáo tốt nghiệp.

---

## 1. Mỗi bot làm gì?

### Browser Bot (`bot/browser-bot.mjs`)
- Dùng **Playwright** mở trình duyệt Chromium thật (mặc định chạy ẩn, thêm `--headed` để xem trực tiếp).
- Chạy qua 4 vai trò:
  - **visitor (khách):** `/welcome`, `/jobs` (tìm kiếm từ khóa, mở bộ lọc, sang trang 2), chi tiết `/jobs/<id>`, `/hiring-posts` (lọc), chi tiết `/hiring-posts/<id>`, và trang hồ sơ `/profile/<id>`.
  - **candidate (ứng viên):** đăng nhập qua form `/auth/login`, vào `/recommendations/jobs`, `/saved`, `/contracts`, `/wallet`, `/connections`, mở khung Chat và chuyển qua lại giữa các phòng chat.
  - **employer (nhà tuyển dụng):** đăng nhập, vào `/my-hiring-posts`, mở trang ứng viên của bài đăng đầu tiên, vào `/candidates` (tìm kiếm), `/contracts`, `/wallet`.
  - **admin (quản trị viên):** đăng nhập, vào `/admin`, `/admin/users`, `/admin/categories`.
- Tự động lấy ID thật từ API công khai (`GET /api/jobs`, `GET /api/hiring-posts`), không gắn cứng ID trong code.
- Đo cho từng bước: **TTFB**, **DOMContentLoaded (DCL)**, **Load**, **LCP**, **CLS**, kèm danh sách lỗi console, request lỗi (`status >= 500` hoặc lỗi mạng) và kiểm tra màn hình lỗi (error boundary).
- Nếu bước nào lỗi, bot tự chụp ảnh màn hình lưu vào `bot/results/<timestamp>/` và trả mã thoát `1`.

### API Load Bot (`bot/api-bot.mjs`)
- Viết bằng Node thuần (dùng `fetch` có sẵn, không cần cài thư viện ngoài).
- Gọi lặp lại các API `GET` công khai:
  - `/api/jobs`
  - `/api/jobs/paginated-search?page=1&pageSize=10&sort=newest`
  - `/api/hiring-posts?page=1&pageSize=10&sort=newest`
  - `/api/hiring-posts/facets`
  - `/api/categories`
  - `/api/skill/search?q=react&limit=10`
  - `/api/occupations?q=developer&limit=10`
  - `/api/jobs/details/<id>` và `/api/hiring-posts/<id>` (lấy ID thật từ danh sách)
- Báo cáo theo từng endpoint: số request (`count`), độ trễ trung vị (`p50`), phân vị 95 (`p95`), lớn nhất (`max`), tỉ lệ lỗi và tỉ lệ bị giới hạn `429`.

---

## 2. Cài đặt lần đầu

Chạy hai lệnh sau tại thư mục gốc của repo frontend (`JobAura/`):

```powershell
npm install
npx playwright install chromium
```

*(API bot không cần Playwright, chỉ cần Node.js 18+.)*

---

## 3. Cách đặt biến môi trường trong PowerShell

Thông tin đăng nhập **chỉ** lấy từ biến môi trường, tuyệt đối không lưu mật khẩu trong code hay file cấu hình. Nếu thiếu biến của vai trò nào, bot sẽ tự bỏ qua vai trò đó và in thông báo `[skip]`.

Ví dụ trong PowerShell (chỉ có hiệu lực cho cửa sổ terminal hiện tại):

```powershell
# Tài khoản ứng viên (candidate)
$env:BOT_CANDIDATE_EMAIL = "candidate@example.com"
$env:BOT_CANDIDATE_PASSWORD = "<mat-khau-ung-vien>"

# Tài khoản nhà tuyển dụng (employer)
$env:BOT_EMPLOYER_EMAIL = "employer@example.com"
$env:BOT_EMPLOYER_PASSWORD = "<mat-khau-nha-tuyen-dung>"

# Tài khoản quản trị (admin)
$env:BOT_ADMIN_EMAIL = "admin@example.com"
$env:BOT_ADMIN_PASSWORD = "<mat-khau-admin>"
```

Khi chạy xong, có thể xóa biến khỏi phiên làm việc nếu muốn:

```powershell
Remove-Item Env:BOT_CANDIDATE_PASSWORD, Env:BOT_EMPLOYER_PASSWORD, Env:BOT_ADMIN_PASSWORD -ErrorAction SilentlyContinue
```

---

## 4. Các lệnh chạy mẫu

### Chạy Browser Bot

```powershell
# Chạy mặc định 1 vòng cho tất cả vai trò có đủ biến môi trường vào https://www.jobaura.site
npm run bot

# Chỉ chạy vai trò khách (không cần mật khẩu), lặp 3 vòng để gom nhiều mẫu Web Vitals
npm run bot -- --roles visitor --rounds 3

# Chạy kèm cửa sổ trình duyệt để quan sát trực tiếp
npm run bot -- --roles visitor,candidate --headed

# Chạy vào bản local hoặc môi trường staging, giãn cách 2 giây mỗi bước
npm run bot -- --base http://localhost:3000 --delay 2000 --rounds 1
```

### Chạy API Load Bot

```powershell
# Chạy mặc định: 5 người dùng ảo, trong 60 giây, giới hạn tổng 1.5 req/giây (~90 req/phút)
npm run bot:api

# Chạy tải nhẹ 2 phút để thu nhiều trace API
npm run bot:api -- --users 8 --duration 120 --rate 1.5

# Chạy vào môi trường khác
npm run bot:api -- --base http://localhost:3000 --users 5 --duration 30 --rate 1.5
```

---

## 5. Cách đọc file kết quả (`summary.md` và `summary.json`)

Mỗi lần chạy, kết quả được lưu trong `bot/results/` (thư mục này đã được thêm vào `.gitignore`):
- Browser bot: `bot/results/<timestamp>/summary.md`, `summary.json`, và các file `.png` nếu có bước bị `FAIL`.
- API bot: `bot/results/<timestamp>-api/summary.md` và `summary.json`.

### Ý nghĩa các chỉ số Browser Bot (chuẩn Core Web Vitals)
- **TTFB (Time to First Byte):** thời gian chờ byte đầu tiên từ server. Tốt: **≤ 800 ms**.
- **DCL (DOMContentLoaded):** thời gian dựng xong cây HTML ban đầu.
- **LCP (Largest Contentful Paint):** thời gian hiển thị phần tử nội dung lớn nhất trên màn hình. Tốt: **≤ 2500 ms**, cần cải thiện: 2500–4000 ms, kém: > 4000 ms.
- **CLS (Cumulative Layout Shift):** độ giật/nhảy bố cục khi trang đang tải. Tốt: **≤ 0.1**.
- **Load:** tổng thời gian tải xong toàn bộ tài nguyên trang.
- **Errors:** số lỗi console, lỗi JavaScript chưa bắt, request lỗi `>= 500`, lỗi mạng hoặc màn hình error boundary.

### Ý nghĩa các chỉ số API Bot
- **Count:** tổng số request đã gửi tới endpoint đó.
- **p50:** 50% request nhanh hơn mức này (độ trễ điển hình).
- **p95:** 95% request nhanh hơn mức này (phản ánh các request chậm khi có tải).
- **Max:** request chậm nhất.
- **Error Rate:** tỉ lệ request lỗi mạng hoặc HTTP `>= 400`.
- **429 Share:** tỉ lệ bị backend chặn vì vượt giới hạn tốc độ (`429 Too Many Requests`). Nếu khác `0%`, hãy giảm `--rate` (ví dụ xuống `1.0`).

---

## 6. Quy tắc an toàn

- **Chỉ đọc (Read-Only):** Bot không bao giờ gửi form tạo, sửa hay xóa dữ liệu (không ứng tuyển, không gửi tin nhắn chat, không gửi đề xuất/hợp đồng, không like hay bình luận). Form đăng nhập `/auth/login` là form duy nhất bot gửi đi.
- **Tôn trọng giới hạn tốc độ (Rate Limit):** Backend giới hạn **120 request/phút/IP**.
  - Browser bot mặc định nghỉ `--delay 1500` ms giữa các bước.
  - API bot mặc định giới hạn tổng `--rate 1.5` req/s (tương đương ~90 req/phút) và tối đa `--users 20`.
  - Không chạy song song nhiều phiên bot từ cùng một IP để tránh chạm ngưỡng `429`.

---

## 7. Cách tìm và lọc traffic của bot trên Sentry

Mọi request do hai bot gửi đều được gắn hai dấu hiệu nhận diện:
- Header HTTP: `x-jobaura-bot: 1`
- User-Agent kết thúc bằng: `JobAuraBot/1.0`

Trong **Sentry** (mục **Insights → Performance / Traces / Web Vitals** hoặc **Issues**):
- **Xem riêng dữ liệu do bot tạo ra:**
  - Lọc theo User-Agent trong truy vấn tìm kiếm:
    ```text
    user_agent:*JobAuraBot/1.0*
    ```
  - Hoặc trên backend traces/spans có lưu header request:
    ```text
    http.request.header.x_jobaura_bot:1
    ```
- **Loại bỏ dữ liệu bot để chỉ xem người dùng thật:**
  ```text
  !user_agent:*JobAuraBot/1.0*
  ```
- **Lưu ý khi lấy số liệu báo cáo:** Trong màn hình **Frontend → Web Vitals** của Sentry, chọn đúng môi trường `production` và khoảng thời gian trùng với lúc chạy bot (ví dụ `Last 1 hour` hoặc `Last 24 hours`) để xem biểu đồ LCP, CLS, TTFB và p50/p95 từng trang.
