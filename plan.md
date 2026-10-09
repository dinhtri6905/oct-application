# OCT Vision AI – Web Application Product Plan

## 1. Mục tiêu của ứng dụng

Xây dựng một web application hiện đại, trực quan và dễ sử dụng để hỗ trợ phân loại ảnh OCT võng mạc bằng mô hình AI đã được huấn luyện.

Ứng dụng tập trung vào trải nghiệm sử dụng và khả năng trình bày kết quả dự đoán một cách rõ ràng, chuyên nghiệp và phù hợp với một sản phẩm Medical AI phục vụ nghiên cứu.

Hệ thống hỗ trợ 4 lớp dự đoán:

- **CNV** – Choroidal Neovascularization
- **DME** – Diabetic Macular Edema
- **DRUSEN**
- **NORMAL**

Mục tiêu của phiên bản đầu tiên là xây dựng một ứng dụng hoàn chỉnh về mặt sản phẩm trước, bao gồm:

- Upload ảnh OCT
- Xem preview ảnh
- Thực hiện dự đoán
- Hiển thị kết quả rõ ràng
- Hiển thị confidence score
- Hiển thị xác suất của cả 4 lớp
- Lưu và xem lịch sử dự đoán
- Xem chi tiết từng lần dự đoán
- Tìm kiếm, lọc và sắp xếp lịch sử
- Dashboard thống kê
- Analytics
- Grad-CAM / Explainability
- Ground Truth / Feedback
- Batch Prediction
- Giao diện responsive
- Các trạng thái loading, empty, error và success đầy đủ

---

# 2. Định hướng sản phẩm

Ứng dụng không nên chỉ là:

```text
Upload Image
    ↓
Predict
    ↓
CNV
```

Mà nên được xây dựng theo hướng một hệ thống:

> **AI-assisted OCT Classification Platform**

Luồng sử dụng chính:

```text
User
  ↓
Dashboard
  ↓
Prediction
  ↓
Upload OCT Image
  ↓
Image Preview
  ↓
Validate Image
  ↓
Run AI Prediction
  ↓
Prediction Result
  ├── Predicted Class
  ├── Confidence
  ├── Probability Distribution
  └── Grad-CAM
  ↓
Save Prediction
  ↓
Prediction History
  ↓
Prediction Detail
```

Mục tiêu là khi người dùng mở ứng dụng, họ có thể hiểu ngay:

1. Ứng dụng dùng để làm gì.
2. Cần thao tác như thế nào.
3. AI đang dự đoán điều gì.
4. Độ tin cậy của kết quả là bao nhiêu.
5. Có thể xem lại các kết quả trước đó ở đâu.
6. Có thể phân tích lịch sử prediction như thế nào.

---

# 3. Cấu trúc điều hướng chính

Sidebar đề xuất:

```text
OCT Vision AI

Dashboard
Prediction
History
Analytics
Model Information

----------------

Settings
```

Nếu sau này có hệ thống tài khoản:

```text
Profile
Logout
```

Navigation cần đơn giản và ổn định.

Người dùng phải luôn có thể truy cập nhanh vào 3 chức năng chính:

```text
Dashboard
Prediction
History
```

---

# 4. Dashboard

## 4.1 Mục tiêu

Dashboard là màn hình tổng quan của toàn bộ ứng dụng.

Người dùng có thể nhanh chóng biết:

- Đã thực hiện bao nhiêu prediction
- Bao nhiêu prediction thuộc CNV
- Bao nhiêu prediction thuộc DME
- Bao nhiêu prediction thuộc DRUSEN
- Bao nhiêu prediction thuộc NORMAL
- Các prediction gần nhất
- Phân bố kết quả dự đoán
- Xu hướng sử dụng ứng dụng

---

## 4.2 Dashboard Layout

