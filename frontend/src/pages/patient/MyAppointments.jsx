import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck2, Plus } from 'lucide-react'

import AppointmentCard from '../../components/ui/AppointmentCard'
import {
  cancelAppointment,
  getMyAppointments,
} from '../../services/appointmentService'
import styles from './MyAppointments.module.css'

const filters = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function fetchAppointments() {
    try {
      setLoading(true)
      setError('')

      const data = await getMyAppointments()
      const list = Array.isArray(data) ? data : data.results || []

      setAppointments(list)
    } catch (err) {
      console.error(err)
      setError('Could not load your appointments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [])

  const filteredAppointments = useMemo(() => {
    if (filter === 'all') return appointments

    return appointments.filter(appointment => appointment.status === filter)
  }, [appointments, filter])

  async function handleCancel(appointmentId) {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this appointment?'
    )

    if (!confirmed) return

    try {
      setActionLoadingId(appointmentId)
      setError('')
      setSuccess('')

      await cancelAppointment(appointmentId)

      setSuccess('Appointment cancelled successfully.')
      await fetchAppointments()
    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.detail ||
          'Could not cancel appointment. Please try again.'
      )
    } finally {
      setActionLoadingId('')
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Patient dashboard</p>
          <h1>My appointments</h1>
          <p>
            Track your booking history, payment-confirmed appointments, and
            upcoming visits.
          </p>
        </div>

        <Link to="/doctors" className={styles.newButton}>
          <Plus size={18} />
          Book new appointment
        </Link>
      </section>

      <section className={styles.filterBar}>
        {filters.map(item => (
          <button
            key={item.value}
            type="button"
            className={`${styles.filterButton} ${
              filter === item.value ? styles.activeFilter : ''
            }`}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </section>

      {success && <div className={styles.successBox}>{success}</div>}
      {error && <div className={styles.errorBox}>{error}</div>}

      {loading ? (
        <p className={styles.empty}>Loading your appointments...</p>
      ) : filteredAppointments.length > 0 ? (
        <section className={styles.grid}>
          {filteredAppointments.map(appointment => (
            <div key={appointment.appointment_id} className={styles.cardWrap}>
              <AppointmentCard
                appointment={appointment}
                onCancel={handleCancel}
              />

              {actionLoadingId === appointment.appointment_id && (
                <p className={styles.actionLoading}>Updating appointment...</p>
              )}
            </div>
          ))}
        </section>
      ) : (
        <section className={styles.emptyBox}>
          <CalendarCheck2 size={48} />
          <h2>No appointments found</h2>
          <p>
            You do not have any appointments in this filter yet.
          </p>
          <Link to="/doctors">Book your first appointment</Link>
        </section>
      )}
    </main>
  )
}