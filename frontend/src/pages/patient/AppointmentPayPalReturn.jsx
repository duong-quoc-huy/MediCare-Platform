import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

import { captureAppointmentPayPalPayment } from '../../services/paymentService'
import styles from './AppointmentPayPalReturn.module.css'

export default function AppointmentPayPalReturn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const paymentId = searchParams.get('payment_id')
  const token = searchParams.get('token')

  const [status, setStatus] = useState('processing')
  const [error, setError] = useState('')

  useEffect(() => {
    async function capturePayment() {
      if (!paymentId || !token) {
        setStatus('failed')
        setError('Missing PayPal payment information.')
        return
      }

      try {
        setStatus('processing')
        setError('')

        const payment = await captureAppointmentPayPalPayment({
          payment_id: paymentId,
          paypal_order_id: token,
        })

        navigate(`/booking/confirmation/${payment.reference_id}`, {
          replace: true,
        })
      } catch (err) {
        console.error(err)
        setStatus('failed')
        setError(
          err.response?.data?.detail ||
            'Could not complete PayPal appointment payment.'
        )
      }
    }

    capturePayment()
  }, [paymentId, token, navigate])

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        {status === 'processing' && (
          <>
            <div className={styles.loadingIcon}>
              <Loader2 size={52} />
            </div>

            <p className={styles.eyebrow}>Processing payment</p>
            <h1>Completing your PayPal payment...</h1>
            <p>
              Please wait while we confirm your appointment deposit payment.
            </p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className={styles.failedIcon}>
              <XCircle size={52} />
            </div>

            <p className={styles.eyebrow}>Payment failed</p>
            <h1>Could not complete payment</h1>
            <p>{error}</p>

            <div className={styles.actions}>
              <Link to="/doctors" className={styles.primaryAction}>
                Back to doctors
              </Link>

              <Link to="/patient/appointments" className={styles.secondaryAction}>
                View my appointments
              </Link>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={styles.successIcon}>
              <CheckCircle2 size={52} />
            </div>

            <p className={styles.eyebrow}>Payment success</p>
            <h1>Payment completed</h1>
            <p>Redirecting to your booking confirmation...</p>
          </>
        )}
      </section>
    </main>
  )
}