```text
--------------------------------------------------------------
 OCT Vision AI                                  User / Profile
--------------------------------------------------------------

 Dashboard

 AI-assisted retinal OCT classification

 ------------------------------------------------------------
 | Total Predictions | CNV | DME | DRUSEN | NORMAL          |
 |       126          | 32  | 21  |   18   |   55           |
 ------------------------------------------------------------

 ┌────────────────────────────┐
 │ Prediction Distribution    │
 │                            │
 │       Donut Chart          │
 │                            │
 └────────────────────────────┘

 ┌────────────────────────────┐
 │ Predictions Over Time      │
 │                            │
 │       Line Chart           │
 │                            │
 └────────────────────────────┘

 Recent Predictions
 ----------------------------------------------------------------
 Image        Prediction     Confidence        Date
 ----------------------------------------------------------------
 oct_001.jpg  NORMAL         98.92%            ...
 oct_002.jpg  CNV            97.21%            ...
 oct_003.jpg  DME            94.83%            ...
 ----------------------------------------------------------------

                                      [View All History]
```

---

## 4.3 Statistic Cards

Các card chính:

### Total Predictions

Hiển thị tổng số prediction đã thực hiện.

### CNV

Hiển thị số prediction thuộc CNV.

### DME

Hiển thị số prediction thuộc DME.

### DRUSEN

Hiển thị số prediction thuộc DRUSEN.

### NORMAL

Hiển thị số prediction thuộc NORMAL.

---

## 4.4 Prediction Distribution

Biểu đồ Donut hoặc Pie Chart.

Ví dụ:

```text
CNV       25%
DME       20%
DRUSEN    15%
NORMAL    40%
```

Mục tiêu là giúp người dùng quan sát nhanh phân bố prediction.

---

## 4.5 Predictions Over Time

Biểu đồ line chart hoặc bar chart.

Ví dụ:

```text
Predictions
   │
30 │                 ●
25 │          ●      │
20 │     ●    │      │
15 │ ●   │    │      │
10 │ │   │    │      │
   └────────────────────
     Mon Tue Wed Thu Fri
```

Có thể hỗ trợ:

```text
7 Days
30 Days
All Time
```

---

## 4.6 Recent Predictions

Hiển thị khoảng 5–10 prediction gần nhất.

Thông tin:

- Thumbnail
- Filename
- Prediction
- Confidence
- Date
- Action

Action:

```text
View Detail
```

---

# 5. Prediction Page

## 5.1 Mục tiêu

Đây là màn hình quan trọng nhất của toàn bộ ứng dụng.

Người dùng có thể:

1. Upload ảnh OCT.
2. Xem preview.
3. Kiểm tra thông tin ảnh.
4. Gửi ảnh đến model.
5. Xem kết quả prediction.
6. Xem confidence.
7. Xem probability của cả 4 classes.
8. Xem Grad-CAM.
9. Thực hiện prediction mới.

---

## 5.2 Layout đề xuất

```text
------------------------------------------------------------

                  OCT Image Classification

 Upload an OCT image to classify retinal condition.

 ------------------------------------------------------------
 |                          |                               |
 |      Upload Image        |       Prediction Result       |
 |                          |                               |
 |    Drag & Drop           |       Prediction              |
 |                          |                               |
 |    [ OCT IMAGE ]         |          CNV                  |
 |                          |                               |
 |    oct_image.jpg         |       Confidence              |
 |                          |         98.62%                 |
 |    [Choose Image]        |                               |
 |                          | CNV      ███████████ 98.62%   |
 |    [Predict Image]       | DME      █ 0.82%              |
 |                          | DRUSEN   ▌ 0.41%               |
 |                          | NORMAL   ▌ 0.15%               |
 ------------------------------------------------------------
```

Desktop có thể chia hai cột.

Mobile chuyển thành:

```text
Upload Section
      ↓
Prediction Result
      ↓
Grad-CAM
```

---

# 6. Upload Image

## 6.1 Upload Methods

Hỗ trợ:

- Drag & Drop
- Browse File
- Click Upload Area

---

## 6.2 Supported Image Formats

Phiên bản đầu:

```text
.jpg
.jpeg
.png
```

Nếu model hỗ trợ thêm định dạng khác thì có thể mở rộng sau.

---

## 6.3 Upload Area

Ví dụ:

