import api from './api'

export async function createVNPayPayment(orderId) {
  const response = await api.post('/api/payments/vnpay/create/', {
    order_id: orderId,
  })

  return response.data
}

export async function createPayPalPayment(orderId) {
  const response = await api.post('/api/payments/paypal/create/', {
    order_id: orderId,
  })

  return response.data
}

export async function capturePayPalPayment(captureData) {
  const response = await api.post('/api/payments/paypal/capture/', captureData)
  return response.data
}

export async function getPayments() {
  const response = await api.get('/api/payments/')
  return response.data
}

export async function getPaymentDetail(paymentId) {
  const response = await api.get(`/api/payments/${paymentId}/`)
  return response.data
}

export async function createAppointmentVNPayPayment(appointmentId) {
  const response = await api.post('/api/payments/appointments/vnpay/create/', {
    appointment_id: appointmentId,
  })

  return response.data
}

export async function createAppointmentPayPalPayment(appointmentId) {
  const response = await api.post('/api/payments/appointments/paypal/create/', {
    appointment_id: appointmentId,
  })

  return response.data
}

export async function captureAppointmentPayPalPayment(captureData) {
  const response = await api.post(
    '/api/payments/appointments/paypal/capture/',
    captureData
  )

  return response.data
}