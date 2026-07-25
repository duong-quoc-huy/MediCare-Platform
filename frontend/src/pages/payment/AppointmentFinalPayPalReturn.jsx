import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { captureFinalSessionPayPalPayment } from '../../services/paymentService'

export default function AppointmentFinalPayPalReturn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const paymentId = searchParams.get('payment_id')
  const appointmentId = searchParams.get('appointment_id')
  const paypalOrderId = searchParams.get('token')
  const sessionToken = searchParams.get('session_token')
  const key = searchParams.get('key')

  const [error, setError] = useState('')

  useEffect(() => {
    async function capturePayment() {
      if (!paymentId || !appointmentId || !paypalOrderId || !sessionToken || !key) {
        setError('Missing PayPal final payment information.')
        return
      }

      try {
        await captureFinalSessionPayPalPayment(appointmentId, {
          payment_id: paymentId,
          paypal_order_id: paypalOrderId,
          session_token: sessionToken,
          key,
        })

        navigate(`/appointment-final-payment/${appointmentId}/success`, {
          replace: true,
        })
      } catch (err) {
        console.error(err)
        setError(
          err.response?.data?.detail ||
            'Could not capture PayPal final payment.'
        )
      }
    }

    capturePayment()
  }, [
    paymentId,
    appointmentId,
    paypalOrderId,
    sessionToken,
    key,
    navigate,
  ])

  if (error) {
    return (
      <main style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h1>PayPal final payment failed</h1>
        <p>{error}</p>
        {appointmentId ? (
          <Link to={`/appointment-final-payment/${appointmentId}/failed`}>
            View payment result
          </Link>
        ) : (
          <Link to="/">Go home</Link>
        )}
      </main>
    )
  }

  return (
    <main style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <h1>Processing PayPal final payment...</h1>
      <p>Please wait while we confirm your payment.</p>
    </main>
  )
}