```text
┌─────────────────────────────────┐
│                                 │
│          Upload OCT Image       │
│                                 │
│      Drag & Drop image here     │
│               or                │
│          [Browse File]          │
│                                 │
│ JPG, JPEG, PNG                  │
└─────────────────────────────────┘
```

Khi hover:

- Border nổi bật hơn
- Background thay đổi nhẹ

Khi drag file vào:

```text
Drop image here
```

---

# 7. Image Preview

Sau khi upload thành công:

```text
┌───────────────────────────────┐
│                               │
│           OCT IMAGE           │
│                               │
└───────────────────────────────┘

Filename: OCT_001.jpeg
Resolution: 496 × 512
File Size: 512 KB
```

Actions:

```text
Change Image
Remove
Predict
```

Không nên tự động chạy prediction ngay sau upload.

Người dùng nên chủ động nhấn:

```text
Predict Image
```

---

# 8. Image Validation

Validation cần rõ ràng và dễ hiểu.

## 8.1 File Type Validation

Ví dụ:

```text
Unsupported image format.
Please upload a JPG, JPEG, or PNG image.
```

---

## 8.2 File Size Validation

Ví dụ:

```text
The selected image is too large.
Please upload an image smaller than the allowed size.
```

---

## 8.3 Corrupted Image

```text
The uploaded image could not be processed.
Please select another image.
```

---

## 8.4 Invalid Image

Nếu trong tương lai có cơ chế xác định OCT / non-OCT:

```text
This image does not appear to be a valid OCT image.
Please upload a retinal OCT scan.
```

---

# 9. Prediction Processing State

Sau khi nhấn:

```text
Predict Image
```

UI cần chuyển sang loading state.

Ví dụ:

```text
Analyzing OCT Image...

Preparing image
Running AI model
Generating prediction
```

Có thể dùng:

- Spinner
- Progress indicator
- Skeleton

Không nên để màn hình đứng im.

---

# 10. Prediction Result

## 10.1 Primary Result

Kết quả chính phải nổi bật.

Ví dụ:

```text
Prediction

CNV

Choroidal Neovascularization
```

Bên dưới:

```text
Confidence

98.62%
```

---

## 10.2 Class Probabilities

Luôn hiển thị cả 4 lớp:

```text
CNV
████████████████████████████ 98.62%

DME
█ 0.82%

DRUSEN
█ 0.41%

NORMAL
█ 0.15%
```

Điều này tốt hơn chỉ hiển thị class có xác suất cao nhất.

---

# 11. Confidence Level

Có thể bổ sung interpretation nhẹ:

```text
98.62%
High Confidence
```

Ví dụ:

```text
90–100%  High Confidence
70–89%   Moderate Confidence
<70%     Low Confidence
```

Lưu ý:

Confidence chỉ phản ánh mức độ chắc chắn của model và không được mô tả như xác suất chẩn đoán lâm sàng.

---

# 12. Disease Information Card

Sau prediction có thể hiển thị một card ngắn giải thích class.

Ví dụ với CNV:

```text
About CNV

Choroidal Neovascularization involves abnormal blood vessel
growth beneath the retina and may be associated with retinal
damage.
```

Không cần đưa nội dung quá dài.

Mục tiêu:

- Giúp user hiểu class
- Làm giao diện đầy đủ hơn
- Hỗ trợ demo

Các class:

```text
CNV
DME
DRUSEN
NORMAL
```

---

# 13. Prediction Actions

Sau khi prediction hoàn tất:

```text
[Predict Another Image]

[View in History]

[Download Result]
```

Nếu có Grad-CAM:

```text
[View Explanation]
```

---

# 14. Grad-CAM / Explainability

## 14.1 Mục tiêu

Giúp người dùng quan sát vùng ảnh mà model chú ý khi đưa ra prediction.

Đây là một feature rất quan trọng đối với Medical AI.

---

## 14.2 UI

```text
Model Explanation

[ Original ] [ Heatmap ] [ Overlay ]

┌─────────────────────────────┐
│                             │
│       OCT / Grad-CAM        │
│                             │
└─────────────────────────────┘
```

---

## 14.3 Original

Hiển thị ảnh OCT ban đầu.

