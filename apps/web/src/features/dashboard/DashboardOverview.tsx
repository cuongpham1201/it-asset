import { AlertTriangle, ArrowUpRight, Box, CalendarDays, CircleDollarSign, PackageCheck, Plus, RefreshCw, RotateCcw, UserRound, Wrench } from 'lucide-react'
import type { Asset, AssetTransaction } from '../../types'
import type { AssetSummary } from '../../api/assets'

export type DashboardView = 'all' | 'inUse' | 'stock' | 'attention' | 'overdue'

const COLORS = ['#315fe5', '#31ad6d', '#f1aa1f', '#8953d7', '#e65a43', '#25a6bd']

/** Statuses the KPI tiles map onto, so a tile click becomes a real server-side filter. */
export const DASHBOARD_VIEW_FILTER: Record<DashboardView, { status?: string; lifecycle?: 'assigned' | 'in_stock' | 'due' | 'overdue' }> = {
  all: {},
  inUse: { lifecycle: 'assigned' },
  stock: { lifecycle: 'in_stock' },
  attention: { status: 'MAINTENANCE' },
  overdue: { lifecycle: 'overdue' },
}

export interface DashboardDrilldown {
  rows: Asset[]
  total: number
  loading: boolean
  error?: string
  retry: () => void
}

interface DashboardOverviewProps {
  summary: AssetSummary | undefined
  summaryLoading: boolean
  summaryError?: string
  onSummaryRetry: () => void
  drilldown: DashboardDrilldown
  transactions: AssetTransaction[]
  activeView: DashboardView
  activeCategoryId: string
  activeCategoryLabel: string
  onSelectView: (view: DashboardView) => void
  onSelectCategory: (categoryId: string, label: string) => void
  goAssets: () => void
  goPage: (page: string) => void
  onView: (asset: Asset) => void
  language: string
  userName: string
  compactMoney: (value: number) => string
  uiLabel: (value: string, language: string) => string
  localizedDefault: (value: string, language: string) => string
}

/**
 * Overview screen fed entirely by server aggregates. It never holds the asset table in memory:
 * the KPI numbers come from /assets/summary and the drill-down table is one page of /assets.
 */
