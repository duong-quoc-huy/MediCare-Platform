import api from './api'

export async function getNursePharmacyQueue(params = {}) {
  const response = await api.get(
    '/api/nurse/pharmacy/',
    { params }
  )

  return response.data
}

export async function getNursePharmacyPrescription(
  prescriptionId
) {
  const response = await api.get(
    `/api/nurse/pharmacy/${prescriptionId}/`
  )

  return response.data
}

export async function claimNursePharmacyPrescription(
  prescriptionId,
  pharmacyCounter
) {
  const response = await api.post(
    `/api/nurse/pharmacy/${prescriptionId}/claim/`,
    {
      pharmacy_counter: pharmacyCounter,
    }
  )

  return response.data
}

export async function createNursePharmacyPayment(
  prescriptionId,
  payload
) {
  const response = await api.post(
    `/api/nurse/pharmacy/${prescriptionId}/payment/`,
    payload
  )

  return response.data
}

export async function captureNursePharmacyPayPalPayment(payload) {
  const response = await api.post(
    '/api/nurse/pharmacy/paypal/capture/',
    payload
  )

  return response.data
}