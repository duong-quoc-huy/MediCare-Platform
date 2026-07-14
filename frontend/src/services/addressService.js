import api from './api'

/**
 * Get all addresses for current user
 * GET /api/addresses/
 */
export async function getAddresses() {
  const response = await api.get('/api/addresses/')
  return response.data
}

/**
 * Create new address
 * POST /api/addresses/
 */
export async function createAddress(data) {
  const response = await api.post('/api/addresses/', data)
  return response.data
}

/**
 * Update existing address
 * PATCH /api/addresses/<id>/
 */
export async function updateAddress(id, data) {
  const response = await api.patch(`/api/addresses/${id}/`, data)
  return response.data
}

/**
 * Delete address
 * DELETE /api/addresses/<id>/
 */
export async function deleteAddress(id) {
  const response = await api.delete(`/api/addresses/${id}/`)
  return response.data
}