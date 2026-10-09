# Đặc tả sản phẩm — MVP

## 1. Mục tiêu và phạm vi

Người nghiên cứu có thể tải một ảnh OCT, chủ động chạy mô hình phân loại bốn lớp, xem kết quả và truy lại lần dự đoán. Sản phẩm phục vụ nghiên cứu/giáo dục, không dùng để chẩn đoán hoặc quyết định điều trị.

**MVP gồm:** Prediction, History, Prediction Detail, Dashboard cơ bản, Model Information cơ bản, responsive UI, loading/empty/error states, quản lý dữ liệu tối thiểu.

**Sau MVP:** Grad-CAM, analytics nâng cao, ground truth đã kiểm duyệt, batch prediction, export, dark mode, profile và settings mở rộng. Dashboard MVP chỉ có tổng số, số theo lớp và các lần gần đây; biểu đồ xu hướng chuyển sang V1 để tránh trùng chức năng với Analytics.

## 2. Người dùng và hành trình

**Persona chính:** thành viên nhóm nghiên cứu có quyền sử dụng ảnh OCT đã khử định danh. Các vai trò lâm sàng, bệnh nhân và quản trị nhiều tổ chức chưa thuộc MVP.

`Dashboard → Prediction → chọn ảnh → xem trước → nhấn Dự đoán → xem kết quả → xem chi tiết/lịch sử`.

Đường vào ngắn nhất tới chức năng chính: từ mọi trang, người dùng thấy nút hoặc mục điều hướng **Dự đoán ảnh**. Trang đầu khi chưa có dữ liệu có CTA này.

## 3. Yêu cầu chức năng và tiêu chí nghiệm thu

| ID | Yêu cầu | Tiêu chí nghiệm thu kiểm tra được |
| --- | --- | --- |
| NAV-01 | Điều hướng | Dashboard, Dự đoán, Lịch sử và Thông tin mô hình có tên rõ, trang hiện tại được đánh dấu; trên mobile mở bằng menu có thể dùng bàn phím. |
| PRED-01 | Chọn và xem trước ảnh | Chọn bằng file picker hoặc kéo thả; hiển thị ảnh, tên file, kích thước pixel và dung lượng; có Thay ảnh và Xóa ảnh; chưa tự gọi model. |
| PRED-02 | Kiểm tra file | Chấp nhận JPG/JPEG/PNG theo giới hạn cấu hình; client báo lỗi sớm, server xác thực loại nội dung, khả năng giải mã, kích thước và giới hạn tài nguyên; lỗi nói rõ cách sửa. |
| PRED-03 | Chạy dự đoán | Chỉ gửi khi người dùng nhấn Dự đoán; khóa nút trong lúc chạy, chống gửi trùng; hiển thị trạng thái đang xử lý thực, có lỗi timeout/mất kết nối và hành động thử lại. |
| PRED-04 | Hiển thị kết quả | Hiện nhãn CNV/DME/DRUSEN/NORMAL, tên đầy đủ, bốn điểm mô hình theo thứ tự cố định, thời điểm và phiên bản model; số liệu từ API thật, không dùng placeholder. |
| PRED-05 | Diễn giải kết quả | Gắn nhãn **điểm mô hình** cho các giá trị 0–100%; không gọi là xác suất chẩn đoán, không dùng ngưỡng High/Moderate/Low khi chưa được hiệu chuẩn và kiểm định. Luôn có dòng “Chỉ phục vụ nghiên cứu; cần chuyên gia đánh giá”. |
| PRED-06 | Ảnh ngoài phạm vi | Nếu chưa có bộ phát hiện ảnh không phải OCT, UI không tuyên bố đã xác nhận đó là ảnh OCT; mô tả rõ “Chỉ tải ảnh OCT phù hợp với mô hình”. Khi model lỗi hoặc từ chối đầu vào, không tạo kết quả thành công. |
| HIST-01 | Lưu và xem lịch sử | Mỗi dự đoán thành công được lưu đúng một lần; danh sách có thumbnail bảo vệ truy cập, tên hiển thị an toàn, nhãn, điểm cao nhất, thời gian; tải lại trang vẫn thấy dữ liệu của tài khoản được phép. |
| HIST-02 | Tìm/lọc/sắp xếp | Tìm theo tên file, lọc lớp và khoảng thời gian, sắp xếp mới nhất/cũ nhất; tổng kết quả và trạng thái không tìm thấy rõ ràng; trạng thái tìm kiếm có thể giữ qua URL. |
| HIST-03 | Chi tiết | Mở được ảnh gốc được phép xem, bốn điểm, phiên bản model, thời gian, mã dự đoán; đường dẫn trực tiếp hoạt động sau khi tải lại. |
| HIST-04 | Xóa | Hộp thoại xác nhận nêu phạm vi xóa; xóa bản ghi và ảnh/ảnh dẫn xuất do hệ thống lưu theo chính sách dữ liệu; sau xóa, link chi tiết trả trạng thái không tìm thấy. |
| DASH-01 | Tổng quan | Tổng số dự đoán, số theo bốn lớp và tối đa 5 dự đoán gần đây lấy từ cùng nguồn dữ liệu với lịch sử; số liệu thay đổi sau tạo/xóa; trạng thái chưa có dữ liệu có CTA. |
| MODEL-01 | Thông tin model | Hiện tên, phiên bản, bốn nhãn, loại đầu vào được hỗ trợ, giới hạn sử dụng và nguồn báo cáo đánh giá nếu có; không hiện accuracy chưa được chứng thực. |
| DATA-01 | Ranh giới dữ liệu | Người dùng chỉ thấy dữ liệu họ được phép xem; ảnh không có URL công khai; log và analytics không chứa ảnh, metadata nhận dạng hoặc tên file gốc. |

