import api from './api'

export async function createVNPayPayment(orderId) {
  const response = await api.post('/api/payments/vnpay/create/', {
    order_id: orderId,
  })

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