# Production readiness

## Mức sẵn sàng hiện tại

AssetFlow 2.1 được chấp nhận cho **UAT nội bộ có kiểm soát**, không phải chứng nhận production hoàn chỉnh.

Phạm vi đã lưu thật qua API/PostgreSQL:

- tài sản, danh mục, phòng ban, site/vị trí, kho, người nhận và nhà cung cấp;
- cấp phát, cho mượn, thu hồi, điều chuyển, bảo trì;
- trạng thái hiện tại của tài sản, lịch sử vòng đời và audit log;
- cấu hình thương hiệu, vùng/ngôn ngữ và cấu hình đồng bộ Microsoft 365/LDAP đã mã hóa.

`assets` là snapshot để truy vấn nhanh. Nguồn nghiệp vụ là các bảng transaction như `asset_assignments`, `asset_returns`, `asset_transfers`, `maintenance_records`; lịch sử và audit là append-only.

## Kiểm soát đã có

- mật khẩu scrypt có salt; tài khoản khởi tạo lấy từ secret và buộc đổi lần đầu;
- session token ngẫu nhiên chỉ lưu bản băm, cookie HttpOnly/SameSite/Secure khi HTTPS;
- chống thử mật khẩu liên tục, audit đăng nhập và đổi mật khẩu;
- RBAC phía API và giới hạn phòng ban cho HCNS;
- kiểm tra Origin cho request dùng cookie, CORS allowlist, Helmet và Swagger tắt mặc định ở production;
- PostgreSQL chỉ ở private Docker network, container giảm capability, read-only filesystem;
- migration forward-only, backup/restore có checksum; audit/history có trigger chống sửa hoặc xóa nhầm.

## Điều kiện UAT

- chỉ truy cập trong LAN/VPN hoặc HTTPS bằng cấu hình production;
- dùng tag release cố định, secret riêng, mật khẩu mạnh và backup hằng ngày;
- thử restore định kỳ; theo dõi dung lượng volume và Docker logs;
- chỉ dùng dữ liệu có thể phục hồi, chưa đưa dữ liệu tối mật vào hệ thống.

## Khoảng trống trước production chính thức

- màn hình kiểm kê hiện chưa có API transaction hoàn chỉnh;
- import Excel chưa có staging/rollback nguyên lô; cần kiểm tra trước khi nhập số lượng lớn;
- rate limit hiện theo từng API instance, cần Redis hoặc gateway nếu scale nhiều replica;
- tài khoản PostgreSQL migration và runtime chưa tách riêng;
- cần pentest, quy trình quản lý lỗ hổng, giám sát/cảnh báo, retention và diễn tập khôi phục;
- Microsoft 365/LDAP phải UAT với tenant/domain thật của doanh nghiệp; CI không thể xác nhận credential hoặc CA nội bộ.

Chỉ đổi nhãn sang production-ready khi các điểm trên có bằng chứng kiểm thử và người phụ trách doanh nghiệp ký duyệt.
