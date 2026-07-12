import api from './api'

export async function createMedicineOrder(orderData) {
  const response = await api.post('/api/orders/', orderData)
  return response.data
}

export async function getOrders() {
  const response = await api.get('/api/orders/')
  return response.data
}

export async function getOrderDetail(orderId) {
  const response = await api.get(`/api/orders/${orderId}/`)
  return response.data
}

export async function cancelOrder(orderId) {
  const response = await api.patch(`/api/orders/${orderId}/cancel/`)
  return response.data
}