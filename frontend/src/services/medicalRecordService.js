import api from './api'

export async function getVitals(appointmentId) {
  const response = await api.get(
    `/api/medical-records/appointments/${appointmentId}/vitals/`
  )

  return response.data
}

export async function createVitals(appointmentId, vitalsData) {
  const response = await api.post(
    `/api/medical-records/appointments/${appointmentId}/vitals/`,
    vitalsData
  )

  return response.data
}

export async function updateVitals(appointmentId, vitalsData) {
  const response = await api.patch(
    `/api/medical-records/appointments/${appointmentId}/vitals/`,
    vitalsData
  )

  return response.data
}

export async function getMasterSymptoms(params = {}) {
  const response = await api.get('/api/medical-records/master-symptoms/', {
    params,
  })

  return response.data
}

export async function getMasterComorbidities(params = {}) {
  const response = await api.get('/api/medical-records/master-comorbidities/', {
    params,
  })

  return response.data
}

export async function getAppointmentSymptoms(appointmentId) {
  const response = await api.get(
    `/api/medical-records/appointments/${appointmentId}/symptoms/`
  )

  return response.data
}

export async function addAppointmentSymptom(appointmentId, symptomData) {
  const response = await api.post(
    `/api/medical-records/appointments/${appointmentId}/symptoms/`,
    symptomData
  )

  return response.data
}

export async function deleteAppointmentSymptom(appointmentId, symptomId) {
  const response = await api.delete(
    `/api/medical-records/appointments/${appointmentId}/symptoms/${symptomId}/`
  )

  return response.data
}

export async function getAppointmentComorbidities(appointmentId) {
  const response = await api.get(
    `/api/medical-records/appointments/${appointmentId}/comorbidities/`
  )

  return response.data
}

export async function addAppointmentComorbidity(appointmentId, comorbidityData) {
  const response = await api.post(
    `/api/medical-records/appointments/${appointmentId}/comorbidities/`,
    comorbidityData
  )

  return response.data
}

export async function deleteAppointmentComorbidity(appointmentId, comorbidityId) {
  const response = await api.delete(
    `/api/medical-records/appointments/${appointmentId}/comorbidities/${comorbidityId}/`
  )

  return response.data
}

export async function getPrescription(appointmentId) {
  const response = await api.get(
    `/api/medical-records/appointments/${appointmentId}/prescription/`
  )

  return response.data
}

export async function createPrescription(appointmentId, prescriptionData) {
  const response = await api.post(
    `/api/medical-records/appointments/${appointmentId}/prescription/`,
    prescriptionData
  )

  return response.data
}

export async function updatePrescription(appointmentId, prescriptionData) {
  const response = await api.patch(
    `/api/medical-records/appointments/${appointmentId}/prescription/`,
    prescriptionData
  )

  return response.data
}

export async function sendPrescriptionToPharmacy(appointmentId) {
  const response = await api.post(
    `/api/medical-records/appointments/${appointmentId}/prescription/send/`
  )

  return response.data
}

export async function getHospitalMedicines(params = {}) {
  const response = await api.get('/api/medical-records/hospital-medicines/', {
    params,
  })

  return response.data
}

export async function getPatientPrescription(appointmentId) {
  const response = await api.get(
    `/api/medical-records/appointments/${appointmentId}/prescription/`
  )

  return response.data
}