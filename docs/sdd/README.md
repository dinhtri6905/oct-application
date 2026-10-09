# OCT Vision AI — SDD

Tài liệu này chuyển [product plan](../../plan.md) thành kế hoạch **Spec-Driven Development** (phát triển theo đặc tả). `plan.md` là nguồn ý tưởng và định hướng sản phẩm; bộ SDD này là chuẩn để triển khai và nghiệm thu MVP. Khi hai tài liệu khác nhau về phạm vi MVP, dùng SDD này và ghi lại quyết định thay đổi.

## Cách dùng

1. Đọc [spec.md](spec.md): phạm vi, hành vi, tiêu chí nghiệm thu và các giả định.
2. Đọc [design.md](design.md): hợp đồng dữ liệu, kiến trúc, giao diện và nguyên tắc an toàn.
3. Thực hiện [tasks.md](tasks.md) theo thứ tự phụ thuộc. Mỗi PR gắn mã yêu cầu (ví dụ `PRED-02`) và bằng chứng kiểm tra.
4. Khi yêu cầu thay đổi: sửa spec và tiêu chí nghiệm thu trước, cập nhật design/tasks, sau đó mới sửa code.

## Trạng thái và quyết định mặc định

**Trạng thái:** đã có [giao diện demo React](../../frontend/) cho năm màn hình MVP, lưu dữ liệu minh họa trong IndexedDB của trình duyệt. Build và kiểm tra luồng giao diện desktop/mobile đã chạy thành công. Backend và model thật chưa được kết nối; giao diện demo chưa đạt điều kiện phát hành MVP. Không coi ví dụ kết quả, tên model và số accuracy trong `plan.md` là dữ liệu đã được xác minh.

Để có thể bắt đầu thiết kế mà vẫn thay đổi được khi nhận model, MVP mặc định là công cụ nghiên cứu dùng ảnh OCT đã khử định danh, chạy trong môi trường kiểm soát, giao diện tiếng Việt. Mọi triển khai truy cập qua mạng cần xác thực và phân quyền trước khi lưu ảnh hoặc cho phép xem lịch sử. Nếu chỉ chạy máy cá nhân để trình diễn, cấu hình local có thể dùng một tài khoản nghiên cứu duy nhất.

Các quyết định phải chốt ở giai đoạn 0, trước khi tích hợp model:

| Mã | Quyết định cần chốt | Mặc định tạm thời / tác động |
| --- | --- | --- |
| D-01 | Người dùng và môi trường chạy | Nhà nghiên cứu, môi trường kiểm soát; không mở public khi chưa có xác thực. |
| D-02 | Model artifact, framework, class order | Chưa có; adapter inference phải khóa đúng thứ tự `CNV, DME, DRUSEN, NORMAL`. |
| D-03 | Tiền xử lý và loại ảnh OCT được chấp nhận | Lấy từ pipeline huấn luyện; không tự suy đoán resize, normalization hay chất lượng ảnh. |
| D-04 | Nguồn dữ liệu, quyền lưu ảnh và thời hạn lưu | Chỉ nhận ảnh được phép sử dụng, đã khử định danh; chính sách lưu/xóa cần xác nhận. |
| D-05 | Hiệu năng trên phần cứng đích | Đo thời gian inference thật, rồi đặt timeout và SLO phù hợp. |
| D-06 | Số liệu model công bố | Chỉ hiển thị khi có báo cáo kiểm định và nguồn; tạm ẩn `99.59%`. |

## Quy tắc hoàn thành một tính năng

`Spec + acceptance criteria → design/API/UI state → implementation → verification → review`. Không đánh dấu xong khi chỉ có giao diện tĩnh hoặc dữ liệu giả. Mock inference chỉ dùng trong môi trường phát triển, phải có nhãn hiển thị rõ và không được ghi vào lịch sử nghiên cứu thật.

## Tài liệu tham chiếu

- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) — mục tiêu khả năng tiếp cận mức AA.
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) — kiểm tra và lưu file tải lên.
- [WHO: Ethics and governance of AI for health](https://www.who.int/publications/i/item/9789240029200) — quyền riêng tư, minh bạch, quyền quyết định của con người.
