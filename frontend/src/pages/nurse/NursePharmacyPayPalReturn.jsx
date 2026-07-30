import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  CircleX,
  LoaderCircle,
} from 'lucide-react'

import { captureNursePharmacyPayPalPayment } from '../../services/nurseService'

export default function NursePharmacyPayPalReturn() {
  const [searchParams] = useSearchParams()

  const [status, setStatus] = useState('processing')
  const [message, setMessage] = useState(
    'Confirming PayPal payment...'
  )

  const captureStartedRef = useRef(false)

  const prescriptionId =
    searchParams.get('prescription_id')

  useEffect(() => {
    if (captureStartedRef.current) {
      return
    }

    captureStartedRef.current = true

    async function capturePayment() {
      const paymentState = searchParams.get('payment')

      if (paymentState === 'cancelled') {
        setStatus('cancelled')
        setMessage('The PayPal payment was cancelled.')
        return
      }

      const paymentId =
        searchParams.get('payment_id')

      const signature =
        searchParams.get('signature')

      const paypalOrderId =
        searchParams.get('token')

      if (
        !paymentId ||
        !prescriptionId ||
        !signature ||
        !paypalOrderId
      ) {
        setStatus('failed')
        setMessage(
          'Missing PayPal payment information.'
        )
        return
      }

      try {
        const result =
          await captureNursePharmacyPayPalPayment({
            payment_id: paymentId,
            prescription_id: prescriptionId,
            signature,
            paypal_order_id: paypalOrderId,
          })

        setStatus('success')
        setMessage(
          result.detail ||
          'PayPal payment completed successfully.'
        )
      } catch (err) {
        console.error(
          'Could not capture nurse PayPal payment:',
          err
        )

        setStatus('failed')
        setMessage(
          err.response?.data?.detail ||
          'Could not complete PayPal payment.'
        )
      }
    }

    capturePayment()
  }, [prescriptionId, searchParams])

  return (
    <main
      style={{
        minHeight: '70vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        background: '#f8fafa',
      }}
    >
      <section
        style={{
          width: 'min(520px, 100%)',
          padding: '2rem',
          textAlign: 'center',
          background: '#fff',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: '14px',
          boxShadow:
            '0 18px 40px rgba(15, 23, 42, 0.08)',
        }}
      >
        {status === 'processing' && (
          <LoaderCircle
            size={52}
            style={{
              marginBottom: '1rem',
              animation: 'spin 0.9s linear infinite',
            }}
          />
        )}

        {status === 'success' && (
          <CheckCircle2
            size={52}
            color="#047857"
            style={{ marginBottom: '1rem' }}
          />
        )}

        {(status === 'failed' ||
          status === 'cancelled') && (
          <CircleX
            size={52}
            color="#be123c"
            style={{ marginBottom: '1rem' }}
          />
        )}

        <h1>
          {status === 'processing'
            ? 'Processing payment'
            : status === 'success'
              ? 'Payment successful'
              : status === 'cancelled'
                ? 'Payment cancelled'
                : 'Payment failed'}
        </h1>

        <p>{message}</p>

        {prescriptionId && (
          <Link
            to={`/nurse/pharmacy/${prescriptionId}`}
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              padding: '0.8rem 1rem',
              color: '#fff',
              background: '#0f6e56',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Return to Prescription Detail
          </Link>
        )}
      </section>
    </main>
  )
}