import api from './api'

export async function createMedicineOrder(orderData) {
  const response = await api.post(
    '/api/orders/',
    orderData
  )

  return response.data
}

export async function calculateMedicineShippingFee(shippingData) {
  const response = await api.post(
    '/api/orders/shipping-fee/',
    shippingData
  )

  return response.data
}


export async function getOrders(params = {}) {
  const response = await api.get(
    '/api/orders/',
    { params }
  )

  return response.data
}

export async function getOrderDetail(orderId) {
  const response = await api.get(
    `/api/orders/${orderId}/`
  )

  return response.data
}

export async function cancelOrder(orderId) {
  const response = await api.patch(
    `/api/orders/${orderId}/cancel/`
  )

  return response.data
}

/*
 * Nurse medicine-delivery workflow
 */

export async function getNurseMedicineOrders(params = {}) {
  const response = await api.get(
    '/api/orders/',
    { params }
  )

  return response.data
}

export async function getNurseMedicineOrderDetail(orderId) {
  const response = await api.get(
    `/api/orders/${orderId}/`
  )

  return response.data
}

export async function startPreparingMedicineOrder(orderId) {
  const response = await api.patch(
    `/api/orders/${orderId}/nurse-status/`,
    {
      status: 'preparing',
    }
  )

  return response.data
}

export async function createMedicineOrderShipment(orderId) {
  const response = await api.post(
    `/api/orders/${orderId}/create-shipment/`
  )

  return response.data
}

