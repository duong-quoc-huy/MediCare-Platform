import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CreditCard } from 'lucide-react'

import { createCashOnDeliveryPayment, createVNPayPayment, createPayPalPayment } from '../../services/paymentService'

export default function PaymentPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()

  const [loadingMethod, setLoadingMethod] = useState('')
  const [error, setError] = useState('')

  async function handleCashOnDelivery() {
    try {
      setLoadingMethod('cash')
      setError('')

      await createCashOnDeliveryPayment(
        orderId
      )

      navigate(
        `/orders/${orderId}`,
        {
          replace: true,
        }
      )
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Could not select cash on delivery. ' +
        'Please try again.'
      )
    } finally {
      setLoadingMethod('')
    }
  }

  async function handlePayWithVNPay() {
    try {
      setLoadingMethod('vnpay')
      setError('')

      const data = await createVNPayPayment(orderId)

      window.location.href = data.payment_url
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Could not create VNPay payment. Please try again.'
      )
    } finally {
      setLoadingMethod('')
    }
  }

  async function handlePayWithPayPal() {
    try {
      setLoadingMethod('paypal')
      setError('')

      const data = await createPayPalPayment(orderId)

      window.location.href = data.approval_url
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Could not create PayPal payment. Please try again.'
      )
    } finally {
      setLoadingMethod('')
    }
  }

  return (
    <main style={{ padding: '4rem 2rem', maxWidth: 720, margin: '0 auto' }}>
      <CreditCard size={52} />

      <h1>Payment</h1>
      <p>Please choose a payment method to complete your order.</p>

      {error && (
        <div
          style={{
            padding: '1rem',
            borderRadius: 12,
            background: '#fff1f2',
            color: '#be123c',
            margin: '1rem 0',
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      )}

      <section
        style={{
          marginTop: '1.5rem',
          padding: '1.5rem',
          border: '1px solid #ddd',
          borderRadius: 16,
          background: 'white',
        }}
      >
        <p>
          <strong>Order ID:</strong> {orderId}
        </p>

        <button
          type="button"
          onClick={handleCashOnDelivery}
          disabled={Boolean(loadingMethod)}
          style={{
            width: '100%',
            marginTop: '1rem',
            padding: '0.9rem 1rem',
            border: 'none',
            borderRadius: 999,
            background:
              loadingMethod
                ? '#94a3b8'
                : '#15803d',
            color: 'white',
            fontWeight: 900,
            cursor:
              loadingMethod
                ? 'not-allowed'
                : 'pointer',
          }}
        >
          {loadingMethod === 'cash'
            ? 'Confirming order...'
            : 'Cash on Delivery'}
        </button>

        <p
          style={{
            marginTop: '0.65rem',
            color: '#475569',
            lineHeight: 1.6,
          }}
        >
          Pay the medicine and shipping total
          when the GHTK courier delivers your
          order.
        </p>

        <button
          type="button"
          onClick={handlePayWithVNPay}
          disabled={Boolean(loadingMethod)}
          style={{
            width: '100%',
            marginTop: '1rem',
            padding: '0.9rem 1rem',
            border: 'none',
            borderRadius: 999,
            background: loadingMethod ? '#94a3b8' : '#0f766e',
            color: 'white',
            fontWeight: 900,
            cursor: loadingMethod ? 'not-allowed' : 'pointer',
          }}
        >
          {loadingMethod === 'vnpay'
            ? 'Redirecting to VNPay...'
            : 'Pay with VNPay'}
        </button>

        <button
          type="button"
          onClick={handlePayWithPayPal}
          disabled={Boolean(loadingMethod)}
          style={{
            width: '100%',
            marginTop: '1rem',
            padding: '0.9rem 1rem',
            border: 'none',
            borderRadius: 999,
            background: loadingMethod ? '#94a3b8' : '#1d4ed8',
            color: 'white',
            fontWeight: 900,
            cursor: loadingMethod ? 'not-allowed' : 'pointer',
          }}
        >
          {loadingMethod === 'paypal'
            ? 'Redirecting to PayPal...'
            : 'Pay with PayPal Sandbox'}
        </button>

        <div style={{ marginTop: '1rem' }}>
          <Link to={`/orders/${orderId}`}>
            View order detail
          </Link>
        </div>
      </section>
    </main>
  )
}