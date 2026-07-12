import api from './api'

export async function getCart() {
  const response = await api.get('/api/cart/')
  return response.data
}

export async function addCartItem(medicineId, quantity = 1) {
  const response = await api.post('/api/cart/add/', {
    medicine: medicineId,
    quantity,
  })

  return response.data
}

export async function updateCartItem(cartItemId, quantity) {
  const response = await api.patch(`/api/cart/items/${cartItemId}/`, {
    quantity,
  })

  return response.data
}

export async function removeCartItem(cartItemId) {
  const response = await api.delete(`/api/cart/items/${cartItemId}/remove/`)
  return response.data
}

export async function clearServerCart() {
  const response = await api.delete('/api/cart/clear/')
  return response.data
}

export async function mergeCart(items) {
  const response = await api.post('/api/cart/merge/', {
    items,
  })

  return response.data
}