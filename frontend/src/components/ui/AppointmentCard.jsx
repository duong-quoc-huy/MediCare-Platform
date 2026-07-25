import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Clock,
  MapPin,
  Stethoscope,
  XCircle,
} from 'lucide-react'

import styles from './AppointmentCard.module.css'

function formatTime(time) {
  if (!time) return ''
  return time.slice(0, 5)
}

function formatVisitType(value) {
  if (value === 'home_visit') return 'Home visit'
  return 'Clinic visit'
}

function getStatusClass(status) {
  switch (status) {
    case 'pending':
      return styles.pending
    case 'confirmed':
      return styles.confirmed
    case 'in_progress':
      return styles.inProgress
    case 'completed':
      return styles.completed
    case 'cancelled':
      return styles.cancelled
    default:
      return styles.pending
  }
}

export default function AppointmentCard({ appointment, onCancel }) {
  const canCancel =
    appointment.status === 'pending' || appointment.status === 'confirmed'

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <div>
          <p className={styles.eyebrow}>Doctor appointment</p>
          <h3>Dr. {appointment.doctor_name}</h3>
          <span>{appointment.doctor?.specialty || 'Family doctor'}</span>
        </div>

        <span className={`${styles.statusBadge} ${getStatusClass(appointment.status)}`}>
          {appointment.status}
        </span>
      </div>

      <div className={styles.infoGrid}>
        <div>
          <CalendarDays size={17} />
          <span>{appointment.appointment_date}</span>
        </div>

        <div>
          <Clock size={17} />
          <span>
            {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
          </span>
        </div>

        <div>
          <Stethoscope size={17} />
          <span>{formatVisitType(appointment.visit_type)}</span>
        </div>

        {appointment.visit_type === 'home_visit' && appointment.address && (
          <div>
            <MapPin size={17} />
            <span>{appointment.address}</span>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <Link
          to={`/booking/confirmation/${appointment.appointment_id}`}
          className={styles.viewButton}
        >
          View Booking
        </Link>

        {canCancel && (
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => onCancel(appointment.appointment_id)}
          >
            <XCircle size={16} />
            Cancel appointment
          </button>
        )}

        {appointment.status === 'completed' && (
          <Link 
            to={`/patient/appointments/${appointment.appointment_id}/prescription`}
            className={styles.viewButton}
          >
            View Prescription
          </Link>
        )}
      </div>
    </article>
  )
}