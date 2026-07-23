import api from './api'

export async function getDoctors(params = {}) {
  const response = await api.get('/api/doctor/', { params })
  return response.data
}

export async function getDoctorBySlug(slug) {
  const response = await api.get(`/api/doctor/${slug}/`)
  return response.data
}

export async function getAvailableSlots(doctorId, date) {
  const response = await api.get(`/api/doctor/${doctorId}/slots/`, {
    params: { date },
  })

  return response.data
}