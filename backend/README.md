# AssetFlow Backend

NestJS REST API provisional của AssetFlow Sprint 02, dùng Prisma và PostgreSQL 16+.

> Không dùng schema hiện tại để tạo migration production. Phải hoàn tất Business Gate trong `../ASSETFLOW_SPRINT02_DEPLOY.md` trước; Assignment/Return/Transfer/Inventory/Maintenance chưa được phản ánh đầy đủ trong schema hiện tại.

## Chạy development

```bash
docker compose up -d postgres
cp backend/.env.example backend/.env
npm run db:migrate --workspace @assetflow/backend
npm run db:seed --workspace @assetflow/backend
npm run dev --workspace @assetflow/backend
```

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- Health: `http://localhost:3000/api/v1/health/live`

Không đưa tài khoản mẫu, mật khẩu, LDAP bind password hoặc Microsoft client secret vào source code.
