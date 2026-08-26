import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, ScrollText, Search, X } from 'lucide-react'
import {
  AUDIT_PAGE_SIZE, auditActionLabel, auditActionTone, auditEntityLabel, getAuditFilters,
  listAuditLogs, type AuditLogEntry, type AuditQuery,
} from '../../api/audit'
import { useDebounced, useServerQuery } from '../../hooks/useServerQuery'

const PAGE_SIZE_OPTIONS = [25, 50, 100]

const formatTime = (value: string, language: string) => new Date(value).toLocaleString(language || 'vi-VN')

/** Renders a stored audit payload as readable rows rather than raw JSON. */
function ValueTable({ title, values }: { title: string; values: unknown }) {
  if (values === null || values === undefined) return <div className="audit-values empty"><h4>{title}</h4><p>Không có dữ liệu</p></div>
  if (typeof values !== 'object') return <div className="audit-values"><h4>{title}</h4><p>{String(values)}</p></div>
  const entries = Object.entries(values as Record<string, unknown>)
  if (!entries.length) return <div className="audit-values empty"><h4>{title}</h4><p>Không có dữ liệu</p></div>
  return <div className="audit-values">
    <h4>{title}</h4>
    <dl>
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{value === null || value === undefined ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
        </div>
      ))}
    </dl>
  </div>
}

