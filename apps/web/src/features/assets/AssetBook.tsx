import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Building2, ChevronDown, ChevronLeft, ChevronRight, Download, Filter, MapPin, Pencil, Plus, QrCode, RefreshCw, Search, Trash2, Upload, UserPlus } from 'lucide-react'
import type { Asset } from '../../types'
import { ASSET_PAGE_SIZE, ASSET_MAX_LIMIT, listAssets, type AssetQuery } from '../../api/assets'
import { useDebounced, useServerQuery } from '../../hooks/useServerQuery'
import { apiErrorMessage } from '../../services/api-client'
import { assetIconForCategory, assetStatusClass, fromApiAsset, money } from './asset-format'

export interface AssetBookOption { id: string; code?: string; name: string }
export interface AssetStatusOption { code: string; name: string }

/**
 * Excel export needs every matching row, which the API only serves a page at a time.
 * Until the server-side export lands we walk pages with a hard ceiling and tell the user
 * plainly when the file was truncated — never silently.
 */
const EXPORT_MAX_ROWS = ASSET_MAX_LIMIT * 20

const SORT_OPTIONS: Array<{ value: NonNullable<AssetQuery['sort']>; label: string }> = [
  { value: 'assetTag', label: 'Mã tài sản' },
  { value: 'name', label: 'Tên tài sản' },
  { value: 'createdAt', label: 'Ngày tạo' },
  { value: 'purchaseCost', label: 'Nguyên giá' },
]

const PAGE_SIZE_OPTIONS = [20, 50, 100]

/** Builds a compact page-number window around the current page. */
function pageWindow(current: number, total: number, span = 2): number[] {
  const first = Math.max(1, Math.min(current - span, total - span * 2))
  const last = Math.min(total, Math.max(current + span, span * 2 + 1))
  const pages: number[] = []
  for (let page = first; page <= last; page += 1) pages.push(page)
  return pages
}

interface AssetBookProps {
  categories: AssetBookOption[]
  departments: AssetBookOption[]
  statuses: AssetStatusOption[]
  canManageCategories: boolean
  /** Bumped by the parent after any mutation so the current page reloads — never the whole table. */
  refreshToken: number
  onImport: (items: Asset[]) => void
  onAdd: () => void
  onEdit: (asset: Asset) => void
  onDelete: (asset: Asset) => void
  onAssign: (asset: Asset) => void
  onBarcode: (asset: Asset) => void
  onView: (asset: Asset) => void
  onManageCategories: () => void
  onExport: (assets: Asset[], truncated: boolean) => void
  renderIcon: (type: string, size?: number) => React.ReactNode
  parseImportFile: (file: File) => Promise<Asset[]>
}

