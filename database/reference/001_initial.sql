BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code citext NOT NULL UNIQUE,
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Bangkok',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  code citext NOT NULL,
  name text NOT NULL,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  code citext NOT NULL,
  name text NOT NULL,
  manager_user_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  username citext NOT NULL,
  display_name text NOT NULL,
  email citext NOT NULL,
  password_hash text,
  auth_provider text NOT NULL DEFAULT 'local' CHECK (auth_provider IN ('local','oidc')),
  external_subject text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','locked','disabled')),
  permission_version integer NOT NULL DEFAULT 1,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, username),
  UNIQUE (organization_id, email)
);

ALTER TABLE departments ADD CONSTRAINT departments_manager_fk
  FOREIGN KEY (manager_user_id) REFERENCES app_users(id) ON DELETE SET NULL;

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  code citext NOT NULL,
  name text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  UNIQUE (organization_id, code)
);

CREATE TABLE permissions (
  code citext PRIMARY KEY,
  description text NOT NULL
);

CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_code citext NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE user_roles (
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE user_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('organization','site','department')),
  scope_id uuid NOT NULL,
  UNIQUE (user_id, scope_type, scope_id)
);

CREATE TABLE asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  code citext NOT NULL,
  name text NOT NULL,
  is_it_asset boolean NOT NULL DEFAULT true,
  custom_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (organization_id, code)
);

CREATE TABLE asset_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  category_id uuid NOT NULL REFERENCES asset_categories(id),
  manufacturer text,
  model_name text NOT NULL,
  default_specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (organization_id, category_id, manufacturer, model_name)
);

CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  asset_code citext NOT NULL,
  name text NOT NULL,
  serial_number citext,
  barcode citext NOT NULL,
  category_id uuid NOT NULL REFERENCES asset_categories(id),
  model_id uuid REFERENCES asset_models(id),
  site_id uuid NOT NULL REFERENCES sites(id),
  department_id uuid REFERENCES departments(id),
  assigned_user_id uuid REFERENCES app_users(id),
  assigned_person_name text,
  status text NOT NULL CHECK (status IN ('pending_receipt','available','in_use','maintenance','broken','retired')),
  condition text NOT NULL DEFAULT 'good' CHECK (condition IN ('good','minor_damage','needs_inspection','broken')),
  purchase_date date,
  purchase_cost numeric(18,2) CHECK (purchase_cost IS NULL OR purchase_cost >= 0),
  warranty_until date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz,
  UNIQUE (organization_id, asset_code),
  UNIQUE (organization_id, barcode)
);

