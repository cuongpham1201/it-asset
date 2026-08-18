# AssetFlow

[![CI](https://github.com/duclamtk39/assetIT/actions/workflows/ci.yml/badge.svg)](https://github.com/duclamtk39/assetIT/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://github.com/duclamtk39/assetIT/pkgs)
[![Release](https://img.shields.io/github/v/release/duclamtk39/assetIT?sort=semver)](https://github.com/duclamtk39/assetIT/releases)

AssetFlow là phần mềm mã nguồn mở dùng để quản lý vòng đời tài sản: nhập kho, cấp phát, cho mượn, thu hồi, điều chuyển, bảo trì, kiểm kê và theo dõi lịch sử.

> **Lưu ý:** AssetFlow hiện đang ở giai đoạn trước v1.0. Chưa nên sử dụng dữ liệu nhạy cảm trên Internet cho đến khi hoàn thành xác thực phía server, RBAC, audit log và security review.

## Cài nhanh bằng Docker Compose

Yêu cầu: Docker Engine hoặc Docker Desktop, kèm Docker Compose v2.

### Linux / Ubuntu

```bash
git clone https://github.com/duclamtk39/assetIT.git
cd assetIT
cp .env.example .env
nano .env
docker compose pull
docker compose up -d
```

### Windows PowerShell

```powershell
git clone https://github.com/duclamtk39/assetIT.git
Set-Location assetIT
Copy-Item .env.example .env
notepad .env
docker compose pull
docker compose up -d
```

Trong `.env`, hãy đặt mật khẩu database riêng:

```env
ASSETFLOW_REGISTRY=ghcr.io/duclamtk39
ASSETFLOW_VERSION=latest
APP_URL=http://localhost:8080
APP_PORT=8080
POSTGRES_DB=assetflow
POSTGRES_USER=assetflow
POSTGRES_PASSWORD=thay-bang-mat-khau-manh
```

Truy cập: [http://localhost:8080](http://localhost:8080)

Kiểm tra container:

```bash
docker compose ps
docker compose logs --tail=100
```

## Cập nhật

```bash
git pull
docker compose pull
docker compose up -d
```

Dữ liệu PostgreSQL nằm trong volume `assetflow_pgdata`. Không chạy `docker compose down -v` nếu muốn giữ dữ liệu.

Production nên ghim `ASSETFLOW_VERSION` vào một release cụ thể, ví dụ `1.0.0`, và backup database trước khi nâng cấp.

## Public Internet và HTTPS

Cấu hình mặc định chạy HTTP trên cổng `8080`, phù hợp LAN, demo hoặc hệ thống đã có reverse proxy.

Khi public Internet, dùng cấu hình Caddy, HTTPS và Docker secrets trong [deploy/README.md](deploy/README.md):

```bash
cd deploy
cp .env.example .env
# tạo secrets theo deploy/README.md
docker compose --env-file .env -f compose.production.yml pull
docker compose --env-file .env -f compose.production.yml up -d
```

## Chức năng chính

- Sổ tài sản, nhóm tài sản, ảnh và cấu hình kỹ thuật.
- Nhập kho, cấp phát, cho mượn, thu hồi và điều chuyển.
- Barcode/QR, import/export Excel và biên bản bàn giao A4.
- Quản lý phòng ban, site, vị trí, kho và nhà cung cấp.
- Phân quyền Admin, IT, HCNS theo phạm vi dữ liệu.
- Đồng bộ người dùng Microsoft 365/Entra ID hoặc LDAP.
- Đa ngôn ngữ và tùy chỉnh thương hiệu công ty.

## Chạy từ source

```bash
npm ci
npm run dev
```

Giao diện mặc định: [http://localhost:5173](http://localhost:5173)

Chỉ bật dữ liệu mẫu trong môi trường local:

```env
VITE_DEMO_MODE=true
```

## Tài liệu

- [Triển khai HTTPS](deploy/README.md)
- [Release và Docker images](docs/RELEASE.md)
- [Kiến trúc hệ thống](docs/ARCHITECTURE.md)
- [Bảo mật và luồng dữ liệu](docs/SECURITY_AND_DATA_FLOW.md)
- [Roadmap](docs/ROADMAP.md)

## ❤️ Support AssetFlow

AssetFlow miễn phí và có thể self-host. Nếu dự án hữu ích, bạn có thể hỗ trợ chi phí duy trì và phát triển.

### Donate qua Vietcombank
<img width="373" height="450" alt="image" src="https://github.com/user-attachments/assets/a8ce277b-f365-4599-9961-34cc7d4531ec" />

- Chủ tài khoản: **NGUYEN DUC LAM**
- Số tài khoản: **059000212664**

Vui lòng kiểm tra đúng tên người nhận trước khi chuyển khoản.

Thank you for supporting AssetFlow ❤️
