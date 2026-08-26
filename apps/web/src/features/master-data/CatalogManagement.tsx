import { useMemo, useState } from 'react'
import { Factory, Layers, Plus, RefreshCw, Tags } from 'lucide-react'
import {
  createCategory, createManufacturer, createModel, listAdminCategories, listManufacturers, listModels,
  updateCategory, updateManufacturer, updateModel, type AssetCategory, type AssetModel, type Manufacturer,
} from '../../api/master-data'
import { useServerQuery } from '../../hooks/useServerQuery'
import { apiErrorMessage } from '../../services/api-client'

type Tab = 'manufacturers' | 'models' | 'categories'

const TABS: Array<{ id: Tab; label: string; icon: typeof Factory }> = [
  { id: 'manufacturers', label: 'Hãng sản xuất', icon: Factory },
  { id: 'models', label: 'Model', icon: Layers },
  { id: 'categories', label: 'Nhóm tài sản', icon: Tags },
]

const statusLabel = (status: string) => (status === 'ACTIVE' ? 'Đang dùng' : 'Đã ngừng')

/**
 * Minimal admin CRUD for the catalog that assets reference. Without this, manufacturer and
 * model can never hold a value, which is why the asset form silently lost them.
 */
export function CatalogManagement() {
  const [tab, setTab] = useState<Tab>('manufacturers')
  const [token, setToken] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | undefined>()
  const [manufacturerForm, setManufacturerForm] = useState({ name: '', website: '' })
  const [modelForm, setModelForm] = useState({ name: '', manufacturerId: '', categoryId: '', modelNumber: '' })
  const [categoryForm, setCategoryForm] = useState({ code: '', name: '', description: '' })

  const reload = () => setToken(value => value + 1)

  const manufacturers = useServerQuery(signal => listManufacturers(signal), [token])
  const models = useServerQuery(signal => listModels(signal), [token])
  const categories = useServerQuery(signal => listAdminCategories(signal), [token])

  const activeManufacturers = useMemo(() => (manufacturers.data ?? []).filter(item => item.status === 'ACTIVE'), [manufacturers.data])
  const activeCategories = useMemo(() => (categories.data ?? []).filter(item => item.status === 'ACTIVE'), [categories.data])

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

  const toggleStatus = (current: string) => (current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE') as 'ACTIVE' | 'INACTIVE'

  const currentQuery = tab === 'manufacturers' ? manufacturers : tab === 'models' ? models : categories

  return <main className="page catalog-page">
    <section className="page-heading">
      <div><h1>Danh mục tài sản</h1><p>Quản lý hãng sản xuất, model và nhóm tài sản dùng chung cho toàn bộ hồ sơ tài sản.</p></div>
      <div className="heading-actions">
        <button className="btn secondary" onClick={reload} disabled={busy}><RefreshCw size={16}/>Tải lại</button>
      </div>
    </section>

    {notice && <div className={`inline-notice ${notice.tone}`} role="status">{notice.text}</div>}

    <div className="settings-tabs">
      {TABS.map(item => (
        <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
          <item.icon size={16}/>{item.label}
        </button>
      ))}
    </div>

    {currentQuery.error && (
      <section className="card empty error-state" role="alert">
        <h3>Không tải được danh mục</h3>
        <p>{currentQuery.error}</p>
        <button className="btn secondary" onClick={currentQuery.retry}><RefreshCw size={16}/>Thử lại</button>
      </section>
    )}

    {tab === 'manufacturers' && !manufacturers.error && (
      <section className="card">
        <form className="inline-form" onSubmit={event => {
          event.preventDefault()
          if (!manufacturerForm.name.trim()) return
          void act('Đã thêm hãng sản xuất.', async () => {
            await createManufacturer({ name: manufacturerForm.name.trim(), website: manufacturerForm.website.trim() || undefined })
            setManufacturerForm({ name: '', website: '' })
          })
        }}>
          <label>Tên hãng <span aria-hidden="true">*</span>
            <input value={manufacturerForm.name} onChange={event => setManufacturerForm({ ...manufacturerForm, name: event.target.value })} placeholder="Ví dụ: Dell" required/>
          </label>
          <label>Website
            <input value={manufacturerForm.website} onChange={event => setManufacturerForm({ ...manufacturerForm, website: event.target.value })} placeholder="Tuỳ chọn"/>
          </label>
          <button type="submit" className="btn primary" disabled={busy}><Plus size={16}/>Thêm hãng</button>
        </form>
        <div className="table-scroll" aria-busy={manufacturers.loading}>
          <table>
            <thead><tr><th>TÊN HÃNG</th><th>MODEL</th><th>TÀI SẢN</th><th>TRẠNG THÁI</th><th></th></tr></thead>
            <tbody>
              {(manufacturers.data ?? []).map((row: Manufacturer) => (
                <tr key={row.id}>
                  <td><b className="cell-main">{row.name}</b>{row.website && <small className="cell-sub">{row.website}</small>}</td>
                  <td>{row._count?.models ?? 0}</td>
                  <td>{row._count?.assets ?? 0}</td>
                  <td><span className={`status ${row.status === 'ACTIVE' ? 'blue' : 'red'}`}><i/>{statusLabel(row.status)}</span></td>
                  <td>
                    <button className="btn link" disabled={busy}
                      onClick={() => void act('Đã cập nhật hãng sản xuất.', () => updateManufacturer(row.id, { status: toggleStatus(row.status) }))}>
                      {row.status === 'ACTIVE' ? 'Ngừng dùng' : 'Dùng lại'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!manufacturers.loading && !(manufacturers.data ?? []).length && <div className="empty"><h3>Chưa có hãng sản xuất nào</h3><p>Thêm hãng để có thể gán cho tài sản.</p></div>}
      </section>
    )}

    {tab === 'models' && !models.error && (
      <section className="card">
        <form className="inline-form" onSubmit={event => {
          event.preventDefault()
          if (!modelForm.name.trim() || !modelForm.manufacturerId || !modelForm.categoryId) {
            setNotice({ tone: 'error', text: 'Cần chọn hãng sản xuất, nhóm tài sản và nhập tên model.' })
            return
          }
          void act('Đã thêm model.', async () => {
            await createModel({
              name: modelForm.name.trim(), manufacturerId: modelForm.manufacturerId,
              categoryId: modelForm.categoryId, modelNumber: modelForm.modelNumber.trim() || undefined,
            })
            setModelForm({ name: '', manufacturerId: '', categoryId: '', modelNumber: '' })
          })
        }}>
          <label>Tên model <span aria-hidden="true">*</span>
            <input value={modelForm.name} onChange={event => setModelForm({ ...modelForm, name: event.target.value })} placeholder="Ví dụ: Latitude 5440" required/>
          </label>
          <label>Hãng sản xuất <span aria-hidden="true">*</span>
            <select value={modelForm.manufacturerId} onChange={event => setModelForm({ ...modelForm, manufacturerId: event.target.value })} required>
              <option value="">— Chọn hãng —</option>
              {activeManufacturers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Nhóm tài sản <span aria-hidden="true">*</span>
            <select value={modelForm.categoryId} onChange={event => setModelForm({ ...modelForm, categoryId: event.target.value })} required>
              <option value="">— Chọn nhóm —</option>
              {activeCategories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Mã model
            <input value={modelForm.modelNumber} onChange={event => setModelForm({ ...modelForm, modelNumber: event.target.value })} placeholder="Tuỳ chọn"/>
          </label>
          <button type="submit" className="btn primary" disabled={busy || !activeManufacturers.length}><Plus size={16}/>Thêm model</button>
        </form>
        {!activeManufacturers.length && <p className="form-hint">Cần có ít nhất một hãng sản xuất đang dùng trước khi thêm model.</p>}
        <div className="table-scroll" aria-busy={models.loading}>
          <table>
            <thead><tr><th>MODEL</th><th>HÃNG</th><th>NHÓM</th><th>TÀI SẢN</th><th>TRẠNG THÁI</th><th></th></tr></thead>
            <tbody>
              {(models.data ?? []).map((row: AssetModel) => (
                <tr key={row.id}>
                  <td><b className="cell-main">{row.name}</b>{row.modelNumber && <small className="cell-sub">{row.modelNumber}</small>}</td>
                  <td>{row.manufacturer?.name ?? '—'}</td>
                  <td>{row.category?.name ?? '—'}</td>
                  <td>{row._count?.assets ?? 0}</td>
                  <td><span className={`status ${row.status === 'ACTIVE' ? 'blue' : 'red'}`}><i/>{statusLabel(row.status)}</span></td>
                  <td>
                    <button className="btn link" disabled={busy}
                      onClick={() => void act('Đã cập nhật model.', () => updateModel(row.id, { status: toggleStatus(row.status) }))}>
                      {row.status === 'ACTIVE' ? 'Ngừng dùng' : 'Dùng lại'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!models.loading && !(models.data ?? []).length && <div className="empty"><h3>Chưa có model nào</h3></div>}
      </section>
    )}

    {tab === 'categories' && !categories.error && (
      <section className="card">
        <form className="inline-form" onSubmit={event => {
          event.preventDefault()
          if (!categoryForm.code.trim() || !categoryForm.name.trim()) return
          void act('Đã thêm nhóm tài sản.', async () => {
            await createCategory({ code: categoryForm.code.trim(), name: categoryForm.name.trim(), description: categoryForm.description.trim() || undefined })
            setCategoryForm({ code: '', name: '', description: '' })
          })
        }}>
          <label>Mã nhóm <span aria-hidden="true">*</span>
            <input value={categoryForm.code} onChange={event => setCategoryForm({ ...categoryForm, code: event.target.value })} placeholder="LAPTOP" required/>
          </label>
          <label>Tên nhóm <span aria-hidden="true">*</span>
            <input value={categoryForm.name} onChange={event => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="Máy tính xách tay" required/>
          </label>
          <label>Mô tả
            <input value={categoryForm.description} onChange={event => setCategoryForm({ ...categoryForm, description: event.target.value })} placeholder="Tuỳ chọn"/>
          </label>
          <button type="submit" className="btn primary" disabled={busy}><Plus size={16}/>Thêm nhóm</button>
        </form>
        <div className="table-scroll" aria-busy={categories.loading}>
          <table>
            <thead><tr><th>MÃ</th><th>TÊN NHÓM</th><th>TÀI SẢN</th><th>MODEL</th><th>TRẠNG THÁI</th><th></th></tr></thead>
            <tbody>
              {(categories.data ?? []).map((row: AssetCategory) => (
                <tr key={row.id}>
                  <td><b className="table-code">{row.code}</b></td>
                  <td><b className="cell-main">{row.name}</b>{row.description && <small className="cell-sub">{row.description}</small>}</td>
                  <td>{row._count?.assets ?? 0}</td>
                  <td>{row._count?.models ?? 0}</td>
                  <td><span className={`status ${row.status === 'ACTIVE' ? 'blue' : 'red'}`}><i/>{statusLabel(row.status)}</span></td>
                  <td>
                    <button className="btn link" disabled={busy}
                      onClick={() => void act('Đã cập nhật nhóm tài sản.', () => updateCategory(row.id, { status: toggleStatus(row.status) }))}>
                      {row.status === 'ACTIVE' ? 'Ngừng dùng' : 'Dùng lại'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!categories.loading && !(categories.data ?? []).length && <div className="empty"><h3>Chưa có nhóm tài sản nào</h3></div>}
      </section>
    )}
  </main>
}
