# Contributing

1. Tạo branch từ `develop`; không commit trực tiếp lên `main`.
2. Không commit `.env`, secret, database dump, file upload hoặc dữ liệu cá nhân.
3. Chạy `npm ci` và `npm run verify` trước khi push.
4. Thay đổi schema phải kèm migration, mô tả tương thích và kế hoạch rollback/backup.
5. Pull request cần mô tả phạm vi, cách kiểm thử và ảnh chụp nếu thay đổi UI.

Commit nên nhỏ, có mục đích rõ ràng và không trộn refactor không liên quan. Lỗ hổng bảo mật phải gửi theo [SECURITY.md](SECURITY.md), không tạo public issue.
