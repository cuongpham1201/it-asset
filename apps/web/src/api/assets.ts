import { api } from '../services/api-client'

/** Every filter the assets endpoint understands. Keep in sync with ListAssetsQuery on the API. */
export interface AssetQuery {
  page?: number
  limit?: number
  search?: string
  category?: string
  department?: string
  location?: string
  status?: string
  assignedUser?: string
  /**
   * Operational view: assigned = someone holds it, in_stock = ready in a warehouse,
   * due = has an expected return date, overdue = that date has passed.
   */
  lifecycle?: 'assigned' | 'in_stock' | 'due' | 'overdue'
  sort?: 'assetTag' | 'name' | 'createdAt' | 'updatedAt' | 'purchaseCost'
  order?: 'asc' | 'desc'
}

export interface PageMeta { page: number; limit: number; total: number; totalPages: number }
export interface Page<T> { data: T[]; meta: PageMeta }

export const ASSET_PAGE_SIZE = 20
/** The API rejects anything above this, so callers must not ask for more. */
export const ASSET_MAX_LIMIT = 100

/**
 * Serialises a query into the API's search string. Empty values are dropped so the
 * request never carries `?search=&category=` noise, and limit is clamped to what the API allows.
 */
export function assetQueryString(query: AssetQuery = {}): string {
  const params = new URLSearchParams()
  const { page, limit, ...rest } = query
  params.set('page', String(Math.max(1, page ?? 1)))
  params.set('limit', String(Math.min(ASSET_MAX_LIMIT, Math.max(1, limit ?? ASSET_PAGE_SIZE))))
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined || value === null) continue
    const text = typeof value === 'string' ? value.trim() : value
    if (text === '') continue
    params.set(key, String(text))
  }
  return params.toString()
}

/** Fetches exactly one page. There is deliberately no "fetch every page" helper. */
export const listAssets = <T = any>(query: AssetQuery = {}, signal?: AbortSignal) =>
  api.get<Page<T>>(`/assets?${assetQueryString(query)}`, signal)

export const getAsset = <T = any>(id: string, signal?: AbortSignal) => api.get<T>(`/assets/${id}`, signal)

export const scanAsset = <T = any>(value: string, signal?: AbortSignal) =>
  api.get<T>(`/assets/scan?value=${encodeURIComponent(value.trim())}`, signal)

export interface AssetLabelCount { id: string | null; label: string; count: number }
export interface AssetStatusCount extends AssetLabelCount { code: string }

export interface AssetSummary {
  total: number
  assigned: number
  available: number
  due: number
  attention: number
  totalValue: number
  byCategory: AssetLabelCount[]
  byStatus: AssetStatusCount[]
  byLocation: AssetLabelCount[]
}

const EMPTY_SUMMARY: AssetSummary = { total: 0, assigned: 0, available: 0, due: 0, attention: 0, totalValue: 0, byCategory: [], byStatus: [], byLocation: [] }

/** Server-side aggregates for the dashboard, so it never has to hold every asset in memory. */
export const getAssetSummary = async (signal?: AbortSignal): Promise<AssetSummary> => ({
  ...EMPTY_SUMMARY,
  ...(await api.get<AssetSummary>('/assets/summary', signal)),
})

export interface HistoryPersonRef {
  id: string
  employeeCode?: string | null
  fullName: string
  department?: { id: string; code: string; name: string } | null
}

export interface AssetHistoryEntry {
  id: string
  action: 'CREATED' | 'UPDATED' | 'ASSIGNED' | 'RETURNED' | 'TRANSFERRED' | 'MAINTENANCE' | 'INVENTORIED' | 'DISPOSED'
  description: string
  createdAt: string
  referenceType: string | null
  referenceId: string | null
  actor?: { id: string; username: string; fullName: string } | null
  /** The person holding the asset before and after the event. Null when custody was untouched. */
  fromCustodian?: HistoryPersonRef | null
  toCustodian?: HistoryPersonRef | null
  /** Legacy columns, only populated when the custodian also had a system account. */
  fromUserId?: string | null
  toUserId?: string | null
  fromLocation?: { id: string; name: string } | null
  toLocation?: { id: string; name: string } | null
}

export const listAssetHistory = (id: string, signal?: AbortSignal) =>
  api.get<{ data: AssetHistoryEntry[] }>(`/assets/${id}/history`, signal)
