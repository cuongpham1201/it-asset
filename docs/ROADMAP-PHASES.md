# AssetFlow — Roadmap theo Phase (P0 → P3)

> Nguồn chính thức của kế hoạch phát triển, thay thế mô hình sprint S01–S12 trong
> [ROADMAP.md](./ROADMAP.md) (đã deprecated, giữ lại để audit).
> Cập nhật lần cuối: 05/09/2026 — trong phase P1C.

## Định hướng sản phẩm

**AssetFlow là hệ thống quản lý tài sản nội bộ do ĐỘI IT vận hành.**
Không phải cổng self-service cho nhân viên (out of scope):

- Chỉ IT vận hành ứng dụng; không mở self-service cho end-user.
- Không có màn "Tài sản của tôi"; USER không xem tài sản/lịch sử.
- HCNS không vận hành asset.
- Nghiệp vụ tương lai (kể cả kiểm kê) mặc định dành cho IT.

## Mô hình vận hành (RBAC) — quyết định P1C

**ADMIN = IT. ADMIN là vai trò vận hành duy nhất được hỗ trợ.**

| Vai trò | Trạng thái | Quyền thực tế |
|---|---|---|
| ADMIN | Supported | Toàn bộ nghiệp vụ (behavior như trước P1C) |
| IT | Legacy — unsupported | 403 mọi endpoint nghiệp vụ |
| HCNS | Legacy — unsupported | 403 mọi endpoint nghiệp vụ |
| USER | Legacy — unsupported | 403 mọi endpoint nghiệp vụ |

Ghi chú triển khai:
- Enum `UserRole` và dữ liệu user cũ **giữ nguyên trong schema/DB** (backward
  compatibility, không migration); quyền bị khoá tại authorization layer.
- Điểm chặn duy nhất: `apps/api/src/auth/auth.guard.ts` — tài khoản non-ADMIN chỉ
  còn `/auth/me`, `/auth/change-password`, `/auth/logout`. Các assert theo service
  giữ lại làm defense-in-depth.
- Frontend: tài khoản non-ADMIN thấy màn "Không có quyền truy cập", không render
  navigation nghiệp vụ, không phát request tới endpoint chắc chắn 403.
- Kiểm kê tương lai: mặc định IT/ADMIN. *Accounting participation may be introduced
  later as a dedicated business requirement; do not pre-create role/permission now.*

## Trạng thái phase

| Phase | Nội dung | Trạng thái | Mốc |
|---|---|---|---|
| P0 | Clone source đã audit, first build/run cô lập trên Ubuntu | **DONE** | 25/08/2026, baseline `0c1d38a` |
| P0.5 | Publish UAT qua Cloudflare Tunnel — https://qlts.biahalong.com | **DONE** | 26/08/2026 |
| P1 | Full functional baseline UAT — 25 findings, verdict KEEP BASE + ITERATE | **DONE** | 26/08/2026 |
| P1A | Frontend data integrity & server-side data flow | **DONE** | tag `p1a-uat-pass-2026-08-26` (`41728ce`) |
| P1B | Master data + Audit visibility + Custodian history + timezone fix | **DONE** | tag `p1b-uat-pass-2026-09-05` (`586e52f1`) |
| P1C | **Admin-only authorization hardening** (scope đã đổi — xem Decision log) | **IN PROGRESS** | branch `feat/p1c-admin-only-auth` |
| P1D | Asset completeness: warranty end-to-end, attachment/ảnh/chứng từ, maintenance vendor/downtime/document, hoàn thiện asset detail | NOT STARTED | — |
| P2 | UX/platform cleanup: tách App.tsx, CSS/design system, responsive, toast thay alert, a11y, i18n theo key, server-side export, dashboard, optimistic locking, chuẩn hoá port/metrics/APP_VERSION/credentialHash, FK audit userId | NOT STARTED | — |
| P3 | Enterprise integration: Entra ID SSO, HRM, SharePoint/Object Storage, ERP/PO, approval workflow, SMTP thật, Agent/MCP | NOT STARTED | — |

