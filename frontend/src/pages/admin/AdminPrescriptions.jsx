import AdminResourceList from './AdminResourceList'
import { getAdminPrescriptions } from '../../services/adminService'
import common from './adminCommon.module.css'

export default function AdminPrescriptions() {
  return (
    <AdminResourceList
      title="Prescriptions"
      subtitle="Read-only clinical and pharmacy inspection."
      load={getAdminPrescriptions}
      filters={[{
        name: 'pharmacy_status',
        allLabel: 'All pharmacy states',
        options: ['waiting', 'assigned', 'preparing', 'ready', 'completed']
          .map(value => ({ value, label: value })),
      }]}
      renderCard={row => (
        <article className={common.card} key={row.id}>
          <span className={common.badge}>{row.pharmacy_status}</span>
          <h2>{row.patient_name}</h2>
          <p>Dr. {row.doctor_name}</p>
          <div className={common.meta}>
            <div><span>Diagnosis</span><strong>{row.diagnosis || 'Not provided'}</strong></div>
            <div><span>Items</span><strong>{row.items?.length || 0}</strong></div>
            <div><span>Sent to pharmacy</span><strong>{row.sent_to_pharmacy ? 'Yes' : 'No'}</strong></div>
          </div>
        </article>
      )}
    />
  )
}
