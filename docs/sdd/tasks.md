# Kế hoạch thực hiện và cổng nghiệm thu

Các việc bên dưới là backlog có thứ tự. Chỉ chuyển giai đoạn khi điều kiện ra của giai đoạn trước đạt; phần giao diện có thể phát triển bằng fixture trong lúc chuẩn bị model, nhưng không ghi fixture là kết quả thật.

## Giai đoạn 0 — Chốt đầu vào và rủi ro

| ID | Việc | Yêu cầu liên quan | Đầu ra và điều kiện ra |
| --- | --- | --- | --- |
| T00 | Nhận artifact model, mã preprocessing, thứ tự lớp, mẫu ảnh hợp lệ/không hợp lệ | PRED-02, PRED-04, MODEL-01 | Chạy được inference độc lập trên mẫu; ghi kết quả, thời gian, phiên bản. |
| T01 | Chốt người dùng, môi trường chạy, quyền sử dụng ảnh và chính sách lưu/xóa | DATA-01, SEC-01 | Có quyết định ghi trong `README.md` SDD; phân biệt local demo và triển khai qua mạng. |
| T02 | Chốt giới hạn file, timeout và tiêu chí hiệu năng từ model/hardware thật | PRED-02, PRED-03, OBS-01 | Các giá trị cấu hình có lý do và ca thử biên. |
| T03 | Duyệt nội dung bệnh lý, disclaimer, cách gọi điểm mô hình | PRED-05, MODEL-01 | UI copy được rà soát, không có claim lâm sàng chưa chứng minh. |

**Cổng 0:** Hợp đồng model và chính sách dữ liệu đủ rõ để đóng băng bản đặc tả MVP. Nếu artifact chưa đến, có thể làm T10–T13 và T20 bằng fixture có nhãn demo; T21–T22 chưa thể nghiệm thu với model thật.

## Giai đoạn 1 — Đặc tả UI và design system

| ID | Việc | Yêu cầu liên quan | Đầu ra và điều kiện ra |
| --- | --- | --- | --- |
| T10 | Sơ đồ trang, điều hướng và wireframe 5 trang | NAV-01, UX-01 | Review ở desktop/mobile; có đường vào tác vụ chính và empty state. |
| T11 | Tokens màu, chữ, spacing, component cơ bản | UX-01, UX-02 | Áp dụng nhất quán; kiểm tra contrast/focus ban đầu. |
| T12 | Thiết kế Prediction đủ mọi trạng thái | PRED-01…06, UX-03 | Wireframe idle/selected/invalid/loading/success/error ở 390px và 1440px. |
| T13 | Thiết kế History, Detail, Dashboard và Model Info | HIST-01…04, DASH-01, MODEL-01 | Có dữ liệu ngắn/dài, trống, lỗi, lọc không có kết quả; mobile không tràn ngang. |

**Cổng 1:** Review tác vụ với người đại diện nhóm nghiên cứu; giải quyết lỗi điều hướng và câu chữ trước khi dựng giao diện.

## Giai đoạn 2 — Nền tảng và luồng dự đoán

| ID | Việc | Yêu cầu liên quan | Đầu ra và điều kiện ra |
| --- | --- | --- | --- |
| T20 | Khởi tạo frontend/backend, CI tối thiểu, cấu hình môi trường | UX-01, OBS-01 | Chạy local bằng lệnh ghi trong README; lint, typecheck và build đạt. |
| T21 | API schema, model adapter, validation server, idempotency | PRED-02…04, SEC-01 | Contract test cho bốn lớp, file lỗi, timeout và retry; không tạo record trùng. |
| T23 | Dữ liệu và private image storage | DATA-01, REL-01 | Ảnh không mở được nếu không có quyền; bản ghi lưu đủ model/preprocessing version. |
| T22 | Frontend upload/preview/state machine/result | PRED-01…06, UX-03 | Luồng end-to-end với model thật; mock chỉ trong dev; đổi ảnh không hiện kết quả cũ. |

**Cổng 2:** Người dùng dự đoán một ảnh hợp lệ và thấy bốn điểm thật; các lỗi đầu vào và model được giải thích; không lộ ảnh qua URL public.

## Giai đoạn 3 — Lịch sử và tổng quan

| ID | Việc | Yêu cầu liên quan | Đầu ra và điều kiện ra |
| --- | --- | --- | --- |
| T30 | History list, search/filter/sort/pagination | HIST-01, HIST-02 | Danh sách đúng phạm vi quyền, reload và URL filter hoạt động. |
| T31 | Detail, private image endpoint và xóa có xác nhận | HIST-03, HIST-04, SEC-01 | Link trực tiếp hoạt động; xóa dọn dữ liệu theo chính sách; tài khoản khác bị từ chối. |
| T32 | Dashboard summary và recent | DASH-01, REL-01 | Số liệu khớp History sau tạo/xóa; empty state có CTA. |
| T33 | Model Info lấy từ metadata đã xác minh | MODEL-01 | Không hiển thị accuracy hoặc tên kiến trúc mang tính ví dụ. |

**Cổng 3:** Tác vụ tạo → xem lịch sử → xem chi tiết → xóa đi hết một vòng, kể cả sau tải lại trang.

## Giai đoạn 4 — Hoàn thiện và phát hành thử

| ID | Việc | Yêu cầu liên quan | Đầu ra và điều kiện ra |
| --- | --- | --- | --- |
| T40 | Kiểm tra responsive, keyboard, screen reader, contrast | UX-01, UX-02 | Không có lỗi WCAG 2.2 AA nghiêm trọng trong các luồng chính; kiểm tra thủ công. |
| T41 | Kiểm tra bảo mật upload, phân quyền, logging, xóa dữ liệu | SEC-01, DATA-01, OBS-01 | Ca thử file giả mạo, quá lớn, URL ảnh từ tài khoản khác, dữ liệu trong log đạt. |
| T42 | Kiểm tra model và nội dung hiển thị với bộ ảnh được phép dùng | PRED-04, PRED-05, PRED-06 | Kết quả UI khớp adapter; báo cáo rõ phạm vi kiểm thử và giới hạn. |
| T43 | Tài liệu vận hành và review cuối | Tất cả MVP | README chạy local, cấu hình, backup/xóa, known limitations; đối chiếu từng mã spec với bằng chứng. |

**Cổng phát hành MVP:** đạt [điều kiện phát hành](spec.md#6-điều-kiện-phát-hành-mvp). Nếu chỉ có UI và fixture, gọi là prototype; nếu có model thật nhưng thiếu bảo vệ ảnh/lịch sử, chưa phát hành bản dùng dữ liệu nghiên cứu.

## Backlog sau MVP

**V1:** Grad-CAM sau khi kiểm tra phù hợp kiến trúc model và giới hạn diễn giải; biểu đồ xu hướng/analytics; tải kết quả; ground truth có nguồn và người kiểm duyệt. **V2:** batch prediction, export, confusion matrix/F1 chỉ từ nhãn đã xác minh, tìm kiếm nâng cao, so sánh kết quả. Một số phần đã có giao diện demo và dữ liệu mô phỏng, nhưng chưa được xem là hoàn thành chức năng thật. Mỗi mục cần spec và điều kiện nghiệm thu riêng trước khi kết nối backend/model.
