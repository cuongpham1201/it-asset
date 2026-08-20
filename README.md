# AssetFlow

[![CI](https://github.com/duclamtk39/assetIT/actions/workflows/ci.yml/badge.svg)](https://github.com/duclamtk39/assetIT/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://github.com/duclamtk39/assetIT/pkgs)
[![Release](https://img.shields.io/github/v/release/duclamtk39/assetIT?sort=semver)](https://github.com/duclamtk39/assetIT/releases)

AssetFlow là phần mềm mã nguồn mở, self-host dùng để quản lý vòng đời tài sản: nhập kho, cấp phát, cho mượn, thu hồi, điều chuyển, bảo trì và kiểm kê.

> AssetFlow hiện ở giai đoạn trước v1.0. Backend đã có local auth, scope phòng ban, audit và transaction lifecycle lõi; một số màn hình frontend vẫn đang chuyển từ prototype/local state sang API. Chỉ dùng bản hiện tại để staging/đánh giá, chưa dùng dữ liệu nhạy cảm trên Internet.

## Cài nhanh bằng Docker

Yêu cầu: Docker Engine hoặc Docker Desktop và Docker Compose v2.

```bash
git clone https://github.com/duclamtk39/assetIT.git
cd assetIT
cp .env.example .env
# đặt POSTGRES_PASSWORD mạnh và ghim ASSETFLOW_VERSION
docker compose pull
docker compose up -d
```

Nếu muốn build và thử trực tiếp từ source vừa clone, không cần chờ image trên GHCR:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d --build
```

Sau khi workflow trên nhánh `main` publish image, có thể đặt `ASSETFLOW_VERSION=edge` trong `.env` để thử bản mới nhất. Khi dùng thật, nên chuyển sang tag release cố định.

Windows PowerShell dùng `Copy-Item .env.example .env` thay cho lệnh `cp`. Mở `http://localhost:8080` và kiểm tra bằng:

```bash
docker compose ps
docker compose logs --tail=100
```

Đăng nhập lần đầu:

```text
Tài khoản: admin
Mật khẩu:  admin123
```

AssetFlow tự tạo tài khoản này trong PostgreSQL khi cơ sở dữ liệu chưa có người dùng `admin`; không cần chạy lệnh seed hay cấu hình thủ công. Hệ thống bắt buộc đặt mật khẩu mới ngay lần đăng nhập đầu tiên và không tự tạo lại/đặt lại mật khẩu ở các lần khởi động sau.

Dữ liệu PostgreSQL nằm trong volume `assetflow_pgdata`; chứng từ nằm trong `assetflow_documents`. Không chạy `docker compose down -v` nếu muốn giữ dữ liệu. API tự chạy Prisma migration trước khi nhận request; migration lỗi thì API không khởi động.

## Backup và restore

Tạo backup đầy đủ database và chứng từ:

```bash
bash scripts/backup.sh
```

Windows PowerShell:

```powershell
.\scripts\backup.ps1
```

Restore yêu cầu xác nhận vì sẽ thay thế dữ liệu hiện tại:

```bash
bash scripts/restore.sh backups/assetflow-YYYYMMDDTHHMMSSZ
```

```powershell
.\scripts\restore.ps1 -BackupPath .\backups\assetflow-YYYYMMDDTHHMMSSZ
```

Quy trình, lịch backup và kiểm tra sau restore nằm trong [hướng dẫn backup/restore](docs/BACKUP_RESTORE.md).

## Đồng bộ người dùng

Microsoft 365/Entra ID và LDAP/Active Directory được kết nối qua backend. Trước khi lưu secret, tạo `DIRECTORY_ENCRYPTION_KEY` theo [hướng dẫn đồng bộ danh tính](docs/DIRECTORY_SYNC.md). Tính năng đồng bộ hồ sơ, phòng ban, trạng thái và vai trò; chưa cung cấp SSO.

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

Các lệnh chính: `npm run dev:web`, `npm run dev:api`, `npm run build`, `npm run verify`. Chỉ bật dữ liệu mẫu ở local bằng `VITE_DEMO_MODE=true`.

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
- [Backup và restore](docs/BACKUP_RESTORE.md)
- [Microsoft 365 và LDAP](docs/DIRECTORY_SYNC.md)
- [Quy trình release](docs/RELEASE.md)
- [Đóng góp](CONTRIBUTING.md) · [Báo cáo bảo mật](SECURITY.md)
- [Giấy phép MIT](LICENSE)

## ❤️ Support AssetFlow

AssetFlow miễn phí và có thể self-host. Nếu dự án hữu ích, bạn có thể hỗ trợ chi phí duy trì và phát triển.
<img width="235" height="294" alt="image" src="https://github.com/user-attachments/assets/1187b400-08ba-4fb7-8194-dec25d63410a" />

- Chủ tài khoản: **NGUYEN DUC LAM**
- Số tài khoản: **059000212664**

Xin cảm ơn !!!!
