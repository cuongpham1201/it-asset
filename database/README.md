# Database

PostgreSQL runtime và dữ liệu không nằm trong Git. Nguồn versioning schema duy nhất dùng khi chạy ứng dụng là:

- Schema: `apps/api/prisma/schema.prisma`
- Migration: `apps/api/prisma/migrations/`
- Seed phát triển: `apps/api/prisma/seed.ts`

`database/reference/` chứa SQL thiết kế cũ để tra cứu. Không chạy các file này cùng Prisma và không mount vào `docker-entrypoint-initdb.d`.

```bash
docker compose up -d postgres
npm run db:migrate
npm run db:seed
```

Database không publish cổng trong cấu hình self-host. Chỉ API được tham gia private network `data` và có quyền kết nối PostgreSQL.