CREATE UNIQUE INDEX assets_serial_unique
  ON assets (organization_id, serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX assets_scope_list_idx
  ON assets (organization_id, department_id, site_id, status, updated_at DESC);
CREATE INDEX assets_search_idx
  ON assets (organization_id, lower(name));

CREATE TABLE asset_hardware_specs (
  asset_id uuid PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  cpu text,
  ram_bytes bigint CHECK (ram_bytes IS NULL OR ram_bytes >= 0),
  storage_bytes bigint CHECK (storage_bytes IS NULL OR storage_bytes >= 0),
  storage_type text,
  operating_system text,
  os_version text,
  ip_addresses inet[] NOT NULL DEFAULT '{}',
  mac_addresses macaddr[] NOT NULL DEFAULT '{}',
  extra_specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE asset_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  asset_id uuid NOT NULL REFERENCES assets(id),
  assignment_type text NOT NULL CHECK (assignment_type IN ('issue','loan','transfer')),
  assignee_user_id uuid REFERENCES app_users(id),
  assignee_name text NOT NULL,
  assignee_email citext,
  department_id uuid REFERENCES departments(id),
  site_id uuid NOT NULL REFERENCES sites(id),
  condition_out text NOT NULL,
  condition_in text,
  issued_at timestamptz NOT NULL,
  due_at timestamptz,
  returned_at timestamptz,
  issued_by uuid NOT NULL REFERENCES app_users(id),
  returned_by uuid REFERENCES app_users(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (returned_at IS NULL OR returned_at >= issued_at)
);

CREATE UNIQUE INDEX asset_one_open_assignment
  ON asset_assignments (asset_id) WHERE returned_at IS NULL;
CREATE INDEX assignments_due_idx
  ON asset_assignments (organization_id, due_at) WHERE returned_at IS NULL;

CREATE TABLE asset_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  asset_id uuid NOT NULL REFERENCES assets(id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('receive','issue','loan','return','transfer','maintenance','retire','correction','import')),
  assignment_id uuid REFERENCES asset_assignments(id),
  from_site_id uuid REFERENCES sites(id),
  to_site_id uuid REFERENCES sites(id),
  from_department_id uuid REFERENCES departments(id),
  to_department_id uuid REFERENCES departments(id),
  from_person text,
  to_person text,
  condition_snapshot text,
  asset_snapshot jsonb NOT NULL,
  note text,
  correction_of_id uuid REFERENCES asset_transactions(id),
  actor_id uuid NOT NULL REFERENCES app_users(id),
  request_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX asset_transactions_timeline_idx
  ON asset_transactions (organization_id, asset_id, occurred_at DESC);

CREATE TABLE import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  file_name text NOT NULL,
  file_sha256 text NOT NULL,
  status text NOT NULL CHECK (status IN ('uploaded','validating','ready','committing','completed','failed')),
  total_rows integer NOT NULL DEFAULT 0,
  valid_rows integer NOT NULL DEFAULT 0,
  error_rows integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE import_rows (
  id bigserial PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  raw_data jsonb NOT NULL,
  normalized_data jsonb,
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  committed_asset_id uuid REFERENCES assets(id),
  UNIQUE (batch_id, row_number)
);

CREATE TABLE inventory_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  site_id uuid REFERENCES sites(id),
  department_id uuid REFERENCES departments(id),
  status text NOT NULL CHECK (status IN ('draft','open','reconciling','closed')),
  snapshot_at timestamptz,
  opened_by uuid REFERENCES app_users(id),
  opened_at timestamptz,
  closed_at timestamptz
);

CREATE TABLE inventory_scans (
  id bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id),
  scanned_code text NOT NULL,
  result text NOT NULL CHECK (result IN ('matched','wrong_site','wrong_department','wrong_owner','unexpected','unknown')),
  scanned_by uuid NOT NULL REFERENCES app_users(id),
  scanned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, scanned_code)
);

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  supplier_code text NOT NULL,
  legal_name text NOT NULL,
  tax_code text,
  category text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  certifications text,
  approval_status text NOT NULL DEFAULT 'conditional'
    CHECK (approval_status IN ('approved','conditional','improvement_required','suspended')),
  notes text,
  created_by uuid NOT NULL REFERENCES app_users(id),
  updated_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, supplier_code)
);

CREATE INDEX suppliers_org_status_idx ON suppliers (organization_id, approval_status);

CREATE TABLE supplier_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  framework_version text NOT NULL DEFAULT 'ISO-RISK-2026.1',
  quality_score smallint NOT NULL CHECK (quality_score BETWEEN 0 AND 100),
  delivery_score smallint NOT NULL CHECK (delivery_score BETWEEN 0 AND 100),
  security_score smallint NOT NULL CHECK (security_score BETWEEN 0 AND 100),
  compliance_score smallint NOT NULL CHECK (compliance_score BETWEEN 0 AND 100),
  continuity_score smallint NOT NULL CHECK (continuity_score BETWEEN 0 AND 100),
  sustainability_score smallint NOT NULL CHECK (sustainability_score BETWEEN 0 AND 100),
  weighted_score numeric(5,2) NOT NULL CHECK (weighted_score BETWEEN 0 AND 100),
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  corrective_actions text,
  evaluated_by uuid NOT NULL REFERENCES app_users(id),
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  next_review_at timestamptz
);

CREATE INDEX supplier_evaluations_lookup_idx
  ON supplier_evaluations (organization_id, supplier_id, evaluated_at DESC);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  asset_id uuid REFERENCES assets(id),
  transaction_id uuid REFERENCES asset_transactions(id),
  document_type text NOT NULL CHECK (document_type IN ('handover','invoice','photo','contract','other')),
  template_version text,
  object_key text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  sha256 text NOT NULL,
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed','dead')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX outbox_pending_idx ON outbox_events (available_at, created_at)
  WHERE status IN ('pending','failed');

CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  actor_id uuid REFERENCES app_users(id),
  action text NOT NULL,
  object_type text NOT NULL,
  object_id uuid,
  request_id uuid NOT NULL,
  source_ip inet,
  user_agent text,
  before_data jsonb,
  after_data jsonb,
  previous_hash text,
  entry_hash text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_lookup_idx
  ON audit_logs (organization_id, object_type, object_id, occurred_at DESC);

CREATE TABLE refresh_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  user_agent text,
  source_ip inet,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION reject_immutable_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER asset_transactions_immutable
BEFORE UPDATE OR DELETE ON asset_transactions
FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();

CREATE TRIGGER audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();

-- API sets these transaction-local values after authentication:
-- SET LOCAL app.organization_id = '<uuid>';
-- SET LOCAL app.user_id = '<uuid>';
-- SET LOCAL app.can_access_all = 'true|false';
-- SET LOCAL app.department_ids = '<uuid>,<uuid>';

CREATE FUNCTION app_current_organization() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.organization_id', true), '')::uuid
$$;

CREATE FUNCTION app_can_access_department(target uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.can_access_all', true), 'false') = 'true'
    OR target::text = ANY(string_to_array(coalesce(current_setting('app.department_ids', true), ''), ','))
$$;

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets FORCE ROW LEVEL SECURITY;
CREATE POLICY assets_tenant_scope ON assets
  USING (organization_id = app_current_organization()
    AND (department_id IS NULL OR app_can_access_department(department_id)))
  WITH CHECK (organization_id = app_current_organization()
    AND (department_id IS NULL OR app_can_access_department(department_id)));

ALTER TABLE asset_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY assignments_tenant_scope ON asset_assignments
  USING (organization_id = app_current_organization()
    AND (department_id IS NULL OR app_can_access_department(department_id)))
  WITH CHECK (organization_id = app_current_organization()
    AND (department_id IS NULL OR app_can_access_department(department_id)));

ALTER TABLE asset_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_transactions FORCE ROW LEVEL SECURITY;
CREATE POLICY transactions_tenant_scope ON asset_transactions
  USING (organization_id = app_current_organization()
    AND EXISTS (SELECT 1 FROM assets a WHERE a.id = asset_transactions.asset_id))
  WITH CHECK (organization_id = app_current_organization()
    AND EXISTS (SELECT 1 FROM assets a WHERE a.id = asset_transactions.asset_id));

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers FORCE ROW LEVEL SECURITY;
CREATE POLICY suppliers_tenant_scope ON suppliers
  USING (organization_id = app_current_organization())
  WITH CHECK (organization_id = app_current_organization());

ALTER TABLE supplier_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_evaluations FORCE ROW LEVEL SECURITY;
CREATE POLICY supplier_evaluations_tenant_scope ON supplier_evaluations
  USING (organization_id = app_current_organization()
    AND EXISTS (SELECT 1 FROM suppliers s WHERE s.id = supplier_evaluations.supplier_id))
  WITH CHECK (organization_id = app_current_organization()
    AND EXISTS (SELECT 1 FROM suppliers s WHERE s.id = supplier_evaluations.supplier_id));

INSERT INTO permissions (code, description) VALUES
('asset.read','Xem tài sản trong phạm vi'),
('asset.create','Tạo tài sản trong phạm vi'),
('asset.update','Cập nhật tài sản trong phạm vi'),
('asset.assign','Cấp phát, thu hồi, điều chuyển'),
('asset.import','Import tài sản'),
('asset.export','Export tài sản'),
('inventory.manage','Tạo và đối soát kiểm kê'),
('department.manage','Quản trị phòng ban'),
('site.manage','Quản trị site'),
('supplier.read','Xem hồ sơ và kết quả đánh giá nhà cung cấp'),
('supplier.manage','Tạo, cập nhật và phê duyệt nhà cung cấp'),
('supplier.evaluate','Chấm điểm và đánh giá lại nhà cung cấp'),
('user.manage','Quản trị user, role và scope'),
('security.audit.read','Xem audit log'),
('system.configure','Cấu hình hệ thống');

COMMIT;
