import { useEffect, useMemo, useState } from 'react'
import {
  Activity, CalendarDays, CircleDollarSign,
  RefreshCw, Truck, UserCog, Users,
} from 'lucide-react'
import AdminPage from '../../components/admin/AdminPage'
import {
  getAdminDashboardSummary,
  getAdminDistributions,
  getAdminRevenue,
} from '../../services/adminService'
import styles from './AdminDashboard.module.css'

const money = value =>
  `${Number(value || 0).toLocaleString('vi-VN')} VND`

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null)
  const [revenue, setRevenue] = useState([])
  const [distribution, setDistribution] = useState({
    appointments: [], orders: [], payment_methods: [],
  })
  const [days, setDays] = useState(30)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      setLoading(true)
      setError('')
      const [a, b, c] = await Promise.all([
        getAdminDashboardSummary(),
        getAdminRevenue(days),
        getAdminDistributions(),
      ])
      setSummary(a)
      setRevenue(b.series || [])
      setDistribution(c)
    } catch (err) {
      setError(err.response?.data?.detail || 'Dashboard failed to load.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [days])

  const maxRevenue = useMemo(
    () => Math.max(1, ...revenue.map(item => Number(item.total || 0))),
    [revenue]
  )

  const cards = summary ? [
    ['Patients', summary.users.patients, Users],
    ['Medical staff', summary.users.doctors + summary.users.nurses, UserCog],
    ['Shippers', summary.users.shippers, Truck],
    ["Today's appointments", summary.appointments.today, CalendarDays],
    ['Active deliveries', summary.orders.active_deliveries, Activity],
    ['Total revenue', money(summary.revenue.total), CircleDollarSign],
  ] : []

  return (
    <AdminPage>
      <header className={styles.hero}>
        <div>
          <span>Admin portal</span>
          <h1>MediCare operations dashboard</h1>
          <p>Monitor people, clinical activity, orders, payments, and delivery performance.</p>
        </div>
        <div className={styles.controls}>
          <select value={days} onChange={event => setDays(Number(event.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={load}><RefreshCw size={18} />Refresh</button>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Loading analytics...</div>
      ) : (
        <>
          <section className={styles.kpis}>
            {cards.map(([label, value, Icon]) => (
              <article key={label}>
                <Icon size={21} />
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </section>

          <section className={styles.panels}>
            <article className={styles.widePanel}>
              <h2>Revenue trend</h2>
              <div className={styles.chart}>
                {revenue.map(item => (
                  <div key={item.date} title={`${item.date}: ${money(item.total)}`}>
                    <span
                      style={{
                        height: `${Math.max(
                          3,
                          Number(item.total || 0) / maxRevenue * 100
                        )}%`,
                      }}
                    />
                    <small>{item.date.slice(5)}</small>
                  </div>
                ))}
              </div>
            </article>

            {[
              ['Appointment statuses', distribution.appointments, 'status'],
              ['Order statuses', distribution.orders, 'status'],
              ['Payment methods', distribution.payment_methods, 'method'],
            ].map(([title, rows, key]) => (
              <article key={title} className={styles.panel}>
                <h2>{title}</h2>
                <div className={styles.list}>
                  {(rows || []).map(row => (
                    <div key={row[key]}>
                      <span>{String(row[key]).replaceAll('_', ' ')}</span>
                      <strong>{row.count}</strong>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </AdminPage>
  )
}
