import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, MoreHorizontal, Plus, RefreshCw, ScanLine, Search } from 'lucide-react'
import type { Asset, AssetTransaction, TransactionType } from '../../types'
import { ASSET_PAGE_SIZE, listAssets, type AssetQuery } from '../../api/assets'
import type { AssetSummary } from '../../api/assets'
import { useDebounced, useServerQuery } from '../../hooks/useServerQuery'
import { fromApiAsset } from './asset-format'
import type { AssetBookOption, AssetStatusOption } from './AssetBook'

type View = 'all' | 'assigned' | 'stock' | 'due'
type SortKey = NonNullable<AssetQuery['sort']>

const VIEW_FILTER: Record<View, AssetQuery['lifecycle']> = {
  all: undefined, assigned: 'assigned', stock: 'in_stock', due: 'due',
}

const SORTABLE: Array<[string, SortKey | undefined]> = [
  ['Mã tài sản', 'assetTag'], ['Tên tài sản', 'name'], ['Serial / Service Tag', undefined],
  ['Loại', undefined], ['Người sử dụng', undefined], ['Đơn vị', undefined], ['Vị trí', undefined],
  ['Trạng thái', undefined], ['Ngày cấp', undefined], ['Ngày thu hồi', undefined], ['', undefined],
]

const PAGE_SIZE_OPTIONS = [10, 20, 50]

interface OperationsBoardProps {
  summary: AssetSummary | undefined
  categories: AssetBookOption[]
  departments: AssetBookOption[]
  locations: AssetBookOption[]
  statuses: AssetStatusOption[]
  people: Array<{ id: string; name: string }>
  transactions: AssetTransaction[]
  refreshToken: number
  onAssign: (asset: Asset) => void
  onBarcode: (asset: Asset) => void
  onView: (asset: Asset) => void
  openHistory: () => void
  openScanner: (mode?: 'lookup' | 'intake') => void
}

/**
 * Assignment / return / transfer workbench. Each operational tab is a real server-side
 * filter (`lifecycle`), so the screen only ever holds the page it is showing.
 */
