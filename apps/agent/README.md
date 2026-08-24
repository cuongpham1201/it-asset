# AssetFlow Endpoint Agent

Agent thu thập inventory phần cứng trên Windows/Linux và gửi snapshot qua HTTPS về AssetFlow. Agent chỉ kết nối outbound, không mở cổng, không thực thi lệnh từ xa và không tự tạo tài sản.

## Dữ liệu thu thập

- Hostname, hệ điều hành, phiên bản/build, kiến trúc và kernel.
- Hãng, model, serial/Service Tag, system UUID.
- CPU, số logical CPU, tổng RAM và ổ đĩa vật lý.
- Tên card mạng, địa chỉ MAC và IP.

Agent không đọc file người dùng, mật khẩu, nội dung trình duyệt hay nội dung tài liệu.

## Chạy kiểm tra cục bộ

```bash
assetflow-agent inventory
```

Lệnh chỉ in JSON ra terminal và không gửi dữ liệu.

## Cấu hình gửi dữ liệu

Sao chép `agent.example.json` tới:

- Windows: `C:\ProgramData\AssetFlow\agent.json`
- Linux: `/etc/assetflow/agent.json`

Giới hạn quyền đọc file cho Administrators/SYSTEM trên Windows hoặc `root:root` với mode `0600` trên Linux. Sau đó chạy:

```bash
assetflow-agent once
assetflow-agent run
```

`once` phù hợp Windows Task Scheduler; `run` phù hợp systemd trên Linux. Lần gửi đầu tiên dùng enrollment token để nhận credential riêng của thiết bị. Credential được lưu trong `agent-state.json` với quyền hạn chế; các lần gửi sau không dùng lại enrollment token. HTTP thường chỉ được chấp nhận cho localhost hoặc khi bật rõ `allow_http` trong môi trường phát triển cô lập.

## Build

```bash
go test ./...
go build -trimpath -ldflags "-s -w -X main.version=development" -o dist/assetflow-agent ./cmd/assetflow-agent

GOOS=windows GOARCH=amd64 go build -trimpath -o dist/assetflow-agent-windows-amd64.exe ./cmd/assetflow-agent
GOOS=linux GOARCH=amd64 go build -trimpath -o dist/assetflow-agent-linux-amd64 ./cmd/assetflow-agent
```

CI build thêm `linux/arm64`. Token enrollment chỉ dùng để đăng ký/gửi snapshot; fingerprint không phải credential.

Không cần cài Go nếu máy đã có Docker Buildx:

```bash
docker buildx build -f apps/agent/Dockerfile.build --build-arg TARGETOS=linux --build-arg TARGETARCH=amd64 --target artifact --output type=local,dest=apps/agent/dist .
docker buildx build -f apps/agent/Dockerfile.build --build-arg TARGETOS=windows --build-arg TARGETARCH=amd64 --target artifact --output type=local,dest=apps/agent/dist .
```
