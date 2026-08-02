import AdminResourceList from './AdminResourceList'
import { getAdminPayments } from '../../services/adminService'
import common from './adminCommon.module.css'

export default function AdminPayments() {
  return (
    <AdminResourceList
      title="Payments"
      subtitle="Read-only financial history and transaction inspection."
      load={getAdminPayments}
      filters={[
        {
          name: 'method',
          allLabel: 'All methods',
          options: ['vnpay', 'paypal', 'cash', 'other'].map(value => ({ value, label: value })),
        },
        {
          name: 'status',
          allLabel: 'All statuses',
          options: ['pending', 'success', 'failed', 'cancelled', 'expired', 'refunded'].map(value => ({ value, label: value })),
        },
      ]}
      renderCard={row => (
        <article className={common.card} key={row.payment_id}>
          <span className={common.badge}>{row.status}</span>
          <h2>{row.method.toUpperCase()}</h2>
          <p>{row.transaction_id || 'No transaction ID'}</p>
          <div className={common.meta}>
            <div><span>Amount</span><strong>{Number(row.amount).toLocaleString('vi-VN')} {row.currency}</strong></div>
            <div><span>Reference</span><strong>{row.reference_type}</strong></div>
            <div><span>Stage</span><strong>{row.payment_stage}</strong></div>
          </div>
        </article>
      )}
    />
  )
}
