import { useEffect, useState } from 'react'
import AdminPage from '../../components/admin/AdminPage'
import {
  cancelAdminOrder,
  getAdminOrders,
  getAdminUsers,
  releaseOrderShipper,
  assignOrderShipper,
} from '../../services/adminService'
import common from './adminCommon.module.css'

const normalize = data => Array.isArray(data) ? data : data?.results || []

export default function AdminOrders() {
  const [rows, setRows] = useState([])
  const [shippers, setShippers] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function load() {
    try {
      const [orderData, shipperData] = await Promise.all([
        getAdminOrders({ search: search || undefined, status: status || undefined }),
        getAdminUsers({ role: 'shipper', active: 'true' }),
      ])
      setRows(normalize(orderData))
      setShippers(normalize(shipperData))
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load orders.')
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(load, 250)
    return () => window.clearTimeout(timeout)
  }, [search, status])

  return (
    <AdminPage>
      <header className={common.header}>
        <div>
          <span>Admin portal</span>
          <h1>Medicine orders</h1>
          <p>Inspect delivery operations and manage pre-pickup shipper assignment.</p>
        </div>
      </header>

      {error && <div className={common.error}>{error}</div>}

      <section className={common.toolbar}>
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search recipient, phone, or tracking ID" />
        <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'dispatched', 'delivering', 'delivered', 'delivery_failed', 'returning', 'returned', 'cancelled'].map(item => (
            <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>
          ))}
        </select>
        <button className={common.primary} onClick={load}>Refresh</button>
      </section>

      <section className={common.grid}>
        {rows.map(row => (
          <article className={common.card} key={row.medicine_order_id}>
            <span className={common.badge}>{row.status}</span>
            <h2>{row.delivery_recipient_name}</h2>
            <p>{row.delivery_address}</p>
            <div className={common.meta}>
              <div><span>Total</span><strong>{Number(row.total_amount).toLocaleString('vi-VN')} VND</strong></div>
              <div><span>Shipper</span><strong>{row.assigned_shipper_name || 'Unassigned'}</strong></div>
              <div><span>GHTK</span><strong>{row.ghtk_status_text || 'Not available'}</strong></div>
            </div>
            <div className={common.actions}>
              {['pending', 'confirmed', 'preparing'].includes(row.status) && (
                <button className={common.danger} onClick={async () => {
                  await cancelAdminOrder(row.medicine_order_id)
                  await load()
                }}>Cancel order</button>
              )}
              {row.status === 'ready_for_pickup' && row.assigned_shipper_id && (
                <button className={common.secondary} onClick={async () => {
                  await releaseOrderShipper(row.medicine_order_id)
                  await load()
                }}>Release shipper</button>
              )}
              {row.status === 'ready_for_pickup' && (
                <select
                  defaultValue=""
                  onChange={async event => {
                    if (!event.target.value) return
                    await assignOrderShipper(row.medicine_order_id, event.target.value)
                    await load()
                  }}
                >
                  <option value="">Assign shipper</option>
                  {shippers.map(shipper => (
                    <option key={shipper.user_id} value={shipper.user_id}>{shipper.full_name}</option>
                  ))}
                </select>
              )}
            </div>
          </article>
        ))}
      </section>
    </AdminPage>
  )
}
