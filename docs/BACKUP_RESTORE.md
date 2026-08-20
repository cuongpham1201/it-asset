# Backup và restore AssetFlow

Bộ công cụ này áp dụng cho bản cài nhanh bằng `compose.yaml`. Một backup gồm:

- `database.dump`: PostgreSQL custom-format, có thể kiểm tra bằng `pg_restore --list`.
- `documents/`: hóa đơn, biên bản và tệp đính kèm trong volume của API.
- `manifest.txt`: phiên bản định dạng, thời gian UTC và SHA-256 của database dump.

Backup không chứa `.env`, mật khẩu database hoặc Docker secrets. Các tệp này phải được sao lưu riêng trong kho bí mật được mã hóa. Khi đã cấu hình LDAP/Microsoft 365, restore bắt buộc dùng lại đúng `DIRECTORY_ENCRYPTION_KEY`/`data_encryption_key`; nếu mất khóa, secret trong database không thể giải mã.

## Tạo backup

Linux/macOS:

```bash
bash scripts/backup.sh
```

Windows PowerShell:

```powershell
.\scripts\backup.ps1
```

Kết quả nằm tại `backups/assetflow-YYYYMMDDTHHMMSSZ`. PostgreSQL dùng snapshot nhất quán nên ứng dụng có thể tiếp tục hoạt động trong lúc backup.

Có thể chỉ định thư mục khác:

```bash
bash scripts/backup.sh /mnt/backup/assetflow
```

```powershell
.\scripts\backup.ps1 -OutputDirectory D:\Backup\AssetFlow
```

## Restore

Restore thay thế toàn bộ database và nội dung volume chứng từ hiện tại. Script dừng web/API, kiểm tra định dạng dump, restore database, khôi phục chứng từ rồi mới khởi động lại dịch vụ. Không dùng backup từ phiên bản AssetFlow mới hơn cho bản ứng dụng cũ hơn.

Linux/macOS:

```bash
bash scripts/restore.sh backups/assetflow-20260819T120000Z
```

Windows PowerShell:

```powershell
.\scripts\restore.ps1 -BackupPath .\backups\assetflow-20260819T120000Z
```

Chế độ tự động hóa yêu cầu xác nhận rõ ràng:

```bash
bash scripts/restore.sh /mnt/backup/assetflow-20260819T120000Z --yes
```

```powershell
.\scripts\restore.ps1 -BackupPath D:\Backup\AssetFlow\assetflow-20260819T120000Z -Force
```

Sau restore, kiểm tra:

```bash
docker compose ps
docker compose logs --tail=100 api
```

Đăng nhập, đối chiếu số lượng tài sản, lịch sử giao dịch và mở thử ít nhất một tệp đính kèm.

## Chính sách vận hành đề xuất

- Backup database và chứng từ hằng ngày; giữ tối thiểu 7 bản ngày, 4 bản tuần và 6 bản tháng.
- Áp dụng nguyên tắc 3-2-1: ba bản sao, hai loại lưu trữ, một bản ở ngoài hệ thống.
- Mã hóa backup ở nơi lưu và khi truyền; giới hạn quyền đọc cho nhóm vận hành.
- Thử restore trên môi trường tách biệt ít nhất mỗi quý. Backup chưa từng restore thử chưa được coi là an toàn.
- Luôn tạo backup ngay trước khi nâng cấp phiên bản hoặc migration lớn.
- Không dùng `docker compose down -v` trừ khi chủ đích xóa toàn bộ dữ liệu và đã kiểm tra backup.
