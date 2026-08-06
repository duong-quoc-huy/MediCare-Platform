import api from './api'

export async function getDoctors(params = {}) {
  const response = await api.get('/api/doctor/', { params })
  return response.data
}

export async function getDoctorBySlug(slug) {
  const response = await api.get(`/api/doctor/${slug}/`)
  return response.data
}

export async function getAvailableSlots(doctorId, date, visitType = 'clinic') {
  const response = await api.get(`/api/doctor/${doctorId}/slots/`, {
    params: {
      date,
      visit_type: visitType,
    },
  })

  return response.data
}

export async function getMyDoctorSchedules() {
  return (await api.get('/api/doctor/my-schedules/')).data
}
export async function createMyDoctorSchedule(payload) {
  return (await api.post('/api/doctor/my-schedules/', payload)).data
}
export async function updateMyDoctorSchedule(id, payload) {
  return (await api.patch(`/api/doctor/my-schedules/${id}/`, payload)).data
}
export async function deleteMyDoctorSchedule(id) {
  return (await api.delete(`/api/doctor/my-schedules/${id}/`)).data
}
