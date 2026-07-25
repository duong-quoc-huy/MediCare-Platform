import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  CalendarDays,
  Clock,
  FileText,
  Search,
  Stethoscope,
  UserRound,
} from 'lucide-react'

import { getMyAppointments } from '../../services/appointmentService'
import styles from './DoctorAppointmentsPage.module.css'

function getTodayString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatTime(time) {
  if (!time) return ''
  return String(time).slice(0, 5)
}

function formatVisitType(value) {
  if (value === 'home_visit') return 'Home visit'
  return 'Clinic visit'
}

function getStatusLabel(status) {
  const labels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    in_progress: 'In progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }

  return labels[status] || status
}

function getActionPath(appointment) {
  if (appointment.status === 'completed') {
    return `/doctor/appointments/${appointment.appointment_id}/record`
  }

  if (
    appointment.status === 'confirmed' ||
    appointment.status === 'in_progress'
  ) {
    return `/doctor/appointments/${appointment.appointment_id}/checkup`
  }

  return '#'
}

function getActionLabel(appointment) {
  if (appointment.status === 'completed') return 'View record'
  if (appointment.status === 'confirmed') return 'Start checkup'
  if (appointment.status === 'in_progress') return 'Continue checkup'
  if (appointment.status === 'pending') return 'Waiting deposit'
  return 'Unavailable'
}

export default function DoctorAppointmentsPage() {
  const location = useLocation()

  const defaultMode = useMemo(() => {
    if (location.pathname.endsWith('/today')) return 'today'
    if (location.pathname.endsWith('/history')) return 'history'
    return 'all'
  }, [location.pathname])

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [mode, setMode] = useState(defaultMode)
  const [statusFilter, setStatusFilter] = useState('all')
  const [visitTypeFilter, setVisitTypeFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')

  useEffect(() => {
    setMode(defaultMode)
  }, [defaultMode])

  useEffect(() => {
    async function loadAppointments() {
      try {
        setLoading(true)
        setError('')

        const data = await getMyAppointments()
        const list = Array.isArray(data) ? data : data.results || []

        setAppointments(list)
      } catch (err) {
        console.error(err)
        setError(
          err.response?.data?.detail ||
            'Could not load doctor appointments.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadAppointments()
  }, [])

  const filteredAppointments = useMemo(() => {
    const today = getTodayString()
    const keyword = search.trim().toLowerCase()

    return appointments
      .filter(appointment => {
        if (mode === 'today') {
          return appointment.appointment_date === today
        }

        if (mode === 'history') {
          return (
            appointment.status === 'completed' ||
            appointment.appointment_date < today
          )
        }

        if (mode === 'upcoming') {
          return (
            appointment.appointment_date >= today &&
            appointment.status !== 'completed' &&
            appointment.status !== 'cancelled'
          )
        }

        return true
      })
      .filter(appointment => {
        if (statusFilter === 'all') return true
        return appointment.status === statusFilter
      })
      .filter(appointment => {
        if (visitTypeFilter === 'all') return true
        return appointment.visit_type === visitTypeFilter
      })
      .filter(appointment => {
        if (!keyword) return true

        return (
          appointment.patient_name?.toLowerCase().includes(keyword) ||
          appointment.appointment_id?.toLowerCase().includes(keyword) ||
          appointment.doctor_specialty?.toLowerCase().includes(keyword)
        )
      })
      .sort((a, b) => {
        const dateA = `${a.appointment_date} ${a.start_time}`
        const dateB = `${b.appointment_date} ${b.start_time}`

        if (sortOrder === 'oldest') {
          return dateA.localeCompare(dateB)
        }

        return dateB.localeCompare(dateA)
      })
  }, [
    appointments,
    mode,
    search,
    statusFilter,
    visitTypeFilter,
    sortOrder,
  ])

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <h1>Loading appointments...</h1>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Doctor workspace</p>
          <h1>Appointments</h1>
          <p>
            Look up today&apos;s appointments, past checkups, and completed
            medical records.
          </p>
        </div>

        <Link to="/doctor/dashboard" className={styles.dashboardLink}>
          Back to dashboard
        </Link>
      </section>

      {error && (
        <section className={styles.errorBox}>
          {error}
        </section>
      )}

      <section className={styles.filterCard}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="search"
            placeholder="Search patient name or appointment ID..."
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>

        <div className={styles.filterGrid}>
          <label>
            View
            <select
              value={mode}
              onChange={event => setMode(event.target.value)}
            >
              <option value="all">All appointments</option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="history">Past checkups</option>
            </select>
          </label>

          <label>
            Status
            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label>
            Visit type
            <select
              value={visitTypeFilter}
              onChange={event => setVisitTypeFilter(event.target.value)}
            >
              <option value="all">All types</option>
              <option value="clinic">Clinic</option>
              <option value="home_visit">Home visit</option>
            </select>
          </label>

          <label>
            Sort date
            <select
              value={sortOrder}
              onChange={event => setSortOrder(event.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
      </section>

      <section className={styles.resultInfo}>
        <strong>{filteredAppointments.length}</strong> appointment(s) found
      </section>

      {filteredAppointments.length === 0 ? (
        <section className={styles.emptyCard}>
          <CalendarDays size={48} />
          <h2>No appointments found</h2>
          <p>Try changing the search, date mode, status, or visit type.</p>
        </section>
      ) : (
        <section className={styles.appointmentGrid}>
          {filteredAppointments.map(appointment => {
            const disabledAction =
              appointment.status === 'pending' ||
              appointment.status === 'cancelled'

            return (
              <article
                key={appointment.appointment_id}
                className={styles.appointmentCard}
              >
                <div className={styles.cardTop}>
                  <div className={styles.patientIcon}>
                    <UserRound size={24} />
                  </div>

                  <div>
                    <h2>{appointment.patient_name}</h2>
                    <p>{appointment.appointment_id}</p>
                  </div>
                </div>

                <div className={styles.metaGrid}>
                  <div>
                    <CalendarDays size={16} />
                    <span>{appointment.appointment_date}</span>
                  </div>

                  <div>
                    <Clock size={16} />
                    <span>
                      {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                    </span>
                  </div>

                  <div>
                    <Stethoscope size={16} />
                    <span>{formatVisitType(appointment.visit_type)}</span>
                  </div>

                  <div>
                    <FileText size={16} />
                    <span>{getStatusLabel(appointment.status)}</span>
                  </div>
                </div>

                <div className={styles.badgeRow}>
                  <span className={`${styles.badge} ${styles[appointment.status]}`}>
                    {getStatusLabel(appointment.status)}
                  </span>

                  <span className={styles.typeBadge}>
                    {formatVisitType(appointment.visit_type)}
                  </span>
                </div>

                {disabledAction ? (
                  <button
                    type="button"
                    className={styles.disabledButton}
                    disabled
                  >
                    {getActionLabel(appointment)}
                  </button>
                ) : (
                  <Link
                    to={getActionPath(appointment)}
                    className={styles.actionButton}
                  >
                    {getActionLabel(appointment)}
                  </Link>
                )}
              </article>
            )
          })}
        </section>
      )}
    </main>
  )
}