export function OperationsBoard(props: OperationsBoardProps) {
  const [search, setSearch] = useState('')
  const [activeView, setActiveView] = useState<View>('all')
  const [departmentId, setDepartmentId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [statusCode, setStatusCode] = useState('')
  const [locationId, setLocationId] = useState('')
  const [personId, setPersonId] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('assetTag')
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(ASSET_PAGE_SIZE > 10 ? 10 : ASSET_PAGE_SIZE)
  const [menuId, setMenuId] = useState<string>()
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const debouncedSearch = useDebounced(search, 350)

  useEffect(() => { setPage(1) }, [debouncedSearch, activeView, departmentId, categoryId, statusCode, locationId, personId, pageSize, sortKey, sortAsc])

  const query = useMemo<AssetQuery>(() => ({
    page, limit: pageSize, search: debouncedSearch, department: departmentId, category: categoryId,
    status: statusCode, location: locationId, assignedUser: personId,
    lifecycle: VIEW_FILTER[activeView], sort: sortKey, order: sortAsc ? 'asc' : 'desc',
  }), [page, pageSize, debouncedSearch, departmentId, categoryId, statusCode, locationId, personId, activeView, sortKey, sortAsc])

  const { data, loading, error, retry } = useServerQuery(
    signal => listAssets(query, signal),
    [JSON.stringify(query), props.refreshToken],
  )

  const rows = useMemo(() => (data?.data ?? []).map(fromApiAsset), [data])
  const total = data?.meta.total ?? 0
  const pageCount = Math.max(1, data?.meta.totalPages ?? 1)

  // Selection is scoped to the visible page: a checkbox cannot promise to cover rows the
  // browser has never seen.
  const visibleIds = rows.map(asset => asset.apiId!).filter(Boolean)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id))
  const selectedAssets = rows.filter(asset => asset.apiId && selectedIds.includes(asset.apiId))
  const toggleVisible = () => setSelectedIds(current => allVisibleSelected
    ? current.filter(id => !visibleIds.includes(id))
    : [...new Set([...current, ...visibleIds])])

  const lastTransaction = (assetId: number, types: TransactionType[]) =>
    props.transactions.find(item => item.assetId === assetId && types.includes(item.type))
  const dateCell = (value?: string) => (value ? new Date(value).toLocaleDateString('vi-VN') : '—')
  const sort = (key: SortKey) => { if (sortKey === key) setSortAsc(value => !value); else { setSortKey(key); setSortAsc(true) } }
  const clearFilters = () => { setSearch(''); setDepartmentId(''); setCategoryId(''); setStatusCode(''); setLocationId(''); setPersonId('') }

  const workflow: Array<[string, () => void]> = [
    ['Nhập kho', () => props.openScanner('intake')],
    ['Cấp phát / Mượn', () => setActiveView('stock')],
    ['Thu hồi', () => setActiveView('assigned')],
    ['Điều chuyển', () => setActiveView('assigned')],
    ['Có hạn trả', () => setActiveView('due')],
  ]

  return <main className="page operations enterprise-ops">
    <section className="page-heading">
      <div>
        <h1>Quản lý cấp phát tài sản</h1>
        <p>{props.summary
          ? `${props.summary.total} tài sản · ${props.summary.assigned} đang sử dụng · ${props.summary.available} sẵn sàng trong kho`
          : 'Đang tải số liệu…'}</p>
      </div>
      <div className="heading-actions">
        <button className="btn secondary" onClick={() => props.openScanner('lookup')}><ScanLine size={16}/>Quét mã</button>
        <button className="btn primary" onClick={() => props.openScanner('intake')}><Plus size={16}/>Nhập kho</button>
      </div>
    </section>

    <section className="enterprise-workflow">
      <b>Quy trình:</b>
      {workflow.map(([label, action], index) => <button onClick={action} key={label}><span>{index + 1}</span>{label}</button>)}
    </section>

    <section className="enterprise-metrics">
      <button className={activeView === 'all' ? 'active' : ''} onClick={() => setActiveView('all')}><span>Tổng tài sản</span><b>{props.summary?.total ?? '…'}</b></button>
      <button className={activeView === 'assigned' ? 'active' : ''} onClick={() => setActiveView('assigned')}><span>Đã cấp phát</span><b>{props.summary?.assigned ?? '…'}</b></button>
      <button className={activeView === 'stock' ? 'active' : ''} onClick={() => setActiveView('stock')}><span>Sẵn sàng trong kho</span><b>{props.summary?.available ?? '…'}</b></button>
      <button className={activeView === 'due' ? 'active' : ''} onClick={() => setActiveView('due')}><span>Quá hạn trả</span><b>{props.summary?.due ?? '…'}</b></button>
      <div><span>Cần xử lý</span><b>{props.summary?.attention ?? '…'}</b></div>
    </section>

    <section className="enterprise-table">
      <div className="enterprise-table-title">
        <div><h2>Danh sách tài sản</h2><span>{total} bản ghi</span></div>
        <button className="text-link" onClick={clearFilters}>Xóa bộ lọc</button>
      </div>

      <div className="enterprise-filters">
        <label><Search size={15}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Mã, tên, serial, người sử dụng"/></label>
        <select value={departmentId} onChange={event => setDepartmentId(event.target.value)}>
          <option value="">Đơn vị: Tất cả</option>
          {props.departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select value={categoryId} onChange={event => setCategoryId(event.target.value)}>
          <option value="">Loại: Tất cả</option>
          {props.categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select value={statusCode} onChange={event => setStatusCode(event.target.value)}>
          <option value="">Trạng thái: Tất cả</option>
          {props.statuses.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
        <select value={locationId} onChange={event => setLocationId(event.target.value)}>
          <option value="">Vị trí: Tất cả</option>
          {props.locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select value={personId} onChange={event => setPersonId(event.target.value)}>
          <option value="">Người dùng: Tất cả</option>
          {props.people.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>

      {selectedAssets.length > 0 && (
        <div className="bulk-action-bar">
          <b>{selectedAssets.length} tài sản đã chọn trên trang này</b>
          <button disabled={selectedAssets.length !== 1} onClick={() => selectedAssets[0] && props.onAssign(selectedAssets[0])}>Cấp phát / Thu hồi / Điều chuyển</button>
          <button onClick={() => selectedAssets.forEach(props.onBarcode)}>In barcode</button>
          <button onClick={() => setSelectedIds([])}>Bỏ chọn</button>
        </div>
      )}

      {error ? (
        <div className="enterprise-empty error-state" role="alert">
          <p>{error}</p>
          <button className="btn secondary" onClick={retry}><RefreshCw size={16}/>Thử lại</button>
        </div>
      ) : (
        <div className="table-scroll" aria-busy={loading}>
          <table className="enterprise-asset-table">
            <thead><tr>
              <th className="check-cell"><input type="checkbox" aria-label="Chọn tất cả tài sản đang hiển thị" checked={allVisibleSelected} onChange={toggleVisible}/></th>
              {SORTABLE.map(([label, key]) => (
                <th key={label || 'actions'}>
                  {key
                    ? <button onClick={() => sort(key)}>{label}<ChevronDown size={12} className={sortKey === key && sortAsc ? 'sort-up' : ''}/></button>
                    : label}
                </th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map(asset => {
                const id = asset.apiId!
                const issued = lastTransaction(asset.id, ['Cấp phát', 'Cho mượn'])
                const returned = lastTransaction(asset.id, ['Thu hồi'])
                const inStock = asset.assignedTo === 'Chưa gán' && asset.status === 'Sẵn sàng'
                return <tr key={id} className={selectedIds.includes(id) ? 'selected-row' : ''}>
                  <td className="check-cell">
                    <input type="checkbox" aria-label={`Chọn ${asset.code}`} checked={selectedIds.includes(id)}
                      onChange={() => setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])}/>
                  </td>
                  <td><button className="table-code" onClick={() => props.onView(asset)}>{asset.code}</button></td>
                  <td><b>{asset.name}</b></td>
                  <td>{asset.serial || '—'}</td>
                  <td>{asset.category}</td>
                  <td>{asset.assignedTo === 'Chưa gán' ? <span className="muted">Chưa gán</span> : asset.assignedTo}</td>
                  <td>{asset.department}</td>
                  <td>{asset.location}</td>
                  <td><span className={`enterprise-status ${asset.status === 'Đang sử dụng' ? 'using' : asset.status === 'Sẵn sàng' ? 'ready' : asset.status === 'Bảo trì' ? 'maintenance' : 'broken'}`}>{asset.status}</span></td>
                  <td>{dateCell(issued?.date)}</td>
                  <td>{dateCell(returned?.date)}</td>
                  <td className="action-cell">
                    <button className="more-action" onClick={() => setMenuId(menuId === id ? undefined : id)}><MoreHorizontal size={17}/></button>
                    {menuId === id && (
                      <div className="row-action-menu">
                        <button onClick={() => { props.onView(asset); setMenuId(undefined) }}>Xem chi tiết</button>
                        <button onClick={() => { props.onAssign(asset); setMenuId(undefined) }}>
                          {inStock ? 'Cấp phát / Cho mượn' : asset.assignedTo !== 'Chưa gán' ? 'Thu hồi / Điều chuyển' : 'Điều chuyển'}
                        </button>
                        <button onClick={() => { props.onBarcode(asset); setMenuId(undefined) }}>In barcode</button>
                      </div>
                    )}
                  </td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      )}

      {!error && !loading && !rows.length && <div className="enterprise-empty">Không có dữ liệu phù hợp với bộ lọc.</div>}

      <div className="enterprise-pagination">
        <span>Hiển thị {total ? (page - 1) * pageSize + 1 : 0}–{(page - 1) * pageSize + rows.length} / {total} bản ghi</span>
        <label>Số dòng
          <select value={pageSize} onChange={event => setPageSize(Number(event.target.value))}>
            {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <div>
          <button disabled={loading || page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Trước</button>
          <span className="page-indicator">Trang {page} / {pageCount}</span>
          <button disabled={loading || page >= pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))}>Sau</button>
        </div>
      </div>
    </section>

    <section className="enterprise-audit">
      <div className="enterprise-table-title">
        <div><h2>Hoạt động gần đây</h2><span>Nhật ký nghiệp vụ</span></div>
        <button className="text-link" onClick={props.openHistory}>Xem toàn bộ</button>
      </div>
      <div className="audit-grid audit-head"><span>MÃ PHIẾU</span><span>NGHIỆP VỤ</span><span>TÀI SẢN</span><span>THỜI GIAN</span><span>NGƯỜI THAO TÁC</span></div>
      {props.transactions.slice(0, 5).map(item => (
        <div className="audit-grid" key={item.id}>
          <b>PGD-{String(item.id).slice(-6)}</b><span>{item.type}</span>
          <span>{item.assetCode} · {item.assetName}</span>
          <span>{new Date(item.date).toLocaleString('vi-VN')}</span><span>{item.performedBy}</span>
        </div>
      ))}
      {!props.transactions.length && <div className="enterprise-empty">Chưa có hoạt động nào được ghi nhận.</div>}
    </section>
  </main>
}
