import type { Asset, AssetStatus } from '../../types'

export const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)

/** Stable numeric surrogate for a UUID, kept only because legacy screens key rows by number. */
export const numericId = (value: string) => Math.abs([...value].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 0))

export const assetIconForCategory = (category: string) =>
  ({
    Laptop: 'laptop', 'PC / Desktop': 'desktop', 'Màn hình': 'monitor', Mobile: 'phone', Tablet: 'tablet',
    Server: 'server', Switch: 'switch', Firewall: 'firewall', 'Router / Wi-Fi': 'router', UPS: 'ups',
    'NAS / Storage': 'nas', 'Máy in': 'printer', 'Tai nghe': 'headphones', 'Bàn phím': 'keyboard', 'Chuột': 'mouse',
    Webcam: 'webcam', 'Dock chuyển đổi': 'dock', 'Sạc & Adapter': 'charger', 'Hub & Cáp kết nối': 'hub',
    'Ổ lưu trữ ngoài': 'drive', 'Phần mềm & Bản quyền': 'software', 'Tài sản số & Dữ liệu': 'digital',
    'Thiết bị BYOD': 'byod', 'Nội thất': 'chair',
  } as Record<string, string>)[category] || 'box'

export const assetStatusClass: Record<AssetStatus, string> = {
  'Đang sử dụng': 'green', 'Sẵn sàng': 'blue', 'Bảo trì': 'amber', 'Hỏng': 'red',
}

/** Maps an API status code onto the four labels the UI knows about. */
export const assetStatusFromCode = (code?: string): AssetStatus =>
  code === 'READY' ? 'Sẵn sàng'
    : code === 'IN_USE' || code === 'ON_LOAN' ? 'Đang sử dụng'
      : code === 'MAINTENANCE' ? 'Bảo trì'
        : 'Hỏng'

/** Single place that turns an API asset row into the shape the UI renders. */
export const fromApiAsset = (item: any): Asset => ({
  id: numericId(item.id),
  apiId: item.id,
  code: item.assetTag,
  barcode: item.barcode || item.assetTag,
  qrCode: item.qrCode || item.barcode || item.assetTag,
  name: item.name,
  serial: item.serialNumber || '',
  category: item.category?.name || 'Khác',
  department: item.currentCustodian?.department?.name || item.department?.name || 'Chưa gán',
  location: item.location?.name || item.warehouse?.name || 'Chưa xác định',
  assignedTo: item.currentCustodian?.fullName || item.assignedUser?.fullName || 'Chưa gán',
  purchaseDate: String(item.purchaseDate || new Date().toISOString()).slice(0, 10),
  purchaseCost: Number(item.purchaseCost || 0),
  status: assetStatusFromCode(item.status?.code),
  icon: assetIconForCategory(item.category?.name || ''),
  manufacturer: item.manufacturer?.name,
  model: item.model?.name,
  manufacturerId: item.manufacturerId || item.manufacturer?.id || undefined,
  modelId: item.modelId || item.model?.id || undefined,
  cpu: item.cpu || '',
  ram: item.ram || '',
  storage: item.storage || '',
  operatingSystem: item.operatingSystem || '',
  ipAddress: item.ipAddress || '',
  macAddress: item.macAddress || '',
  assignmentType: item.assignments?.[0]?.type === 'LOAN' ? 'Cho mượn' : item.assignments?.[0] ? 'Cấp phát' : undefined,
  dueDate: item.assignments?.[0]?.expectedReturnDate || '',
  condition: item.assignments?.[0]?.conditionOut || undefined,
  recipientEmail: item.currentCustodian?.email || item.assignedUser?.email || '',
})
