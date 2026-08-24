# AssetFlow v2.2

[![CI](https://github.com/duclamtk39/assetIT/actions/workflows/ci.yml/badge.svg)](https://github.com/duclamtk39/assetIT/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/Docker-GHCR-2496ED?logo=docker&logoColor=white)](https://github.com/duclamtk39/assetIT/pkgs)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

AssetFlow là phần mềm self-hosted quản lý vòng đời tài sản: nhập kho, cấp phát, cho mượn, thu hồi, điều chuyển, kiểm kê, bảo trì, lịch sử và Barcode/QR.

> **Trạng thái:** phù hợp triển khai UAT/pilot nội bộ có kiểm soát. Chỉ go-live sau khi doanh nghiệp hoàn thành checklist trong [Production readiness](docs/PRODUCTION_READINESS.md).

## Triển khai trên server mới

### 1. Chuẩn bị

- Linux 64-bit có Docker Engine và Docker Compose v2.
- Git, OpenSSL và tối thiểu 4 GB RAM, 2 CPU, 20 GB dung lượng trống.
- Một hostname có DNS trỏ về server, ví dụ `assets.company.vn`.
- Cho phép TCP `80/443` từ mạng sử dụng. Không mở PostgreSQL ra ngoài Docker.
- Hai package GHCR phải ở chế độ public; nếu đang private, chạy `docker login ghcr.io` trước khi pull.

Kiểm tra:

```bash
docker --version
docker compose version
git --version
openssl version
```

### 2. Tải cấu hình và tạo secret

```bash
sudo mkdir -p /opt
cd /opt
sudo git clone https://github.com/duclamtk39/assetIT.git
sudo chown -R "$USER":"$USER" /opt/assetIT
cd /opt/assetIT/infra/docker/production
chmod +x init.sh ../../../scripts/*.sh
./init.sh
```

`init.sh` tạo `.env` và các secret ngẫu nhiên với quyền truy cập hạn chế. Không commit hoặc gửi các file trong `secrets/` qua chat/email.

### 3. Cấu hình URL và phiên bản

Mở `/opt/assetIT/infra/docker/production/.env` và sửa tối thiểu:

```env
REGISTRY_PREFIX=ghcr.io/duclamtk39

# UAT dùng edge để nhận bản mới nhất từ main.
ASSETFLOW_VERSION=edge

APP_DOMAIN=assets.company.vn
APP_URL=https://assets.company.vn
TZ=Asia/Ho_Chi_Minh
```

`edge` chỉ dùng cho UAT/pilot. Môi trường vận hành thật phải ghim tag release bất biến, ví dụ `ASSETFLOW_VERSION=2.2.0`, sau khi tag đó đã được phát hành trên GitHub/GHCR.

### 4. Khởi động

```bash
cd /opt/assetIT/infra/docker/production
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 migrate api web proxy
```

Caddy tự cấp chứng chỉ TLS khi DNS hợp lệ và server truy cập được Internet trên cổng `80/443`.

Kiểm tra readiness:

```bash
curl -fsS https://assets.company.vn/api/v1/health/ready
```

Đăng nhập lần đầu:

```bash
cat /opt/assetIT/infra/docker/production/secrets/initial_admin_password.txt
```

- Tên đăng nhập: `admin`
- Mật khẩu: giá trị vừa hiển thị
- Hệ thống bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên.

## Cập nhật phiên bản

Chạy từ thư mục gốc repository. Luôn backup trước khi pull image/migration mới:

```bash
cd /opt/assetIT
ASSETFLOW_COMPOSE_FILE=infra/docker/production/compose.yaml ASSETFLOW_DB_SERVICE=db ./scripts/backup.sh
git pull --ff-only origin main
cd infra/docker/production
docker compose pull
docker compose up -d
docker compose ps
curl -fsS https://assets.company.vn/api/v1/health/ready
```

`git pull` chỉ cập nhật cấu hình; `docker compose pull` mới tải image mới. Container `migrate` phải hoàn tất thành công trước khi API được khởi động.

## Backup và khôi phục

```bash
cd /opt/assetIT

# Tạo backup PostgreSQL và hồ sơ đính kèm
ASSETFLOW_COMPOSE_FILE=infra/docker/production/compose.yaml ASSETFLOW_DB_SERVICE=db ./scripts/backup.sh

# Thử phục hồi trên PostgreSQL tạm, không chạm dữ liệu đang chạy
./scripts/dr-drill.sh backups/assetflow-YYYYMMDDTHHMMSSZ

# Restore thật: thay thế dữ liệu hiện tại và yêu cầu xác nhận
ASSETFLOW_COMPOSE_FILE=infra/docker/production/compose.yaml ASSETFLOW_DB_SERVICE=db ./scripts/restore.sh backups/assetflow-YYYYMMDDTHHMMSSZ
```

Sao lưu thêm `.env`, `secrets/` và thư mục `backups/` sang nơi lưu trữ mã hóa ngoài server. Tuyệt đối không chạy `docker compose down -v`, vì `-v` xóa volume database và hồ sơ.

## Monitoring

```bash
cd /opt/assetIT/infra/docker/production
docker compose --profile monitoring up -d
```

Prometheus và Alertmanager chỉ bind vào localhost tại `9090/9093`. Trước go-live phải cấu hình receiver email, Slack hoặc webhook thật và thử phát cảnh báo.

## Microsoft 365 và LDAP

Cấu hình tại **Cài đặt → Danh tính & người dùng**. Sau khi test kết nối và duyệt mapping, chạy acceptance test với tenant/domain thật:

```bash
cd /opt/assetIT
ASSETFLOW_URL=https://assets.company.vn DIRECTORY_PROVIDER=M365 ./scripts/directory-live-test.sh
ASSETFLOW_URL=https://assets.company.vn DIRECTORY_PROVIDER=LDAP ./scripts/directory-live-test.sh
```

Chỉ thêm `DIRECTORY_RUN_SYNC=true` khi đã kiểm tra phạm vi người dùng, phòng ban và vai trò sẽ đồng bộ.

## Xử lý nhanh khi không khởi động

```bash
cd /opt/assetIT/infra/docker/production
docker compose ps
docker compose logs --tail=200 db migrate api web proxy
docker compose config
```

Nếu PostgreSQL báo sai mật khẩu sau khi đổi `.env` hoặc secret, lưu ý volume cũ vẫn giữ tài khoản đã khởi tạo. Không xóa volume; hãy khôi phục đúng secret cũ hoặc thực hiện quy trình đổi mật khẩu database có kiểm soát.

## Phát triển

```bash
npm ci
npm run verify
npm run dev
```

Dữ liệu demo chỉ dành cho local khi bật `VITE_DEMO_MODE=true`; stack production không tự seed dữ liệu mẫu.

## Tài liệu

- [Chi tiết production stack](infra/docker/production/README.md)
- [Kiến trúc](docs/ARCHITECTURE.md)
- [Production readiness](docs/PRODUCTION_READINESS.md)
- [Bảo mật và kiểm thử directory](docs/SECURITY_TESTING.md)
- [Release và CI/CD](docs/RELEASE.md)
- [Security policy](SECURITY.md)

## ❤️ Support AssetFlow

AssetFlow miễn phí và có thể self-host. Nếu dự án hữu ích, bạn có thể hỗ trợ chi phí duy trì và phát triển.

### Donate qua Vietcombank

<img width="373" height="450" alt="AssetFlow donate QR" src="https://github.com/user-attachments/assets/a8ce277b-f365-4599-9961-34cc7d4531ec" />

- Chủ tài khoản: **NGUYEN DUC LAM**
- Số tài khoản: **059000212664**

Vui lòng kiểm tra đúng tên người nhận trước khi chuyển khoản. Thank you for supporting AssetFlow ❤️
