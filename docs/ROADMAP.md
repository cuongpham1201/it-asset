# AssetFlow v1.0 Roadmap

Roadmap triển khai tuần tự. Một sprint chỉ được đánh dấu hoàn thành khi Definition of Done đã được kiểm chứng.

| Sprint | Phạm vi | Trạng thái |
|---|---|---|
| S01 | Frontend foundation, repository architecture, routing, API client | Hoàn thành |
| S02 | Business Foundation (lifecycle/entity/invariant) → Business Gate → NestJS/PostgreSQL foundation | Đang thực hiện |
| S03 | Authentication, user management, permission-based RBAC | Chưa bắt đầu |
| S04 | Asset core và custom fields | Chưa bắt đầu |
| S05 | Hoàn thiện API/UI cấp phát, cho mượn và thu hồi theo contract đã khóa ở S02 | Chưa bắt đầu |
| S06 | Kho, location tree và điều chuyển | Chưa bắt đầu |
| S07 | Kiểm kê vật lý, barcode và QR | Chưa bắt đầu |
| S08 | Vendor, purchase request, PO và nhập hàng | Chưa bắt đầu |
| S09 | Maintenance, lifecycle và attachments | Chưa bắt đầu |
| S10 | Immutable audit, report, Excel/CSV | Chưa bắt đầu |
| S11 | AD/LDAP, Entra ID, API và notification | Đang thực hiện — directory sync cơ bản đã có, SSO/notification chưa làm |
| S12 | Docker hardening, security review và GitHub release | Chưa bắt đầu |

## Quy tắc kỹ thuật

- S02 phải duyệt Business Gate trước khi sửa schema/migration; xem `ASSETFLOW_SPRINT02_DEPLOY.md`.
- Frontend không truy cập trực tiếp database và không giữ token/secret trong `localStorage`.
- Backend là nơi duy nhất thực thi permission và transition trạng thái tài sản.
- Mọi thay đổi nghiệp vụ phải tạo asset history và audit log trong cùng transaction.
- Migration chỉ tiến về phía trước; seed demo tách khỏi dữ liệu production.
- Không đánh dấu tính năng hoàn thành chỉ vì đã có màn hình prototype.