export function AssetBook(props: AssetBookProps) {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [statusCode, setStatusCode] = useState('')
  const [sort, setSort] = useState<NonNullable<AssetQuery['sort']>>('assetTag')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [limit, setLimit] = useState(ASSET_PAGE_SIZE)
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | undefined>()
  const importRef = useRef<HTMLInputElement>(null)

  const debouncedSearch = useDebounced(search, 350)

  // Any change to what is being asked for must start from the first page again, otherwise the
  // user lands on an out-of-range page and sees an empty table.
  useEffect(() => { setPage(1) }, [debouncedSearch, categoryId, departmentId, statusCode, sort, order, limit])

  const query = useMemo<AssetQuery>(() => ({
    page, limit, search: debouncedSearch, category: categoryId, department: departmentId, status: statusCode, sort, order,
  }), [page, limit, debouncedSearch, categoryId, departmentId, statusCode, sort, order])

  const { data, loading, error, retry } = useServerQuery(
    signal => listAssets(query, signal),
    [JSON.stringify(query), props.refreshToken],
  )

  const rows = useMemo(() => (data?.data ?? []).map(fromApiAsset), [data])
  const meta = data?.meta
  const total = meta?.total ?? 0
  const totalPages = Math.max(1, meta?.totalPages ?? 1)
  const filtersActive = Boolean(debouncedSearch || categoryId || departmentId || statusCode)

  const resetFilters = () => { setSearch(''); setCategoryId(''); setDepartmentId(''); setStatusCode('') }

  const runImport = async (file?: File) => {
    if (!file) return
    setImporting(true)
    setNotice(undefined)
    try {
      const imported = await props.parseImportFile(file)
      props.onImport(imported)
      setNotice({ tone: 'ok', text: `Đã đọc ${imported.length} dòng từ Excel và gửi lên hệ thống.` })
    } catch (failure) {
      setNotice({ tone: 'error', text: apiErrorMessage(failure) })
    } finally {
      setImporting(false)
      if (importRef.current) importRef.current.value = ''
    }
  }

  /** Walks pages up to EXPORT_MAX_ROWS so a large tenant cannot lock up the browser. */
  const runExport = async () => {
    setExporting(true)
    setNotice(undefined)
    try {
      const collected: Asset[] = []
      let current = 1
      let pages = 1
      do {
        const chunk = await listAssets({ ...query, page: current, limit: ASSET_MAX_LIMIT })
        pages = Math.max(1, chunk.meta.totalPages)
        collected.push(...chunk.data.map(fromApiAsset))
        current += 1
      } while (current <= pages && collected.length < EXPORT_MAX_ROWS)
      const truncated = collected.length >= EXPORT_MAX_ROWS && total > collected.length
      props.onExport(collected, truncated)
      if (truncated) setNotice({ tone: 'error', text: `Chỉ xuất được ${collected.length} trên ${total} tài sản. Hãy lọc hẹp hơn; bản xuất phía máy chủ sẽ bỏ giới hạn này.` })
    } catch (failure) {
      setNotice({ tone: 'error', text: apiErrorMessage(failure) })
    } finally {
      setExporting(false)
    }
  }

  const categoryTiles = useMemo(() => props.categories.slice(0, 12), [props.categories])

  return <main className="page">
    <section className="page-heading">
      <div><h1>Sổ tài sản</h1><p>Quản lý và theo dõi toàn bộ tài sản trong công ty.</p></div>
      <div className="heading-actions">
        <input ref={importRef} hidden type="file" accept=".xlsx" onChange={event => void runImport(event.target.files?.[0])}/>
        <button className="btn secondary" disabled={importing} onClick={() => importRef.current?.click()}>
          <Upload size={17}/>{importing ? 'Đang đọc file…' : 'Nhập Excel'}
        </button>
        <button className="btn secondary" disabled={exporting || total === 0} onClick={() => void runExport()}>
          <Download size={17}/>{exporting ? 'Đang chuẩn bị…' : 'Xuất Excel'}
        </button>
        <button className="btn primary" onClick={props.onAdd}><Plus size={18}/>Thêm tài sản</button>
      </div>
    </section>

    {notice && <div className={`inline-notice ${notice.tone}`} role="status">{notice.text}</div>}

    <div className="asset-summary">
      <span><b>{total}</b> tài sản{filtersActive ? ' khớp bộ lọc' : ''}</span>
      <span>Trang <b>{meta?.page ?? page}</b> / <b>{totalPages}</b></span>
      {filtersActive && <button className="btn link" onClick={resetFilters}>Bỏ bộ lọc</button>}
    </div>

    <section className="asset-group-filter">
      <button className={categoryId === '' ? 'active' : ''} onClick={() => setCategoryId('')}>
        <span><Box size={19}/></span><div><b>Tất cả</b><small>Mọi nhóm tài sản</small></div>
      </button>
      {categoryTiles.map(category => (
        <button className={categoryId === category.id ? 'active' : ''} onClick={() => setCategoryId(category.id)} key={category.id}>
          <span>{props.renderIcon(assetIconForCategory(category.name), 19)}</span>
          <div><b>{category.name}</b><small>{category.code || 'Nhóm tài sản'}</small></div>
        </button>
      ))}
      {props.canManageCategories && (
        <button className="asset-group-add" onClick={props.onManageCategories}>
          <span><Plus size={18}/></span><div><b>Quản lý nhóm</b><small>Danh mục tài sản</small></div>
        </button>
      )}
    </section>

    <section className="card asset-list-card">
      <div className="filters">
        <label className="search-box">
          <Search size={18}/>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm mã, tên, serial, người sử dụng..."/>
        </label>
        <label className="filter-select">
          <Building2 size={17}/>
          <select value={departmentId} onChange={event => setDepartmentId(event.target.value)}>
            <option value="">Tất cả phòng ban</option>
            {props.departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
          <ChevronDown size={15}/>
        </label>
        <label className="filter-select">
          <Filter size={17}/>
          <select value={statusCode} onChange={event => setStatusCode(event.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {props.statuses.map(status => <option key={status.code} value={status.code}>{status.name}</option>)}
          </select>
          <ChevronDown size={15}/>
        </label>
        <label className="filter-select">
          <select value={sort} onChange={event => setSort(event.target.value as NonNullable<AssetQuery['sort']>)}>
            {SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>Sắp xếp: {option.label}</option>)}
          </select>
          <ChevronDown size={15}/>
        </label>
        <button className="btn secondary" onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')} title="Đổi chiều sắp xếp">
          {order === 'asc' ? 'Tăng dần' : 'Giảm dần'}
        </button>
      </div>

      {error && (
        <div className="empty error-state" role="alert">
          <h3>Không tải được danh sách tài sản</h3>
          <p>{error}</p>
          <button className="btn secondary" onClick={retry}><RefreshCw size={16}/>Thử lại</button>
        </div>
      )}

      {!error && (
        <div className="table-scroll" aria-busy={loading}>
          <table>
            <thead><tr><th>TÀI SẢN</th><th>PHÒNG BAN / VỊ TRÍ</th><th>NGƯỜI SỬ DỤNG</th><th>NGUYÊN GIÁ</th><th>TRẠNG THÁI</th><th></th></tr></thead>
            <tbody>
              {rows.map(asset => <tr key={asset.apiId ?? asset.id}>
                <td>
                  <div className="asset-cell">
                    <span className="asset-icon">{props.renderIcon(asset.icon)}</span>
                    <div>
                      <button className="asset-name-link" onClick={() => props.onView(asset)}>{asset.name}</button>
                      <small><em className="asset-category-tag">{asset.category}</em>{asset.code} · {asset.serial || 'Không có serial'}</small>
                    </div>
                  </div>
                </td>
                <td><b className="cell-main">{asset.department}</b><small className="cell-sub"><MapPin size={12}/>{asset.location}</small></td>
                <td><span className="user-cell"><span>{asset.assignedTo.split(' ').slice(-2).map(part => part[0]).join('')}</span>{asset.assignedTo}</span></td>
                <td><b className="cell-main">{money(asset.purchaseCost)}</b><small className="cell-sub">Mua {new Date(asset.purchaseDate).toLocaleDateString('vi-VN')}</small></td>
                <td><span className={`status ${assetStatusClass[asset.status]}`}><i/>{asset.status}</span></td>
                <td>
                  <div className="row-actions">
                    <button onClick={() => props.onAssign(asset)} title="Cấp phát / Thu hồi"><UserPlus size={16}/></button>
                    <button onClick={() => props.onBarcode(asset)} title="In Barcode / QR"><QrCode size={16}/></button>
                    <button onClick={() => props.onEdit(asset)} title="Sửa"><Pencil size={16}/></button>
                    <button onClick={() => props.onDelete(asset)} title="Xóa"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}

      {!error && loading && rows.length === 0 && <div className="empty"><h3>Đang tải tài sản…</h3></div>}
      {!error && !loading && rows.length === 0 && (
        <div className="empty">
          <Search size={30}/>
          <h3>Không tìm thấy tài sản</h3>
          <p>{filtersActive ? 'Thử thay đổi từ khóa hoặc bộ lọc.' : 'Chưa có tài sản nào trong hệ thống.'}</p>
        </div>
      )}

      <div className="pagination">
        <span>
          {total === 0 ? 'Không có tài sản' : <>Hiển thị <b>{(meta ? (meta.page - 1) * meta.limit : 0) + (rows.length ? 1 : 0)}–{(meta ? (meta.page - 1) * meta.limit : 0) + rows.length}</b> trên <b>{total}</b> tài sản</>}
          <label className="page-size">
            <select value={limit} onChange={event => setLimit(Number(event.target.value))}>
              {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size} / trang</option>)}
            </select>
          </label>
        </span>
        <div>
          <button disabled={loading || page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))} title="Trang trước"><ChevronLeft size={16}/></button>
          {pageWindow(page, totalPages).map(candidate => (
            <button key={candidate} className={candidate === page ? 'active' : ''} disabled={loading} onClick={() => setPage(candidate)}>{candidate}</button>
          ))}
          <button disabled={loading || page >= totalPages} onClick={() => setPage(current => Math.min(totalPages, current + 1))} title="Trang sau"><ChevronRight size={16}/></button>
        </div>
      </div>
    </section>
  </main>
}
