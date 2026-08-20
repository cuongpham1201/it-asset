# Quản lý người dùng

AssetFlow hỗ trợ đồng thời tài khoản local và tài khoản được đồng bộ từ LDAP hoặc Microsoft 365/Entra ID.

## Phân biệt tài khoản và người nhận tài sản

- **Tài khoản hệ thống (`User`)** dùng để đăng nhập, phân quyền và ghi nhận người thao tác.
- **Người nhận tài sản (`Person`)** là danh bạ nhân viên/đối tượng được cấp phát hoặc cho mượn tài sản. Người này không bắt buộc có tài khoản đăng nhập.
- Một `Person` có thể liên kết với một `User`, nhưng hai bản ghi có vòng đời độc lập.

Admin hoặc IT thêm người nhận tại **Cài đặt → Danh tính & người dùng → Người nhận tài sản**. Hồ sơ gồm mã nhân viên, họ tên, email, điện thoại, chức danh và phòng ban. Form cấp phát chỉ chấp nhận người đang hoạt động trong danh bạ này.

Khi đồng bộ LDAP/Microsoft 365, AssetFlow đồng thời tạo/cập nhật tài khoản đăng nhập và hồ sơ người nhận tài sản nếu nguồn có phòng ban. Thông tin directory phải được sửa ở hệ thống nguồn.

## Tạo tài khoản local

Admin vào **Cài đặt → Danh tính & người dùng → Người dùng → Thêm người dùng**. Các trường bắt buộc:

- Họ và tên: 2–150 ký tự.
- Mã nhân viên: 2–50 ký tự, chỉ gồm chữ, số, dấu chấm, gạch ngang hoặc gạch dưới; không được trùng.
- Tên đăng nhập: 3–100 ký tự thường, số, dấu chấm, gạch ngang hoặc gạch dưới; không được trùng.
- Email hợp lệ và không được trùng.
- Phòng ban đang hoạt động.
- Vai trò: `ADMIN`, `IT`, `HCNS` hoặc `USER`.
- Mật khẩu tạm: tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.

Tài khoản mới bắt buộc đổi mật khẩu trong lần đăng nhập đầu tiên. Admin có thể đặt lại mật khẩu; thao tác này thu hồi toàn bộ phiên hiện tại và tiếp tục bắt buộc đổi mật khẩu.

## Tài khoản directory

Người dùng từ LDAP hoặc Microsoft 365 được tạo/cập nhật qua đồng bộ. Các trường họ tên, mã nhân viên, username, email và phòng ban phải sửa tại hệ thống nguồn. AssetFlow chặn sửa trực tiếp để lần đồng bộ sau không ghi đè thay đổi thủ công.

## Quy tắc an toàn

- Chỉ `ADMIN` truy cập API `/api/v1/admin/users`.
- Không trả `passwordHash` ra API.
- Không cho Admin tự hạ quyền hoặc tự vô hiệu hóa.
- Luôn phải còn ít nhất một Admin đang hoạt động.
- Vô hiệu hóa tài khoản sẽ thu hồi các phiên đăng nhập.
- Tạo, sửa và reset mật khẩu đều được ghi vào audit log; mật khẩu không được ghi log.
