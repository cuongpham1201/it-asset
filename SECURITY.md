# Security Policy

## Phiên bản được hỗ trợ

Chỉ release mới nhất nhận bản vá bảo mật. Các bản `edge`, branch phát triển và phiên bản trước v1.0 không được xem là production-ready.

## Báo cáo lỗ hổng

Không mở public issue cho lỗ hổng, credential bị lộ hoặc dữ liệu nhạy cảm. Hãy dùng **Security → Report a vulnerability** của GitHub repository để gửi báo cáo riêng tư, gồm phiên bản, ảnh hưởng và cách tái hiện tối thiểu.

Không khai thác dữ liệu thật, không duy trì truy cập và không công bố trước khi bản vá được phát hành. Maintainer sẽ xác nhận khi đã nhận báo cáo và phối hợp thời điểm công bố.

## Baseline self-host

- Dùng release tag cố định, HTTPS và secret khác nhau cho mỗi môi trường.
- Không publish PostgreSQL hoặc API quản trị trực tiếp ra Internet.
- Backup, restore-test và đọc release note trước khi nâng cấp.
- Không bật demo mode hoặc tài khoản mẫu trên bản public.
