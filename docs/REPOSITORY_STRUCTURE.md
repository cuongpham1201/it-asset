# Repository structure

## Nguyên tắc

- `apps/` chỉ chứa ứng dụng có thể build và chạy độc lập.
- `database/` không chứa dữ liệu runtime hoặc secret; Prisma migrations là nguồn schema duy nhất.
- `infra/` chứa cấu hình triển khai, không chứa logic nghiệp vụ.
- `packages/` dành cho thư viện TypeScript dùng chung khi thực sự có từ hai consumer trở lên.
- `docs/` chứa quyết định kiến trúc và nghiệp vụ; không dùng README thay cho migration hoặc cấu hình chạy.

## Luồng phụ thuộc

```text
Browser -> apps/web -> /api -> apps/api -> PostgreSQL
                                  |          private network
                                  +-> document storage / integrations
```

Web không có credential database và không thực thi kiểm tra quyền thay cho API. Mọi thay đổi dữ liệu phải qua API, transaction và audit.

## Quy tắc thêm mã nguồn

- Route/UI mới: `apps/web/src`.
- Module nghiệp vụ/API mới: `apps/api/src`.
- Thay đổi schema: `apps/api/prisma/schema.prisma` kèm migration được review.
- Docker/HTTPS/backup: `infra/` hoặc `scripts/`.
- Thư viện dùng chung: chỉ đưa vào `packages/` khi không phụ thuộc framework của một app.

CI bắt buộc build toàn workspace, audit dependency, scan secret/misconfiguration và build thử cả hai image trước khi merge.
