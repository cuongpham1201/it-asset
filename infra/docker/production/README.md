# AssetFlow — triển khai nội bộ có HTTPS

Cấu hình này chạy Caddy, Web, API và PostgreSQL trên các Docker network tách biệt. Chỉ Caddy mở cổng `80/443`; PostgreSQL không publish ra host.

> Trạng thái phát hành hiện tại là **Internal UAT**. Chỉ mở qua mạng nội bộ hoặc VPN cho đến khi các mục còn lại trong `docs/PRODUCTION_READINESS.md` được đóng.

## Chuẩn bị

Yêu cầu Docker Compose v2, domain nội bộ đã trỏ tới máy chủ và tối thiểu 4 GB RAM.

```bash
cd infra/docker/production
cp .env.example .env
mkdir -p secrets
```

Tạo ba file secret và giới hạn quyền đọc:

```text
secrets/postgres_password.txt
secrets/data_encryption_key.txt
secrets/initial_admin_password.txt
```

- `postgres_password.txt`: mật khẩu PostgreSQL duy nhất cho môi trường này.
- `data_encryption_key.txt`: đúng 32 byte dạng Base64 hoặc 64 ký tự hex; dùng để mã hóa secret Microsoft 365/LDAP.
- `initial_admin_password.txt`: mật khẩu tạm của tài khoản `admin`, ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.

Ví dụ tạo khóa mã hóa:

```bash
openssl rand -base64 32 > secrets/data_encryption_key.txt
chmod 600 secrets/*.txt
```

Giữ nguyên và backup khóa mã hóa trong secret manager. Mất khóa đồng nghĩa không thể giải mã client secret hoặc LDAP bind password đã lưu. Không commit `.env`, `secrets/`, private key hoặc backup.

## Khởi động

Đặt `ASSETFLOW_VERSION` trong `.env` bằng tag release bất biến, sau đó:

```bash
docker compose config
docker compose pull
docker compose up -d
docker compose ps
```

API chạy migration trước khi nhận request. Mở URL trong `APP_URL`, đăng nhập bằng `admin` và mật khẩu trong `initial_admin_password.txt`; hệ thống bắt buộc đổi mật khẩu ngay.

## Backup

Chạy từ thư mục gốc repository:

```bash
ASSETFLOW_COMPOSE_FILE=infra/docker/production/compose.yaml \
ASSETFLOW_DB_SERVICE=db ./scripts/backup.sh
```

Backup bao gồm PostgreSQL, hồ sơ đính kèm và checksum. Secret phải được backup riêng bằng phương thức mã hóa.

## Nâng cấp

```bash
# 1. Backup và thử restore trên môi trường tách biệt
# 2. Đổi ASSETFLOW_VERSION trong .env
docker compose pull
docker compose up -d
docker compose ps
```

Kiểm tra health, đăng nhập, phân quyền và một giao dịch thử sau nâng cấp. Không dùng `latest`, không chạy `docker compose down -v`, và không coi việc copy volume PostgreSQL đang chạy là backup hợp lệ.
