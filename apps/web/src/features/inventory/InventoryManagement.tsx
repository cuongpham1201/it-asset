import { useMemo, useState } from 'react'
import { CheckCircle2, ClipboardList, Plus, RefreshCw, ScanLine, XCircle } from 'lucide-react'
import {
  INVENTORY_RESULT_LABEL, INVENTORY_RESULT_TONE, cancelInventory, closeInventory, createInventory,
  getInventory, listInventories, scanInventory, type InventoryResult, type InventorySession,
} from '../../api/inventory'
import { useServerQuery } from '../../hooks/useServerQuery'
import { apiErrorMessage } from '../../services/api-client'

export interface InventoryScopeOption { id: string; name: string }

interface InventoryManagementProps {
  departments: InventoryScopeOption[]
  locations: InventoryScopeOption[]
  warehouses: InventoryScopeOption[]
  categories: InventoryScopeOption[]
  people: InventoryScopeOption[]
}

const RESULT_ORDER: InventoryResult[] = ['MATCHED', 'LOCATION_MISMATCH', 'CUSTODIAN_MISMATCH', 'UNEXPECTED', 'MISSING', 'PENDING']

const sessionStatusLabel = (session: InventorySession) =>
  session.status === 'OPEN' ? 'Đang mở' : session.status === 'CLOSED' ? 'Đã đóng' : 'Đã huỷ'

/**
 * Stocktake screen backed entirely by the inventory API. The server decides every verdict
 * (matched / missing / wrong location / wrong custodian / out of scope); this screen only sends
 * observations and renders what came back, so a refresh never loses a count.
 */
