# Inventory and Excel import API

All endpoints require an authenticated `assetflow_session` cookie. Admin/IT can manage all records; HCNS inventory is constrained to its assigned department. Excel import and rollback require Admin or IT.

## Inventory

```text
GET  /api/v1/inventories
POST /api/v1/inventories
GET  /api/v1/inventories/:id
POST /api/v1/inventories/:id/scan
POST /api/v1/inventories/:id/close
POST /api/v1/inventories/:id/cancel
```

Creating a session snapshots expected location and custodian for every asset in scope. Scan accepts an asset tag, Barcode, QR payload or serial and returns `MATCHED`, `LOCATION_MISMATCH`, `CUSTODIAN_MISMATCH` or `UNEXPECTED`. Closing marks unscanned expected items `MISSING` and appends one `INVENTORIED` history event per item. Inventory results never silently change the asset lifecycle status.

Example create body:

```json
{"name":"Kiểm kê quý 3","locationId":"uuid-optional","categoryId":"uuid-optional"}
```

Example scan body:

```json
{"value":"TS-2026-001","observedLocationId":"uuid-optional","observedCustodianId":"uuid-optional","note":"Tem nguyên vẹn"}
```

## Excel staging, commit and rollback

```text
GET  /api/v1/asset-imports
POST /api/v1/asset-imports/stage
GET  /api/v1/asset-imports/:id
POST /api/v1/asset-imports/:id/commit
POST /api/v1/asset-imports/:id/rollback
```

The browser parses `.xlsx`, then sends normalized rows to staging. Staging validates required fields, UUID references and duplicate asset tag/barcode/serial without creating assets. Commit runs all rows in a serializable transaction; one failure rolls back the entire transaction.

Rollback is also atomic and is allowed only while every imported asset is still `READY`, unassigned and has no assignment, return, transfer, maintenance, inventory or metadata history after import. Successful rollback soft-deletes the imported assets and appends audit/history records; it never erases evidence.

```json
{
  "sourceFileName":"assets-q3.xlsx",
  "rows":[
    {"rowNumber":2,"payload":{"assetTag":"TS-001","name":"Laptop","barcode":"TS-001","categoryId":"uuid","warehouseId":"uuid"}}
  ]
}
```
