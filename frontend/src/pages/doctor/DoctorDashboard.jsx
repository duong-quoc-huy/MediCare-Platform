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

import {
  startAppointmentCheckup,
} from '../../services/appointmentService'

import {
  getDoctorDashboardData,
} from '../../services/doctorDashboardService'

import styles from './DoctorDashboard.module.css'

const CLOCK_REFRESH_INTERVAL = 30000

function formatTime(time) {
  if (!time) {
    return ''
  }

  return String(time).slice(0, 5)
}

function formatDateTimeTime(value) {
  if (!value) {
    return ''
  }

  const date = value instanceof Date
    ? value
    : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatVisitType(value) {
  if (value === 'home_visit') {
    return 'Home visit'
  }

  return 'Clinic visit'
}

function formatStatus(value) {
  if (!value) {
    return ''
  }

  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, character =>
      character.toUpperCase()
    )
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
    case 'missed':
      return styles.missed

    case 'pending':
    default:
      return styles.pending
  }
}

function getActionLabel(status) {
  if (status === 'pending') {
    return 'Waiting deposit'
  }

  if (status === 'confirmed') {
    return 'Start checkup'
  }

  if (status === 'in_progress') {
    return 'Continue checkup'
  }

  if (status === 'completed') {
    return 'View record'
  }

  if (status === 'cancelled') {
    return 'Cancelled'
  }

  if (status === 'missed') {
    return 'Missed appointment'
  }

  return 'Unavailable'
}

function getActionPath(appointment) {
  if (appointment.status === 'in_progress') {
    return (
      `/doctor/appointments/` +
      `${appointment.appointment_id}/checkup`
    )
  }

  if (appointment.status === 'completed') {
    return (
      `/doctor/appointments/` +
      `${appointment.appointment_id}/record`
    )
  }

  return null
}

function getStartAvailability(
  appointment,
  currentTime
) {
  const isConfirmed =
    appointment.status === 'confirmed'

  if (!isConfirmed) {
    return {
      canStart: false,
      isBlocked: false,
      message: '',
    }
  }

  const earliestStartValue =
    appointment.earliest_start_at

  const latestStartValue =
    appointment.latest_start_at

  /*
   * Use the backend result as the default source.
   *
   * The backend remains authoritative because the user
   * can bypass frontend validation and call the API
   * directly.
   */
  let canStart =
    appointment.can_start_checkup === true

  let message =
    appointment.start_block_message || ''

  /*
   * When the backend provides its start window, calculate
   * the current display state in the browser as time passes.
   *
   * This lets the button automatically become available
   * without reloading the dashboard.
   */
  if (
    earliestStartValue &&
    latestStartValue
  ) {
    const earliestStart =
      new Date(earliestStartValue)

    const latestStart =
      new Date(latestStartValue)

    const hasValidStart =
      !Number.isNaN(earliestStart.getTime())

    const hasValidEnd =
      !Number.isNaN(latestStart.getTime())

    if (hasValidStart && hasValidEnd) {
      canStart =
        currentTime >= earliestStart &&
        currentTime <= latestStart

      if (currentTime < earliestStart) {
        message =
          `Available at ` +
          `${formatDateTimeTime(earliestStart)}`
      } else if (currentTime > latestStart) {
        message = 'Allowed start window expired'
      } else {
        message = ''
      }
    }
  }

  if (!canStart && !message) {
    if (
      appointment.start_block_reason ===
      'too_early'
    ) {
      message = 'This appointment cannot start yet.'
    } else if (
      appointment.start_block_reason ===
      'start_window_expired'
    ) {
      message = 'Allowed start window expired'
    } else {
      message = 'Checkup is not available.'
    }
  }

  return {
    canStart,
    isBlocked: !canStart,
    message,
  }
}

