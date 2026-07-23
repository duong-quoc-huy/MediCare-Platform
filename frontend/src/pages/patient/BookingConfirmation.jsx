import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Home,
  MapPin,
  Stethoscope,
  UserRound,
} from 'lucide-react'

import { getAppointmentById } from '../../services/appointmentService'
import styles from './BookingConfirmation.module.css'

function formatPrice(value) {
  return Number(value || 0).toLocaleString('vi-VN')
}

function formatTime(time) {
  if (!time) return ''
  return time.slice(0, 5)
}

function formatVisitType(value) {
  if (value === 'home_visit') return 'Home visit'
  return 'Clinic visit'
}

export default function BookingConfirmation() {
  const { id } = useParams()

  const location = useLocation()
  const fromPaymentHistory = location.state?.fromPaymentHistory === true

  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchAppointment() {
      try {
        setLoading(true)
        setError('')

        const data = await getAppointmentById(id)
        setAppointment(data)
      } catch (err) {
        console.error(err)
        setError('Could not load appointment confirmation.')
      } finally {
        setLoading(false)
      }
    }

    fetchAppointment()
  }, [id])

  const totalFee = useMemo(() => {
    return Number(appointment?.total_fee || 0)
  }, [appointment])

  const depositAmount = useMemo(() => {
    return totalFee * 0.5
  }, [totalFee])

  const remainingAmount = useMemo(() => {
    return totalFee - depositAmount
  }, [totalFee, depositAmount])

  if (loading) {
    return (
      <main className={styles.page}>
        <p className={styles.empty}>Loading booking confirmation...</p>
      </main>
    )
  }

  if (error || !appointment) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyBox}>
          <p>{error || 'Appointment not found.'}</p>
          <Link to="/doctors">Back to doctors</Link>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      {fromPaymentHistory && (
        <Link to="/payments" className={styles.backLink}>
          <ArrowLeft size={18} />
          Back to payment history
        </Link>
      )}
      
      <section className={styles.successHero}>
        <div className={styles.successIcon}>
          <CheckCircle2 size={54} />
        </div>

        <p className={styles.eyebrow}>Booking confirmed</p>
        <h1>Your appointment is confirmed!</h1>

        <p>
          Your 50% deposit has been received successfully. Please keep this
          appointment information for your visit.
        </p>
      </section>

      <section className={styles.layout}>
        <section className={styles.detailCard}>
          <h2>Appointment details</h2>

          <div className={styles.doctorBox}>
            <div className={styles.avatar}>
              {(appointment.doctor_name || 'D').charAt(0)}
            </div>

            <div>
              <strong>Dr. {appointment.doctor_name}</strong>
              <span>{appointment.doctor?.specialty || 'Doctor appointment'}</span>
            </div>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span>
                <UserRound size={18} />
                Appointment ID
              </span>
              <strong>{appointment.appointment_id}</strong>
            </div>

            <div className={styles.detailItem}>
              <span>
                <CalendarDays size={18} />
                Date
              </span>
              <strong>{appointment.appointment_date}</strong>
            </div>

            <div className={styles.detailItem}>
              <span>
                <Clock size={18} />
                Time
              </span>
              <strong>
                {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
              </strong>
            </div>

            <div className={styles.detailItem}>
              <span>
                <Stethoscope size={18} />
                Visit type
              </span>
              <strong>{formatVisitType(appointment.visit_type)}</strong>
            </div>

            {appointment.visit_type === 'home_visit' && (
              <div className={styles.detailItem}>
                <span>
                  <MapPin size={18} />
                  Address
                </span>
                <strong>{appointment.address}</strong>
              </div>
            )}

            <div className={styles.detailItem}>
              <span>Status</span>
              <strong className={styles.statusBadge}>
                {appointment.status}
              </strong>
            </div>
          </div>

          {appointment.notes && (
            <div className={styles.notesBox}>
              <span>Notes</span>
              <p>{appointment.notes}</p>
            </div>
          )}
        </section>

        <aside className={styles.paymentCard}>
          <h2>Payment summary</h2>

          <div className={styles.paymentList}>
            <div>
              <span>
                <CreditCard size={17} />
                Consultation fee
              </span>
              <strong>{formatPrice(totalFee)} VND</strong>
            </div>

            <div className={styles.depositRow}>
              <span>Deposit paid</span>
              <strong>{formatPrice(depositAmount)} VND</strong>
            </div>

            <div>
              <span>Remaining later</span>
              <strong>{formatPrice(remainingAmount)} VND</strong>
            </div>
          </div>

          <p className={styles.paymentNote}>
            The remaining amount can be handled later based on your clinic or
            home visit process.
          </p>

          <div className={styles.actions}>
            <Link to="/patient/appointments" className={styles.primaryAction}>
              View my appointments
            </Link>

            <Link to="/doctors" className={styles.secondaryAction}>
              Book another doctor
            </Link>

            <Link to="/" className={styles.textAction}>
              <Home size={16} />
              Go home
            </Link>
          </div>
        </aside>
      </section>
    </main>
  )
}