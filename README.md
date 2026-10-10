# OCT Vision AI

Giao diện mẫu cho web app phân loại ảnh OCT võng mạc. Bản hiện tại triển khai các luồng giao diện bằng dữ liệu demo trong trình duyệt; chưa kết nối mô hình AI hoặc backend. Mọi điểm số trên giao diện chỉ để xem trước luồng sử dụng.

## Các trang hiện có

- Tổng quan, dự đoán một ảnh và dự đoán nhiều ảnh (demo).
- Lịch sử với tìm kiếm, lọc theo lớp/thời gian/điểm, sắp xếp, phân trang; chi tiết với tải JSON, xóa và phản hồi tham khảo.
- Phân tích dữ liệu demo, thông tin mô hình và Cài đặt (xóa dữ liệu, số bản ghi mỗi trang).
- Đăng nhập và Đăng ký là giao diện xem trước. Form kiểm tra đầu vào nhưng không tạo tài khoản hoặc lưu mật khẩu.

Grad-CAM/heatmap có màn hình chờ kết nối model. Phản hồi và biểu đồ hiện tại không phải dữ liệu nghiên cứu đã kiểm chứng.

## Chạy giao diện

Yêu cầu Node.js phiên bản tương thích với Vite hiện dùng.

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Mở http://127.0.0.1:5173/ . Trên hệ điều hành khác có thể dùng `npm` thay `npm.cmd`.

## Kiểm tra

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui
```

`test:ui` dùng Chrome có sẵn để kiểm tra luồng giao diện desktop/mobile, upload, batch, phản hồi, auth xem trước và xóa dữ liệu; ảnh chụp nằm trong `.artifacts/`. Cần chạy `npm.cmd run dev` trước khi thực hiện kiểm tra này.

## Tài liệu

- [Kế hoạch sản phẩm](plan.md)
- [Đặc tả SDD](docs/sdd/README.md)
- [Thiết kế hệ thống và giao diện](docs/sdd/design.md)
- [Backlog triển khai](docs/sdd/tasks.md)

Ảnh tải lên và kết quả demo được lưu bằng IndexedDB trong trình duyệt hiện tại. Dữ liệu này không phải kết quả nghiên cứu. Khi có model artifact và mã tiền xử lý, bước tiếp theo là triển khai backend và kết nối suy luận thật theo SDD.
