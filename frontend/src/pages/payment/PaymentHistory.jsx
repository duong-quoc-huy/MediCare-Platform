import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, RefreshCcw } from 'lucide-react'

import { getPayments } from '../../services/paymentService'
import styles from './PaymentHistory.module.css'

export default function PaymentHistory() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function getPaymentReferencePath(payment) {
    if (payment.reference_type === 'medicine_order') {
      return `/orders/${payment.reference_id}`
    }

    if (payment.reference_type === 'appointment') {
      return `/booking/confirmation/${payment.reference_id}`
    }

    return '#'
  }

  async function loadPayments() {
    try {
      setLoading(true)
      setError('')

      const data = await getPayments()

      if (Array.isArray(data)) {
        setPayments(data)
      } else if (Array.isArray(data.results)) {
        setPayments(data.results)
      } else {
        setPayments([])
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Could not load payment history.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
  }, [])

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.stateCard}>
          <h1>Loading payment history...</h1>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.titleIcon}>
            <CreditCard size={28} />
            <h1>Payment History</h1>
          </div>

          <p>View your medicine order payment records.</p>
        </div>

        <button
          type="button"
          className={styles.refreshBtn}
          onClick={loadPayments}
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      {payments.length === 0 ? (
        <div className={styles.emptyCard}>
          <CreditCard size={52} />
          <h2>No payments yet</h2>
          <p>Your payment history will appear here after checkout.</p>
          <Link to="/medicine" className={styles.primaryLink}>
            Shop medicines
          </Link>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <table>
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Reference ID</th>
                <th>Payment For</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {payments.map(payment => (
                <tr key={payment.payment_id}>
                  <td>
                    <span className={styles.idText}>
                      {payment.payment_id}
                    </span>
                  </td>

                  <td>
                    <Link to={getPaymentReferencePath(payment)} state={ payment.reference_type === 'appointment' 
                      ? { fromPaymentHistory: true }
                      : undefined
                    } className={styles.idLink}>
                      <span className={styles.idText}>
                        {payment.reference_id}
                      </span>
                    </Link>
                  </td>

                  <td className={styles.productCell}>
                    {payment.purchased_items?.length > 0 ? (
                      <div className={styles.productList}>
                        {payment.purchased_items.map((item, index) => (
                          <div key={`${item.medicine_name}-${index}`}>
                            <div className={styles.productName}>
                              {item.medicine_name}
                            </div>

                            {item.item_type === 'appointment_deposit' ? (
                              <div className={styles.productQuantity}>
                                {item.appointment_date} · {String(item.start_time).slice(0, 5)} ·{' '}
                                {item.visit_type === 'home_visit' ? 'Home visit' : 'Clinic visit'}
                              </div>
                            ) : (
                              <div className={styles.productQuantity}>
                                Qty: {item.quantity} ×{' '}
                                {Number(item.unit_price).toLocaleString()} {item.currency || 'VND'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span>—</span>
                    )}
                  </td>

                  <td>{payment.method?.toUpperCase()}</td>

                  <td>
                    {Number(payment.amount).toLocaleString()} {payment.currency}
                  </td>

                  <td>
                    <span className={`${styles.badge} ${styles[payment.status]}`}>
                      {payment.status}
                    </span>
                  </td>

                  <td>
                    {new Date(payment.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}