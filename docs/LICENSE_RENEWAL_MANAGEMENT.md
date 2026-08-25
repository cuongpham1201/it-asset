# Quản lý License, SSL và Domain

Phân hệ **License & Gia hạn** quản lý các quyền sử dụng và dịch vụ số tách biệt với vòng đời tài sản vật lý.

## Phạm vi nghiệp vụ

- License: quản lý tổng số seat, cấp cho một nhân sự/tài sản/phòng ban, thu hồi và chống cấp vượt số lượng đã mua.
- SSL: quản lý common name, issuer, ngày hiệu lực, ngày hết hạn và lịch sử gia hạn.
- Domain: quản lý tên miền, registrar, hạn đăng ký, auto-renew và lịch sử gia hạn.
- Cảnh báo: chính sách theo từng loại, lưu cảnh báo trong PostgreSQL, gửi email qua SMTP, xác nhận xử lý và đóng khi đã gia hạn.
- Microsoft 365: đồng bộ read-only SKU, tổng seat, seat đã cấp/còn trống và danh sách người được cấp từ Microsoft Graph.
- Audit: lưu người tạo, người cấp/thu hồi, người gia hạn, hạn cũ/mới và chi phí.

## Luồng ITIL áp dụng

```text
Đăng ký / mua → Ghi nhận entitlement → Cấp quyền (license)
       ↓
Theo dõi hiệu lực → Cảnh báo → Đánh giá nhu cầu / phê duyệt
       ↓
Gia hạn → cập nhật hạn mới → đóng cảnh báo → audit
       └→ Không gia hạn → thu hồi quyền → ngừng sử dụng
```

License chỉ được cấp khi còn hiệu lực và còn seat. Việc thu hồi không xóa giao dịch cũ. SSL và domain không dùng giao dịch cấp phát seat; chúng được quản lý theo chủ sở hữu dịch vụ và vòng đời gia hạn.

## Chính sách cảnh báo mặc định

- License và domain: trước 90, 60, 30, 14, 7, 1 và 0 ngày.
- SSL: trước 60, 30, 14, 7, 3, 1 và 0 ngày.

Scheduler đồng bộ trạng thái và tạo cảnh báo định kỳ. Cảnh báo luôn xuất hiện trong trung tâm cảnh báo của AssetFlow. Khi Admin bật SMTP, hệ thống tạo outbox theo từng cảnh báo/người nhận, gửi tối đa 5 lần với backoff và lưu trạng thái `PENDING/SENT/FAILED` để truy vết. Danh sách nhận gồm email trong policy và email chủ sở hữu khi bật `notifyOwner`.

Mật khẩu SMTP và Microsoft client secret được mã hóa AES-256-GCM bằng `DATA_ENCRYPTION_KEY_FILE`/`DIRECTORY_ENCRYPTION_KEY`; API không trả secret về trình duyệt. Không lưu private key SSL hoặc license key dạng rõ. Trường `secretReference` chỉ lưu tham chiếu tới secret manager/vault.

## Kết nối Microsoft 365

1. Trong Entra ID, tạo App Registration dùng client credentials.
2. Cấp Application permissions và Admin consent: `User.Read.All`, `GroupMember.Read.All`, `LicenseAssignment.Read.All`.
3. Trong **License, SSL & Domain → Microsoft 365**, nhập Tenant ID, Client ID và client secret; chọn lịch, thử kết nối rồi đồng bộ.
4. SKU được đưa vào `digital_entitlements`, người được cấp lưu tại `microsoft_license_assignments` và được đối chiếu với danh bạ AssetFlow theo Entra ID/email.

Microsoft Graph `subscribedSkus` không cung cấp ngày gia hạn thương mại hay chi phí hợp đồng. IT phải mở hồ sơ SKU đã đồng bộ và khai báo kỳ hạn/chi phí; chỉ sau đó hệ thống mới sinh cảnh báo gia hạn. Cấp/thu hồi license Microsoft 365 vẫn thực hiện tại Microsoft 365 Admin Center, AssetFlow chỉ đọc và đối chiếu để tránh hai nguồn ghi xung đột.

## Cấu hình cảnh báo email

Admin mở **Cảnh báo**, cấu hình SMTP host/port, tài khoản, mật khẩu, người gửi và gửi thư thử. Với cổng 587 dùng STARTTLS; với SMTPS cổng 465 bật tùy chọn kết nối bảo mật trực tiếp. TLS tối thiểu 1.2 và xác thực chứng thư máy chủ luôn được bật. Sau khi thử thành công, bật email và khai báo người nhận cho từng policy License/SSL/Domain.

## Phân quyền

- Admin: toàn quyền và được thay đổi chính sách cảnh báo.
- IT: quản lý hồ sơ, cấp/thu hồi và gia hạn.
- HCNS/người dùng thường: không nhìn thấy phân hệ.

Migration nền: `202608250003_digital_entitlements`; Microsoft 365 và email: `202608250004_m365_license_sync_notifications`. Khi triển khai phải backup PostgreSQL, chạy `prisma migrate deploy`, kiểm tra health và thử một vòng tạo → cấp → thu hồi → gia hạn trên UAT. Kết nối thật Microsoft 365 và SMTP cần được kiểm thử bằng tenant/hộp thư của doanh nghiệp trước production.
