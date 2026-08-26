import { api } from '../services/api-client'

export type InventoryStatus = 'OPEN' | 'CLOSED' | 'CANCELLED'
export type InventoryResult = 'PENDING' | 'MATCHED' | 'MISSING' | 'UNEXPECTED' | 'LOCATION_MISMATCH' | 'CUSTODIAN_MISMATCH'

export interface InventoryAssetRef { id: string; assetTag: string; name: string; serialNumber?: string | null }

export interface InventoryItem {
  id: string
  assetId: string
  result: InventoryResult
  note?: string | null
  scannedAt?: string | null
  expectedLocationId?: string | null
  expectedCustodianId?: string | null
  observedLocationId?: string | null
  observedCustodianId?: string | null
  asset?: InventoryAssetRef | null
}

export interface InventorySession {
  id: string
  inventoryNo: string
  name: string
  status: InventoryStatus
  startedAt: string
  closedAt?: string | null
  cancelledAt?: string | null
  scopeDepartmentId?: string | null
  scopeLocationId?: string | null
  scopeWarehouseId?: string | null
  scopeCategoryId?: string | null
  scopeDepartment?: { id: string; name: string } | null
  scopeLocation?: { id: string; name: string } | null
  scopeWarehouse?: { id: string; name: string } | null
  scopeCategory?: { id: string; name: string } | null
  creator?: { id: string; fullName: string } | null
  items?: InventoryItem[]
  summary?: Partial<Record<InventoryResult, number>>
}

export interface CreateInventoryInput {
  name: string
  departmentId?: string
  locationId?: string
  warehouseId?: string
  categoryId?: string
}

export interface ScanInventoryInput {
  value: string
  observedLocationId?: string
  observedCustodianId?: string
  note?: string
}

/** The backend owns every counting rule; the UI only sends observations and renders the verdict. */
export const listInventories = (signal?: AbortSignal) => api.get<InventorySession[]>('/inventories', signal)
export const getInventory = (id: string, signal?: AbortSignal) => api.get<InventorySession>(`/inventories/${id}`, signal)
export const createInventory = (input: CreateInventoryInput) => api.post<InventorySession>('/inventories', input)
export const scanInventory = (id: string, input: ScanInventoryInput) => api.post<{ item: InventoryItem }>(`/inventories/${id}/scan`, input)
export const closeInventory = (id: string) => api.post<InventorySession>(`/inventories/${id}/close`, {})
export const cancelInventory = (id: string) => api.post<InventorySession>(`/inventories/${id}/cancel`, {})

export const INVENTORY_RESULT_LABEL: Record<InventoryResult, string> = {
  PENDING: 'Chưa kiểm',
  MATCHED: 'Khớp',
  MISSING: 'Thiếu',
  UNEXPECTED: 'Ngoài phạm vi',
  LOCATION_MISMATCH: 'Sai vị trí',
  CUSTODIAN_MISMATCH: 'Sai người giữ',
}

/** Maps a verdict onto the shared status-pill palette already used across the app. */
export const INVENTORY_RESULT_TONE: Record<InventoryResult, string> = {
  PENDING: 'muted',
  MATCHED: 'ok',
  MISSING: 'danger',
  UNEXPECTED: 'warn',
  LOCATION_MISMATCH: 'warn',
  CUSTODIAN_MISMATCH: 'warn',
}