---

## 14.4 Heatmap

Chỉ hiển thị Grad-CAM heatmap.

---

## 14.5 Overlay

Overlay heatmap lên ảnh gốc.

Đây nên là chế độ mặc định khi người dùng mở Explainability.

---

## 14.6 Disclaimer

```text
The highlighted regions indicate areas that influenced the
model prediction. They should not be interpreted as confirmed
pathological regions.
```

---

# 15. Prediction History

## 15.1 Mục tiêu

History cho phép người dùng xem lại toàn bộ prediction trước đó.

---

## 15.2 Layout

```text
Prediction History

Search _________________________________

[ All Classes ▼ ] [ Date ▼ ] [ Confidence ▼ ]

------------------------------------------------------------------
Image       Filename      Prediction    Confidence      Date
------------------------------------------------------------------
[img]       001.jpg       NORMAL        99.21%          Oct 07
[img]       002.jpg       CNV           98.42%          Oct 07
[img]       003.jpg       DME           96.32%          Oct 06
[img]       004.jpg       DRUSEN        91.11%          Oct 05
------------------------------------------------------------------
```

---

# 16. History Search

Search theo:

```text
Filename
Prediction
```

Ví dụ:

```text
Search predictions...
```

Search nên hoạt động ngay khi nhập.

---

# 17. History Filter

## Prediction Class

```text
All
CNV
DME
DRUSEN
NORMAL
```

## Confidence

```text
All
90–100%
70–89%
Below 70%
```

## Date

```text
Today
Last 7 Days
Last 30 Days
Custom Range
```

---

# 18. History Sorting

Hỗ trợ:

```text
Newest First
Oldest First
Highest Confidence
Lowest Confidence
```

---

# 19. Empty History State

Nếu chưa có prediction:

```text
No Predictions Yet

Upload your first OCT image to start using the AI classifier.

[Start Prediction]
```

Không nên chỉ hiển thị bảng trống.

---

# 20. Prediction Detail

Khi click vào một item trong History:

```text
Prediction Detail
-------------------------------------------------

OCT Image

[ OCT IMAGE ]

Prediction
CNV

Confidence
98.62%

Class Probabilities

CNV        98.62%
DME         0.82%
DRUSEN      0.41%
NORMAL      0.15%

Model
MaxViT-OCT

Model Version
v1.0.0

Prediction Date
Oct 07, 2026 – 21:35

-------------------------------------------------

Model Explanation

[ Original ] [ Heatmap ] [ Overlay ]
```

Actions:

```text
Predict Another Image
Download Result
Delete Prediction
```

---

# 21. Delete Prediction

Không nên delete ngay khi click.

Cần confirmation dialog:

```text
Delete Prediction?

This prediction will be permanently removed from your history.

[Cancel] [Delete]
```

---

# 22. Analytics

## 22.1 Mục tiêu

Cho người dùng phân tích các prediction đã thực hiện.

---

## 22.2 Analytics Overview

```text
Analytics

Total Predictions
126

Average Confidence
96.72%

Most Frequent Prediction
NORMAL
```

---

## 22.3 Class Distribution

Biểu đồ:

```text
CNV        32
DME        21
DRUSEN     18
NORMAL     55
```

Có thể dùng:

- Donut Chart
- Bar Chart

---

## 22.4 Prediction Trend

Theo:

```text
Daily
Weekly
Monthly
```

---

## 22.5 Confidence Distribution

Ví dụ:

```text
90–100%    82 Predictions
70–89%     31 Predictions
Below 70%  13 Predictions
```

---

# 23. Ground Truth / Prediction Feedback

Đây là feature nên có nếu ứng dụng phục vụ nghiên cứu.

Trong Prediction Detail:

```text
Was this prediction correct?

[Yes] [No]
```

Nếu chọn No:

```text
Select the actual class

○ CNV
○ DME
○ DRUSEN
○ NORMAL

[Submit]
```

---

# 24. Prediction Comparison

Sau khi có Ground Truth:

```text
Model Prediction
CNV

Actual Class
DME

Result
Incorrect
```

Hoặc:

