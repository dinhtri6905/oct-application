# Thiết kế giải pháp và giao diện — MVP

Thiết kế này triển khai các yêu cầu trong [spec.md](spec.md). Các lựa chọn công nghệ là đề xuất ban đầu; model artifact và môi trường chạy sẽ quyết định cấu hình cuối cùng ở giai đoạn 0.

## 1. Kiến trúc đề xuất

```text
React + TypeScript + Vite SPA
        │ HTTPS / JSON + multipart
        ▼
FastAPI (auth, validation, prediction, history, summary)
        ├── InferenceAdapter → model + đúng preprocessing đã huấn luyện
        ├── PostgreSQL → metadata, scores, model/preprocess version
        └── Private image storage → ảnh gốc/thumbnail theo chính sách lưu
```

Chọn SPA vì MVP là dashboard có tương tác, không cần nội dung công khai để SEO. Chọn backend Python nếu artifact model sử dụng Python; `InferenceAdapter` cô lập framework cụ thể và cho phép model giả trong phát triển. PostgreSQL phù hợp lịch sử có lọc/sắp xếp và phân quyền; bản demo một máy có thể dùng cấu hình đơn giản hơn nhưng phải giữ cùng hợp đồng API. File ảnh không đặt trong thư mục public của frontend.

Không đưa ảnh tới dịch vụ bên thứ ba. Không trả đường dẫn lưu trữ nội bộ cho browser. Nếu chạy qua mạng, middleware xác thực và kiểm tra quyền là bắt buộc trước các endpoint lịch sử/media; cấu hình local một người dùng phải được tách khỏi cấu hình triển khai.

### Ranh giới module

```text
frontend/
  app/         routing, layout, query state
  features/    prediction, history, dashboard, model-info
  components/  UI primitives, chart, image viewer
  styles/      tokens, typography, responsive rules
backend/
  api/         request/response schemas, auth
  domain/      prediction workflow, validation
  inference/   real/mock adapters, preprocessing
  persistence/ repository, migrations, private storage
  tests/
```

## 2. Hợp đồng API v1

| Method | Path | Mục đích |
| --- | --- | --- |
| `POST` | `/api/v1/predictions` | Multipart `image`; header `Idempotency-Key`; xác thực, kiểm tra, dự đoán và lưu một lần. |
| `GET` | `/api/v1/predictions` | Danh sách phân trang; `q`, `class`, `from`, `to`, `sort`, `cursor` hoặc `page` được đặc tả nhất quán. |
| `GET` | `/api/v1/predictions/{id}` | Chi tiết dự đoán được phép xem. |
| `DELETE` | `/api/v1/predictions/{id}` | Xóa bản ghi và dữ liệu ảnh theo chính sách. |
| `GET` | `/api/v1/predictions/{id}/image` | Trả ảnh qua kiểm tra quyền; cache private. |
| `GET` | `/api/v1/summary` | Tổng số, số theo lớp, danh sách gần đây cùng bộ dữ liệu History. |
| `GET` | `/api/v1/model` | Tên, phiên bản, đầu vào hỗ trợ, hạn chế và nguồn đánh giá. |

Response thành công của `POST` và `GET detail` dùng cùng schema:

```json
{
  "id": "uuid",
  "predicted_class": "CNV",
  "class_scores": {"CNV": 0.72, "DME": 0.15, "DRUSEN": 0.08, "NORMAL": 0.05},
  "model_name": "model-name",
  "model_version": "version",
  "preprocessing_version": "version",
  "created_at": "2026-10-09T10:00:00Z",
  "image": {"display_name": "oct.jpg", "width": 496, "height": 512, "size_bytes": 524288}
}
```

Ví dụ JSON chỉ mô tả cấu trúc, không phải kết quả mô hình. Backend xác minh đúng bốn khóa, giá trị hữu hạn trong `[0,1]`, tổng gần 1 theo sai số số thực đã định nghĩa, nhãn dự đoán có điểm cao nhất. Nếu artifact là model đa nhãn hoặc trả logits khác, cập nhật spec trước khi tích hợp; không ép dữ liệu để khớp giao diện.

Lỗi có schema `{code, message, request_id}` và HTTP status thích hợp: `400/413/415/422` cho đầu vào, `401/403` cho quyền, `404` cho kết quả không thấy, `503/504` cho inference không sẵn sàng/quá thời gian. Client hiện thông báo hữu ích từ `code`, không lộ trace nội bộ. Idempotency key giữ ổn định khi retry cùng ảnh; server chống tạo bản ghi trùng.

## 3. Dữ liệu và vòng đời

`Prediction`: `id`, `owner_id`, `storage_key`, `safe_display_name`, `mime`, `width`, `height`, `size_bytes`, `sha256` (nếu cần phát hiện trùng), `predicted_class`, bốn `class_scores`, `model_name`, `model_version`, `preprocessing_version`, `created_at`, `deleted_at` nếu dùng soft delete. Mặc định tạo `safe_display_name` từ ID, không lưu tên file gốc vì tên có thể chứa thông tin nhận dạng. Chỉ lưu kết quả thành công đã qua xác minh schema. Số liệu Dashboard được tính từ cùng bảng và cùng phạm vi quyền.

