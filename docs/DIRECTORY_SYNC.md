# Đồng bộ Microsoft 365 và LDAP

AssetFlow hỗ trợ đồng bộ hồ sơ người dùng, phòng ban, trạng thái tài khoản và ánh xạ nhóm sang vai trò. Đây là directory synchronization, chưa phải đăng nhập SSO: người dùng được đồng bộ không có mật khẩu local và không thể đăng nhập cho đến khi OIDC/LDAP authentication được triển khai riêng.

## Điều kiện chung

Tạo khóa mã hóa 32 byte và đặt trong `.env` trước khi lưu client secret hoặc bind password:

```bash
openssl rand -base64 32
```

```env
DIRECTORY_ENCRYPTION_KEY=<giá trị vừa tạo>
```

Khởi động lại API sau khi thay `.env`. Không thay khóa sau khi đã lưu cấu hình. Khóa này phải được backup riêng trong secret manager; backup database không thể tự giải mã directory secret nếu thiếu đúng khóa.

Chỉ Admin có quyền đọc, sửa, kiểm tra hoặc chạy đồng bộ. Secret được mã hóa AES-256-GCM trong PostgreSQL, không xuất hiện trong API response, log hoặc giao diện sau khi lưu.

## Microsoft 365 / Entra ID

1. Tạo App registration trong Microsoft Entra admin center.
2. Ghi lại Tenant ID và Application (client) ID.
3. Tạo client secret; lưu value ngay khi tạo.
4. Thêm Microsoft Graph **Application permissions**:
   - `User.Read.All`
   - `GroupMember.Read.All`
5. Grant admin consent cho tenant.
6. Trong AssetFlow, nhập ba giá trị trên, ánh xạ nhóm và chọn **Lưu & kiểm tra kết nối**.
7. Chạy **Đồng bộ ngay**, kiểm tra lịch sử đồng bộ và danh sách người dùng/phòng ban.

AssetFlow dùng OAuth 2.0 client credentials và gọi `/users`, không dùng `/me`. Graph pagination được giới hạn và next-link chỉ được phép trỏ về `https://graph.microsoft.com`.

## LDAP / Active Directory

Tài khoản bind chỉ cần quyền đọc OU chứa người dùng và các thuộc tính được cấu hình. Khuyến nghị:

```text
LDAP URL:  ldaps://ad.company.local:636
Base DN:   DC=company,DC=local
Bind DN:   CN=svc_assetflow,OU=Service Accounts,DC=company,DC=local
Filter:    (&(objectCategory=person)(objectClass=user))
```

- Dùng `ldaps://` hoặc `ldap://` kết hợp StartTLS. Clear-text bind bị chặn mặc định.
- Chứng chỉ máy chủ luôn được xác minh. Nếu AD dùng CA nội bộ, dán certificate CA dạng PEM vào trường CA certificate.
- Không bật `ALLOW_INSECURE_LDAP` trong production.
- Thuộc tính mặc định: `department`, `mail`, `employeeID`, `sAMAccountName`.
- Trạng thái vô hiệu hóa được đọc từ `userAccountControl`; nhóm được đọc từ `memberOf`.

## Ánh xạ vai trò

Mỗi dòng có định dạng:

```text
IT-Asset-Admins = ADMIN
IT-Asset-Team = IT
HR-Team = HCNS
```

Vai trò ưu tiên theo thứ tự `ADMIN > IT > HCNS > USER`. Người dùng mất khỏi directory hoặc bị vô hiệu hóa sẽ được chuyển sang trạng thái inactive, không bị xóa, để giữ nguyên lịch sử tài sản và audit.

## Kiểm thử trước khi sử dụng

1. Backup AssetFlow.
2. Tạo một OU/nhóm thử với 2–3 tài khoản, gồm một tài khoản disabled.
3. Kiểm tra kết nối.
4. Đồng bộ thủ công và đối chiếu số lượng tạo/cập nhật/bỏ qua.
5. Đổi phòng ban, nhóm và trạng thái của tài khoản thử; chạy đồng bộ lần hai.
6. Xác nhận local admin không bị sửa, tài khoản trùng email bị bỏ qua và tài khoản directory không bị xóa vật lý.
7. Chỉ bật lịch tự động sau khi hai lần đồng bộ thủ công đạt yêu cầu.

Lịch chạy trong timezone của container API. Với triển khai nhiều replica API, chỉ nên bật scheduler trên một replica cho đến khi bổ sung distributed job runner.

## Tài liệu kỹ thuật tham chiếu

- [Microsoft Graph — app-only access/client credentials](https://learn.microsoft.com/en-us/graph/auth-v2-service)
- [Microsoft Graph permissions overview](https://learn.microsoft.com/en-us/graph/permissions-overview)
- [ldapts — bind, search, LDAPS và StartTLS](https://github.com/ldapts/ldapts)
