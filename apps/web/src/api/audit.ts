import { api } from '../services/api-client'
import type { Page } from './assets'

export interface AuditActor { id: string; username: string | null; fullName: string | null; role?: string | null }

export interface AuditLogEntry {
  id: string
  action: string
  entityType: string
  entityId: string | null
  createdAt: string
  ipAddress: string | null
  userAgent: string | null
  actor: AuditActor | null
  oldValues: unknown
  newValues: unknown
}

export interface AuditQuery {
  page?: number
  limit?: number
  search?: string
  action?: string
  entityType?: string
  entityId?: string
  userId?: string
  /** Inclusive lower bound, `YYYY-MM-DD`. */
  from?: string
  /** Inclusive upper bound, `YYYY-MM-DD`; covers the whole day. */
  to?: string
}

export interface AuditFilterOptions {
  actions: Array<{ value: string; count: number }>
  entityTypes: Array<{ value: string; count: number }>
  actors: Array<{ id: string; username: string; fullName: string }>
}

export const AUDIT_PAGE_SIZE = 25
export const AUDIT_MAX_LIMIT = 200

export function auditQueryString(query: AuditQuery = {}): string {
  const params = new URLSearchParams()
  const { page, limit, ...rest } = query
  params.set('page', String(Math.max(1, page ?? 1)))
  params.set('limit', String(Math.min(AUDIT_MAX_LIMIT, Math.max(1, limit ?? AUDIT_PAGE_SIZE))))
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined || value === null) continue
    const text = typeof value === 'string' ? value.trim() : value
    if (text === '') continue
    params.set(key, String(text))
  }
  return params.toString()
}

export const listAuditLogs = (query: AuditQuery = {}, signal?: AbortSignal) =>
  api.get<Page<AuditLogEntry>>(`/admin/audit-logs?${auditQueryString(query)}`, signal)

export const getAuditFilters = (signal?: AbortSignal) => api.get<AuditFilterOptions>('/admin/audit-logs/filters', signal)

/**
 * Vietnamese wording for the actions the trail actually records. Anything unmapped falls back
 * to the raw code so a new action is never rendered as blank.
 */
const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCEEDED: 'Đăng nhập thành công',
  LOGIN_FAILED: 'Đăng nhập thất bại',
  PASSWORD_CHANGED: 'Đổi mật khẩu',
  USER_CREATED: 'Tạo người dùng',
  USER_UPDATED: 'Cập nhật người dùng',
  USER_PASSWORD_RESET: 'Đặt lại mật khẩu người dùng',
  PERSON_CREATED: 'Tạo nhân sự',
  PERSON_UPDATED: 'Cập nhật nhân sự',
  DEPARTMENT_CREATED: 'Tạo phòng ban',
  DEPARTMENT_UPDATED: 'Cập nhật phòng ban',
  DEPARTMENT_DEACTIVATED: 'Ngừng phòng ban',
  LOCATION_CREATED: 'Tạo site / vị trí',
  LOCATION_UPDATED: 'Cập nhật site / vị trí',
  LOCATION_DEACTIVATED: 'Ngừng site / vị trí',
  ASSET_CATEGORY_CREATED: 'Tạo nhóm tài sản',
  ASSET_CATEGORY_UPDATED: 'Cập nhật nhóm tài sản',
  ASSET_CATEGORY_DEACTIVATED: 'Ngừng nhóm tài sản',
  ASSET_CATEGORY_REACTIVATED: 'Dùng lại nhóm tài sản',
  MANUFACTURER_CREATED: 'Tạo hãng sản xuất',
  MANUFACTURER_UPDATED: 'Cập nhật hãng sản xuất',
  MANUFACTURER_DEACTIVATED: 'Ngừng hãng sản xuất',
  MANUFACTURER_REACTIVATED: 'Dùng lại hãng sản xuất',
  ASSET_MODEL_CREATED: 'Tạo model',
  ASSET_MODEL_UPDATED: 'Cập nhật model',
  ASSET_MODEL_DEACTIVATED: 'Ngừng model',
  ASSET_MODEL_REACTIVATED: 'Dùng lại model',
  VENDOR_CREATED: 'Tạo nhà cung cấp',
  VENDOR_UPDATED: 'Cập nhật nhà cung cấp',
  VENDOR_DELETED: 'Xoá nhà cung cấp',
  ASSET_RECEIVED: 'Nhập kho tài sản',
  ASSET_METADATA_UPDATED: 'Sửa thông tin tài sản',
  ASSET_ASSIGNED: 'Cấp phát tài sản',
  ASSET_LOANED: 'Cho mượn tài sản',
  ASSET_RETURNED: 'Thu hồi tài sản',
  ASSET_TRANSFERRED: 'Điều chuyển tài sản',
  ASSET_SOFT_DELETED: 'Ngừng theo dõi tài sản',
  MAINTENANCE_COMPLETED: 'Hoàn tất bảo trì',
  ASSET_IMPORT_STAGED: 'Nạp lô import',
  ASSET_IMPORT_COMMITTED: 'Ghi nhận lô import',
  ASSET_IMPORT_ROLLED_BACK: 'Hoàn tác lô import',
  INVENTORY_CREATED: 'Tạo đợt kiểm kê',
  INVENTORY_ITEM_SCANNED: 'Ghi nhận kiểm kê',
  INVENTORY_CLOSED: 'Đóng đợt kiểm kê',
  INVENTORY_CANCELLED: 'Huỷ đợt kiểm kê',
  APPLICATION_SETTING_UPDATED: 'Cập nhật cấu hình',
  DIRECTORY_CONFIG_UPDATED: 'Cập nhật cấu hình directory',
}

export const auditActionLabel = (action: string) => ACTION_LABELS[action] ?? action

const ENTITY_LABELS: Record<string, string> = {
  Asset: 'Tài sản', AssetCategory: 'Nhóm tài sản', AssetModel: 'Model', Manufacturer: 'Hãng sản xuất',
  Department: 'Phòng ban', Location: 'Site / Vị trí', Person: 'Nhân sự', User: 'Người dùng',
  Vendor: 'Nhà cung cấp', Authentication: 'Xác thực', InventorySession: 'Đợt kiểm kê',
  AssetImportBatch: 'Lô import', ApplicationSetting: 'Cấu hình', DirectoryConfiguration: 'Directory',
  AgentEnrollmentToken: 'Token Agent', EndpointAgent: 'Endpoint Agent', Incident: 'Sự cố',
  DigitalEntitlement: 'License / Chứng thư', DiscoveryInboxItem: 'Khám phá thiết bị',
}

export const auditEntityLabel = (entityType: string) => ENTITY_LABELS[entityType] ?? entityType

/** Groups an action into a tone so the table can be scanned without reading every row. */
export const auditActionTone = (action: string) =>
  /_(DELETED|DEACTIVATED|ROLLED_BACK|CANCELLED|REVOKED|FAILED)$/.test(action) ? 'danger'
    : /_(CREATED|RECEIVED|ASSIGNED|LOANED|SUCCEEDED|COMMITTED)$/.test(action) ? 'ok'
      : 'muted'
