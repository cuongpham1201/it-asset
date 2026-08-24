# AssetFlow production stack

Cấu hình này chạy Caddy, Web, API và PostgreSQL trên mạng Docker tách biệt. Chỉ Caddy mở cổng 80/443. API dùng tài khoản database runtime không có quyền DDL; container `migrate` dùng tài khoản owner riêng và thoát sau khi migration thành công. Tài khoản bootstrap PostgreSQL chỉ dùng để khởi tạo/khôi phục và không được cấp cho API.

## Cài mới

```bash
cd infra/docker/production
cp .env.example .env
mkdir -p secrets
openssl rand -hex 32 > secrets/postgres_bootstrap_password.txt
openssl rand -hex 32 > secrets/postgres_migration_password.txt
openssl rand -hex 32 > secrets/postgres_runtime_password.txt
openssl rand -base64 32 > secrets/data_encryption_key.txt
openssl rand -hex 32 > secrets/metrics_token.txt
openssl rand -base64 24 > secrets/initial_admin_password.txt
chmod 600 secrets/*.txt
```

Sửa domain, URL và tag release bất biến trong `.env`, sau đó:

```bash
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
curl -fsS https://assets.example.com/api/v1/health/ready
```

Đăng nhập bằng `admin` và mật khẩu trong `initial_admin_password.txt`; hệ thống bắt buộc đổi mật khẩu lần đầu. Không commit `.env`, `secrets/` hoặc backup.

## Monitoring và cảnh báo

```bash
docker compose --profile monitoring up -d
ssh -L 9090:127.0.0.1:9090 -L 9093:127.0.0.1:9093 user@server
```

Prometheus và Alertmanager chỉ bind localhost. Trước go-live phải cấu hình receiver email/Slack/webhook đã được phê duyệt trong `infra/monitoring/alertmanager.yml`; mặc định cảnh báo chỉ hiển thị trong giao diện Alertmanager.

## Backup, restore và DR drill

Chạy tại thư mục gốc repository:

```bash
ASSETFLOW_COMPOSE_FILE=infra/docker/production/compose.yaml ASSETFLOW_DB_SERVICE=db ./scripts/backup.sh
./scripts/dr-drill.sh backups/assetflow-YYYYMMDDTHHMMSSZ
```

DR drill khôi phục database vào volume PostgreSQL tạm, kiểm tra checksum và truy vấn dữ liệu rồi tự dọn tài nguyên; nó không chạm database đang chạy. Hàng quý vẫn cần diễn tập full-stack gồm hồ sơ đính kèm, đăng nhập và nghiệp vụ mẫu.

## Nâng cấp

```bash
git pull --ff-only origin main
# backup + DR drill trước khi đổi phiên bản
docker compose pull
docker compose up -d
docker compose ps
```

`migrate` phải hoàn tất trước khi API khởi động. Không dùng `docker compose down -v`.

## Microsoft 365 / LDAP và security acceptance

Xem [security testing](../../../docs/SECURITY_TESTING.md). Kiểm tra kết nối thật bằng `scripts/directory-live-test.sh`; script không nhận hoặc in client secret/LDAP bind password vì secret phải được lưu qua trang cài đặt. Chạy HTTPS security baseline bằng `scripts/security-smoke.sh`.

Stack và tooling không thay thế pentest độc lập, duyệt quyền tenant/domain thật, cấu hình kênh cảnh báo thật hoặc phê duyệt go-live của doanh nghiệp.
