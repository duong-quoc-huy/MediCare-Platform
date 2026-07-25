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

export async function createAppointmentFinalPaymentSession(appointmentId) {
  const response = await api.post(
    `/api/payments/appointments/${appointmentId}/final-session/create/`
  )

  return response.data
}

export async function getAppointmentFinalPaymentSession(appointmentId, token, key) {
  const response = await api.get(
    `/api/payments/appointments/${appointmentId}/final-session/`,
    {
      params: {
        token,
        key,
      },
    }
  )

  return response.data
}

export async function createFinalSessionVNPayPayment(appointmentId, token, key) {
  const response = await api.post(
    `/api/payments/appointments/${appointmentId}/final-session/vnpay/create/`,
    {
      token,
      key,
    }
  )

  return response.data
}

export async function createFinalSessionPayPalPayment(appointmentId, token, key) {
  const response = await api.post(
    `/api/payments/appointments/${appointmentId}/final-session/paypal/create/`,
    {
      token,
      key,
    }
  )

  return response.data
}

export async function captureFinalSessionPayPalPayment(
  appointmentId,
  captureData
) {
  const response = await api.post(
    `/api/payments/appointments/${appointmentId}/final-session/paypal/capture/`,
    captureData
  )

  return response.data
}