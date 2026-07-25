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

export async function startAppointmentCheckup(appointmentId) {
  const response = await api.post(`/api/appointments/${appointmentId}/start-checkup/`)
  return response.data
}

export async function completeAppointmentCheckup(appointmentId) {
  const response = await api.post(`/api/appointments/${appointmentId}/complete/`)
  return response.data
}

export async function createHomeVisitFinalPayment(appointmentId) {
  const response = await api.post(
    `/api/appointments/${appointmentId}/payment/final/`
  )

  return response.data
}

export async function confirmHomeVisitFinalPayment(appointmentId) {
  const response = await api.post(
    `/api/appointments/${appointmentId}/payment/confirm/`
  )

  return response.data
}

export async function downloadAppointmentMedicalPdf(appointmentId) {
  const response = await api.get(
    `/api/appointments/${appointmentId}/medical-record/pdf/`,
    {
      responseType: 'blob',
    }
  )

  const blob = new Blob([response.data], {
    type: 'application/pdf',
  })

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `medical_record_${appointmentId}.pdf`
  document.body.appendChild(link)
  link.click()

  link.remove()
  window.URL.revokeObjectURL(url)
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