export function InventoryManagement(props: InventoryManagementProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [reloadToken, setReloadToken] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | undefined>()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', departmentId: '', locationId: '', warehouseId: '', categoryId: '' })
  const [scan, setScan] = useState({ value: '', observedLocationId: '', observedCustodianId: '', note: '' })

  const sessions = useServerQuery(signal => listInventories(signal), [reloadToken])
  const openSessions = useMemo(() => (sessions.data ?? []).filter(session => session.status === 'OPEN'), [sessions.data])
  const activeId = selectedId ?? openSessions[0]?.id ?? sessions.data?.[0]?.id

  const detail = useServerQuery(
    signal => (activeId ? getInventory(activeId, signal) : Promise.resolve(undefined)),
    [activeId, reloadToken],
  )

  const session = detail.data
  const items = session?.items ?? []
  const counts = useMemo(() => {
    const tally = new Map<InventoryResult, number>()
    items.forEach(item => tally.set(item.result, (tally.get(item.result) ?? 0) + 1))
    return tally
  }, [items])
  const scanned = items.filter(item => item.result !== 'PENDING').length
  const discrepancy = items.filter(item => !['PENDING', 'MATCHED'].includes(item.result)).length
  const isOpen = session?.status === 'OPEN'

  const reload = () => setReloadToken(value => value + 1)

  const act = async (label: string, run: () => Promise<unknown>) => {
    setBusy(true)
    setNotice(undefined)
    try {
      await run()
      setNotice({ tone: 'ok', text: label })
      reload()
      return true
    } catch (failure) {
      setNotice({ tone: 'error', text: apiErrorMessage(failure) })
      return false
    } finally {
      setBusy(false)
    }
  }

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) { setNotice({ tone: 'error', text: 'Cần đặt tên cho đợt kiểm kê.' }); return }
    const created = await act('Đã tạo đợt kiểm kê.', async () => {
      const result = await createInventory({
        name: form.name.trim(),
        departmentId: form.departmentId || undefined,
        locationId: form.locationId || undefined,
        warehouseId: form.warehouseId || undefined,
        categoryId: form.categoryId || undefined,
      })
      setSelectedId(result.id)
      return result
    })
    if (created) { setCreating(false); setForm({ name: '', departmentId: '', locationId: '', warehouseId: '', categoryId: '' }) }
  }

  const submitScan = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!session || !scan.value.trim()) return
    const done = await act('Đã ghi nhận kết quả kiểm kê.', () => scanInventory(session.id, {
      value: scan.value.trim(),
      observedLocationId: scan.observedLocationId || undefined,
      observedCustodianId: scan.observedCustodianId || undefined,
      note: scan.note.trim() || undefined,
    }))
    if (done) setScan(current => ({ ...current, value: '', note: '' }))
  }

  return <main className="page inventory-page">
    <section className="page-heading">
      <div>
        <h1>Kiểm kê tài sản</h1>
        <p>{session
          ? <>Đợt <b>{session.inventoryNo}</b> · {session.name} · {sessionStatusLabel(session)}
            {session.scopeLocation ? ` · ${session.scopeLocation.name}` : ''}
            {session.scopeCategory ? ` · ${session.scopeCategory.name}` : ''}</>
          : 'Chọn một đợt kiểm kê hoặc tạo đợt mới.'}</p>
      </div>
      <div className="heading-actions">
        <label className="filter-select">
          <select value={activeId ?? ''} onChange={event => setSelectedId(event.target.value || undefined)} disabled={sessions.loading}>
            <option value="">— Chọn đợt kiểm kê —</option>
            {(sessions.data ?? []).map(item => (
              <option key={item.id} value={item.id}>{item.inventoryNo} · {item.name} ({sessionStatusLabel(item)})</option>
            ))}
          </select>
        </label>
        <button className="btn secondary" onClick={reload} disabled={busy}><RefreshCw size={16}/>Tải lại</button>
        <button className="btn primary" onClick={() => setCreating(value => !value)}><Plus size={17}/>Đợt kiểm kê mới</button>
      </div>
    </section>

    {notice && <div className={`inline-notice ${notice.tone}`} role="status">{notice.text}</div>}

    {creating && (
      <section className="card inventory-create">
        <h2>Tạo đợt kiểm kê</h2>
        <form onSubmit={event => void submitCreate(event)}>
          <label>Tên đợt <span aria-hidden="true">*</span>
            <input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ví dụ: Kiểm kê Q3 kho Hà Nội" required/>
          </label>
          <label>Phòng ban
            <select value={form.departmentId} onChange={event => setForm({ ...form, departmentId: event.target.value })}>
              <option value="">Tất cả</option>
              {props.departments.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </label>
          <label>Site / Vị trí
            <select value={form.locationId} onChange={event => setForm({ ...form, locationId: event.target.value })}>
              <option value="">Tất cả</option>
              {props.locations.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </label>
          <label>Kho
            <select value={form.warehouseId} onChange={event => setForm({ ...form, warehouseId: event.target.value })}>
              <option value="">Tất cả</option>
              {props.warehouses.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </label>
          <label>Nhóm tài sản
            <select value={form.categoryId} onChange={event => setForm({ ...form, categoryId: event.target.value })}>
              <option value="">Tất cả</option>
              {props.categories.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </label>
          <div className="form-actions">
            <button type="button" className="btn secondary" onClick={() => setCreating(false)}>Huỷ</button>
            <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo đợt'}</button>
          </div>
        </form>
      </section>
    )}

    {detail.error && (
      <section className="card empty error-state" role="alert">
        <h3>Không tải được đợt kiểm kê</h3>
        <p>{detail.error}</p>
        <button className="btn secondary" onClick={detail.retry}><RefreshCw size={16}/>Thử lại</button>
      </section>
    )}

    {sessions.error && !sessions.data && (
      <section className="card empty error-state" role="alert">
        <h3>Không tải được danh sách đợt kiểm kê</h3>
        <p>{sessions.error}</p>
        <button className="btn secondary" onClick={sessions.retry}><RefreshCw size={16}/>Thử lại</button>
      </section>
    )}

    {!session && !detail.loading && !detail.error && !sessions.loading && (
      <section className="card empty">
        <ClipboardList size={30}/>
        <h3>Chưa có đợt kiểm kê nào</h3>
        <p>Tạo một đợt để bắt đầu đối soát tài sản theo phòng ban, site, kho hoặc nhóm.</p>
      </section>
    )}

    {session && <>
      <section className="ops-summary inventory-summary">
        <article><span>Phạm vi</span><b>{items.length}</b></article>
        <article><span>Đã kiểm</span><b>{scanned}</b></article>
        <article><span>Chưa kiểm</span><b>{items.length - scanned}</b></article>
        <article><span>Chênh lệch</span><b>{discrepancy}</b></article>
      </section>

      {isOpen ? (
        <section className="card inventory-scan">
          <h2>Ghi nhận kiểm kê</h2>
          <form onSubmit={event => void submitScan(event)}>
            <label>Mã tài sản / Barcode / Serial <span aria-hidden="true">*</span>
              <input value={scan.value} onChange={event => setScan({ ...scan, value: event.target.value })} placeholder="Quét bằng máy quét hoặc nhập mã" required autoFocus/>
            </label>
            <label>Vị trí quan sát
              <select value={scan.observedLocationId} onChange={event => setScan({ ...scan, observedLocationId: event.target.value })}>
                <option value="">Không ghi nhận</option>
                {props.locations.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>
            <label>Người giữ quan sát
              <select value={scan.observedCustodianId} onChange={event => setScan({ ...scan, observedCustodianId: event.target.value })}>
                <option value="">Không ghi nhận</option>
                {props.people.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>
            <label>Ghi chú
              <input value={scan.note} onChange={event => setScan({ ...scan, note: event.target.value })} placeholder="Tuỳ chọn"/>
            </label>
            <div className="form-actions">
              <button type="submit" className="btn primary" disabled={busy}><ScanLine size={17}/>{busy ? 'Đang ghi…' : 'Ghi nhận'}</button>
            </div>
          </form>
          <p className="form-hint">Kết quả do máy chủ xác định và được lưu ngay — tải lại trang không mất dữ liệu.</p>
        </section>
      ) : (
        <div className="inline-notice muted" role="status">
          Đợt này đã {sessionStatusLabel(session).toLowerCase()} nên không thể ghi nhận thêm.
        </div>
      )}

      <section className="enterprise-panel">
        <div className="panel-heading">
          <div><h2>Danh sách kiểm kê</h2><span>{items.length} tài sản trong phạm vi</span></div>
          <div className="inventory-progress"><span style={{ width: `${items.length ? (scanned / items.length) * 100 : 0}%` }}/></div>
        </div>
        <div className="inventory-legend">
          {RESULT_ORDER.filter(result => counts.get(result)).map(result => (
            <span key={result} className={`status ${INVENTORY_RESULT_TONE[result]}`}><i/>{INVENTORY_RESULT_LABEL[result]}: {counts.get(result)}</span>
          ))}
        </div>
        <div className="table-scroll" aria-busy={detail.loading}>
          <table className="inventory-table">
            <thead><tr><th>MÃ TÀI SẢN</th><th>TÊN TÀI SẢN</th><th>SERIAL</th><th>KẾT QUẢ</th><th>GHI CHÚ</th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td><b className="table-code">{item.asset?.assetTag ?? '—'}</b></td>
                  <td>{item.asset?.name ?? '—'}</td>
                  <td>{item.asset?.serialNumber || '—'}</td>
                  <td><span className={`status ${INVENTORY_RESULT_TONE[item.result]}`}><i/>{INVENTORY_RESULT_LABEL[item.result]}</span></td>
                  <td>{item.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length && !detail.loading && <div className="empty"><h3>Đợt kiểm kê chưa có tài sản trong phạm vi</h3></div>}
        {isOpen && (
          <div className="form-actions panel-actions">
            <button className="btn secondary" disabled={busy} onClick={() => void act('Đã huỷ đợt kiểm kê.', () => cancelInventory(session.id))}>
              <XCircle size={16}/>Huỷ đợt
            </button>
            <button className="btn primary" disabled={busy} onClick={() => void act('Đã đóng đợt. Tài sản chưa kiểm được ghi là Thiếu.', () => closeInventory(session.id))}>
              <CheckCircle2 size={16}/>Đóng đợt kiểm kê
            </button>
          </div>
        )}
      </section>
    </>}
  </main>
}
