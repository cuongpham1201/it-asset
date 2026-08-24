# AssetFlow Endpoint Agent — kiến trúc MVP

## Phạm vi

Endpoint Agent dành cho Windows và Linux, ưu tiên máy tính cá nhân và server. Network Discovery/SNMP dành cho switch, firewall, máy in và camera là thành phần khác, không chạy trong Endpoint Agent.

```text
Windows/Linux endpoint
  AssetFlow Agent
    ├── collect hardware/OS/network (read-only)
    ├── normalize schema 1.0
    └── HTTPS outbound + enrollment token
             │
             ▼
      Agent ingestion API
             │
             ▼
       Discovery inbox (PENDING)
        ├── match existing asset
        ├── ignore with reason
        └── approve new asset (IT only)
```

Không có đường dữ liệu trực tiếp từ Agent vào bảng tài sản. Ingestion lưu snapshot bất biến và cập nhật bản ghi discovery; hành động xác nhận của IT mới được phép liên kết hoặc tạo tài sản.

## Hợp đồng và đối chiếu

Payload có `schema_version=1.0`. Thứ tự bằng chứng đối chiếu đề xuất:

1. Agent enrollment ID đã liên kết.
2. System UUID.
3. Serial/Service Tag kết hợp manufacturer.
4. MAC address ổn định.
5. Hostname chỉ là gợi ý, không tự match.

Thiết bị trùng hoặc bằng chứng mâu thuẫn phải chuyển `CONFLICT`, không ghi đè dữ liệu sổ tài sản.

## Baseline bảo mật

- Chỉ outbound HTTPS; TLS tối thiểu 1.2 và hỗ trợ CA nội bộ.
- Enrollment token khác token phiên người dùng, có expiry/revoke và scope theo organization/site.
- File cấu hình chứa token phải hạn chế quyền đọc; token không xuất hiện trong log.
- API áp dụng rate limit, giới hạn body, kiểm tra schema và chống replay bằng timestamp/nonce ở giai đoạn ingestion.
- Fingerprint là dữ liệu đối chiếu, không phải bằng chứng xác thực.
- Không có remote shell, script execution, inbound listener hoặc auto-update trong MVP.
- Mọi quyết định link/approve/ignore do IT thực hiện đều ghi audit.

## Trạng thái triển khai

Đã có API enrollment/ingestion, credential riêng theo Agent, token chỉ lưu dạng hash, snapshot bất biến, Discovery Inbox, audit và các quyết định `Liên kết / Tạo mới / Bỏ qua / Xử lý xung đột`. Admin có thể thu hồi enrollment token hoặc Agent. Ingestion không tự ghi vào sổ tài sản.

## Giai đoạn tiếp theo

1. Ký binary, MSI/DEB/RPM và cơ chế nâng cấp có chữ ký.
2. Network Discovery Probe riêng hỗ trợ ICMP/ARP/DNS/SNMPv3.
3. Allowlist subnet, rate limit theo probe/site và kho bí mật cho SNMPv3.
