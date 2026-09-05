# Changelog

Các thay đổi đáng chú ý của AssetFlow được ghi tại đây theo Semantic Versioning.

## [Unreleased]

### Changed

- **AssetFlow là hệ thống nội bộ do đội IT vận hành; ADMIN là vai trò vận hành duy nhất được hỗ trợ** (quyết định sản phẩm P1C). Tài khoản mang vai trò cũ (IT/HCNS/USER) vẫn đăng nhập/đổi mật khẩu/đăng xuất được nhưng bị chặn 403 tại một điểm duy nhất trong AuthGuard cho mọi endpoint nghiệp vụ; giao diện hiển thị màn "Không có quyền truy cập" thay vì ứng dụng. Không migration — enum và dữ liệu role cũ giữ nguyên để tương thích.
- P1A (server-side data flow) và P1B (audit + custodian history) đã phát hành: xem tag `p1a-uat-pass-2026-08-26`, `p1b-uat-pass-2026-09-05` và `docs/ROADMAP-PHASES.md`.

## [2.0.1] - 2026-08-21

### Fixed

- Khóa npm cache dùng chung giữa các BuildKit stage/platform để loại bỏ lỗi race khi build image đa kiến trúc trên GitHub Actions.

## [2.0.0] - 2026-08-21

### Added

- API và PostgreSQL cho cấu hình hệ thống, danh mục dùng chung và nhà cung cấp.
- Trường cấu hình kỹ thuật tài sản: CPU, RAM, ổ đĩa, hệ điều hành, IP và MAC.
- Ba migration forward-only cho thông số tài sản, application settings và vendors.
- Kiểm thử quyền quản trị đối với cấu hình và danh mục hệ thống.

### Changed

- Frontend production đọc/ghi tài sản, lịch sử và nghiệp vụ vòng đời qua REST API.
- Typography giao diện chuyển sang General Sans với cấp độ chữ thống nhất cho dashboard, bảng, form và trạng thái.
- Dữ liệu demo chỉ được seed khi chủ động đặt `ASSETFLOW_DEMO_SEED=true`.
- Image UAT/stable mặc định được ghim ở `ASSETFLOW_VERSION=2.0.0`.

### Security

- Dữ liệu demo và lịch sử mẫu không còn được khởi tạo trong production.
- Cấu hình nhạy cảm tiếp tục được xử lý tại backend; secret directory không được gửi lại trình duyệt.

[2.0.1]: https://github.com/duclamtk39/assetIT/releases/tag/v2.0.1
[2.0.0]: https://github.com/duclamtk39/assetIT/releases/tag/v2.0.0