Luồng tạo: nhận file → giới hạn size/giải mã an toàn → loại metadata có thể nhận dạng khi lưu theo chính sách → tiền xử lý đúng phiên bản → inference → xác minh output → lưu ảnh/bản ghi bằng workflow có dọn dẹp nếu bước sau lỗi → trả kết quả. Cần quyết định rõ khi xóa: xóa vật lý hay giữ bản ghi ẩn theo yêu cầu nghiên cứu, thời hạn sao lưu và quyền audit.

Validation server không dựa chỉ vào đuôi file hoặc MIME do browser gửi. Đặt giới hạn byte, pixel, thời gian giải mã và số yêu cầu; tạo tên lưu ngẫu nhiên; phục vụ media qua endpoint có quyền. Cấu hình, secret và vị trí lưu file phải tách khỏi mã nguồn.

## 4. Trạng thái giao diện

```text
idle → selected → submitting → success
            └──────────────→ error → retry
selected → invalid → selected
success → selected (ảnh mới, xóa kết quả cũ)
```

Khi đổi ảnh, kết quả cũ biến mất và tác vụ đang chạy không được ghi đè preview mới. Với tác vụ đang chạy lâu, dùng thông điệp “Đang phân tích ảnh...” và chỉ hiển thị phần trăm nếu backend cung cấp tiến độ thật. Nút chọn file vẫn dùng được khi kéo thả không khả dụng. Dọn `object URL` khi đổi hoặc rời trang.

## 5. Thiết kế giao diện

### Nguyên tắc thị giác

- Cảm giác chuyên nghiệp, bình tĩnh, nhiều khoảng trắng; thông tin quan trọng được đọc theo thứ tự **ảnh → kết quả → bốn điểm → giới hạn sử dụng**.
- Nền `#F8FAFC`, card trắng, chữ chính `#0F172A`, chữ phụ `#475569`, màu hành động `#175CD3`. Dùng một màu hành động chính và màu lớp bệnh chỉ ở badge/đồ thị; giữ nhãn chữ đi kèm.
- Font Inter hoặc font hệ thống tương đương có dấu tiếng Việt rõ; body 16px, tiêu đề trang 28–32px, nhãn phụ 14px; khoảng cách theo bước 4/8px.
- Card bo góc 12–16px, viền mảnh, bóng rất nhẹ; tránh gradient, icon và animation làm mất tập trung khi đọc ảnh y khoa.
- Các cặp màu chính đã được tính sơ bộ: chữ trắng trên `#175CD3` ≈ 5.99:1, `#0F172A` trên `#F8FAFC` ≈ 17.06:1, `#475569` trên `#F8FAFC` ≈ 7.24:1. Vẫn phải kiểm tra mọi badge và trạng thái tương tác trên UI thực tế trước khi khóa thiết kế.

### Bố cục các trang

| Trang | Desktop | Mobile |
| --- | --- | --- |
| Dashboard | Tiêu đề + CTA Dự đoán, hàng số liệu, danh sách gần đây | CTA đầu trang, card số liệu 2 cột hoặc cuộn hợp lý, danh sách dạng card |
| Prediction | Hai cột: vùng ảnh rộng và panel kết quả; chiều rộng nội dung tối đa khoảng 1280px | Một cột: upload → preview → nút hành động → kết quả → giải thích giới hạn |
| History | Bộ lọc gọn trên bảng; hàng bấm được, nhãn và ngày dễ quét | Bộ lọc trong panel; từng kết quả là card, không ép bảng ngang |
| Detail | Ảnh và kết quả song song, metadata bên dưới | Ảnh trước, kết quả sau; nút Xóa tách khỏi thao tác chính |
| Model Info | Nội dung ngắn về model, đầu vào, giới hạn và nguồn | Các mục xếp dọc, không có chỉ số chưa xác minh |

### Thành phần và hành vi

`AppShell`, `PageHeader`, `PrimaryButton`, `ImageDropzone`, `ImagePreview`, `ResultSummary`, `ScoreList`, `ClassBadge`, `PredictionCard`, `HistoryFilters`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `ResearchNotice`. Tạo component khi có lặp lại hoặc có trạng thái phức tạp; tránh dựng thư viện UI lớn trước khi có màn hình thật.

Focus ring rõ; nút có kích thước chạm thoải mái; error gắn với input; modal giữ/khôi phục focus; ảnh OCT có alt mô tả chức năng, không giả diễn giải bệnh lý. Trên màn hình nhỏ, ưu tiên hành động và nhãn; trên màn hình lớn, không kéo dãn ảnh làm sai tỷ lệ. Trạng thái loading dùng skeleton nơi có cấu trúc cố định, còn inference dùng thông báo trạng thái.

## 6. Kiểm chứng thiết kế

- Review wireframe cho 5 trang ở 390px, 768px, 1440px, cả empty/loading/error/success.
- Kiểm thử tác vụ: người mới tìm được nút Dự đoán, upload ảnh, xem kết quả và mở lại từ lịch sử mà không cần hướng dẫn.
- Đối chiếu màu sắc, focus, keyboard và reflow với [WCAG 2.2 AA](https://www.w3.org/WAI/WCAG22/quickref/).
- So sánh dữ liệu API và UI, kiểm tra số trong Dashboard sau thêm/xóa, kiểm tra không rò ảnh giữa tài khoản.

Tham chiếu công nghệ: [React + TypeScript](https://react.dev/learn/typescript), [Vite](https://vite.dev/guide/), [FastAPI UploadFile](https://fastapi.tiangolo.com/tutorial/request-files/).