### Tình huống lỗi bắt buộc

- File sai định dạng, file hỏng, quá giới hạn hoặc ảnh có kích thước vượt ngưỡng giải mã.
- Model chưa sẵn sàng, xử lý quá thời gian, API trả lỗi hoặc mất mạng.
- Không có lịch sử, không có kết quả khớp bộ lọc, link chi tiết đã bị xóa.
- Nhấn Dự đoán nhiều lần, đổi ảnh trong khi tác vụ đang chạy, tải lại trang giữa lúc xử lý: ứng dụng không tạo bản ghi trùng hoặc hiển thị kết quả của ảnh cũ.

## 4. Yêu cầu phi chức năng

| ID | Yêu cầu | Cách xác nhận |
| --- | --- | --- |
| UX-01 | Giao diện sáng, rõ phân cấp thông tin, ưu tiên ảnh và kết quả | Review màn hình 390px, 768px, 1440px; thử tác vụ chính với người chưa biết ứng dụng. |
| UX-02 | Truy cập được bằng bàn phím và công nghệ hỗ trợ | Mục tiêu WCAG 2.2 AA: focus rõ, thứ tự tab hợp lý, nhãn form, text thay thế phù hợp, không truyền đạt chỉ bằng màu; kiểm tra tự động và thủ công. |
| UX-03 | Mọi thao tác có phản hồi | Loading/empty/error/success cho từng trang; thanh tiến độ chỉ dùng nếu có số liệu tiến độ thật. |
| REL-01 | Dữ liệu nhất quán | Tạo/xóa dự đoán cập nhật Dashboard và History; không có bản ghi thành công thiếu bốn điểm hoặc phiên bản model. |
| SEC-01 | Upload và truy cập ảnh an toàn | Server kiểm tra file, giới hạn dung lượng/tài nguyên, tạo khóa lưu ngẫu nhiên, kiểm tra quyền khi xem/xóa, không phục vụ ảnh từ đường dẫn công khai. |
| OBS-01 | Có thể chẩn đoán lỗi hệ thống | Log có request ID, mã lỗi, thời lượng và model version; không log nội dung ảnh hay thông tin nhận dạng. |

## 5. Quy tắc nội dung

- Dùng tiếng Việt nhất quán ở UI MVP; giữ mã lớp gốc CNV/DME/DRUSEN/NORMAL kèm tên giải thích. Tên bệnh và nội dung giáo dục cần được chuyên gia nội dung rà soát trước khi phát hành.
- `NORMAL` nghĩa là lớp mà model chọn trong phạm vi bốn lớp; không viết “mắt bình thường” hoặc “không có bệnh”.
- Không dùng màu đỏ/xanh làm nguồn thông tin duy nhất. Số và nhãn luôn hiện bằng chữ.
- Không dùng số thống kê mẫu, ảnh mẫu hoặc kết quả mock theo cách khiến người dùng tưởng là dữ liệu nghiên cứu thật.

## 6. Điều kiện phát hành MVP

Tất cả mã yêu cầu MVP ở trên đạt tiêu chí nghiệm thu; tác vụ chính hoàn thành trên desktop và mobile; luồng lỗi được kiểm tra; model thực và preprocessing được xác nhận; chính sách lưu/xóa dữ liệu được ghi rõ; kiểm tra quyền truy cập ảnh qua URL trực tiếp đạt; disclaimer hiển thị cạnh kết quả. Grad-CAM và analytics nâng cao không phải điều kiện hoàn thành MVP.
