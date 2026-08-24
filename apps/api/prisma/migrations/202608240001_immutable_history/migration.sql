CREATE OR REPLACE FUNCTION assetflow_reject_immutable_change()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; create a correcting event instead', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_append_only
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION assetflow_reject_immutable_change();

CREATE TRIGGER asset_history_append_only
BEFORE UPDATE OR DELETE ON asset_history
FOR EACH ROW EXECUTE FUNCTION assetflow_reject_immutable_change();
