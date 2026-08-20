# AssetFlow release and container delivery

## Luồng nhánh

```text
develop / pull request -> CI build + tests + security checks, không publish
main                   -> image edge để kiểm thử tích hợp
GitHub Release vX.Y.Z  -> image SemVer + latest cho người dùng
```

Không dùng `edge` cho dữ liệu production. Không để instance production tự theo dõi `edge`.

## Chuẩn bị repository GitHub

1. Push repository lên GitHub và bật GitHub Actions.
2. Workflow dùng `GITHUB_TOKEN`; không cần tạo PAT để publish package của chính repository.
3. Trong repository settings, cho workflow quyền đọc/ghi package nếu organization policy đang giới hạn.
4. Sau lần publish đầu, mở package `assetflow-frontend` và `assetflow-backend` rồi đặt visibility public nếu dự án public.
5. Bảo vệ nhánh `main`: bắt buộc CI pass và review trước merge.

## Phát hành

1. Merge thay đổi đã kiểm thử vào `main`; xác nhận image `edge` hoạt động ở staging.
2. Kiểm tra migration forward-only, backup và restore test.
3. Tạo GitHub Release với tag đúng dạng `vMAJOR.MINOR.PATCH`, ví dụ `v1.2.0`.
4. Workflow release build multi-architecture và publish:

```text
1.2.0
1.2
1
latest
```

5. Kiểm tra package digest/provenance và release notes trước khi thông báo người dùng.

Prerelease không được đẩy vào `latest` bởi workflow release hiện tại.

## Nâng cấp instance

Trong `.env`, đặt registry và phiên bản mong muốn:

```env
ASSETFLOW_REGISTRY=ghcr.io/my-github-owner
ASSETFLOW_VERSION=1.2.0
```

Sau khi backup:

```bash
docker compose pull
docker compose up -d
docker compose ps
docker compose logs api --tail=100
```

Không chạy `docker compose down -v` khi nâng cấp vì `-v` xóa volume PostgreSQL. Không tự đổi major version PostgreSQL qua Watchtower.

## Rollback

- App image có thể quay về tag cũ nếu schema vẫn backward compatible.
- Prisma migration là forward-only; đổi tag image không tự rollback database.
- Release có migration breaking phải có kế hoạch khôi phục backup hoặc migration bù đã kiểm thử.

## Chính sách cập nhật

- Mặc định: Notify/Manual.
- `latest`: dành cho người muốn theo stable mới nhất.
- SemVer cố định: khuyến nghị cho doanh nghiệp.
- `edge`: chỉ staging/developer.
- Không mount Docker socket cho auto-updater. Instance production cập nhật có kiểm soát bằng tag SemVer sau khi backup và restore-test.