Quy tắc phase (giữ nguyên từ P1A): một phase tại một thời điểm; không làm trước
phase sau; dependency phase sau → ghi finding, không implement; mỗi phase phải
build/test/UAT/regression PASS + push branch + closure report rồi mới chuyển;
migration forward-only, không sửa migration đã apply, không `db push`; merge main
chỉ bằng fast-forward sau khi full gate PASS; tag annotated theo ngày pass thực tế.

## P1C — phạm vi đã chỉnh (admin-only)

Phạm vi gốc của P1C ("sửa scope HCNS", "Tài sản của tôi cho USER") **bị thay thế**
bởi quyết định sản phẩm 05/09/2026. Phạm vi mới:

1. Một guard/policy ADMIN-only dùng chung tại AuthGuard cho toàn bộ business surface.
2. Legacy roles: đăng nhập được, business API → 403, UI hiển thị access-denied.
3. Không migration, không đổi dữ liệu user, không map role ngầm.
4. Regression: ADMIN giữ nguyên toàn bộ behavior; 4 vai được test đủ; giữ nguyên
   audit/history/lifecycle của P1B.
5. Cập nhật roadmap/docs thành source of truth trong repo (tài liệu này).

## Findings được đóng/loại bởi quyết định admin-only

- **F-08** (HCNS đọc/ghi bất đối xứng): *không còn là bug cần sửa theo hướng HCNS* —
  HCNS bị loại khỏi supported operator model, mọi truy cập nghiệp vụ bị chặn.
- **F-09** (USER không xem được tài sản): *BY DESIGN* — không phải self-service portal.
- Backlog BL-P1-05 (màn "Tài sản của tôi" + HCNS scope): **dropped** theo định hướng mới.

## Decision log

| Ngày | Quyết định |
|---|---|
| 25/08/2026 | Baseline = commit đã audit `0c1d38a`; UAT chạy image build từ source, không dùng ghcr edge/latest. |
| 26/08/2026 | UAT không dùng Caddy; API PORT=3000 qua override ngoài git (`/data/dev/qlts-runtime/compose.override.yaml`); mismatch 3000/8080 xử lý ở P2. |
| 26/08/2026 | Verdict P1: KEEP BASE + ITERATE. Backend lifecycle/state machine/data model mặc định KEEP. |
| 26/08/2026 | Asset History ≠ Audit Log — hai khái niệm, hai bảng, hai màn hình. actor ≠ custodian; `fromUserId/toUserId` giữ backward-compat song song `fromCustodianId/toCustodianId`. |
| 27/08/2026 | Business timezone cố định Asia/Ho_Chi_Minh (`audit.time.ts`); bare date = ngày VN, khoảng half-open; không multi-timezone cho tới khi có yêu cầu. |
| 05/09/2026 | Docker data-root chuyển sang `/data/docker`; gate "root ≥ 12 GB" cho build không còn áp dụng. |
| 05/09/2026 | **AssetFlow là ứng dụng IT-only. ADMIN = IT, vai trò vận hành duy nhất. IT/HCNS/USER thành legacy-unsupported, khoá tại authorization layer, không migration.** Kế toán tham gia kiểm kê (nếu có) là requirement riêng ở phase sau. |

## Tồn đọng / pre-production gates (ngoài scope các phase trên)

- **Migration hardening**: `202608260001_custodian_history` DISABLE/ENABLE trigger
  không có transaction wrapper tường minh (an toàn với `prisma migrate deploy`).
  Gate production: chỉ deploy migration qua `prisma migrate deploy`; verify trigger
  append-only sau migrate; migration tương lai có tắt trigger phải bọc transaction.
- **Proxy production**: stack gốc dùng Caddy 80/443, xung đột Nginx Proxy Manager
  trên host UAT — quyết định kiến trúc proxy khi baseline production.
- **Storage host UAT**: root còn ~29 GB không rõ (cần `sudo du` kiểm tra); Docker
  đã ở `/data`.
- Security backlog (P2): `/api/v1/metrics` reachable từ Internet sau bearer token;
  `credentialHash` trong discovery response; `APP_VERSION` chưa vào runtime stage.
