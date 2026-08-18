# Database

PostgreSQL runtime không nằm trong repository. Từ Sprint 02, Prisma là nguồn versioning schema chính:

- Schema: `backend/prisma/schema.prisma`
- Migration: `backend/prisma/migrations/`
- Seed: `backend/prisma/seed.ts`

Các SQL trong `database/migrations/` là thiết kế prototype trước Prisma và không được chạy cùng Prisma trên database mới.

Khởi tạo development database:

```bash
docker compose up -d postgres
npm run db:migrate --workspace @assetflow/backend
npm run db:seed --workspace @assetflow/backend
```
