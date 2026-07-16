import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CreditCard } from 'lucide-react'

import { createVNPayPayment } from '../../services/paymentService'

export default function PaymentPage() {
  const { orderId } = useParams()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePayWithVNPay() {
    try {
      setLoading(true)
      setError('')

      const data = await createVNPayPayment(orderId)

      console.log('VNPay response:', data)
      console.log('VNPay URL:', data.payment_url)

      window.location.href = data.payment_url
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Could not create VNPay payment. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: '4rem 2rem', maxWidth: 720, margin: '0 auto' }}>
      <CreditCard size={52} />

      <h1>Payment</h1>
      <p>Please complete your order payment using VNPay.</p>

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

        <p>
          <strong>Payment method:</strong> VNPay
        </p>

        <button
          type="button"
          onClick={handlePayWithVNPay}
          disabled={loading}
          style={{
            width: '100%',
            marginTop: '1rem',
            padding: '0.9rem 1rem',
            border: 'none',
            borderRadius: 999,
            background: loading ? '#94a3b8' : '#0f766e',
            color: 'white',
            fontWeight: 900,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Redirecting to VNPay...' : 'Pay with VNPay'}
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