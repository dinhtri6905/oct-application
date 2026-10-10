# OCT Vision AI

Web app nghiên cứu phân loại ảnh OCT võng mạc bằng mô hình MaxViT đã huấn luyện. Ứng dụng có tài khoản, phân quyền dữ liệu, dự đoán một ảnh hoặc nhiều ảnh, lịch sử, thống kê và giao diện sáng/tối.

## Chạy bằng Docker Compose

Yêu cầu Docker Desktop hoặc Docker Engine cùng Compose. Đặt `model/maxvit_oct.keras` đúng như cấu trúc dự án; `model/maxvit_oct.ipynb` là nguồn đối chiếu kiến trúc và tiền xử lý.

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

Đổi `POSTGRES_PASSWORD` trong `.env` trước khi dùng dữ liệu thật. Mở **http://localhost:8088** (hoặc cổng `APP_PORT`). Tạo tài khoản tại `/signup`; trang Tổng quan và mọi dữ liệu chỉ mở khi đã đăng nhập. Dừng bằng `docker compose down`; dữ liệu PostgreSQL và ảnh vẫn nằm trong Docker volumes. `docker compose down -v` xóa các volumes đó.

Ba service: `frontend` (Nginx phục vụ React và proxy `/api`), `backend` (FastAPI + TensorFlow/Keras) và `db` (PostgreSQL). Model được mount read-only, ảnh trong volume riêng, metadata và tài khoản trong PostgreSQL. Backend không công bố cổng ra ngoài; trình duyệt truy cập API cùng nguồn qua Nginx. Khi phục vụ qua HTTPS, đặt `COOKIE_SECURE=true` và cấu hình TLS ở reverse proxy.

## Luồng dữ liệu và model

- Đăng ký/đăng nhập tạo phiên trong cookie HttpOnly, SameSite Strict; thao tác ghi yêu cầu CSRF token. Mật khẩu được băm bằng Argon2.
- Ảnh JPG/PNG tối đa 10 MB và 20 triệu pixel được kiểm tra ở backend; bản lưu được mã hóa lại để bỏ metadata ảnh. Tên file gốc không được lưu. Mỗi tài khoản chỉ xem, sửa phản hồi và xóa kết quả/ảnh của mình.
- `backend/app/maxvit_layers.py` được trích nguyên định nghĩa lớp tùy chỉnh từ notebook. Preprocessing: decode ảnh, chuyển về 3 kênh RGB, resize bilinear `224×224`, chia `255`. Bốn lớp theo thứ tự `CNV, DME, DRUSEN, NORMAL`. Dự đoán lấy trung bình điểm của ảnh gốc và ảnh lật ngang, giống bước test trong notebook. Model lưu mỗi bản ghi kèm phiên bản và cách tiền xử lý.
- Kết quả chỉ phục vụ nghiên cứu và giáo dục, không dùng làm chẩn đoán lâm sàng. Grad-CAM hiện chưa có pipeline được xác minh nên UI không tạo heatmap giả.

Nếu model không nạp được, ứng dụng vẫn cho phép đăng nhập/xem dữ liệu, nhưng endpoint dự đoán trả `503`; xem `docker compose logs backend` và trạng thái ở trang Thông tin mô hình.

## Phát triển và kiểm thử

Frontend phát triển trực tiếp với Vite; `/api` được proxy tới backend tại `127.0.0.1:8000`:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Kiểm tra frontend và hợp đồng API (API test dùng SQLite và stub inference, không đại diện cho điểm model thật):

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui
cd ..\backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.venv\Scripts\python.exe -m pytest -q tests
```

`test:ui` cần Vite đang chạy và Chrome có sẵn; mock API chỉ tồn tại trong bài kiểm tra. Kiểm thử model thật cần chạy Compose và gửi ảnh OCT hợp lệ đã được phép sử dụng. Endpoint API tại `/docs` qua backend nội bộ; health qua `/api/health` trên frontend.

## Tài liệu

- [Kế hoạch sản phẩm](plan.md)
- [Đặc tả SDD](docs/sdd/README.md)
- [Thiết kế hệ thống](docs/sdd/design.md)
- [Backlog và cổng nghiệm thu](docs/sdd/tasks.md)
