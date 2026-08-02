import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Box, CheckCircle2, Clock3, MapPin, PackageCheck, Phone, RefreshCw, Truck } from 'lucide-react'
import { claimShipperOrder, getAvailableShipperOrders, getMyShipperOrders } from '../../services/orderService'
import styles from './ShipperDashboard.module.css'

const list = data => Array.isArray(data) ? data : (data?.results || [])
const money = value => `${Number(value || 0).toLocaleString('vi-VN')} VND`
const shortId = value => String(value || '').slice(0, 8).toUpperCase()
const statusLabel = value => ({ready_for_pickup:'Ready for pickup',dispatched:'Picked up',delivering:'Delivering',delivered:'Delivered',delivery_failed:'Delivery failed',returning:'Returning',returned:'Returned',cancelled:'Cancelled'}[value] || value)

export default function ShipperDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('available')
  const [available, setAvailable] = useState([])
  const [mine, setMine] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [claiming, setClaiming] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(async (refresh=false) => {
    try { refresh ? setRefreshing(true) : setLoading(true); setError('')
      const [a,m,h] = await Promise.all([getAvailableShipperOrders(),getMyShipperOrders('active'),getMyShipperOrders('history')])
      setAvailable(list(a)); setMine([...list(m), ...list(h)])
    } catch (e) { setError(e.response?.data?.detail || 'Could not load delivery orders.') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])
  useEffect(() => { load() }, [load])
  const active = useMemo(() => mine.filter(o => ['ready_for_pickup','dispatched','delivering','delivery_failed','returning'].includes(o.status)), [mine])
  const history = useMemo(() => mine.filter(o => ['delivered','returned','cancelled'].includes(o.status)), [mine])
  const shown = tab==='available' ? available : tab==='mine' ? active : history
  async function claim(id) {
    try { setClaiming(id); setError(''); const order=await claimShipperOrder(id); setAvailable(v=>v.filter(o=>o.medicine_order_id!==id)); setMine(v=>[order,...v.filter(o=>o.medicine_order_id!==id)]); navigate(`/shipper/orders/${id}`) }
    catch(e){ setError(e.response?.data?.detail || 'Could not claim this delivery.'); if(e.response?.status===409) await load(true) } finally { setClaiming('') }
  }
  return <main className={styles.page}>
    <section className={styles.hero}><div><span>Delivery workspace</span><h1>Shipper Dashboard</h1><p>Claim prepared medicine orders and update each delivery from pickup to completion.</p></div><button onClick={()=>load(true)} disabled={refreshing}><RefreshCw size={18}/>{refreshing?'Refreshing':'Refresh'}</button></section>
    {error && <div className={styles.error}>{error}</div>}
    <section className={styles.stats}><article><Box/><b>{available.length}</b><span>Available</span></article><article><Truck/><b>{active.length}</b><span>My active deliveries</span></article><article><CheckCircle2/><b>{history.length}</b><span>History</span></article></section>
    <div className={styles.tabs}>{[['available','Available',available.length],['mine','My deliveries',active.length],['history','History',history.length]].map(([key,label,count])=><button key={key} className={tab===key?styles.active:''} onClick={()=>setTab(key)}>{label}<span>{count}</span></button>)}</div>
    {loading ? <div className={styles.empty}>Loading orders...</div> : shown.length===0 ? <div className={styles.empty}><PackageCheck size={44}/><h2>No orders here</h2></div> : <section className={styles.grid}>{shown.map(order=><article key={order.medicine_order_id} className={styles.card}><div className={styles.head}><div><small>Order #{shortId(order.medicine_order_id)}</small><h2>{order.delivery_recipient_name}</h2></div><em className={styles[order.status]}>{statusLabel(order.status)}</em></div><div className={styles.info}><p><MapPin size={18}/>{order.delivery_address}</p><p><Phone size={18}/><a href={`tel:${order.delivery_phone}`}>{order.delivery_phone}</a></p><p><Clock3 size={18}/>Ready for pickup</p><p><Box size={18}/>{order.package_weight_grams} g · {money(order.total_amount)}</p></div>{order.payment_method==='cash'&&<div className={styles.cod}>COD: <b>{money(order.total_amount)}</b></div>}<div className={styles.actions}>{tab==='available'?<button onClick={()=>claim(order.medicine_order_id)} disabled={claiming===order.medicine_order_id}>{claiming===order.medicine_order_id?'Claiming...':'Claim delivery'}</button>:<Link to={`/shipper/orders/${order.medicine_order_id}`}>Open delivery</Link>}<a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`}>Open map</a></div></article>)}</section>}
  </main>
}
