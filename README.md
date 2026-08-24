# AssetFlow

[![CI](https://github.com/duclamtk39/assetIT/actions/workflows/ci.yml/badge.svg)](https://github.com/duclamtk39/assetIT/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/Docker-GHCR-2496ED?logo=docker&logoColor=white)](https://github.com/duclamtk39/assetIT/pkgs)
[![Release](https://img.shields.io/github/v/release/duclamtk39/assetIT?sort=semver)](https://github.com/duclamtk39/assetIT/releases)

AssetFlow là phần mềm quản lý vòng đời tài sản self-hosted: nhập kho, cấp phát, cho mượn, thu hồi, điều chuyển, bảo trì, lịch sử và Barcode/QR.

> Trạng thái: **Internal UAT**. Có API, PostgreSQL, xác thực phía server, RBAC, audit và backup/restore. Có thể chạy pilot trong LAN/VPN, nhưng chưa được công bố production-ready hoặc khuyến nghị mở trực tiếp ra Internet.

## Cài bản mới nhất bằng Docker

Yêu cầu: Linux hoặc Windows có Docker Engine/Docker Desktop và Docker Compose v2.

```bash
git clone https://github.com/duclamtk39/assetIT.git
cd assetIT
cp .env.example .env
```

Sửa `.env` trước lần chạy đầu:

```env
ASSETFLOW_REGISTRY=ghcr.io/duclamtk39
ASSETFLOW_VERSION=edge
APP_URL=http://localhost:8080
APP_PORT=8080

POSTGRES_DB=assetflow
POSTGRES_USER=assetflow
POSTGRES_PASSWORD=thay-bang-mat-khau-database-manh

INITIAL_ADMIN_PASSWORD=thay-bang-mat-khau-tam-manh
DIRECTORY_ENCRYPTION_KEY=thay-bang-khoa-32-byte-base64
ASSETFLOW_DEMO_SEED=false
```

Tạo khóa mã hóa bằng:

```bash
openssl rand -base64 32
```

Khởi động:

```bash
docker compose -f compose.yaml config --quiet
docker compose -f compose.yaml pull
docker compose -f compose.yaml up -d
docker compose -f compose.yaml ps
curl -fsS http://127.0.0.1:8080/api/v1/health/live
```

Mở `http://localhost:8080`. Tài khoản cài mới là `admin`, mật khẩu là `INITIAL_ADMIN_PASSWORD`; hệ thống bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên.

Windows PowerShell dùng `Copy-Item .env.example .env` thay cho `cp` và có thể kiểm tra health bằng `Invoke-RestMethod http://127.0.0.1:8080/api/v1/health/live`.

### `edge` và release khác nhau thế nào?

- `edge`: build mới nhất từ nhánh `main`, phù hợp UAT/pilot. Sau mỗi lần `git pull` phải chạy thêm `docker compose pull` để tải image mới.
- `2.1.0`, `2.2.0`...: release bất biến, phù hợp môi trường cần ổn định và rollback.
- `git pull` chỉ cập nhật compose, script và tài liệu; nó không tự thay image đang chạy.

## Cập nhật bản mới nhất

Chạy trong thư mục đã cài:

```bash
git pull --ff-only origin main
./scripts/backup.sh

docker compose -f compose.yaml pull api web
docker compose -f compose.yaml up -d api web
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs --tail=100 api web
curl -fsS http://127.0.0.1:8080/api/v1/health/live
```

Nếu `.env` đang ghim release cũ và muốn theo bản mới nhất UAT:

```bash
sed -i 's/^ASSETFLOW_VERSION=.*/ASSETFLOW_VERSION=edge/' .env
```

Không thay `POSTGRES_PASSWORD` sau khi database đã khởi tạo nếu chưa thực hiện quy trình rotate mật khẩu trong PostgreSQL. Biến môi trường mới không tự đổi mật khẩu đã lưu trong volume.

## Dữ liệu, backup và restore

- PostgreSQL: volume `assetflow_pgdata`.
- Hồ sơ đính kèm: volume `assetflow_documents`.
- Production không tự tạo dữ liệu demo khi `ASSETFLOW_DEMO_SEED=false`.
- Không chạy `docker compose down -v`; tùy chọn `-v` xóa volume dữ liệu.

Tạo backup database và hồ sơ, kèm checksum:

```bash
./scripts/backup.sh
```

Khôi phục chỉ dùng khi đã xác định đúng bộ backup và chấp nhận thay dữ liệu hiện tại:

```bash
./scripts/restore.sh backups/assetflow-YYYYMMDDTHHMMSSZ
```

Luôn lưu `.env` và khóa mã hóa ở nơi bảo mật riêng; không commit secret hoặc backup lên Git.

## Triển khai môi trường thật

### Có thể triển khai ngay

Có thể dùng cho **UAT/pilot nội bộ** khi đáp ứng đủ:

- chỉ truy cập qua LAN, VPN hoặc HTTPS;
- dùng mật khẩu/khóa riêng, không bật demo seed;
- backup hằng ngày và đã thử restore trên máy tách biệt;
- theo dõi health, dung lượng volume và Docker logs;
- dữ liệu có thể khôi phục và chưa phải dữ liệu tối mật.

### Chưa nên triển khai

Chưa nên dùng làm hệ thống production duy nhất hoặc mở public Internet vì còn các khoảng trống:

- kiểm kê chưa có API transaction hoàn chỉnh;
- import Excel chưa có staging và rollback nguyên lô;
- rate limit chưa dùng kho dùng chung khi chạy nhiều API replica;
- tài khoản migration và runtime PostgreSQL chưa tách riêng;
- Microsoft 365/LDAP chưa có bằng chứng UAT với tenant/domain thực tế;
- chưa hoàn tất pentest, monitoring/cảnh báo, retention và diễn tập khôi phục thảm họa.

Triển khai mới có domain, HTTPS, Docker secrets và Caddy xem [hướng dẫn production](infra/docker/production/README.md). Không chuyển một stack `compose.yaml` đang có dữ liệu sang compose production bằng cách chạy trực tiếp; hai cấu hình dùng tên service/volume khác nhau và cần kế hoạch migrate riêng.

## Phát triển và kiểm thử

```bash
npm ci
npm run verify
npm run dev
```

`npm run verify` build API/web, chạy test backend/frontend và audit dependency. Dữ liệu mẫu chỉ dành cho local khi bật `VITE_DEMO_MODE=true`.

## Tài liệu

- [Kiến trúc](docs/ARCHITECTURE.md)
- [Bảo mật và luồng dữ liệu](docs/SECURITY_AND_DATA_FLOW.md)
- [Mức sẵn sàng production](docs/PRODUCTION_READINESS.md)
- [Quy trình release](docs/RELEASE.md)
- [Đóng góp](CONTRIBUTING.md) · [Báo cáo bảo mật](SECURITY.md) · [MIT License](LICENSE)

## ❤️ Support AssetFlow

AssetFlow miễn phí và có thể self-host. Nếu dự án hữu ích, bạn có thể hỗ trợ chi phí duy trì và phát triển.

### Donate qua Vietcombank

<img width="373" height="450" alt="AssetFlow donate QR" src="https://github.com/user-attachments/assets/a8ce277b-f365-4599-9961-34cc7d4531ec" />

- Chủ tài khoản: **NGUYEN DUC LAM**
- Số tài khoản: **059000212664**

Vui lòng kiểm tra đúng tên người nhận trước khi chuyển khoản. Thank you for supporting AssetFlow ❤️
