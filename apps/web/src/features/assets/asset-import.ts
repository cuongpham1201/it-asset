import type { Asset, AssetStatus } from '../../types'
import { assetIconForCategory } from './asset-format'

const VALID_STATUSES: AssetStatus[] = ['Đang sử dụng', 'Sẵn sàng', 'Bảo trì', 'Hỏng']

/** Column order of the template the app exports, 1-based to match what users see in Excel. */
const COLUMNS = {
  code: 1, name: 2, category: 3, serial: 4, department: 5, location: 6, assignedTo: 7,
  status: 8, purchaseDate: 9, purchaseCost: 10, manufacturer: 11, model: 12,
  cpu: 13, ram: 14, storage: 15, operatingSystem: 16, ipAddress: 17, macAddress: 18,
} as const

export class AssetImportError extends Error {
  constructor(message: string, public rows: string[] = []) { super(message) }
}

/**
 * Reads the asset workbook in the browser and reports which rows are wrong and why,
 * instead of collapsing every problem into one generic "could not read file" message.
 */
export async function parseAssetImportWorkbook(file: File, departmentFallback: string): Promise<Asset[]> {
  let rows: unknown[][]
  try {
    const readXlsxFile = (await import('read-excel-file/browser')).default
    rows = (await readXlsxFile(file)) as unknown[][]
  } catch {
    throw new AssetImportError('Không đọc được file. Hãy dùng đúng file Excel (.xlsx) theo mẫu của hệ thống.')
  }

  const imported: Asset[] = []
  const problems: string[] = []

  rows.slice(1).forEach((row, index) => {
    const excelRow = index + 2
    const text = (column: number) => String(row[column - 1] ?? '').trim()
    const code = text(COLUMNS.code)
    const name = text(COLUMNS.name)
    if (!code && !name) return // genuinely blank row — skip quietly

    const rowProblems: string[] = []
    if (!code) rowProblems.push('thiếu Mã tài sản')
    if (!name) rowProblems.push('thiếu Tên tài sản')

    const rawCost = text(COLUMNS.purchaseCost).replace(/[^0-9.-]/g, '')
    const purchaseCost = rawCost ? Number(rawCost) : 0
    if (Number.isNaN(purchaseCost)) rowProblems.push('Nguyên giá không phải là số')
    else if (purchaseCost < 0) rowProblems.push('Nguyên giá không được âm')

    const rawStatus = text(COLUMNS.status)
    if (rawStatus && !VALID_STATUSES.includes(rawStatus as AssetStatus)) {
      rowProblems.push(`Trạng thái "${rawStatus}" không hợp lệ`)
    }

    if (rowProblems.length) { problems.push(`Dòng ${excelRow}: ${rowProblems.join('; ')}`); return }

    const category = text(COLUMNS.category) || 'Khác'
    imported.push({
      id: Date.now() + index,
      code, name, category,
      serial: text(COLUMNS.serial),
      department: text(COLUMNS.department) || departmentFallback,
      location: text(COLUMNS.location),
      assignedTo: text(COLUMNS.assignedTo) || 'Chưa gán',
      status: (VALID_STATUSES.includes(rawStatus as AssetStatus) ? rawStatus : 'Sẵn sàng') as AssetStatus,
      purchaseDate: text(COLUMNS.purchaseDate) || new Date().toISOString().slice(0, 10),
      purchaseCost,
      manufacturer: text(COLUMNS.manufacturer),
      model: text(COLUMNS.model),
      cpu: text(COLUMNS.cpu),
      ram: text(COLUMNS.ram),
      storage: text(COLUMNS.storage),
      operatingSystem: text(COLUMNS.operatingSystem),
      ipAddress: text(COLUMNS.ipAddress),
      macAddress: text(COLUMNS.macAddress),
      icon: assetIconForCategory(category),
    })
  })

  if (problems.length) {
    throw new AssetImportError(
      `${problems.length} dòng không hợp lệ, chưa nhập dòng nào. ${problems.slice(0, 5).join(' · ')}${problems.length > 5 ? ` · và ${problems.length - 5} dòng khác` : ''}`,
      problems,
    )
  }
  if (!imported.length) throw new AssetImportError('File không có dòng dữ liệu nào để nhập.')
  return imported
}
