import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, FileText, Home } from 'lucide-react'

import styles from './AppointmentFinalPaymentResult.module.css'

export default function AppointmentFinalPaymentResult({ statusType = 'success' }) {
  const { appointmentId } = useParams()
  const [searchParams] = useSearchParams()

  const code = searchParams.get('code')
  const isSuccess = statusType === 'success'

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={isSuccess ? styles.successIcon : styles.failedIcon}>
          {isSuccess ? <CheckCircle2 size={56} /> : <XCircle size={56} />}
        </div>

        {isSuccess ? (
          <>
            <p className={styles.eyebrow}>Payment completed</p>
            <h1>Final payment successful</h1>
            <p>
              Your appointment has been completed successfully. The medical
              record PDF has been generated and is now available in your account.
            </p>

            <div className={styles.infoBox}>
              <span>Appointment ID</span>
              <strong>{appointmentId}</strong>
            </div>

            <div className={styles.actions}>
              <Link to={`/booking/confirmation/${appointmentId}`} className={styles.primaryLink}>
                <FileText size={18} />
                View appointment
              </Link>

              <Link to="/" className={styles.secondaryLink}>
                <Home size={18} />
                Go home
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className={styles.failedEyebrow}>Payment failed</p>
            <h1>Final payment was not completed</h1>
            <p>
              The payment was cancelled or rejected. Please scan the QR code again
              or ask the doctor to generate a new final payment QR.
            </p>

            {code && (
              <div className={styles.infoBox}>
                <span>Payment response code</span>
                <strong>{code}</strong>
              </div>
            )}

            <div className={styles.actions}>
              <Link to="/" className={styles.secondaryLink}>
                <Home size={18} />
                Go home
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  )
}