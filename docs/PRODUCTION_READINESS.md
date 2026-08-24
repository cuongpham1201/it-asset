# Production readiness

## Nền tảng đã triển khai

- PostgreSQL là nguồn dữ liệu thật; asset hiện tại là snapshot, các transaction và history là nguồn nghiệp vụ.
- API kiểm kê có mở phạm vi, snapshot kỳ vọng, quét Barcode/QR/serial, nhận diện lệch vị trí/người giữ, đóng/hủy và history/audit.
- Import Excel qua staging, kiểm tra toàn lô, commit nguyên tử và rollback toàn lô có chặn khi đã phát sinh nghiệp vụ.
- Migration và runtime dùng hai role PostgreSQL; API runtime không có quyền DDL.
- Readiness kiểm tra database, metrics có bearer token, Prometheus và Alertmanager chạy bằng profile riêng.
- Backup có checksum; `dr-drill.sh` kiểm tra khôi phục database trên volume tách biệt.
- Microsoft 365 và LDAP có adapter thật, mã hóa secret, connection test, sync log và script acceptance trên tenant/domain thật.
- CI build/test, migration smoke, dependency audit, Trivy filesystem/secret/config/image scan.

## Trạng thái chấp nhận

Mã nguồn hiện đủ để tiếp tục **UAT/pilot nội bộ có kiểm soát**. Chưa được tự động coi là production-ready chỉ vì build và test xanh.

Trước go-live, doanh nghiệp phải cung cấp bằng chứng môi trường:

- connection test và một controlled sync thành công với Microsoft 365 và/hoặc LDAP thật;
- receiver cảnh báo thật đã nhận một alert thử;
- backup off-host và DR drill đạt RPO/RTO được phê duyệt, gồm cả hồ sơ đính kèm;
- pentest độc lập đã retest toàn bộ phát hiện High/Critical;
- HTTPS, firewall/VPN, secret manager, retention log/backup và owner trực vận hành đã được phê duyệt;
- UAT nghiệp vụ kiểm kê, import/rollback, cấp phát/thu hồi và phân quyền HCNS đã ký xác nhận.

Rate limit hiện theo từng API process. Nếu chạy nhiều replica phải đặt rate limit dùng chung tại gateway/Redis trước khi mở Internet.

## Kết luận

Có thể triển khai nội bộ để UAT/pilot và thu thập bằng chứng trên. Chỉ chuyển nhãn production sau khi checklist môi trường phía trên hoàn tất; pentest và kiểm thử directory thật không thể được thay bằng mock/CI trong repository.
