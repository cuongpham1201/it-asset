# Bộ đóng gói triển khai

Thư mục này là baseline production có reverse proxy/secret file. Hai image được GitHub Actions publish lên GHCR khi tạo release.

## Yêu cầu host

- Windows: Docker Desktop chạy Linux containers; production dài hạn ưu tiên Windows Server VM chạy Ubuntu hoặc host Ubuntu.
- Ubuntu: Docker Engine + Compose plugin.
- RAM tối thiểu đề xuất 4 GB, production 8 GB trở lên.
- Domain trỏ DNS vào host; firewall chỉ mở 80/443. Không publish cổng PostgreSQL.

## Chuẩn bị

1. Copy `.env.example` thành `.env` và điền URL/version.
2. Tạo thư mục `secrets`; mỗi secret là một file chỉ tài khoản vận hành đọc được.
3. Sinh RSA/Ed25519 key pair cho JWT và khóa mã hóa ngẫu nhiên ít nhất 32 byte.
4. Pull hoặc load các image đúng version; xác minh checksum/signature.
5. Chạy migration bằng release job có backup trước đó. Mount `docker-entrypoint-initdb.d` chỉ dùng cho database cài mới.

Các file bắt buộc:

```text
deploy/secrets/postgres_password.txt
deploy/secrets/jwt_private.pem
deploy/secrets/jwt_public.pem
deploy/secrets/data_encryption_key.txt
```

SMTP secret sẽ được bổ sung khi outbox worker được triển khai; bản image hiện tại không khai báo một worker giả.

## Cài mới

```bash
docker compose --env-file .env -f compose.production.yml config
docker compose --env-file .env -f compose.production.yml up -d
docker compose --env-file .env -f compose.production.yml ps
```

Nếu chỉ chạy LAN không có domain công khai, đặt `APP_DOMAIN` thành `https://assets.company.internal` và phân phối root CA nội bộ của Caddy cho thiết bị người dùng, hoặc dùng certificate do CA doanh nghiệp cấp.

## Nâng cấp

1. Kiểm tra release note, backup và restore-test.
2. `docker compose pull` để lấy image version mới.
3. Backend image chạy `prisma migrate deploy` trước khi mở API; kiểm tra log migration và không bỏ qua bước backup/restore-test.
4. Đổi `ASSETFLOW_VERSION`, chạy `docker compose up -d`.
5. Kiểm tra readiness, login, cấp phát thử và email outbox.
6. Không downgrade schema nếu chưa có migration rollback được kiểm thử.

## Backup

- Database: base backup + WAL archiving hoặc công cụ backup PostgreSQL chuyên dụng.
- Documents: snapshot/versioning của volume hoặc bucket.
- Caddy data: backup để giữ certificate/account metadata.
- Secrets/keys: backup mã hóa riêng, quyền truy cập tách biệt.
- Không coi việc copy volume đang chạy là backup database hợp lệ.

## Windows và Ubuntu

Compose và image là giống nhau. Script wrapper sẽ có hai bản PowerShell/Bash, nhưng phải gọi cùng command và không được chứa secret. Đường dẫn dữ liệu được quản lý bằng named volume để tránh khác biệt ký tự ổ đĩa và quyền file giữa hai hệ điều hành.
