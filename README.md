# AssetFlow v2.2

[![CI](https://github.com/duclamtk39/assetIT/actions/workflows/ci.yml/badge.svg)](https://github.com/duclamtk39/assetIT/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/Docker-GHCR-2496ED?logo=docker&logoColor=white)](https://github.com/duclamtk39/assetIT/pkgs)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

AssetFlow là phần mềm self-hosted quản lý vòng đời tài sản: nhập kho, cấp phát, cho mượn, thu hồi, điều chuyển, kiểm kê, bảo trì, lịch sử và Barcode/QR.

> **Trạng thái:** Internal UAT/pilot. Có thể triển khai trên máy thật trong LAN/VPN hoặc qua HTTPS. Chưa mở public Internet trước khi hoàn tất pentest và nghiệm thu môi trường.

## Cài bản mới nhất trên server

Yêu cầu: Linux, Docker Engine, Docker Compose v2, Git và OpenSSL.

```bash
git clone https://github.com/duclamtk39/assetIT.git
cd assetIT/infra/docker/production
./init.sh
```

Sửa `.env`:

```env
ASSETFLOW_VERSION=edge
REGISTRY_PREFIX=ghcr.io/duclamtk39
APP_DOMAIN=assets.example.com
APP_URL=https://assets.example.com
```

Khởi động:

```bash
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
```

Kiểm tra:

```bash
curl -fsS https://assets.example.com/api/v1/health/ready
cat secrets/initial_admin_password.txt
```

Đăng nhập bằng tài khoản `admin` và mật khẩu vừa hiển thị. Hệ thống bắt buộc đổi mật khẩu lần đầu.

`edge` là image mới nhất được build từ nhánh `main`, phù hợp UAT. Khi vận hành production ổn định, nên ghim tag release như `2.2.0` thay vì `edge`.

## Cập nhật bản mới nhất

Chạy tại thư mục repository:

```bash
git pull --ff-only origin main
ASSETFLOW_COMPOSE_FILE=infra/docker/production/compose.yaml ASSETFLOW_DB_SERVICE=db ./scripts/backup.sh
cd infra/docker/production
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 migrate api web
```

Container `migrate` chạy migration trước; API chỉ khởi động khi migration thành công. `git pull` không tự tải Docker image, vì vậy luôn cần `docker compose pull`.

## Backup, restore và DR drill

Tại thư mục gốc repository:

```bash
# Backup
ASSETFLOW_COMPOSE_FILE=infra/docker/production/compose.yaml ASSETFLOW_DB_SERVICE=db ./scripts/backup.sh

# Kiểm tra khả năng khôi phục trên database tạm, không chạm database đang chạy
./scripts/dr-drill.sh backups/assetflow-YYYYMMDDTHHMMSSZ

# Restore thật — sẽ thay dữ liệu hiện tại
ASSETFLOW_COMPOSE_FILE=infra/docker/production/compose.yaml ASSETFLOW_DB_SERVICE=db ./scripts/restore.sh backups/assetflow-YYYYMMDDTHHMMSSZ
```

Không chạy `docker compose down -v`. Tùy chọn `-v` xóa volume PostgreSQL và hồ sơ đính kèm.

## Monitoring

```bash
cd infra/docker/production
docker compose --profile monitoring up -d
```

Prometheus và Alertmanager chỉ bind vào localhost của server tại cổng `9090` và `9093`. Trước go-live cần cấu hình receiver email/Slack/webhook thật.

## Microsoft 365 và LDAP

Cấu hình provider trong **Cài đặt → Danh tính & người dùng**, sau đó kiểm tra trên tenant/domain thật:

```bash
ASSETFLOW_URL=https://assets.example.com DIRECTORY_PROVIDER=M365 ./scripts/directory-live-test.sh
ASSETFLOW_URL=https://assets.example.com DIRECTORY_PROVIDER=LDAP ./scripts/directory-live-test.sh
```

Thêm `DIRECTORY_RUN_SYNC=true` sau khi đã duyệt mapping phòng ban và vai trò.

## Phát triển

```bash
npm ci
npm run verify
npm run dev
```

Dữ liệu demo chỉ dành cho local khi bật `VITE_DEMO_MODE=true`; production không tự seed dữ liệu mẫu.

## Tài liệu

- [Cài đặt production](infra/docker/production/README.md)
- [Kiến trúc](docs/ARCHITECTURE.md)
- [API kiểm kê và import Excel](docs/INVENTORY_IMPORT_API.md)
- [Bảo mật và kiểm thử directory](docs/SECURITY_TESTING.md)
- [Production readiness](docs/PRODUCTION_READINESS.md)
- [Release và CI/CD](docs/RELEASE.md)
- [Security policy](SECURITY.md)

## ❤️ Support AssetFlow

AssetFlow miễn phí và có thể self-host. Nếu dự án hữu ích, bạn có thể hỗ trợ chi phí duy trì và phát triển.

### Donate qua Vietcombank

<img width="373" height="450" alt="AssetFlow donate QR" src="https://github.com/user-attachments/assets/a8ce277b-f365-4599-9961-34cc7d4531ec" />

- Chủ tài khoản: **NGUYEN DUC LAM**
- Số tài khoản: **059000212664**

Vui lòng kiểm tra đúng tên người nhận trước khi chuyển khoản. Thank you for supporting AssetFlow ❤️
