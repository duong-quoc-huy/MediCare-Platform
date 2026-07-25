import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock,
  ClipboardList,
  Stethoscope,
  UserRound,
} from 'lucide-react'

import { startAppointmentCheckup } from '../../services/appointmentService'
import { getDoctorDashboardData } from '../../services/doctorDashboardService'
import styles from './DoctorDashboard.module.css'

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
    case 'confirmed':
      return styles.confirmed
    case 'in_progress':
      return styles.inProgress
    case 'completed':
      return styles.completed
    case 'cancelled':
      return styles.cancelled
    case 'pending':
    default:
      return styles.pending
  }
}

function getActionLabel(status) {
  if (status === 'pending') return 'Waiting deposit'
  if (status === 'confirmed') return 'Start checkup'
  if (status === 'in_progress') return 'Continue checkup'
  if (status === 'completed') return 'View record'
  if (status === 'cancelled') return 'Cancelled'
  return 'View detail'
}

function getActionPath(appointment) {
  if (appointment.status === 'confirmed') {
    return null
  }

  if (appointment.status === 'in_progress') {
    return `/doctor/appointments/${appointment.appointment_id}/checkup`
  }

  if (appointment.status === 'completed') {
    return `/doctor/appointments/${appointment.appointment_id}/record`
  }

  return '#'
}

function getAppointmentActionLabel(appointment) {
  if (appointment.status === 'confirmed') {
    return 'Start checkup'
  }

  if (appointment.status === 'in_progress') {
    return 'Continue checkup'
  }

  if (appointment.status === 'completed') {
    return 'View record'
  }

  if (appointment.status === 'pending') {
    return 'Waiting deposit'
  }

  return 'Unavailable'
}


function AppointmentRow({ appointment, onStartCheckup, actionLoadingId }) {
  const navigate = useNavigate()
  const actionPath = getActionPath(appointment)
  const isStarting = actionLoadingId === appointment.appointment_id
  const isPending = appointment.status === 'pending'
  const isCancelled = appointment.status === 'cancelled'

  async function handleAction() {
    if (isPending || isCancelled) {
      return
    }

    if (appointment.status === 'confirmed') {
      await onStartCheckup(appointment.appointment_id)
      return
    }

    navigate(actionPath)
  }

  return (
    <article className={styles.appointmentRow}>
      <div className={styles.patientCell}>
        <div className={styles.patientAvatar}>
          {(appointment.patient_name || 'P').charAt(0)}
        </div>

        <div>
          <strong>{appointment.patient_name}</strong>
          <span title={appointment.appointment_id}>
            Appointment ID: {appointment.appointment_id.slice(0, 8)}...
          </span>

          {isPending && (
            <small className={styles.rowHint}>
              Waiting for patient deposit payment.
            </small>
          )}
        </div>
      </div>

      <div className={styles.timeCell}>
        <Clock size={17} />
        <span>
          {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
        </span>
      </div>

      <div className={styles.visitCell}>
        <Stethoscope size={17} />
        <span>{formatVisitType(appointment.visit_type)}</span>
      </div>

      <span className={`${styles.statusBadge} ${getStatusClass(appointment.status)}`}>
        {appointment.status}
      </span>

      <button
        type="button"
        className={styles.actionButton}
        disabled={isStarting || isPending || isCancelled}
        onClick={handleAction}
      >
        {isStarting ? 'Starting...' : getActionLabel(appointment.status)}
      </button>
    </article>
  )
}



export default function DoctorDashboard() {
  const navigate = useNavigate()

  const [todayAppointments, setTodayAppointments] = useState([])
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [stats, setStats] = useState({
    totalToday: 0,
    completedToday: 0,
    activeToday: 0,
    upcomingCount: 0,
  })

  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [error, setError] = useState('')

  async function fetchDashboard() {
    try {
      setLoading(true)
      setError('')

      const data = await getDoctorDashboardData()

      setTodayAppointments(data.todayAppointments)
      setUpcomingAppointments(data.upcomingAppointments)
      setStats(data.stats)
    } catch (err) {
      console.error(err)
      setError('Could not load doctor dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const nextAppointments = useMemo(() => {
    return upcomingAppointments
      .filter(appointment => appointment.status !== 'cancelled')
      .slice(0, 5)
  }, [upcomingAppointments])

  async function handleStartCheckup(appointmentId) {
    try {
      setActionLoadingId(appointmentId)
      setError('')

      await startAppointmentCheckup(appointmentId)

      navigate(`/doctor/appointments/${appointmentId}/checkup`)
    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.detail ||
          'Could not start this appointment. Please try again.'
      )
    } finally {
      setActionLoadingId('')
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Doctor dashboard</p>
          <h1>Welcome back, Doctor</h1>
          <p>
            Manage today’s appointments, start checkups, continue medical records,
            and review upcoming visits.
          </p>
        </div>

        <div className={styles.heroActions}>
          <Link to="/doctor/appointments/today" className={styles.heroButton}>
            <ClipboardList size={18} />
            Today&apos;s appointments
          </Link>

          <Link to="/doctor/appointments" className={styles.heroButtonSecondary}>
            <CalendarDays size={18} />
            All appointments
          </Link>

          <Link to="/doctor/appointments/history" className={styles.heroButtonSecondary}>
            <CalendarCheck2 size={18} />
            Past checkups
          </Link>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <CalendarDays size={24} />
          </div>
          <div>
            <span>Total today</span>
            <strong>{stats.totalToday}</strong>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Stethoscope size={24} />
          </div>
          <div>
            <span>Active today</span>
            <strong>{stats.activeToday}</strong>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span>Completed today</span>
            <strong>{stats.completedToday}</strong>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <CalendarCheck2 size={24} />
          </div>
          <div>
            <span>Upcoming 7 days</span>
            <strong>{stats.upcomingCount}</strong>
          </div>
        </div>
      </section>

      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      <section className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Today’s appointments</h2>
              <p>Start or continue checkups scheduled for today.</p>
            </div>

            <Link to="/doctor/appointments/today">
              View all
            </Link>
          </div>

          {loading ? (
            <div className={styles.loadingList}>
              {[1, 2, 3].map(item => (
                <div key={item} className={styles.skeletonRow} />
              ))}
            </div>
          ) : todayAppointments.length > 0 ? (
            <div className={styles.appointmentList}>
              {todayAppointments.map(appointment => (
                <AppointmentRow
                  key={appointment.appointment_id}
                  appointment={appointment}
                  onStartCheckup={handleStartCheckup}
                  actionLoadingId={actionLoadingId}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyBox}>
              <UserRound size={42} />
              <h3>No appointments today</h3>
              <p>You do not have any scheduled appointments for today.</p>
            </div>
          )}
        </section>

        <aside className={styles.sideCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Upcoming</h2>
              <p>Next 7 days</p>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingList}>
              {[1, 2, 3].map(item => (
                <div key={item} className={styles.skeletonMini} />
              ))}
            </div>
          ) : nextAppointments.length > 0 ? (
            <div className={styles.upcomingList}>
              {nextAppointments.map(appointment => (
                <Link
                  key={appointment.appointment_id}
                  to={getActionPath(appointment)}
                  className={styles.upcomingItem}
                >
                  <div>
                    <strong>{appointment.patient_name}</strong>
                    <span>
                      {appointment.appointment_date} · {formatTime(appointment.start_time)}
                    </span>
                  </div>

                  <span className={`${styles.smallStatus} ${getStatusClass(appointment.status)}`}>
                    {appointment.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className={styles.sideEmpty}>
              No upcoming appointments in the next 7 days.
            </p>
          )}
        </aside>
      </section>
    </main>
  )
}