# Luồng dữ liệu và baseline bảo mật

## 1. Ranh giới tin cậy

- Trình duyệt là môi trường không tin cậy; dữ liệu gửi lên luôn phải validate lại.
- API là điểm duy nhất được phép thay đổi dữ liệu nghiệp vụ.
- User/password database của API không phải owner và không có quyền `BYPASSRLS`.
- PostgreSQL và object storage chỉ nằm trên private network.
- Worker chỉ lấy job qua transactional outbox; không nhận request Internet.

## 2. Xác thực

- Production ưu tiên OIDC với Microsoft Entra ID/Keycloak; local account chỉ là phương án dự phòng.
- Password local băm Argon2id cùng salt riêng; không mã hóa thuận nghịch.
- MFA bắt buộc với Admin; khuyến nghị với IT.
- Access token sống ngắn; refresh token ngẫu nhiên, chỉ lưu hash trong DB và gửi bằng cookie `HttpOnly`, `Secure`, `SameSite`.
- Thu hồi toàn bộ session khi khóa user, đổi mật khẩu hoặc thay đổi quyền quan trọng.
- Rate limit và progressive delay cho login; audit cả thất bại và thành công.

## 3. Phân quyền

Quyền được kiểm tra hai lớp:

1. API kiểm tra permission theo action, ví dụ `asset.read`, `asset.assign`, `department.manage`.
2. PostgreSQL RLS giới hạn row theo organization/site/department scope.

Ví dụ:

- Admin: mọi permission trong organization.
- IT: quản lý tài sản trên các site/phòng ban được gán; không quản trị security mặc định.
- HCNS: `asset.*` chỉ trên department scope HCNS; không đọc được giao dịch ngoài scope.

Không nhận `department_id` từ token rồi tin ngay. API tải session/scope hiện hành hoặc dùng permission-version để vô hiệu token khi quyền đổi.

## 4. Luồng cấp phát/thu hồi/điều chuyển

Mỗi command chạy trong một database transaction:

```text
Xác thực → kiểm tra permission + scope → validate idempotency key
→ SELECT asset FOR UPDATE → kiểm tra version/trạng thái
→ đóng assignment cũ (nếu có) → tạo assignment mới
→ cập nhật trạng thái/vị trí/owner/version tài sản
→ thêm asset_transaction bất biến
→ thêm audit_log + outbox_event
→ COMMIT
```

- `FOR UPDATE` ngăn hai người cùng cấp phát một tài sản.
- `version` hỗ trợ optimistic concurrency và phát hiện màn hình dữ liệu cũ.
- `idempotency_key` ngăn double-click/retry tạo hai giao dịch.
- Không cập nhật/xóa lịch sử; correction là một giao dịch bù có tham chiếu giao dịch gốc.
- Email chỉ gửi sau commit; lỗi email không rollback nghiệp vụ và worker sẽ retry.

## 5. Import Excel

1. Upload file vào vùng cách ly, giới hạn dung lượng và kiểm tra MIME/signature.
2. Parse bằng worker; không xử lý công thức, macro hay link ngoài.
3. Tạo staging batch với từng dòng `valid/error`.
4. Người dùng xem preview, lỗi trùng code/serial và scope trước khi commit.
5. Commit theo batch có idempotency; mỗi tài sản sinh transaction `IMPORT` và audit.
6. Lưu checksum, tên file, người import và kết quả; xóa file tạm theo retention.

Không import trực tiếp vào bảng `assets` từ frontend như prototype.

## 6. Biên bản và email

- Biên bản render phía server từ template versioned và snapshot dữ liệu tại thời điểm giao dịch.
- File có SHA-256, immutable object key và metadata trong DB.
- Link tải dùng URL ký ngắn hạn hoặc endpoint có kiểm tra scope.
- SMTP secret chỉ worker đọc; không gửi xuống trình duyệt.
- Email dùng outbox, retry có backoff, trạng thái `pending/sent/failed/dead` và audit.
- Không dùng `mailto:` trong production.

## 7. Audit chống sửa

- Audit log chỉ INSERT; trigger từ chối UPDATE/DELETE với application role.
- Mỗi entry chứa `previous_hash` và `entry_hash` để phát hiện sửa/xóa chuỗi.
- Audit ghi actor, impersonator, IP, user agent, request ID, action, object, before/after đã lọc bí mật.
- Định kỳ export audit sang storage WORM hoặc hệ thống log độc lập.

## 8. Bảo vệ API/Web

- Schema validation cho body/query/path; giới hạn kích thước request.
- Chống broken object-level authorization trên mọi endpoint theo resource ID.
- CORS allowlist đúng `APP_URL`; CSRF protection nếu dùng cookie.
- CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, frame protection.
- Không trả stack trace hoặc SQL error cho client.
- Dependency scan, container scan, secret scan và SBOM trong pipeline release.
- Image chạy non-root, filesystem read-only nếu có thể, drop Linux capabilities.

## 9. Backup và khôi phục

- Mục tiêu đề xuất: RPO 15 phút, RTO 4 giờ; stakeholder phải phê duyệt.
- Daily encrypted full backup + WAL/archive incremental; lưu ít nhất một bản ngoài host.
- Quy tắc 3-2-1; retention theo pháp lý/nội bộ.
- Key backup tách khỏi backup data; mất key đồng nghĩa không khôi phục dữ liệu mã hóa.
- Restore test tự động hàng tháng vào môi trường cô lập, kiểm tra row count/checksum và đăng nhập.
- Trước nâng cấp: backup có xác minh, ghi version schema/app và kế hoạch rollback.

## 10. Yêu cầu trước khi go-live Internet

- Threat model và review quyền từng API.
- Penetration test có phạm vi auth, BOLA/IDOR, upload, import và SSRF.
- Diễn tập mất DB, mất object storage, lộ token, khóa admin và restore.
- Bật TLS, MFA Admin, backup offsite, alerting và log retention.
- Thay toàn bộ tài khoản/mật khẩu demo và secret mặc định.