function AppointmentRow({
  appointment,
  onStartCheckup,
  actionLoadingId,
  currentTime,
}) {
  const navigate = useNavigate()

  const actionPath =
    getActionPath(appointment)

  const isStarting =
    actionLoadingId ===
    appointment.appointment_id

  const isPending =
    appointment.status === 'pending'

  const isCancelled =
    appointment.status === 'cancelled'

  const isMissed =
    appointment.status === 'missed'

  const isConfirmed =
    appointment.status === 'confirmed'

  const startAvailability =
    getStartAvailability(
      appointment,
      currentTime
    )

  const startBlocked =
    isConfirmed &&
    startAvailability.isBlocked

  const actionDisabled =
    isStarting ||
    isPending ||
    isCancelled ||
    isMissed ||
    startBlocked

  async function handleAction() {
    if (actionDisabled) {
      return
    }

    if (isConfirmed) {
      await onStartCheckup(
        appointment.appointment_id
      )

      return
    }

    if (actionPath) {
      navigate(actionPath)
    }
  }

  let buttonLabel =
    getActionLabel(appointment.status)

  if (isStarting) {
    buttonLabel = 'Starting...'
  } else if (startBlocked) {
    buttonLabel = startAvailability.message
  }

  return (
    <article className={styles.appointmentRow}>
      <div className={styles.patientCell}>
        <div className={styles.patientAvatar}>
          {(appointment.patient_name || 'P')
            .charAt(0)
            .toUpperCase()}
        </div>

        <div>
          <strong>
            {appointment.patient_name}
          </strong>

          <span
            title={appointment.appointment_id}
          >
            Appointment ID:{' '}
            {appointment.appointment_id.slice(
              0,
              8
            )}
            ...
          </span>

          {isPending && (
            <small className={styles.rowHint}>
              Waiting for patient deposit payment.
            </small>
          )}

          {startBlocked && (
            <small className={styles.rowHint}>
              {startAvailability.message}
            </small>
          )}

          {isMissed && (
            <small className={styles.missedHint}>
              The allowed start window expired.
              The deposit is non-refundable.
            </small>
          )}
        </div>
      </div>

      <div className={styles.timeCell}>
        <Clock size={17} />

        <span>
          {formatTime(
            appointment.start_time
          )}{' '}
          -{' '}
          {formatTime(
            appointment.end_time
          )}
        </span>
      </div>

      <div className={styles.visitCell}>
        <Stethoscope size={17} />

        <span>
          {formatVisitType(
            appointment.visit_type
          )}
        </span>
      </div>

      <span
        className={
          `${styles.statusBadge} ` +
          `${getStatusClass(
            appointment.status
          )}`
        }
      >
        {formatStatus(appointment.status)}
      </span>

      <button
        type="button"
        className={styles.actionButton}
        disabled={actionDisabled}
        onClick={handleAction}
        title={
          startBlocked
            ? startAvailability.message
            : undefined
        }
      >
        {buttonLabel}
      </button>
    </article>
  )
}

function UpcomingAppointmentItem({
  appointment,
}) {
  const actionPath =
    getActionPath(appointment)

  const content = (
    <>
      <div>
        <strong>
          {appointment.patient_name}
        </strong>

        <span>
          {appointment.appointment_date}
          {' · '}
          {formatTime(
            appointment.start_time
          )}
        </span>
      </div>

      <span
        className={
          `${styles.smallStatus} ` +
          `${getStatusClass(
            appointment.status
          )}`
        }
      >
        {formatStatus(appointment.status)}
      </span>
    </>
  )

  /*
   * Confirmed appointments should not navigate directly
   * to the checkup page. They must be started through the
   * backend start-checkup endpoint first.
   */
  if (!actionPath) {
    return (
      <div
        className={styles.upcomingItem}
        aria-disabled="true"
      >
        {content}
      </div>
    )
  }

  return (
    <Link
      to={actionPath}
      className={styles.upcomingItem}
    >
      {content}
    </Link>
  )
}

