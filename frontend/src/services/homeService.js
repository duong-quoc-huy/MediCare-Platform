import api from './api'

const normalize = data => Array.isArray(data) ? data : data?.results || []

export async function getFeaturedDoctors() {
  const response = await api.get('/api/doctor/', {
    params: { is_available: 'true', ordering: '-rating' },
  })
  return normalize(response.data).slice(0, 3)
}

export async function getFeaturedMedicines() {
  const response = await api.get('/api/medicines/', {
    params: { ordering: '-created_at' },
  })
  return normalize(response.data)
    .filter(item => item.medicine_is_active !== false)
    .slice(0, 4)
}
