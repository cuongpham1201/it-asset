# AssetFlow API

NestJS REST API dùng Prisma và PostgreSQL 16+.

> Schema hiện tại vẫn provisional. Không tạo migration production trước khi Business Gate trong `ASSETFLOW_SPRINT02_DEPLOY.md` được duyệt đầy đủ.

## Chạy development

```bash
docker compose up -d postgres
cp apps/api/.env.example apps/api/.env
npm run db:migrate
npm run db:seed
npm run dev:api
```

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- Health: `http://localhost:3000/api/v1/health/live`

Không đưa tài khoản mẫu, mật khẩu, LDAP bind password, token hoặc Microsoft client secret vào source code.
