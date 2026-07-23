import api from './api'

export async function createAppointment(appointmentData) {
  const response = await api.post('/api/appointments/', appointmentData)
  return response.data
}

export async function getMyAppointments(params = {}) {
  const response = await api.get('/api/appointments/', {
    params,
  })

  return response.data
}

export async function getAppointmentById(appointmentId) {
  const response = await api.get(`/api/appointments/${appointmentId}/`)
  return response.data
}

export async function cancelAppointment(appointmentId) {
  const response = await api.patch(`/api/appointments/${appointmentId}/cancel/`)
  return response.data
}