```text
Model Prediction
NORMAL

Actual Class
NORMAL

Result
Correct
```

---

# 25. Research Analytics

Nếu có Ground Truth, Analytics có thể mở rộng thêm:

- Accuracy
- Precision
- Recall
- F1-score
- Confusion Matrix

Ví dụ:

```text
                Predicted
              CNV DME DRU NOR

Actual CNV     24   1   0   0
Actual DME      1  20   1   0
Actual DRU      2   0  16   0
Actual NOR      0   0   1  54
```

Feature này rất phù hợp để demo nghiên cứu.

---

# 26. Batch Prediction

## 26.1 Mục tiêu

Cho phép predict nhiều ảnh cùng lúc.

---

## 26.2 Upload

```text
Batch Prediction

Drag & Drop OCT Images

or

[Select Images]

50 Images Selected
```

---

## 26.3 Batch Progress

```text
Processing Images

32 / 50 Completed

████████████████░░░░░░
```

---

## 26.4 Batch Result

```text
Filename      Prediction       Confidence

001.jpg       NORMAL           99.12%
002.jpg       CNV              97.32%
003.jpg       DME              94.22%
004.jpg       DRUSEN           92.15%
```

Actions:

```text
View Detail
Export Results
```

---

# 27. Model Information Page

Trang này giới thiệu model đang sử dụng trong ứng dụng.

```text
Model Information

Model
MaxViT-OCT

Task
Retinal OCT Image Classification

Classes
4

CNV
DME
DRUSEN
NORMAL

Architecture
Hybrid CNN + Multi-Axis Attention

Parameter Count
10.15M

Test Accuracy
99.59%
```

---

# 28. Model Architecture Section

Có thể hiển thị:

```text
Input OCT Image
      ↓
Stem
      ↓
MBConv
      ↓
Window Attention
      ↓
Grid Attention
      ↓
Classification Head
      ↓
CNV / DME / DRUSEN / NORMAL
```

Trang này giúp ứng dụng phù hợp hơn khi demo project hoặc nghiên cứu.

---

# 29. Medical Disclaimer

Vì đây là Medical AI application, cần có disclaimer rõ ràng.

Ví dụ:

> **Research Use Only**
>
> This application is intended for research and educational purposes only. It is not intended to replace professional medical diagnosis.

Bên dưới Prediction Result:

```text
AI-generated prediction.

Clinical interpretation should be performed by qualified
healthcare professionals.
```

---

# 30. Settings

Settings phiên bản đầu không cần quá phức tạp.

Có thể gồm:

### Appearance

```text
Light Mode
Dark Mode
System
```

### Prediction Display

```text
Show Confidence
Show Class Probabilities
Show Grad-CAM Automatically
```

### History

```text
Items Per Page
```

---

# 31. User Profile

Nếu có authentication:

```text
Profile

Avatar

Name
Email

Total Predictions
Member Since
```

Action:

```text
Edit Profile
Change Password
Logout
```

---

# 32. Global Search

Nếu ứng dụng phát triển lớn hơn, có thể thêm search ở top bar.

Search:

```text
Search prediction history...
```

Có thể tìm:

- Filename
- Prediction ID
- Prediction class

---

# 33. Notifications

Dùng Toast Notification cho các action.

Ví dụ:

```text
Prediction completed successfully.
```

```text
Prediction deleted.
```

```text
Image upload failed.
```

```text
Unable to process the image.
```

Toast nên ngắn, dễ hiểu.

---

# 34. Loading States

Mỗi chức năng phải có loading state riêng.

### Dashboard

```text
Skeleton Cards
Skeleton Charts
Skeleton Table
```

### Prediction

```text
Analyzing OCT Image...
```

### History

```text
Loading prediction history...
```

### Prediction Detail

```text
Loading prediction...
```

---

# 35. Empty States

Ứng dụng phải xử lý tốt trường hợp chưa có dữ liệu.

### Dashboard

```text
No prediction data available yet.
```

### History

```text
No Predictions Yet

Start by uploading an OCT image.

[Start Prediction]
```

### Search

```text
No matching predictions found.
```

