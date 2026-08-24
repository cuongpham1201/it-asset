# AssetFlow

[![CI](https://github.com/duclamtk39/assetIT/actions/workflows/ci.yml/badge.svg)](https://github.com/duclamtk39/assetIT/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://github.com/duclamtk39/assetIT/pkgs)
[![Release](https://img.shields.io/github/v/release/duclamtk39/assetIT?sort=semver)](https://github.com/duclamtk39/assetIT/releases)

AssetFlow là phần mềm mã nguồn mở, self-host dùng để quản lý vòng đời tài sản: nhập kho, cấp phát, cho mượn, thu hồi, điều chuyển, bảo trì và kiểm kê.

> Trạng thái hiện tại: **Internal UAT**. Có xác thực phía server, RBAC, audit log và PostgreSQL; chưa công bố là production-ready vì kiểm kê và một số nghiệp vụ phụ vẫn đang hoàn thiện. Chỉ triển khai trong mạng nội bộ/VPN và sao lưu định kỳ.

## Cài nhanh bằng Docker

Yêu cầu: Docker Engine hoặc Docker Desktop và Docker Compose v2.

```bash
git clone https://github.com/duclamtk39/assetIT.git
cd assetIT
cp .env.example .env
# đặt POSTGRES_PASSWORD, INITIAL_ADMIN_PASSWORD mạnh và ghim ASSETFLOW_VERSION
docker compose pull
docker compose up -d
```

Windows PowerShell dùng `Copy-Item .env.example .env` thay cho lệnh `cp`. Mở `http://localhost:8080` và kiểm tra bằng:

```bash
docker compose ps
docker compose logs --tail=100
```

Dữ liệu PostgreSQL nằm trong volume `assetflow_pgdata`; hồ sơ nằm trong `assetflow_documents`. Không chạy `docker compose down -v` nếu muốn giữ dữ liệu. Tài khoản cài mới là `admin`, dùng `INITIAL_ADMIN_PASSWORD` trong `.env` và bắt buộc đổi mật khẩu lần đầu.

Backup và restore có kiểm tra checksum:

```bash
./scripts/backup.sh
./scripts/restore.sh backups/assetflow-YYYYMMDDTHHMMSSZ
```

## Cấu trúc repository

```text
apps/
  web/                 React + TypeScript + Vite
  api/                 NestJS + Prisma REST API
database/
  reference/           SQL tham khảo, không tự chạy production
infra/docker/production/ HTTPS, secrets và cấu hình self-host production
docs/                  Kiến trúc, bảo mật, nghiệp vụ và release
scripts/               Công cụ vận hành dùng chung
.github/               CI/CD, Dependabot và mẫu cộng tác
compose.yaml           Cài nhanh self-host
compose.dev.yaml       Build image tại máy phát triển
```

Migration vận hành chỉ lấy từ `apps/api/prisma/migrations`. Web không kết nối trực tiếp database; PostgreSQL chỉ nằm trong private Docker network.

## Phát triển

```bash
npm ci
npm run dev
```

Các lệnh chính: `npm run dev:web`, `npm run dev:api`, `npm run build`, `npm run verify`. Chỉ bật dữ liệu mẫu ở local bằng `VITE_DEMO_MODE=true` và tự đặt `VITE_DEMO_ADMIN_PASSWORD`; image release không chứa mật khẩu demo.

## Cập nhật

```bash
git pull
docker compose pull
docker compose up -d
```

Production phải dùng tag release cụ thể, backup và thử restore trước khi nâng cấp. Triển khai domain/HTTPS và Docker secrets xem [hướng dẫn production](infra/docker/production/README.md).

## Tài liệu

- [Cấu trúc repository](docs/REPOSITORY_STRUCTURE.md)
- [Kiến trúc](docs/ARCHITECTURE.md)
- [Bảo mật và luồng dữ liệu](docs/SECURITY_AND_DATA_FLOW.md)
- [Mức sẵn sàng production](docs/PRODUCTION_READINESS.md)
- [Quy trình release](docs/RELEASE.md)
- [Đóng góp](CONTRIBUTING.md) · [Báo cáo bảo mật](SECURITY.md)
- [Giấy phép MIT](LICENSE)

## Buy me a Coffee ❤️ Support AssetFlow

AssetFlow miễn phí và có thể self-host. Nếu dự án hữu ích, bạn có thể hỗ trợ chi phí duy trì và phát triển.

### Donate qua Vietcombank

<img width="373" height="450" alt="AssetFlow donate QR" src="https://github.com/user-attachments/assets/a8ce277b-f365-4599-9961-34cc7d4531ec" />

- Chủ tài khoản: **NGUYEN DUC LAM**
- Số tài khoản: **059000212664**

Vui lòng kiểm tra đúng tên người nhận trước khi chuyển khoản. Thank you for supporting AssetFlow ❤️
