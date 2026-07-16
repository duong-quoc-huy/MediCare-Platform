import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Package } from 'lucide-react'

import { getOrderDetail } from '../../services/orderService'
import styles from './OrderDetail.module.css'

export default function OrderDetail() {
  const { orderId } = useParams()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOrder() {
      try {
        setLoading(true)
        setError('')

        const data = await getOrderDetail(orderId)
        setOrder(data)
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            'Could not load order detail.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [orderId])

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.stateCard}>
          <h1>Loading order...</h1>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className={styles.page}>
        <div className={styles.stateCard}>
          <h1>Order not found</h1>
          <p>{error}</p>
          <Link to="/payments" className={styles.primaryLink}>
            Back to payment history
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <Link to="/payments" className={styles.backLink}>
        <ArrowLeft size={18} />
        Back to payment history
      </Link>

      <div className={styles.header}>
        <div>
          <div className={styles.titleIcon}>
            <Package size={28} />
            <h1>Order Detail</h1>
          </div>

          <p>Order ID: {order.medicine_order_id}</p>
        </div>

        <span className={`${styles.badge} ${styles[order.status]}`}>
          {order.status}
        </span>
      </div>

      <section className={styles.infoCard}>
        <div>
          <span>Patient</span>
          <strong>{order.patient_name}</strong>
        </div>

        <div>
          <span>Phone</span>
          <strong>{order.patient_phone}</strong>
        </div>

        <div>
          <span>Total amount</span>
          <strong>{Number(order.total_amount).toLocaleString()} VND</strong>
        </div>

        <div>
          <span>Created at</span>
          <strong>{new Date(order.created_at).toLocaleString()}</strong>
        </div>

        <div className={styles.fullRow}>
          <span>Delivery address</span>
          <strong>{order.delivery_address}</strong>
        </div>
      </section>

      <section className={styles.itemsCard}>
        <h2>Purchased medicines</h2>

        <div className={styles.itemsList}>
          {order.items?.map(item => (
            <article
              key={item.medicine_order_item_id}
              className={styles.item}
            >
              <img
                src={item.medicine_image || '/placeholder-medicine.png'}
                alt={item.medicine_name}
              />

              <div className={styles.itemInfo}>
                <h3>{item.medicine_name}</h3>
                <p>Quantity: {item.quantity}</p>
                <p>Unit price: {Number(item.unit_price).toLocaleString()} VND</p>
              </div>

              <strong>
                {Number(item.sub_total).toLocaleString()} VND
              </strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}