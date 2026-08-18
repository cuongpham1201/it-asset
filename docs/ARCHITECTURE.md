# Kiến trúc triển khai AssetFlow

## 1. Mục tiêu

- Một bộ cài chạy giống nhau trên Windows và Ubuntu.
- Có thể triển khai trong LAN, datacenter, VPS hoặc cloud.
- Truy cập bằng URL cấu hình, hỗ trợ HTTPS công khai hoặc CA nội bộ.
- Database thuộc quyền kiểm soát của đơn vị triển khai, không phụ thuộc dịch vụ bên ngoài.
- Mọi thay đổi tài sản có lịch sử, kiểm soát quyền và khả năng truy vết.
- Có quy trình backup, restore và nâng cấp version rõ ràng.

## 2. Kiến trúc đích

```text
Internet / LAN / VPN
        │
        ▼
 Caddy Reverse Proxy
 HTTPS, HSTS, rate limit tại biên
        │
        ├── /        → Web React (static)
        └── /api/*   → AssetFlow API
                           │
                ┌──────────┼───────────┐
                ▼          ▼           ▼
          PostgreSQL   Object store   Email/SMTP
          private net  attachments    via outbox worker
```

### Thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Web | Giao diện, không tự quyết định quyền và không truy cập DB trực tiếp |
| API | Xác thực, RBAC + data scope, validation, transaction và audit |
| PostgreSQL | Dữ liệu nguồn duy nhất, ràng buộc toàn vẹn, RLS phòng thủ lớp hai |
| Worker | Gửi email, tạo báo cáo, xử lý import và tác vụ nền có retry |
| Caddy | URL công khai, TLS, reverse proxy và security headers |
| Object storage | Biên bản, ảnh, hóa đơn; production dùng S3-compatible/MinIO |

## 3. Nguyên tắc biên dịch và đóng gói

- Mỗi release hiện tạo hai image bất biến: `assetflow-frontend` và `assetflow-backend`. `assetflow-worker` chỉ được bổ sung khi outbox worker có implementation thật.
- Image được gắn version cụ thể, không triển khai tag `latest` trong production.
- PostgreSQL dùng volume riêng; nâng cấp ứng dụng không xóa hoặc ghi đè volume.
- Bản self-host một node chạy `prisma migrate deploy` trong backend entrypoint và chỉ mở API khi migration thành công. Mô hình nhiều replica phải chuyển bước này thành release job chạy một lần trước khi nhận traffic.
- Cùng một `compose.yml` dùng trên Docker Desktop Windows và Docker Engine Ubuntu.
- Bộ cài offline gồm các image đã export, compose, `.env.example`, script install/upgrade/backup/restore và checksum.

## 4. Chế độ triển khai

### Máy đơn / chi nhánh

- Caddy/Web, API và PostgreSQL trên cùng một host; worker sẽ là service riêng khi hàng đợi nền được triển khai.
- Phù hợp dưới khoảng 100 người dùng đồng thời.
- Database không publish port ra host.

### Production tách lớp

- 1–N API/Worker; PostgreSQL managed hoặc máy riêng.
- Object storage riêng, backup sang host/bucket khác.
- Có load balancer, monitoring và log tập trung.

### Truy cập mọi nơi

- Phương án ưu tiên: domain công khai + HTTPS + firewall chỉ mở 80/443.
- Hệ thống nội bộ: VPN/Zero Trust; không mở trực tiếp PostgreSQL hay API admin ra Internet.
- `APP_URL` là URL chuẩn duy nhất, ví dụ `https://assets.company.vn`.
- DNS phải trỏ vào máy Caddy; production bắt buộc HTTPS.

## 5. Cấu hình môi trường

| Biến | Ý nghĩa |
|---|---|
| `APP_URL` | URL người dùng truy cập |
| `APP_DOMAIN` | Hostname Caddy tiếp nhận |
| `DATABASE_URL` | Chuỗi kết nối DB chỉ API/Worker biết |
| `POSTGRES_*` | Khởi tạo database, truyền bằng secret |
| `JWT_PRIVATE_KEY_FILE` | Khóa ký access token, mount read-only |
| `JWT_PUBLIC_KEY_FILE` | Khóa xác minh token |
| `DATA_ENCRYPTION_KEY_FILE` | Khóa mã hóa trường nhạy cảm |
| `SMTP_*` | Mail host/port/user; password dùng secret file |
| `STORAGE_*` | File system hoặc S3-compatible |
| `TRUSTED_PROXY_CIDRS` | Proxy được phép cung cấp forwarded headers |

Không commit `.env`, private key, SMTP password hay backup vào source control.

## 6. Tính sẵn sàng và vận hành

- Health endpoints riêng cho liveness và readiness.
- API chỉ ready sau khi kết nối DB và xác nhận migration đúng version.
- Log JSON có `request_id`, `actor_id`, `tenant_id`, action và result; không log password/token.
- Metric tối thiểu: latency, error rate, DB pool, queue lag, email failure và disk usage.
- Thời gian hệ thống lưu UTC; giao diện chuyển sang múi giờ người dùng.

## 7. Lộ trình chuyển prototype

1. Giữ frontend hiện tại làm UI reference; đóng băng cấu trúc `localStorage`.
2. Tạo API, migration PostgreSQL và seed role/permission.
3. Thay từng repository frontend: auth → danh mục → tài sản → giao dịch → import/export.
4. Chạy migration dữ liệu demo một lần; sau đó xóa hoàn toàn logic phân quyền frontend-only.
5. Đóng gói image, kiểm thử cài mới, nâng cấp, backup và restore trên Windows + Ubuntu.
