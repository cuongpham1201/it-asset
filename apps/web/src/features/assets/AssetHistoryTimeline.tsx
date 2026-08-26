import { ArrowRight, History, RefreshCw, Wrench } from 'lucide-react'
import { listAssetHistory, type AssetHistoryEntry, type HistoryPersonRef } from '../../api/assets'
import { useServerQuery } from '../../hooks/useServerQuery'

const ACTION_LABEL: Record<AssetHistoryEntry['action'], string> = {
  CREATED: 'Nhập kho', UPDATED: 'Cập nhật thông tin', ASSIGNED: 'Cấp phát',
  RETURNED: 'Thu hồi', TRANSFERRED: 'Điều chuyển', MAINTENANCE: 'Bảo trì',
  INVENTORIED: 'Kiểm kê', DISPOSED: 'Thanh lý',
}

const ACTION_TONE: Record<AssetHistoryEntry['action'], string> = {
  CREATED: 'green', UPDATED: 'blue', ASSIGNED: 'purple', RETURNED: 'orange',
  TRANSFERRED: 'blue', MAINTENANCE: 'amber', INVENTORIED: 'blue', DISPOSED: 'red',
}

const REFERENCE_LABEL: Record<string, string> = {
  AssetAssignment: 'Phiếu cấp phát', AssetReturn: 'Phiếu thu hồi',
  AssetTransfer: 'Phiếu điều chuyển', MaintenanceRecord: 'Phiếu bảo trì',
  AssetImportBatch: 'Lô import', InventorySession: 'Đợt kiểm kê',
}

const personName = (person?: HistoryPersonRef | null) =>
  person ? `${person.fullName}${person.employeeCode ? ` (${person.employeeCode})` : ''}` : undefined

/**
 * An asset's own timeline: what happened to this thing, who carried it out, and — crucially —
 * who was holding it before and after. Custody is read from the structured custodian fields,
 * so it works for the majority of holders who have no system account.
 */
export function AssetHistoryTimeline({ assetApiId, language }: { assetApiId?: string; language: string }) {
  const history = useServerQuery(
    signal => (assetApiId ? listAssetHistory(assetApiId, signal) : Promise.resolve({ data: [] })),
    [assetApiId],
  )

  const entries = history.data?.data ?? []

  if (history.error) return <div className="empty error-state" role="alert">
    <h3>Không tải được lịch sử tài sản</h3>
    <p>{history.error}</p>
    <button className="btn secondary" onClick={history.retry}><RefreshCw size={16}/>Thử lại</button>
  </div>

  if (history.loading && !entries.length) return <div className="empty"><h3>Đang tải lịch sử…</h3></div>
  if (!entries.length) return <div className="empty"><History size={28}/><h3>Chưa có giao dịch</h3></div>

  return <div className="detail-history asset-timeline" aria-busy={history.loading}>
    {entries.map(entry => {
      const before = personName(entry.fromCustodian)
      const after = personName(entry.toCustodian)
      const unchanged = Boolean(before && after && entry.fromCustodian?.id === entry.toCustodian?.id)
      return <div key={entry.id}>
        <span className={`transaction-icon ${ACTION_TONE[entry.action] ?? 'blue'}`}>
          {entry.action === 'MAINTENANCE' ? <Wrench size={16}/> : <History size={16}/>}
        </span>
        <div>
          <b>{ACTION_LABEL[entry.action] ?? entry.action}</b>
          <p>{entry.description}</p>

          {(before || after) && (
            <p className="timeline-custody">
              {unchanged
                ? <>Người giữ: <b>{after}</b> <em>(không đổi)</em></>
                : <>
                  <span>Người giữ trước: <b>{before ?? '—'}</b></span>
                  <ArrowRight size={12}/>
                  <span>Người giữ sau: <b>{after ?? '—'}</b></span>
                </>}
            </p>
          )}

          {(entry.fromLocation || entry.toLocation) && (
            <p className="timeline-place">
              {entry.fromLocation?.name ?? 'Hệ thống'} <ArrowRight size={11}/> {entry.toLocation?.name ?? '—'}
            </p>
          )}

          <small className="timeline-meta">
            Thực hiện bởi <b>{entry.actor?.fullName ?? 'Hệ thống'}</b>
            {entry.referenceType && <> · {REFERENCE_LABEL[entry.referenceType] ?? entry.referenceType}</>}
          </small>
        </div>
        <time>{new Date(entry.createdAt).toLocaleString(language || 'vi-VN')}</time>
      </div>
    })}
  </div>
}
