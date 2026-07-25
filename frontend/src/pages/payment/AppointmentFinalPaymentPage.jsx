import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CreditCard, ShieldCheck, Stethoscope } from 'lucide-react'

import { getAppointmentFinalPaymentSession, createFinalSessionVNPayPayment, createFinalSessionPayPalPayment } from '../../services/paymentService'
import styles from './AppointmentFinalPaymentPage.module.css'

function formatPrice(value) {
  return Number(value || 0).toLocaleString('vi-VN')
}

function formatTime(time) {
  if (!time) return ''
  return String(time).slice(0, 5)
}

function formatVisitType(value) {
  if (value === 'home_visit') return 'Home visit'
  return 'Clinic visit'
}

export default function AppointmentFinalPaymentPage() {
  const { appointmentId } = useParams()
  const [searchParams] = useSearchParams()

  const token = searchParams.get('token')
  const key = searchParams.get('key')

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [payingVNPay, setPayingVNPay] = useState(false)
  const [payingPayPal, setPayingPayPal] = useState(false)

  const [error, setError] = useState('')

  async function handlePayWithVNPay() {
    try {
      setPayingVNPay(true)
      setError('')

      const data = await createFinalSessionVNPayPayment(
        appointmentId,
        token,
        key
      )

      window.location.href = data.payment_url
    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.detail ||
          'Could not create VNPay final payment.'
      )
    } finally {
      setPayingVNPay(false)
    }
  }

  async function handlePayWithPayPal() {
    try {
      setPayingPayPal(true)
      setError('')

      const data = await createFinalSessionPayPalPayment(
        appointmentId,
        token,
        key
      )

      window.location.href = data.approval_url
    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.detail ||
          'Could not create PayPal final payment.'
      )
    } finally {
      setPayingPayPal(false)
    }
  }

  useEffect(() => {
    async function loadSession() {
      if (!token || !key) {
        setError('Missing payment token or signed key.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const data = await getAppointmentFinalPaymentSession(
          appointmentId,
          token,
          key
        )

        setSession(data)
      } catch (err) {
        console.error(err)
        setError(
          err.response?.data?.detail ||
            'Could not load final payment session.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [appointmentId, token, key])

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <h1>Loading final payment...</h1>
          <p>Please wait while we verify your payment link.</p>
        </section>
      </main>
    )
  }

  if (error || !session) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <h1>Payment link unavailable</h1>
          <p>{error || 'This payment session could not be found.'}</p>
          <Link to="/">Go home</Link>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.iconBox}>
          <ShieldCheck size={42} />
        </div>

        <p className={styles.eyebrow}>Firefly Hospital</p>
        <h1>Final appointment payment</h1>
        <p>
          Please review the payment information and choose your payment method.
        </p>
      </section>

      <section className={styles.layout}>
        <section className={styles.card}>
          <h2>Appointment information</h2>

          <div className={styles.infoGrid}>
            <div>
              <span>Patient</span>
              <strong>{session.patient_name}</strong>
            </div>

            <div>
              <span>Doctor</span>
              <strong>Dr. {session.doctor_name}</strong>
            </div>

            <div>
              <span>Date</span>
              <strong>{session.appointment_date}</strong>
            </div>

            <div>
              <span>Time</span>
              <strong>
                {formatTime(session.start_time)} - {formatTime(session.end_time)}
              </strong>
            </div>

            <div>
              <span>Visit type</span>
              <strong>{formatVisitType(session.visit_type)}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>{session.status}</strong>
            </div>
          </div>
        </section>

        <aside className={styles.paymentCard}>
          <div className={styles.paymentIcon}>
            <CreditCard size={30} />
          </div>

          <h2>Amount to pay</h2>

          <strong className={styles.amount}>
            {formatPrice(session.amount)} VND
          </strong>

          <p>
            This is the remaining payment for your home visit appointment.
          </p>

          <button
            type="button"
            className={styles.vnpayButton}
            onClick={handlePayWithVNPay}
            disabled={payingVNPay}
          >
            {payingVNPay ? 'Redirecting to VNPay...' : 'Pay with VNPay'}
          </button>

          <button
            type="button"
            className={styles.paypalButton}
            onClick={handlePayWithPayPal}
            disabled={payingPayPal}
          >
            {payingPayPal ? 'Redirecting to PayPal...' : 'Pay with PayPal'}
          </button>

          <p className={styles.notice}>
            This link is temporary and will expire after 30 minutes.
          </p>
        </aside>
      </section>

      <section className={styles.safeNote}>
        <Stethoscope size={22} />
        <p>
          Your medical PDF and prescription will be available after payment is
          confirmed.
        </p>
      </section>
    </main>
  )
}