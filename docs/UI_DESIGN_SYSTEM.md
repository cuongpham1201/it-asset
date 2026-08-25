# AssetFlow UI Design System

## Nguồn chuẩn

Trang `/assignments` (Cấp phát & Thu hồi) là màn hình tham chiếu cho typography và mật độ hiển thị của toàn bộ AssetFlow. Khi tạo hoặc sửa một phân hệ, không tự đặt bộ cỡ chữ riêng cho phân hệ đó.

## Typography contract

AssetFlow dùng **Poppins** làm font chính, đóng gói trong frontend để bản self-host không phụ thuộc Google Fonts hay kết nối Internet.

| Thành phần | Cỡ chữ | Độ đậm |
| --- | ---: | ---: |
| Tiêu đề trang | 25px | 600 |
| Tiêu đề khối / modal | 17px | 600 |
| Nhãn form / mô tả đầu trang | 13px | 400–500 |
| Nút thao tác / tab | 13px | 500 |
| Nội dung chính / ô nhập liệu / ô bảng | 12px | 400 |
| Tiêu đề cột bảng | 12px | 600 |
| Badge trạng thái / chú thích | 12px | 400–500 |
| Giá trị KPI | 20px | 600 |

Các biến nguồn nằm trong `apps/web/src/styles.css`:

```css
--type-page-title
--type-section-title
--type-label
--type-action
--type-content
--type-control
--type-table-head
--type-caption
--type-kpi-value
```

## Ngoại lệ có chủ đích

- Sidebar giữ 12px; tên nhóm menu giữ 9px để bảo đảm toàn bộ điều hướng hiển thị không cần thanh cuộn trên màn hình phổ biến.
- Nhãn trục và số liệu phụ trong biểu đồ được phép dùng 10px.
- Mã máy, log và dữ liệu kỹ thuật có thể dùng font monospace nhưng không thay đổi font giao diện chính.

## Quy tắc phát triển

1. Component mới phải dùng token typography, không thêm `font-size` cục bộ nếu đã có token tương ứng.
2. Nội dung và input mặc định không bold. Chỉ tiêu đề, tên bản ghi, KPI và hành động chính dùng độ đậm 500–600.
3. Bảng dữ liệu giữa các phân hệ phải cùng cỡ chữ với `/assignments`.
4. Feature CSS chỉ điều chỉnh bố cục, khoảng cách, màu và trạng thái; lớp `AssetFlow typography contract` cuối stylesheet là nguồn quyết định cỡ chữ.
5. Khi cần thay đổi tiêu chuẩn, cập nhật token và kiểm thử typography trước, không sửa từng màn hình riêng lẻ.