export default function DoctorDashboard() {
  const navigate = useNavigate()

  const [
    todayAppointments,
    setTodayAppointments,
  ] = useState([])

  const [
    upcomingAppointments,
    setUpcomingAppointments,
  ] = useState([])

  const [stats, setStats] = useState({
    totalToday: 0,
    completedToday: 0,
    activeToday: 0,
    upcomingCount: 0,
  })

  const [currentTime, setCurrentTime] =
    useState(() => new Date())

  const [loading, setLoading] =
    useState(true)

  const [
    actionLoadingId,
    setActionLoadingId,
  ] = useState('')

  const [error, setError] =
    useState('')

  async function fetchDashboard({
    showLoading = true,
  } = {}) {
    try {
      if (showLoading) {
        setLoading(true)
      }

      setError('')

      const data =
        await getDoctorDashboardData()

      setTodayAppointments(
        data.todayAppointments || []
      )

      setUpcomingAppointments(
        data.upcomingAppointments || []
      )

      setStats(
        data.stats || {
          totalToday: 0,
          completedToday: 0,
          activeToday: 0,
          upcomingCount: 0,
        }
      )

      /*
       * Reset the browser clock when fresh server data
       * arrives.
       */
      setCurrentTime(new Date())
    } catch (err) {
      console.error(
        'Could not load doctor dashboard:',
        err
      )

      setError(
        err.response?.data?.detail ||
        'Could not load doctor dashboard.'
      )
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  /*
   * Update time every 30 seconds so a disabled button
   * automatically becomes available when the checkup
   * window begins.
   */
  useEffect(() => {
    const refreshIntervalId =
      window.setInterval(() => {
        fetchDashboard({
          showLoading: false,
        })
      }, 60000)

    return () => {
      window.clearInterval(refreshIntervalId)
    }
  }, [])

  const nextAppointments = useMemo(() => {
    return upcomingAppointments
      .filter(
        appointment =>
          appointment.status !== 'cancelled' &&
          appointment.status !== 'missed'
      )
      .slice(0, 5)
  }, [upcomingAppointments])

  async function handleStartCheckup(
    appointmentId
  ) {
    try {
      setActionLoadingId(
        appointmentId
      )

      setError('')

      await startAppointmentCheckup(
        appointmentId
      )

      navigate(
        `/doctor/appointments/` +
        `${appointmentId}/checkup`
      )
    } catch (err) {
      console.error(
        'Could not start appointment:',
        err
      )

      setError(
        err.response?.data?.detail ||
        'Could not start this appointment. Please try again.'
      )

      /*
       * Refresh the dashboard because the backend is the
       * final authority. The appointment may have changed
       * while this page was open.
       */
      await fetchDashboard({
        showLoading: false,
      })
    } finally {
      setActionLoadingId('')
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            Doctor dashboard
          </p>

          <h1>
            Welcome back, Doctor
          </h1>

          <p>
            Manage today&apos;s appointments,
            start checkups during their allowed
            time window, continue medical records,
            and review upcoming visits.
          </p>
        </div>

        <div className={styles.heroActions}>
          <Link
            to="/doctor/appointments/today"
            className={styles.heroButton}
          >
            <ClipboardList size={18} />
            Today&apos;s appointments
          </Link>

          <Link
            to="/doctor/appointments"
            className={
              styles.heroButtonSecondary
            }
          >
            <CalendarDays size={18} />
            All appointments
          </Link>

          <Link
            to="/doctor/appointments/history"
            className={
              styles.heroButtonSecondary
            }
          >
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
            <strong>
              {stats.totalToday}
            </strong>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Stethoscope size={24} />
          </div>

          <div>
            <span>Active today</span>
            <strong>
              {stats.activeToday}
            </strong>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <CheckCircle2 size={24} />
          </div>

          <div>
            <span>Completed today</span>
            <strong>
              {stats.completedToday}
            </strong>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <CalendarCheck2 size={24} />
          </div>

          <div>
            <span>Upcoming 7 days</span>
            <strong>
              {stats.upcomingCount}
            </strong>
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
              <h2>
                Today&apos;s appointments
              </h2>

              <p>
                Checkups become available 15
                minutes before their scheduled
                start time.
              </p>
            </div>

            <Link to="/doctor/appointments/today">
              View all
            </Link>
          </div>

          {loading ? (
            <div className={styles.loadingList}>
              {[1, 2, 3].map(item => (
                <div
                  key={item}
                  className={styles.skeletonRow}
                />
              ))}
            </div>
          ) : todayAppointments.length > 0 ? (
            <div className={styles.appointmentList}>
              {todayAppointments.map(
                appointment => (
                  <AppointmentRow
                    key={
                      appointment.appointment_id
                    }
                    appointment={appointment}
                    onStartCheckup={
                      handleStartCheckup
                    }
                    actionLoadingId={
                      actionLoadingId
                    }
                    currentTime={currentTime}
                  />
                )
              )}
            </div>
          ) : (
            <div className={styles.emptyBox}>
              <UserRound size={42} />

              <h3>
                No appointments today
              </h3>

              <p>
                You do not have any scheduled
                appointments for today.
              </p>
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
                <div
                  key={item}
                  className={
                    styles.skeletonMini
                  }
                />
              ))}
            </div>
          ) : nextAppointments.length > 0 ? (
            <div className={styles.upcomingList}>
              {nextAppointments.map(
                appointment => (
                  <UpcomingAppointmentItem
                    key={
                      appointment.appointment_id
                    }
                    appointment={appointment}
                  />
                )
              )}
            </div>
          ) : (
            <p className={styles.sideEmpty}>
              No upcoming appointments in the
              next 7 days.
            </p>
          )}
        </aside>
      </section>
    </main>
  )
}