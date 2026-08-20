# Self-host production với HTTPS

Cấu hình này chạy Caddy, Web, API và PostgreSQL bằng các network tách biệt. Chỉ Caddy publish cổng `80/443`; database không lộ ra host.

## Chuẩn bị

Yêu cầu Docker Compose v2, domain đã trỏ DNS vào host và tối thiểu 4 GB RAM.

```bash
cd infra/docker/production
cp .env.example .env
mkdir -p secrets
```

Tạo hai secret với quyền chỉ tài khoản vận hành được đọc:

```text
secrets/postgres_password.txt
secrets/data_encryption_key.txt
```

`data_encryption_key.txt` phải chứa đúng 32 byte dạng Base64 hoặc 64 ký tự hex. Ví dụ:

```bash
openssl rand -base64 32 > secrets/data_encryption_key.txt
chmod 600 secrets/data_encryption_key.txt
```

Giữ nguyên và backup khóa này trong secret manager. Mất khóa đồng nghĩa không thể giải mã client secret Microsoft 365 hoặc LDAP bind password đã lưu.

Không commit `.env`, thư mục `secrets`, private key hoặc backup. Đặt `ASSETFLOW_VERSION` thành tag release bất biến, không dùng `latest`.

## Khởi động

```bash
docker compose config
docker compose pull
docker compose up -d
docker compose ps
```

API chạy `prisma migrate deploy` trước khi nhận request. Nếu migration lỗi, API không khởi động.

## Nâng cấp

1. Backup database và tài liệu, sau đó thử restore trên môi trường tách biệt.
2. Đọc release note và đổi `ASSETFLOW_VERSION`.
3. Chạy `docker compose pull` và `docker compose up -d`.
4. Kiểm tra health, đăng nhập, một giao dịch thử và log migration.

Không hạ version schema nếu chưa có kế hoạch rollback đã kiểm thử. Không coi việc copy volume PostgreSQL đang chạy là một bản backup hợp lệ.
