# Quản lý sự cố AssetFlow

Phân hệ này quản lý hồ sơ sự cố xuyên suốt từ tiếp nhận đến cải tiến. Thiết kế tham chiếu ISO/IEC 27035-1, ISO/IEC 20000-1 và ISO 22301; đây không phải tuyên bố chứng nhận ISO.

## Quy trình bắt buộc

```text
NEW -> ACKNOWLEDGED -> IN_PROGRESS -> MONITORING -> RESOLVED -> CLOSED
                      ^                 |
                      +-----------------+
```

- Không cho bỏ qua bước tiếp nhận và xử lý.
- Trước khi chuyển sang `RESOLVED`, hồ sơ phải có cách xử lý, nguyên nhân gốc và hành động khắc phục.
- Trước khi chuyển sang `CLOSED`, hồ sơ phải có hành động phòng ngừa và bài học kinh nghiệm.
- Hồ sơ đã đóng hoặc hủy chỉ được đọc; API không cung cấp thao tác xóa sự cố.
- Mọi cập nhật, đổi trạng thái và ghi chú tạo một dòng timeline và audit log bất biến.

## Phân loại và ưu tiên

Nhóm mặc định gồm mất điện/nguồn, mất mạng, virus/mã độc, phần cứng, phần mềm, an toàn thông tin, tài khoản/truy cập, cloud/dịch vụ, điện thoại và nhóm khác.

Ưu tiên P1-P4 được tính từ ma trận tác động và mức khẩn cấp, không cho người nhập tự hạ mức ưu tiên. SLA mặc định:

| Mức | Phản hồi | Khắc phục |
| --- | ---: | ---: |
| P1 | 15 phút | 4 giờ |
| P2 | 30 phút | 8 giờ |
| P3 | 4 giờ | 3 ngày |
| P4 | 8 giờ | 5 ngày |

Các mức trên là baseline vận hành và cần được doanh nghiệp phê duyệt hoặc cấu hình theo SLA thực tế.

## Hồ sơ lưu trữ

Hồ sơ gồm thời điểm phát hiện/báo cáo/phản hồi/khắc phục/đóng, người phát hiện, người xử lý, đơn vị, vị trí, tài sản hoặc dịch vụ liên quan, phạm vi ảnh hưởng, thời gian gián đoạn, mô tả, đánh giá ban đầu, khoanh vùng, xử lý, RCA, hành động khắc phục/phòng ngừa và bài học kinh nghiệm.

Dữ liệu production được lưu trong PostgreSQL ở `incidents`, timeline ở `incident_activities`, và dấu vết kiểm toán ở `audit_logs`. Chính sách backup, retention và phục hồi phải được cấu hình theo yêu cầu pháp lý của tổ chức.

## Phân công người xử lý

- Chỉ tài khoản đang hoạt động, có vai trò `ADMIN` hoặc `IT`, và thuộc phòng ban đang hoạt động được đánh dấu `isIncidentResponseTeam` mới xuất hiện trong danh sách người xử lý.
- `incidents.assignedToId` và `incidents.assignedDepartmentId` lưu người cùng bộ phận chịu trách nhiệm hiện tại để truy vấn nhanh.
- `incident_assignments` lưu bất biến từng lần phân công/điều phối lại: người nhận, bộ phận tại thời điểm nhận, người phân công, vai trò, thời điểm nhận, chấp nhận và kết thúc.
- PostgreSQL trigger chặn gán sai bộ phận ngay cả khi request không đi qua API, đồng thời không cho vô hiệu hóa/chuyển phòng ban người đang xử lý sự cố mở trước khi điều phối lại.
- Khi chuyển sang `ACKNOWLEDGED` hoặc `IN_PROGRESS`, hồ sơ bắt buộc đã có người xử lý hợp lệ. Khi đóng hoặc hủy, bản ghi phân công đang mở được kết thúc nhưng lịch sử không bị xóa.

Phòng ban IT/CNTT/ICT được migration nhận diện ban đầu. Admin có thể cấu hình cờ đội xử lý sự cố qua API danh mục phòng ban; tổ chức có nhiều đội IT có thể bật cờ cho nhiều phòng ban.

## Thống kê

API và giao diện hỗ trợ kỳ tuần, tháng và năm: tổng sự cố, hồ sơ đang mở, P1/P2, đã khắc phục, quá SLA, tổng downtime, thời gian phản hồi/khắc phục trung bình, tỷ lệ đạt SLA, xu hướng và phân loại sự cố.