---

# 36. Error States

Ví dụ:

```text
Something went wrong.

We were unable to complete the prediction.

[Try Again]
```

Không nên hiển thị error kỹ thuật trực tiếp cho user.

---

# 37. Responsive Design

Ứng dụng phải sử dụng được trên:

```text
Desktop
Tablet
Mobile
```

Desktop:

```text
Sidebar + Main Content
```

Tablet:

```text
Collapsible Sidebar
```

Mobile:

```text
Drawer Navigation
Single Column Layout
```

Prediction Page trên mobile:

```text
Upload Image
     ↓
Preview
     ↓
Predict
     ↓
Result
     ↓
Probabilities
     ↓
Grad-CAM
```

---

# 38. UI Design Direction

Phong cách:

> **Modern Medical Dashboard**

Định hướng:

```text
Clean
Professional
Reliable
Minimal
Calm
Readable
```

---

# 39. Color System

Background:

```text
#F8FAFC
```

Card:

```text
White
```

Primary:

```text
Blue / Indigo
```

Secondary:

```text
Slate
```

Disease colors có thể sử dụng:

```text
NORMAL    Green
CNV       Red
DME       Orange
DRUSEN    Amber
```

Không nên phụ thuộc hoàn toàn vào màu sắc để truyền đạt thông tin.

Luôn hiển thị thêm text label.

---

# 40. Typography

Đề xuất:

```text
Inter
```

Hierarchy:

```text
Page Title
Section Title
Card Title
Body Text
Caption
```

Không nên dùng quá nhiều kích thước font.

---

# 41. Component Design

Các component chính:

```text
Sidebar
Topbar

StatCard
PredictionCard
ConfidenceBadge
ClassBadge

ImageUploader
ImagePreview

PredictionResult
ProbabilityBar
ConfidenceIndicator

GradCAMViewer

HistoryTable
HistoryFilter
HistorySearch

AnalyticsChart

EmptyState
ErrorState
LoadingSkeleton

ConfirmDialog
Toast
```

Component cần reusable.

---

# 42. Prediction Class Badge

Ví dụ:

```text
[ CNV ]
```

```text
[ DME ]
```

```text
[ DRUSEN ]
```

```text
[ NORMAL ]
```

Badge phải thống nhất trên:

- Dashboard
- Prediction
- History
- Prediction Detail
- Analytics

---

# 43. Accessibility

Ứng dụng nên hỗ trợ:

- Keyboard navigation
- Focus state rõ ràng
- Alt text cho image
- Contrast đủ tốt
- Button label rõ ràng
- Không dùng chỉ màu sắc để biểu thị trạng thái

---

# 44. Main User Flow

Luồng chính:

```text
Open Application
      ↓
Dashboard
      ↓
Prediction
      ↓
Upload OCT Image
      ↓
Preview Image
      ↓
Predict
      ↓
Loading
      ↓
Prediction Result
      ↓
Confidence + Probabilities
      ↓
Grad-CAM
      ↓
View History
      ↓
Prediction Detail
```

---

# 45. Secondary User Flow

History Flow:

```text
History
   ↓
Search / Filter
   ↓
Select Prediction
   ↓
Prediction Detail
   ↓
View Image
   ↓
View Prediction
   ↓
View Grad-CAM
   ↓
Provide Ground Truth
```

---

# 46. Batch Prediction Flow

```text
Batch Prediction
      ↓
Upload Multiple Images
      ↓
Review Selected Files
      ↓
Run Prediction
      ↓
Processing Progress
      ↓
Batch Result Table
      ↓
View Individual Result
```

---

# 47. App Pages

Phiên bản hoàn chỉnh nên có:

```text
/
├── Dashboard
│
├── Prediction
│
├── History
│   └── Prediction Detail
│
├── Analytics
│
├── Model Information
│
└── Settings
```

Nếu có Authentication:

```text
Login
Register
Forgot Password
Profile
```

---

# 48. MVP – Minimum Viable Product

MVP cần hoàn thành trước:

### Dashboard

- Total Predictions
- Class Statistics
- Recent Predictions

### Prediction

