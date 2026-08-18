BEGIN;

CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  site_id uuid NOT NULL REFERENCES sites(id),
  parent_id uuid REFERENCES locations(id),
  code citext NOT NULL,
  name text NOT NULL,
  location_type text NOT NULL CHECK (location_type IN ('building','floor','room','rack','area')),
  path text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id, code),
  UNIQUE (organization_id, path)
);

CREATE INDEX locations_tree_idx ON locations (organization_id, site_id, parent_id);

CREATE TABLE warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  site_id uuid NOT NULL REFERENCES sites(id),
  location_id uuid REFERENCES locations(id),
  code citext NOT NULL,
  name text NOT NULL,
  manager_user_id uuid REFERENCES app_users(id),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id, code)
);

ALTER TABLE assets ADD COLUMN location_id uuid REFERENCES locations(id);
ALTER TABLE assets ADD COLUMN warehouse_id uuid REFERENCES warehouses(id);
ALTER TABLE assets ADD CONSTRAINT assets_custody_location_check CHECK (
  NOT (warehouse_id IS NOT NULL AND assigned_user_id IS NOT NULL)
);

CREATE TABLE manufacturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  code citext NOT NULL,
  name text NOT NULL,
  support_url text,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id, code)
);

ALTER TABLE asset_models ADD COLUMN manufacturer_id uuid REFERENCES manufacturers(id);

CREATE TABLE asset_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  document_number citext NOT NULL,
  asset_id uuid NOT NULL REFERENCES assets(id),
  from_location_id uuid REFERENCES locations(id),
  to_location_id uuid NOT NULL REFERENCES locations(id),
  from_warehouse_id uuid REFERENCES warehouses(id),
  to_warehouse_id uuid REFERENCES warehouses(id),
  handed_over_by uuid NOT NULL REFERENCES app_users(id),
  received_by uuid REFERENCES app_users(id),
  reason text NOT NULL,
  condition_snapshot text NOT NULL,
  transferred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, document_number)
);

CREATE TABLE purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  po_number citext NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  status text NOT NULL CHECK (status IN ('draft','submitted','approved','partially_received','received','cancelled')),
  ordered_at date,
  expected_at date,
  currency char(3) NOT NULL DEFAULT 'VND',
  subtotal numeric(18,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  vat_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  total_amount numeric(18,2) GENERATED ALWAYS AS (subtotal + vat_amount) STORED,
  contract_number text,
  created_by uuid NOT NULL REFERENCES app_users(id),
  approved_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, po_number)
);

CREATE TABLE purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES asset_categories(id),
  model_id uuid REFERENCES asset_models(id),
  description text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  received_quantity integer NOT NULL DEFAULT 0 CHECK (received_quantity >= 0 AND received_quantity <= quantity),
  unit_price numeric(18,2) NOT NULL CHECK (unit_price >= 0),
  warranty_months integer CHECK (warranty_months IS NULL OR warranty_months >= 0)
);

CREATE TABLE maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  document_number citext NOT NULL,
  asset_id uuid NOT NULL REFERENCES assets(id),
  supplier_id uuid REFERENCES suppliers(id),
  status text NOT NULL CHECK (status IN ('reported','diagnosing','repairing','completed','cancelled')),
  failure_at timestamptz NOT NULL,
  cause text,
  resolution text,
  cost numeric(18,2) CHECK (cost IS NULL OR cost >= 0),
  sent_at timestamptz,
  completed_at timestamptz,
  reported_by uuid NOT NULL REFERENCES app_users(id),
  closed_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, document_number)
);

ALTER TABLE documents DROP CONSTRAINT documents_document_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_document_type_check
  CHECK (document_type IN ('handover','invoice','photo','contract','warranty','maintenance','other'));

INSERT INTO permissions(code,description) VALUES
('asset.delete','Xóa mềm hoặc thanh lý tài sản'),
('asset.return','Thu hồi tài sản'),
('asset.transfer','Điều chuyển tài sản'),
('inventory.create','Tạo đợt kiểm kê'),
('inventory.approve','Duyệt chênh lệch kiểm kê'),
('procurement.manage','Quản lý yêu cầu mua và đơn hàng'),
('maintenance.manage','Quản lý sự cố và sửa chữa'),
('report.view','Xem và xuất báo cáo'),
('audit.view','Xem nhật ký kiểm toán')
ON CONFLICT (code) DO NOTHING;

COMMIT;
