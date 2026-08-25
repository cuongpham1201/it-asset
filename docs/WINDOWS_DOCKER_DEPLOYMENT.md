# Triển khai AssetFlow trên Windows bằng Docker

Tài liệu này dành cho Windows 10/11 chạy Docker Desktop với WSL2 và Linux containers. Cách triển khai phù hợp cho UAT, pilot và hệ thống nội bộ quy mô nhỏ.

> Với máy chủ chạy liên tục 24/7, nên dùng Ubuntu Server hoặc một máy ảo Linux. Docker Desktop không phải lựa chọn triển khai cho Windows Server; máy Windows cũng cần được cấu hình không sleep và kiểm soát việc khởi động lại do Windows Update.

## 1. Yêu cầu

- Windows 10/11 64-bit hỗ trợ WSL2 và virtualization.
- Tối thiểu 2 CPU, 4 GB RAM và 20 GB ổ đĩa trống.
- IP LAN cố định hoặc DHCP reservation.
- Quyền Administrator để cài WSL2, Docker Desktop và mở Windows Firewall.
- Git for Windows.

Tài liệu cài đặt chính thức:

- [Cài WSL](https://learn.microsoft.com/en-us/windows/wsl/install)
- [Cài Docker Desktop trên Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Docker Desktop với WSL2](https://docs.docker.com/desktop/features/wsl/)

## 2. Cài WSL2 và Docker Desktop

Mở **PowerShell bằng quyền Administrator**:

```powershell
wsl --install
```

Khởi động lại Windows khi được yêu cầu. Sau đó kiểm tra:

```powershell
wsl --version
wsl -l -v
```

Cài Docker Desktop, sau đó kiểm tra các tùy chọn:

1. **Settings → General → Use the WSL 2 based engine** phải được bật.
2. Docker Desktop phải chạy ở chế độ **Linux containers**.
3. **Settings → Resources → WSL Integration** phải bật cho distro Linux dùng để chạy script backup/restore.
4. Nên bật **Start Docker Desktop when you sign in** nếu đây là máy UAT nội bộ.

Kiểm tra trong PowerShell:

```powershell
docker version
docker compose version
git --version
docker run --rm hello-world
```

## 3. Tải mã nguồn

Ví dụ cài tại ổ `E:`:

```powershell
New-Item -ItemType Directory -Path "E:\Software" -Force | Out-Null
Set-Location "E:\Software"
git clone https://github.com/duclamtk39/assetIT.git
Set-Location "E:\Software\assetIT\infra\docker\production"
```

Nên dùng `git clone` thay vì tải ZIP để việc cập nhật sau này chỉ cần `git pull`.

## 4. Khởi tạo cấu hình và secrets

Script `init.sh` tạo file `.env` và các mật khẩu ngẫu nhiên trong thư mục `secrets/`. Chạy script qua WSL:

```powershell
wsl sh -lc "cd /mnt/e/Software/assetIT/infra/docker/production && ./init.sh"
```

Nếu WSL báo thiếu OpenSSL, mở distro Linux và cài:

```bash
sudo apt update
sudo apt install -y openssl
```

Sau đó chạy lại lệnh khởi tạo. Kiểm tra các file đã được tạo:

```powershell
Get-ChildItem -LiteralPath ".\secrets"
```

Thư mục phải có các file:

```text
postgres_bootstrap_password.txt
postgres_migration_password.txt
postgres_runtime_password.txt
data_encryption_key.txt
metrics_token.txt
initial_admin_password.txt
```

Không commit, gửi qua chat hoặc email các file này. Sau khi database đã khởi tạo, không xóa hoặc chạy lại để thay thế secrets; mật khẩu mới sẽ không còn khớp dữ liệu trong volume cũ.

## 5. Cấu hình địa chỉ truy cập

Xác định IPv4 LAN của máy:

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
  Format-Table InterfaceAlias,IPAddress,PrefixLength
```

Mở file cấu hình:

```powershell
notepad ".env"
```

Ví dụ máy Windows có IP `192.168.50.20`:

```env
ASSETFLOW_VERSION=edge
REGISTRY_PREFIX=ghcr.io/duclamtk39

APP_DOMAIN=http://192.168.50.20
APP_URL=http://192.168.50.20
COOKIE_SECURE=false

POSTGRES_DB=assetflow
POSTGRES_BOOTSTRAP_USER=assetflow_bootstrap
POSTGRES_MIGRATION_USER=assetflow_migrator
POSTGRES_RUNTIME_USER=assetflow_runtime
TRUSTED_PROXY_CIDRS=172.16.0.0/12
```

Thay IP bằng địa chỉ thật của máy. `edge` phù hợp UAT vì nhận image mới nhất từ nhánh `main`; môi trường ổn định nên ghim tag SemVer cụ thể.

HTTP qua IP chỉ phù hợp LAN/VPN tin cậy. Khi có domain và HTTPS, đổi thành:

```env
APP_DOMAIN=assets.company.vn
APP_URL=https://assets.company.vn
COOKIE_SECURE=true
```

## 6. Mở Windows Firewall

Kiểm tra cổng 80 có đang bị ứng dụng khác sử dụng:

```powershell
Get-NetTCPConnection -LocalPort 80 -ErrorAction SilentlyContinue
```

Trong **PowerShell bằng quyền Administrator**, mở HTTP cho mạng Domain/Private:

```powershell
New-NetFirewallRule `
  -DisplayName "AssetFlow HTTP" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 80 `
  -Action Allow `
  -Profile Domain,Private
```

Khi dùng HTTPS, mở thêm cổng 443 theo cùng cách. Không mở cổng PostgreSQL `5432` ra LAN hoặc Internet.

## 7. Khởi động AssetFlow

Chạy trong thư mục `E:\Software\assetIT\infra\docker\production`:

```powershell
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps -a
```

Kiểm tra log khi cần:

```powershell
docker compose logs --tail=200 db migrate api web proxy
```

Container `migrate` kết thúc với mã `0` là bình thường. `db`, `api`, `web` và `proxy` phải ở trạng thái running/healthy.

Kiểm tra API ngay trên máy Windows:

```powershell
Invoke-RestMethod "http://127.0.0.1/api/v1/health/ready"
```

Từ máy khác trong LAN, mở:

```text
http://192.168.50.20
```

## 8. Đăng nhập lần đầu

Tài khoản mặc định:

```text
admin
```

Xem mật khẩu khởi tạo bằng PowerShell:

```powershell
Get-Content -LiteralPath ".\secrets\initial_admin_password.txt"
```

Hệ thống bắt buộc đổi mật khẩu ngay lần đăng nhập đầu tiên. Production không tự tạo dữ liệu demo.

## 9. Kiểm tra sau triển khai

- Đăng nhập và đổi mật khẩu quản trị thành công.
- Tạo thử phòng ban, địa điểm và một tài sản.
- Thử cấp phát, thu hồi và xem lịch sử tài sản.
- Kiểm tra Barcode/QR, upload/download tệp đính kèm.
- Đăng xuất rồi đăng nhập lại.
- Khởi động lại Docker Desktop và kiểm tra dữ liệu vẫn còn.
- Chỉ những máy trong LAN/VPN được phép truy cập.

## 10. Dừng và chạy lại

```powershell
Set-Location "E:\Software\assetIT\infra\docker\production"
docker compose stop
docker compose start
```

Có thể xóa container và tạo lại mà không xóa named volume:

```powershell
docker compose down
docker compose up -d
```

> Không chạy `docker compose down -v`. Tùy chọn `-v` xóa volume database và hồ sơ đính kèm.

## 11. Cập nhật phiên bản

Backup trước khi cập nhật. Sau khi GitHub Actions của nhánh `main` hoàn tất:

```powershell
Set-Location "E:\Software\assetIT"
git pull --ff-only origin main
Set-Location ".\infra\docker\production"
docker compose pull
docker compose up -d --remove-orphans
docker compose ps -a
Invoke-RestMethod "http://127.0.0.1/api/v1/health/ready"
```

`git pull` cập nhật cấu hình triển khai; `docker compose pull` tải image mới. Migration phải chạy thành công trước khi API nhận request.

## 12. Backup trên Windows

Docker Desktop phải bật WSL Integration cho distro đang dùng. Chạy từ PowerShell:

```powershell
Set-Location "E:\Software\assetIT"
wsl sh -lc "cd /mnt/e/Software/assetIT && ASSETFLOW_COMPOSE_FILE=infra/docker/production/compose.yaml ASSETFLOW_DB_SERVICE=db ./scripts/backup.sh"
```

Backup được tạo trong `E:\Software\assetIT\backups\assetflow-<thời-gian>\`. Ngoài bundle backup, phải sao lưu mã hóa sang thiết bị hoặc máy khác:

- `backups\`
- `infra\docker\production\.env`
- `infra\docker\production\secrets\`

Không lưu bản backup duy nhất trên cùng ổ đĩa với Docker Desktop.

Khôi phục sẽ thay thế database hiện tại. Chỉ thực hiện trong thời gian bảo trì, sau khi đã tạo thêm một bản backup và xác định đúng thư mục nguồn:

```powershell
wsl sh -lc "cd /mnt/e/Software/assetIT && ASSETFLOW_COMPOSE_FILE=infra/docker/production/compose.yaml ASSETFLOW_DB_SERVICE=db ./scripts/restore.sh backups/assetflow-YYYYMMDDTHHMMSSZ"
```

Nhập `RESTORE` khi script yêu cầu. Sau đó kiểm tra đăng nhập, số lượng tài sản, tệp đính kèm và audit log.

## 13. Xử lý lỗi thường gặp

### Docker Desktop chưa chạy

Nếu PowerShell không kết nối được Docker daemon, mở Docker Desktop và chờ trạng thái **Engine running**.

### GHCR báo unauthorized hoặc denied

Nếu image chưa public, đăng nhập GHCR bằng GitHub username và Personal Access Token có quyền đọc package:

```powershell
docker login ghcr.io -u duclamtk39
```

Nhập token khi Docker hỏi mật khẩu; không ghi token vào lệnh, `.env` hoặc tài liệu.

### Cổng 80/443 bị chiếm

```powershell
Get-NetTCPConnection -LocalPort 80,443 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,State,OwningProcess
```

Dừng hoặc đổi cấu hình dịch vụ đang chiếm cổng trước khi chạy AssetFlow.

### Migration lỗi `P1000`

Mật khẩu trong volume database cũ không khớp với file secret hiện tại. Không xóa volume để sửa nhanh; khôi phục bộ secrets cũ hoặc thực hiện quy trình đổi mật khẩu PostgreSQL có kiểm soát.

### WSL không gọi được Docker

Bật **Docker Desktop → Settings → Resources → WSL Integration** cho distro đang dùng, sau đó chạy:

```powershell
wsl docker version
```

### Xem trạng thái đầy đủ

```powershell
Set-Location "E:\Software\assetIT\infra\docker\production"
docker compose ps -a
docker compose logs --tail=200 db migrate api web proxy
docker compose config
```

## 14. Lưu ý vận hành Windows

- Tắt sleep/hibernate cho máy chạy AssetFlow.
- Cấu hình Docker Desktop tự chạy sau khi đăng nhập Windows.
- Kiểm soát lịch Windows Update và khởi động lại ngoài giờ làm việc.
- Theo dõi dung lượng ổ chứa Docker Desktop và thư mục backup.
- Sao lưu định kỳ, mã hóa secrets và thử restore trên máy tách biệt.
- Dùng HTTPS trước khi mở truy cập ngoài LAN/VPN.
- Nếu yêu cầu HA, giám sát 24/7 hoặc nhiều người dùng, chuyển production stack sang Linux server.