- Upload
- Preview
- Predict
- Predicted Class
- Confidence
- 4 Class Probabilities

### History

- History List
- Search
- Filter
- Prediction Detail

### UI

- Responsive
- Loading
- Error
- Empty State

---

# 49. Version 1.0

Sau MVP, bổ sung:

- Grad-CAM
- Analytics
- Prediction Charts
- Ground Truth Feedback
- Download Result
- Better Dashboard
- Dark Mode

---

# 50. Version 2.0

Có thể bổ sung:

- Batch Prediction
- Confusion Matrix
- Research Analytics
- Advanced Search
- Export Results
- Comparison between Predictions

---

# 51. Feature Priority

## Priority 1 – Bắt buộc

```text
Dashboard
Prediction
Image Upload
Image Preview
4-Class Prediction
Confidence
Probability Distribution
History
Prediction Detail
Search
Filter
Responsive UI
Loading/Error/Empty States
```

## Priority 2 – Nên có

```text
Grad-CAM
Analytics
Disease Information
Download Result
Ground Truth Feedback
Model Information
```

## Priority 3 – Nâng cao

```text
Batch Prediction
Confusion Matrix
Advanced Analytics
Export
Dark Mode
Global Search
```

---

# 52. Definition of Done cho App

Ứng dụng được xem là hoàn chỉnh về mặt sản phẩm khi người dùng có thể:

1. Mở Dashboard và hiểu mục đích ứng dụng.
2. Upload ảnh OCT dễ dàng.
3. Xem preview ảnh trước khi predict.
4. Nhận prediction thuộc một trong 4 class.
5. Xem confidence.
6. Xem probability của cả 4 class.
7. Xem Grad-CAM.
8. Thực hiện prediction mới.
9. Xem lịch sử prediction.
10. Search history.
11. Filter history.
12. Xem chi tiết một prediction.
13. Xem dashboard analytics.
14. Cung cấp Ground Truth nếu cần.
15. Sử dụng ứng dụng tốt trên desktop và mobile.
16. Nhận feedback rõ ràng khi loading, lỗi hoặc chưa có dữ liệu.
17. Nhìn thấy disclaimer rõ ràng về mục đích nghiên cứu.

---

# 53. Scope cuối cùng của Product

Web app nên được định vị là:

> **A modern AI-assisted retinal OCT classification web application for research and educational purposes.**

Các module chính:

```text
OCT Vision AI
│
├── Dashboard
│   ├── Statistics
│   ├── Prediction Distribution
│   ├── Prediction Trend
│   └── Recent Predictions
│
├── Prediction
│   ├── Upload OCT
│   ├── Image Preview
│   ├── Validation
│   ├── AI Prediction
│   ├── Confidence
│   ├── 4-Class Probability
│   └── Grad-CAM
│
├── History
│   ├── Search
│   ├── Filter
│   ├── Sort
│   └── Prediction Detail
│
├── Analytics
│   ├── Class Distribution
│   ├── Confidence Distribution
│   ├── Prediction Trend
│   └── Research Metrics
│
├── Model Information
│
└── Settings
```

---

# 54. Kết luận

Ở giai đoạn này, việc quan trọng nhất là hoàn thiện **product design và application flow** trước khi quyết định cách lưu trữ, backend architecture hay deployment.

Thứ tự nên làm:

```text
Product Requirements
        ↓
Page Structure
        ↓
User Flow
        ↓
Feature Definition
        ↓
UI/UX
        ↓
Frontend Prototype
        ↓
Prediction Integration
        ↓
History
        ↓
Analytics
        ↓
Grad-CAM
        ↓
Advanced Features
```

Sau khi toàn bộ phần App Plan này được thống nhất, bước tiếp theo mới thiết kế riêng:

```text
Technical Architecture
Database Design
Storage Strategy
Backend Architecture
Model Serving
Docker
Cloud Deployment
Security
CI/CD
Monitoring
```

Như vậy phần thiết kế sản phẩm và phần kỹ thuật hạ tầng sẽ được tách biệt rõ ràng, giúp project dễ triển khai và quản lý hơn.