function AuditDetail({ entry, language, onClose }: { entry: AuditLogEntry; language: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <div className="modal audit-detail-modal" role="dialog" aria-modal="true" aria-label="Chi tiết nhật ký">
      <div className="modal-head">
        <div>
          <h2>{auditActionLabel(entry.action)}</h2>
          <p>{auditEntityLabel(entry.entityType)}{entry.entityId ? ` · ${entry.entityId}` : ''}</p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng"><X size={20}/></button>
      </div>
      <div className="audit-detail-body">
        <dl className="audit-meta">
          <div><dt>Thời gian</dt><dd>{formatTime(entry.createdAt, language)}</dd></div>
          <div><dt>Người thực hiện</dt><dd>{entry.actor ? `${entry.actor.fullName ?? entry.actor.username ?? entry.actor.id}${entry.actor.username ? ` (${entry.actor.username})` : ''}` : 'Hệ thống'}</dd></div>
          <div><dt>Mã hành động</dt><dd className="mono">{entry.action}</dd></div>
          <div><dt>Đối tượng</dt><dd>{auditEntityLabel(entry.entityType)}</dd></div>
          {entry.entityId && <div><dt>Mã đối tượng</dt><dd className="mono">{entry.entityId}</dd></div>}
          {entry.ipAddress && <div><dt>Địa chỉ IP</dt><dd className="mono">{entry.ipAddress}</dd></div>}
          {entry.userAgent && <div><dt>Trình duyệt</dt><dd className="wrap">{entry.userAgent}</dd></div>}
        </dl>
        <div className="audit-diff">
          <ValueTable title="Trước" values={entry.oldValues}/>
          <ValueTable title="Sau" values={entry.newValues}/>
        </div>
      </div>
    </div>
  </div>
}

/**
 * "Nhật ký hệ thống" — who did what to the system. This is deliberately separate from an
 * asset's own timeline: that answers what happened to a thing, this answers who acted.
 */
export function AuditLogScreen({ language }: { language: string }) {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [userId, setUserId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [limit, setLimit] = useState(AUDIT_PAGE_SIZE)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AuditLogEntry | undefined>()

  const debouncedSearch = useDebounced(search, 350)
  useEffect(() => { setPage(1) }, [debouncedSearch, action, entityType, userId, from, to, limit])

  const query = useMemo<AuditQuery>(() => ({
    page, limit, search: debouncedSearch, action, entityType, userId, from, to,
  }), [page, limit, debouncedSearch, action, entityType, userId, from, to])

  const logs = useServerQuery(signal => listAuditLogs(query, signal), [JSON.stringify(query)])
  const filters = useServerQuery(signal => getAuditFilters(signal), [])

  const rows = logs.data?.data ?? []
  const meta = logs.data?.meta
  const total = meta?.total ?? 0
  const totalPages = Math.max(1, meta?.totalPages ?? 1)
  const filtersActive = Boolean(debouncedSearch || action || entityType || userId || from || to)
  const clearFilters = () => { setSearch(''); setAction(''); setEntityType(''); setUserId(''); setFrom(''); setTo('') }

  return <main className="page audit-page">
    <section className="page-heading">
      <div>
        <h1>Nhật ký hệ thống</h1>
        <p>Ai đã thao tác gì trên hệ thống. Lịch sử nghiệp vụ của từng tài sản nằm ở màn chi tiết tài sản.</p>
      </div>
      <div className="heading-actions">
        <button className="btn secondary" onClick={logs.retry} disabled={logs.loading}><RefreshCw size={16}/>Tải lại</button>
      </div>
    </section>

    <section className="card">
      <div className="enterprise-filters audit-filters">
        <label><Search size={15}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm theo hành động, đối tượng, mã đối tượng"/></label>
        <select value={action} onChange={event => setAction(event.target.value)} aria-label="Lọc theo hành động">
          <option value="">Hành động: Tất cả</option>
          {(filters.data?.actions ?? []).map(item => <option key={item.value} value={item.value}>{auditActionLabel(item.value)} ({item.count})</option>)}
        </select>
        <select value={entityType} onChange={event => setEntityType(event.target.value)} aria-label="Lọc theo đối tượng">
          <option value="">Đối tượng: Tất cả</option>
          {(filters.data?.entityTypes ?? []).map(item => <option key={item.value} value={item.value}>{auditEntityLabel(item.value)} ({item.count})</option>)}
        </select>
        <select value={userId} onChange={event => setUserId(event.target.value)} aria-label="Lọc theo người thực hiện">
          <option value="">Người thực hiện: Tất cả</option>
          {(filters.data?.actors ?? []).map(item => <option key={item.id} value={item.id}>{item.fullName} ({item.username})</option>)}
        </select>
        <label className="date-filter">Từ<input type="date" value={from} onChange={event => setFrom(event.target.value)}/></label>
        <label className="date-filter">Đến<input type="date" value={to} onChange={event => setTo(event.target.value)}/></label>
        {filtersActive && <button className="btn link" onClick={clearFilters}>Xóa bộ lọc</button>}
      </div>

      {logs.error ? (
        <div className="empty error-state" role="alert">
          <h3>Không tải được nhật ký hệ thống</h3>
          <p>{logs.error}</p>
          <button className="btn secondary" onClick={logs.retry}><RefreshCw size={16}/>Thử lại</button>
        </div>
      ) : (
        <div className="table-scroll" aria-busy={logs.loading}>
          <table className="audit-table">
            <thead><tr><th>THỜI GIAN</th><th>NGƯỜI THỰC HIỆN</th><th>HÀNH ĐỘNG</th><th>ĐỐI TƯỢNG</th><th>MÃ ĐỐI TƯỢNG</th><th></th></tr></thead>
            <tbody>
              {rows.map(entry => (
                <tr key={entry.id} onDoubleClick={() => setSelected(entry)}>
                  <td className="mono">{formatTime(entry.createdAt, language)}</td>
                  <td>{entry.actor ? <><b className="cell-main">{entry.actor.fullName ?? entry.actor.username}</b>{entry.actor.username && <small className="cell-sub">{entry.actor.username}</small>}</> : <span className="muted">Hệ thống</span>}</td>
                  <td><span className={`status ${auditActionTone(entry.action)}`}><i/>{auditActionLabel(entry.action)}</span></td>
                  <td>{auditEntityLabel(entry.entityType)}</td>
                  <td className="mono truncate">{entry.entityId ?? '—'}</td>
                  <td><button className="btn link" onClick={() => setSelected(entry)}>Chi tiết</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!logs.error && logs.loading && !rows.length && <div className="empty"><h3>Đang tải nhật ký…</h3></div>}
      {!logs.error && !logs.loading && !rows.length && (
        <div className="empty">
          <ScrollText size={30}/>
          <h3>Không có bản ghi nào</h3>
          <p>{filtersActive ? 'Thử nới bộ lọc hoặc khoảng thời gian.' : 'Hệ thống chưa ghi nhận thao tác nào.'}</p>
        </div>
      )}

      <div className="pagination">
        <span>
          {total === 0 ? 'Không có bản ghi' : <>Hiển thị <b>{(page - 1) * limit + (rows.length ? 1 : 0)}–{(page - 1) * limit + rows.length}</b> trên <b>{total}</b> bản ghi</>}
          <label className="page-size">
            <select value={limit} onChange={event => setLimit(Number(event.target.value))}>
              {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size} / trang</option>)}
            </select>
          </label>
        </span>
        <div>
          <button disabled={logs.loading || page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))} title="Trang trước"><ChevronLeft size={16}/></button>
          <button className="active">{page}</button>
          <button disabled={logs.loading || page >= totalPages} onClick={() => setPage(current => Math.min(totalPages, current + 1))} title="Trang sau"><ChevronRight size={16}/></button>
        </div>
      </div>
    </section>

    {selected && <AuditDetail entry={selected} language={language} onClose={() => setSelected(undefined)}/>}
  </main>
}
