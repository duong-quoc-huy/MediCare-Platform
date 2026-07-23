import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  CreditCard,
  DollarSign,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'

import { getAppointmentById } from '../../services/appointmentService'
import {
  createAppointmentPayPalPayment,
  createAppointmentVNPayPayment,
} from '../../services/paymentService'
import styles from './AppointmentPaymentPage.module.css'

function formatPrice(value) {
  return Number(value || 0).toLocaleString('vi-VN')
}

function formatTime(time) {
  if (!time) return ''
  return time.slice(0, 5)
}

export default function AppointmentPaymentPage() {
  const { appointmentId } = useParams()
  const location = useLocation()

  const [appointment, setAppointment] = useState(
    location.state?.appointment || null
  )
  const [doctor, setDoctor] = useState(location.state?.doctor || null)

  const [paymentMethod, setPaymentMethod] = useState('vnpay')
  const [loading, setLoading] = useState(!location.state?.appointment)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchAppointment() {
      try {
        setLoading(true)
        setError('')

        const data = await getAppointmentById(appointmentId)

        setAppointment(data)
        setDoctor(data.doctor || null)
      } catch (err) {
        console.error(err)
        setError('Could not load appointment detail.')
      } finally {
        setLoading(false)
      }
    }

    if (!appointment) {
      fetchAppointment()
    }
  }, [appointment, appointmentId])

  const totalFee = useMemo(() => {
    return Number(appointment?.total_fee || doctor?.consultation_fee || 0)
  }, [appointment, doctor])

  const depositAmount = useMemo(() => {
    return totalFee * 0.5
  }, [totalFee])

  const remainingAmount = useMemo(() => {
    return totalFee - depositAmount
  }, [totalFee, depositAmount])

  async function handlePay() {
    try {
      setProcessing(true)
      setError('')

      if (paymentMethod === 'vnpay') {
        const data = await createAppointmentVNPayPayment(appointmentId)
        window.location.href = data.payment_url
        return
      }

      const data = await createAppointmentPayPalPayment(appointmentId)
      window.location.href = data.approval_url
    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.detail ||
          'Could not create appointment payment. Please try again.'
      )
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <p className={styles.empty}>Loading payment information...</p>
      </main>
    )
  }

  if (error && !appointment) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyBox}>
          <p>{error}</p>
          <Link to="/doctors">Back to doctors</Link>
        </div>
      </main>
    )
  }

  if (!appointment) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyBox}>
          <p>Appointment not found.</p>
          <Link to="/doctors">Back to doctors</Link>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <Link to="/doctors" className={styles.backLink}>
        <ArrowLeft size={18} />
        Back to doctors
      </Link>

      <section className={styles.header}>
        <p className={styles.eyebrow}>Appointment payment</p>
        <h1>Pay appointment deposit</h1>
        <p>
          Pay 50% of the consultation fee to secure your appointment.
        </p>
      </section>

      <section className={styles.layout}>
        <section className={styles.paymentCard}>
          <div className={styles.sectionTitle}>
            <CreditCard size={22} />
            <div>
              <h2>Choose payment method</h2>
              <p>Select VNPay or PayPal to complete your deposit payment.</p>
            </div>
          </div>

          <div className={styles.paymentOptions}>
            <label
              className={`${styles.paymentOption} ${
                paymentMethod === 'vnpay' ? styles.selectedOption : ''
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value="vnpay"
                checked={paymentMethod === 'vnpay'}
                onChange={event => setPaymentMethod(event.target.value)}
              />

              <div className={styles.optionIcon}>
                <CreditCard size={22} />
              </div>

              <div>
                <strong>VNPay</strong>
                <span>Pay securely using Vietnamese payment gateway.</span>
              </div>
            </label>

            <label
              className={`${styles.paymentOption} ${
                paymentMethod === 'paypal' ? styles.selectedOption : ''
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value="paypal"
                checked={paymentMethod === 'paypal'}
                onChange={event => setPaymentMethod(event.target.value)}
              />

              <div className={styles.optionIcon}>
                <DollarSign size={22} />
              </div>

              <div>
                <strong>PayPal</strong>
                <span>Pay using PayPal sandbox or international checkout.</span>
              </div>
            </label>
          </div>

          {error && (
            <div className={styles.errorBox}>
              {error}
            </div>
          )}

          <button
            type="button"
            className={styles.payButton}
            disabled={processing || appointment.status !== 'pending'}
            onClick={handlePay}
          >
            {processing ? 'Redirecting to payment...' : 'Pay deposit now'}
          </button>

          {appointment.status !== 'pending' && (
            <p className={styles.warningText}>
              This appointment is no longer pending, so it cannot be paid again.
            </p>
          )}

          <div className={styles.securityBox}>
            <ShieldCheck size={20} />
            <p>
              Your payment will be processed by the selected payment provider.
              MediCare only stores the payment status and transaction reference.
            </p>
          </div>
        </section>

        <aside className={styles.summaryCard}>
          <h2>Payment summary</h2>

          <div className={styles.doctorBox}>
            <div className={styles.avatar}>
              {(doctor?.full_name || appointment.doctor_name || 'D').charAt(0)}
            </div>

            <div>
              <strong>
                Dr. {doctor?.full_name || appointment.doctor_name}
              </strong>
              <span>{doctor?.specialty || 'Doctor appointment'}</span>
            </div>
          </div>

          <div className={styles.summaryList}>
            <div>
              <span>
                <CalendarDays size={17} />
                Date
              </span>
              <strong>{appointment.appointment_date}</strong>
            </div>

            <div>
              <span>
                <Clock size={17} />
                Time
              </span>
              <strong>
                {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
              </strong>
            </div>

            <div>
              <span>
                <Stethoscope size={17} />
                Visit type
              </span>
              <strong>
                {appointment.visit_type === 'home_visit'
                  ? 'Home visit'
                  : 'Clinic visit'}
              </strong>
            </div>

            <div>
              <span>Status</span>
              <strong className={styles.statusText}>
                {appointment.status}
              </strong>
            </div>

            <div>
              <span>Consultation fee</span>
              <strong>{formatPrice(totalFee)} VND</strong>
            </div>

            <div className={styles.depositRow}>
              <span>Deposit to pay</span>
              <strong>{formatPrice(depositAmount)} VND</strong>
            </div>

            <div>
              <span>Remaining later</span>
              <strong>{formatPrice(remainingAmount)} VND</strong>
            </div>
          </div>

          <p className={styles.summaryNote}>
            After successful payment, your appointment status will become
            confirmed.
          </p>
        </aside>
      </section>
    </main>
  )
}