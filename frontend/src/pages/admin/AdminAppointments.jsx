import AdminResourceList from './AdminResourceList'
import { cancelAdminAppointment, getAdminAppointments } from '../../services/adminService'
import common from './adminCommon.module.css'

export default function AdminAppointments() {
  return (
    <AdminResourceList
      title="Appointments"
      subtitle="Inspect appointments and perform controlled cancellation."
      load={getAdminAppointments}
      filters={[{
        name: 'status',
        allLabel: 'All statuses',
        options: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'missed']
          .map(value => ({ value, label: value.replaceAll('_', ' ') })),
      }]}
      renderCard={row => (
        <article className={common.card} key={row.appointment_id}>
          <span className={common.badge}>{row.status}</span>
          <h2>{row.patient_name}</h2>
          <p>Dr. {row.doctor_name} · {row.doctor_specialty}</p>
          <div className={common.meta}>
            <div><span>Date</span><strong>{row.appointment_date}</strong></div>
            <div><span>Time</span><strong>{row.start_time}</strong></div>
            <div><span>Visit</span><strong>{row.visit_type}</strong></div>
            <div><span>Fee</span><strong>{Number(row.total_fee).toLocaleString('vi-VN')} VND</strong></div>
          </div>
          {['pending', 'confirmed'].includes(row.status) && (
            <div className={common.actions}>
              <button className={common.danger} onClick={async () => {
                await cancelAdminAppointment(row.appointment_id)
                window.location.reload()
              }}>Cancel appointment</button>
            </div>
          )}
        </article>
      )}
    />
  )
}
