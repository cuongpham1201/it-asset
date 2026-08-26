import { api } from '../services/api-client'

export type RecordStatus = 'ACTIVE' | 'INACTIVE'

export interface Manufacturer {
  id: string
  name: string
  website?: string | null
  supportUrl?: string | null
  supportPhone?: string | null
  status: RecordStatus
  _count?: { models: number; assets: number }
}

export interface AssetModel {
  id: string
  name: string
  modelNumber?: string | null
  description?: string | null
  status: RecordStatus
  manufacturerId: string
  categoryId: string
  manufacturer?: { id: string; name: string } | null
  category?: { id: string; code: string; name: string } | null
  _count?: { assets: number }
}

export interface AssetCategory {
  id: string
  code: string
  name: string
  parentId?: string | null
  description?: string | null
  status: RecordStatus
  _count?: { assets: number; children: number; models: number }
}

/** Read-only lookups — available to every operator role, used to populate pickers. */
export const listManufacturerOptions = (signal?: AbortSignal) => api.get<Manufacturer[]>('/manufacturers', signal)
export const listModelOptions = (signal?: AbortSignal) => api.get<AssetModel[]>('/models', signal)
export const listCategoryOptions = (signal?: AbortSignal) => api.get<AssetCategory[]>('/categories', signal)

/** Admin management endpoints — include inactive rows and usage counts. */
export const listManufacturers = (signal?: AbortSignal) => api.get<Manufacturer[]>('/admin/manufacturers', signal)
export const createManufacturer = (input: Partial<Manufacturer> & { name: string }) => api.post<Manufacturer>('/admin/manufacturers', input)
export const updateManufacturer = (id: string, input: Partial<Manufacturer>) => api.patch<Manufacturer>(`/admin/manufacturers/${id}`, input)

export const listModels = (signal?: AbortSignal) => api.get<AssetModel[]>('/admin/models', signal)
export const createModel = (input: { name: string; manufacturerId: string; categoryId: string; modelNumber?: string; description?: string }) =>
  api.post<AssetModel>('/admin/models', input)
export const updateModel = (id: string, input: Partial<AssetModel>) => api.patch<AssetModel>(`/admin/models/${id}`, input)

export const listAdminCategories = (signal?: AbortSignal) => api.get<AssetCategory[]>('/admin/categories', signal)
export const createCategory = (input: { code: string; name: string; parentId?: string; description?: string }) =>
  api.post<AssetCategory>('/admin/categories', input)
export const updateCategory = (id: string, input: Partial<AssetCategory>) => api.patch<AssetCategory>(`/admin/categories/${id}`, input)