export function DashboardOverview(props: DashboardOverviewProps) {
  const { summary, drilldown, language, uiLabel, compactMoney, localizedDefault } = props
  const english = language === 'en-US'
  const total = summary?.total ?? 0

  const metrics: Array<{ key: DashboardView; label: string; value: number; Icon: typeof Box; tone: string }> = [
    { key: 'all', label: english ? 'Total assets' : 'Tổng tài sản', value: total, Icon: Box, tone: 'blue' },
    { key: 'inUse', label: english ? 'In use' : 'Đang sử dụng', value: summary?.assigned ?? 0, Icon: UserRound, tone: 'green' },
    { key: 'attention', label: english ? 'Maintenance / Broken' : 'Bảo trì / Hỏng', value: summary?.attention ?? 0, Icon: Wrench, tone: 'amber' },
    { key: 'overdue', label: english ? 'Overdue returns' : 'Quá hạn trả', value: summary?.due ?? 0, Icon: AlertTriangle, tone: 'red' },
  ]

  const categoryCounts = summary?.byCategory ?? []
  const statusCounts = summary?.byStatus ?? []
  const locationCounts = (summary?.byLocation ?? []).slice(0, 5)

  const gradient = (rows: Array<{ count: number }>, palette: (index: number) => string) => {
    const sum = rows.reduce((carry, row) => carry + row.count, 0)
    if (!sum) return '#e8edf3'
    let cursor = 0
    return `conic-gradient(${rows.map((row, index) => {
      const start = cursor
      cursor += (row.count / sum) * 100
      return `${palette(index)} ${start}% ${cursor}%`
    }).join(',')})`
  }

  const statusColor = (code: string) =>
    code === 'IN_USE' || code === 'ON_LOAN' ? '#31ad6d' : code === 'READY' ? '#2f86e8' : code === 'MAINTENANCE' ? '#f1aa1f' : code === 'BROKEN' || code === 'LOST' ? '#e65a43' : '#718096'

  const statusView = (code: string): DashboardView =>
    code === 'IN_USE' || code === 'ON_LOAN' ? 'inUse' : code === 'READY' ? 'stock' : code === 'MAINTENANCE' ? 'attention' : 'all'

  const percent = (count: number) => (total ? Math.round((count / total) * 100) : 0)

  const recentTransactions = [...props.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)

  const selectedLabel = props.activeCategoryId
    ? `${english ? 'Asset category' : 'Loại tài sản'}: ${props.activeCategoryLabel}`
    : metrics.find(item => item.key === props.activeView)?.label || (english ? 'Asset list' : 'Danh sách tài sản')

  const displayStatus = (asset: Asset) =>
    uiLabel(asset.dueDate && new Date(asset.dueDate) < new Date() ? 'Quá hạn' : asset.assignmentType === 'Cho mượn' ? 'Cho mượn' : asset.status, language)
  const rowStatusClass = (asset: Asset) =>
    asset.dueDate && new Date(asset.dueDate) < new Date() ? 'broken'
      : asset.status === 'Đang sử dụng' ? 'using'
        : asset.status === 'Sẵn sàng' ? 'ready'
          : asset.status === 'Bảo trì' ? 'maintenance' : 'broken'

  return <main className="page enterprise-dashboard">
    <section className="page-heading dashboard-heading">
      <div>
        <h1>{english ? 'Dashboard' : 'Tổng quan tài sản'}</h1>
        <p>{english
          ? `Welcome back, ${localizedDefault(props.userName, language)}. Here is what is happening with your assets today.`
          : `Chào mừng ${props.userName}. Đây là tình hình tài sản và các công việc cần chú ý hôm nay.`}</p>
      </div>
      <div className="heading-actions">
        <span className="btn secondary dashboard-date"><CalendarDays size={16}/>{new Date().toLocaleDateString(language)}</span>
      </div>
    </section>

    {props.summaryError && (
      <div className="empty error-state" role="alert">
        <h3>{english ? 'Could not load dashboard figures' : 'Không tải được số liệu tổng quan'}</h3>
        <p>{props.summaryError}</p>
        <button className="btn secondary" onClick={props.onSummaryRetry}><RefreshCw size={16}/>{english ? 'Retry' : 'Thử lại'}</button>
      </div>
    )}

    {!props.summaryError && (
      <section className="ops-summary dashboard-kpis" aria-label="Bộ lọc nhanh tài sản" aria-busy={props.summaryLoading}>
        {metrics.map(({ key, label, value, Icon, tone }) => (
          <button type="button" className={`${props.activeView === key && !props.activeCategoryId ? 'active ' : ''}${tone}`} onClick={() => props.onSelectView(key)} key={key}>
            <span className="kpi-copy">
              <small>{label}</small>
              <b>{props.summaryLoading && !summary ? '…' : value}</b>
              <em>{key === 'inUse' ? `${percent(summary?.assigned ?? 0)}% ${english ? 'of total assets' : 'tổng tài sản'}`
                : key === 'attention' ? (english ? 'Requires review' : 'Cần kiểm tra xử lý')
                  : key === 'overdue' ? (english ? 'Immediate attention' : 'Cần xử lý ngay')
                    : (english ? 'Asset records' : 'Hồ sơ tài sản')}</em>
            </span>
            <span className="kpi-icon"><Icon size={22}/></span>
          </button>
        ))}
        <div className="dashboard-value-kpi">
          <span className="kpi-copy">
            <small>{english ? 'Total value' : 'Tổng nguyên giá'}</small>
            <b>{compactMoney(summary?.totalValue ?? 0)}</b>
            <em>{english ? 'Asset book value' : 'Giá trị theo sổ tài sản'}</em>
          </span>
          <span className="kpi-icon"><CircleDollarSign size={22}/></span>
        </div>
      </section>
    )}

    <section className="dashboard-reference-grid">
      <div className="dashboard-overview-summary">
        <article className="dashboard-reference-card location-overview">
          <header><h2>{english ? 'Top locations' : 'Vị trí có nhiều tài sản'}</h2></header>
          <div>
            {locationCounts.map((item, index) => (
              <div key={item.id ?? item.label}>
                <span title={item.label}>{item.label}</span>
                <i><u style={{ width: `${percent(item.count)}%`, background: COLORS[index % COLORS.length] }}/></i>
                <b>{item.count}</b><small>{percent(item.count)}%</small>
              </div>
            ))}
            {!locationCounts.length && <p className="dashboard-empty-note">{english ? 'No data yet.' : 'Chưa có dữ liệu.'}</p>}
          </div>
        </article>

        <article className="dashboard-reference-card category-overview">
          <header><h2>{english ? 'Assets by category' : 'Tài sản theo nhóm'}</h2><button onClick={props.goAssets}>{english ? 'View report' : 'Xem danh sách'}</button></header>
          <div className="dashboard-donut-layout">
            <button className="dashboard-donut" style={{ background: gradient(categoryCounts, index => COLORS[index % COLORS.length]) }} onClick={() => props.onSelectView('all')}>
              <span><b>{total}</b><small>{english ? 'Total' : 'Tổng'}</small></span>
            </button>
            <div className="dashboard-legend">
              {categoryCounts.map((item, index) => (
                <button onClick={() => item.id && props.onSelectCategory(item.id, item.label)} key={item.id ?? item.label}>
                  <i style={{ background: COLORS[index % COLORS.length] }}/>
                  <span>{item.label}</span><b>{item.count}</b><small>{percent(item.count)}%</small>
                </button>
              ))}
            </div>
          </div>
        </article>

        <article className="dashboard-reference-card status-overview">
          <header><h2>{english ? 'Assets by status' : 'Tài sản theo trạng thái'}</h2><button onClick={props.goAssets}>{english ? 'View all' : 'Xem tất cả'}</button></header>
          <div className="dashboard-donut-layout">
            <div className="dashboard-donut" style={{ background: gradient(statusCounts, index => statusColor(statusCounts[index].code)) }}>
              <span><b>{total}</b><small>{english ? 'Total' : 'Tổng'}</small></span>
            </div>
            <div className="dashboard-legend">
              {statusCounts.map(item => (
                <button onClick={() => props.onSelectView(statusView(item.code))} key={item.code}>
                  <i style={{ background: statusColor(item.code) }}/>
                  <span>{item.label}</span><b>{item.count}</b><small>{percent(item.count)}%</small>
                </button>
              ))}
            </div>
          </div>
        </article>
      </div>

      <article className="dashboard-reference-card recent-overview">
        <header><h2>{english ? 'Recent activity' : 'Hoạt động gần đây'}</h2><button onClick={() => props.goPage('Lịch sử / Audit')}>{english ? 'View all' : 'Xem tất cả'}</button></header>
        <div className="recent-dashboard-list">
          {recentTransactions.map(transaction => (
            <div className="recent-dashboard-row" key={transaction.id}>
              <span className={`recent-icon ${transaction.type.toLowerCase().replace(' ', '-')}`}>
                {transaction.type === 'Thu hồi' ? <RotateCcw size={16}/> : transaction.type === 'Điều chuyển' ? <ArrowUpRight size={16}/> : transaction.type === 'Nhập kho' ? <Plus size={16}/> : <PackageCheck size={16}/>}
              </span>
              <div><b>{transaction.assetName}</b><small>{transaction.type} · {transaction.performedBy}</small></div>
              <time>{new Date(transaction.date).toLocaleDateString(language)}</time>
            </div>
          ))}
          {!recentTransactions.length && <p className="dashboard-empty-note">{english ? 'No activity recorded yet.' : 'Chưa có hoạt động được ghi nhận.'}</p>}
        </div>
      </article>
    </section>

    <section className="dashboard-operations">
      <div className="enterprise-panel">
        <div className="panel-heading">
          <div><h2>{selectedLabel}</h2><span>{drilldown.total} {english ? 'records' : 'bản ghi'}</span></div>
          {(props.activeView !== 'attention' || props.activeCategoryId) && (
            <button className="text-link" onClick={() => props.onSelectView('attention')}>{english ? 'Needs attention' : 'Xem cần xử lý'}</button>
          )}
        </div>

        {drilldown.error ? (
          <div className="enterprise-empty error-state" role="alert">
            <p>{drilldown.error}</p>
            <button className="btn secondary" onClick={drilldown.retry}><RefreshCw size={16}/>{english ? 'Retry' : 'Thử lại'}</button>
          </div>
        ) : (
          <div className="table-scroll" aria-busy={drilldown.loading}>
            <table className="dashboard-asset-table">
              <thead><tr>
                <th>{english ? 'ASSET CODE' : 'MÃ TÀI SẢN'}</th><th>{english ? 'ASSET NAME' : 'TÊN TÀI SẢN'}</th>
                <th>{english ? 'CATEGORY' : 'LOẠI'}</th><th>{english ? 'DEPARTMENT' : 'ĐƠN VỊ'}</th>
                <th>{english ? 'ASSIGNED USER' : 'NGƯỜI SỬ DỤNG'}</th><th>{english ? 'STATUS' : 'TRẠNG THÁI'}</th>
                <th>{english ? 'DUE DATE' : 'HẠN TRẢ'}</th>
              </tr></thead>
              <tbody>
                {drilldown.rows.map(asset => (
                  <tr key={asset.apiId ?? asset.id} onDoubleClick={() => props.onView(asset)}>
                    <td><button className="table-code" onClick={() => props.onView(asset)}>{asset.code}</button></td>
                    <td><b>{asset.name}</b></td>
                    <td>{asset.category}</td>
                    <td>{asset.department}</td>
                    <td>{asset.assignedTo}</td>
                    <td><span className={`enterprise-status ${rowStatusClass(asset)}`}>{displayStatus(asset)}</span></td>
                    <td>{asset.dueDate ? new Date(asset.dueDate).toLocaleDateString(language) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!drilldown.error && !drilldown.loading && !drilldown.rows.length && (
          <div className="enterprise-empty">{english ? 'No assets match the selected condition.' : 'Không có tài sản phù hợp với điều kiện đã chọn.'}</div>
        )}
        {!drilldown.error && drilldown.total > drilldown.rows.length && (
          <div className="panel-list-footer">
            <span>{english ? 'Showing' : 'Hiển thị'} {drilldown.rows.length}/{drilldown.total} {english ? 'records' : 'bản ghi'}</span>
            <button className="text-link" onClick={props.goAssets}>{english ? 'Open asset register' : 'Mở sổ tài sản'}</button>
          </div>
        )}
      </div>

      <div className="enterprise-panel">
        <div className="panel-heading">
          <h2>{english ? 'Assets by category' : 'Tài sản theo loại'}</h2>
          <button className="text-link" onClick={() => props.onSelectView('all')}>{english ? 'All' : 'Tất cả'} ({total})</button>
        </div>
        <div className="type-count-list">
          {categoryCounts.map(item => (
            <button type="button" className={props.activeCategoryId === item.id ? 'active' : ''} onClick={() => item.id && props.onSelectCategory(item.id, item.label)} key={item.id ?? item.label}>
              <span>{item.label}</span><b>{item.count}</b>
            </button>
          ))}
        </div>
        <div className="panel-footer">{english ? 'Total purchase cost:' : 'Tổng nguyên giá:'} <b>{compactMoney(summary?.totalValue ?? 0)}</b></div>
      </div>
    </section>
  </main>
}
