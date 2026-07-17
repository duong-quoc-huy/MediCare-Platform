import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { capturePayPalPayment } from '../../services/paymentService'

export default function PayPalReturn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const paymentId = searchParams.get('payment_id')
  const token = searchParams.get('token')

  const [error, setError] = useState('')

  useEffect(() => {
    async function capturePayment() {
      if (!paymentId || !token) {
        setError('Missing PayPal payment information.')
        return
      }

      try {
        const payment = await capturePayPalPayment({
          payment_id: paymentId,
          paypal_order_id: token,
        })

        navigate(`/cart?payment=success&order_id=${payment.reference_id}`, {
          replace: true,
        })
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            'Could not capture PayPal payment.'
        )
      }
    }

    capturePayment()
  }, [paymentId, token, navigate])

  if (error) {
    return (
      <main style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h1>PayPal payment failed</h1>
        <p>{error}</p>
        <Link to="/cart">Back to cart</Link>
      </main>
    )
  }

  return (
    <main style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <h1>Processing PayPal payment...</h1>
      <p>Please wait while we confirm your payment.</p>
    </main>
  )
}