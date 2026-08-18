# Mô hình database AssetFlow

## Quan hệ chính

```text
organization
 ├── sites ── locations ── warehouses
 ├── departments
 ├── users ── user_roles ── roles ── role_permissions
 │              └── user_scopes (organization/site/department)
 ├── vendors / manufacturers
 ├── asset_categories ── asset_models
 └── assets (current snapshot)
      ├── assignments ── returns
      ├── transfers
      ├── maintenance_records
      ├── inventory_items ── inventory_sessions
      ├── asset_history (append-only)
      └── attachments

command transaction ── audit_logs (append-only)
                    └─ outbox_events ── worker ── email
```

## Lựa chọn mô hình

- UUID cho khóa nghiệp vụ tránh lộ số lượng và an toàn khi đồng bộ nhiều site.
- `asset_code`, `barcode`, `serial_number` có unique theo organization.
- Lifecycle status và `current_*` nằm ở `assets` để đọc nhanh; sự thật nghiệp vụ nằm ở Assignment/Return/Transfer/Inventory/Maintenance.
- `asset_history` là projection append-only để đọc timeline, không thay thế chứng từ nguồn.
- Một partial unique index đảm bảo mỗi tài sản chỉ có một assignment đang mở.
- Hardware specs tách 1:1 khỏi tài sản chung; trường mở rộng dùng JSONB có schema theo category.
- Tiền dùng `numeric`, không dùng floating point.
- Tất cả thời điểm dùng `timestamptz` và UTC; ngày kế toán/bảo hành dùng `date`.
- Biên bản/file chỉ lưu metadata và SHA-256 trong DB; nội dung nằm ở object storage.
- Email/report bất đồng bộ qua transactional outbox để không mất sự kiện khi service dừng.

## Invariant bắt buộc

1. Tài sản `IN_USE` hoặc `ON_LOAN` phải có đúng một assignment `OPEN`.
2. Tài sản ở trạng thái khác không có assignment `OPEN`.
3. Cấp phát/cho mượn chỉ từ `READY`; thu hồi chỉ từ `IN_USE`/`ON_LOAN`.
4. Mọi thay đổi custodian/site/department/status phải có chứng từ nguồn và `asset_history` cùng commit.
5. Chứng từ nghiệp vụ, `asset_history` và `audit_logs` không UPDATE/DELETE tùy tiện; correction tạo event bù trừ.
6. Mọi row nghiệp vụ có `organization_id`; API luôn `SET LOCAL` tenant/scope trước query.
7. Import không ghi thẳng assets: upload → validate staging → preview → commit.
8. Correction tạo transaction mới tham chiếu `correction_of_id`.
9. Transfer chỉ đổi site/location/warehouse, không mặc định đổi custodian.
10. Mỗi asset chỉ có tối đa một maintenance record mở.
11. `DISPOSED` là terminal state và không được quay lại vòng đời hoạt động.

## Business gate

`backend/prisma/schema.prisma` hiện là provisional. Không tạo migration production cho tới khi lifecycle status, field contract, transition matrix, history event và tenant scope trong `ASSETFLOW_SPRINT02_DEPLOY.md` được duyệt.

## Dữ liệu nhạy cảm

- Password chỉ lưu hash Argon2id.
- Refresh token chỉ lưu SHA-256/HMAC hash.
- SMTP password, JWT private key và data encryption key không lưu trong bảng cấu hình.
- Trường cần mã hóa ứng dụng phải dùng envelope encryption; DB chỉ giữ ciphertext + key version.
- Audit snapshot phải loại token, password, secret và dữ liệu cá nhân không cần thiết.

## Migration

- Migration là forward-only, có checksum và ghi trong bảng schema history của migration tool.
- Một release chỉ chạy migration bằng job duy nhất có advisory lock.
- Migration lớn dùng expand → migrate/backfill → contract; không khóa bảng dài trong giờ làm việc.
- Backup và restore-test trước migration phá vỡ tương thích.
